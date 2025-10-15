<?php

namespace App\Services;

use App\Models\Promotion;
use Illuminate\Support\Collection;

class PromotionService
{
    use FilterByUserContext;
    /**
     * Get all promotions
     */
    public function getAllPromotions(): Collection
    {
        return Promotion::orderBy('name')->get();
    }

    /**
     * Get a specific promotion by ID
     */
    public function getPromotionById(int $id): ?Promotion
    {
        return Promotion::find($id);
    }

    /**
     * Get a promotion by name
     */
    public function getPromotionByName(string $name): ?Promotion
    {
        return Promotion::where('name', $name)->first();
    }

    /**
     * Create a new promotion
     */
    public function createPromotion(array $data): Promotion
    {
        return Promotion::create($data);
    }

    /**
     * Update an existing promotion
     */
    public function updatePromotion(int $id, array $data): ?Promotion
    {
        $promotion = Promotion::find($id);
        if ($promotion) {
            $promotion->update($data);
            return $promotion->fresh();
        }
        return null;
    }

    /**
     * Delete a promotion
     */
    public function deletePromotion(int $id): bool
    {
        $promotion = Promotion::find($id);
        if ($promotion) {
            return $promotion->delete();
        }
        return false;
    }

    /**
     * Search promotions by name
     */
    public function searchPromotions(string $searchTerm): Collection
    {
        return Promotion::where('name', 'LIKE', "%{$searchTerm}%")
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get promotions with pagination
     */
    public function getPromotionsPaginated(int $perPage = 10, int $page = 1): array
    {
        $skip = ($page - 1) * $perPage;
        
        $total = Promotion::count();
        $promotions = Promotion::orderBy('name')
                              ->skip($skip)
                              ->take($perPage)
                              ->get();
        
        $totalPages = ceil($total / $perPage);
        
        return [
            'promotions' => $promotions,
            'total' => $total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'perPage' => $perPage
        ];
    }

    /**
     * Check if a promotion exists by name
     */
    public function promotionExists(string $name): bool
    {
        return Promotion::where('name', $name)->exists();
    }

    /**
     * Get promotions by multiple IDs
     */
    public function getPromotionsByIds(array $ids): Collection
    {
        return Promotion::whereIn('id', $ids)->get();
    }

    /**
     * Create multiple promotions at once
     */
    public function createMultiplePromotions(array $promotionsData): Collection
    {
        $promotions = collect();
        
        foreach ($promotionsData as $promotionData) {
            if (isset($promotionData['name']) && !$this->promotionExists($promotionData['name'])) {
                $promotion = $this->createPromotion($promotionData);
                $promotions->push($promotion);
            }
        }
        
        return $promotions;
    }

    /**
     * Get promotions count
     */
    public function getPromotionsCount(): int
    {
        return Promotion::count();
    }

    /**
     * Get promotions by etablissement
     */
    public function getPromotionsByEtablissement(int $etablissementId): Collection
    {
        return Promotion::whereHas('etablissement', function($query) use ($etablissementId) {
            $query->where('id', $etablissementId);
        })->orderBy('name')->get();
    }

    /**
     * Get promotions by faculte
     */
    public function getPromotionsByFaculte(int $faculteId): Collection
    {
        return Promotion::whereHas('faculte', function($query) use ($faculteId) {
            $query->where('id', $faculteId);
        })->orderBy('name')->get();
    }

    /**
     * Get promotions with students count
     */
    public function getPromotionsWithStudentsCount(): Collection
    {
        return Promotion::withCount('etudiants')->orderBy('name')->get();
    }

    /**
     * Get promotions with groups count
     */
    public function getPromotionsWithGroupsCount(): Collection
    {
        return Promotion::withCount('groups')->orderBy('name')->get();
    }

    /**
     * Get promotions by year level
     */
    public function getPromotionsByYearLevel(string $yearLevel): Collection
    {
        return Promotion::where('name', 'LIKE', "%{$yearLevel}%")
                       ->orderBy('name')
                       ->get();
    }

    /**
     * Get active promotions (those with students or groups)
     */
    public function getActivePromotions(): Collection
    {
        return Promotion::whereHas('etudiants')
                       ->orWhereHas('groups')
                       ->orderBy('name')
                       ->get();
    }
} 