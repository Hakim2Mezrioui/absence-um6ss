<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function login(Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Information incorrect.'],
            ]);
        }

        $token = $user->createToken($request->email)->plainTextToken;

        $cookie = cookie('jwt', $token, 1);

        return response()->json(
            [
                'status' => 'success',
                'user' => $user,
                'authorisation' => [
                    'token' => $token,
                    'type' => 'bearer',
                ]
            ]
        )->withCookie($cookie);
    }

    public function register(Request $request)
    {
        $request->validate([
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role_id' => 'required|integer|exists:roles,id',
            'post_id' => 'required|integer|exists:posts,id',
            'etablissement_id' => 'nullable|integer|exists:etablissements,id',
            'ville_id' => 'nullable|integer|exists:villes,id',
        ]);

        if (!$this->canAssignDefilementRole((int) $request->role_id, $request->user())) {
            return response()->json([
                'status' => 'error',
                'message' => 'Création non autorisée pour le rôle "Défilement"'
            ], 403);
        }

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'post_id' => $request->post_id,
            'etablissement_id' => $request->etablissement_id,
            'ville_id' => $request->ville_id,
        ]);

        $token = $user->createToken('token')->plainTextToken;
        $cookie = cookie('jwt', $token, 5);

        return response()->json([
            'status' => 'success',
            'message' => 'User created successfully',
            'user' => $user,
            'authorisation' => [
                'token' => $token,
                'type' => 'bearer',
            ]
        ])->withCookie($cookie);
    }

    public function logout(Request $request) {
        $user = $request->user();
        
        if (!$user) {
            return response()->json(["message" => "User not authenticated"], 401);
        }
        
        $user->tokens()->delete();
        return response()->json(["message" => "The user is logged out"], 200);
    }

    public function create(Request $request) {
        // Validation avec des règles correspondant au schéma de la table
        $request->validate([
            "first_name" => ["required", "string", "max:255"],
            "last_name" => ["required", "string", "max:255"],
            "email" => ["required", "string", "email", "max:255", "unique:users,email"],
            "password" => ["required", "string", "min:6"],
            "role_id" => ["required", "integer", "exists:roles,id"],
            "post_id" => ["required", "integer", "exists:posts,id"],
            "etablissement_id" => ["nullable", "integer", "exists:etablissements,id"],
            "ville_id" => ["nullable", "integer", "exists:villes,id"],
        ]);

        if (!$this->canAssignDefilementRole((int) $request->role_id, $request->user())) {
            return response()->json([
                "message" => "Création non autorisée pour le rôle \"Défilement\""
            ], 403);
        }

        try {
            // Création de l'utilisateur avec les bons champs
            $user = User::create([
                "first_name" => $request->first_name,
                "last_name" => $request->last_name,
                "email" => $request->email,
                "password" => Hash::make($request->password),
                "role_id" => $request->role_id,
                "post_id" => $request->post_id,
                "etablissement_id" => $request->etablissement_id,
                "ville_id" => $request->ville_id,
            ]);

            return response()->json([
                "message" => "Utilisateur créé avec succès",
                "user" => $user
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la création de l'utilisateur", 
                "error" => $e->getMessage()
            ], 500);
        }
    }

    // Supprimer cette fonction vide
    // public function delete(Request $request) {
    // }

    public function users() {
        try {
            $users = User::with(['role', 'post', 'etablissement', 'ville'])->get(); // Ajouter les relations
            return response()->json([
                "users" => $users,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération des utilisateurs",
                "error" => $e->getMessage(),
            ], 500);
        }
    }

    public function user(Request $request)
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(["message" => "User not authenticated"], 401);
        }
        return response()->json(["user" => $user]);
    }

    public function show($id) {
        try {
            $user = User::with(['role', 'post', 'etablissement', 'ville'])->findOrFail($id);
            return response()->json([
                "status" => "success",
                "user" => $user
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                "status" => "error",
                "message" => "Utilisateur non trouvé",
                "error" => $e->getMessage()
            ], 404);
        }
    }

    public function profile(Request $request) {
        // Avec Sanctum, l'utilisateur est automatiquement disponible via $request->user()
        $user = $request->user();
        
        // Debug: Log des informations
        \Log::info('Profile request debug', [
            'user_from_request' => $user,
            'user_id' => $user ? $user->id : null,
            'user_email' => $user ? $user->email : null,
            'token_abilities' => $user ? $user->currentAccessToken()?->abilities : null,
            'headers' => $request->headers->all(),
            'cookies' => $request->cookies->all()
        ]);
        
        if (!$user) {
            return response()->json([
                "status" => "error",
                "message" => "Utilisateur non authentifié",
                "user" => null,
                "debug" => [
                    "has_token" => $request->bearerToken() ? true : false,
                    "cookies_count" => count($request->cookies->all()),
                    "auth_header" => $request->header('Authorization')
                ]
            ], 401);
        }
        
        // Charger les relations nécessaires
        $user->load(['role', 'post', 'etablissement', 'ville']);
        
        return response()->json([
            "status" => "success",
            "user" => $user,
            "debug" => [
                "user_id" => $user->id,
                "has_token" => $request->bearerToken() ? true : false,
                "cookies_count" => count($request->cookies->all())
            ]
        ], 200);
    }

    public function changePassword(Request $request) {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                "status" => "error",
                "message" => "Utilisateur non authentifié",
                "user" => null
            ], 401);
        }
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json([
                "status" => "error",
                "message" => "Mot de passe actuel incorrect",
                "user" => null
            ], 401);
        }
        $user->password = Hash::make($request->new_password);
        $user->save();
        return response()->json(["message" => "Mot de passe modifié avec succès"], 200);
    }

    public function uploadAvatar(Request $request) {
        $user = $request->user();
        if (!$user) {
            return response()->json([
                "status" => "error",
                "message" => "Utilisateur non authentifié",
                "user" => null
            ], 401);
        }

        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,gif|max:2048'
        ]);

        if ($request->hasFile('avatar')) {
            $file = $request->file('avatar');
            $filename = time() . '_' . $user->id . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('avatars', $filename, 'public');
            
            $user->avatar = '/storage/' . $path;
            $user->save();

            return response()->json([
                "status" => "success",
                "message" => "Avatar uploadé avec succès",
                "avatar_url" => $user->avatar
            ], 200);
        }

        return response()->json([
            "status" => "error",
            "message" => "Aucun fichier uploadé"
        ], 400);
    }

    public function destroy(Request $request, $id) {
        try {
            $user = User::findOrFail($id);
            $user->delete();
            return response()->json([
                "message" => "User deleted successfully",
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "User not found or error occurred",
                "error" => $e->getMessage()
            ], 404);
        }
    }

    public function update(Request $request, $id) {
        try {
            $user = User::findOrFail($id);
            
            // Validation des données de mise à jour
            $request->validate([
                "first_name" => ["sometimes", "string", "max:255"],
                "last_name" => ["sometimes", "string", "max:255"],
                "email" => ["sometimes", "string", "email", "max:255", "unique:users,email," . $id],
                "password" => ["sometimes", "string", "min:6"],
                "role_id" => ["sometimes", "integer", "exists:roles,id"],
                "post_id" => ["sometimes", "integer", "exists:posts,id"],
                "etablissement_id" => ["sometimes", "nullable", "integer", "exists:etablissements,id"],
                "ville_id" => ["sometimes", "nullable", "integer", "exists:villes,id"],
            ]);

            if ($request->filled('role_id') && !$this->canAssignDefilementRole((int) $request->role_id, $request->user())) {
                return response()->json([
                    "status" => "error",
                    "message" => "Attribution non autorisée pour le rôle \"Défilement\""
                ], 403);
            }

            // Mise à jour des champs fournis
            $updateData = $request->only([
                'first_name', 'last_name', 'email', 'role_id', 'post_id', 'etablissement_id', 'ville_id'
            ]);

            // Hacher le mot de passe si fourni
            if ($request->has('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Recharger l'utilisateur avec les relations
            $user->load(['role', 'post', 'etablissement', 'ville']);

            return response()->json([
                "status" => "success",
                "message" => "Utilisateur mis à jour avec succès",
                "user" => $user
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                "status" => "error",
                "message" => "Erreur lors de la mise à jour de l'utilisateur",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Vérifie si l'utilisateur courant est autorisé à attribuer le rôle Défilement.
     */
    private function canAssignDefilementRole(?int $roleId, ?User $actor): bool
    {
        if (!$roleId || !$this->isDefilementRoleId($roleId)) {
            return true;
        }

        if (!$actor) {
            return false;
        }

        return in_array((int) $actor->role_id, [1, 2]);
    }

    /**
     * Vérifie si l'identifiant correspond au rôle Défilement.
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
     * Vérifie si un nom correspond au rôle Défilement (avec ou sans accent).
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
