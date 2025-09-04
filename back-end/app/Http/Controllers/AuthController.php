<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

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
        ]);

        $user = User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role_id' => $request->role_id,
            'post_id' => $request->post_id,
            'etablissement_id' => $request->etablissement_id,
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
        $request->user()->tokens()->delete();
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
        ]);

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
            $users = User::with(['role', 'post', 'etablissement'])->get(); // Ajouter les relations
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
            $user = User::with(['role', 'post', 'etablissement'])->findOrFail($id);
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
            ]);

            // Mise à jour des champs fournis
            $updateData = $request->only([
                'first_name', 'last_name', 'email', 'role_id', 'post_id', 'etablissement_id'
            ]);

            // Hacher le mot de passe si fourni
            if ($request->has('password')) {
                $updateData['password'] = Hash::make($request->password);
            }

            $user->update($updateData);

            // Recharger l'utilisateur avec les relations
            $user->load(['role', 'post', 'etablissement']);

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
}
