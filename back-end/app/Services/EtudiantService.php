<?php

namespace App\Services;

use App\Models\Etudiant;
use App\Models\Group;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class EtudiantService
{
    use FilterByUserContext;
    /**
     * Get all students with their relationships (filtered by user context)
     */
    public function getAllEtudiants(): Collection
    {
        $query = Etudiant::with(['group', 'etablissement', 'promotion', 'ville']);
        return $this->applyUserContextFilters($query)->get();
    }

    /**
     * Get a specific student by matricule (filtered by user context)
     */
    public function getEtudiantByMatricule(string $matricule): ?Etudiant
    {
        $query = Etudiant::with(['group', 'etablissement', 'promotion', 'ville'])->where('matricule', $matricule);
        return $this->applyUserContextFilters($query)->first();
    }

    /**
     * Create a new student (with user context)
     */
    public function createEtudiant(array $data): Etudiant
    {
        $context = $this->getUserContextForFiltering();
        
        // Automatically set ville_id and etablissement_id from user context
        if ($context['ville_id']) {
            $data['ville_id'] = $context['ville_id'];
        }
        if ($context['etablissement_id']) {
            $data['etablissement_id'] = $context['etablissement_id'];
        }
        
        return Etudiant::create($data);
    }

    /**
     * Update an existing student (filtered by user context)
     */
    public function updateEtudiant(string $matricule, array $data): ?Etudiant
    {
        $query = Etudiant::where('matricule', $matricule);
        $etudiant = $this->applyUserContextFilters($query)->first();
        
        if ($etudiant) {
            $etudiant->update($data);
            return $etudiant->fresh();
        }
        return null;
    }

    /**
     * Delete a student (filtered by user context)
     */
    public function deleteEtudiant(string $matricule): bool
    {
        $query = Etudiant::where('matricule', $matricule);
        $etudiant = $this->applyUserContextFilters($query)->first();
        
        if ($etudiant) {
            return $etudiant->delete();
        }
        return false;
    }

    /**
     * Get students by promotion
     */
    public function getEtudiantsByPromotion(string $promotion): Collection
    {
        return Etudiant::where('promotion', $promotion)
                      ->with(['group', 'etablissement', 'ville'])
                      ->get();
    }

    /**
     * Get students by faculte
     */
    public function getEtudiantsByFaculte(string $faculte): Collection
    {
        return Etudiant::where('faculte', strtolower($faculte))
                      ->with(['group', 'etablissement', 'promotion', 'ville'])
                      ->get();
    }

    /**
     * Get students by group
     */
    public function getEtudiantsByGroup(int $groupId): Collection
    {
        return Etudiant::where('group_id', $groupId)
                      ->with(['etablissement', 'promotion', 'ville'])
                      ->get();
    }

    /**
     * Get students by etablissement
     */
    public function getEtudiantsByEtablissement(int $etablissementId): Collection
    {
        return Etudiant::where('etablissement_id', $etablissementId)
                      ->with(['group', 'promotion', 'ville'])
                      ->get();
    }

    /**
     * Get students by ville
     */
    public function getEtudiantsByVille(int $villeId): Collection
    {
        return Etudiant::where('ville_id', $villeId)
                      ->with(['group', 'etablissement', 'promotion'])
                      ->get();
    }

    /**
     * Search students by name or matricule (filtered by user context)
     */
    public function searchEtudiants(string $query): Collection
    {
        $queryBuilder = Etudiant::where('first_name', 'LIKE', "%{$query}%")
                      ->orWhere('last_name', 'LIKE', "%{$query}%")
                      ->orWhere('matricule', 'LIKE', "%{$query}%")
                      ->with(['group', 'etablissement', 'promotion', 'ville']);
        
        return $this->applyUserContextFilters($queryBuilder)->get();
    }

    /**
     * Get students with specific filters (filtered by user context)
     */
    public function getEtudiantsWithFilters(array $filters): Collection
    {
        $query = Etudiant::query();

        if (isset($filters['groupe']) && $filters['groupe'] != 0) {
            $query->where('groupe', $filters['groupe']);
        }

        if (isset($filters['option_id']) && $filters['option_id'] != 0) {
            $query->where('option_id', $filters['option_id']);
        }

        if (isset($filters['faculte']) && !empty($filters['faculte'])) {
            $query->where('faculte', strtolower($filters['faculte']));
        }

        if (isset($filters['promotion']) && !empty($filters['promotion'])) {
            $query->where('promotion', $filters['promotion']);
        }

        // Apply user context filters
        $this->applyUserContextFilters($query);

        return $query->with(['group', 'etablissement', 'promotion', 'ville'])->get();
    }

    /**
     * Assign student to a group
     */
    public function assignStudentToGroup(string $matricule, int $groupId): bool
    {
        $etudiant = Etudiant::where('matricule', $matricule)->first();
        if ($etudiant) {
            $etudiant->update(['group_id' => $groupId]);
            return true;
        }
        return false;
    }

    /**
     * Remove student from group
     */
    public function removeStudentFromGroup(string $matricule): bool
    {
        $etudiant = Etudiant::where('matricule', $matricule)->first();
        if ($etudiant) {
            $etudiant->update(['group_id' => null]);
            return true;
        }
        return false;
    }

    /**
     * Get students statistics
     */
    public function getEtudiantsStatistics(): array
    {
        $total = Etudiant::count();
        $withGroup = Etudiant::whereNotNull('group_id')->count();
        $withoutGroup = $total - $withGroup;

        $byPromotion = Etudiant::select('promotion', DB::raw('count(*) as count'))
                               ->groupBy('promotion')
                               ->get()
                               ->pluck('count', 'promotion')
                               ->toArray();

        $byFaculte = Etudiant::select('faculte', DB::raw('count(*) as count'))
                             ->groupBy('faculte')
                             ->get()
                             ->pluck('count', 'faculte')
                             ->toArray();

        return [
            'total' => $total,
            'with_group' => $withGroup,
            'without_group' => $withoutGroup,
            'by_promotion' => $byPromotion,
            'by_faculte' => $byFaculte
        ];
    }

    /**
     * Import students from CSV
     */
    public function importEtudiantsFromCSV(string $filePath): array
    {
        $results = [
            'success' => 0,
            'errors' => [],
            'total' => 0
        ];

        try {
            $file = fopen($filePath, 'r');
            $headers = fgetcsv($file);
            $results['total'] = count(file($filePath)) - 1; // Exclude header

            while (($row = fgetcsv($file)) !== false) {
                $data = array_combine($headers, $row);
                
                try {
                    $this->createEtudiant($data);
                    $results['success']++;
                } catch (\Exception $e) {
                    $results['errors'][] = [
                        'row' => $data,
                        'error' => $e->getMessage()
                    ];
                }
            }

            fclose($file);
        } catch (\Exception $e) {
            $results['errors'][] = [
                'error' => 'Erreur lors de la lecture du fichier: ' . $e->getMessage()
            ];
        }

        return $results;
    }

    /**
     * Get students for presence tracking
     */
    public function getEtudiantsForPresenceTracking(array $filters): Collection
    {
        $query = Etudiant::query();

        if (isset($filters['faculte'])) {
            $query->where('faculte', strtolower($filters['faculte']));
        }

        if (isset($filters['promotion'])) {
            $query->where('promotion', $filters['promotion']);
        }

        if (isset($filters['groupe']) && $filters['groupe'] != 0) {
            $query->where('groupe', $filters['groupe']);
        }

        if (isset($filters['option_id']) && $filters['option_id'] != 0) {
            $query->where('option_id', $filters['option_id']);
        }

        return $query->with(['group', 'etablissement'])->get();
    }
} 