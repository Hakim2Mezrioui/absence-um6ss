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
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            "role" => ["required", "string", "in:admin,user,super-admin"],
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            "role" => $request->role,
        ]);

        // $token = Auth::login($user);
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
        return response()->json(["message"=> "The use is logouted "], 200);
    }

    public function create(Request $request) {
        // Validation avec des règles plus sécurisées
        $request->validate([
            "name" => ["required", "string", "max:255"],
            "email" => ["required", "string", "email", "max:255", "unique:users,email"],
            "password" => ["required", "string", "min:8"],
            "role" => ["required", "string", "in:admin,user,super-admin"], // Limité aux rôles valides
        ]);
    
        try {
            // Création de l'utilisateur avec un mot de passe haché
            $user = User::create([
                "name" => $request->name,
                "email" => $request->email,
                "password" => Hash::make($request->password), // Hachage du mot de passe
                "role" => $request->role,
                "faculte" => $request->faculte,
            ]);
    
            return response()->json(["message" => "Utilisateur créé avec succès"], 201);
        } catch (\Exception $e) {
            return response()->json(["message" => "Erreur lors de la création de l'utilisateur", "error" => $e->getMessage()], 500);
        }
    }

    public function delete(Request $request) {
    
    }

    public function users() {
        try {
            $users = User::all();
            return response()->json([
                "users"=> $users,
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
        return Auth::user();
    }
}
