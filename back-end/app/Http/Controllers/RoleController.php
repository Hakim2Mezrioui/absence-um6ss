<?php

namespace App\Http\Controllers;

use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    protected $roleService;

    public function __construct(RoleService $roleService)
    {
        $this->roleService = $roleService;
    }

    /**
     * Afficher la liste des rôles avec pagination et filtres.
     */
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = Role::query();

        // Appliquer le filtre de recherche si nécessaire
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where("name", "LIKE", "%{$searchValue}%");
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $roles = $query->limit($size)->skip($skip)->orderBy("name")->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "roles" => $roles,
            "totalPages" => $totalPages,
            "total" => $total,
            "status" => 200
        ]);
    }

    /**
     * Afficher un rôle spécifique.
     */
    public function show($id)
    {
        $role = $this->roleService->getRoleById((int) $id);
        
        if (!$role) {
            return response()->json(['message' => 'Rôle non trouvé'], 404);
        }
        
        return response()->json($role);
    }

    /**
     * Ajouter un nouveau rôle.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
        ]);

        $role = $this->roleService->createRole($validatedData);

        return response()->json([
            'message' => 'Rôle ajouté avec succès', 
            'role' => $role
        ], 201);
    }

    /**
     * Mettre à jour un rôle existant.
     */
    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('roles', 'name')->ignore($id),
            ],
        ]);

        $role = $this->roleService->updateRole((int) $id, $validatedData);

        if (!$role) {
            return response()->json(['message' => 'Rôle non trouvé'], 404);
        }

        return response()->json([
            'message' => 'Rôle mis à jour avec succès', 
            'role' => $role
        ]);
    }

    /**
     * Supprimer un rôle.
     */
    public function destroy($id)
    {
        $deleted = $this->roleService->deleteRole((int) $id);

        if (!$deleted) {
            return response()->json(['message' => 'Rôle non trouvé'], 404);
        }

        return response()->json(['message' => 'Rôle supprimé avec succès']);
    }

    /**
     * Obtenir tous les rôles (sans pagination).
     */
    public function getAll()
    {
        $roles = $this->roleService->getAllRoles();
        
        return response()->json([
            'roles' => $roles,
            'status' => 200
        ]);
    }

    /**
     * Rechercher des rôles par nom.
     */
    public function search(Request $request)
    {
        $searchValue = $request->query("search", "");
        
        if (empty($searchValue)) {
            return response()->json(['message' => 'Terme de recherche requis'], 400);
        }

        $roles = $this->roleService->searchRoles($searchValue);
        
        return response()->json([
            'roles' => $roles,
            'status' => 200
        ]);
    }
} 