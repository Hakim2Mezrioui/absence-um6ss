<?php

namespace App\Http\Controllers;

use App\Models\Etudiant;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class EtudiantAuthController extends Controller
{
    /**
     * Connexion d'un étudiant
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $etudiant = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)
            ->where('email', $request->email)
            ->first();

        if (!$etudiant || !Hash::check($request->password, $etudiant->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email ou mot de passe incorrect.'],
            ]);
        }

        $token = $etudiant->createToken('etudiant-token')->plainTextToken;

        return response()->json([
            'status' => 'success',
            'etudiant' => $etudiant->load(['promotion', 'etablissement', 'ville', 'group', 'option']),
            'authorisation' => [
                'token' => $token,
                'type' => 'bearer',
            ]
        ]);
    }

    /**
     * Déconnexion d'un étudiant
     */
    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user || !($user instanceof Etudiant)) {
            return response()->json(["message" => "Étudiant non authentifié"], 401);
        }
        
        $user->tokens()->delete();
        return response()->json(["message" => "L'étudiant est déconnecté"], 200);
    }

    /**
     * Récupérer les informations de l'étudiant connecté
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user();
        
        if (!$user || !($user instanceof Etudiant)) {
            return response()->json(["message" => "Étudiant non authentifié"], 401);
        }
        
        return response()->json([
            'status' => 'success',
            'etudiant' => $user->load(['promotion', 'etablissement', 'ville', 'group', 'option'])
        ]);
    }
}

