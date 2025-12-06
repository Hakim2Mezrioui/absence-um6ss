<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Laravel\Sanctum\PersonalAccessToken;
use App\Models\Etudiant;

class AuthenticateEtudiant
{
    /**
     * Handle an incoming request.
     * Ce middleware gère l'authentification pour les étudiants en résolvant manuellement le token
     * car Sanctum ne peut pas résoudre automatiquement les tokens pour le modèle Etudiant.
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Log IMMÉDIATEMENT pour confirmer que le middleware est appelé
        \Log::info('🔍🔍🔍 AuthenticateEtudiant - MIDDLEWARE APPELÉ', [
            'url' => $request->url(),
            'method' => $request->method(),
            'full_url' => $request->fullUrl(),
            'path' => $request->path(),
        ]);
        
        $token = $request->bearerToken();
        
        \Log::info('🔍 AuthenticateEtudiant - Début', [
            'url' => $request->url(),
            'method' => $request->method(),
            'token_present' => $token ? 'OUI' : 'NON',
            'token_start' => $token ? substr($token, 0, 20) . '...' : null,
        ]);
        
        if (!$token) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }
        
        // Utiliser la méthode findToken de Sanctum pour résoudre le token
        $accessToken = PersonalAccessToken::findToken($token);
        
        if (!$accessToken) {
            \Log::info('🔍 AuthenticateEtudiant - Token non trouvé dans la base', [
                'token_start' => substr($token, 0, 20) . '...',
            ]);
            return response()->json(['message' => 'Token not found.'], 401);
        }
        
        \Log::info('🔍 AuthenticateEtudiant - Token trouvé', [
            'tokenable_type' => $accessToken->tokenable_type,
            'tokenable_id' => $accessToken->tokenable_id,
        ]);
        
        // Vérifier si c'est un token d'étudiant
        if ($accessToken->tokenable_type === 'App\\Models\\Etudiant') {
            // Utiliser withoutGlobalScope pour éviter le filtrage par UserContextScope
            // car nous sommes en train d'authentifier l'étudiant et Auth::check() retourne false
            $etudiant = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)
                ->find($accessToken->tokenable_id);
            
            if ($etudiant) {
                // Définir l'utilisateur dans la requête pour que $request->user() fonctionne
                $request->setUserResolver(function () use ($etudiant) {
                    return $etudiant;
                });
                \Log::info('🔍 AuthenticateEtudiant - Étudiant authentifié avec succès', [
                    'etudiant_id' => $etudiant->id,
                    'etudiant_email' => $etudiant->email,
                ]);
                return $next($request);
            } else {
                \Log::warning('🔍 AuthenticateEtudiant - Étudiant non trouvé', [
                    'tokenable_id' => $accessToken->tokenable_id,
                ]);
                return response()->json(['message' => 'Student not found.'], 401);
            }
        }
        
        // Si c'est un token User, laisser Sanctum gérer normalement
        if ($accessToken->tokenable_type === 'App\\Models\\User') {
            \Log::info('🔍 AuthenticateEtudiant - Token User détecté, laisser Sanctum gérer');
            // Laisser Sanctum gérer normalement en passant au middleware suivant
            return $next($request);
        }
        
        \Log::warning('🔍 AuthenticateEtudiant - Type de token non reconnu', [
            'tokenable_type' => $accessToken->tokenable_type,
        ]);
        return response()->json(['message' => 'Unauthenticated.'], 401);
    }
}

