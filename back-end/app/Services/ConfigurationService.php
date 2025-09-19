<?php

namespace App\Services;

use App\Models\Configuration;
use App\Models\Ville;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

class ConfigurationService extends BaseService
{
    public function __construct()
    {
        parent::__construct(Configuration::class);
    }
    public function getConfiguration()
    {
        try {
            $configuration = Configuration::with('ville')->first();
            
            if (!$configuration) {
                return $this->errorResponse('Configuration not found', 404);
            }

            return $this->successResponse($configuration, 'Configuration retrieved successfully');
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configuration: ' . $e->getMessage(), 500);
        }
    }

    public function updateConfiguration($data)
    {
        try {
            DB::beginTransaction();

            $configuration = Configuration::first();
            
            if (!$configuration) {
                $configuration = new Configuration();
            }

            $configuration->fill($data);
            $configuration->save();

            DB::commit();

            return $this->successResponse($configuration->load('ville'), 'Configuration updated successfully');
        } catch (\Exception $e) {
            DB::rollBack();
            return $this->errorResponse('Error updating configuration: ' . $e->getMessage(), 500);
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
