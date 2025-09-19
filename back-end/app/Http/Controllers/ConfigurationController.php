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
     * Get current configuration
     */
    public function index(): JsonResponse
    {
        return $this->configurationService->getConfiguration();
    }

    /**
     * Update configuration
     */
    public function update(Request $request): JsonResponse
    {
        $request->validate([
            'sqlsrv' => 'required|string|max:255',
            'database' => 'required|string|max:255',
            'trustServerCertificate' => 'required|string|in:true,false',
            'biostar_username' => 'required|string|max:255',
            'biostar_password' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id'
        ]);

        return $this->configurationService->updateConfiguration($request->all());
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
