<?php

namespace App\Services;

use App\Models\TypeCours;
use Illuminate\Support\Collection;

class TypeCoursService
{
    /**
     * Get all types of courses
     */
    public function getAllTypesCours(): Collection
    {
        return TypeCours::orderBy('name')->get();
    }

    /**
     * Get a specific type of course by ID
     */
    public function getTypeCoursById(int $id): ?TypeCours
    {
        return TypeCours::find($id);
    }

    /**
     * Get a type of course by name
     */
    public function getTypeCoursByName(string $name): ?TypeCours
    {
        return TypeCours::where('name', $name)->first();
    }

    /**
     * Create a new type of course
     */
    public function createTypeCours(array $data): TypeCours
    {
        return TypeCours::create($data);
    }

    /**
     * Update an existing type of course
     */
    public function updateTypeCours(int $id, array $data): ?TypeCours
    {
        $typeCours = TypeCours::find($id);
        if ($typeCours) {
            $typeCours->update($data);
            return $typeCours->fresh();
        }
        return null;
    }

    /**
     * Delete a type of course
     */
    public function deleteTypeCours(int $id): bool
    {
        $typeCours = TypeCours::find($id);
        if ($typeCours) {
            return $typeCours->delete();
        }
        return false;
    }

    /**
     * Search types of courses by name
     */
    public function searchTypesCours(string $searchTerm): Collection
    {
        return TypeCours::where('name', 'LIKE', "%{$searchTerm}%")
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get types of courses with pagination
     */
    public function getTypesCoursPaginated(int $perPage = 10, int $page = 1): array
    {
        $skip = ($page - 1) * $perPage;
        
        $total = TypeCours::count();
        $typesCours = TypeCours::orderBy('name')
                               ->skip($skip)
                               ->take($perPage)
                               ->get();
        
        $totalPages = ceil($total / $perPage);
        
        return [
            'typesCours' => $typesCours,
            'total' => $total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'perPage' => $perPage
        ];
    }

    /**
     * Check if a type of course exists by name
     */
    public function typeCoursExists(string $name): bool
    {
        return TypeCours::where('name', $name)->exists();
    }

    /**
     * Get types of courses by multiple IDs
     */
    public function getTypesCoursByIds(array $ids): Collection
    {
        return TypeCours::whereIn('id', $ids)->get();
    }

    /**
     * Create multiple types of courses at once
     */
    public function createMultipleTypesCours(array $typesCoursData): Collection
    {
        $typesCours = collect();
        
        foreach ($typesCoursData as $typeCoursData) {
            if (isset($typeCoursData['name']) && !$this->typeCoursExists($typeCoursData['name'])) {
                $typeCours = $this->createTypeCours($typeCoursData);
                $typesCours->push($typeCours);
            }
        }
        
        return $typesCours;
    }

    /**
     * Get types of courses count
     */
    public function getTypesCoursCount(): int
    {
        return TypeCours::count();
    }

    /**
     * Get types of courses by etablissement
     */
    public function getTypesCoursByEtablissement(int $etablissementId): Collection
    {
        return TypeCours::whereHas('cours', function($query) use ($etablissementId) {
            $query->where('etablissement_id', $etablissementId);
        })->orderBy('name')->get();
    }

    /**
     * Get types of courses by faculte
     */
    public function getTypesCoursByFaculte(int $faculteId): Collection
    {
        return TypeCours::whereHas('cours', function($query) use ($faculteId) {
            $query->where('faculte_id', $faculteId);
        })->orderBy('name')->get();
    }

    /**
     * Get types of courses with courses count
     */
    public function getTypesCoursWithCoursCount(): Collection
    {
        return TypeCours::withCount('cours')->orderBy('name')->get();
    }

    /**
     * Get types of courses by category
     */
    public function getTypesCoursByCategory(string $category): Collection
    {
        return TypeCours::where('name', 'LIKE', "%{$category}%")
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get active types of courses (those with courses)
     */
    public function getActiveTypesCours(): Collection
    {
        return TypeCours::whereHas('cours')
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get types of courses by difficulty level
     */
    public function getTypesCoursByDifficulty(string $difficulty): Collection
    {
        return TypeCours::where('name', 'LIKE', "%{$difficulty}%")
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get types of courses with most courses
     */
    public function getTypesCoursWithMostCourses(int $limit = 5): Collection
    {
        return TypeCours::withCount('cours')
                       ->orderByDesc('cours_count')
                       ->limit($limit)
                       ->get();
    }

    /**
     * Get types of courses by semester
     */
    public function getTypesCoursBySemester(string $semester): Collection
    {
        return TypeCours::where('name', 'LIKE', "%{$semester}%")
                       ->orderBy('name')
                       ->get();
    }
} 