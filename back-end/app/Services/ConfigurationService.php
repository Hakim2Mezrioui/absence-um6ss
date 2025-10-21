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

    /**
     * Get configuration for a specific ville
     */
    public function getConfigurationForVille($villeId)
    {
        try {
            $configuration = Configuration::with('ville')->where('ville_id', $villeId)->first();
            
            if (!$configuration) {
                return $this->errorResponse('Configuration not found for ville ID: ' . $villeId, 404);
            }

            return $this->successResponse($configuration, 'Configuration retrieved successfully for ville');
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configuration for ville: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get configuration for a cours (based on cours ville)
     */
    public function getConfigurationForCours($coursId)
    {
        try {
            // Get the cours with its ville
            $cours = \App\Models\Cours::with('ville')->find($coursId);
            
            if (!$cours) {
                return $this->errorResponse('Cours not found', 404);
            }

            if (!$cours->ville_id) {
                return $this->errorResponse('Cours has no ville assigned', 400);
            }

            // Get configuration for the cours ville
            return $this->getConfigurationForVille($cours->ville_id);
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configuration for cours: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get configuration for an examen (based on examen ville)
     */
    public function getConfigurationForExamen($examenId)
    {
        try {
            // Get the examen with its ville
            $examen = \App\Models\Examen::with('ville')->find($examenId);
            
            if (!$examen) {
                return $this->errorResponse('Examen not found', 404);
            }

            if (!$examen->ville_id) {
                return $this->errorResponse('Examen has no ville assigned', 400);
            }

            // Get configuration for the examen ville
            return $this->getConfigurationForVille($examen->ville_id);
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving configuration for examen: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get connection configuration for a specific ville
     */
    public function getConnectionConfigForVille($villeId)
    {
        try {
            $configuration = Configuration::where('ville_id', $villeId)->first();
            
            if (!$configuration) {
                return $this->errorResponse('Configuration not found for ville ID: ' . $villeId, 404);
            }

            return [
                'dsn' => "sqlsrv:Server={$configuration->sqlsrv};Database={$configuration->database};TrustServerCertificate={$configuration->trustServerCertificate}",
                'username' => $configuration->biostar_username,
                'password' => $configuration->biostar_password,
                'ville_id' => $configuration->ville_id
            ];
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving connection config for ville: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get connection configuration for a cours
     */
    public function getConnectionConfigForCours($coursId)
    {
        try {
            $cours = \App\Models\Cours::find($coursId);
            
            if (!$cours) {
                return $this->errorResponse('Cours not found', 404);
            }

            if (!$cours->ville_id) {
                return $this->errorResponse('Cours has no ville assigned', 400);
            }

            return $this->getConnectionConfigForVille($cours->ville_id);
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving connection config for cours: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Get connection configuration for an examen
     */
    public function getConnectionConfigForExamen($examenId)
    {
        try {
            $examen = \App\Models\Examen::find($examenId);
            
            if (!$examen) {
                return $this->errorResponse('Examen not found', 404);
            }

            if (!$examen->ville_id) {
                return $this->errorResponse('Examen has no ville assigned', 400);
            }

            return $this->getConnectionConfigForVille($examen->ville_id);
        } catch (\Exception $e) {
            return $this->errorResponse('Error retrieving connection config for examen: ' . $e->getMessage(), 500);
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
