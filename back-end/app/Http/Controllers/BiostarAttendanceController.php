<?php

namespace App\Http\Controllers;

use App\Services\ConfigurationService;
use App\Services\BiostarAttendanceService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

class BiostarAttendanceController extends Controller
{
    protected $configurationService;
    protected $biostarAttendanceService;

    public function __construct(
        ConfigurationService $configurationService,
        BiostarAttendanceService $biostarAttendanceService
    ) {
        $this->configurationService = $configurationService;
        $this->biostarAttendanceService = $biostarAttendanceService;
    }

    /**
     * Get attendance data from Biostar for a cours
     */
    public function getCoursAttendance(Request $request): JsonResponse
    {
        try {
            $coursId = $request->get('cours_id');
            $date = $request->get('date');
            $startTime = $request->get('start_time');
            $endTime = $request->get('end_time');
            $studentIds = $request->get('student_ids');

            if (!$coursId || !$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cours ID and date are required'
                ], 400);
            }

            // Get cours information
            $cours = \App\Models\Cours::find($coursId);
            if (!$cours) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cours not found'
                ], 404);
            }

            // Get configuration for cours ville
            $configResult = $this->configurationService->getConnectionConfigForCours($coursId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for cours ville'
                ], 404);
            }

            // Get attendance data from Biostar
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $configResult,
                $date,
                $startTime ?: $cours->pointage_start_hour,
                $endTime ?: $cours->heure_fin,
                $studentIds
            );

            return response()->json([
                'success' => true,
                'data' => $attendanceData,
                'message' => 'Attendance data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving attendance data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance data from Biostar for an examen
     */
    public function getExamenAttendance(Request $request): JsonResponse
    {
        try {
            $examenId = $request->get('examen_id');
            $date = $request->get('date');
            $startTime = $request->get('start_time');
            $endTime = $request->get('end_time');
            $studentIds = $request->get('student_ids');

            if (!$examenId || !$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examen ID and date are required'
                ], 400);
            }

            // Get examen information
            $examen = \App\Models\Examen::find($examenId);
            if (!$examen) {
                return response()->json([
                    'success' => false,
                    'message' => 'Examen not found'
                ], 404);
            }

            // Get configuration for examen ville
            $configResult = $this->configurationService->getConnectionConfigForExamen($examenId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for examen ville'
                ], 404);
            }

            // Get attendance data from Biostar
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $configResult,
                $date,
                $startTime ?: $examen->heure_debut_poigntage,
                $endTime ?: $examen->heure_fin,
                $studentIds
            );

            return response()->json([
                'success' => true,
                'data' => $attendanceData,
                'message' => 'Attendance data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving attendance data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get attendance data from Biostar for a specific ville
     */
    public function getAttendanceByVille(Request $request): JsonResponse
    {
        try {
            $villeId = $request->get('ville_id');
            $date = $request->get('date');
            $startTime = $request->get('start_time');
            $endTime = $request->get('end_time');
            $studentIds = $request->get('student_ids');

            if (!$villeId || !$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ville ID and date are required'
                ], 400);
            }

            // Get configuration for ville
            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for ville'
                ], 404);
            }

            // Get attendance data from Biostar
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $configResult,
                $date,
                $startTime,
                $endTime,
                $studentIds
            );

            return response()->json([
                'success' => true,
                'data' => $attendanceData,
                'message' => 'Attendance data retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving attendance data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test Biostar connection
     */
    public function testConnection(Request $request): JsonResponse
    {
        try {
            $villeId = $request->get('ville_id');
            
            if (!$villeId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ville ID is required'
                ], 400);
            }

            // Get configuration for ville
            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for ville'
                ], 404);
            }

            // Test connection
            $testResult = $this->biostarAttendanceService->testConnection($configResult);

            return response()->json([
                'success' => $testResult['success'],
                'message' => $testResult['message'],
                'data' => $testResult['data'] ?? null
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error testing connection: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Biostar statistics
     */
    public function getStatistics(Request $request): JsonResponse
    {
        try {
            $villeId = $request->get('ville_id');
            $date = $request->get('date');

            if (!$villeId || !$date) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ville ID and date are required'
                ], 400);
            }

            // Get configuration for ville
            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for ville'
                ], 404);
            }

            // Get statistics
            $statistics = $this->biostarAttendanceService->getStatistics($configResult, $date);

            return response()->json([
                'success' => true,
                'data' => $statistics,
                'message' => 'Statistics retrieved successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving statistics: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get Biostar devices (requires ville_id to resolve connection)
     */
    public function getDevices(Request $request): JsonResponse
    {
        try {
            $villeId = $request->get('ville_id');
            if (!$villeId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Ville ID is required'
                ], 400);
            }

            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            if (isset($configResult['error'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for ville'
                ], 404);
            }

            $devices = $this->biostarAttendanceService->getDevices($configResult);

            return response()->json([
                'success' => true,
                'devices' => $devices,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving devices: ' . $e->getMessage()
            ], 500);
        }
    }
}
