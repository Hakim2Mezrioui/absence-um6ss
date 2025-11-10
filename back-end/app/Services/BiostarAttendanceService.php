<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

class BiostarAttendanceService
{
    /**
     * Get attendance data from Biostar database
     */
    public function getAttendanceData($config, $date, $startTime = null, $endTime = null, $studentIds = null, $allowedDeviceIds = null, $allowedDeviceNames = null)
    {
        try {
            // Create PDO connection with defensive DSN (LoginTimeout) if possible
            $dsn = $config['dsn'];
            if (strpos($dsn, 'LoginTimeout=') === false) {
                $dsn .= (str_contains($dsn, ';') ? '' : ';') . 'LoginTimeout=3';
            }
            
            \Log::info('BiostarAttendanceService: Tentative de connexion à Biostar', [
                'dsn' => $dsn,
                'username' => $config['username'],
                'has_password' => !empty($config['password']),
                'ville_id' => $config['ville_id'] ?? null
            ]);
            
            $pdo = new PDO($dsn, $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            \Log::info('BiostarAttendanceService: Connexion à Biostar réussie');

            // Formater la date au format YYYY-MM-DD (extraire juste la date du format ISO)
            $formattedDate = date('Y-m-d', strtotime($date));
            
            // Formater les heures au format HH:MM:SS (extraire juste l'heure du format ISO)
            $formattedStartTime = null;
            $formattedEndTime = null;
            
            if ($startTime) {
                // Si c'est un format ISO, extraire l'heure, sinon utiliser tel quel
                if (strpos($startTime, 'T') !== false) {
                    $formattedStartTime = date('H:i:s', strtotime($startTime));
                } else {
                    // Si c'est déjà au format HH:MM ou HH:MM:SS, normaliser
                    $formattedStartTime = date('H:i:s', strtotime($startTime));
                }
            }
            
            if ($endTime) {
                // Si c'est un format ISO, extraire l'heure, sinon utiliser tel quel
                if (strpos($endTime, 'T') !== false) {
                    $formattedEndTime = date('H:i:s', strtotime($endTime));
                } else {
                    // Si c'est déjà au format HH:MM ou HH:MM:SS, normaliser
                    $formattedEndTime = date('H:i:s', strtotime($endTime));
                }
            }

            // Test : vérifier s'il y a des pointages pour cette date (sans filtre horaire)
            $testStmt = $pdo->prepare("SELECT COUNT(*) as total FROM punchlog WHERE CAST(devdt AS DATE) = CAST(? AS DATE)");
            $testStmt->execute([$formattedDate]);
            $testResult = $testStmt->fetch(PDO::FETCH_ASSOC);
            \Log::info('BiostarAttendanceService: Test - Pointages pour la date (sans filtre horaire)', [
                'date' => $formattedDate,
                'total_punches_for_date' => $testResult['total'] ?? 0
            ]);

            // Build query - utiliser les colonnes correctes de la table punchlog
            // Utiliser la même syntaxe que CoursController avec CAST sur les paramètres
            $query = "SELECT 
                        id,
                        user_id,
                        bsevtc,
                        devdt,
                        devid,
                        devnm,
                        bsevtdt,
                        user_name
                      FROM punchlog 
                      WHERE CAST(devdt AS DATE) = CAST(? AS DATE)";

            $params = [$formattedDate];

            // Add time filters if provided - utiliser BETWEEN comme dans CoursController
            if ($formattedStartTime && $formattedEndTime) {
                $query .= " AND CAST(devdt AS TIME) BETWEEN CAST(? AS TIME) AND CAST(? AS TIME)";
                $params[] = $formattedStartTime;
                $params[] = $formattedEndTime;
            } elseif ($formattedStartTime) {
                $query .= " AND CAST(devdt AS TIME) >= CAST(? AS TIME)";
                $params[] = $formattedStartTime;
            } elseif ($formattedEndTime) {
                $query .= " AND CAST(devdt AS TIME) <= CAST(? AS TIME)";
                $params[] = $formattedEndTime;
            }

            // Exclure TOUR% et ACCES HCK% comme dans CoursController
            $query .= " AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";

            // Add student IDs filter if provided
            if ($studentIds && is_array($studentIds) && count($studentIds) > 0) {
                $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
                $query .= " AND (user_id IN ($placeholders) OR bsevtc IN ($placeholders))";
                $params = array_merge($params, $studentIds, $studentIds);
            }

            $query .= " ORDER BY devdt ASC";

            // Log de la requête SQL et des paramètres
            \Log::info('BiostarAttendanceService: Requête SQL à exécuter', [
                'query' => $query,
                'params' => $params,
                'formatted_date' => $formattedDate,
                'formatted_start_time' => $formattedStartTime,
                'formatted_end_time' => $formattedEndTime,
                'student_ids_count' => $studentIds ? count($studentIds) : 0
            ]);

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            \Log::info('BiostarAttendanceService: Résultats bruts de la requête SQL', [
                'total_punches_before_filter' => count($punches),
                'sample_punches' => array_slice($punches, 0, 3), // Échantillon des 3 premiers pointages
                'unique_devices' => array_unique(array_column($punches, 'devnm')),
                'unique_user_ids' => array_slice(array_unique(array_column($punches, 'user_id')), 0, 5)
            ]);

            // Filtrer par devices autorisés si fournis
            // Si des devices sont spécifiés, on filtre strictement
            // Si des tableaux vides sont passés (cours avec salles mais sans devices), on rejette tous les pointages
            // Si null est passé (pas de filtrage), on accepte tous les pointages
            \Log::info('BiostarAttendanceService: État du filtrage par devices', [
                'allowedDeviceIds' => $allowedDeviceIds,
                'allowedDeviceNames' => $allowedDeviceNames,
                'will_filter' => $allowedDeviceIds !== null || $allowedDeviceNames !== null,
                'punches_before_filter' => count($punches)
            ]);
            
            if ($allowedDeviceIds !== null || $allowedDeviceNames !== null) {
                $beforeCount = count($punches);
                
                // Normaliser les noms pour comparaison case-insensitive
                $normalizedDeviceNames = [];
                if (!empty($allowedDeviceNames)) {
                    $normalizedDeviceNames = array_map(function($name) {
                        return strtolower(trim((string)$name));
                    }, $allowedDeviceNames);
                    $normalizedDeviceNames = array_values(array_unique(array_filter($normalizedDeviceNames)));
                }
                
                $normalizedDeviceIds = [];
                if (!empty($allowedDeviceIds)) {
                    $normalizedDeviceIds = array_map(function($id) {
                        return (string)$id;
                    }, $allowedDeviceIds);
                    $normalizedDeviceIds = array_values(array_unique(array_filter($normalizedDeviceIds)));
                }
                
                $filteredPunches = [];
                $rejectedPunches = [];
                
                foreach ($punches as $punch) {
                    $matched = false;
                    $punchDevId = isset($punch['devid']) ? (string)$punch['devid'] : null;
                    $punchName = $punch['devnm'] ?? null;
                    
                    // Match par devid (prioritaire)
                    if (!empty($normalizedDeviceIds) && $punchDevId) {
                        if (in_array($punchDevId, $normalizedDeviceIds, true)) {
                            $matched = true;
                        }
                    }
                    
                    // Match par nom (fallback) - seulement si pas déjà matché par devid
                    if (!$matched && !empty($normalizedDeviceNames) && $punchName) {
                        $normalizedPunchName = strtolower(trim((string)$punchName));
                        if (in_array($normalizedPunchName, $normalizedDeviceNames, true)) {
                            $matched = true;
                        }
                    }
                    
                    if ($matched) {
                        $filteredPunches[] = $punch;
                    } else {
                        $rejectedPunches[] = [
                            'devid' => $punchDevId,
                            'devnm' => $punchName,
                            'user_id' => $punch['user_id'] ?? $punch['bsevtc'] ?? null
                        ];
                    }
                }
                
                $punches = $filteredPunches;
                
                $afterCount = count($punches);
                \Log::info('Biostar device filtering applied (BiostarAttendanceService)', [
                    'allowed_device_ids' => $normalizedDeviceIds,
                    'allowed_device_names' => $normalizedDeviceNames,
                    'before' => $beforeCount,
                    'after' => $afterCount,
                    'ignored' => max(0, $beforeCount - $afterCount),
                    'rejected_samples' => array_slice($rejectedPunches, 0, 5), // Échantillon des pointages rejetés
                    'accepted_samples' => array_slice(array_map(function($p) {
                        return ['devid' => $p['devid'] ?? null, 'devnm' => $p['devnm'] ?? null];
                    }, $punches), 0, 5) // Échantillon des pointages acceptés
                ]);
            }

            // Process data - mapper les colonnes correctes
            $processedPunches = array_map(function($punch) {
                return [
                    'id' => isset($punch['id']) ? (int)$punch['id'] : null,
                    'student_id' => $punch['user_id'] ?? $punch['bsevtc'] ?? null,
                    'bsevtc' => $punch['bsevtc'] ?? null,
                    'user_id' => $punch['user_id'] ?? null,
                    'user_name' => $punch['user_name'] ?? null,
                    'punch_time' => $punch['devdt'] ?? null,
                    'bsevtdt' => $punch['bsevtdt'] ?? null,
                    'device' => $punch['devid'] ?? null,
                    'device_name' => $punch['devnm'] ?? null,
                    'devnm' => $punch['devnm'] ?? null,
                    'devid' => $punch['devid'] ?? null,
                    'location' => null // Non disponible dans punchlog
                ];
            }, $punches);

            // Calculate statistics
            $totalPunches = count($processedPunches);
            $uniqueStudents = count(array_unique(array_column($processedPunches, 'student_id')));
            $studentsWithPunches = $uniqueStudents;
            $studentsWithoutPunches = 0; // This would need to be calculated based on expected students

            return [
                'punches' => $processedPunches,
                'total_punches' => $totalPunches,
                'students_with_punches' => $studentsWithPunches,
                'students_without_punches' => $studentsWithoutPunches,
                'date' => $date,
                'time_range' => [
                    'start' => $startTime,
                    'end' => $endTime
                ]
            ];

        } catch (PDOException $e) {
            \Log::error('BiostarAttendanceService: Erreur PDO lors de la récupération des pointages', [
                'error' => $e->getMessage(),
                'code' => $e->getCode(),
                'dsn' => $config['dsn'] ?? 'N/A',
                'ville_id' => $config['ville_id'] ?? null,
                'trace' => $e->getTraceAsString()
            ]);
            throw new \Exception('Database error while fetching attendance: ' . $e->getMessage());
        } catch (\Exception $e) {
            \Log::error('BiostarAttendanceService: Erreur générale lors de la récupération des pointages', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            throw new \Exception('Error retrieving attendance data: ' . $e->getMessage());
        }
    }

    /**
     * Test connection to Biostar database
     */
    public function testConnection($config)
    {
        try {
            $dsn = $config['dsn'];
            if (strpos($dsn, 'LoginTimeout=') === false) {
                $dsn .= (str_contains($dsn, ';') ? '' : ';') . 'LoginTimeout=3';
            }
            $pdo = new PDO($dsn, $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Test query
            $stmt = $pdo->query("SELECT TOP 1 * FROM punchlog");
            $result = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'success' => true,
                'message' => 'Connection successful',
                'data' => [
                    'connected' => true,
                    'test_data' => $result ? 'Data found' : 'No data',
                    'ville_id' => $config['ville_id']
                ]
            ];

        } catch (PDOException $e) {
            return [
                'success' => false,
                'message' => 'Connection failed: ' . $e->getMessage(),
                'data' => [
                    'connected' => false,
                    'error' => $e->getMessage()
                ]
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error testing connection: ' . $e->getMessage(),
                'data' => [
                    'connected' => false,
                    'error' => $e->getMessage()
                ]
            ];
        }
    }

    /**
     * Get statistics from Biostar database
     */
    public function getStatistics($config, $date)
    {
        try {
            $dsn = $config['dsn'];
            if (strpos($dsn, 'LoginTimeout=') === false) {
                $dsn .= (str_contains($dsn, ';') ? '' : ';') . 'LoginTimeout=3';
            }
            $pdo = new PDO($dsn, $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Formater la date au format YYYY-MM-DD
            $formattedDate = date('Y-m-d', strtotime($date));

            // Get total punches for the date
            $stmt = $pdo->prepare("SELECT COUNT(*) as total_punches FROM punchlog WHERE CAST(devdt AS DATE) = ?");
            $stmt->execute([$formattedDate]);
            $totalPunches = $stmt->fetch(PDO::FETCH_ASSOC)['total_punches'];

            // Get unique students
            $stmt = $pdo->prepare("SELECT COUNT(DISTINCT COALESCE(user_id, bsevtc)) as unique_students FROM punchlog WHERE CAST(devdt AS DATE) = ?");
            $stmt->execute([$formattedDate]);
            $uniqueStudents = $stmt->fetch(PDO::FETCH_ASSOC)['unique_students'];

            // Get devices used
            $stmt = $pdo->prepare("SELECT DISTINCT devnm FROM punchlog WHERE CAST(devdt AS DATE) = ? AND devnm IS NOT NULL");
            $stmt->execute([$formattedDate]);
            $devices = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Get time range
            $stmt = $pdo->prepare("SELECT MIN(devdt) as first_punch, MAX(devdt) as last_punch FROM punchlog WHERE CAST(devdt AS DATE) = ?");
            $stmt->execute([$formattedDate]);
            $timeRange = $stmt->fetch(PDO::FETCH_ASSOC);

            return [
                'total_punches' => (int)$totalPunches,
                'unique_students' => (int)$uniqueStudents,
                'devices_used' => $devices,
                'time_range' => [
                    'first_punch' => $timeRange['first_punch'],
                    'last_punch' => $timeRange['last_punch']
                ]
            ];

        } catch (PDOException $e) {
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving statistics: ' . $e->getMessage());
        }
    }

    /**
     * Get punch data for specific students
     */
    public function getPunchDataForStudents($config, $studentIds, $date, $startTime = null, $endTime = null)
    {
        try {
            $dsn = $config['dsn'];
            if (strpos($dsn, 'LoginTimeout=') === false) {
                $dsn .= (str_contains($dsn, ';') ? '' : ';') . 'LoginTimeout=3';
            }
            $pdo = new PDO($dsn, $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            if (empty($studentIds)) {
                return [];
            }

            // Formater la date au format YYYY-MM-DD
            $formattedDate = date('Y-m-d', strtotime($date));
            
            // Formater les heures au format HH:MM:SS
            $formattedStartTime = null;
            $formattedEndTime = null;
            
            if ($startTime) {
                $formattedStartTime = date('H:i:s', strtotime($startTime));
            }
            
            if ($endTime) {
                $formattedEndTime = date('H:i:s', strtotime($endTime));
            }

            $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
            $query = "SELECT 
                        id,
                        user_id,
                        bsevtc,
                        devdt,
                        devid,
                        devnm,
                        bsevtdt,
                        user_name
                      FROM punchlog 
                      WHERE CAST(devdt AS DATE) = ?
                      AND (user_id IN ($placeholders) OR bsevtc IN ($placeholders))";

            $params = array_merge([$formattedDate], $studentIds, $studentIds);

            if ($formattedStartTime) {
                $query .= " AND CAST(devdt AS TIME) >= ?";
                $params[] = $formattedStartTime;
            }

            if ($formattedEndTime) {
                $query .= " AND CAST(devdt AS TIME) <= ?";
                $params[] = $formattedEndTime;
            }

            $query .= " ORDER BY devdt ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return array_map(function($punch) {
                return [
                    'id' => isset($punch['id']) ? (int)$punch['id'] : null,
                    'student_id' => $punch['user_id'] ?? $punch['bsevtc'] ?? null,
                    'bsevtc' => $punch['bsevtc'] ?? null,
                    'user_id' => $punch['user_id'] ?? null,
                    'user_name' => $punch['user_name'] ?? null,
                    'punch_time' => $punch['devdt'] ?? null,
                    'bsevtdt' => $punch['bsevtdt'] ?? null,
                    'device' => $punch['devid'] ?? null,
                    'device_name' => $punch['devnm'] ?? null,
                    'devnm' => $punch['devnm'] ?? null,
                    'devid' => $punch['devid'] ?? null,
                    'location' => null // Non disponible dans punchlog
                ];
            }, $punches);

        } catch (PDOException $e) {
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving punch data: ' . $e->getMessage());
        }
    }

    /**
     * Get devices list (devid, devnm) from Biostar, optionally filtered by device_group_ids
     * @param array $config
     * @param array<int>|null $deviceGroupIds
     */
    public function getDevices($config, ?array $deviceGroupIds = null)
    {
        try {
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Biostar device table: id (device id), name (device name), device_group_id (FK to devicegroup)
            if ($deviceGroupIds && count($deviceGroupIds) > 0) {
                // Build IN clause safely
                $placeholders = implode(',', array_fill(0, count($deviceGroupIds), '?'));
                $sql = "SELECT id, name, device_group_id FROM device WHERE name IS NOT NULL AND device_group_id IN ($placeholders) ORDER BY name";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(array_values($deviceGroupIds));
            } else {
                $stmt = $pdo->query("SELECT id, name, device_group_id FROM device WHERE name IS NOT NULL ORDER BY name");
            }
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return array_map(function($row) {
                return [
                    'devid' => $row['id'],
                    'devnm' => $row['name'],
                    'device_group_id' => isset($row['device_group_id']) ? (int)$row['device_group_id'] : null,
                ];
            }, $rows);

        } catch (PDOException $e) {
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving devices: ' . $e->getMessage());
        }
    }

    /**
     * Get device groups from Biostar
     * Columns: id, name, depth, _parent_id
     */
    public function getDeviceGroups($config)
    {
        try {
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            $stmt = $pdo->query("SELECT id, name, depth, _parent_id FROM devicegroup ORDER BY name");
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return array_map(function($row) {
                return [
                    'id' => (int)$row['id'],
                    'name' => $row['name'],
                    'depth' => isset($row['depth']) ? (int)$row['depth'] : null,
                    '_parent_id' => isset($row['_parent_id']) ? (int)$row['_parent_id'] : null,
                ];
            }, $rows);

        } catch (PDOException $e) {
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving device groups: ' . $e->getMessage());
        }
    }
}
