<?php

namespace App\Services;

use App\Models\Absence;
use App\Models\Cours;
use App\Models\Examen;
use App\Models\Etudiant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AttendanceStateService
{
    /**
     * États possibles d'un étudiant
     */
    const STATUS_PRESENT = 'present';
    const STATUS_LATE = 'late';
    const STATUS_ABSENT = 'absent';
    const STATUS_LEFT_EARLY = 'left_early';

    /**
     * Types d'absences correspondants
     */
    const ABSENCE_TYPE_ABSENT = 'Absence';
    const ABSENCE_TYPE_LATE = 'Retard';
    const ABSENCE_TYPE_LEFT_EARLY = 'Départ anticipé';

    /**
     * Modifier l'état de présence d'un étudiant pour un cours
     */
    public function updateStudentAttendanceState(int $coursId, int $etudiantId, string $newStatus, ?string $motif = null, ?string $justificatif = null): array
    {
        try {
            DB::beginTransaction();

            // Vérifier que le cours existe
            $cours = Cours::withoutGlobalScopes()->find($coursId);
            if (!$cours) {
                throw new \Exception('Cours non trouvé');
            }

            // Vérifier que l'étudiant existe
            $etudiant = Etudiant::withoutGlobalScopes()->find($etudiantId);
            if (!$etudiant) {
                throw new \Exception('Étudiant non trouvé');
            }

            // Supprimer les absences existantes pour ce cours et cet étudiant
            Absence::where('cours_id', $coursId)
                   ->where('etudiant_id', $etudiantId)
                   ->where('date_absence', $cours->date)
                   ->delete();

            $absence = null;

            // Créer une nouvelle absence si nécessaire
            if (in_array($newStatus, [self::STATUS_ABSENT, self::STATUS_LATE, self::STATUS_LEFT_EARLY])) {
                $absence = $this->createAbsenceForStatus($coursId, $etudiantId, $newStatus, $cours->date, $motif, $justificatif);
            } else if ($newStatus === self::STATUS_PRESENT) {
                // Pour le statut "present", créer une absence avec un type spécial pour marquer la présence
                $absence = $this->createAbsenceForStatus($coursId, $etudiantId, 'present', $cours->date, 'Présence confirmée manuellement', 'Modification manuelle du statut');
            }

            DB::commit();

            return [
                'success' => true,
                'message' => 'État de présence mis à jour avec succès',
                'etudiant' => $etudiant,
                'cours' => $cours,
                'status' => $newStatus,
                'absence' => $absence
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la mise à jour de l\'état de présence', [
                'cours_id' => $coursId,
                'etudiant_id' => $etudiantId,
                'new_status' => $newStatus,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Modifier l'état de présence d'un étudiant pour un examen
     */
    public function updateStudentExamAttendanceState(int $examenId, int $etudiantId, string $newStatus, ?string $motif = null, ?string $justificatif = null): array
    {
        try {
            DB::beginTransaction();

            // Vérifier que l'examen existe
            $examen = Examen::withoutGlobalScopes()->find($examenId);
            if (!$examen) {
                throw new \Exception('Examen non trouvé');
            }

            // Vérifier que l'étudiant existe
            $etudiant = Etudiant::withoutGlobalScopes()->find($etudiantId);
            if (!$etudiant) {
                throw new \Exception('Étudiant non trouvé');
            }

            // Supprimer les absences existantes pour cet examen et cet étudiant
            Absence::where('examen_id', $examenId)
                   ->where('etudiant_id', $etudiantId)
                   ->where('date_absence', $examen->date)
                   ->delete();

            $absence = null;

            // Créer une nouvelle absence si nécessaire
            if (in_array($newStatus, [self::STATUS_ABSENT, self::STATUS_LATE, self::STATUS_LEFT_EARLY])) {
                $absence = $this->createAbsenceForExamStatus($examenId, $etudiantId, $newStatus, $examen->date, $motif, $justificatif);
            }

            DB::commit();

            return [
                'success' => true,
                'message' => 'État de présence mis à jour avec succès',
                'etudiant' => $etudiant,
                'examen' => $examen,
                'status' => $newStatus,
                'absence' => $absence
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur lors de la mise à jour de l\'état de présence', [
                'examen_id' => $examenId,
                'etudiant_id' => $etudiantId,
                'new_status' => $newStatus,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors de la mise à jour: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Créer une absence pour un cours basée sur le statut
     */
    private function createAbsenceForStatus(int $coursId, int $etudiantId, string $status, string $date, ?string $motif = null, ?string $justificatif = null): Absence
    {
        $typeAbsence = $this->getAbsenceTypeForStatus($status);
        $motifFinal = $motif ?? $this->generateMotifForStatus($status, 'cours');

        return Absence::create([
            'type_absence' => $typeAbsence,
            'etudiant_id' => $etudiantId,
            'cours_id' => $coursId,
            'examen_id' => null,
            'date_absence' => $date,
            'justifiee' => !empty($justificatif),
            'motif' => $motifFinal,
            'justificatif' => $justificatif
        ]);
    }

    /**
     * Créer une absence pour un examen basée sur le statut
     */
    private function createAbsenceForExamStatus(int $examenId, int $etudiantId, string $status, string $date, ?string $motif = null, ?string $justificatif = null): Absence
    {
        $typeAbsence = $this->getAbsenceTypeForStatus($status);
        $motifFinal = $motif ?? $this->generateMotifForStatus($status, 'examen');

        return Absence::create([
            'type_absence' => $typeAbsence,
            'etudiant_id' => $etudiantId,
            'cours_id' => null,
            'examen_id' => $examenId,
            'date_absence' => $date,
            'justifiee' => !empty($justificatif),
            'motif' => $motifFinal,
            'justificatif' => $justificatif
        ]);
    }

    /**
     * Obtenir le type d'absence basé sur le statut
     */
    private function getAbsenceTypeForStatus(string $status): string
    {
        switch ($status) {
            case self::STATUS_ABSENT:
                return self::ABSENCE_TYPE_ABSENT;
            case self::STATUS_LATE:
                return self::ABSENCE_TYPE_LATE;
            case self::STATUS_LEFT_EARLY:
                return self::ABSENCE_TYPE_LEFT_EARLY;
            case 'present':
                return 'Présence confirmée';
            default:
                return self::ABSENCE_TYPE_ABSENT;
        }
    }

    /**
     * Générer un motif automatique basé sur le statut
     */
    private function generateMotifForStatus(string $status, string $type): string
    {
        switch ($status) {
            case self::STATUS_ABSENT:
                return "Absence non justifiée - {$type}";
            case self::STATUS_LATE:
                return "Retard - {$type}";
            case self::STATUS_LEFT_EARLY:
                return "Départ anticipé - {$type}";
            case 'present':
                return "Présence confirmée manuellement - {$type}";
            default:
                return "Absence - {$type}";
        }
    }

    /**
     * Obtenir l'état actuel d'un étudiant pour un cours
     */
    public function getStudentAttendanceState(int $coursId, int $etudiantId): array
    {
        $cours = Cours::withoutGlobalScopes()->find($coursId);
        if (!$cours) {
            return ['status' => self::STATUS_ABSENT, 'absence' => null];
        }

        $absence = Absence::where('cours_id', $coursId)
                          ->where('etudiant_id', $etudiantId)
                          ->where('date_absence', $cours->date)
                          ->first();

        if (!$absence) {
            return ['status' => self::STATUS_PRESENT, 'absence' => null];
        }

        $status = $this->getStatusFromAbsenceType($absence->type_absence);
        
        return [
            'status' => $status,
            'absence' => $absence
        ];
    }

    /**
     * Obtenir l'état actuel d'un étudiant pour un examen
     */
    public function getStudentExamAttendanceState(int $examenId, int $etudiantId): array
    {
        $examen = Examen::withoutGlobalScopes()->find($examenId);
        if (!$examen) {
            return ['status' => self::STATUS_ABSENT, 'absence' => null];
        }

        $absence = Absence::where('examen_id', $examenId)
                          ->where('etudiant_id', $etudiantId)
                          ->where('date_absence', $examen->date)
                          ->first();

        if (!$absence) {
            return ['status' => self::STATUS_PRESENT, 'absence' => null];
        }

        $status = $this->getStatusFromAbsenceType($absence->type_absence);
        
        return [
            'status' => $status,
            'absence' => $absence
        ];
    }

    /**
     * Convertir le type d'absence en statut
     */
    private function getStatusFromAbsenceType(string $typeAbsence): string
    {
        switch ($typeAbsence) {
            case self::ABSENCE_TYPE_ABSENT:
                return self::STATUS_ABSENT;
            case self::ABSENCE_TYPE_LATE:
                return self::STATUS_LATE;
            case self::ABSENCE_TYPE_LEFT_EARLY:
                return self::STATUS_LEFT_EARLY;
            case 'Présence confirmée':
                return self::STATUS_PRESENT;
            default:
                return self::STATUS_ABSENT;
        }
    }

    /**
     * Justifier une absence existante
     */
    public function justifyAbsence(int $absenceId, string $motif, string $justificatif): array
    {
        try {
            $absence = Absence::find($absenceId);
            if (!$absence) {
                throw new \Exception('Absence non trouvée');
            }

            $absence->update([
                'justifiee' => true,
                'motif' => $motif,
                'justificatif' => $justificatif
            ]);

            return [
                'success' => true,
                'message' => 'Absence justifiée avec succès',
                'absence' => $absence
            ];

        } catch (\Exception $e) {
            Log::error('Erreur lors de la justification de l\'absence', [
                'absence_id' => $absenceId,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors de la justification: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Obtenir tous les états possibles
     */
    public function getAvailableStatuses(): array
    {
        return [
            self::STATUS_PRESENT => 'Présent',
            self::STATUS_LATE => 'En retard',
            self::STATUS_ABSENT => 'Absent',
            self::STATUS_LEFT_EARLY => 'Parti tôt'
        ];
    }
}
