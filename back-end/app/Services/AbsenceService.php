<?php

namespace App\Services;

use App\Models\Absence;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AbsenceService
{
    /**
     * Get all absences
     */
    public function getAllAbsences(): Collection
    {
        return Absence::with(['etudiant', 'cours', 'examen'])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get a specific absence by ID
     */
    public function getAbsenceById(int $id): ?Absence
    {
        return Absence::with(['etudiant', 'cours', 'examen'])->find($id);
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
            return $absence->fresh(['etudiant', 'cours', 'examen']);
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
        return Absence::with(['etudiant', 'cours', 'examen'])
                      ->where(function($query) use ($searchTerm) {
                          $query->where('type_absence', 'LIKE', "%{$searchTerm}%")
                                ->orWhere('motif', 'LIKE', "%{$searchTerm}%")
                                ->orWhereHas('etudiant', function($subQuery) use ($searchTerm) {
                                    $subQuery->where('nom', 'LIKE', "%{$searchTerm}%")
                                             ->orWhere('prenom', 'LIKE', "%{$searchTerm}%");
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
        $absences = Absence::with(['etudiant', 'cours', 'examen'])
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
        return Absence::with(['etudiant'])
                      ->where('cours_id', $coursId)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by exam
     */
    public function getAbsencesByExamen(int $examenId): Collection
    {
        return Absence::with(['etudiant'])
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
            return $absence->fresh(['etudiant', 'cours', 'examen']);
        }
        return null;
    }

    /**
     * Get absences by date range
     */
    public function getAbsencesByDateRange(string $dateDebut, string $dateFin): Collection
    {
        return Absence::with(['etudiant', 'cours', 'examen'])
                      ->whereBetween('date_absence', [$dateDebut, $dateFin])
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get absences by type
     */
    public function getAbsencesByType(string $type): Collection
    {
        return Absence::with(['etudiant', 'cours', 'examen'])
                      ->where('type_absence', $type)
                      ->orderByDesc('date_absence')
                      ->get();
    }

    /**
     * Get justified/unjustified absences
     */
    public function getAbsencesByJustification(bool $justifiee): Collection
    {
        return Absence::with(['etudiant', 'cours', 'examen'])
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
        return Absence::with(['etudiant'])
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
        return Absence::with(['etudiant:id,nom,prenom,matricule', 'cours:id,title', 'examen:id,title'])
                      ->orderByDesc('date_absence')
                      ->get();
    }
} 