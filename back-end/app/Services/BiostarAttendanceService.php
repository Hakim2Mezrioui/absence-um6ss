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
    public function getAttendanceData($config, $date, $startTime = null, $endTime = null, $studentIds = null)
    {
        try {
            // Create PDO connection
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Build query
            $query = "SELECT 
                        id,
                        student_id,
                        punch_time,
                        device,
                        device_name,
                        location
                      FROM punchlog 
                      WHERE CAST(punch_time AS DATE) = ?";

            $params = [$date];

            // Add time filters if provided
            if ($startTime) {
                $query .= " AND CAST(punch_time AS TIME) >= ?";
                $params[] = $startTime;
            }

            if ($endTime) {
                $query .= " AND CAST(punch_time AS TIME) <= ?";
                $params[] = $endTime;
            }

            // Add student IDs filter if provided
            if ($studentIds && is_array($studentIds) && count($studentIds) > 0) {
                $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
                $query .= " AND student_id IN ($placeholders)";
                $params = array_merge($params, $studentIds);
            }

            $query .= " ORDER BY punch_time ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Process data
            $processedPunches = array_map(function($punch) {
                return [
                    'id' => (int)$punch['id'],
                    'student_id' => $punch['student_id'],
                    'punch_time' => $punch['punch_time'],
                    'device' => $punch['device'],
                    'device_name' => $punch['device_name'],
                    'location' => $punch['location']
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
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving attendance data: ' . $e->getMessage());
        }
    }

    /**
     * Test connection to Biostar database
     */
    public function testConnection($config)
    {
        try {
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
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
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Get total punches for the date
            $stmt = $pdo->prepare("SELECT COUNT(*) as total_punches FROM punchlog WHERE CAST(punch_time AS DATE) = ?");
            $stmt->execute([$date]);
            $totalPunches = $stmt->fetch(PDO::FETCH_ASSOC)['total_punches'];

            // Get unique students
            $stmt = $pdo->prepare("SELECT COUNT(DISTINCT student_id) as unique_students FROM punchlog WHERE CAST(punch_time AS DATE) = ?");
            $stmt->execute([$date]);
            $uniqueStudents = $stmt->fetch(PDO::FETCH_ASSOC)['unique_students'];

            // Get devices used
            $stmt = $pdo->prepare("SELECT DISTINCT device FROM punchlog WHERE CAST(punch_time AS DATE) = ? AND device IS NOT NULL");
            $stmt->execute([$date]);
            $devices = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Get time range
            $stmt = $pdo->prepare("SELECT MIN(punch_time) as first_punch, MAX(punch_time) as last_punch FROM punchlog WHERE CAST(punch_time AS DATE) = ?");
            $stmt->execute([$date]);
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
            $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            if (empty($studentIds)) {
                return [];
            }

            $placeholders = str_repeat('?,', count($studentIds) - 1) . '?';
            $query = "SELECT 
                        id,
                        student_id,
                        punch_time,
                        device,
                        device_name,
                        location
                      FROM punchlog 
                      WHERE CAST(punch_time AS DATE) = ?
                      AND student_id IN ($placeholders)";

            $params = array_merge([$date], $studentIds);

            if ($startTime) {
                $query .= " AND CAST(punch_time AS TIME) >= ?";
                $params[] = $startTime;
            }

            if ($endTime) {
                $query .= " AND CAST(punch_time AS TIME) <= ?";
                $params[] = $endTime;
            }

            $query .= " ORDER BY punch_time ASC";

            $stmt = $pdo->prepare($query);
            $stmt->execute($params);
            $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);

            return array_map(function($punch) {
                return [
                    'id' => (int)$punch['id'],
                    'student_id' => $punch['student_id'],
                    'punch_time' => $punch['punch_time'],
                    'device' => $punch['device'],
                    'device_name' => $punch['device_name'],
                    'location' => $punch['location']
                ];
            }, $punches);

        } catch (PDOException $e) {
            throw new \Exception('Database error: ' . $e->getMessage());
        } catch (\Exception $e) {
            throw new \Exception('Error retrieving punch data: ' . $e->getMessage());
        }
    }
}
