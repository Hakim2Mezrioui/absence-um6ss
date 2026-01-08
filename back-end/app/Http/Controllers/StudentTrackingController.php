<?php

namespace App\Http\Controllers;

use App\Services\StudentTrackingService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class StudentTrackingController extends Controller
{
    protected $trackingService;

    public function __construct(StudentTrackingService $trackingService)
    {
        $this->trackingService = $trackingService;
    }

    /**
     * Track student attendance
     */
    public function track(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'student_id' => 'required|integer|exists:etudiants,id',
            'from' => 'required|date',
            'to' => 'required|date|after_or_equal:from',
            'status_filter' => 'nullable|string|in:all,present,absent'
        ]);

        // Vérifier que l'étudiant appartient à l'établissement de l'utilisateur
        // SAUF super-admin (role_id = 1) et ceux sans établissement
        $user = \Illuminate\Support\Facades\Auth::user();
        $isEtablissementLocked = $user && $user->role_id != 1 && !is_null($user->etablissement_id);
        
        if ($isEtablissementLocked) {
            $student = \App\Models\Etudiant::find($validatedData['student_id']);
            if (!$student || $student->etablissement_id != $user->etablissement_id) {
                return response()->json([
                    'success' => false,
                    'message' => 'Vous ne pouvez tracker que les étudiants de votre établissement'
                ], 403);
            }
        }

        $result = $this->trackingService->trackStudent(
            $validatedData['student_id'],
            $validatedData['from'],
            $validatedData['to'],
            $validatedData['status_filter'] ?? 'all'
        );

        if ($result['success']) {
            return response()->json($result, 200);
        } else {
            return response()->json($result, 400);
        }
    }
}

