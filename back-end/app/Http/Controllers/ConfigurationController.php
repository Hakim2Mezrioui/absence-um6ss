<?php

namespace App\Http\Controllers;

use App\Services\ConfigurationService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ConfigurationController extends Controller
{
    protected $configurationService;

    public function __construct(ConfigurationService $configurationService)
    {
        $this->configurationService = $configurationService;
    }

    /**
     * Get all configurations
     */
    public function index(): JsonResponse
    {
        return $this->configurationService->getAllConfigurations();
    }

    /**
     * Get configuration for authenticated user's ville
     */
    public function getForUserVille(): JsonResponse
    {
        return $this->configurationService->getConfigurationForUserVille();
    }

    /**
     * Create or update configuration for a ville
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'sqlsrv' => 'required|string|max:255',
            'database' => 'required|string|max:255',
            'trustServerCertificate' => 'required|string|in:true,false',
            'biostar_username' => 'required|string|max:255',
            'biostar_password' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id'
        ]);

        return $this->configurationService->createOrUpdateConfiguration($request->all());
    }

    /**
     * Update configuration
     */
    public function update(Request $request, $id): JsonResponse
    {
        $request->validate([
            'sqlsrv' => 'required|string|max:255',
            'database' => 'required|string|max:255',
            'trustServerCertificate' => 'required|string|in:true,false',
            'biostar_username' => 'required|string|max:255',
            'biostar_password' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id'
        ]);

        return $this->configurationService->updateConfiguration($id, $request->all());
    }

    /**
     * Delete configuration
     */
    public function destroy($id): JsonResponse
    {
        return $this->configurationService->deleteConfiguration($id);
    }

    /**
     * Test database connection
     */
    public function testConnection(Request $request): JsonResponse
    {
        $request->validate([
            'sqlsrv' => 'required|string|max:255',
            'database' => 'required|string|max:255',
            'trustServerCertificate' => 'required|string|in:true,false',
            'biostar_username' => 'required|string|max:255',
            'biostar_password' => 'required|string|max:255'
        ]);

        return $this->configurationService->testConnection($request->all());
    }

    /**
     * Get configuration for a specific ville
     */
    public function getConfigurationForVille($villeId): JsonResponse
    {
        return $this->configurationService->getConfigurationForVille($villeId);
    }

    /**
     * Get configuration for a cours (based on cours ville)
     */
    public function getConfigurationForCours($coursId): JsonResponse
    {
        return $this->configurationService->getConfigurationForCours($coursId);
    }

    /**
     * Get configuration for an examen (based on examen ville)
     */
    public function getConfigurationForExamen($examenId): JsonResponse
    {
        return $this->configurationService->getConfigurationForExamen($examenId);
    }

    /**
     * Get connection configuration for a specific ville
     */
    public function getConnectionConfigForVille($villeId): JsonResponse
    {
        $config = $this->configurationService->getConnectionConfigForVille($villeId);
        
        if (isset($config['error'])) {
            return response()->json($config, 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $config,
            'message' => 'Connection configuration retrieved successfully'
        ]);
    }

    /**
     * Get connection configuration for a cours
     */
    public function getConnectionConfigForCours($coursId): JsonResponse
    {
        $config = $this->configurationService->getConnectionConfigForCours($coursId);
        
        if (isset($config['error'])) {
            return response()->json($config, 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $config,
            'message' => 'Connection configuration retrieved successfully for cours'
        ]);
    }

    /**
     * Get connection configuration for an examen
     */
    public function getConnectionConfigForExamen($examenId): JsonResponse
    {
        $config = $this->configurationService->getConnectionConfigForExamen($examenId);
        
        if (isset($config['error'])) {
            return response()->json($config, 404);
        }
        
        return response()->json([
            'success' => true,
            'data' => $config,
            'message' => 'Connection configuration retrieved successfully for examen'
        ]);
    }

    /**
     * Get villes for dropdown
     */
    public function getVilles(): JsonResponse
    {
        return $this->configurationService->getVilles();
    }
}
