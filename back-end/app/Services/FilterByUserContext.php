<?php

namespace App\Services;

use App\Services\UserContextService;

trait FilterByUserContext
{
    protected $userContextService;

    /**
     * Initialize the user context service
     */
    protected function initUserContext()
    {
        if (!$this->userContextService) {
            $this->userContextService = new UserContextService();
        }
    }

    /**
     * Apply ville and etablissement filters to a query based on authenticated user
     */
    protected function applyUserContextFilters($query, $modelClass = null)
    {
        $this->initUserContext();
        
        $villeId = $this->userContextService->getUserVilleId();
        $etablissementId = $this->userContextService->getUserEtablissementId();

        // Always filter by ville if user has one
        if ($villeId) {
            $query->where('ville_id', $villeId);
        }

        // Filter by etablissement if user has one
        if ($etablissementId) {
            $query->where('etablissement_id', $etablissementId);
        }

        return $query;
    }

    /**
     * Get user context for filtering
     */
    protected function getUserContextForFiltering(): array
    {
        $this->initUserContext();
        return $this->userContextService->getUserContext();
    }

    /**
     * Check if user has ville context
     */
    protected function userHasVille(): bool
    {
        $this->initUserContext();
        return $this->userContextService->hasVille();
    }

    /**
     * Check if user has etablissement context
     */
    protected function userHasEtablissement(): bool
    {
        $this->initUserContext();
        return $this->userContextService->hasEtablissement();
    }
}
