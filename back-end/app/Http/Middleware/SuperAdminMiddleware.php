<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\UserContextService;

class SuperAdminMiddleware
{
    protected $userContextService;

    public function __construct(UserContextService $userContextService)
    {
        $this->userContextService = $userContextService;
    }

    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Vérifier si l'utilisateur est authentifié
        if (!$request->user()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Non authentifié'
            ], 401);
        }

        // Vérifier si l'utilisateur est un super admin
        if (!$this->userContextService->isSuperAdmin()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Accès refusé. Seuls les super administrateurs peuvent accéder à cette ressource.'
            ], 403);
        }

        return $next($request);
    }
}
