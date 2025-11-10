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
                \Log::error('BiostarAttendanceController: Configuration non trouvée', [
                    'cours_id' => $coursId,
                    'error' => $configResult['error'] ?? 'Unknown error',
                    'cours_ville_id' => $cours->ville_id ?? null
                ]);
                return response()->json([
                    'success' => false,
                    'message' => 'Configuration not found for cours ville'
                ], 404);
            }
            
            \Log::info('BiostarAttendanceController: Configuration récupérée', [
                'cours_id' => $coursId,
                'ville_id' => $configResult['ville_id'] ?? null,
                'dsn' => $configResult['dsn'] ?? 'N/A',
                'has_username' => !empty($configResult['username']),
                'has_password' => !empty($configResult['password'])
            ]);

            // Récupérer les devices des salles du cours (salles multiples ou salle unique)
            $allowedDeviceIds = [];
            $allowedDeviceNames = [];
            
            // Charger les relations nécessaires
            $cours->load(['salles', 'salle']);
            
            if (method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty()) {
                // Multi-salles: collecter les devices de toutes les salles
                foreach ($cours->salles as $salle) {
                    if (is_array($salle->devices)) {
                        foreach ($salle->devices as $d) {
                            if (is_array($d)) {
                                // Extraire devid et devnm
                                if (isset($d['devid'])) {
                                    $allowedDeviceIds[] = (string)$d['devid'];
                                }
                                if (isset($d['devnm'])) {
                                    $allowedDeviceNames[] = (string)$d['devnm'];
                                }
                            }
                        }
                    }
                }
            } elseif ($cours->salle && is_array($cours->salle->devices) && count($cours->salle->devices) > 0) {
                // Fallback sur salle unique
                foreach ($cours->salle->devices as $d) {
                    if (is_array($d)) {
                        // Extraire devid et devnm
                        if (isset($d['devid'])) {
                            $allowedDeviceIds[] = (string)$d['devid'];
                        }
                        if (isset($d['devnm'])) {
                            $allowedDeviceNames[] = (string)$d['devnm'];
                        }
                    }
                }
            }
            
            // Normaliser et dédupliquer
            $allowedDeviceIds = !empty($allowedDeviceIds) ? array_values(array_unique(array_filter($allowedDeviceIds))) : null;
            $allowedDeviceNames = !empty($allowedDeviceNames) ? array_values(array_unique(array_filter($allowedDeviceNames))) : null;
            
            // Vérifier si le cours a des salles mais pas de devices assignés
            $hasSalles = (method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty()) 
                        || ($cours->salle_id && $cours->salle);
            
            // Si le cours a des salles mais aucun device assigné, on ne filtre pas par devices
            // On passe null pour accepter tous les pointages (pas de filtrage)
            if ($hasSalles && empty($allowedDeviceIds) && empty($allowedDeviceNames)) {
                // Le cours a des salles mais aucun device assigné
                // On ne filtre pas par devices (passer null pour accepter tous les pointages)
                $allowedDeviceIds = null;
                $allowedDeviceNames = null;
                \Log::warning('BiostarAttendanceController: Cours a des salles mais aucun device assigné - pas de filtrage par devices', [
                    'cours_id' => $cours->id,
                    'salles_count' => method_exists($cours, 'salles') && $cours->relationLoaded('salles') ? $cours->salles->count() : 0,
                    'salle_id' => $cours->salle_id,
                    'action' => 'Pas de filtrage par devices - tous les pointages seront acceptés'
                ]);
            }
            
            // Log pour déboguer
            \Log::info('BiostarAttendanceController: Paramètres reçus pour getCoursAttendance', [
                'cours_id' => $coursId,
                'date' => $date,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'start_time_fallback' => $cours->pointage_start_hour,
                'end_time_fallback' => $cours->heure_fin,
                'student_ids' => $studentIds,
                'cours_date' => $cours->date,
                'cours_pointage_start_hour' => $cours->pointage_start_hour,
                'cours_heure_debut' => $cours->heure_debut,
                'cours_heure_fin' => $cours->heure_fin
            ]);
            
            \Log::info('BiostarAttendanceController: Devices autorisés pour le cours', [
                'cours_id' => $cours->id,
                'allowed_device_ids' => $allowedDeviceIds,
                'allowed_device_names' => $allowedDeviceNames,
                'salles_count' => method_exists($cours, 'salles') && $cours->relationLoaded('salles') ? $cours->salles->count() : 0,
                'salle_id' => $cours->salle_id,
                'has_salles' => method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty(),
                'has_salle' => $cours->salle && is_array($cours->salle->devices) && count($cours->salle->devices) > 0,
                'will_filter' => !empty($allowedDeviceIds) || !empty($allowedDeviceNames),
                'config_ville_id' => $configResult['ville_id'] ?? null
            ]);

            // Get attendance data from Biostar
            $finalStartTime = $startTime ?: $cours->pointage_start_hour;
            $finalEndTime = $endTime ?: $cours->heure_fin;
            
            \Log::info('BiostarAttendanceController: Appel à getAttendanceData', [
                'date' => $date,
                'start_time' => $finalStartTime,
                'end_time' => $finalEndTime,
                'has_allowed_devices' => !empty($allowedDeviceIds) || !empty($allowedDeviceNames)
            ]);
            
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $configResult,
                $date,
                $finalStartTime,
                $finalEndTime,
                $studentIds,
                $allowedDeviceIds,
                $allowedDeviceNames
            );
            
            \Log::info('BiostarAttendanceController: Résultats de getAttendanceData', [
                'total_punches' => $attendanceData['total_punches'] ?? 0,
                'students_with_punches' => $attendanceData['students_with_punches'] ?? 0,
                'punches_count' => count($attendanceData['punches'] ?? [])
            ]);

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
            $groupIds = $request->get('device_group_ids'); // optional array
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

            // Normalize group ids to array of ints if provided
            $groupIds = is_array($groupIds) ? array_values(array_filter(array_map('intval', $groupIds))) : null;

            $devices = $this->biostarAttendanceService->getDevices($configResult, $groupIds);

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

    /**
     * Get Biostar device groups (requires ville_id to resolve connection)
     */
    public function getDeviceGroups(Request $request): JsonResponse
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

            $groups = $this->biostarAttendanceService->getDeviceGroups($configResult);

            return response()->json([
                'success' => true,
                'groups' => $groups,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error retrieving device groups: ' . $e->getMessage()
            ], 500);
        }
    }
}
