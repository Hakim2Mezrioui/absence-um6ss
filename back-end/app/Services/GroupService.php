<?php

namespace App\Services;

use App\Models\Group;
use App\Models\Etudiant;
use Illuminate\Support\Collection;

class GroupService
{
    use FilterByUserContext;
    /**
     * Get all groups with their relationships (groupes maintenant globaux)
     */
    public function getAllGroups(): Collection
    {
        return Group::with(['etudiants'])->get();
    }

    /**
     * Get a specific group by ID with relationships
     */
    public function getGroupById(int $id): Group
    {
        return Group::with(['etudiants'])->findOrFail($id);
    }

    /**
     * Create a new group (groupes maintenant globaux)
     */
    public function createGroup(array $data): Group
    {
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
     * Get groups by etablissement (deprecated - groupes maintenant globaux)
     */
    public function getGroupsByEtablissement(int $etablissementId): Collection
    {
        // Les groupes sont maintenant globaux, retourner tous les groupes
        return Group::with(['etudiants'])->get();
    }

    /**
     * Get groups by promotion (deprecated - groupes maintenant globaux)
     */
    public function getGroupsByPromotion(int $promotionId): Collection
    {
        // Les groupes sont maintenant globaux, retourner tous les groupes
        return Group::with(['etudiants'])->get();
    }

    /**
     * Get groups by ville (deprecated - groupes maintenant globaux)
     */
    public function getGroupsByVille(int $villeId): Collection
    {
        // Les groupes sont maintenant globaux, retourner tous les groupes
        return Group::with(['etudiants'])->get();
    }
} 