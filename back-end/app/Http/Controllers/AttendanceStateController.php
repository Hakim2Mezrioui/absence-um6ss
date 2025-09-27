<?php

namespace App\Http\Controllers;

use App\Services\AttendanceStateService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class AttendanceStateController extends Controller
{
    protected $attendanceStateService;

    public function __construct(AttendanceStateService $attendanceStateService)
    {
        $this->attendanceStateService = $attendanceStateService;
    }

    /**
     * Modifier l'état de présence d'un étudiant pour un cours
     */
    public function updateCoursAttendanceState(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'cours_id' => 'required|integer|exists:cours,id',
            'etudiant_id' => 'required|integer|exists:etudiants,id',
            'status' => 'required|string|in:present,late,absent,left_early',
            'motif' => 'nullable|string|max:500',
            'justificatif' => 'nullable|string|max:255'
        ]);

        $result = $this->attendanceStateService->updateStudentAttendanceState(
            $validatedData['cours_id'],
            $validatedData['etudiant_id'],
            $validatedData['status'],
            $validatedData['motif'] ?? null,
            $validatedData['justificatif'] ?? null
        );

        if ($result['success']) {
            return response()->json($result, 200);
        } else {
            return response()->json($result, 400);
        }
    }

    /**
     * Modifier l'état de présence d'un étudiant pour un examen
     */
    public function updateExamenAttendanceState(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'examen_id' => 'required|integer|exists:examens,id',
            'etudiant_id' => 'required|integer|exists:etudiants,id',
            'status' => 'required|string|in:present,late,absent,left_early',
            'motif' => 'nullable|string|max:500',
            'justificatif' => 'nullable|string|max:255'
        ]);

        $result = $this->attendanceStateService->updateStudentExamAttendanceState(
            $validatedData['examen_id'],
            $validatedData['etudiant_id'],
            $validatedData['status'],
            $validatedData['motif'] ?? null,
            $validatedData['justificatif'] ?? null
        );

        if ($result['success']) {
            return response()->json($result, 200);
        } else {
            return response()->json($result, 400);
        }
    }

    /**
     * Obtenir l'état actuel d'un étudiant pour un cours
     */
    public function getCoursAttendanceState(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'cours_id' => 'required|integer|exists:cours,id',
            'etudiant_id' => 'required|integer|exists:etudiants,id'
        ]);

        $result = $this->attendanceStateService->getStudentAttendanceState(
            $validatedData['cours_id'],
            $validatedData['etudiant_id']
        );

        return response()->json($result, 200);
    }

    /**
     * Obtenir l'état actuel d'un étudiant pour un examen
     */
    public function getExamenAttendanceState(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'examen_id' => 'required|integer|exists:examens,id',
            'etudiant_id' => 'required|integer|exists:etudiants,id'
        ]);

        $result = $this->attendanceStateService->getStudentExamAttendanceState(
            $validatedData['examen_id'],
            $validatedData['etudiant_id']
        );

        return response()->json($result, 200);
    }

    /**
     * Justifier une absence
     */
    public function justifyAbsence(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'absence_id' => 'required|integer|exists:absences,id',
            'motif' => 'required|string|max:500',
            'justificatif' => 'required|string|max:255'
        ]);

        $result = $this->attendanceStateService->justifyAbsence(
            $validatedData['absence_id'],
            $validatedData['motif'],
            $validatedData['justificatif']
        );

        if ($result['success']) {
            return response()->json($result, 200);
        } else {
            return response()->json($result, 400);
        }
    }

    /**
     * Obtenir tous les états possibles
     */
    public function getAvailableStatuses(): JsonResponse
    {
        $statuses = $this->attendanceStateService->getAvailableStatuses();
        
        return response()->json([
            'statuses' => $statuses,
            'status' => 200
        ], 200);
    }

    /**
     * Modifier l'état de présence en masse pour un cours
     */
    public function updateCoursAttendanceStatesBulk(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'cours_id' => 'required|integer|exists:cours,id',
            'attendance_states' => 'required|array',
            'attendance_states.*.etudiant_id' => 'required|integer|exists:etudiants,id',
            'attendance_states.*.status' => 'required|string|in:present,late,absent,left_early',
            'attendance_states.*.motif' => 'nullable|string|max:500',
            'attendance_states.*.justificatif' => 'nullable|string|max:255'
        ]);

        $results = [];
        $errors = [];

        foreach ($validatedData['attendance_states'] as $attendanceState) {
            $result = $this->attendanceStateService->updateStudentAttendanceState(
                $validatedData['cours_id'],
                $attendanceState['etudiant_id'],
                $attendanceState['status'],
                $attendanceState['motif'] ?? null,
                $attendanceState['justificatif'] ?? null
            );

            if ($result['success']) {
                $results[] = $result;
            } else {
                $errors[] = [
                    'etudiant_id' => $attendanceState['etudiant_id'],
                    'error' => $result['message']
                ];
            }
        }

        return response()->json([
            'success' => empty($errors),
            'message' => empty($errors) ? 'Tous les états ont été mis à jour avec succès' : 'Certains états n\'ont pas pu être mis à jour',
            'results' => $results,
            'errors' => $errors,
            'total_processed' => count($validatedData['attendance_states']),
            'successful' => count($results),
            'failed' => count($errors)
        ], empty($errors) ? 200 : 207);
    }

    /**
     * Modifier l'état de présence en masse pour un examen
     */
    public function updateExamenAttendanceStatesBulk(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'examen_id' => 'required|integer|exists:examens,id',
            'attendance_states' => 'required|array',
            'attendance_states.*.etudiant_id' => 'required|integer|exists:etudiants,id',
            'attendance_states.*.status' => 'required|string|in:present,late,absent,left_early',
            'attendance_states.*.motif' => 'nullable|string|max:500',
            'attendance_states.*.justificatif' => 'nullable|string|max:255'
        ]);

        $results = [];
        $errors = [];

        foreach ($validatedData['attendance_states'] as $attendanceState) {
            $result = $this->attendanceStateService->updateStudentExamAttendanceState(
                $validatedData['examen_id'],
                $attendanceState['etudiant_id'],
                $attendanceState['status'],
                $attendanceState['motif'] ?? null,
                $attendanceState['justificatif'] ?? null
            );

            if ($result['success']) {
                $results[] = $result;
            } else {
                $errors[] = [
                    'etudiant_id' => $attendanceState['etudiant_id'],
                    'error' => $result['message']
                ];
            }
        }

        return response()->json([
            'success' => empty($errors),
            'message' => empty($errors) ? 'Tous les états ont été mis à jour avec succès' : 'Certains états n\'ont pas pu être mis à jour',
            'results' => $results,
            'errors' => $errors,
            'total_processed' => count($validatedData['attendance_states']),
            'successful' => count($results),
            'failed' => count($errors)
        ], empty($errors) ? 200 : 207);
    }
}
