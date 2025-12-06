<?php

namespace App\Http\Controllers;

use App\Services\QrCodeAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class QrCodeAttendanceController extends Controller
{
    protected QrCodeAttendanceService $service;

    public function __construct(QrCodeAttendanceService $service)
    {
        $this->service = $service;
    }

    /**
     * Générer un token de QR code pour un cours (enseignant / admin / super-admin).
     */
    public function generateForCours(int $coursId): JsonResponse
    {
        $session = $this->service->generateForCours($coursId);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $session->token,
                'expires_at' => $session->expires_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Générer un token de QR code pour un examen.
     */
    public function generateForExamen(int $examenId): JsonResponse
    {
        $session = $this->service->generateForExamen($examenId);

        return response()->json([
            'success' => true,
            'data' => [
                'token' => $session->token,
                'expires_at' => $session->expires_at->toIso8601String(),
            ],
        ]);
    }

    /**
     * Endpoint pour qu'un étudiant scanne un QR code.
     */
    public function scan(Request $request): JsonResponse
    {
        \Log::info('🔍 QrCodeAttendanceController::scan - MÉTHODE APPELÉE', [
            'url' => $request->url(),
            'method' => $request->method(),
            'has_user' => $request->user() ? 'OUI' : 'NON',
            'user_type' => $request->user() ? get_class($request->user()) : null,
            'bearer_token' => $request->bearerToken() ? 'OUI' : 'NON',
        ]);

        $validated = $request->validate([
            'token' => 'required|string',
        ]);

        // Utiliser $request->user() car AuthenticateEtudiant middleware définit l'étudiant via setUserResolver
        $user = $request->user();
        
        if (!$user || !($user instanceof \App\Models\Etudiant)) {
            \Log::warning('🔍 QrCodeAttendanceController::scan - Étudiant non trouvé', [
                'user' => $user ? get_class($user) : 'null',
            ]);
            return response()->json([
                'success' => false,
                'status' => 'invalid',
                'message' => "Aucun étudiant trouvé pour l'utilisateur connecté.",
            ], 400);
        }

        $etudiantId = $user->id;

        \Log::info('🔍 QrCodeAttendanceController::scan - Étudiant trouvé', [
            'etudiant_id' => $etudiantId,
            'qr_token_start' => substr($validated['token'], 0, 20) . '...',
        ]);

        $meta = [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];

        try {
            $result = $this->service->scanToken($validated['token'], $etudiantId, $meta);

            \Log::info('🔍 QrCodeAttendanceController::scan - Résultat', [
                'success' => $result['success'] ?? false,
                'status' => $result['status'] ?? null,
            ]);

            $statusCode = $result['success'] ? 200 : 400;

            return response()->json($result, $statusCode);
        } catch (\Exception $e) {
            \Log::error('🔍 QrCodeAttendanceController::scan - EXCEPTION', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json([
                'success' => false,
                'status' => 'error',
                'message' => 'Erreur lors du traitement du scan: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Récupérer la liste des présences par QR pour un cours.
     */
    public function getAttendanceForCours(int $coursId): JsonResponse
    {
        $data = $this->service->getAttendanceForCours($coursId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Récupérer la liste des présences par QR pour un examen.
     */
    public function getAttendanceForExamen(int $examenId): JsonResponse
    {
        $data = $this->service->getAttendanceForExamen($examenId);

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }
}


