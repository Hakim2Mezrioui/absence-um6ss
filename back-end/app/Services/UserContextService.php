<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Auth;

class UserContextService
{
    /**
     * Get the authenticated user's context (ville and etablissement)
     */
    public function getUserContext(): array
    {
        $user = Auth::user();
        
        if (!$user) {
            return [
                'ville_id' => null,
                'etablissement_id' => null,
                'user' => null
            ];
        }

        return [
            'ville_id' => $user->ville_id,
            'etablissement_id' => $user->etablissement_id,
            'user' => $user
        ];
    }

    /**
     * Get the authenticated user's ville ID
     */
    public function getUserVilleId(): ?int
    {
        $user = Auth::user();
        return $user ? $user->ville_id : null;
    }

    /**
     * Get the authenticated user's etablissement ID
     */
    public function getUserEtablissementId(): ?int
    {
        $user = Auth::user();
        return $user ? $user->etablissement_id : null;
    }

    /**
     * Check if user has a specific ville
     */
    public function hasVille(): bool
    {
        return $this->getUserVilleId() !== null;
    }

    /**
     * Check if user has a specific etablissement
     */
    public function hasEtablissement(): bool
    {
        return $this->getUserEtablissementId() !== null;
    }

    /**
     * Get the authenticated user
     */
    public function getAuthenticatedUser(): ?User
    {
        return Auth::user();
    }

    /**
     * Get user context for API responses
     */
    public function getUserContextForApi(): array
    {
        $context = $this->getUserContext();
        
        return [
            'ville_id' => $context['ville_id'],
            'etablissement_id' => $context['etablissement_id'],
            'user_id' => $context['user'] ? $context['user']->id : null,
            'user_role' => $context['user'] ? $context['user']->role_id : null
        ];
    }
}
