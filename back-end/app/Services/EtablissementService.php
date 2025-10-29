<?php

namespace App\Services;

use App\Models\Etablissement;
use App\Models\Etudiant;
use App\Models\Cours;
use App\Models\Examen;
use App\Models\Group;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class EtablissementService
{
    /**
     * Get all establishments with their relationships
     */
    public function getAllEtablissements(): Collection
    {
        return Etablissement::query()->get();
    }

    /**
     * Get a specific establishment by ID
     */
    public function getEtablissementById(int $id): ?Etablissement
    {
        return Etablissement::find($id);
    }

    /**
     * Create a new establishment
     */
    public function createEtablissement(array $data): Etablissement
    {
        return Etablissement::create($data);
    }

    /**
     * Update an existing establishment
     */
    public function updateEtablissement(int $id, array $data): ?Etablissement
    {
        $etablissement = Etablissement::find($id);
        if ($etablissement) {
            $etablissement->update($data);
            return $etablissement->fresh();
        }
        return null;
    }

    /**
     * Delete an establishment
     */
    public function deleteEtablissement(int $id): bool
    {
        $etablissement = Etablissement::find($id);
        if ($etablissement) {
            return $etablissement->delete();
        }
        return false;
    }

    /**
     * Get establishments by ville
     */
    // Removed: etablissements no longer have ville_id

    /**
     * Get establishment statistics
     */
    public function getEtablissementStatistics(int $etablissementId): array
    {
        $etudiantsCount = Etudiant::where('etablissement_id', $etablissementId)->count();
        $coursCount = Cours::where('etablissement_id', $etablissementId)->count();
        $examensCount = Examen::where('etablissement_id', $etablissementId)->count();
        $groupsCount = Group::where('etablissement_id', $etablissementId)->count();

        $etudiantsByPromotion = Etudiant::where('etablissement_id', $etablissementId)
                                        ->select('promotion', DB::raw('count(*) as count'))
                                        ->groupBy('promotion')
                                        ->get()
                                        ->pluck('count', 'promotion')
                                        ->toArray();

        $etudiantsByFaculte = Etudiant::where('etablissement_id', $etablissementId)
                                     ->select('faculte', DB::raw('count(*) as count'))
                                     ->groupBy('faculte')
                                     ->get()
                                     ->pluck('count', 'faculte')
                                     ->toArray();

        return [
            'etudiants_count' => $etudiantsCount,
            'cours_count' => $coursCount,
            'examens_count' => $examensCount,
            'groups_count' => $groupsCount,
            'etudiants_by_promotion' => $etudiantsByPromotion,
            'etudiants_by_faculte' => $etudiantsByFaculte
        ];
    }

    /**
     * Get establishment with all related data
     */
    public function getEtablissementWithDetails(int $etablissementId): ?Etablissement
    {
        return Etablissement::with([
            'etudiants' => function ($query) {
                $query->with(['group', 'promotion', 'faculte']);
            },
            'cours' => function ($query) {
                $query->with(['faculte', 'salle', 'typeCours']);
            },
            'examens' => function ($query) {
                $query->with(['faculte', 'salle', 'typeExamen']);
            },
            'groups' => function ($query) {
                $query->with(['promotion', 'ville']);
            }
        ])->find($etablissementId);
    }

    /**
     * Search establishments
     */
    public function searchEtablissements(string $query): Collection
    {
        return Etablissement::where('name', 'LIKE', "%{$query}%")
                           ->get();
    }

    /**
     * Get establishments with student count
     */
    public function getEtablissementsWithStudentCount(): Collection
    {
        return Etablissement::withCount('etudiants')
                           ->get();
    }

    /**
     * Get establishments with course count
     */
    public function getEtablissementsWithCourseCount(): Collection
    {
        return Etablissement::withCount('cours')
                           ->get();
    }

    /**
     * Get establishments with exam count
     */
    public function getEtablissementsWithExamCount(): Collection
    {
        return Etablissement::withCount('examens')
                           ->get();
    }

    /**
     * Get establishments with group count
     */
    public function getEtablissementsWithGroupCount(): Collection
    {
        return Etablissement::withCount('groups')
                           ->get();
    }

    /**
     * Get establishment summary for dashboard
     */
    public function getEtablissementSummary(): array
    {
        $totalEtablissements = Etablissement::count();
        $totalEtudiants = Etudiant::count();
        $totalCours = Cours::count();
        $totalExamens = Examen::count();
        $totalGroups = Group::count();

        $etablissementsWithCounts = Etablissement::withCount(['etudiants', 'cours', 'examens', 'groups'])
                                                ->get()
                                                ->map(function ($etablissement) {
                                                    return [
                                                        'id' => $etablissement->id,
                                                        'name' => $etablissement->name,
                                                        'etudiants_count' => $etablissement->etudiants_count,
                                                        'cours_count' => $etablissement->cours_count,
                                                        'examens_count' => $etablissement->examens_count,
                                                        'groups_count' => $etablissement->groups_count
                                                    ];
                                                });

        return [
            'total_etablissements' => $totalEtablissements,
            'total_etudiants' => $totalEtudiants,
            'total_cours' => $totalCours,
            'total_examens' => $totalExamens,
            'total_groups' => $totalGroups,
            'etablissements' => $etablissementsWithCounts
        ];
    }

    /**
     * Get establishment performance metrics
     */
    public function getEtablissementPerformanceMetrics(int $etablissementId, string $period = 'month'): array
    {
        $query = Etudiant::where('etablissement_id', $etablissementId);

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

    /**
     * Get establishments by region/ville
     */
    // Removed: etablissements no longer have ville_id

    /**
     * Get establishment capacity information
     */
    public function getEtablissementCapacity(int $etablissementId): array
    {
        $etudiantsCount = Etudiant::where('etablissement_id', $etablissementId)->count();
        $groupsCount = Group::where('etablissement_id', $etablissementId)->count();
        
        // Calculate average group size
        $averageGroupSize = $groupsCount > 0 ? round($etudiantsCount / $groupsCount, 2) : 0;

        return [
            'total_students' => $etudiantsCount,
            'total_groups' => $groupsCount,
            'average_group_size' => $averageGroupSize,
            'capacity_utilization' => $this->calculateCapacityUtilization($etablissementId)
        ];
    }

    /**
     * Calculate capacity utilization
     */
    private function calculateCapacityUtilization(int $etablissementId): float
    {
        // Add your capacity calculation logic here
        // This is a placeholder - implement according to your needs
        return 0.0;
    }
} 