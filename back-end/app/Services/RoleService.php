<?php

namespace App\Services;

use App\Models\Role;
use Illuminate\Support\Collection;

class RoleService
{
    /**
     * Get all roles
     */
    public function getAllRoles(): Collection
    {
        return Role::orderBy('name')->get();
    }

    /**
     * Get a specific role by ID
     */
    public function getRoleById(int $id): ?Role
    {
        return Role::find($id);
    }

    /**
     * Get a role by name
     */
    public function getRoleByName(string $name): ?Role
    {
        return Role::where('name', $name)->first();
    }

    /**
     * Create a new role
     */
    public function createRole(array $data): Role
    {
        return Role::create($data);
    }

    /**
     * Update an existing role
     */
    public function updateRole(int $id, array $data): ?Role
    {
        $role = Role::find($id);
        if ($role) {
            $role->update($data);
            return $role->fresh();
        }
        return null;
    }

    /**
     * Delete a role
     */
    public function deleteRole(int $id): bool
    {
        $role = Role::find($id);
        if ($role) {
            return $role->delete();
        }
        return false;
    }

    /**
     * Search roles by name
     */
    public function searchRoles(string $searchTerm): Collection
    {
        return Role::where('name', 'LIKE', "%{$searchTerm}%")
                   ->orderBy('name')
                   ->get();
    }

    /**
     * Get roles with pagination
     */
    public function getRolesPaginated(int $perPage = 10, int $page = 1): array
    {
        $skip = ($page - 1) * $perPage;
        
        $total = Role::count();
        $roles = Role::orderBy('name')
                     ->skip($skip)
                     ->take($perPage)
                     ->get();
        
        $totalPages = ceil($total / $perPage);
        
        return [
            'roles' => $roles,
            'total' => $total,
            'totalPages' => $totalPages,
            'currentPage' => $page,
            'perPage' => $perPage
        ];
    }

    /**
     * Check if a role exists by name
     */
    public function roleExists(string $name): bool
    {
        return Role::where('name', $name)->exists();
    }

    /**
     * Get roles by multiple IDs
     */
    public function getRolesByIds(array $ids): Collection
    {
        return Role::whereIn('id', $ids)->get();
    }

    /**
     * Create multiple roles at once
     */
    public function createMultipleRoles(array $rolesData): Collection
    {
        $roles = collect();
        
        foreach ($rolesData as $roleData) {
            if (isset($roleData['name']) && !$this->roleExists($roleData['name'])) {
                $role = $this->createRole($roleData);
                $roles->push($role);
            }
        }
        
        return $roles;
    }

    /**
     * Get roles count
     */
    public function getRolesCount(): int
    {
        return Role::count();
    }

    /**
     * Get roles with users count
     */
    public function getRolesWithUsersCount(): Collection
    {
        return Role::withCount('users')->orderBy('name')->get();
    }
} 