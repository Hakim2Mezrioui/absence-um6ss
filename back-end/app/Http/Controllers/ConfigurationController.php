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
     * Get configuration by ville
     */
    public function getByVille($villeId): JsonResponse
    {
        return $this->configurationService->getConfigurationByVille($villeId);
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
     * Get villes for dropdown
     */
    public function getVilles(): JsonResponse
    {
        return $this->configurationService->getVilles();
    }
}
