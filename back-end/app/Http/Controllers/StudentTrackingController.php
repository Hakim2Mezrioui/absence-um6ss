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

