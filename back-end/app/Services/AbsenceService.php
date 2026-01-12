<?php

namespace App\Services;

use App\Models\Absence;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AbsenceService
{
    /**
     * Constante pour les relations d'absence avec toutes les relations de l'étudiant
     */
    const ABSENCE_RELATIONS = [
        'etudiant.promotion', 
        'etudiant.etablissement', 
        'etudiant.ville', 
        'etudiant.group', 
        'etudiant.option',
        'cours', 
        'examen'
    ];

    /**
     * Get all absences
     */
    public function getAllAbsences(): Collection
    {
        return Absence::with(self::ABSENCE_RELATIONS)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get a specific absence by ID
     */
    public function getAbsenceById(int $id): ?Absence
    {
        return Absence::with(self::ABSENCE_RELATIONS)->find($id);
    }

    /**
     * Create a new absence
     */
    public function createAbsence(array $data): Absence
    {
        return Absence::create($data);
    }

    /**
     * Update an existing absence
     */
    public function updateAbsence(int $id, array $data): ?Absence
    {
        $absence = Absence::find($id);
        if ($absence) {
            $absence->update($data);
            return $absence->fresh(self::ABSENCE_RELATIONS);
        }
        return null;
    }

    /**
     * Delete an absence
     */
    public function deleteAbsence(int $id): bool
    {
        $absence = Absence::find($id);
        if ($absence) {
            return $absence->delete();
        }
        return false;
    }

    /**
     * Search absences
     */
    public function searchAbsences(string $searchTerm): Collection
    {
        return Absence::with(self::ABSENCE_RELATIONS)
                      ->where(function($query) use ($searchTerm) {
                          $query->where('type_absence', 'LIKE', "%{$searchTerm}%")
                                ->orWhere('motif', 'LIKE', "%{$searchTerm}%")
                                ->orWhereHas('etudiant', function($subQuery) use ($searchTerm) {
                                    $subQuery->where('nom', 'LIKE', "%{$searchTerm}%")
                                             ->orWhere('prenom', 'LIKE', "%{$searchTerm}%")
                                             ->orWhere('first_name', 'LIKE', "%{$searchTerm}%")
                                             ->orWhere('last_name', 'LIKE', "%{$searchTerm}%")
                                             ->orWhere('matricule', 'LIKE', "%{$searchTerm}%");
                                });
                      })
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences with pagination
     */
    public function getAbsencesPaginated(int $perPage = 10, int $page = 1): array
    {
        $skip = ($page - 1) * $perPage;
        
        $total = Absence::count();
        $absences = Absence::with(self::ABSENCE_RELATIONS)
                           ->orderByDesc('date_absence')
                           ->skip($skip)
                           ->take($perPage)
                           ->get();
        
        $totalPages = ceil($total / $perPage);
        
        return [
            'absences' => $absences,
            'total' => $total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'perPage' => $perPage
        ];
    }

    /**
     * Get absences by student
     */
    public function getAbsencesByEtudiant(int $etudiantId): Collection
    {
        return Absence::with(['cours', 'examen'])
                      ->where('etudiant_id', $etudiantId)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by course
     */
    public function getAbsencesByCours(int $coursId): Collection
    {
        return Absence::with([
                          'etudiant.promotion', 
                          'etudiant.etablissement', 
                          'etudiant.ville', 
                          'etudiant.group', 
                          'etudiant.option'
                      ])
                      ->where('cours_id', $coursId)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by exam
     */
    public function getAbsencesByExamen(int $examenId): Collection
    {
        return Absence::with([
                          'etudiant.promotion', 
                          'etudiant.etablissement', 
                          'etudiant.ville', 
                          'etudiant.group', 
                          'etudiant.option'
                      ])
                      ->where('examen_id', $examenId)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Justify an absence
     */
    public function justifierAbsence(int $id, array $data): ?Absence
    {
        $absence = Absence::find($id);
        if ($absence) {
            $absence->update($data);
            return $absence->fresh(self::ABSENCE_RELATIONS);
        }
        return null;
    }

    /**
     * Get absences by date range
     */
    public function getAbsencesByDateRange(string $dateDebut, string $dateFin): Collection
    {
        return Absence::with(self::ABSENCE_RELATIONS)
                      ->whereBetween('date_absence', [$dateDebut, $dateFin])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by type
     */
    public function getAbsencesByType(string $type): Collection
    {
        return Absence::with(self::ABSENCE_RELATIONS)
                      ->where('type_absence', $type)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get justified/unjustified absences
     */
    public function getAbsencesByJustification(bool $justifiee): Collection
    {
        return Absence::with(self::ABSENCE_RELATIONS)
                      ->where('justifiee', $justifiee)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by student and date range
     */
    public function getAbsencesByEtudiantAndDateRange(int $etudiantId, string $dateDebut, string $dateFin): Collection
    {
        return Absence::with(['cours', 'examen'])
                      ->where('etudiant_id', $etudiantId)
                      ->whereBetween('date_absence', [$dateDebut, $dateFin])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by course and date range
     */
    public function getAbsencesByCoursAndDateRange(int $coursId, string $dateDebut, string $dateFin): Collection
    {
        return Absence::with([
                          'etudiant.promotion', 
                          'etudiant.etablissement', 
                          'etudiant.ville', 
                          'etudiant.group', 
                          'etudiant.option'
                      ])
                      ->where('cours_id', $coursId)
                      ->whereBetween('date_absence', [$dateDebut, $dateFin])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absence statistics
     */
    public function getAbsenceStatistics(): array
    {
        $totalAbsences = Absence::count();
        $justifiedAbsences = Absence::where('justifiee', true)->count();
        $unjustifiedAbsences = Absence::where('justifiee', false)->count();
        
        // Absences par mois (derniers 12 mois)
        $monthlyStats = Absence::selectRaw('MONTH(date_absence) as month, YEAR(date_absence) as year, COUNT(*) as count')
                               ->where('date_absence', '>=', Carbon::now()->subMonths(12))
                               ->groupBy('month', 'year')
                               ->orderBy('year')
                               ->orderBy('month')
                               ->get();

        // Types d'absences les plus fréquents
        $typeStats = Absence::selectRaw('type_absence, COUNT(*) as count')
                            ->groupBy('type_absence')
                            ->orderByDesc('count')
                            ->limit(10)
                            ->get();

        // Étudiants avec le plus d'absences
        $studentStats = Absence::selectRaw('etudiant_id, COUNT(*) as count')
                               ->with('etudiant:id,nom,prenom')
                               ->groupBy('etudiant_id')
                               ->orderByDesc('count')
                               ->limit(10)
                               ->get();

        return [
            'total' => $totalAbsences,
            'justified' => $justifiedAbsences,
            'unjustified' => $unjustifiedAbsences,
            'justification_rate' => $totalAbsences > 0 ? round(($justifiedAbsences / $totalAbsences) * 100, 2) : 0,
            'monthly_stats' => $monthlyStats,
            'type_stats' => $typeStats,
            'student_stats' => $studentStats,
        ];
    }

    /**
     * Get absences count
     */
    public function getAbsencesCount(): int
    {
        return Absence::count();
    }

    /**
     * Get justified absences count
     */
    public function getJustifiedAbsencesCount(): int
    {
        return Absence::where('justifiee', true)->count();
    }

    /**
     * Get unjustified absences count
     */
    public function getUnjustifiedAbsencesCount(): int
    {
        return Absence::where('justifiee', false)->count();
    }

    /**
     * Get absences count by student
     */
    public function getAbsencesCountByEtudiant(int $etudiantId): int
    {
        return Absence::where('etudiant_id', $etudiantId)->count();
    }

    /**
     * Get absences count by course
     */
    public function getAbsencesCountByCours(int $coursId): int
    {
        return Absence::where('cours_id', $coursId)->count();
    }

    /**
     * Get absences count by exam
     */
    public function getAbsencesCountByExamen(int $examenId): int
    {
        return Absence::where('examen_id', $examenId)->count();
    }

    /**
     * Bulk create absences
     */
    public function createMultipleAbsences(array $absencesData): Collection
    {
        $absences = collect();
        
        foreach ($absencesData as $absenceData) {
            if (isset($absenceData['etudiant_id']) && 
                (isset($absenceData['cours_id']) || isset($absenceData['examen_id']))) {
                $absence = $this->createAbsence($absenceData);
                $absences->push($absence);
            }
        }
        
        return $absences;
    }

    /**
     * Get absences with student details
     */
    public function getAbsencesWithStudentDetails(): Collection
    {
        return Absence::with([
                          'etudiant:id,matricule,first_name,last_name,promotion_id,etablissement_id,ville_id,group_id,option_id',
                          'etudiant.promotion:id,name', 
                          'etudiant.etablissement:id,name', 
                          'etudiant.ville:id,name', 
                          'etudiant.group:id,title', 
                          'etudiant.option:id,name',
                          'cours:id,name', 
                          'examen:id,title'
                      ])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get students ranking by absences count
     */
    public function getStudentsRanking(array $filters = []): array
    {
        $limit = $filters['limit'] ?? 50;
        $dateDebut = $filters['date_debut'] ?? null;
        $dateFin = $filters['date_fin'] ?? null;
        $etablissementId = $filters['etablissement_id'] ?? null;
        $promotionId = $filters['promotion_id'] ?? null;
        $sortBy = $filters['sort_by'] ?? 'total'; // 'total', 'non_justifiees', 'justifiees'

        $query = Absence::selectRaw('
                etudiant_id,
                COUNT(*) as total_absences,
                SUM(CASE WHEN justifiee = 1 THEN 1 ELSE 0 END) as absences_justifiees,
                SUM(CASE WHEN justifiee = 0 THEN 1 ELSE 0 END) as absences_non_justifiees
            ')
            ->with([
                'etudiant:id,matricule,first_name,last_name,photo,promotion_id,etablissement_id,ville_id,group_id,option_id',
                'etudiant.promotion:id,name',
                'etudiant.etablissement:id,name',
                'etudiant.ville:id,name',
                'etudiant.group:id,title',
                'etudiant.option:id,name'
            ])
            ->groupBy('etudiant_id');

        // Appliquer les filtres de date
        if ($dateDebut) {
            $query->where('date_absence', '>=', $dateDebut);
        }
        if ($dateFin) {
            $query->where('date_absence', '<=', $dateFin);
        }

        // Filtre par établissement
        if ($etablissementId) {
            $query->whereHas('etudiant', function($q) use ($etablissementId) {
                $q->where('etablissement_id', $etablissementId);
            });
        }

        // Filtre par promotion
        if ($promotionId) {
            $query->whereHas('etudiant', function($q) use ($promotionId) {
                $q->where('promotion_id', $promotionId);
            });
        }

        // Trier selon le critère
        switch ($sortBy) {
            case 'non_justifiees':
                $query->orderByDesc('absences_non_justifiees');
                break;
            case 'justifiees':
                $query->orderByDesc('absences_justifiees');
                break;
            default:
                $query->orderByDesc('total_absences');
        }

        $results = $query->limit($limit)->get();

        // Formater les résultats avec le pourcentage de justification
        $ranking = $results->map(function ($item, $index) {
            $total = $item->total_absences;
            $justifiees = $item->absences_justifiees;
            $nonJustifiees = $item->absences_non_justifiees;
            $tauxJustification = $total > 0 ? round(($justifiees / $total) * 100, 2) : 0;

            return [
                'rank' => $index + 1,
                'etudiant_id' => $item->etudiant_id,
                'etudiant' => $item->etudiant ? [
                    'id' => $item->etudiant->id,
                    'matricule' => $item->etudiant->matricule,
                    'first_name' => $item->etudiant->first_name,
                    'last_name' => $item->etudiant->last_name,
                    'photo' => $item->etudiant->photo,
                    'promotion' => $item->etudiant->promotion,
                    'etablissement' => $item->etudiant->etablissement,
                    'ville' => $item->etudiant->ville,
                    'group' => $item->etudiant->group,
                    'option' => $item->etudiant->option,
                ] : null,
                'total_absences' => $total,
                'absences_justifiees' => $justifiees,
                'absences_non_justifiees' => $nonJustifiees,
                'taux_justification' => $tauxJustification,
            ];
        });

        return [
            'ranking' => $ranking,
            'total_students' => $ranking->count(),
            'filters' => $filters,
        ];
    }
} 