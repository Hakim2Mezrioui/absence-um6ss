<?php

namespace App\Services;

use App\Models\Ville;
use Illuminate\Database\Eloquent\Collection;

class VilleService extends BaseService
{
    public function __construct(Ville $model)
    {
        parent::__construct($model);
    }

    /**
     * Get all villes
     */
    public function getAllVilles(): Collection
    {
        return $this->model->orderBy('name')->get();
    }

    /**
     * Get ville by ID
     */
    public function getVilleById(int $id): ?Ville
    {
        return $this->model->find($id);
    }

    /**
     * Create a new ville
     */
    public function createVille(array $data): Ville
    {
        return $this->model->create($data);
    }

    /**
     * Update ville
     */
    public function updateVille(int $id, array $data): ?Ville
    {
        $ville = $this->getVilleById($id);
        if (!$ville) {
            return null;
        }

        $ville->update($data);
        return $ville;
    }

    /**
     * Delete ville
     */
    public function deleteVille(int $id): bool
    {
        $ville = $this->getVilleById($id);
        if (!$ville) {
            return false;
        }

        // Vérifier si la ville est utilisée dans d'autres tables
        if ($this->isVilleUsed($id)) {
            return false;
        }

        return $ville->delete();
    }

    /**
     * Check if ville is used in other tables
     */
    private function isVilleUsed(int $id): bool
    {
        // Vérifier si la ville est utilisée dans les groupes
        $groupsCount = \App\Models\Group::where('ville_id', $id)->count();
        
        // Vérifier si la ville est utilisée dans les établissements
        $etablissementsCount = \App\Models\Etablissement::where('ville_id', $id)->count();

        return $groupsCount > 0 || $etablissementsCount > 0;
    }

    /**
     * Get villes by establishment
     */
    public function getVillesByEtablissement(int $etablissementId): Collection
    {
        return $this->model->whereHas('etablissements', function ($query) use ($etablissementId) {
            $query->where('id', $etablissementId);
        })->get();
    }

    /**
     * Search villes by name
     */
    public function searchVilles(string $search): Collection
    {
        return $this->model->where('name', 'LIKE', "%{$search}%")
                          ->orderBy('name')
                          ->get();
    }
} 