<?php

namespace App\Services;

use App\Models\Configuration;
use App\Models\Ville;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

class ConfigurationService extends BaseService
{
    use FilterByUserContext;
    public function __construct()
    {
        parent::__construct(Configuration::class);
    }
    public function getAllConfigurations()
    {
        try {
            $configurations = Configuration::with('ville')->get();
            return $this->successResponse($configurations, 'Configurations retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configurations: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get configuration for authenticated user's ville
     */
    public function getConfigurationForUserVille()
    {
        try {
            $villeId = $this->getUserContextForFiltering()['ville_id'];
            
            if (!$villeId) {
                return $this->errorResponse('User has no ville assigned', 400);
            }
            
            $configuration = Configuration::with('ville')->where('ville_id', $villeId)->first();
            
            if (!$configuration) {
                return $this->errorResponse('Configuration not found for user ville', 404);
            }

            return $this->successResponse($configuration, 'Configuration retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configuration: ' . $e->getMessage(), 500);
        }
    }

    public function createOrUpdateConfiguration($data)
    {
        try {
            DB::beginTransaction();

            // Check if configuration already exists for this ville
            $configuration = Configuration::where('ville_id', $data['ville_id'])->first();
            
            if (!$configuration) {
                $configuration = new Configuration();
            }

            $configuration->fill($data);
            $configuration->save();

            DB::commit();

            return $this->successResponse($configuration->load('ville'), 'Configuration saved successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error saving configuration: ' . $e->getMessage(), 500);
        }
    }

    public function updateConfiguration($id, $data)
    {
        try {
            DB::beginTransaction();

            $configuration = Configuration::findOrFail($id);
            $configuration->fill($data);
            $configuration->save();

            DB::commit();

            return $this->successResponse($configuration->load('ville'), 'Configuration updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error updating configuration: ' . $e->getMessage(), 500);
        }
    }

    public function deleteConfiguration($id)
    {
        try {
            DB::beginTransaction();

            $configuration = Configuration::findOrFail($id);
            $configuration->delete();

            DB::commit();

            return $this->successResponse(null, 'Configuration deleted successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error deleting configuration: ' . $e->getMessage(), 500);
        }
    }

    public function testConnection($data)
    {
        try {
            $dsn = "sqlsrv:Server={$data['sqlsrv']};Database={$data['database']};TrustServerCertificate={$data['trustServerCertificate']}";
            $username = $data['biostar_username'];
            $password = $data['biostar_password'];

            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Test query to verify connection
            $stmt = $pdo->query("SELECT TOP 1 * FROM punchlog");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return $this->successResponse([
                'connected' => true,
                'message' => 'Connection successful',
                'test_data' => $result ? 'Data found' : 'No data'
            ], 'Connection test successful');

        } catch (PDOException $e) {
            return $this->errorResponse('Connection failed: ' . $e->getMessage(), 400);
        } catch (\Exception $e) {
            return $this->errorResponse('Error testing connection: ' . $e->getMessage(), 500);
        }
    }

    public function getVilles()
    {
        try {
            $villes = Ville::all();
            return $this->successResponse($villes, 'Villes retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving villes: ' . $e->getMessage(), 500);
        }
    }

    public function getConnectionConfig()
    {
        try {
            $configuration = Configuration::first();
            
            if (!$configuration) {
                return $this->errorResponse('Configuration not found', 404);
            }

            return [
                'dsn' => "sqlsrv:Server={$configuration->sqlsrv};Database={$configuration->database};TrustServerCertificate={$configuration->trustServerCertificate}",
                'username' => $configuration->biostar_username,
                'password' => $configuration->biostar_password
            ];
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving connection config: ' . $e->getMessage(), 500);
        }
    }
}
