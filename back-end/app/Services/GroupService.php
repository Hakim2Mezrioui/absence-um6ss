<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Etudiant;
use Illuminate\Support\Collection;

class GroupService
{
    use FilterByUserContext;
    /**
     * Get all groups with their relationships (filtered by user context)
     */
    public function getAllGroups(): Collection
    {
        $query = Group::with(['etablissement', 'promotion', 'ville', 'etudiants']);
        return $this->applyUserContextFilters($query)->get();
    }

    /**
     * Get a specific group by ID with relationships
     */
    public function getGroupById(int $id): Group
    {
        return Group::with(['etablissement', 'promotion', 'ville', 'etudiants'])->findOrFail($id);
    }

    /**
     * Create a new group (with user context)
     */
    public function createGroup(array $data): Group
    {
        $context = $this->getUserContextForFiltering();
        
        // Automatically set ville_id and etablissement_id from user context
        if ($context['ville_id']) {
            $data['ville_id'] = $context['ville_id'];
        }
        if ($context['etablissement_id']) {
            $data['etablissement_id'] = $context['etablissement_id'];
        }
        
        return Group::create($data);
    }

    /**
     * Update an existing group
     */
    public function updateGroup(int $id, array $data): Group
    {
        $group = Group::findOrFail($id);
        $group->update($data);
        return $group;
    }

    /**
     * Delete a group
     */
    public function deleteGroup(int $id): bool
    {
        // ✅ Pas de vérification ici, laisser le contrôleur gérer
        $group = Group::find($id);
        if (!$group) {
            return false;  // Ou lancer une exception personnalisée
        }
        return $group->delete();
    }

    /**
     * Get students by group ID
     */
    public function getStudentsByGroup(int $groupId): Collection
    {
        $group = Group::findOrFail($groupId);
        return $group->etudiants;
    }

    /**
     * Add students to a group
     */
    public function addStudentsToGroup(int $groupId, array $studentIds): bool
    {
        $group = Group::findOrFail($groupId);
        
        foreach ($studentIds as $studentId) {
            $etudiant = Etudiant::where('matricule', $studentId)->first();
            if ($etudiant) {
                $etudiant->update(['group_id' => $groupId]);
            }
        }
        
        return true;
    }

    /**
     * Remove students from a group
     */
    public function removeStudentsFromGroup(int $groupId, array $studentIds): bool
    {
        foreach ($studentIds as $studentId) {
            $etudiant = Etudiant::where('matricule', $studentId)->first();
            if ($etudiant && $etudiant->group_id == $groupId) {
                $etudiant->update(['group_id' => null]);
            }
        }
        
        return true;
    }

    /**
     * Get groups by etablissement
     */
    public function getGroupsByEtablissement(int $etablissementId): Collection
    {
        return Group::where('etablissement_id', $etablissementId)
                   ->with(['promotion', 'ville', 'etudiants'])
                   ->get();
    }

    /**
     * Get groups by promotion
     */
    public function getGroupsByPromotion(int $promotionId): Collection
    {
        return Group::where('promotion_id', $promotionId)
                   ->with(['etablissement', 'ville', 'etudiants'])
                   ->get();
    }

    /**
     * Get groups by ville
     */
    public function getGroupsByVille(int $villeId): Collection
    {
        return Group::where('ville_id', $villeId)
                   ->with(['etablissement', 'promotion', 'etudiants'])
                   ->get();
    }
} 