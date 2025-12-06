<?php

namespace App\Services;

use App\Models\Cours;
use App\Models\Examen;
use App\Models\Etudiant;
use App\Models\QrCodeSession;
use App\Models\QrCodeScan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class QrCodeAttendanceService
{
    /**
     * Durée de validité du QR code en secondes.
     * Pour ton besoin: synchronisation toutes les ~20s.
     */
    private int $ttlSeconds = 20;

    public function generateForCours(int $coursId): QrCodeSession
    {
        $cours = Cours::findOrFail($coursId);

        if (($cours->tracking_method ?? 'biostar') !== 'qr_code') {
            throw new \RuntimeException("Ce cours n'utilise pas le suivi par QR code.");
        }

        return $this->createSession($cours, null);
    }

    public function generateForExamen(int $examenId): QrCodeSession
    {
        $examen = Examen::findOrFail($examenId);

        if (($examen->tracking_method ?? 'biostar') !== 'qr_code') {
            throw new \RuntimeException("Cet examen n'utilise pas le suivi par QR code.");
        }

        return $this->createSession(null, $examen);
    }

    /**
     * Crée une nouvelle session de QR code (on ne réutilise pas les anciens tokens).
     */
    protected function createSession(?Cours $cours, ?Examen $examen): QrCodeSession
    {
        $now = Carbon::now();
        $expiresAt = $now->copy()->addSeconds($this->ttlSeconds);

        $session = new QrCodeSession();
        $session->cours_id = $cours?->id;
        $session->examen_id = $examen?->id;
        $session->token = Str::random(64);
        $session->expires_at = $expiresAt;
        $session->created_by_user_id = Auth::id();
        $session->save();

        return $session;
    }

    /**
     * Valide que le scan est effectué entre heure_debut_pointage et heure_fin de la séance.
     */
    private function validateScanTiming($seance, Carbon $now): array
    {
        $seanceDate = Carbon::parse($seance->date);
        
        // Utiliser heure_debut_poigntage si disponible, sinon heure_debut
        $heureDebutPointage = $seance->heure_debut_poigntage ?? $seance->heure_debut;
        $heureFin = $seance->heure_fin;

        // Créer les timestamps complets
        $debutPointage = Carbon::parse($seanceDate->format('Y-m-d') . ' ' . $heureDebutPointage);
        $finSeance = Carbon::parse($seanceDate->format('Y-m-d') . ' ' . $heureFin);

        // Vérifier si le scan est trop tôt
        if ($now->lt($debutPointage)) {
            $tempsRestant = $now->diff($debutPointage);
            return [
                'valid' => false,
                'message' => "Le pointage n'est pas encore ouvert. Il sera disponible à " . 
                            Carbon::parse($heureDebutPointage)->format('H:i') . 
                            " (dans " . $tempsRestant->format('%H:%I:%S') . ").",
            ];
        }

        // Vérifier si le scan est trop tard
        if ($now->gt($finSeance)) {
            return [
                'valid' => false,
                'message' => "Le pointage est terminé. La séance s'est terminée à " . 
                            Carbon::parse($heureFin)->format('H:i') . ".",
            ];
        }

        return [
            'valid' => true,
            'message' => 'OK',
        ];
    }

    /**
     * Enregistrer un scan à partir d'un token scanné et d'un étudiant.
     */
    public function scanToken(string $token, int $etudiantId, array $meta = []): array
    {
        $now = Carbon::now();

        $session = QrCodeSession::where('token', $token)
            ->where('expires_at', '>', $now)
            ->first();

        if (!$session) {
            return [
                'success' => false,
                'status' => 'invalid',
                'message' => 'QR code invalide ou expiré.',
            ];
        }

        // Récupérer la séance associée (cours ou examen)
        // Utiliser withoutGlobalScope car Auth::check() peut retourner false pour les étudiants
        $seance = null;
        $seanceType = null;
        
        if ($session->cours_id) {
            $seance = Cours::withoutGlobalScope(\App\Scopes\UserContextScope::class)
                ->find($session->cours_id);
            $seanceType = 'cours';
        } elseif ($session->examen_id) {
            $seance = Examen::withoutGlobalScope(\App\Scopes\UserContextScope::class)
                ->find($session->examen_id);
            $seanceType = 'examen';
        }

        if (!$seance) {
            return [
                'success' => false,
                'status' => 'invalid',
                'message' => 'Séance associée au QR code introuvable.',
            ];
        }

        // Valider le timing du scan (entre heure_debut_pointage et heure_fin)
        $validationResult = $this->validateScanTiming($seance, $now);
        if (!$validationResult['valid']) {
            return [
                'success' => false,
                'status' => 'timing_error',
                'message' => $validationResult['message'],
            ];
        }

        // Utiliser withoutGlobalScope car Auth::check() peut retourner false pour les étudiants
        $etudiant = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)
            ->findOrFail($etudiantId);

        // TODO: Vérifier ici que l'étudiant est bien inscrit au cours / examen (groups, promotion, etc.)

        $existing = QrCodeScan::where('qr_code_session_id', $session->id)
            ->where('etudiant_id', $etudiant->id)
            ->first();

        if ($existing) {
            return [
                'success' => false,
                'status' => 'duplicate',
                'message' => 'Présence déjà enregistrée pour ce QR code.',
            ];
        }

        $scan = new QrCodeScan();
        $scan->qr_code_session_id = $session->id;
        $scan->etudiant_id = $etudiant->id;
        $scan->scanned_at = $now;
        $scan->status = 'present';
        $scan->meta = $meta;
        $scan->save();

        return [
            'success' => true,
            'status' => 'present',
            'message' => 'Présence enregistrée avec succès !',
            'scan_id' => $scan->id,
            'scanned_at' => $now->toIso8601String(),
        ];
    }

    /**
     * Retourne la liste des étudiants attendus pour un cours avec leur statut basé sur les scans QR.
     * NOTE: cette méthode est volontairement simple; on pourra l'adapter à ta logique de groupes.
     */
    public function getAttendanceForCours(int $coursId): array
    {
        $cours = Cours::with(['promotion', 'option', 'etablissement', 'ville'])
            ->findOrFail($coursId);

        // Ici on prend tous les étudiants de la même promotion comme "attendus"
        $etudiants = Etudiant::with(['promotion', 'group', 'option'])
            ->where('promotion_id', $cours->promotion_id)
            ->get();

        $sessionIds = QrCodeSession::where('cours_id', $coursId)->pluck('id');

        $scans = QrCodeScan::whereIn('qr_code_session_id', $sessionIds)
            ->get()
            ->groupBy('etudiant_id');

        $results = [];

        foreach ($etudiants as $etudiant) {
            $studentScans = $scans->get($etudiant->id, collect());
            $present = $studentScans->isNotEmpty();
            $lastScan = $present ? $studentScans->sortByDesc('scanned_at')->first() : null;

            $results[] = [
                'etudiant_id' => $etudiant->id,
                'matricule' => $etudiant->matricule ?? null,
                'first_name' => $etudiant->first_name ?? null,
                'last_name' => $etudiant->last_name ?? null,
                'status' => $present ? 'present' : 'absent',
                'last_scan_at' => $lastScan?->scanned_at,
            ];
        }

        return $results;
    }

    /**
     * Retourne la liste des étudiants attendus pour un examen avec leur statut basé sur les scans QR.
     */
    public function getAttendanceForExamen(int $examenId): array
    {
        $examen = Examen::with(['promotion', 'group', 'option', 'salle', 'ville', 'etablissement', 'typeExamen'])
            ->findOrFail($examenId);

        // Récupérer les sessions QR pour cet examen
        $sessionIds = QrCodeSession::where('examen_id', $examenId)->pluck('id');

        // Récupérer tous les scans pour ces sessions
        $scans = QrCodeScan::whereIn('qr_code_session_id', $sessionIds)
            ->with('etudiant')
            ->get();

        // Récupérer les étudiants concernés par cet examen (même logique que pour les examens)
        $etudiantsQuery = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)
            ->with(['promotion', 'group', 'option', 'etablissement', 'ville'])
            ->where('promotion_id', $examen->promotion_id)
            ->where('etablissement_id', $examen->etablissement_id)
            ->where('ville_id', $examen->ville_id);

        // Filtrer par groupe si spécifié
        if ($examen->group_id) {
            $etudiantsQuery->where('group_id', $examen->group_id);
        }
        
        // Filtrer par option si spécifiée
        if ($examen->option_id) {
            $etudiantsQuery->where('option_id', $examen->option_id);
        }

        $etudiants = $etudiantsQuery->get();

        // Créer un map des scans par etudiant_id pour une recherche rapide
        $scanMap = $scans->keyBy('etudiant_id');

        $results = [];
        $presents = 0;
        $absents = 0;

        foreach ($etudiants as $etudiant) {
            $scan = $scanMap->get($etudiant->id);
            $isPresent = $scan !== null;
            
            if ($isPresent) {
                $presents++;
            } else {
                $absents++;
            }

            $results[] = [
                'id' => $etudiant->id,
                'matricule' => $etudiant->matricule,
                'first_name' => $etudiant->first_name,
                'last_name' => $etudiant->last_name,
                'email' => $etudiant->email,
                'status' => $isPresent ? 'présent' : 'absent',
                'scan_time' => $scan ? $scan->scanned_at : null,
                'scan_status' => $scan ? $scan->status : null,
                'group' => $etudiant->group,
                'option' => $etudiant->option,
                'promotion' => $etudiant->promotion,
                'etablissement' => $etudiant->etablissement,
                'ville' => $etudiant->ville,
            ];
        }

        return [
            'examen' => $examen,
            'etudiants' => $results,
            'total_etudiants' => count($results),
            'presents' => $presents,
            'absents' => $absents,
            'date' => $examen->date,
            'heure_debut' => $examen->heure_debut,
            'heure_fin' => $examen->heure_fin,
            'heure_debut_poigntage' => $examen->heure_debut_poigntage,
        ];
    }
}


