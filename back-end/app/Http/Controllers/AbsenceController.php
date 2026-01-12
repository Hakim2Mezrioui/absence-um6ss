<?php

namespace App\Http\Controllers;

use App\Models\Absence;
use App\Services\AbsenceService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AbsenceController extends Controller
{
    protected $absenceService;

    public function __construct(AbsenceService $absenceService)
    {
        $this->absenceService = $absenceService;
    }

    /**
     * Afficher la liste des absences avec pagination et filtres.
     */
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $searchValue = $request->query("searchValue", "");
        $etudiantId = $request->query("etudiant_id", "");
        $coursId = $request->query("cours_id", "");
        $examenId = $request->query("examen_id", "");
        $justifiee = $request->query("justifiee", "");
        $dateDebut = $request->query("date_debut", "");
        $dateFin = $request->query("date_fin", "");
        $type = $request->query("type", ""); // 'cours' | 'examen' | ''
        $type_absence = $request->query("type_absence", ""); // 'Absence' | 'Retard' | ''
        $etablissement_id = $request->query("etablissement_id", "");
        $promotion_id = $request->query("promotion_id", "");

        $skip = ($page - 1) * $size;

        $query = Absence::with([
            'etudiant.promotion', 
            'etudiant.etablissement', 
            'etudiant.ville', 
            'etudiant.group', 
            'etudiant.option',
            'cours', 
            'examen'
        ]);

        // Appliquer les filtres
        if (!empty($etudiantId)) {
            $query->where('etudiant_id', $etudiantId);
        }

        if (!empty($coursId)) {
            $query->where('cours_id', $coursId);
        }

        if (!empty($examenId)) {
            $query->where('examen_id', $examenId);
        }

        if ($justifiee !== "") {
            $query->where('justifiee', $justifiee);
        }

        if (!empty($dateDebut)) {
            $query->where('date_absence', '>=', $dateDebut);
        }

        if (!empty($dateFin)) {
            $query->where('date_absence', '<=', $dateFin);
        }

        // Filtre par type (cours ou examen)
        if (!empty($type)) {
            if ($type === 'cours') {
                $query->whereNotNull('cours_id')->whereNull('examen_id');
            } elseif ($type === 'examen') {
                $query->whereNotNull('examen_id')->whereNull('cours_id');
            }
        }

        // Filtre par type d'absence
        if (!empty($type_absence)) {
            $query->where('type_absence', $type_absence);
        }

        // Filtre par établissement
        if (!empty($etablissement_id)) {
            $query->whereHas('etudiant', function($q) use ($etablissement_id) {
                $q->where('etablissement_id', $etablissement_id);
            });
        }

        // Filtre par promotion
        if (!empty($promotion_id)) {
            $query->whereHas('etudiant', function($q) use ($promotion_id) {
                $q->where('promotion_id', $promotion_id);
            });
        }

        // Appliquer le filtre de recherche si nécessaire
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where(function($q) use ($searchValue) {
                $q->where('type_absence', 'LIKE', "%{$searchValue}%")
                  ->orWhere('motif', 'LIKE', "%{$searchValue}%")
                  ->orWhereHas('etudiant', function($subQ) use ($searchValue) {
                      $subQ->where('first_name', 'LIKE', "%{$searchValue}%")
                           ->orWhere('last_name', 'LIKE', "%{$searchValue}%")
                           ->orWhere('matricule', 'LIKE', "%{$searchValue}%")
                           ->orWhere('email', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('etudiant.promotion', function($subQ) use ($searchValue) {
                      $subQ->where('name', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('etudiant.etablissement', function($subQ) use ($searchValue) {
                      $subQ->where('name', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('etudiant.ville', function($subQ) use ($searchValue) {
                      $subQ->where('name', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('etudiant.group', function($subQ) use ($searchValue) {
                      $subQ->where('title', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('etudiant.option', function($subQ) use ($searchValue) {
                      $subQ->where('name', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('cours', function($subQ) use ($searchValue) {
                      $subQ->where('name', 'LIKE', "%{$searchValue}%");
                  })
                  ->orWhereHas('examen', function($subQ) use ($searchValue) {
                      $subQ->where('title', 'LIKE', "%{$searchValue}%");
                  });
            });
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $absences = $query->limit($size)->skip($skip)->orderByDesc('date_absence')->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "absences" => $absences,
            "totalPages" => $totalPages,
            "total" => $total,
            "status" => 200
        ]);
    }

    /**
     * Afficher une absence spécifique.
     */
    public function show($id)
    {
        $absence = $this->absenceService->getAbsenceById((int) $id);
        
        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }
        
        return response()->json($absence);
    }

    /**
     * Ajouter une nouvelle absence.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'type_absence' => 'required|string|max:255',
            'etudiant_id' => 'required|exists:etudiants,id',
            'cours_id' => 'nullable|exists:cours,id',
            'examen_id' => 'nullable|exists:examens,id',
            'date_absence' => 'required|date',
            'justifiee' => 'boolean',
            'motif' => 'nullable|string|max:500',
            'justificatif' => 'nullable|string|max:255',
        ]);

        // Vérifier qu'au moins cours_id ou examen_id est fourni
        if (empty($validatedData['cours_id']) && empty($validatedData['examen_id'])) {
            return response()->json([
                'message' => 'Au moins un cours ou un examen doit être spécifié'
            ], 422);
        }

        $absence = $this->absenceService->createAbsence($validatedData);

        return response()->json([
            'message' => 'Absence ajoutée avec succès', 
            'absence' => $absence
        ], 201);
    }

    /**
     * Mettre à jour une absence existante.
     */
    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'type_absence' => 'sometimes|required|string|max:255',
            'etudiant_id' => 'sometimes|required|exists:etudiants,id',
            'cours_id' => 'nullable|exists:cours,id',
            'examen_id' => 'nullable|exists:examens,id',
            'date_absence' => 'sometimes|required|date',
            'justifiee' => 'sometimes|boolean',
            'motif' => 'nullable|string|max:500',
            'justificatif' => 'nullable|string|max:255',
        ]);

        $absence = $this->absenceService->updateAbsence((int) $id, $validatedData);

        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        return response()->json([
            'message' => 'Absence mise à jour avec succès', 
            'absence' => $absence
        ]);
    }

    /**
     * Supprimer une absence.
     */
    public function destroy($id)
    {
        $deleted = $this->absenceService->deleteAbsence((int) $id);

        if (!$deleted) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        return response()->json(['message' => 'Absence supprimée avec succès']);
    }

    /**
     * Obtenir toutes les absences (sans pagination).
     */
    public function getAll()
    {
        $absences = $this->absenceService->getAllAbsences();
        
        return response()->json([
            'absences' => $absences,
            'status' => 200
        ]);
    }

    /**
     * Rechercher des absences.
     */
    public function search(Request $request)
    {
        $searchValue = $request->query("search", "");
        
        if (empty($searchValue)) {
            return response()->json(['message' => 'Terme de recherche requis'], 400);
        }

        $absences = $this->absenceService->searchAbsences($searchValue);
        
        return response()->json([
            'absences' => $absences,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les absences d'un étudiant.
     */
    public function getByEtudiant($etudiantId)
    {
        $absences = $this->absenceService->getAbsencesByEtudiant((int) $etudiantId);
        
        return response()->json([
            'absences' => $absences,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les absences d'un cours.
     */
    public function getByCours($coursId)
    {
        $absences = $this->absenceService->getAbsencesByCours((int) $coursId);
        
        return response()->json([
            'absences' => $absences,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les absences d'un examen.
     */
    public function getByExamen($examenId)
    {
        $absences = $this->absenceService->getAbsencesByExamen((int) $examenId);
        
        return response()->json([
            'absences' => $absences,
            'status' => 200
        ]);
    }

    /**
     * Justifier une absence.
     */
    public function justifier(Request $request, $id)
    {
        $validatedData = $request->validate([
            'justifiee' => 'required|boolean',
            'motif' => 'nullable|string|max:500',
            'justificatif' => 'nullable|string|max:255',
        ]);

        $absence = $this->absenceService->justifierAbsence((int) $id, $validatedData);

        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        return response()->json([
            'message' => 'Absence justifiée avec succès', 
            'absence' => $absence
        ]);
    }

    /**
     * Obtenir les statistiques des absences.
     */
    public function getStatistics()
    {
        $statistics = $this->absenceService->getAbsenceStatistics();
        
        return response()->json([
            'statistics' => $statistics,
            'status' => 200
        ]);
    }

    /**
     * Obtenir le classement des étudiants par nombre d'absences.
     */
    public function getStudentsRanking(Request $request)
    {
        $filters = [
            'limit' => $request->query('limit', 50),
            'date_debut' => $request->query('date_debut'),
            'date_fin' => $request->query('date_fin'),
            'etablissement_id' => $request->query('etablissement_id'),
            'promotion_id' => $request->query('promotion_id'),
            'sort_by' => $request->query('sort_by', 'total'), // 'total', 'non_justifiees', 'justifiees'
        ];

        // Nettoyer les valeurs vides
        $filters = array_filter($filters, function($value) {
            return $value !== null && $value !== '';
        });

        $ranking = $this->absenceService->getStudentsRanking($filters);
        
        return response()->json([
            'data' => $ranking,
            'status' => 200
        ]);
    }

    /**
     * Upload un justificatif pour une absence.
     */
    public function uploadJustificatif(Request $request, $id)
    {
        $request->validate([
            'justificatif' => 'required|file|mimes:pdf,jpg,jpeg,png,doc,docx|max:5120', // 5MB max
        ]);

        $absence = Absence::find($id);
        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        // Supprimer l'ancien fichier s'il existe
        if ($absence->justificatif) {
            $oldPath = storage_path('app/justificatifs/' . $absence->justificatif);
            if (file_exists($oldPath)) {
                unlink($oldPath);
            }
        }

        // Créer le dossier s'il n'existe pas
        $storagePath = storage_path('app/justificatifs');
        if (!file_exists($storagePath)) {
            mkdir($storagePath, 0755, true);
        }

        // Générer un nom de fichier unique
        $file = $request->file('justificatif');
        $extension = $file->getClientOriginalExtension();
        $fileName = 'absence_' . $id . '_' . time() . '.' . $extension;
        
        // Déplacer le fichier
        $file->move($storagePath, $fileName);

        // Mettre à jour l'absence
        $absence->update([
            'justificatif' => $fileName,
            'justifiee' => true, // Auto-justifier si un document est uploadé
        ]);

        return response()->json([
            'message' => 'Justificatif uploadé avec succès',
            'justificatif' => $fileName,
            'absence' => $absence->fresh(['etudiant', 'cours', 'examen'])
        ]);
    }

    /**
     * Télécharger un justificatif.
     */
    public function downloadJustificatif($id)
    {
        $absence = Absence::find($id);
        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        if (!$absence->justificatif) {
            return response()->json(['message' => 'Aucun justificatif disponible'], 404);
        }

        $filePath = storage_path('app/justificatifs/' . $absence->justificatif);
        
        if (!file_exists($filePath)) {
            return response()->json(['message' => 'Fichier justificatif introuvable'], 404);
        }

        return response()->download($filePath, $absence->justificatif);
    }

    /**
     * Supprimer un justificatif.
     */
    public function deleteJustificatif($id)
    {
        $absence = Absence::find($id);
        if (!$absence) {
            return response()->json(['message' => 'Absence non trouvée'], 404);
        }

        if (!$absence->justificatif) {
            return response()->json(['message' => 'Aucun justificatif à supprimer'], 404);
        }

        $filePath = storage_path('app/justificatifs/' . $absence->justificatif);
        
        if (file_exists($filePath)) {
            unlink($filePath);
        }

        $absence->update([
            'justificatif' => null,
            'justifiee' => false, // Retirer la justification si le document est supprimé
        ]);

        return response()->json([
            'message' => 'Justificatif supprimé avec succès',
            'absence' => $absence->fresh(['etudiant', 'cours', 'examen'])
        ]);
    }
} 