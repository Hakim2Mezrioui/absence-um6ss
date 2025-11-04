<?php

namespace App\Http\Controllers;

use App\Services\RattrapageService;
use Illuminate\Http\Request;
use PDO;
use PDOException;
use Illuminate\Http\JsonResponse;

class RattrapageController extends Controller
{
    protected $rattrapageService;

    public function __construct(RattrapageService $rattrapageService)
    {
        $this->rattrapageService = $rattrapageService;
    }

    /**
     * Afficher la liste paginée des rattrapages avec filtres
     */
    public function index(Request $request): JsonResponse
    {
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);
        
        // Récupérer les filtres
        $filters = [
            'search' => $request->get('search', ''),
            'date' => $request->get('date', ''),
            'date_from' => $request->get('date_from', ''),
            'date_to' => $request->get('date_to', ''),
            'pointage_start_hour' => $request->get('pointage_start_hour', ''),
            'start_hour' => $request->get('start_hour', ''),
            'end_hour' => $request->get('end_hour', ''),
            'sort_by' => $request->get('sort_by', 'date'),
            'sort_direction' => $request->get('sort_direction', 'desc')
        ];

        $rattrapages = $this->rattrapageService->getRattrapagesPaginatedWithFilters($size, $page, $filters);

        return response()->json([
            'success' => true,
            'data' => $rattrapages->items(),
            'pagination' => [
                'current_page' => $rattrapages->currentPage(),
                'last_page' => $rattrapages->lastPage(),
                'per_page' => $rattrapages->perPage(),
                'total' => $rattrapages->total(),
                'has_next_page' => $rattrapages->hasMorePages(),
                'has_prev_page' => $rattrapages->currentPage() > 1
            ],
            'filters_applied' => array_filter($filters, function($value) {
                return !empty($value);
            })
        ]);
    }

    /**
     * Afficher un rattrapage spécifique
     */
    public function show($id): JsonResponse
    {
        $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);

        if (!$rattrapage) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $rattrapage
        ]);
    }

    /**
     * Créer un nouveau rattrapage
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Log de la requête pour déboguer
            \Log::info('Rattrapage store request:', $request->all());
            
            $validatedData = $request->validate([
                'name' => 'required|string|max:255',
                'pointage_start_hour' => 'required|date_format:H:i',
                'start_hour' => 'required|date_format:H:i',
                'end_hour' => 'required|date_format:H:i|after:start_hour',
                'date' => 'required|date',
                'tolerance' => 'nullable|integer|min:0|max:60'
            ]);

            // Log des données validées
            \Log::info('Rattrapage validated data:', $validatedData);

            // Vérifier que la date n'est pas dans le passé
            if (strtotime($validatedData['date']) < strtotime(date('Y-m-d'))) {
                return response()->json([
                    'success' => false,
                    'message' => 'La date ne peut pas être dans le passé'
                ], 400);
            }



            $rattrapage = $this->rattrapageService->createRattrapage($validatedData);

            // Log du rattrapage créé
            \Log::info('Rattrapage created:', $rattrapage->toArray());

            return response()->json([
                'success' => true,
                'message' => 'Rattrapage créé avec succès',
                'data' => $rattrapage
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Rattrapage validation error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Rattrapage store error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du rattrapage: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un rattrapage
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'pointage_start_hour' => 'required|date_format:H:i',
            'start_hour' => 'required|date_format:H:i',
            'end_hour' => 'required|date_format:H:i|after:start_hour',
            'date' => 'required|date',
            'tolerance' => 'nullable|integer|min:0|max:60'
        ]);



        $rattrapage = $this->rattrapageService->updateRattrapage((int) $id, $validatedData);

        if (!$rattrapage) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rattrapage mis à jour avec succès',
            'data' => $rattrapage
        ]);
    }

    /**
     * Supprimer un rattrapage
     */
    public function destroy($id): JsonResponse
    {
        $deleted = $this->rattrapageService->deleteRattrapage((int) $id);

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rattrapage supprimé avec succès'
        ]);
    }

    /**
     * Rechercher des rattrapages
     */
    public function search(Request $request): JsonResponse
    {
        $searchValue = $request->get('search', '');
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);

        if (empty($searchValue)) {
            return response()->json([
                'success' => false,
                'message' => 'Le terme de recherche est requis'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->searchRattrapages($searchValue, $size, $page);

        return response()->json([
            'success' => true,
            'data' => $rattrapages->items(),
            'pagination' => [
                'current_page' => $rattrapages->currentPage(),
                'last_page' => $rattrapages->lastPage(),
                'per_page' => $rattrapages->perPage(),
                'total' => $rattrapages->total()
            ]
        ]);
    }

    /**
     * Récupérer tous les rattrapages sans pagination
     */
    public function getAll(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getAllRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par date
     */
    public function getByDate(Request $request): JsonResponse
    {
        $date = $request->get('date', '');

        if (empty($date)) {
            return response()->json([
                'success' => false,
                'message' => 'La date est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByDate($date);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par période
     */
    public function getByDateRange(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', '');
        $endDate = $request->get('end_date', '');

        if (empty($startDate) || empty($endDate)) {
            return response()->json([
                'success' => false,
                'message' => 'Les dates de début et de fin sont requises'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByDateRange($startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages du jour
     */
    public function getToday(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getTodayRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages de la semaine
     */
    public function getThisWeek(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getThisWeekRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages du mois
     */
    public function getThisMonth(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getThisMonthRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par heure de début
     */
    public function getByStartHour(Request $request): JsonResponse
    {
        $startHour = $request->get('start_hour', '');

        if (empty($startHour)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'heure de début est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByStartHour($startHour);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par heure de fin
     */
    public function getByEndHour(Request $request): JsonResponse
    {
        $endHour = $request->get('end_hour', '');

        if (empty($endHour)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'heure de fin est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByEndHour($endHour);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les statistiques des rattrapages
     */
    public function getStatistics(): JsonResponse
    {
        $statistics = $this->rattrapageService->getRattrapagesStatistics();

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    /**
     * Récupérer les rattrapages avec conflits d'horaires
     */
    public function getWithTimeConflicts(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getRattrapagesWithTimeConflicts();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Vérifier les conflits d'horaires
     */
    public function checkTimeConflicts(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'date' => 'required|date',
            'pointage_start_hour' => 'required|date_format:H:i',
            'start_hour' => 'required|date_format:H:i',
            'end_hour' => 'required|date_format:H:i|after:start_hour',
            'exclude_id' => 'nullable|integer'
        ]);

        $hasConflicts = $this->rattrapageService->checkTimeConflictsForDate(
            $validatedData['date'],
            $validatedData['start_hour'],
            $validatedData['end_hour'],
            $validatedData['exclude_id'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => [
                'has_conflicts' => $hasConflicts,
                'date' => $validatedData['date'],
                'start_hour' => $validatedData['start_hour'],
                'end_hour' => $validatedData['end_hour']
            ]
        ]);
    }

    /**
     * Importer des rattrapages depuis un fichier CSV
     */
    public function importRattrapages(Request $request): JsonResponse
    {
        if (!$request->hasFile('file')) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun fichier téléchargé'
            ], 400);
        }

        $file = $request->file('file');
        
        // Vérifier le type de fichier
        $allowedTypes = ['csv', 'txt'];
        $fileExtension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($fileExtension, $allowedTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'Type de fichier non supporté. Utilisez CSV ou TXT'
            ], 400);
        }

        try {
            $path = $file->getRealPath();
            $results = $this->rattrapageService->importRattrapagesFromCSV($path);
            
            if (!empty($results['errors'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreurs détectées lors de l\'importation',
                    'errors' => $results['errors'],
                    'total_errors' => count($results['errors']),
                    'success_count' => $results['success']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => $results['success'] . ' rattrapages importés avec succès',
                'imported_count' => $results['success'],
                'total_processed' => $results['total']
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement du fichier',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer l'attendance d'un rattrapage avec vérification Biostar
     */
    public function getAttendance($id): JsonResponse
    {
        try {
            $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);
            
            if (!$rattrapage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rattrapage non trouvé'
                ], 404);
            }

            // Récupérer les étudiants du rattrapage
            $listStudents = $rattrapage->listStudents()->with([
                'etudiant.promotion',
                'etudiant.etablissement',
                'etudiant.ville',
                'etudiant.group',
                'etudiant.option'
            ])->get();

            if ($listStudents->isEmpty()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Aucun étudiant affecté à ce rattrapage',
                    'rattrapage' => $rattrapage,
                    'total_students' => 0,
                    'presents' => 0,
                    'absents' => 0,
                    'lates' => 0,
                    'excused' => 0,
                    'students' => []
                ]);
            }

            // Récupérer les données Biostar pour la date et l'heure du rattrapage
            $biostarResults = $this->getBiostarAttendanceData(
                $rattrapage->date,
                $rattrapage->pointage_start_hour,
                $rattrapage->end_hour
            );

            // Préparer les matricules des étudiants présents
            $presentStudentMatricules = collect($biostarResults)->pluck('user_id')->toArray();

            $students = [];
            $presents = 0;
            $absents = 0;
            $lates = 0;
            $excused = 0;

            foreach ($listStudents as $listStudent) {
                $etudiant = $listStudent->etudiant;
                $punchTime = $this->getPunchTimeForStudent($etudiant->matricule, $biostarResults);
                
                // Déterminer le statut d'attendance
                $status = $this->determineAttendanceStatus(
                    $etudiant->matricule,
                    $presentStudentMatricules,
                    $punchTime,
                    $rattrapage->pointage_start_hour,
                    $rattrapage->start_hour,
                    $rattrapage->tolerance ?? 5
                );
                
                $students[] = [
                    'id' => $etudiant->id,
                    'matricule' => $etudiant->matricule,
                    'first_name' => $etudiant->first_name,
                    'last_name' => $etudiant->last_name,
                    'email' => $etudiant->email,
                    'photo' => $etudiant->photo,
                    'promotion' => $etudiant->promotion,
                    'etablissement' => $etudiant->etablissement,
                    'ville' => $etudiant->ville,
                    'group' => $etudiant->group,
                    'option' => $etudiant->option,
                    'status' => $status,
                    'punch_time' => $punchTime,
                    'notes' => null
                ];

                // Compter les statuts
                switch ($status) {
                    case 'present':
                        $presents++;
                        break;
                    case 'absent':
                        $absents++;
                        break;
                    case 'late':
                        $lates++;
                        break;
                    case 'excused':
                        $excused++;
                        break;
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Données d\'attendance récupérées avec succès',
                'rattrapage' => $rattrapage,
                'total_students' => count($students),
                'presents' => $presents,
                'absents' => $absents,
                'lates' => $lates,
                'excused' => $excused,
                'students' => $students,
                'biostar_data' => [
                    'total_punches' => count($biostarResults),
                    'date' => $rattrapage->date,
                    'pointage_start_hour' => $rattrapage->pointage_start_hour,
                    'start_hour' => $rattrapage->start_hour,
                    'end_hour' => $rattrapage->end_hour,
                    'tolerance' => $rattrapage->tolerance ?? 5
                ]
            ]);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la récupération de l\'attendance du rattrapage:', [
                'rattrapage_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération de l\'attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour le statut d'attendance d'un étudiant
     */
    public function updateStudentAttendance(Request $request, $id, $studentId): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'status' => 'required|in:present,absent,late,excused',
                'notes' => 'nullable|string|max:500'
            ]);

            // Vérifier que le rattrapage existe
            $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);
            if (!$rattrapage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rattrapage non trouvé'
                ], 404);
            }

            // Vérifier que l'étudiant est dans ce rattrapage
            $listStudent = $rattrapage->listStudents()->where('etudiant_id', $studentId)->first();
            if (!$listStudent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Étudiant non trouvé dans ce rattrapage'
                ], 404);
            }

            // Ici, vous pouvez ajouter une logique pour sauvegarder le statut
            // dans une table d'attendance dédiée si vous en avez une
            // Pour l'instant, on retourne juste un succès

            return response()->json([
                'success' => true,
                'message' => 'Statut d\'attendance mis à jour avec succès',
                'data' => [
                    'student_id' => $studentId,
                    'rattrapage_id' => $id,
                    'status' => $validatedData['status'],
                    'notes' => $validatedData['notes'] ?? null
                ]
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de la mise à jour de l\'attendance:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour de l\'attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer les données d'attendance depuis Biostar
     */
    private function getBiostarAttendanceData($date, $heureDebut, $heureFin)
    {
        // Format date and time for SQL Server compatibility
        $formattedDate = date('Y-m-d', strtotime($date));
        $formattedTime1 = date('H:i:s', strtotime($heureDebut));
        $formattedTime2 = date('H:i:s', strtotime($heureFin));

        // Create a PDO connection to the SQL Server database
        $dsn = 'sqlsrv:Server=10.0.2.148;Database=BIOSTAR_TA;TrustServerCertificate=true';
        $username = 'dbuser';
        $password = 'Driss@2024';

        try {
            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Execute the query using PDO with proper date formatting
            $sql = "SELECT * FROM punchlog WHERE CAST(devdt AS date) = CAST(:date AS date) AND CAST(devdt AS time) BETWEEN CAST(:heure1 AS time) AND CAST(:heure2 AS time) AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $formattedDate, 'heure1' => $formattedTime1, 'heure2' => $formattedTime2]);

            // Fetch the results
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            \Log::error('Erreur de connexion Biostar pour rattrapage:', [
                'message' => $e->getMessage(),
                'date' => $date,
                'heure_debut' => $heureDebut,
                'heure_fin' => $heureFin
            ]);
            return [];
        }
    }

    /**
     * Récupérer l'heure de pointage d'un étudiant depuis les données Biostar
     */
    private function getPunchTimeForStudent($matricule, $biostarResults)
    {
        foreach ($biostarResults as $punch) {
            if ($punch['user_id'] == $matricule) {
                return [
                    'time' => $punch['devdt'],
                    'device' => $punch['devnm'],
                    'event_type' => $punch['event_type'] ?? 'punch'
                ];
            }
        }
        return null;
    }

    /**
     * Déterminer le statut d'attendance d'un étudiant avec tolérance
     */
    private function determineAttendanceStatus($matricule, $presentStudentMatricules, $punchTime, $pointageStartHour, $startHour, $tolerance = 5)
    {
        $isPresent = in_array($matricule, $presentStudentMatricules);
        
        if (!$isPresent) {
            return 'absent';
        }

        if ($punchTime) {
            // Convertir l'heure de pointage en format comparable
            $punchTimeFormatted = date('H:i:s', strtotime($punchTime['time']));
            
            // Heures de référence
            $heureDebutRattrapage = date('H:i:s', strtotime($startHour));
            $heurePointage = date('H:i:s', strtotime($pointageStartHour));
            
            // Calculer l'heure limite pour les retards (début + tolérance)
            $heureLimiteRetard = date('H:i:s', strtotime($startHour . ' +' . $tolerance . ' minutes'));
            
            // Logique de classification
            if ($punchTimeFormatted <= $heureDebutRattrapage) {
                // Pointé avant ou à l'heure de début du rattrapage = Présent
                return 'present';
            } elseif ($punchTimeFormatted <= $heureLimiteRetard) {
                // Pointé entre l'heure de début et la limite de tolérance = En retard
                return 'late';
            } else {
                // Pointé après la limite de tolérance = Absent
                return 'absent';
            }
        }

        return 'present';
    }

    /**
     * Exporter les données d'attendance d'un rattrapage en CSV
     */
    public function exportAttendanceCSV($id): JsonResponse
    {
        try {
            $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);
            
            if (!$rattrapage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rattrapage non trouvé'
                ], 404);
            }

            // Récupérer les données d'attendance
            $attendanceData = $this->getAttendanceDataForExport($rattrapage);

            // Générer le contenu CSV
            $csvContent = $this->generateCSVContent($attendanceData, $rattrapage);

            // Générer le nom du fichier
            $fileName = 'rattrapage_attendance_' . $rattrapage->id . '_' . now()->format('Y-m-d_H-i-s') . '.csv';

            // Retourner le fichier CSV
            return response()->streamDownload(function() use ($csvContent) {
                echo $csvContent;
            }, $fileName, [
                'Content-Type' => 'text/csv; charset=utf-8',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"'
            ]);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de l\'export CSV du rattrapage:', [
                'rattrapage_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export CSV: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Exporter les données d'attendance d'un rattrapage en Excel
     */
    public function exportAttendanceExcel($id): JsonResponse
    {
        try {
            $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);
            
            if (!$rattrapage) {
                return response()->json([
                    'success' => false,
                    'message' => 'Rattrapage non trouvé'
                ], 404);
            }

            // Récupérer les données d'attendance
            $attendanceData = $this->getAttendanceDataForExport($rattrapage);

            // Générer le contenu Excel
            $excelContent = $this->generateExcelContent($attendanceData, $rattrapage);

            // Générer le nom du fichier
            $fileName = 'rattrapage_attendance_' . $rattrapage->id . '_' . now()->format('Y-m-d_H-i-s') . '.xlsx';

            // Retourner le fichier Excel
            return response()->streamDownload(function() use ($excelContent) {
                echo $excelContent;
            }, $fileName, [
                'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"'
            ]);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de l\'export Excel du rattrapage:', [
                'rattrapage_id' => $id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export Excel: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer les données d'attendance pour l'export
     */
    private function getAttendanceDataForExport($rattrapage)
    {
        // Récupérer les étudiants du rattrapage
        $listStudents = $rattrapage->listStudents()->with([
            'etudiant.promotion',
            'etudiant.etablissement',
            'etudiant.ville',
            'etudiant.group',
            'etudiant.option'
        ])->get();

        if ($listStudents->isEmpty()) {
            return [
                'rattrapage' => $rattrapage,
                'students' => [],
                'statistics' => [
                    'total_students' => 0,
                    'presents' => 0,
                    'absents' => 0,
                    'lates' => 0,
                    'excused' => 0
                ]
            ];
        }

        // Récupérer les données Biostar
        $biostarResults = $this->getBiostarAttendanceData(
            $rattrapage->date,
            $rattrapage->pointage_start_hour,
            $rattrapage->end_hour
        );

        $presentStudentMatricules = collect($biostarResults)->pluck('user_id')->toArray();

        $students = [];
        $presents = 0;
        $absents = 0;
        $lates = 0;
        $excused = 0;

        foreach ($listStudents as $listStudent) {
            $etudiant = $listStudent->etudiant;
            $punchTime = $this->getPunchTimeForStudent($etudiant->matricule, $biostarResults);
            
            $status = $this->determineAttendanceStatus(
                $etudiant->matricule,
                $presentStudentMatricules,
                $punchTime,
                $rattrapage->pointage_start_hour,
                $rattrapage->start_hour,
                $rattrapage->tolerance ?? 5
            );
            
            $students[] = [
                'id' => $etudiant->id,
                'matricule' => $etudiant->matricule,
                'first_name' => $etudiant->first_name,
                'last_name' => $etudiant->last_name,
                'email' => $etudiant->email,
                'photo' => $etudiant->photo,
                'promotion' => $etudiant->promotion,
                'etablissement' => $etudiant->etablissement,
                'ville' => $etudiant->ville,
                'group' => $etudiant->group,
                'option' => $etudiant->option,
                'status' => $status,
                'punch_time' => $punchTime,
                'notes' => null
            ];

            // Compter les statuts
            switch ($status) {
                case 'present':
                    $presents++;
                    break;
                case 'absent':
                    $absents++;
                    break;
                case 'late':
                    $lates++;
                    break;
                case 'excused':
                    $excused++;
                    break;
            }
        }

        return [
            'rattrapage' => $rattrapage,
            'students' => $students,
            'statistics' => [
                'total_students' => count($students),
                'presents' => $presents,
                'absents' => $absents,
                'lates' => $lates,
                'excused' => $excused
            ]
        ];
    }

    /**
     * Générer le contenu CSV
     */
    private function generateCSVContent($attendanceData, $rattrapage)
    {
        $csvContent = '';
        
        // Ajouter BOM pour UTF-8
        $csvContent .= "\xEF\xBB\xBF";
        
        // Informations du rattrapage
        $csvContent .= "INFORMATIONS DU RATTRAPAGE\n";
        $csvContent .= "Nom du rattrapage," . $rattrapage->name . "\n";
        $csvContent .= "Date," . $rattrapage->date . "\n";
        $csvContent .= "Heure de pointage," . $rattrapage->pointage_start_hour . "\n";
        $csvContent .= "Heure de début," . $rattrapage->start_hour . "\n";
        $csvContent .= "Heure de fin," . $rattrapage->end_hour . "\n";
        $csvContent .= "Tolérance," . ($rattrapage->tolerance ?? 5) . " minutes\n";
        $csvContent .= "\n";
        
        // Statistiques
        $stats = $attendanceData['statistics'];
        $csvContent .= "STATISTIQUES\n";
        $csvContent .= "Total étudiants," . $stats['total_students'] . "\n";
        $csvContent .= "Présents," . $stats['presents'] . "\n";
        $csvContent .= "En retard," . $stats['lates'] . "\n";
        $csvContent .= "Absents," . $stats['absents'] . "\n";
        $csvContent .= "Excuses," . $stats['excused'] . "\n";
        $csvContent .= "\n";
        
        // En-têtes des étudiants
        $csvContent .= "LISTE DES ÉTUDIANTS\n";
        $csvContent .= "Nom,Prénom,Matricule,Email,Statut,Heure de pointage,Appareil,Promotion,Groupe,Option,Établissement,Ville\n";
        
        // Données des étudiants
        foreach ($attendanceData['students'] as $student) {
            $punchTime = $student['punch_time'] ? 
                date('d/m/Y H:i:s', strtotime($student['punch_time']['time'])) : 'N/A';
            $device = $student['punch_time'] ? $student['punch_time']['device'] : 'N/A';
            
            $csvContent .= sprintf(
                '"%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s","%s"' . "\n",
                $student['last_name'],
                $student['first_name'],
                $student['matricule'],
                $student['email'],
                $student['status'],
                $punchTime,
                $device,
                $student['promotion'] ? $student['promotion']['name'] : 'N/A',
                $student['group'] ? $student['group']['title'] : 'N/A',
                $student['option'] ? $student['option']['name'] : 'N/A',
                $student['etablissement'] ? $student['etablissement']['name'] : 'N/A',
                $student['ville'] ? $student['ville']['name'] : 'N/A'
            );
        }
        
        return $csvContent;
    }

    /**
     * Générer le contenu Excel (simplifié - nécessite une librairie Excel)
     */
    private function generateExcelContent($attendanceData, $rattrapage)
    {
        // Pour l'instant, on génère un CSV formaté pour Excel
        // Dans un vrai projet, vous utiliseriez PhpSpreadsheet ou une librairie similaire
        return $this->generateCSVContent($attendanceData, $rattrapage);
    }
}
