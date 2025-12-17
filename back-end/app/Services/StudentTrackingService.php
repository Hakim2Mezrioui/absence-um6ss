<?php

namespace App\Services;

use App\Models\Etudiant;
use App\Models\Cours;
use App\Models\Examen;
use App\Models\Absence;
use App\Services\BiostarAttendanceService;
use App\Services\ConfigurationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class StudentTrackingService
{
    protected $biostarAttendanceService;
    protected $configurationService;

    public function __construct(
        BiostarAttendanceService $biostarAttendanceService,
        ConfigurationService $configurationService
    ) {
        $this->biostarAttendanceService = $biostarAttendanceService;
        $this->configurationService = $configurationService;
    }

    /**
     * Track student attendance for a date range
     */
    public function trackStudent($studentId, $fromDate, $toDate, $statusFilter = 'all')
    {
        try {
            // Get student
            $student = Etudiant::withoutGlobalScopes()
                ->with(['ville', 'group', 'option', 'etablissement', 'promotion'])
                ->find($studentId);

            if (!$student) {
                return [
                    'success' => false,
                    'message' => 'Étudiant non trouvé'
                ];
            }

            // Get all cours and examens in date range
            $cours = Cours::withoutGlobalScopes()
                ->whereBetween('date', [$fromDate, $toDate])
                ->with(['salle', 'salles', 'type_cours', 'promotion', 'etablissement', 'ville'])
                ->get();

            $examens = Examen::withoutGlobalScopes()
                ->whereBetween('date', [$fromDate, $toDate])
                ->with(['salle', 'salles', 'typeExamen', 'promotion', 'etablissement', 'ville'])
                ->get();

            $results = [];

            // Process cours
            foreach ($cours as $coursItem) {
                // Check if student should attend this cours (based on group/promotion)
                $shouldAttend = $this->shouldStudentAttendCours($student, $coursItem);
                
                if (!$shouldAttend) {
                    continue;
                }

                $trackingData = $this->getTrackingDataForCours($student, $coursItem);
                
                if ($this->matchesStatusFilter($trackingData['status'], $statusFilter)) {
                    $results[] = $trackingData;
                }
            }

            // Process examens
            foreach ($examens as $examen) {
                // Check if student should attend this examen (based on group/promotion)
                $shouldAttend = $this->shouldStudentAttendExamen($student, $examen);
                
                if (!$shouldAttend) {
                    continue;
                }

                $trackingData = $this->getTrackingDataForExamen($student, $examen);
                
                if ($this->matchesStatusFilter($trackingData['status'], $statusFilter)) {
                    $results[] = $trackingData;
                }
            }

            // Sort by date and time
            usort($results, function($a, $b) {
                $dateA = $a['date'] . ' ' . $a['heure_debut'];
                $dateB = $b['date'] . ' ' . $b['heure_debut'];
                return strtotime($dateA) - strtotime($dateB);
            });

            return [
                'success' => true,
                'student' => $student,
                'results' => $results,
                'summary' => $this->calculateSummary($results),
                'date_range' => [
                    'from' => $fromDate,
                    'to' => $toDate
                ]
            ];

        } catch (\Exception $e) {
            Log::error('Error tracking student', [
                'student_id' => $studentId,
                'from' => $fromDate,
                'to' => $toDate,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Erreur lors du suivi: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Check if student should attend a cours
     */
    private function shouldStudentAttendCours($student, $cours)
    {
        // Check promotion
        if ($cours->promotion_id && $student->promotion_id != $cours->promotion_id) {
            return false;
        }

        // Check if cours has groups and student is in one of them
        if ($cours->groups && $cours->groups->count() > 0) {
            if (!$student->group_id || !$cours->groups->contains('id', $student->group_id)) {
                return false;
            }
        }

        // Check ville
        if ($cours->ville_id && $student->ville_id != $cours->ville_id) {
            return false;
        }

        return true;
    }

    /**
     * Check if student should attend an examen
     */
    private function shouldStudentAttendExamen($student, $examen)
    {
        // Check promotion
        if ($examen->promotion_id && $student->promotion_id != $examen->promotion_id) {
            return false;
        }

        // Check group
        if ($examen->group_id && $student->group_id != $examen->group_id) {
            return false;
        }

        // Check ville
        if ($examen->ville_id && $student->ville_id != $examen->ville_id) {
            return false;
        }

        return true;
    }

    /**
     * Get tracking data for a cours
     */
    private function getTrackingDataForCours($student, $cours)
    {
        // Check for manual absence record
        $absence = Absence::where('etudiant_id', $student->id)
            ->where('cours_id', $cours->id)
            ->where('date_absence', $cours->date)
            ->first();

        $status = 'absent';
        $punchTime = null;
        $device = null;

        // Always try to get punch data from Biostar (even if there's a manual absence)
        $punchData = $this->getPunchDataForCours($student, $cours);
        
        // Variables pour bi-check
        $punchIn = null;
        $punchOut = null;
        $attendanceMode = $cours->attendance_mode ?? 'normal';
        
        if ($punchData) {
            $punchTime = $punchData['punch_time'];
            $device = $punchData['device'];
            
            // Récupérer les données bi-check si disponibles
            if (isset($punchData['punch_in'])) {
                $punchIn = $punchData['punch_in'];
            }
            if (isset($punchData['punch_out'])) {
                $punchOut = $punchData['punch_out'];
            }
            
            // Only use Biostar status if there's no manual absence
            if (!$absence) {
                $status = $punchData['status'];
            }
        }

        // If there's a manual absence, use its status (but keep punch data if available)
        if ($absence) {
            // Map absence type to status
            switch ($absence->type_absence) {
                case 'Absence':
                    $status = 'absent';
                    break;
                case 'Retard':
                    $status = 'late';
                    break;
                case 'Départ anticipé':
                    $status = 'left_early';
                    break;
                case 'Présence confirmée':
                    $status = 'present';
                    break;
            }
        }

        // Format date as Y-m-d string
        $dateFormatted = $cours->date instanceof \Carbon\Carbon 
            ? $cours->date->format('Y-m-d')
            : (is_string($cours->date) ? date('Y-m-d', strtotime($cours->date)) : $cours->date);
        
        // Format heure_debut and heure_fin as H:i:s string
        $heureDebutFormatted = $this->formatTime($cours->heure_debut);
        $heureFinFormatted = $this->formatTime($cours->heure_fin);

        $result = [
            'type' => 'cours',
            'id' => $cours->id,
            'name' => $cours->name,
            'date' => $dateFormatted,
            'heure_debut' => $heureDebutFormatted,
            'heure_fin' => $heureFinFormatted,
            'status' => $status,
            'punch_time' => $punchTime,
            'device' => $device,
            'salle' => $cours->salle ? $cours->salle->name : null,
            'type_cours' => $cours->type_cours ? $cours->type_cours->name : null,
            'absence' => $absence,
            'attendance_mode' => $attendanceMode
        ];
        
        // Ajouter les données bi-check si disponibles
        if ($attendanceMode === 'bicheck') {
            $result['punch_in'] = $punchIn;
            $result['punch_out'] = $punchOut;
        }
        
        return $result;
    }

    /**
     * Get tracking data for an examen
     */
    private function getTrackingDataForExamen($student, $examen)
    {
        // Check for manual absence record
        $absence = Absence::where('etudiant_id', $student->id)
            ->where('examen_id', $examen->id)
            ->where('date_absence', $examen->date)
            ->first();

        $status = 'absent';
        $punchTime = null;
        $device = null;

        // Always try to get punch data from Biostar (even if there's a manual absence)
        $punchData = $this->getPunchDataForExamen($student, $examen);
        
        if ($punchData) {
            $punchTime = $punchData['punch_time'];
            $device = $punchData['device'];
            
            // Only use Biostar status if there's no manual absence
            if (!$absence) {
                $status = $punchData['status'];
            }
        }

        // If there's a manual absence, use its status (but keep punch data if available)
        if ($absence) {
            // Map absence type to status
            switch ($absence->type_absence) {
                case 'Absence':
                    $status = 'absent';
                    break;
                case 'Retard':
                    $status = 'late';
                    break;
                case 'Départ anticipé':
                    $status = 'left_early';
                    break;
                case 'Présence confirmée':
                    $status = 'present';
                    break;
            }
        }

        // Format date as Y-m-d string
        $dateFormatted = $examen->date instanceof \Carbon\Carbon 
            ? $examen->date->format('Y-m-d')
            : (is_string($examen->date) ? date('Y-m-d', strtotime($examen->date)) : $examen->date);
        
        // Format heure_debut and heure_fin as H:i:s string
        $heureDebutFormatted = $this->formatTime($examen->heure_debut);
        $heureFinFormatted = $this->formatTime($examen->heure_fin);

        return [
            'type' => 'examen',
            'id' => $examen->id,
            'name' => $examen->title,
            'date' => $dateFormatted,
            'heure_debut' => $heureDebutFormatted,
            'heure_fin' => $heureFinFormatted,
            'status' => $status,
            'punch_time' => $punchTime,
            'device' => $device,
            'salle' => $examen->salle ? $examen->salle->name : null,
            'type_examen' => $examen->typeExamen ? $examen->typeExamen->name : null,
            'absence' => $absence
        ];
    }

    /**
     * Get punch data from Biostar for a cours
     */
    private function getPunchDataForCours($student, $cours)
    {
        try {
            // Get configuration for cours ville
            $config = $this->configurationService->getConnectionConfigForCours($cours->id);
            
            if (!is_array($config) || !isset($config['dsn'])) {
                return null;
            }

            // Get allowed devices from salle(s) - support for multiple salles
            $allowedDeviceIds = [];
            $allowedDeviceNames = [];
            
            // Load salles relation if not already loaded
            if (!$cours->relationLoaded('salles')) {
                $cours->load('salles');
            }
            
            // Priority: multiple salles (many-to-many), then single salle
            if (method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty()) {
                // Multi-salles: collect devices from all salles
                foreach ($cours->salles as $salle) {
                    if (is_array($salle->devices)) {
                        foreach ($salle->devices as $d) {
                            if (is_array($d)) {
                                if (isset($d['devid'])) {
                                    $allowedDeviceIds[] = (string)$d['devid'];
                                }
                                if (isset($d['devnm'])) {
                                    // Normaliser immédiatement pour comparaison cohérente avec Biostar
                                    $allowedDeviceNames[] = strtolower(trim((string)$d['devnm']));
                                }
                            }
                        }
                    }
                }
            } elseif ($cours->salle_id && $cours->salle) {
                // Fallback: single salle
                if (is_array($cours->salle->devices)) {
                    foreach ($cours->salle->devices as $d) {
                        if (is_array($d)) {
                            if (isset($d['devid'])) {
                                $allowedDeviceIds[] = (string)$d['devid'];
                            }
                            if (isset($d['devnm'])) {
                                // Normaliser immédiatement pour comparaison cohérente avec Biostar
                                $allowedDeviceNames[] = strtolower(trim((string)$d['devnm']));
                            }
                        }
                    }
                }
            }

            // Normaliser et dédupliquer les devices
            $allowedDeviceIds = !empty($allowedDeviceIds) ? array_values(array_unique(array_filter($allowedDeviceIds))) : [];
            $allowedDeviceNames = !empty($allowedDeviceNames) ? array_values(array_unique(array_filter($allowedDeviceNames))) : [];

            // Vérifier si le cours a une salle (une ou plusieurs)
            $hasSalles = (method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty()) 
                        || ($cours->salle_id && $cours->salle);

            // Déterminer les devices à passer à la requête Biostar
            if ($hasSalles && empty($allowedDeviceIds) && empty($allowedDeviceNames)) {
                // Si salle existe mais aucun device assigné : rejeter tous les pointages
                Log::warning('StudentTrackingService: Cours a une salle mais aucun device assigné', [
                    'cours_id' => $cours->id,
                    'salle_id' => $cours->salle_id,
                    'salles_count' => method_exists($cours, 'salles') && $cours->relationLoaded('salles') ? $cours->salles->count() : 0
                ]);
                $deviceIdsForQuery = [];
                $deviceNamesForQuery = [];
            } elseif ($hasSalles && (!empty($allowedDeviceIds) || !empty($allowedDeviceNames))) {
                // Si salle existe avec devices : filtrage strict
                $deviceIdsForQuery = $allowedDeviceIds;
                $deviceNamesForQuery = $allowedDeviceNames;
            } else {
                // Pas de salle : accepter tous les pointages (pas de filtrage)
                $deviceIdsForQuery = null;
                $deviceNamesForQuery = null;
            }

            // Format date for Biostar query
            $coursDate = $cours->date instanceof \Carbon\Carbon 
                ? $cours->date->format('Y-m-d')
                : (is_string($cours->date) ? date('Y-m-d', strtotime($cours->date)) : $cours->date);
            
            // =============================================
            // MODE BI-CHECK : nécessite entrée ET sortie
            // =============================================
            $attendanceMode = $cours->attendance_mode ?? 'normal';
            
            if ($attendanceMode === 'bicheck') {
                return $this->getPunchDataForCoursBiCheck($student, $cours, $config, $coursDate, $allowedDeviceIds, $allowedDeviceNames, $deviceIdsForQuery, $deviceNamesForQuery, $hasSalles);
            }
            
            // =============================================
            // MODE NORMAL : logique existante (entrée seule)
            // =============================================
            
            // Format start time
            $startTime = $cours->pointage_start_hour ?? $cours->heure_debut;
            if ($startTime instanceof \DateTime || $startTime instanceof \Carbon\Carbon) {
                $startTime = $startTime->format('H:i:s');
            } elseif (is_string($startTime) && !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $startTime)) {
                // Try to parse if it's a datetime string
                try {
                    $dt = new \DateTime($startTime);
                    $startTime = $dt->format('H:i:s');
                } catch (\Exception $e) {
                    // Keep original
                }
            }
            
            // Format end time - Le pointage doit être fait entre pointage_start_hour et heure_debut + tolerance
            $endTime = $cours->heure_debut;
            if ($endTime instanceof \DateTime || $endTime instanceof \Carbon\Carbon) {
                $endTime = $endTime->format('H:i:s');
            } elseif (is_string($endTime) && !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $endTime)) {
                // Try to parse if it's a datetime string
                try {
                    $dt = new \DateTime($endTime);
                    $endTime = $dt->format('H:i:s');
                } catch (\Exception $e) {
                    // Keep original
                }
            }

            // Ajouter la tolérance à l'heure de fin pour accepter les pointages jusqu'à heure_debut + tolerance
            $toleranceMinutes = $this->parseTolerance($cours->tolerance);
            if ($toleranceMinutes > 0) {
                try {
                    $endTimeObj = Carbon::parse($coursDate . ' ' . $endTime);
                    $endTimeObj->addMinutes($toleranceMinutes);
                    $endTime = $endTimeObj->format('H:i:s');
                } catch (\Exception $e) {
                    // Si erreur, garder l'heure de fin originale
                    Log::warning('StudentTrackingService: Failed to add tolerance to endTime', [
                        'end_time' => $endTime,
                        'tolerance' => $toleranceMinutes,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Get attendance data
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $config,
                $coursDate,
                $startTime,
                $endTime,
                [$student->matricule],
                $deviceIdsForQuery,
                $deviceNamesForQuery
            );
            
            Log::info('StudentTrackingService: Biostar query for cours', [
                'cours_id' => $cours->id,
                'student_matricule' => $student->matricule,
                'date' => $coursDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'punches_count' => count($attendanceData['punches'] ?? []),
                'has_config' => !empty($config['dsn'])
            ]);

            // Find student's punch in time window (strict: between heure_debut and heure_fin, with correct device)
            $studentPunch = $this->findStudentPunchInTimeWindow(
                $attendanceData['punches'] ?? [], 
                $student->matricule,
                $coursDate,
                $startTime,
                $endTime,
                $allowedDeviceIds,
                $allowedDeviceNames
            );

            if (!$studentPunch) {
                Log::info('StudentTrackingService: No punch found for student in cours', [
                    'student_matricule' => $student->matricule,
                    'cours_id' => $cours->id,
                    'date' => $coursDate,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'punches_received' => count($attendanceData['punches'] ?? []),
                    'sample_punches' => array_slice($attendanceData['punches'] ?? [], 0, 3),
                    'allowed_devices' => [
                        'ids' => $deviceIdsForQuery,
                        'names' => $deviceNamesForQuery
                    ],
                    'has_salles' => $hasSalles
                ]);
                return null;
            }

            // Log quand un pointage est trouvé avec toutes les valeurs brutes
            Log::info('StudentTrackingService: Punch found for cours', [
                'cours_id' => $cours->id,
                'student_matricule' => $student->matricule,
                'punch_raw' => $studentPunch,
                'devdt' => $studentPunch['devdt'] ?? 'NOT_FOUND',
                'devnm' => $studentPunch['devnm'] ?? 'NOT_FOUND',
                'punch_time' => $studentPunch['punch_time'] ?? 'NOT_FOUND',
                'device_name' => $studentPunch['device_name'] ?? 'NOT_FOUND'
            ]);

            // Get punch time and device - PRIORITÉ aux colonnes brutes de punchlog (devdt et devnm)
            $punchTime = $studentPunch['devdt'] ?? $studentPunch['punch_time'] ?? $studentPunch['bsevtdt'] ?? null;
            $device = $studentPunch['devnm'] ?? $studentPunch['device_name'] ?? null;
            
            // Format punch time if it exists and verify it matches the cours date
            if ($punchTime) {
                try {
                    // Nettoyer le format SQL Server (enlever les microsecondes si présentes)
                    // Format attendu: "2025-11-26 14:48:05.0000000" ou "2025-11-26 14:48:05"
                    $punchTimeClean = $this->cleanSqlServerDateTime($punchTime);
                    
                    // Utiliser createFromFormat() au lieu de parse() pour forcer le format exact
                    // Cela évite que Carbon interprète mal la date (ex: 2026 au lieu de 2025)
                    try {
                        $punchDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $punchTimeClean);
                    } catch (\Exception $e) {
                        // Si createFromFormat échoue, essayer avec parse() en fallback
                        Log::warning('StudentTrackingService: createFromFormat failed, trying parse()', [
                            'punch_time_clean' => $punchTimeClean,
                            'error' => $e->getMessage()
                        ]);
                        $punchDateTime = Carbon::parse($punchTimeClean);
                    }
                    
                    // IMPORTANT: Convertir l'heure côté serveur Biostar en heure côté client (+60 minutes)
                    $offsetMinutes = 60;
                    $punchDateTimeClient = $punchDateTime->copy()->addMinutes($offsetMinutes);
                    $coursDateObj = Carbon::parse($coursDate);
                    
                    // Vérifier que c'est la même date (côté client)
                    if ($punchDateTimeClient->format('Y-m-d') !== $coursDateObj->format('Y-m-d')) {
                        Log::warning('StudentTrackingService: Punch date mismatch for cours', [
                            'cours_id' => $cours->id,
                            'cours_date' => $coursDate,
                            'punch_date_server' => $punchDateTime->format('Y-m-d'),
                            'punch_date_client' => $punchDateTimeClient->format('Y-m-d'),
                            'punch_time' => $punchTime
                        ]);
                        // Ne pas utiliser ce pointage si la date ne correspond pas
                        $punchTime = null;
                        $device = null;
                    } else {
                        // Formater correctement (heure côté client)
                        $punchTime = $punchDateTimeClient->format('Y-m-d H:i:s');
                    }
                } catch (\Exception $e) {
                    Log::error('StudentTrackingService: Failed to parse punch time for cours', [
                        'punch_time' => $punchTime,
                        'error' => $e->getMessage()
                    ]);
                    $punchTime = null;
                    $device = null;
                }
            }
            
            // Determine status based on punch time and cours tolerance
            $status = 'present';
            
            if ($punchTime) {
                try {
                    $punchDateTime = Carbon::parse($punchTime);
                    $coursStartDateTime = Carbon::parse($cours->date . ' ' . $cours->heure_debut);
                    $toleranceMinutes = $this->parseTolerance($cours->tolerance);
                    $limitDateTime = $coursStartDateTime->copy()->addMinutes($toleranceMinutes);
                    
                    if ($punchDateTime->gt($limitDateTime)) {
                        $status = 'late';
                    }
                } catch (\Exception $e) {
                    // If parsing fails, keep status as present
                }
            }

            return [
                'status' => $status,
                'punch_time' => $punchTime,
                'device' => $device
            ];

        } catch (\Exception $e) {
            Log::error('Error getting punch data for cours', [
                'student_id' => $student->id,
                'cours_id' => $cours->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Get punch data for bi-check cours (requires BOTH entry AND exit punches)
     */
    private function getPunchDataForCoursBiCheck($student, $cours, $config, $coursDate, $allowedDeviceIds, $allowedDeviceNames, $deviceIdsForQuery, $deviceNamesForQuery, $hasSalles)
    {
        try {
            // Récupérer les paramètres du cours
            $toleranceMinutes = $this->parseTolerance($cours->tolerance);
            $exitCaptureWindow = $cours->exit_capture_window ?? 0;
            
            // Formatage des heures
            $heureDebut = $this->formatTime($cours->heure_debut);
            $heureFin = $this->formatTime($cours->heure_fin);
            $heurePointage = $this->formatTime($cours->pointage_start_hour ?? $cours->heure_debut);
            
            // Calculer les fenêtres
            $heureDebutCours = Carbon::parse($coursDate . ' ' . $heureDebut);
            $heureFinCours = Carbon::parse($coursDate . ' ' . $heureFin);
            $heureDebutPointage = Carbon::parse($coursDate . ' ' . $heurePointage);
            $heureLimiteEntree = $heureDebutCours->copy()->addMinutes($toleranceMinutes);
            $heureLimiteSortie = $heureFinCours->copy()->addMinutes($exitCaptureWindow);
            
            // Offset Biostar (serveur décalé de -60 min)
            $biostarOffsetMinutes = 60;
            
            // Requête Biostar pour toute la plage du cours (pointage_start -> heure_fin + exit_window)
            $queryStartTime = $heureDebutPointage->format('H:i:s');
            $queryEndTime = $heureLimiteSortie->format('H:i:s');
            
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $config,
                $coursDate,
                $queryStartTime,
                $queryEndTime,
                [$student->matricule],
                $deviceIdsForQuery,
                $deviceNamesForQuery
            );
            
            $punches = $attendanceData['punches'] ?? [];
            
            Log::info('StudentTrackingService: Bi-check query for cours', [
                'cours_id' => $cours->id,
                'student_matricule' => $student->matricule,
                'date' => $coursDate,
                'fenetre_entree' => [
                    'debut' => $heureDebutPointage->format('Y-m-d H:i:s'),
                    'fin' => $heureLimiteEntree->format('Y-m-d H:i:s')
                ],
                'fenetre_sortie' => [
                    'debut' => $heureFinCours->format('Y-m-d H:i:s'),
                    'fin' => $heureLimiteSortie->format('Y-m-d H:i:s')
                ],
                'punches_count' => count($punches)
            ]);
            
            if (empty($punches)) {
                return null; // Aucun pointage = absent
            }
            
            // Filtrer les punches de l'étudiant et normaliser les timestamps
            $studentPunches = $this->filterStudentPunches($punches, $student->matricule, $allowedDeviceIds, $allowedDeviceNames, $hasSalles);
            
            if (empty($studentPunches)) {
                return null;
            }
            
            // Convertir les punches avec timestamps corrigés (offset Biostar)
            $punchesWithTs = [];
            foreach ($studentPunches as $punch) {
                $punchTime = $punch['devdt'] ?? $punch['punch_time'] ?? null;
                if ($punchTime) {
                    try {
                        $punchTimeClean = $this->cleanSqlServerDateTime($punchTime);
                        $punchDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $punchTimeClean);
                        // Ajouter l'offset pour obtenir l'heure locale
                        $punchDateTimeClient = $punchDateTime->copy()->addMinutes($biostarOffsetMinutes);
                        
                        // Vérifier que c'est la même date
                        if ($punchDateTimeClient->format('Y-m-d') === $coursDate) {
                            $punchesWithTs[] = [
                                'punch' => $punch,
                                'timestamp' => $punchDateTimeClient->timestamp,
                                'datetime' => $punchDateTimeClient
                            ];
                        }
                    } catch (\Exception $e) {
                        // Ignorer les punches avec dates invalides
                    }
                }
            }
            
            if (empty($punchesWithTs)) {
                return null;
            }
            
            // Trier par timestamp
            usort($punchesWithTs, function($a, $b) {
                return $a['timestamp'] <=> $b['timestamp'];
            });
            
            // Chercher le PREMIER punch dans la fenêtre d'entrée
            $punchIn = null;
            $punchInTime = null;
            foreach ($punchesWithTs as $p) {
                if ($p['datetime']->gte($heureDebutPointage) && $p['datetime']->lte($heureLimiteEntree)) {
                    $punchIn = $p['punch'];
                    $punchInTime = $p['datetime'];
                    break;
                }
            }
            
            // Chercher le DERNIER punch dans la fenêtre de sortie
            $punchOut = null;
            $punchOutTime = null;
            foreach (array_reverse($punchesWithTs) as $p) {
                if ($p['datetime']->gte($heureFinCours) && $p['datetime']->lte($heureLimiteSortie)) {
                    $punchOut = $p['punch'];
                    $punchOutTime = $p['datetime'];
                    break;
                }
            }
            
            Log::info('StudentTrackingService: Bi-check punches analysis', [
                'cours_id' => $cours->id,
                'student_matricule' => $student->matricule,
                'total_punches' => count($punchesWithTs),
                'punch_in_found' => $punchIn !== null,
                'punch_in_time' => $punchInTime ? $punchInTime->format('Y-m-d H:i:s') : null,
                'punch_out_found' => $punchOut !== null,
                'punch_out_time' => $punchOutTime ? $punchOutTime->format('Y-m-d H:i:s') : null
            ]);
            
            // Déterminer le statut
            if ($punchIn && $punchOut) {
                // Les deux pointages sont présents → présent ou retard
                $status = $punchInTime->lte($heureDebutCours) ? 'present' : 'late';
                return [
                    'status' => $status,
                    'punch_time' => $punchOutTime->format('Y-m-d H:i:s'),
                    'device' => $punchOut['devnm'] ?? $punchOut['device_name'] ?? null,
                    'punch_in' => $punchInTime->format('Y-m-d H:i:s'),
                    'punch_out' => $punchOutTime->format('Y-m-d H:i:s')
                ];
            } elseif ($punchIn && !$punchOut) {
                // Entrée mais pas de sortie → pending_exit (ABSENT pour le tracking)
                return [
                    'status' => 'pending_exit',
                    'punch_time' => $punchInTime->format('Y-m-d H:i:s'),
                    'device' => $punchIn['devnm'] ?? $punchIn['device_name'] ?? null,
                    'punch_in' => $punchInTime->format('Y-m-d H:i:s'),
                    'punch_out' => null
                ];
            } elseif (!$punchIn && !empty($punchesWithTs)) {
                // Punches détectés mais hors fenêtre d'entrée → pending_entry (ABSENT)
                return [
                    'status' => 'pending_entry',
                    'punch_time' => null,
                    'device' => null,
                    'punch_in' => null,
                    'punch_out' => null
                ];
            }
            
            return null; // Aucun pointage valide
            
        } catch (\Exception $e) {
            Log::error('Error getting bi-check punch data for cours', [
                'student_id' => $student->id,
                'cours_id' => $cours->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }
    
    /**
     * Filter punches for a specific student with device validation
     */
    private function filterStudentPunches($punches, $matricule, $allowedDeviceIds, $allowedDeviceNames, $hasSalles)
    {
        $filtered = [];
        
        // Normalize device names for comparison
        $normalizedDeviceNames = [];
        if (!empty($allowedDeviceNames)) {
            $normalizedDeviceNames = array_map(function($name) {
                return strtolower(trim((string)$name));
            }, $allowedDeviceNames);
        }
        
        $normalizedDeviceIds = [];
        if (!empty($allowedDeviceIds)) {
            $normalizedDeviceIds = array_map(function($id) {
                return (string)$id;
            }, $allowedDeviceIds);
        }
        
        foreach ($punches as $punch) {
            $punchMatricule = $punch['user_id'] ?? $punch['bsevtc'] ?? null;
            
            if (!$punchMatricule) {
                continue;
            }
            
            // Check matricule match
            $matches = false;
            if ($punchMatricule == $matricule) {
                $matches = true;
            } else {
                $trimmedMatricule = ltrim($matricule, '0');
                $trimmedPunch = ltrim($punchMatricule, '0');
                if ($trimmedMatricule && $trimmedMatricule == $trimmedPunch) {
                    $matches = true;
                } else {
                    $paddedMatricule = str_pad($matricule, 6, '0', STR_PAD_LEFT);
                    if ($punchMatricule == $paddedMatricule) {
                        $matches = true;
                    }
                }
            }
            
            if (!$matches) {
                continue;
            }
            
            // Check device if filtering is required
            if ($hasSalles && (!empty($normalizedDeviceIds) || !empty($normalizedDeviceNames))) {
                $punchDevId = isset($punch['devid']) ? (string)$punch['devid'] : null;
                $punchDevName = isset($punch['devnm']) ? strtolower(trim((string)$punch['devnm'])) : null;
                
                $deviceMatches = false;
                
                if (empty($normalizedDeviceIds) && empty($normalizedDeviceNames)) {
                    $deviceMatches = false; // Salle sans devices = rejeter
                } else {
                    if (!empty($normalizedDeviceIds) && $punchDevId && in_array($punchDevId, $normalizedDeviceIds, true)) {
                        $deviceMatches = true;
                    }
                    if (!$deviceMatches && !empty($normalizedDeviceNames) && $punchDevName && in_array($punchDevName, $normalizedDeviceNames, true)) {
                        $deviceMatches = true;
                    }
                }
                
                if (!$deviceMatches) {
                    continue;
                }
            }
            
            $filtered[] = $punch;
        }
        
        return $filtered;
    }

    /**
     * Get punch data from Biostar for an examen
     */
    private function getPunchDataForExamen($student, $examen)
    {
        try {
            // Get configuration for examen ville
            $config = $this->configurationService->getConnectionConfigForExamen($examen->id);
            
            if (!is_array($config) || !isset($config['dsn'])) {
                return null;
            }

            // Get allowed devices from salle
            $allowedDeviceIds = [];
            $allowedDeviceNames = [];
            
            if ($examen->salle && is_array($examen->salle->devices)) {
                foreach ($examen->salle->devices as $d) {
                    if (is_array($d)) {
                        if (isset($d['devid'])) {
                            $allowedDeviceIds[] = (string)$d['devid'];
                        }
                        if (isset($d['devnm'])) {
                            // Normaliser immédiatement pour comparaison cohérente avec Biostar
                            $allowedDeviceNames[] = strtolower(trim((string)$d['devnm']));
                        }
                    }
                }
            }

            // Normaliser et dédupliquer les devices
            $allowedDeviceIds = !empty($allowedDeviceIds) ? array_values(array_unique(array_filter($allowedDeviceIds))) : [];
            $allowedDeviceNames = !empty($allowedDeviceNames) ? array_values(array_unique(array_filter($allowedDeviceNames))) : [];

            // Vérifier si l'examen a une salle
            $hasSalle = $examen->salle_id && $examen->salle;

            // Déterminer les devices à passer à la requête Biostar
            if ($hasSalle && empty($allowedDeviceIds) && empty($allowedDeviceNames)) {
                // Si salle existe mais aucun device assigné : rejeter tous les pointages
                Log::warning('StudentTrackingService: Examen a une salle mais aucun device assigné', [
                    'examen_id' => $examen->id,
                    'salle_id' => $examen->salle_id
                ]);
                $deviceIdsForQuery = [];
                $deviceNamesForQuery = [];
            } elseif ($hasSalle && (!empty($allowedDeviceIds) || !empty($allowedDeviceNames))) {
                // Si salle existe avec devices : filtrage strict
                $deviceIdsForQuery = $allowedDeviceIds;
                $deviceNamesForQuery = $allowedDeviceNames;
            } else {
                // Pas de salle : accepter tous les pointages (pas de filtrage)
                $deviceIdsForQuery = null;
                $deviceNamesForQuery = null;
            }

            // Format date for Biostar query
            $examenDate = $examen->date instanceof \Carbon\Carbon 
                ? $examen->date->format('Y-m-d')
                : (is_string($examen->date) ? date('Y-m-d', strtotime($examen->date)) : $examen->date);
            
            // Format start time
            $startTime = $examen->heure_debut_poigntage ?? $examen->heure_debut;
            if (is_string($startTime) && !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $startTime)) {
                // Try to parse if it's a datetime string
                try {
                    $dt = new \DateTime($startTime);
                    $startTime = $dt->format('H:i:s');
                } catch (\Exception $e) {
                    // Keep original
                }
            }
            
            // Format end time - Le pointage doit être fait entre heure_debut_pointage et heure_debut + tolerance
            $endTime = $examen->heure_debut;
            if (is_string($endTime) && !preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $endTime)) {
                // Try to parse if it's a datetime string
                try {
                    $dt = new \DateTime($endTime);
                    $endTime = $dt->format('H:i:s');
                } catch (\Exception $e) {
                    // Keep original
                }
            }

            // Ajouter la tolérance à l'heure de fin pour accepter les pointages jusqu'à heure_debut + tolerance
            $toleranceMinutes = $examen->tolerance ?? 15; // Tolérance par défaut de 15 minutes pour les examens
            if (is_numeric($toleranceMinutes)) {
                $toleranceMinutes = (int)$toleranceMinutes;
            } else {
                $toleranceMinutes = $this->parseTolerance($toleranceMinutes);
            }
            
            if ($toleranceMinutes > 0) {
                try {
                    $endTimeObj = Carbon::parse($examenDate . ' ' . $endTime);
                    $endTimeObj->addMinutes($toleranceMinutes);
                    $endTime = $endTimeObj->format('H:i:s');
                } catch (\Exception $e) {
                    // Si erreur, garder l'heure de fin originale
                    Log::warning('StudentTrackingService: Failed to add tolerance to endTime for examen', [
                        'end_time' => $endTime,
                        'tolerance' => $toleranceMinutes,
                        'error' => $e->getMessage()
                    ]);
                }
            }

            // Get attendance data
            $attendanceData = $this->biostarAttendanceService->getAttendanceData(
                $config,
                $examenDate,
                $startTime,
                $endTime,
                [$student->matricule],
                $deviceIdsForQuery,
                $deviceNamesForQuery
            );
            
            Log::info('StudentTrackingService: Biostar query for examen', [
                'examen_id' => $examen->id,
                'student_matricule' => $student->matricule,
                'date' => $examenDate,
                'start_time' => $startTime,
                'end_time' => $endTime,
                'punches_count' => count($attendanceData['punches'] ?? []),
                'has_config' => !empty($config['dsn'])
            ]);

            // Find student's punch in time window (strict: between heure_debut and heure_fin, with correct device)
            $studentPunch = $this->findStudentPunchInTimeWindow(
                $attendanceData['punches'] ?? [], 
                $student->matricule,
                $examenDate,
                $startTime,
                $endTime,
                $allowedDeviceIds,
                $allowedDeviceNames
            );

            if (!$studentPunch) {
                Log::info('StudentTrackingService: No punch found for student in examen', [
                    'student_matricule' => $student->matricule,
                    'examen_id' => $examen->id,
                    'date' => $examenDate,
                    'start_time' => $startTime,
                    'end_time' => $endTime,
                    'punches_received' => count($attendanceData['punches'] ?? []),
                    'sample_punches' => array_slice($attendanceData['punches'] ?? [], 0, 3),
                    'allowed_devices' => [
                        'ids' => $deviceIdsForQuery,
                        'names' => $deviceNamesForQuery
                    ],
                    'has_salle' => $hasSalle
                ]);
                return null;
            }

            // Log quand un pointage est trouvé avec toutes les valeurs brutes
            Log::info('StudentTrackingService: Punch found for examen', [
                'examen_id' => $examen->id,
                'student_matricule' => $student->matricule,
                'punch_raw' => $studentPunch,
                'devdt' => $studentPunch['devdt'] ?? 'NOT_FOUND',
                'devnm' => $studentPunch['devnm'] ?? 'NOT_FOUND',
                'punch_time' => $studentPunch['punch_time'] ?? 'NOT_FOUND',
                'device_name' => $studentPunch['device_name'] ?? 'NOT_FOUND'
            ]);

            // Get punch time and device - PRIORITÉ aux colonnes brutes de punchlog (devdt et devnm)
            $punchTime = $studentPunch['devdt'] ?? $studentPunch['punch_time'] ?? $studentPunch['bsevtdt'] ?? null;
            $device = $studentPunch['devnm'] ?? $studentPunch['device_name'] ?? null;
            
            // Format punch time if it exists and verify it matches the examen date
            if ($punchTime) {
                try {
                    // Nettoyer le format SQL Server (enlever les microsecondes si présentes)
                    $punchTimeClean = $this->cleanSqlServerDateTime($punchTime);
                    
                    // Utiliser createFromFormat() au lieu de parse() pour forcer le format exact
                    // Cela évite que Carbon interprète mal la date (ex: 2026 au lieu de 2025)
                    try {
                        $punchDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $punchTimeClean);
                    } catch (\Exception $e) {
                        // Si createFromFormat échoue, essayer avec parse() en fallback
                        Log::warning('StudentTrackingService: createFromFormat failed, trying parse()', [
                            'punch_time_clean' => $punchTimeClean,
                            'error' => $e->getMessage()
                        ]);
                        $punchDateTime = Carbon::parse($punchTimeClean);
                    }
                    
                    // IMPORTANT: Convertir l'heure côté serveur Biostar en heure côté client (+60 minutes)
                    $offsetMinutes = 60;
                    $punchDateTimeClient = $punchDateTime->copy()->addMinutes($offsetMinutes);
                    $examenDateObj = Carbon::parse($examenDate);
                    
                    // Vérifier que c'est la même date (côté client)
                    if ($punchDateTimeClient->format('Y-m-d') !== $examenDateObj->format('Y-m-d')) {
                        Log::warning('StudentTrackingService: Punch date mismatch for examen', [
                            'examen_id' => $examen->id,
                            'examen_date' => $examenDate,
                            'punch_date_server' => $punchDateTime->format('Y-m-d'),
                            'punch_date_client' => $punchDateTimeClient->format('Y-m-d'),
                            'punch_time' => $punchTime
                        ]);
                        // Ne pas utiliser ce pointage si la date ne correspond pas
                        $punchTime = null;
                        $device = null;
                    } else {
                        // Formater correctement (heure côté client)
                        $punchTime = $punchDateTimeClient->format('Y-m-d H:i:s');
                    }
                } catch (\Exception $e) {
                    Log::error('StudentTrackingService: Failed to parse punch time for examen', [
                        'punch_time' => $punchTime,
                        'error' => $e->getMessage()
                    ]);
                    $punchTime = null;
                    $device = null;
                }
            }
            
            // Determine status based on punch time and examen tolerance
            $status = 'present';
            
            if ($punchTime) {
                try {
                    $punchDateTime = Carbon::parse($punchTime);
                    $examenStartDateTime = Carbon::parse($examen->date . ' ' . $examen->heure_debut);
                    $toleranceMinutes = $examen->tolerance ?? 15;
                    $limitDateTime = $examenStartDateTime->copy()->addMinutes($toleranceMinutes);
                    
                    if ($punchDateTime->gt($limitDateTime)) {
                        $status = 'late';
                    }
                } catch (\Exception $e) {
                    // If parsing fails, keep status as present
                }
            }

            return [
                'status' => $status,
                'punch_time' => $punchTime,
                'device' => $device
            ];

        } catch (\Exception $e) {
            Log::error('Error getting punch data for examen', [
                'student_id' => $student->id,
                'examen_id' => $examen->id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Parse tolerance time string to minutes
     */
    private function parseTolerance($tolerance)
    {
        if (is_numeric($tolerance)) {
            return (int)$tolerance;
        }
        
        if (is_string($tolerance)) {
            // Try to parse as time (HH:MM:SS or HH:MM)
            $parts = explode(':', $tolerance);
            if (count($parts) >= 2) {
                return (int)$parts[0] * 60 + (int)$parts[1];
            }
        }
        
        return 15; // Default 15 minutes
    }

    /**
     * Check if status matches filter
     */
    private function matchesStatusFilter($status, $filter)
    {
        if ($filter === 'all') {
            return true;
        }
        
        if ($filter === 'present' && in_array($status, ['present', 'late'])) {
            return true;
        }
        
        // Pour bi-check: pending_exit et pending_entry sont considérés comme absents
        if ($filter === 'absent' && in_array($status, ['absent', 'left_early', 'pending_exit', 'pending_entry'])) {
            return true;
        }
        
        return false;
    }

    /**
     * Clean SQL Server datetime format (remove microseconds)
     * Handles formats like "2025-11-26 14:48:05.0000000" or "2025-11-26 14:48:05"
     */
    private function cleanSqlServerDateTime($dateTime)
    {
        if (empty($dateTime)) {
            return $dateTime;
        }
        
        // Si le format contient des microsecondes (format SQL Server datetime2)
        if (preg_match('/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\.\d+$/', $dateTime, $matches)) {
            return $matches[1]; // Retourner sans les microsecondes
        }
        
        // Si c'est déjà au bon format, retourner tel quel
        return $dateTime;
    }

    /**
     * Format time to H:i:s string
     */
    private function formatTime($time)
    {
        if (empty($time)) {
            return null;
        }
        
        // If it's already a string in H:i:s format, return it
        if (is_string($time) && preg_match('/^\d{2}:\d{2}(:\d{2})?$/', $time)) {
            // Ensure it's in H:i:s format
            $parts = explode(':', $time);
            if (count($parts) == 2) {
                return $time . ':00';
            }
            return $time;
        }
        
        // If it's a Carbon instance or DateTime
        if ($time instanceof \Carbon\Carbon || $time instanceof \DateTime) {
            return $time->format('H:i:s');
        }
        
        // If it's a timestamp string, try to parse it
        if (is_string($time)) {
            try {
                $dateTime = new \DateTime($time);
                return $dateTime->format('H:i:s');
            } catch (\Exception $e) {
                // If parsing fails, try to extract time from ISO format
                if (preg_match('/(\d{2}):(\d{2}):?(\d{2})?/', $time, $matches)) {
                    $hour = $matches[1];
                    $minute = $matches[2];
                    $second = isset($matches[3]) ? $matches[3] : '00';
                    return "$hour:$minute:$second";
                }
            }
        }
        
        return $time;
    }

    /**
     * Find student punch in punches array (simple match)
     */
    private function findStudentPunch($punches, $matricule)
    {
        if (empty($punches)) {
            return null;
        }
        
        foreach ($punches as $punch) {
            $punchMatricule = $punch['user_id'] ?? $punch['bsevtc'] ?? null;
            
            if (!$punchMatricule) {
                continue;
            }
            
            // Try exact match
            if ($punchMatricule == $matricule) {
                return $punch;
            }
            
            // Try trimmed match (remove leading zeros)
            $trimmedMatricule = ltrim($matricule, '0');
            $trimmedPunch = ltrim($punchMatricule, '0');
            if ($trimmedMatricule && $trimmedMatricule == $trimmedPunch) {
                return $punch;
            }
            
            // Try padded match (add leading zeros)
            $paddedMatricule = str_pad($matricule, 6, '0', STR_PAD_LEFT);
            if ($punchMatricule == $paddedMatricule) {
                return $punch;
            }
        }
        
        return null;
    }

    /**
     * Find student punch in time window (strict: between startTime and endTime, with correct device)
     */
    private function findStudentPunchInTimeWindow($punches, $matricule, $date, $startTime, $endTime, $allowedDeviceIds = null, $allowedDeviceNames = null)
    {
        if (empty($punches)) {
            return null;
        }

        // Parse start and end times
        $startDateTime = null;
        $endDateTime = null;
        try {
            $startTimeStr = is_string($startTime) ? $startTime : (is_object($startTime) ? $startTime->format('H:i:s') : '00:00:00');
            $endTimeStr = is_string($endTime) ? $endTime : (is_object($endTime) ? $endTime->format('H:i:s') : '23:59:59');
            $startDateTime = Carbon::parse($date . ' ' . $startTimeStr);
            $endDateTime = Carbon::parse($date . ' ' . $endTimeStr);
        } catch (\Exception $e) {
            Log::error('StudentTrackingService: Failed to parse time window', [
                'start_time' => $startTime,
                'end_time' => $endTime,
                'error' => $e->getMessage()
            ]);
            return null;
        }

        // Normalize device names for comparison (case-insensitive)
        // Les devices sont déjà normalisés lors de la collecte, mais on re-normalise pour être sûr
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
        }

        $matchingPunches = [];
        
        foreach ($punches as $punch) {
            $punchMatricule = $punch['user_id'] ?? $punch['bsevtc'] ?? null;
            
            if (!$punchMatricule) {
                continue;
            }
            
            // Check if matricule matches
            $matches = false;
            if ($punchMatricule == $matricule) {
                $matches = true;
            } else {
                $trimmedMatricule = ltrim($matricule, '0');
                $trimmedPunch = ltrim($punchMatricule, '0');
                if ($trimmedMatricule && $trimmedMatricule == $trimmedPunch) {
                    $matches = true;
                } else {
                    $paddedMatricule = str_pad($matricule, 6, '0', STR_PAD_LEFT);
                    if ($punchMatricule == $paddedMatricule) {
                        $matches = true;
                    }
                }
            }
            
            if (!$matches) {
                continue;
            }
            
            // Check device if device filtering is required
            if ($allowedDeviceIds !== null || $allowedDeviceNames !== null) {
                $punchDevId = isset($punch['devid']) ? (string)$punch['devid'] : null;
                $punchDevName = isset($punch['devnm']) ? strtolower(trim((string)$punch['devnm'])) : null;
                
                $deviceMatches = false;
                
                // Si les tableaux sont vides (salle sans devices), rejeter tous les pointages
                if (empty($normalizedDeviceIds) && empty($normalizedDeviceNames)) {
                    $deviceMatches = false; // Rejeter car la salle n'a pas de devices assignés
                } else {
                    // Match by device ID
                    if (!empty($normalizedDeviceIds) && $punchDevId && in_array($punchDevId, $normalizedDeviceIds, true)) {
                        $deviceMatches = true;
                    }
                    
                    // Match by device name (case-insensitive)
                    if (!$deviceMatches && !empty($normalizedDeviceNames) && $punchDevName && in_array($punchDevName, $normalizedDeviceNames, true)) {
                        $deviceMatches = true;
                    }
                }
                
                if (!$deviceMatches) {
                    // Device doesn't match - skip this punch (l'étudiant a pointé ailleurs)
                    continue;
                }
            }
            
            // Check if punch time is within the time window
            $punchTime = $punch['devdt'] ?? $punch['punch_time'] ?? $punch['bsevtdt'] ?? null;
            if ($punchTime) {
                try {
                    // Nettoyer le format SQL Server (enlever les microsecondes si présentes)
                    $punchTimeClean = $this->cleanSqlServerDateTime($punchTime);
                    
                    // Utiliser createFromFormat() au lieu de parse() pour forcer le format exact
                    // Cela évite que Carbon interprète mal la date (ex: 2026 au lieu de 2025)
                    try {
                        $punchDateTime = Carbon::createFromFormat('Y-m-d H:i:s', $punchTimeClean);
                    } catch (\Exception $e) {
                        // Si createFromFormat échoue, essayer avec parse() en fallback
                        Log::warning('StudentTrackingService: createFromFormat failed in findStudentPunchInTimeWindow, trying parse()', [
                            'punch_time_clean' => $punchTimeClean,
                            'error' => $e->getMessage()
                        ]);
                        $punchDateTime = Carbon::parse($punchTimeClean);
                    }
                    
                    // IMPORTANT: Les heures dans Biostar sont enregistrées côté serveur (avec offset -60 min)
                    // Il faut les convertir en heures côté client pour comparer avec la fenêtre
                    $offsetMinutes = 60; // Offset inverse pour convertir serveur → client
                    $punchDateTimeClient = $punchDateTime->copy()->addMinutes($offsetMinutes);
                    
                    // Verify it's the same date (comparer les dates côté client)
                    if ($punchDateTimeClient->format('Y-m-d') !== $startDateTime->format('Y-m-d')) {
                        continue;
                    }
                    
                    // Verify punch is between startTime and endTime (inclusive) - comparer côté client
                    if ($punchDateTimeClient->gte($startDateTime) && $punchDateTimeClient->lte($endDateTime)) {
                        $matchingPunches[] = [
                            'punch' => $punch,
                            'time' => $punchDateTimeClient // Utiliser l'heure côté client
                        ];
                    }
                } catch (\Exception $e) {
                    Log::warning('StudentTrackingService: Invalid punch date in time window', [
                        'punch_time' => $punchTime,
                        'error' => $e->getMessage()
                    ]);
                }
            }
        }
        
        if (empty($matchingPunches)) {
            return null;
        }
        
        // Si plusieurs pointages, prendre le plus récent (le dernier dans la fenêtre)
        // Trier par heure décroissante pour avoir le plus récent en premier
        usort($matchingPunches, function($a, $b) {
            return $b['time']->timestamp <=> $a['time']->timestamp; // Tri décroissant (plus récent en premier)
        });
        
        // Retourner le pointage le plus récent
        return $matchingPunches[0]['punch'];
    }

    /**
     * Find the punch closest to cours/examen start time from all punches of the day
     */
    private function findClosestPunchToCoursTime($punches, $matricule, $date, $startTime)
    {
        if (empty($punches)) {
            return null;
        }

        // Parse start time
        $startDateTime = null;
        try {
            $timeStr = is_string($startTime) ? $startTime : (is_object($startTime) ? $startTime->format('H:i:s') : '00:00:00');
            $startDateTime = Carbon::parse($date . ' ' . $timeStr);
        } catch (\Exception $e) {
            return null;
        }

        $matchingPunches = [];
        
        foreach ($punches as $punch) {
            $punchMatricule = $punch['user_id'] ?? $punch['bsevtc'] ?? null;
            
            if (!$punchMatricule) {
                continue;
            }
            
            // Check if matricule matches
            $matches = false;
            if ($punchMatricule == $matricule) {
                $matches = true;
            } else {
                $trimmedMatricule = ltrim($matricule, '0');
                $trimmedPunch = ltrim($punchMatricule, '0');
                if ($trimmedMatricule && $trimmedMatricule == $trimmedPunch) {
                    $matches = true;
                } else {
                    $paddedMatricule = str_pad($matricule, 6, '0', STR_PAD_LEFT);
                    if ($punchMatricule == $paddedMatricule) {
                        $matches = true;
                    }
                }
            }
            
            if ($matches) {
                // Utiliser devdt directement (colonne brute de punchlog)
                $punchTime = $punch['devdt'] ?? $punch['punch_time'] ?? $punch['bsevtdt'] ?? null;
                if ($punchTime) {
                    try {
                        $punchDateTime = Carbon::parse($punchTime);
                        // Vérifier que c'est exactement la même date
                        if ($punchDateTime->format('Y-m-d') == $startDateTime->format('Y-m-d')) {
                            // Calculer la différence en minutes
                            $diffMinutes = abs($punchDateTime->diffInMinutes($startDateTime));
                            // Fenêtre de 4 heures (240 minutes) avant ou après
                            if ($diffMinutes <= 240) {
                                $matchingPunches[] = [
                                    'punch' => $punch,
                                    'time' => $punchDateTime,
                                    'diff' => $diffMinutes
                                ];
                            }
                        }
                    } catch (\Exception $e) {
                        // Skip invalid dates
                        Log::warning('StudentTrackingService: Invalid punch date in closest search', [
                            'punch_time' => $punchTime,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }
        }
        
        if (empty($matchingPunches)) {
            return null;
        }
        
        // Sort by time difference and return the closest one
        usort($matchingPunches, function($a, $b) {
            return $a['diff'] <=> $b['diff'];
        });
        
        return $matchingPunches[0]['punch'];
    }

    /**
     * Calculate summary statistics
     */
    private function calculateSummary($results)
    {
        $total = count($results);
        $presents = 0;
        $absents = 0;
        $lates = 0;
        $pendingExit = 0;
        $pendingEntry = 0;

        foreach ($results as $result) {
            if (in_array($result['status'], ['present'])) {
                $presents++;
            } elseif (in_array($result['status'], ['absent'])) {
                $absents++;
            } elseif (in_array($result['status'], ['late'])) {
                $lates++;
                $presents++; // Late is still considered present
            } elseif ($result['status'] === 'pending_exit') {
                // Bi-check: entrée sans sortie = absent
                $pendingExit++;
                $absents++;
            } elseif ($result['status'] === 'pending_entry') {
                // Bi-check: pointage hors fenêtre d'entrée = absent
                $pendingEntry++;
                $absents++;
            }
        }

        return [
            'total' => $total,
            'presents' => $presents,
            'absents' => $absents,
            'lates' => $lates,
            'pending_exit' => $pendingExit,
            'pending_entry' => $pendingEntry
        ];
    }
}

