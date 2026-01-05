<?php

namespace App\Services;

use App\Models\Salle;
use Illuminate\Database\Eloquent\Collection;

class SalleService
{
    use FilterByUserContext;
    protected $model;

    public function __construct()
    {
        $this->model = new Salle();
    }

    /**
     * Get all salles (filtered by user context: ville_id)
     */
    public function getAllSalles(): Collection
    {
        return Salle::with(['ville'])
            ->orderBy('name')
            ->get();
    }

    /**
     * Get salle by ID
     */
    public function getSalleById(int $id): ?Salle
    {
        return Salle::with(['ville'])->find($id);
    }

    /**
     * Create a new salle
     */
    public function createSalle(array $data): Salle
    {
        $context = $this->getUserContextForFiltering();
        
        // Automatically set ville_id from user context if not provided
        if (!isset($data['ville_id']) && $context['ville_id']) {
            $data['ville_id'] = $context['ville_id'];
        }
        
        return Salle::create($data);
    }

    /**
     * Update salle
     */
    public function updateSalle(int $id, array $data): ?Salle
    {
        $salle = Salle::find($id);
        if (!$salle) {
            return null;
        }

        $salle->update($data);
        return $salle;
    }

    /**
     * Delete salle
     */
    public function deleteSalle(int $id): bool
    {
        $salle = Salle::find($id);
        if (!$salle) {
            return false;
        }

        // Vérifier si la salle est utilisée dans d'autres tables
        if ($this->isSalleUsed($id)) {
            return false;
        }

        return $salle->delete();
    }

    /**
     * Check if salle is used in other tables
     */
    private function isSalleUsed(int $id): bool
    {
        // Vérifier si la salle est utilisée dans les examens
        $examensCount = \App\Models\Examen::where('salle_id', $id)->count();
        
        // Vérifier si la salle est utilisée dans les cours
        $coursCount = \App\Models\Cours::where('salle_id', $id)->count();

        return $examensCount > 0 || $coursCount > 0;
    }

    /**
     * Get salles by establishment (deprecated - salles are now independent)
     */
    public function getSallesByEtablissement(int $etablissementId): Collection
    {
        // Les salles ne sont plus liées aux établissements
        return Salle::with(['ville'])
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Get salles by building
     */
    public function getSallesByBuilding(string $batiment): Collection
    {
        return Salle::where('batiment', $batiment)
                   ->orderBy('etage')
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Get salles by floor
     */
    public function getSallesByFloor(int $etage): Collection
    {
        return Salle::where('etage', $etage)
                   ->orderBy('batiment')
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Search salles by name
     */
    public function searchSalles(string $search): Collection
    {
        return Salle::where('name', 'LIKE', "%{$search}%")
                   ->orWhere('batiment', 'LIKE', "%{$search}%")
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Get available salles for a specific time slot
     */
    public function getAvailableSalles(string $date, string $heure_debut, string $heure_fin): Collection
    {
        // Récupérer les salles qui ont des examens/cours à cette heure
        $occupiedSalles = \App\Models\Examen::where('date', $date)
            ->where(function ($query) use ($heure_debut, $heure_fin) {
                $query->whereBetween('heure_debut', [$heure_debut, $heure_fin])
                      ->orWhereBetween('heure_fin', [$heure_debut, $heure_fin])
                      ->orWhere(function ($q) use ($heure_debut, $heure_fin) {
                          $q->where('heure_debut', '<=', $heure_debut)
                            ->where('heure_fin', '>=', $heure_fin);
                      });
            })
            ->pluck('salle_id');

        // Retourner les salles disponibles
        return Salle::whereNotIn('id', $occupiedSalles)
                   ->orderBy('name')
                   ->get();
    }
} 