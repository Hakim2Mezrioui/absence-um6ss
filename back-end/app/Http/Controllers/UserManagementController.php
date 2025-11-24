<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use App\Models\Etablissement;
use App\Models\Ville;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Support\Str;

class UserManagementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        try {
            $query = User::with(['role', 'etablissement', 'ville']);

            // Filtrage par rôle si spécifié
            if ($request->has('role_id')) {
                $query->where('role_id', $request->role_id);
            }

            // Filtrage par établissement si spécifié
            if ($request->has('etablissement_id')) {
                $query->where('etablissement_id', $request->etablissement_id);
            }

            // Filtrage par ville si spécifié
            if ($request->has('ville_id')) {
                $query->where('ville_id', $request->ville_id);
            }

            // Recherche par nom ou email
            if ($request->has('search')) {
                $search = $request->search;
                $query->where(function($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            }

            // Pagination
            $perPage = $request->get('per_page', 15);
            $users = $query->orderBy('created_at', 'desc')->paginate($perPage);

            return response()->json([
                'status' => 'success',
                'data' => $users,
                'message' => 'Liste des utilisateurs récupérée avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des utilisateurs',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validator = Validator::make($request->all(), [
                'first_name' => 'required|string|max:255',
                'last_name' => 'required|string|max:255',
                'email' => 'required|string|email|max:255|unique:users',
                'password' => 'required|string|min:6',
                'role_id' => 'required|integer|exists:roles,id',
                'etablissement_id' => 'nullable|integer|exists:etablissements,id',
                'ville_id' => 'nullable|integer|exists:villes,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Données de validation invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($this->isDefilementRoleId((int) $request->role_id) && !$this->canManageDefilementRole()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous n\'avez pas la permission de créer un compte avec le rôle "Défilement"'
                ], 403);
            }

            $user = User::create([
                'first_name' => $request->first_name,
                'last_name' => $request->last_name,
                'email' => $request->email,
                'password' => Hash::make($request->password),
                'role_id' => $request->role_id,
                'etablissement_id' => $request->etablissement_id,
                'ville_id' => $request->ville_id,
            ]);

            // Charger les relations pour la réponse
            $user->load(['role', 'etablissement', 'ville']);

            return response()->json([
                'status' => 'success',
                'data' => $user,
                'message' => 'Utilisateur créé avec succès'
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la création de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        try {
            $user = User::with(['role', 'etablissement', 'ville'])->findOrFail($id);

            return response()->json([
                'status' => 'success',
                'data' => $user,
                'message' => 'Utilisateur récupéré avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Utilisateur non trouvé',
                'error' => $e->getMessage()
            ], 404);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        try {
            $user = User::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'first_name' => 'sometimes|string|max:255',
                'last_name' => 'sometimes|string|max:255',
                'email' => [
                    'sometimes',
                    'string',
                    'email',
                    'max:255',
                    Rule::unique('users')->ignore($user->id)
                ],
                'password' => 'sometimes|string|min:6',
                'role_id' => 'sometimes|integer|exists:roles,id',
                'etablissement_id' => 'sometimes|nullable|integer|exists:etablissements,id',
                'ville_id' => 'sometimes|nullable|integer|exists:villes,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Données de validation invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            $updateData = $request->only([
                'first_name', 'last_name', 'email', 'role_id', 'etablissement_id', 'ville_id'
            ]);

            if (array_key_exists('role_id', $updateData) && $updateData['role_id']) {
                if ($this->isDefilementRoleId((int) $updateData['role_id']) && !$this->canManageDefilementRole()) {
                    return response()->json([
                        'status' => 'error',
                        'message' => 'Vous n\'avez pas la permission d\'attribuer le rôle "Défilement"'
                    ], 403);
                }
            }

            // Hacher le mot de passe si fourni
            if ($request->has('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Recharger l'utilisateur avec les relations
            $user->load(['role', 'etablissement', 'ville']);

            return response()->json([
                'status' => 'success',
                'data' => $user,
                'message' => 'Utilisateur mis à jour avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la mise à jour de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        try {
            $user = User::findOrFail($id);

            // Empêcher la suppression de son propre compte
            if ($user->id === auth()->id()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous ne pouvez pas supprimer votre propre compte'
                ], 403);
            }

            $user->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Utilisateur supprimé avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la suppression de l\'utilisateur',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour le rôle d'un utilisateur
     */
    public function updateRole(Request $request, string $id)
    {
        try {
            $user = User::findOrFail($id);

            $validator = Validator::make($request->all(), [
                'role_id' => 'required|integer|exists:roles,id',
            ]);

            if ($validator->fails()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Données de validation invalides',
                    'errors' => $validator->errors()
                ], 422);
            }

            if ($this->isDefilementRoleId((int) $request->role_id) && !$this->canManageDefilementRole()) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Vous n\'avez pas la permission d\'attribuer le rôle "Défilement"'
                ], 403);
            }

            $user->update(['role_id' => $request->role_id]);
            $user->load(['role', 'etablissement', 'ville']);

            return response()->json([
                'status' => 'success',
                'data' => $user,
                'message' => 'Rôle de l\'utilisateur mis à jour avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la mise à jour du rôle',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les options pour les formulaires (rôles, établissements, villes)
     */
    public function getFormOptions()
    {
        try {
            $rolesQuery = Role::select('id', 'name')->orderBy('name');
            if (!$this->canManageDefilementRole()) {
                $rolesQuery->whereRaw(
                    "LOWER(REPLACE(REPLACE(name, ' ', ''), '-', '')) NOT IN ('défilement', 'defilement')"
                );
            }
            $roles = $rolesQuery->get();
            $etablissements = Etablissement::select('id', 'name')->orderBy('name')->get();
            $villes = Ville::select('id', 'name')->orderBy('name')->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'roles' => $roles,
                    'etablissements' => $etablissements,
                    'villes' => $villes
                ],
                'message' => 'Options récupérées avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des options',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des utilisateurs
     */
    public function getStatistics()
    {
        try {
            $totalUsers = User::count();
            $usersByRole = User::with('role')
                ->selectRaw('role_id, count(*) as count')
                ->groupBy('role_id')
                ->get()
                ->map(function($item) {
                    return [
                        'role_name' => $item->role->name ?? 'Non défini',
                        'count' => $item->count
                    ];
                });

            $recentUsers = User::with(['role', 'etablissement', 'ville'])
                ->orderBy('created_at', 'desc')
                ->limit(5)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => [
                    'total_users' => $totalUsers,
                    'users_by_role' => $usersByRole,
                    'recent_users' => $recentUsers
                ],
                'message' => 'Statistiques récupérées avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rechercher des utilisateurs
     */
    public function search(Request $request)
    {
        try {
            $query = $request->get('q', '');
            
            if (empty($query)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Terme de recherche requis'
                ], 400);
            }

            $users = User::with(['role', 'etablissement', 'ville'])
                ->where(function($q) use ($query) {
                    $q->where('first_name', 'like', "%{$query}%")
                      ->orWhere('last_name', 'like', "%{$query}%")
                      ->orWhere('email', 'like', "%{$query}%");
                })
                ->limit(10)
                ->get();

            return response()->json([
                'status' => 'success',
                'data' => $users,
                'message' => 'Recherche effectuée avec succès'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Erreur lors de la recherche',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifie si l'utilisateur actuel peut gérer/attribuer le rôle Défilement.
     */
    private function canManageDefilementRole(): bool
    {
        $user = auth()->user();
        if (!$user) {
            return false;
        }

        return in_array((int) $user->role_id, [1, 2]);
    }

    /**
     * Vérifie si un identifiant de rôle correspond au rôle Défilement.
     */
    private function isDefilementRoleId(?int $roleId): bool
    {
        if (!$roleId) {
            return false;
        }

        $role = Role::find($roleId);
        return $role ? $this->isDefilementRoleName($role->name) : false;
    }

    /**
     * Vérifie si un nom de rôle correspond au rôle Défilement.
     */
    private function isDefilementRoleName(?string $name): bool
    {
        if (!$name) {
            return false;
        }

        $normalized = Str::of($name)
            ->lower()
            ->replaceMatches('/[\s\-]/', '')
            ->__toString();

        $normalizedAscii = Str::ascii($normalized);

        return in_array($normalized, ['défilement', 'defilement'], true)
            || $normalizedAscii === 'defilement';
    }
}
