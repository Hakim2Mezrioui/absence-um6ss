<?php

namespace App\Services;

use App\Models\TypeExamen;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TypeExamenService extends BaseService
{
    public function __construct()
    {
        parent::__construct(TypeExamen::class);
    }

    /**
     * Récupérer tous les types d'examen
     */
    public function getAllTypesExamen(): Collection
    {
        return TypeExamen::all();
    }

    /**
     * Récupérer un type d'examen par ID
     */
    public function getTypeExamenById(int $id): ?TypeExamen
    {
        return TypeExamen::find($id);
    }

    /**
     * Créer un nouveau type d'examen
     */
    public function createTypeExamen(array $data): TypeExamen
    {
        return TypeExamen::create($data);
    }

    /**
     * Mettre à jour un type d'examen
     */
    public function updateTypeExamen(int $id, array $data): ?TypeExamen
    {
        $typeExamen = TypeExamen::find($id);
        if ($typeExamen) {
            $typeExamen->update($data);
            return $typeExamen;
        }
        return null;
    }

    /**
     * Supprimer un type d'examen
     */
    public function deleteTypeExamen(int $id): bool
    {
        $typeExamen = TypeExamen::find($id);
        if ($typeExamen) {
            return $typeExamen->delete();
        }
        return false;
    }

    /**
     * Rechercher des types d'examen
     */
    public function searchTypesExamen(string $searchValue, int $size = 10, int $page = 1): LengthAwarePaginator
    {
        return TypeExamen::where('name', 'like', "%{$searchValue}%")
            ->orderBy('name')
            ->paginate($size, ['*'], 'page', $page);
    }

    /**
     * Récupérer les types d'examen avec pagination
     */
    public function getTypesExamenPaginated(int $size = 10, int $page = 1): LengthAwarePaginator
    {
        return TypeExamen::orderBy('name')
            ->paginate($size, ['*'], 'page', $page);
    }

    /**
     * Vérifier si un type d'examen existe
     */
    public function typeExamenExists(int $id): bool
    {
        return TypeExamen::where('id', $id)->exists();
    }

    /**
     * Récupérer plusieurs types d'examen par IDs
     */
    public function getTypesExamenByIds(array $ids): Collection
    {
        return TypeExamen::whereIn('id', $ids)->get();
    }

    /**
     * Créer plusieurs types d'examen
     */
    public function createMultipleTypesExamen(array $typesExamenData): Collection
    {
        $createdTypesExamen = collect();
        
        foreach ($typesExamenData as $data) {
            $createdTypesExamen->push($this->createTypeExamen($data));
        }
        
        return $createdTypesExamen;
    }

    /**
     * Compter le nombre total de types d'examen
     */
    public function getTypesExamenCount(): int
    {
        return TypeExamen::count();
    }

    /**
     * Récupérer les types d'examen avec le nombre d'examens associés
     */
    public function getTypesExamenWithExamensCount(): Collection
    {
        return TypeExamen::withCount('examens')->orderBy('name')->get();
    }

    /**
     * Récupérer les types d'examen par catégorie
     */
    public function getTypesExamenByCategory(string $category): Collection
    {
        return TypeExamen::where('name', 'like', "%{$category}%")
            ->orderBy('name')
            ->get();
    }

    /**
     * Récupérer les types d'examen par niveau de difficulté
     */
    public function getTypesExamenByDifficulty(string $difficulty): Collection
    {
        // Logique pour filtrer par difficulté si applicable
        return TypeExamen::where('name', 'like', "%{$difficulty}%")
            ->orderBy('name')
            ->get();
    }

    /**
     * Récupérer les types d'examen par semestre
     */
    public function getTypesExamenBySemester(string $semester): Collection
    {
        return TypeExamen::where('name', 'like', "%{$semester}%")
            ->orderBy('name')
            ->get();
    }

    /**
     * Récupérer les statistiques des types d'examen
     */
    public function getTypesExamenStatistics(): array
    {
        $totalTypes = $this->getTypesExamenCount();
        $typesWithExamens = $this->getTypesExamenWithExamensCount();
        
        $mostUsedType = $typesWithExamens->sortByDesc('examens_count')->first();
        $leastUsedType = $typesWithExamens->sortBy('examens_count')->first();
        
        return [
            'total_types' => $totalTypes,
            'most_used_type' => $mostUsedType ? $mostUsedType->name : null,
            'most_used_count' => $mostUsedType ? $mostUsedType->examens_count : 0,
            'least_used_type' => $leastUsedType ? $leastUsedType->name : null,
            'least_used_count' => $leastUsedType ? $leastUsedType->examens_count : 0,
            'average_examens_per_type' => $totalTypes > 0 ? round($typesWithExamens->avg('examens_count'), 2) : 0
        ];
    }
} 