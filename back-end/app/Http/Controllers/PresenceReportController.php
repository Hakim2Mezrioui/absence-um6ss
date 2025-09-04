<?php

namespace App\Http\Controllers;

use App\Services\PresenceReportService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PresenceReportController extends Controller
{
    protected $presenceReportService;

    public function __construct(PresenceReportService $presenceReportService)
    {
        $this->presenceReportService = $presenceReportService;
    }

    /**
     * Generate presence report for an etablissement
     */
    public function generateEtablissementReport(Request $request, int $etablissementId): JsonResponse
    {
        $date = $request->input('date');
        
        $report = $this->presenceReportService->generateEtablissementReport($etablissementId, $date);
        
        return response()->json([
            'etablissement_id' => $etablissementId,
            'date' => $date ?? now()->format('Y-m-d'),
            'report' => $report
        ]);
    }

    /**
     * Generate presence report for a specific group
     */
    public function generateGroupReport(Request $request, int $groupId): JsonResponse
    {
        $date = $request->input('date');
        
        $report = $this->presenceReportService->generateGroupReport($groupId, $date);
        
        return response()->json([
            'group_id' => $groupId,
            'date' => $date ?? now()->format('Y-m-d'),
            'report' => $report
        ]);
    }

    /**
     * Get groups with low presence rate
     */
    public function getGroupsWithLowPresence(Request $request, int $etablissementId): JsonResponse
    {
        $threshold = $request->input('threshold', 70.0);
        
        $groups = $this->presenceReportService->getGroupsWithLowPresence($etablissementId, $threshold);
        
        return response()->json([
            'etablissement_id' => $etablissementId,
            'threshold' => $threshold,
            'groups' => $groups
        ]);
    }

    /**
     * Get frequently absent students in a group
     */
    public function getFrequentlyAbsentStudents(Request $request, int $groupId): JsonResponse
    {
        $days = $request->input('days', 7);
        
        $students = $this->presenceReportService->getFrequentlyAbsentStudents($groupId, $days);
        
        return response()->json([
            'group_id' => $groupId,
            'days' => $days,
            'students' => $students
        ]);
    }
} 