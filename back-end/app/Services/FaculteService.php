<?php

namespace App\Services;

use App\Models\Faculte;
use App\Models\Etudiant;
use App\Models\Cours;
use App\Models\Examen;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class FaculteService
{
    /**
     * Get all faculties with their relationships
     */
    public function getAllFacultes(): Collection
    {
        return Faculte::with(['etablissement'])->get();
    }

    /**
     * Get a specific faculty by ID
     */
    public function getFaculteById(int $id): ?Faculte
    {
        return Faculte::with(['etablissement'])->find($id);
    }

    /**
     * Create a new faculty
     */
    public function createFaculte(array $data): Faculte
    {
        return Faculte::create($data);
    }

    /**
     * Update an existing faculty
     */
    public function updateFaculte(int $id, array $data): ?Faculte
    {
        $faculte = Faculte::find($id);
        if ($faculte) {
            $faculte->update($data);
            return $faculte->fresh();
        }
        return null;
    }

    /**
     * Delete a faculty
     */
    public function deleteFaculte(int $id): bool
    {
        $faculte = Faculte::find($id);
        if ($faculte) {
            return $faculte->delete();
        }
        return false;
    }

    /**
     * Get faculties by etablissement
     */
    public function getFacultesByEtablissement(int $etablissementId): Collection
    {
        return Faculte::where('etablissement_id', $etablissementId)->get();
    }

    /**
     * Get faculty statistics
     */
    public function getFaculteStatistics(int $faculteId): array
    {
        $etudiantsCount = Etudiant::where('faculte_id', $faculteId)->count();
        $coursCount = Cours::where('faculte_id', $faculteId)->count();
        $examensCount = Examen::where('faculte_id', $faculteId)->count();

        $etudiantsByPromotion = Etudiant::where('faculte_id', $faculteId)
                                        ->select('promotion', DB::raw('count(*) as count'))
                                        ->groupBy('promotion')
                                        ->get()
                                        ->pluck('count', 'promotion')
                                        ->toArray();

        $coursByType = Cours::where('faculte_id', $faculteId)
                            ->select('type_cours_id', DB::raw('count(*) as count'))
                            ->with('typeCours')
                            ->groupBy('type_cours_id')
                            ->get()
                            ->pluck('count', 'typeCours.name')
                            ->toArray();

        return [
            'etudiants_count' => $etudiantsCount,
            'cours_count' => $coursCount,
            'examens_count' => $examensCount,
            'etudiants_by_promotion' => $etudiantsByPromotion,
            'cours_by_type' => $coursByType
        ];
    }

    /**
     * Get faculty with all related data
     */
    public function getFaculteWithDetails(int $faculteId): ?Faculte
    {
        return Faculte::with([
            'etablissement',
            'etudiants' => function ($query) {
                $query->with(['group', 'promotion', 'ville']);
            },
            'cours' => function ($query) {
                $query->with(['salle', 'typeCours']);
            },
            'examens' => function ($query) {
                $query->with(['salle', 'typeExamen']);
            }
        ])->find($faculteId);
    }

    /**
     * Search faculties
     */
    public function searchFacultes(string $query): Collection
    {
        return Faculte::where('name', 'LIKE', "%{$query}%")
                     ->orWhere('description', 'LIKE', "%{$query}%")
                     ->with(['etablissement'])
                     ->get();
    }

    /**
     * Get faculties with student count
     */
    public function getFacultesWithStudentCount(): Collection
    {
        return Faculte::with(['etablissement'])
                     ->withCount('etudiants')
                     ->get();
    }

    /**
     * Get faculties with course count
     */
    public function getFacultesWithCourseCount(): Collection
    {
        return Faculte::with(['etablissement'])
                     ->withCount('cours')
                     ->get();
    }

    /**
     * Get faculties with exam count
     */
    public function getFacultesWithExamCount(): Collection
    {
        return Faculte::with(['etablissement'])
                     ->withCount('examens')
                     ->get();
    }

    /**
     * Get faculty summary for dashboard
     */
    public function getFaculteSummary(): array
    {
        $totalFacultes = Faculte::count();
        $totalEtudiants = Etudiant::count();
        $totalCours = Cours::count();
        $totalExamens = Examen::count();

        $facultesWithCounts = Faculte::with(['etablissement'])
                                    ->withCount(['etudiants', 'cours', 'examens'])
                                    ->get()
                                    ->map(function ($faculte) {
                                        return [
                                            'id' => $faculte->id,
                                            'name' => $faculte->name,
                                            'etablissement' => $faculte->etablissement->name ?? 'N/A',
                                            'etudiants_count' => $faculte->etudiants_count,
                                            'cours_count' => $faculte->cours_count,
                                            'examens_count' => $faculte->examens_count
                                        ];
                                    });

        return [
            'total_facultes' => $totalFacultes,
            'total_etudiants' => $totalEtudiants,
            'total_cours' => $totalCours,
            'total_examens' => $totalExamens,
            'facultes' => $facultesWithCounts
        ];
    }

    /**
     * Get faculty performance metrics
     */
    public function getFacultePerformanceMetrics(int $faculteId, string $period = 'month'): array
    {
        $query = Etudiant::where('faculte_id', $faculteId);

        switch ($period) {
            case 'week':
                $startDate = now()->startOfWeek();
                $endDate = now()->endOfWeek();
                break;
            case 'month':
                $startDate = now()->startOfMonth();
                $endDate = now()->endOfMonth();
                break;
            case 'year':
                $startDate = now()->startOfYear();
                $endDate = now()->endOfYear();
                break;
            default:
                $startDate = now()->startOfMonth();
                $endDate = now()->endOfMonth();
        }

        // Add your performance metrics logic here
        // This is a placeholder - implement according to your needs

        return [
            'period' => $period,
            'start_date' => $startDate->format('Y-m-d'),
            'end_date' => $endDate->format('Y-m-d'),
            'metrics' => [
                'total_students' => $query->count(),
                // Add more metrics as needed
            ]
        ];
    }
} 