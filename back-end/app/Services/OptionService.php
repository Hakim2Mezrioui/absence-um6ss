<?php

namespace App\Services;

use App\Models\Option;
use App\Models\Etudiant;
use App\Models\Cours;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class OptionService
{
    /**
     * Get all options with their relationships
     */
    public function getAllOptions(): Collection
    {
        return Option::with(['etablissement'])->get();
    }

    /**
     * Get a specific option by ID
     */
    public function getOptionById(int $id): ?Option
    {
        return Option::with(['etablissement'])->find($id);
    }

    /**
     * Create a new option
     */
    public function createOption(array $data): Option
    {
        return Option::create($data);
    }

    /**
     * Update an existing option
     */
    public function updateOption(int $id, array $data): ?Option
    {
        $option = Option::find($id);
        if ($option) {
            $option->update($data);
            return $option->fresh(['etablissement']);
        }
        return null;
    }

    /**
     * Delete an option
     */
    public function deleteOption(int $id): bool
    {
        $option = Option::find($id);
        if ($option) {
            return $option->delete();
        }
        return false;
    }

    /**
     * Get options by etablissement
     */
    public function getOptionsByEtablissement(int $etablissementId): Collection
    {
        return Option::where('etablissement_id', $etablissementId)
                    ->with(['etablissement'])
                    ->get();
    }

    /**
     * Get option statistics
     */
    public function getOptionStatistics(int $optionId): array
    {
        $etudiantsCount = Etudiant::where('option_id', $optionId)->count();
        $coursCount = Cours::where('option_id', $optionId)->count();

        $etudiantsByPromotion = Etudiant::where('option_id', $optionId)
                                        ->select('promotion', DB::raw('count(*) as count'))
                                        ->groupBy('promotion')
                                        ->get()
                                        ->pluck('count', 'promotion')
                                        ->toArray();

        return [
            'etudiants_count' => $etudiantsCount,
            'cours_count' => $coursCount,
            'etudiants_by_promotion' => $etudiantsByPromotion
        ];
    }

    /**
     * Search options
     */
    public function searchOptions(string $query): Collection
    {
        return Option::where('name', 'LIKE', "%{$query}%")
                    ->orWhere('description', 'LIKE', "%{$query}%")
                    ->with(['etablissement'])
                    ->get();
    }

    /**
     * Get options with student count
     */
    public function getOptionsWithStudentCount(): Collection
    {
        return Option::with(['etablissement'])
                    ->withCount('etudiants')
                    ->get();
    }

    /**
     * Get options with course count
     */
    public function getOptionsWithCourseCount(): Collection
    {
        return Option::with(['etablissement'])
                    ->withCount('cours')
                    ->get();
    }

    /**
     * Get option summary for dashboard
     */
    public function getOptionSummary(): array
    {
        $totalOptions = Option::count();
        $totalEtudiants = Etudiant::count();
        $totalCours = Cours::count();

        $optionsWithCounts = Option::with(['etablissement'])
                                  ->withCount(['etudiants', 'cours'])
                                  ->get()
                                  ->map(function ($option) {
                                      return [
                                          'id' => $option->id,
                                          'name' => $option->name,
                                          'etablissement' => $option->etablissement->name ?? 'N/A',
                                          'etudiants_count' => $option->etudiants_count,
                                          'cours_count' => $option->cours_count
                                      ];
                                  });

        return [
            'total_options' => $totalOptions,
            'total_etudiants' => $totalEtudiants,
            'total_cours' => $totalCours,
            'options' => $optionsWithCounts
        ];
    }

    /**
     * Get options by region/ville
     */
    public function getOptionsByRegion(int $villeId): Collection
    {
        return Option::whereHas('etablissement', function ($query) use ($villeId) {
                        $query->where('ville_id', $villeId);
                    })
                    ->with(['etablissement.ville'])
                    ->withCount(['etudiants', 'cours'])
                    ->get();
    }

    /**
     * Get popular options (by student count)
     */
    public function getPopularOptions(int $limit = 10): Collection
    {
        return Option::with(['etablissement'])
                    ->withCount('etudiants')
                    ->orderBy('etudiants_count', 'desc')
                    ->limit($limit)
                    ->get();
    }

    /**
     * Get options with low enrollment
     */
    public function getOptionsWithLowEnrollment(int $threshold = 5): Collection
    {
        return Option::with(['etablissement'])
                    ->withCount('etudiants')
                    ->having('etudiants_count', '<', $threshold)
                    ->get();
    }
} 