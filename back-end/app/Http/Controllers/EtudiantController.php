<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etudiant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use App\Services\EtudiantService;
use App\Services\UserContextService;
use App\Services\ConfigurationService;
// Commenté temporairement en attendant l'activation de l'extension GD
// use PhpOffice\PhpSpreadsheet\Spreadsheet;
// use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
// use PhpOffice\PhpSpreadsheet\Style\Alignment;
// use PhpOffice\PhpSpreadsheet\Style\Border;
// use PhpOffice\PhpSpreadsheet\Style\Fill;

class EtudiantController extends Controller
{
    protected $configurationService;
    protected $etudiantService;
    protected $userContextService;

    public function __construct(ConfigurationService $configurationService, EtudiantService $etudiantService, UserContextService $userContextService)
    {
        $this->configurationService = $configurationService;
        $this->etudiantService = $etudiantService;
        $this->userContextService = $userContextService;
    }

    /**
     * Display a listing of the resource (filtered by user context).
     */
    public function index(Request $request)
    {
        // Récupérer les paramètres de pagination
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);
        
        // Construire la requête avec les relations
        // Le filtrage par contexte utilisateur est déjà appliqué par le global scope UserContextScope
        $query = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);
        
        // Appliquer les filtres
        if ($request->has('searchValue') && !empty($request->get('searchValue'))) {
            $searchValue = $request->get('searchValue');
            $query->where(function($q) use ($searchValue) {
                $q->where('first_name', 'LIKE', "%{$searchValue}%")
                  ->orWhere('last_name', 'LIKE', "%{$searchValue}%")
                  ->orWhere('email', 'LIKE', "%{$searchValue}%")
                  ->orWhere('matricule', 'LIKE', "%{$searchValue}%");
            });
        }
        
        if ($request->has('promotion_id') && !empty($request->get('promotion_id')) && $request->get('promotion_id') != 'null') {
            $query->where('promotion_id', $request->get('promotion_id'));
        }
        
        if ($request->has('group_id') && !empty($request->get('group_id')) && $request->get('group_id') != 'null') {
            $query->where('group_id', $request->get('group_id'));
        }
        
        if ($request->has('ville_id') && !empty($request->get('ville_id')) && $request->get('ville_id') != 'null') {
            $query->where('ville_id', $request->get('ville_id'));
        }
        
        if ($request->has('etablissement_id') && !empty($request->get('etablissement_id')) && $request->get('etablissement_id') != 'null') {
            $query->where('etablissement_id', $request->get('etablissement_id'));
        }
        
        if ($request->has('option_id') && !empty($request->get('option_id')) && $request->get('option_id') != 'null') {
            $query->where('option_id', $request->get('option_id'));
        }
        
        // Récupérer les étudiants avec pagination
        $etudiants = $query->paginate($perPage, ['*'], 'page', $page);
        
        // Formater la réponse selon la structure attendue par Angular
        return response()->json([
            "data" => $etudiants->items(),
            "current_page" => $etudiants->currentPage(),
            "per_page" => $etudiants->perPage(),
            "total" => $etudiants->total(),
            "last_page" => $etudiants->lastPage(),
            "has_next_page" => $etudiants->hasMorePages(),
            "has_prev_page" => $etudiants->currentPage() > 1,
            "status" => 200
        ]);
    }

    /**
     * Fetch student attendance data by comparing Biostar system data with local database
     */
    public function fetchStudentAttendance(Request $request)
    {
        $date = $request->input('date', '2025-02-06'); // Default date if not provided
        $heure1 = $request->input('hour1', '08:00'); // Default start time if not provided
        $heure2 = $request->input('hour2', '10:00'); // Default end time if not provided
        
        // Récupérer l'heure de début de pointage et la salle depuis l'examen correspondant
        $examen = \App\Models\Examen::with(['salle', 'promotion', 'etablissement', 'ville', 'typeExamen', 'option'])
            ->where('date', $date)
            ->where('heure_debut', $heure1)
            ->where('heure_fin', $heure2)
            ->first();
        
        $heureDebutPointage = $examen ? $examen->heure_debut_poigntage : null;
        $salle = $examen && $examen->salle ? $examen->salle->name : null;
        
        // Format date and time for SQL Server compatibility
        $formattedDate = date('Y-m-d', strtotime($date));
        $formattedTime1 = date('H:i:s', strtotime($heure1));
        $formattedTime2 = date('H:i:s', strtotime($heure2));
        $promotion_id = $request->input("promotion_id", null);
        $etablissement_id = $request->input("etablissement_id", null);
        $ville_id = $request->input("ville_id", null);
        $group_id = $request->query("group_id", null);
        $option_id = $request->query("option_id", null);

        // Si un examen est trouvé, utiliser ses méta-données comme valeurs par défaut
        if ($examen) {
            if (empty($promotion_id) || $promotion_id === 'null') {
                $promotion_id = $examen->promotion_id;
            }
            if (empty($etablissement_id) || $etablissement_id === 'null') {
                $etablissement_id = $examen->etablissement_id;
            }
            if (empty($ville_id) || $ville_id === 'null') {
                $ville_id = $examen->ville_id ?? null;
            }
            // IMPORTANT: ne pas déduire group_id/option_id de l'examen
            // Si le client ne fournit pas group_id ou option_id, on n'applique PAS ces filtres
        }

        // Initialize variables
        $biostarResults = [];
        $localStudents = collect();

        // Get connection configuration from database
        $config = $this->configurationService->getConnectionConfig();
        
        if (is_array($config) && isset($config['dsn'])) {
            try {
                $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Déterminer l'heure de référence pour la comparaison
            $heureReference = $heureDebutPointage ? $heureDebutPointage : $heure1;
            $formattedTimeRef = date('H:i:s', strtotime($heureReference));
            
            // Execute the query using PDO with proper date formatting
            // Utiliser l'heure de référence pour la comparaison
            $sql = "SELECT * FROM punchlog WHERE CAST(bsevtdt AS date) = CAST(:date AS date) AND CAST(bsevtdt AS time) BETWEEN CAST(:heure1 AS time) AND CAST(:heure2 AS time) AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $formattedDate, 'heure1' => $formattedTimeRef, 'heure2' => $formattedTime2]);

            // Fetch the results
            $biostarResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Debug: Log des résultats Biostar
            \Log::info("Résultats Biostar récupérés:", [
                'nombre_pointages' => count($biostarResults),
                'premiers_pointages' => array_slice($biostarResults, 0, 3),
                'champs_disponibles' => !empty($biostarResults) ? array_keys($biostarResults[0]) : []
            ]);
            
            } catch (PDOException $e) {
                // If Biostar connection fails, continue with empty results
                \Log::error("Erreur de connexion Biostar:", ['error' => $e->getMessage()]);
                $biostarResults = [];
            }
        } else {
            // Configuration not found, continue with empty results
            $biostarResults = [];
        }
        
        // Fetch students from the local database with relations
        $query = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);

        if (!empty($group_id) && $group_id != 'null') {
            $query->where('group_id', $group_id);
        }

        if (!empty($option_id) && $option_id != 'null') {
            $query->where('option_id', $option_id);
        }
        
        if (!empty($etablissement_id) && $etablissement_id != 'null') {
            $query->where('etablissement_id', $etablissement_id);
        }

        if (!empty($ville_id) && $ville_id != 'null') {
            $query->where('ville_id', $ville_id);
        }

        if (!empty($promotion_id) && $promotion_id != 'null') {
            $query->where('promotion_id', $promotion_id);
        }   

        $localStudents = $query->get();
        
        // Debug: Log des étudiants locaux
        \Log::info("Étudiants locaux récupérés:", [
            'nombre_etudiants' => $localStudents->count(),
            'premiers_etudiants' => $localStudents->take(3)->map(function($student) {
                return [
                    'id' => $student->id,
                    'matricule' => $student->matricule,
                    'nom' => $student->last_name . ' ' . $student->first_name,
                    'promotion_id' => $student->promotion_id,
                    'group_id' => $student->group_id,
                    'ville_id' => $student->ville_id
                ];
            })->toArray()
        ]);
            
            // Check if any students were found
            if ($localStudents->isEmpty()) {
                // Préparer les informations complètes de l'examen pour le cas d'erreur
                $examenInfo = null;
                if ($examen) {
                    $examenInfo = [
                        'id' => $examen->id,
                        'date' => $examen->date,
                        'heure_debut' => $examen->heure_debut,
                        'heure_fin' => $examen->heure_fin,
                        'heure_debut_poigntage' => $examen->heure_debut_poigntage,
                        'tolerance' => $examen->tolerance,
                        'salle' => $examen->salle ? [
                            'id' => $examen->salle->id,
                            'name' => $examen->salle->name,
                            'capacity' => $examen->salle->capacity ?? null,
                            'location' => $examen->salle->location ?? null
                        ] : null,
                        'promotion' => $examen->promotion ? [
                            'id' => $examen->promotion->id,
                            'name' => $examen->promotion->name,
                            'year' => $examen->promotion->year ?? null
                        ] : null,
                        'etablissement' => $examen->etablissement ? [
                            'id' => $examen->etablissement->id,
                            'name' => $examen->etablissement->name,
                            'address' => $examen->etablissement->address ?? null
                        ] : null,
                        'ville' => $examen->ville ? [
                            'id' => $examen->ville->id,
                            'name' => $examen->ville->name
                        ] : null,
                        'type_examen' => $examen->typeExamen ? [
                            'id' => $examen->typeExamen->id,
                            'name' => $examen->typeExamen->name,
                            'description' => $examen->typeExamen->description ?? null
                        ] : null,
                        'option' => $examen->option ? [
                            'id' => $examen->option->id,
                            'name' => $examen->option->name
                        ] : null,
                        'created_at' => $examen->created_at,
                        'updated_at' => $examen->updated_at
                    ];
                }
                
                return response()->json([
                    "message" => "Aucun étudiant trouvé avec les critères spécifiés",
                    "date" => $date,
                    "heure_debut_poigntage" => $heureDebutPointage,
                    "heure_debut" => $heure1,
                    "heure_fin" => $heure2,
                    "tolerance" => $examen ? $examen->tolerance : 15,
                    "salle" => $salle,
                    "examen" => $examenInfo,
                    "filtres_appliques" => [
                        'promotion_id' => $promotion_id,
                        'etablissement_id' => $etablissement_id,
                        'ville_id' => $ville_id,
                        'group_id' => $group_id,
                        'option_id' => $option_id
                    ],
                    "total_etudiants" => 0,
                    "presents" => 0,
                    "absents" => 0,
                    "etudiants" => [],
                    "status" => 404
                ], 404);
            }

            
            
            // Get present students (those who have punched in Biostar)
            // Essayer d'abord avec user_id, puis avec student_id
            $presentStudentMatricules = collect($biostarResults)->pluck('user_id')->filter()->toArray();
            if (empty($presentStudentMatricules)) {
                $presentStudentMatricules = collect($biostarResults)->pluck('student_id')->filter()->toArray();
            }
            
            // ici biostarResults ca marche bien

            // Prepare the final response with attendance status
            $studentsWithAttendance = $localStudents->map(function ($student) use ($presentStudentMatricules, $biostarResults, $heureDebutPointage, $heure1, $examen) {
                $punchTime = $this->getPunchTime($student->matricule, $biostarResults);
                $status = 'absent';
                
                if ($punchTime) {
                    // Convertir l'heure de pointage en format comparable
                    $punchTimeFormatted = date('H:i:s', strtotime($punchTime['time']));
                    $heureDebutExamen = date('H:i:s', strtotime($heure1));
                    $heureDebutPointageFormatted = $heureDebutPointage ? date('H:i:s', strtotime($heureDebutPointage)) : $heureDebutExamen;
                    
                    // Calculer la tolérance (par défaut 15 minutes si pas définie)
                    $tolerance = $examen ? $examen->tolerance : 15;
                    $toleranceMinutes = is_numeric($tolerance) ? $tolerance : 15;
                    
                    // Calculer l'heure limite avec tolérance
                    $heureLimite = date('H:i:s', strtotime($heureDebutExamen . ' + ' . $toleranceMinutes . ' minutes'));
                    
                    // Logique de statut améliorée
                    if ($punchTimeFormatted >= $heureDebutPointageFormatted && $punchTimeFormatted < $heureDebutExamen) {
                        // Entre heure début pointage et heure début = Présent
                        $status = 'présent';
                    } elseif ($punchTimeFormatted >= $heureDebutExamen && $punchTimeFormatted <= $heureLimite) {
                        // Entre heure début et limite de tolérance = En retard
                        $status = 'en retard';
                    } elseif ($punchTimeFormatted > $heureLimite) {
                        // Après la limite de tolérance = Absent
                        $status = 'absent';
                    } else {
                        // Avant l'heure de début de pointage = Absent
                        $status = 'absent';
                    }
                    
                    // Debug log pour tracer le calcul
                    \Log::info("Calcul statut pour étudiant {$student->matricule}:", [
                        'punch_time' => $punchTime['time'],
                        'punch_time_formatted' => $punchTimeFormatted,
                        'heure_debut_pointage' => $heureDebutPointageFormatted,
                        'heure_debut_examen' => $heureDebutExamen,
                        'tolerance_minutes' => $toleranceMinutes,
                        'heure_limite' => $heureLimite,
                        'status_calculé' => $status
                    ]);
                }
                
                return [
                    'id' => $student->id,
                    'matricule' => $student->matricule,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'email' => $student->email,
                    'photo' => $student->photo,
                    'promotion' => $student->promotion,
                    'etablissement' => $student->etablissement,
                    'ville' => $student->ville,
                    'group' => $student->group,
                    'option' => $student->option,
                    'status' => $status,
                    'punch_time' => $punchTime,
                ];
            });

            // ca marche pas bien ici

            
            // Préparer les informations complètes de l'examen
            $examenInfo = null;
            if ($examen) {
                $examenInfo = [
                    'id' => $examen->id,
                    'date' => $examen->date,
                    'heure_debut' => $examen->heure_debut,
                    'heure_fin' => $examen->heure_fin,
                    'heure_debut_poigntage' => $examen->heure_debut_poigntage,
                    'tolerance' => $examen->tolerance,
                    'salle' => $examen->salle ? [
                        'id' => $examen->salle->id,
                        'name' => $examen->salle->name,
                    ] : null,
                    'promotion' => $examen->promotion ? [
                        'id' => $examen->promotion->id,
                        'name' => $examen->promotion->name,
                    ] : null,
                    'etablissement' => $examen->etablissement ? [
                        'id' => $examen->etablissement->id,
                        'name' => $examen->etablissement->name,
                    ] : null,
                    'ville' => $examen->ville ? [
                        'id' => $examen->ville->id,
                        'name' => $examen->ville->name
                    ] : null,
                    'type_examen' => $examen->typeExamen ? [
                        'id' => $examen->typeExamen->id,
                        'name' => $examen->typeExamen->name,
                    ] : null,
                    'option' => $examen->option ? [
                        'id' => $examen->option->id,
                        'name' => $examen->option->name
                    ] : null,
                    'created_at' => $examen->created_at,
                    'updated_at' => $examen->updated_at
                ];
            }
            
            return response()->json([
                "message" => "Liste des étudiants avec statut de présence",
                "date" => $date,
                "heure_debut_poigntage" => $heureDebutPointage,
                "heure_debut" => $heure1,
                "heure_fin" => $heure2,
                "tolerance" => $examen ? $examen->tolerance : 15,
                "salle" => $salle,
                "examen" => $examenInfo,
                "logique_presence" => [
                    "heure_debut_examen" => $heure1,
                    "heure_debut_pointage" => $heureDebutPointage,
                    "tolerance" => $examen ? $examen->tolerance : 15,
                    "critere" => "Étudiant présent s'il pointe avant l'heure de début de l'examen + tolérance",
                    "description" => "L'heure de début de pointage indique quand commencer le pointage, mais la présence est déterminée par rapport à l'heure de début de l'examen plus la tolérance"
                ],
                "total_etudiants" => $studentsWithAttendance->count(),
                "presents" => $studentsWithAttendance->where('status', 'présent')->count(),
                "absents" => $studentsWithAttendance->count() - $studentsWithAttendance->where('status', 'présent')->count(),
                "etudiants" => $studentsWithAttendance,
                "status" => 200
            ], 200);
    }

    /**
     * Get punch time for a specific student with improved matching logic
     */
    private function getPunchTime($matricule, $biostarResults)
    {
        // Stratégie 1: Correspondance exacte
        $studentPunch = collect($biostarResults)->firstWhere('user_id', $matricule);
        if ($studentPunch) {
            return [
                'time' => $studentPunch['bsevtdt'] ?? $studentPunch['punch_time'],
                'device' => $studentPunch['devnm'] ?? $studentPunch['device'] ?? $studentPunch['device_name'] ?? 'Inconnu'
            ];
        }
        
        // Stratégie 2: Supprimer les zéros de début (ex: "000123" → "123")
        $matriculeTrimmed = ltrim($matricule, '0');
        if ($matriculeTrimmed !== $matricule && !empty($matriculeTrimmed)) {
            $studentPunch = collect($biostarResults)->firstWhere('user_id', $matriculeTrimmed);
            if ($studentPunch) {
                \Log::info("Match trouvé avec suppression des zéros: '$matricule' → '$matriculeTrimmed'");
                return [
                    'time' => $studentPunch['bsevtdt'] ?? $studentPunch['punch_time'],
                    'device' => $studentPunch['devnm'] ?? $studentPunch['device'] ?? $studentPunch['device_name'] ?? 'Inconnu'
                ];
            }
        }
        
        // Stratégie 3: Ajouter des zéros de début (ex: "123" → "000123")
        $matriculePadded = str_pad($matricule, 6, '0', STR_PAD_LEFT);
        if ($matriculePadded !== $matricule) {
            $studentPunch = collect($biostarResults)->firstWhere('user_id', $matriculePadded);
            if ($studentPunch) {
                \Log::info("Match trouvé avec ajout de zéros: '$matricule' → '$matriculePadded'");
                return [
                    'time' => $studentPunch['bsevtdt'] ?? $studentPunch['punch_time'],
                    'device' => $studentPunch['devnm'] ?? $studentPunch['device'] ?? $studentPunch['device_name'] ?? 'Inconnu'
                ];
            }
        }
        
        // Stratégie 4: Recherche partielle (contient le matricule)
        $studentPunch = collect($biostarResults)->first(function ($punch) use ($matricule) {
            return strpos($punch['user_id'], $matricule) !== false;
        });
        if ($studentPunch) {
            \Log::info("Match trouvé avec recherche partielle: '$matricule' contenu dans '{$studentPunch['user_id']}'");
            return [
                'time' => $studentPunch['bsevtdt'] ?? $studentPunch['punch_time'],
                'device' => $studentPunch['devnm'] ?? $studentPunch['device'] ?? $studentPunch['device_name'] ?? 'Inconnu'
            ];
        }
        
        // Stratégie 5: Recherche inverse (le matricule contient le user_id)
        $studentPunch = collect($biostarResults)->first(function ($punch) use ($matricule) {
            return strpos($matricule, $punch['user_id']) !== false;
        });
        if ($studentPunch) {
            \Log::info("Match trouvé avec recherche inverse: '{$studentPunch['user_id']}' contenu dans '$matricule'");
            return [
                'time' => $studentPunch['bsevtdt'] ?? $studentPunch['punch_time'],
                'device' => $studentPunch['devnm'] ?? $studentPunch['device'] ?? $studentPunch['device_name'] ?? 'Inconnu'
            ];
        }
        
        // Aucun match trouvé
        \Log::warning("Aucun match trouvé pour le matricule: '$matricule'");
        return null;
    }

    /**
     * Test function to check students count and sample data
     */
    public function testStudentsCount()
    {
        $totalStudents = Etudiant::count();
        $sampleStudents = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion'])
                                 ->take(3)
                                 ->get();

        return response()->json([
            'message' => 'Test des étudiants dans la base de données',
            'total_etudiants' => $totalStudents,
            'echantillon_etudiants' => $sampleStudents,
            'status' => 200
        ]);
    }

    /**
     * Diagnostic endpoint to debug empty students list
     */
    public function diagnosticStudents()
    {
        $user = Auth::user();
        $userContext = $this->userContextService->getUserContext();
        
        // Count without any filters
        $totalWithoutFilters = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->count();
        
        // Count with global scope only
        $totalWithGlobalScope = Etudiant::count();
        
        // Count with user context filters manually applied
        $query = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class);
        if ($userContext['ville_id']) {
            $query->where('ville_id', $userContext['ville_id']);
        }
        if ($userContext['etablissement_id']) {
            $query->where('etablissement_id', $userContext['etablissement_id']);
        }
        $totalWithManualFilters = $query->count();
        
        // Sample students without filters
        $sampleWithoutFilters = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)
            ->with(['ville', 'group', 'option', 'etablissement', 'promotion'])
            ->take(3)
            ->get();
        
        // Sample students with filters
        $sampleWithFilters = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion'])
            ->take(3)
            ->get();

        return response()->json([
            'message' => 'Diagnostic des étudiants',
            'user_context' => [
                'user_id' => $user ? $user->id : null,
                'user_email' => $user ? $user->email : null,
                'ville_id' => $userContext['ville_id'],
                'etablissement_id' => $userContext['etablissement_id']
            ],
            'counts' => [
                'total_without_filters' => $totalWithoutFilters,
                'total_with_global_scope' => $totalWithGlobalScope,
                'total_with_manual_filters' => $totalWithManualFilters
            ],
            'samples' => [
                'without_filters' => $sampleWithoutFilters,
                'with_filters' => $sampleWithFilters
            ],
            'status' => 200
        ]);
    }

    public function ImportEtudiants(Request $request) {
        $user = $request->user();
        $faculte = "";
        if($user->role == 'admin') {
            $faculte = $user->faculte;
        }

        if(!Auth::check()){
            return response()->json(['error'=> 'you should be authenticated'],0);
        }

        if($request->hasFile("file")) {
            $file = $request->file('file');
            $path = $file->getRealPath();

            // Open the file for reading
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return response()->json(['message' => 'Unable to open file'], 400);
            }

            // Read the first line to determine the delimiter
            $firstLine = fgets($handle);
            $delimiter = $this->detectDelimiter($firstLine);

            // Rewind the file pointer to the beginning of the file
            rewind($handle);

            // Parse the CSV file with the detected delimiter
            $data = [];
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $data[] = $row;
            }

            // Close the file
            fclose($handle);

            // Assuming the first row contains the headers
            $header = array_shift($data);

            // Ensure the header keys are trimmed and lowercased
            $header = array_map('trim', $header);
            $header = array_map('strtolower', $header);

            if($user->role != 'super-admin') {
                foreach ($data as $row) {
                    // Ensure the row values are trimmed
                    $row = array_map('trim', $row);
    
                    // Combine the header with the row values
                    $studentData = array_combine($header, $row);
    
                    // Insert the student data into the database
                    Etudiant::updateOrCreate([
                        'matricule' => $studentData['matricule'],
                        'name' => $studentData['name'],
                        'faculte' => strtolower($faculte),
                        'promotion' => $studentData['promotion'],
                        'groupe' => $studentData['groupe'],
                        'option' => $studentData['option'] ?? "",
                    ]);
                }
            } else {
                foreach ($data as $row) {
                    // Ensure the row values are trimmed
                    $row = array_map('trim', $row);
    
                    // Combine the header with the row values
                    $studentData = array_combine($header, $row);
    
                    // Insert the student data into the database
                    Etudiant::updateOrCreate([
                        'matricule' => $studentData['matricule'],
                        'name' => $studentData['name'],
                        'faculte' => $studentData['faculte'],
                        'promotion' => $studentData['promotion'],
                        'groupe' => $studentData['groupe'],
                        'option' => $studentData['option'] ?? "",
                    ]);
                }
            }


            return response()->json(['message' => 'file imported successfully'], 200);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }


    private function detectDelimiter($line)
    {
        $delimiters = [',', ';', "\t"];
        $counts = [];

        foreach ($delimiters as $delimiter) {
            $counts[$delimiter] = substr_count($line, $delimiter);
        }

        return array_search(max($counts), $counts);
    }

    public function fetchEtudiantByPromotion(Request $request) {
        $request->validate([
            'promotion' => 'required|string',
        ]);
        
        $etudiants = Etudiant::where('promotion', $request->input('promotion'))->get();
        return response()->json(["etudiants" => $etudiants, "status" => 200]);
    }

    public function fetchEtudiantByFaculte(Request $request)
    {
        // Validate the request input
        $request->validate([
            'faculte' => 'required|string',
        ]);

        // Fetch students based on faculte
        $etudiants = Etudiant::where('faculte', $request->input('faculte'))->get();

        // Return the students as a JSON response
        return response()->json(["etudiants" => $etudiants, "status" => 200]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        // Validate the request input
        $request->validate([
            'matricule' => 'required|string|unique:etudiants,matricule|max:255',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'required|email|unique:etudiants,email|max:255',
            'password' => 'required|string|min:6',
            'promotion_id' => 'required|exists:promotions,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
            'group_id' => 'required|exists:groups,id',
            'option_id' => 'nullable|exists:options,id', // Optionnel - toutes les écoles n'utilisent pas les options
        ]);

        // Create a new Etudiant
        $etudiant = Etudiant::create([
            'matricule' => $request->input('matricule'),
            'first_name' => $request->input('first_name'),
            'last_name' => $request->input('last_name'),
            'email' => $request->input('email'),
            'password' => bcrypt($request->input('password')),
            'promotion_id' => $request->input('promotion_id'),
            'etablissement_id' => $request->input('etablissement_id'),
            'ville_id' => $request->input('ville_id'),
            'group_id' => $request->input('group_id'),
            'option_id' => $request->input('option_id'), // Peut être null
        ]);

        if ($request->hasFile("photo")) {
            $photo = $request->file("photo");
            $photoName = $etudiant->matricule . "." . $photo->getClientOriginalExtension();
            $photo->move(public_path("/images"), $photoName);

            // Mettre à jour l'étudiant avec le chemin de la photo
            $etudiant->update(['photo' => "/images/" . $photoName]);
        }

        // Return the newly created Etudiant with relations as a JSON response
        return response()->json([
            'message' => 'Étudiant créé avec succès',
            'etudiant' => $etudiant->load(['ville', 'group', 'option', 'etablissement', 'promotion']),
            'id' => $etudiant->id,
            'matricule' => $etudiant->matricule,
            'status' => 201
        ], 201);
    }

    
    /**
     * Display the specified resource by ID.
     */
    public function show($id)
    {
        // Fetch the student by ID with all relations
        $etudiant = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion'])
                           ->where('id', $id)
                           ->first();

        if ($etudiant) {
            return response()->json($etudiant, 200);
        } else {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }
    }

    /**
     * Get student by matricule.
     */
    public function getEtudiantByMatricule($matricule)
    {
        // Fetch the student by matricule with all relations
        $etudiant = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion'])
                           ->where('matricule', $matricule)
                           ->first();

        if ($etudiant) {
            return response()->json($etudiant, 200);
        } else {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        // Validate the request input
        $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:etudiants,email,' . $id,
            'promotion_id' => 'sometimes|required|exists:promotions,id',
            'etablissement_id' => 'sometimes|required|exists:etablissements,id',
            'ville_id' => 'sometimes|required|exists:villes,id',
            'group_id' => 'sometimes|required|exists:groups,id',
            'option_id' => 'sometimes|nullable|exists:options,id', // Optionnel - toutes les écoles n'utilisent pas les options
        ]);

        // Find the Etudiant by ID
        $etudiant = Etudiant::find($id);
        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        // Update the Etudiant with the new data
        $etudiant->update($request->only([
            'first_name', 'last_name', 'email', 'promotion_id', 
            'etablissement_id', 'ville_id', 'group_id', 'option_id'
        ]));

        // Return the updated Etudiant with relations as a JSON response
        return response()->json([
            'message' => 'Étudiant mis à jour avec succès',
            'etudiant' => $etudiant->load(['ville', 'group', 'option', 'etablissement', 'promotion']),
            'status' => 200
        ], 200);
    }

    /**
     * Update student by matricule
     */
    public function updateByMatricule(Request $request, $matricule)
    {
        // Find the Etudiant by matricule first
        $etudiant = Etudiant::where('matricule', $matricule)->first();
        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        // Validate the request input
        $request->validate([
            'first_name' => 'sometimes|required|string|max:255',
            'last_name' => 'sometimes|required|string|max:255',
            'email' => 'sometimes|required|email|unique:etudiants,email,' . $etudiant->id,
            'promotion_id' => 'sometimes|required|exists:promotions,id',
            'etablissement_id' => 'sometimes|required|exists:etablissements,id',
            'ville_id' => 'sometimes|required|exists:villes,id',
            'group_id' => 'sometimes|required|exists:groups,id',
            'option_id' => 'sometimes|nullable|exists:options,id', // Optionnel - toutes les écoles n'utilisent pas les options
        ]);

        // Update the Etudiant with the new data
        $etudiant->update($request->only([
            'first_name', 'last_name', 'email', 'promotion_id', 
            'etablissement_id', 'ville_id', 'group_id', 'option_id'
        ]));

        // Return the updated Etudiant with relations as a JSON response
        return response()->json([
            'message' => 'Étudiant mis à jour avec succès',
            'etudiant' => $etudiant->load(['ville', 'group', 'option', 'etablissement', 'promotion']),
            'status' => 200
        ], 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        // Find the Etudiant by ID
        $etudiant = Etudiant::find($id);

        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        if ($etudiant->photo) {
            $photoPath = public_path($etudiant->photo); // Obtenir le chemin complet de la photo
            if (file_exists($photoPath)) {
                unlink($photoPath); // Supprimer la photo
            }
        }

        // Delete the Etudiant
        $etudiant->delete();

        // Return a success response
        return response()->json(['message' => 'Etudiant deleted successfully'], 200);
    }

    /**
     * Delete student by matricule
     */
    public function destroyByMatricule($matricule)
    {
        // Find the Etudiant by matricule
        $etudiant = Etudiant::where('matricule', $matricule)->first();

        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        if ($etudiant->photo) {
            $photoPath = public_path($etudiant->photo); // Obtenir le chemin complet de la photo
            if (file_exists($photoPath)) {
                unlink($photoPath); // Supprimer la photo
            }
        }

        // Delete the Etudiant
        $etudiant->delete();

        // Return a success response
        return response()->json(['message' => 'Etudiant deleted successfully'], 200);
    }

    /**
     * Get students by group using GroupService
     */
    public function getStudentsByGroupService(Request $request, string $groupId)
    {
        $groupService = new \App\Services\GroupService();
        $students = $groupService->getStudentsByGroup($groupId);
        
        return response()->json([
            'group_id' => $groupId,
            'students' => $students,
            'count' => $students->count()
        ]);
    }

    /**
     * Get groups for a specific student's etablissement
     */
    public function getGroupsForStudent(Request $request, string $matricule)
    {
        $etudiant = Etudiant::where('matricule', $matricule)->first();
        
        if (!$etudiant) {
            return response()->json(['error' => 'Étudiant non trouvé'], 404);
        }

        $groupService = new \App\Services\GroupService();
        $groups = $groupService->getGroupsByEtablissement($etudiant->etablissement_id);
        
        return response()->json([
            'student' => $etudiant,
            'available_groups' => $groups
        ]);
    }

    /**
     * Get filter options for students (promotions, groups, villes, etc.)
     */
    public function getFilterOptions()
    {
        try {
            $filterOptions = [
                'promotions' => \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->select('id', 'name')->get(),
                'groups' => \App\Models\Group::select('id', 'title')->get(),
                'villes' => \App\Models\Ville::select('id', 'name')->get(),
                'etablissements' => \App\Models\Etablissement::select('id', 'name')->get(),
                'options' => \App\Models\Option::select('id', 'name')->get(),
            ];

            return response()->json($filterOptions);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de la récupération des options de filtre',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Valider un fichier avant l'importation
     */
    public function validateStudentsFile(Request $request)
    {
        try {
            // Validation du fichier
            $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // 10MB max
            ]);

            $file = $request->file('file');
            $importOptions = json_decode($request->input('import_options', '{}'), true);

            // Détecter le type de fichier
            $extension = strtolower($file->getClientOriginalExtension());
            $isExcel = in_array($extension, ['xlsx', 'xls']);

            // Parser le fichier
            if ($isExcel) {
                $data = $this->parseExcelFile($file->getRealPath());
            } else {
                $data = $this->parseCsvFile($file);
            }

            if (empty($data)) {
                return response()->json([
                    'valid' => false,
                    'totalRows' => 0,
                    'validRows' => 0,
                    'errorRows' => 0,
                    'warnings' => 0,
                    'errors' => [[
                        'line' => 0,
                        'message' => 'Le fichier est vide ou ne peut pas être lu.',
                        'suggestions' => []
                    ]],
                    'warningsList' => [],
                    'summary' => [
                        'hasHeaders' => false,
                        'detectedFormat' => 'unknown',
                        'columns' => [],
                        'sampleData' => []
                    ]
                ], 422);
            }

            // Détecter le format et les en-têtes
            $headers = array_keys($data[0]);
            $hasHeaders = $this->hasHeaders($headers);
            $detectedFormat = $this->detectFormat($headers);

            // Si format legacy, convertir
            if ($detectedFormat === 'legacy') {
                $data = $this->convertLegacyFormat($data, $headers);
                $headers = ['matricule', 'first_name', 'last_name', 'email', 'password'];
            }

            // Validation des données
            $validationResults = $this->validateFileData($data, $headers, $importOptions);

            // Préparer les données d'échantillon (tableau aligné sur l'ordre des colonnes)
            $sampleRaw = array_slice($data, 0, 5);
            $sampleData = [];
            foreach ($sampleRaw as $row) {
                $line = [];
                foreach ($headers as $h) {
                    $line[] = is_array($row) && array_key_exists($h, $row) ? $row[$h] : null;
                }
                $sampleData[] = $line;
            }

            return response()->json([
                'valid' => $validationResults['valid'],
                'totalRows' => $validationResults['totalRows'],
                'validRows' => $validationResults['validRows'],
                'errorRows' => $validationResults['errorRows'],
                'errors' => $validationResults['errors'],
                'warnings' => $validationResults['warnings'],
                'warningsList' => $validationResults['warningsList'],
                'summary' => [
                    'hasHeaders' => $hasHeaders,
                    'detectedFormat' => $detectedFormat,
                    'columns' => $headers,
                    'sampleData' => $sampleData
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'valid' => false,
                'totalRows' => 0,
                'validRows' => 0,
                'errorRows' => 1,
                'warnings' => 0,
                'errors' => [[
                    'line' => 0,
                    'message' => 'Erreur lors de la lecture du fichier: ' . $e->getMessage(),
                    'suggestions' => []
                ]],
                'warnings' => [],
                'summary' => [
                    'hasHeaders' => false,
                    'detectedFormat' => 'unknown',
                    'columns' => [],
                    'sampleData' => []
                ]
            ], 422);
        }
    }

    /**
     * Valider les données du fichier
     */
    private function validateFileData($data, $headers, $importOptions)
    {
        $errors = [];
        $warnings = [];
        $validRows = 0;
        $totalRows = count($data);
        $useDefaultValues = $importOptions['useDefaultValues'] ?? false;
        $defaultValues = $importOptions['defaultValues'] ?? [];

        foreach ($data as $index => $row) {
            $lineNumber = $index + 1;
            $validationResult = $this->validateStudentData($row, $headers, $useDefaultValues, $defaultValues);
            
            if (!$validationResult['valid']) {
                $errors[] = [
                    'line' => $lineNumber,
                    'message' => $validationResult['message'],
                    'suggestions' => $validationResult['suggestions'] ?? []
                ];
            } else {
                $validRows++;
            }
        }

        return [
            'valid' => empty($errors),
            'totalRows' => $totalRows,
            'validRows' => $validRows,
            'errorRows' => count($errors),
            'warnings' => count($warnings),
            'errors' => $errors,
            'warningsList' => $warnings
        ];
    }

    /**
     * Détecter si le fichier a des en-têtes
     */
    private function hasHeaders($headers)
    {
        $expectedHeaders = ['matricule', 'first_name', 'last_name', 'email', 'password'];
        $legacyHeaders = ['matricule', 'name', 'promotion', 'faculte', 'groupe'];
        
        return count(array_intersect($headers, $expectedHeaders)) >= 3 || 
               count(array_intersect($headers, $legacyHeaders)) >= 3;
    }

    /**
     * Détecter le format du fichier
     */
    private function detectFormat($headers)
    {
        $modernHeaders = ['matricule', 'first_name', 'last_name', 'email', 'password'];
        $legacyHeaders = ['matricule', 'name', 'promotion', 'faculte', 'groupe'];
        
        $modernCount = count(array_intersect($headers, $modernHeaders));
        $legacyCount = count(array_intersect($headers, $legacyHeaders));
        
        if ($modernCount >= 3) {
            return 'modern';
        } elseif ($legacyCount >= 3) {
            return 'legacy';
        } else {
            return 'mixed';
        }
    }

    /**
     * Import students using modern structure (nouvelle méthode)
     */
    public function importEtudiantsModern(Request $request) 
    {
        // Validation de l'authentification
        if (!Auth::check()) {
            return response()->json(['error' => 'Authentication required'], 401);
        }

        // Validation du fichier
        $request->validate([
            'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240', // 10MB max - Support Excel et CSV
        ]);

        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'No file uploaded'], 400);
        }

        $file = $request->file('file');
        $path = $file->getRealPath();

        // Récupérer les options d'importation
        $importOptions = null;
        if ($request->has('import_options')) {
            $importOptions = json_decode($request->input('import_options'), true);
        }

        $useDefaultValues = $importOptions['useDefaultValues'] ?? false;
        $defaultValues = $importOptions['defaultValues'] ?? [];
        $duplicateMode = $importOptions['duplicateMode'] ?? 'update';

        try {
            $data = [];
            $headers = [];
            
            // Détecter le type de fichier et le traiter
            $fileExtension = strtolower($file->getClientOriginalExtension());
            
            // Traitement différent selon le type de fichier
            if (in_array($fileExtension, ['xlsx', 'xls'])) {
                // Pour les fichiers Excel, utiliser parseExcelFile directement
                try {
                    $data = $this->parseExcelFile($path);
                    if (empty($data)) {
                        return response()->json([
                            'message' => 'Unable to parse Excel file. Please check the file format.',
                            'debug_info' => [
                                'file_name' => $file->getClientOriginalName(),
                                'file_size' => $file->getSize(),
                                'file_path' => $path,
                                'extension' => $fileExtension
                            ]
                        ], 400);
                    }
                } catch (\Exception $e) {
                    \Log::error('Erreur parseExcelFile: ' . $e->getMessage());
                    return response()->json([
                        'message' => 'Error parsing Excel file: ' . $e->getMessage(),
                        'debug_info' => [
                            'file_name' => $file->getClientOriginalName(),
                            'file_size' => $file->getSize(),
                            'extension' => $fileExtension
                        ]
                    ], 400);
                }
            } else {
                // Pour les fichiers CSV/TXT, utiliser parseCsvFile
                try {
                    $data = $this->parseCsvFile($file);
                    if (empty($data)) {
                        return response()->json([
                            'message' => 'Unable to parse CSV file. Please check the file format.',
                            'debug_info' => [
                                'file_name' => $file->getClientOriginalName(),
                                'file_size' => $file->getSize(),
                                'extension' => $fileExtension
                            ]
                        ], 400);
                    }
                } catch (\Exception $e) {
                    \Log::error('Erreur parseCsvFile: ' . $e->getMessage());
                    return response()->json([
                        'message' => 'Error parsing CSV file: ' . $e->getMessage(),
                        'debug_info' => [
                            'file_name' => $file->getClientOriginalName(),
                            'file_size' => $file->getSize(),
                            'extension' => $fileExtension
                        ]
                    ], 400);
                }
            }
            
            // Les données sont maintenant des tableaux associatifs
            $headers = array_keys($data[0]);

            // Debug: Log des headers détectés
            \Log::info('Headers détectés', [
                'headers' => $headers,
                'data_sample' => !empty($data) ? $data[0] : null,
                'file_name' => $file->getClientOriginalName()
            ]);

            // Mapper les colonnes françaises vers les colonnes anglaises
            $columnMapping = [
                'prenom' => 'first_name',
                'prénom' => 'first_name',
                'nom' => 'last_name',
                'email' => 'email',
                'matricule' => 'matricule',
                'promotion' => 'promotion_name',
                'etablissement' => 'etablissement_name',
                'ville' => 'ville_name',
                'ville_name' => 'ville_name',
                'groupe' => 'group_title',
                'option' => 'option_name'
            ];

            // Appliquer le mapping aux headers et aux données
            $mappedHeaders = [];
            foreach ($headers as $header) {
                $normalizedHeader = strtolower(trim($header));
                $mappedHeaders[] = $columnMapping[$normalizedHeader] ?? $normalizedHeader;
            }

            // Mapper les données
            $mappedData = [];
            foreach ($data as $row) {
                $mappedRow = [];
                foreach ($headers as $index => $originalHeader) {
                    $normalizedHeader = strtolower(trim($originalHeader));
                    $mappedKey = $columnMapping[$normalizedHeader] ?? $normalizedHeader;
                    $mappedRow[$mappedKey] = $row[$originalHeader] ?? '';
                }
                $mappedData[] = $mappedRow;
            }

            $data = $mappedData;
            $headers = $mappedHeaders;

            // Debug: Log des headers après mapping
            \Log::info('Headers après mapping', [
                'original_headers' => array_keys($data[0] ?? []),
                'mapped_headers' => $headers,
                'data_sample' => !empty($data) ? $data[0] : null
            ]);

            if (empty($data)) {
                return response()->json(['message' => 'File is empty'], 400);
            }
            
            // Vérifier si c'est l'ancienne structure et la convertir
            if ($this->isLegacyFormat($headers)) {
                $data = $this->convertLegacyFormat($data, $headers);
                $headers = ['matricule', 'first_name', 'last_name', 'email', 'password'];
            }

            // Définir les colonnes requises en fonction du mode
            if ($useDefaultValues) {
                $requiredColumns = ['matricule', 'first_name', 'last_name', 'email'];
                $optionalColumns = ['promotion_id', 'etablissement_id', 'ville_id', 'group_id', 'option_id']; // option_id est optionnel
            } else {
                // Mode importation complète - toutes les colonnes peuvent être dans le fichier
                $requiredColumns = ['matricule', 'first_name', 'last_name', 'email'];
                $optionalColumns = ['promotion_id', 'etablissement_id', 'ville_id', 'group_id', 'option_id'];
            }

            // Validation des colonnes requises
            foreach ($requiredColumns as $column) {
                if (!in_array($column, $headers)) {
                    return response()->json([
                        'message' => "Missing required column: {$column}",
                        'required_columns' => $requiredColumns,
                        'found_columns' => $headers,
                        'mode' => $useDefaultValues ? 'simplified' : 'complete'
                    ], 400);
                }
            }

            // Traitement des données
            $created = 0;
            $updated = 0;
            $errors = 0;
            $errorDetails = [];

            foreach ($data as $index => $studentData) {
                $lineNumber = $index + 2; // +2 car on compte l'en-tête et les index commencent à 0
                
                try {
                    // Validation des données de base
                    if (empty($studentData['matricule']) || empty($studentData['email'])) {
                        $errorDetails[] = [
                            'line' => $lineNumber,
                            'message' => 'Matricule and email are required'
                        ];
                        $errors++;
                        continue;
                    }

                    // Valider et préparer les données avec suggestions
                    $validationResult = $this->validateStudentData($studentData, $headers, $useDefaultValues, $defaultValues);
                    
                    if (!$validationResult['valid']) {
                        $errorDetails[] = [
                            'line' => $lineNumber,
                            'message' => $validationResult['message'],
                            'suggestions' => $validationResult['suggestions'] ?? []
                        ];
                        $errors++;
                        continue;
                    }
                    
                    $dataToSave = $validationResult['data'];

                    // Vérifier si l'étudiant existe déjà
                    $existingStudent = Etudiant::where('matricule', $studentData['matricule'])
                                              ->orWhere('email', $studentData['email'])
                                              ->first();

                    // Gérer les doublons selon le mode configuré
                    if ($existingStudent) {
                        if ($duplicateMode === 'skip') {
                            continue; // Ignorer ce doublon
                        } elseif ($duplicateMode === 'error') {
                            $errorDetails[] = [
                                'line' => $lineNumber,
                                'message' => 'Duplicate student found: ' . $studentData['matricule']
                            ];
                            $errors++;
                            continue;
                        }
                        // Mode 'update' - continuer avec la mise à jour
                    }

                    if ($existingStudent) {
                        // Mettre à jour l'étudiant existant
                        $existingStudent->update($dataToSave);
                        $updated++;
                    } else {
                        // Créer un nouvel étudiant
                        Etudiant::create($dataToSave);
                        $created++;
                    }

                } catch (\Exception $e) {
                    \Log::error('Erreur lors du traitement de la ligne ' . $lineNumber . ': ' . $e->getMessage());
                    $errorDetails[] = [
                        'line' => $lineNumber,
                        'message' => $e->getMessage()
                    ];
                    $errors++;
                }
            }

            // Log des résultats pour débogage
            \Log::info('Import terminé', [
                'total_processed' => count($data),
                'created' => $created,
                'updated' => $updated,
                'errors' => $errors,
                'file_name' => $file->getClientOriginalName()
            ]);

            // Réponse de succès
            return response()->json([
                'message' => 'Import completed successfully',
                'summary' => [
                    'total_processed' => count($data),
                    'created' => $created,
                    'updated' => $updated,
                    'errors' => $errors
                ],
                'error_details' => $errorDetails,
                'status' => 200
            ], 200);

        } catch (\Exception $e) {
            \Log::error('Erreur lors de l\'importation: ' . $e->getMessage(), [
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'message' => 'Error processing file',
                'error' => $e->getMessage(),
                'error_type' => get_class($e),
                'debug_info' => [
                    'file_name' => $file->getClientOriginalName(),
                    'file_size' => $file->getSize(),
                    'extension' => $fileExtension
                ]
            ], 500);
        }
    }

    /**
     * Export students to CSV file (compatible with Excel)
     */
    public function exportEtudiants(Request $request)
    {
        try {
            // Construire la requête avec les relations
            $query = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);
            
            // Appliquer les filtres
            if ($request->has('searchValue') && !empty($request->get('searchValue'))) {
                $searchValue = $request->get('searchValue');
                $query->where(function($q) use ($searchValue) {
                    $q->where('first_name', 'LIKE', "%{$searchValue}%")
                      ->orWhere('last_name', 'LIKE', "%{$searchValue}%")
                      ->orWhere('email', 'LIKE', "%{$searchValue}%")
                      ->orWhere('matricule', 'LIKE', "%{$searchValue}%");
                });
            }
            
            if ($request->has('promotion_id') && !empty($request->get('promotion_id'))) {
                $query->where('promotion_id', $request->get('promotion_id'));
            }
            
            if ($request->has('group_id') && !empty($request->get('group_id'))) {
                $query->where('group_id', $request->get('group_id'));
            }
            
            if ($request->has('ville_id') && !empty($request->get('ville_id'))) {
                $query->where('ville_id', $request->get('ville_id'));
            }
            
            if ($request->has('etablissement_id') && !empty($request->get('etablissement_id'))) {
                $query->where('etablissement_id', $request->get('etablissement_id'));
            }
            
            if ($request->has('option_id') && !empty($request->get('option_id'))) {
                $query->where('option_id', $request->get('option_id'));
            }

            // Récupérer les étudiants
            $etudiants = $query->get();

            // Debug: Log le nombre d'étudiants trouvés
            \Log::info('Export étudiants - Nombre trouvé: ' . $etudiants->count());

            // Si aucun étudiant trouvé, créer des données d'exemple pour le test
            if ($etudiants->count() === 0) {
                \Log::info('Aucun étudiant trouvé - Création de données d\'exemple');
                $etudiants = collect([
                    (object) [
                        'id' => 'DEMO',
                        'matricule' => 'DEMO001',
                        'first_name' => 'Test',
                        'last_name' => 'Export',
                        'email' => 'test@example.com',
                        'promotion' => (object) ['name' => 'Test Promotion'],
                        'group' => (object) ['title' => 'Test Groupe'],
                        'ville' => (object) ['name' => 'Test Ville'],
                        'etablissement' => (object) ['name' => 'Test Établissement'],
                        'option' => (object) ['name' => 'Test Option'],
                        'created_at' => now(),
                        'updated_at' => now()
                    ]
                ]);
            }

            // Créer le contenu CSV
            $csvContent = [];
            
            // En-têtes - TOUJOURS inclus
            $headers = [
                'ID',
                'Matricule', 
                'Prénom',
                'Nom',
                'Email',
                'Promotion',
                'Groupe',
                'Ville',
                'Établissement',
                'Option',
                'Date de création',
                'Dernière modification'
            ];
            
            $csvContent[] = $headers;

            // Données des étudiants
            foreach ($etudiants as $etudiant) {
                $csvContent[] = [
                    $etudiant->id,
                    $etudiant->matricule,
                    $etudiant->first_name,
                    $etudiant->last_name,
                    $etudiant->email,
                    $etudiant->promotion ? $etudiant->promotion->name : 'N/A',
                    $etudiant->group ? $etudiant->group->title : 'N/A',
                    $etudiant->ville ? $etudiant->ville->name : 'N/A',
                    $etudiant->etablissement ? $etudiant->etablissement->name : 'N/A',
                    $etudiant->option ? $etudiant->option->name : 'N/A',
                    $etudiant->created_at ? $etudiant->created_at->format('d/m/Y H:i') : 'N/A',
                    $etudiant->updated_at ? $etudiant->updated_at->format('d/m/Y H:i') : 'N/A'
                ];
            }

            // Ajouter des informations de rapport
            $csvContent[] = []; // Ligne vide
            $csvContent[] = ['=== INFORMATIONS DU RAPPORT ==='];
            $csvContent[] = ['Rapport généré le', now()->format('d/m/Y à H:i:s')];
            $csvContent[] = ['Nombre total d\'étudiants', count($etudiants)];
            $csvContent[] = ['Filtres appliqués', $this->getAppliedFiltersText($request)];

            // Debug: Log le contenu CSV avant écriture
            \Log::info('Export étudiants - Contenu CSV:', ['lines' => count($csvContent), 'first_few' => array_slice($csvContent, 0, 3)]);

            // Générer le fichier CSV avec nom descriptif
            $fileName = 'Etudiants_UM6SS_' . now()->format('Y-m-d_H-i-s') . '.csv';
            $tempFile = tempnam(sys_get_temp_dir(), $fileName);

            \Log::info('Export étudiants - Fichier temporaire: ' . $tempFile);

            $file = fopen($tempFile, 'w');
            
            if (!$file) {
                throw new \Exception('Impossible de créer le fichier temporaire: ' . $tempFile);
            }
            
            // Ajouter BOM pour UTF-8 (pour que Excel reconnaisse les accents)
            fwrite($file, "\xEF\xBB\xBF");
            
            // Écrire les données CSV
            foreach ($csvContent as $row) {
                $result = fputcsv($file, $row, ';'); // Utiliser ';' comme séparateur pour Excel français
                if ($result === false) {
                    \Log::error('Erreur lors de l\'écriture de la ligne CSV: ' . json_encode($row));
                }
            }
            
            // IMPORTANT: Forcer l'écriture sur le disque
            fflush($file);
            fclose($file);
            
            // Vérifier que le fichier a bien été créé et n'est pas vide
            if (!file_exists($tempFile)) {
                throw new \Exception('Le fichier temporaire n\'a pas été créé correctement');
            }
            
            $fileSize = filesize($tempFile);
            \Log::info('Export étudiants - Taille du fichier: ' . $fileSize . ' bytes');
            
            if ($fileSize === 0) {
                throw new \Exception('Le fichier généré est vide');
            }
            
            // Debug: Lire le début du fichier pour vérifier le contenu
            $fileContent = file_get_contents($tempFile, false, null, 0, 200);
            \Log::info('Export étudiants - Début du contenu: ' . substr($fileContent, 0, 100));

            // Retourner le fichier en téléchargement avec headers optimisés
            return response()->download($tempFile, $fileName, [
                'Content-Type' => 'application/csv',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Content-Length' => $fileSize,
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ])->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de l\'exportation',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Générer le texte des filtres appliqués
     */
    private function getAppliedFiltersText(Request $request): string
    {
        $filters = [];
        
        if ($request->has('searchValue') && !empty($request->get('searchValue'))) {
            $filters[] = 'Recherche: ' . $request->get('searchValue');
        }
        
        if ($request->has('promotion_id') && !empty($request->get('promotion_id'))) {
            $promotion = \App\Models\Promotion::find($request->get('promotion_id'));
            $filters[] = 'Promotion: ' . ($promotion ? $promotion->name : 'ID ' . $request->get('promotion_id'));
        }
        
        if ($request->has('group_id') && !empty($request->get('group_id'))) {
            $group = \App\Models\Group::find($request->get('group_id'));
            $filters[] = 'Groupe: ' . ($group ? $group->title : 'ID ' . $request->get('group_id'));
        }
        
        if ($request->has('ville_id') && !empty($request->get('ville_id'))) {
            $ville = \App\Models\Ville::find($request->get('ville_id'));
            $filters[] = 'Ville: ' . ($ville ? $ville->name : 'ID ' . $request->get('ville_id'));
        }
        
        if ($request->has('etablissement_id') && !empty($request->get('etablissement_id'))) {
            $etablissement = \App\Models\Etablissement::find($request->get('etablissement_id'));
            $filters[] = 'Établissement: ' . ($etablissement ? $etablissement->name : 'ID ' . $request->get('etablissement_id'));
        }
        
        if ($request->has('option_id') && !empty($request->get('option_id'))) {
            $option = \App\Models\Option::find($request->get('option_id'));
            $filters[] = 'Option: ' . ($option ? $option->name : 'ID ' . $request->get('option_id'));
        }

        return empty($filters) ? 'Aucun filtre appliqué' : implode(', ', $filters);
    }

    /**
     * Test method to check students data for export
     */
    public function testExportEtudiants(Request $request)
    {
        try {
            // Construire la requête avec les relations
            $query = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);
            
            // Récupérer les étudiants
            $etudiants = $query->get();
            
            return response()->json([
                'success' => true,
                'total_etudiants' => $etudiants->count(),
                'sample_data' => $etudiants->take(3)->map(function($etudiant) {
                    return [
                        'id' => $etudiant->id,
                        'matricule' => $etudiant->matricule,
                        'first_name' => $etudiant->first_name,
                        'last_name' => $etudiant->last_name,
                        'email' => $etudiant->email,
                        'promotion' => $etudiant->promotion ? $etudiant->promotion->name : null,
                        'group' => $etudiant->group ? $etudiant->group->title : null,
                        'ville' => $etudiant->ville ? $etudiant->ville->name : null,
                        'etablissement' => $etudiant->etablissement ? $etudiant->etablissement->name : null,
                        'option' => $etudiant->option ? $etudiant->option->name : null,
                    ];
                }),
                'message' => 'Test réussi - ' . $etudiants->count() . ' étudiants trouvés'
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
                'message' => 'Erreur lors du test'
            ], 500);
        }
    }

    /**
     * Export students using streaming response (alternative method)
     */
    public function exportEtudiantsStream(Request $request)
    {
        try {
            // Construire la requête avec les relations
            $query = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);
            
            // Appliquer les filtres (même logique que la méthode principale)
            if ($request->has('searchValue') && !empty($request->get('searchValue'))) {
                $searchValue = $request->get('searchValue');
                $query->where(function($q) use ($searchValue) {
                    $q->where('first_name', 'LIKE', "%{$searchValue}%")
                      ->orWhere('last_name', 'LIKE', "%{$searchValue}%")
                      ->orWhere('email', 'LIKE', "%{$searchValue}%")
                      ->orWhere('matricule', 'LIKE', "%{$searchValue}%");
                });
            }
            
            if ($request->has('promotion_id') && !empty($request->get('promotion_id'))) {
                $query->where('promotion_id', $request->get('promotion_id'));
            }
            
            if ($request->has('group_id') && !empty($request->get('group_id'))) {
                $query->where('group_id', $request->get('group_id'));
            }
            
            if ($request->has('ville_id') && !empty($request->get('ville_id'))) {
                $query->where('ville_id', $request->get('ville_id'));
            }
            
            if ($request->has('etablissement_id') && !empty($request->get('etablissement_id'))) {
                $query->where('etablissement_id', $request->get('etablissement_id'));
            }
            
            if ($request->has('option_id') && !empty($request->get('option_id'))) {
                $query->where('option_id', $request->get('option_id'));
            }

            // Récupérer les étudiants
            $etudiants = $query->get();

            // Nom du fichier
            $fileName = 'etudiants_' . now()->format('Y-m-d_H-i-s') . '.csv';

            // Utiliser une réponse en streaming
            return response()->stream(function() use ($etudiants, $request) {
                $handle = fopen('php://output', 'w');
                
                // BOM pour UTF-8
                fwrite($handle, "\xEF\xBB\xBF");
                
                // En-têtes
                fputcsv($handle, [
                    'ID', 'Matricule', 'Prénom', 'Nom', 'Email', 
                    'Promotion', 'Groupe', 'Ville', 'Établissement', 'Option',
                    'Date de création', 'Dernière modification'
                ], ';');
                
                // Données des étudiants
                foreach ($etudiants as $etudiant) {
                    fputcsv($handle, [
                        $etudiant->id,
                        $etudiant->matricule,
                        $etudiant->first_name,
                        $etudiant->last_name,
                        $etudiant->email,
                        $etudiant->promotion ? $etudiant->promotion->name : 'N/A',
                        $etudiant->group ? $etudiant->group->title : 'N/A',
                        $etudiant->ville ? $etudiant->ville->name : 'N/A',
                        $etudiant->etablissement ? $etudiant->etablissement->name : 'N/A',
                        $etudiant->option ? $etudiant->option->name : 'N/A',
                        $etudiant->created_at ? $etudiant->created_at->format('d/m/Y H:i') : 'N/A',
                        $etudiant->updated_at ? $etudiant->updated_at->format('d/m/Y H:i') : 'N/A'
                    ], ';');
                }
                
                // Informations du rapport
                fputcsv($handle, [], ';'); // Ligne vide
                fputcsv($handle, ['=== INFORMATIONS DU RAPPORT ==='], ';');
                fputcsv($handle, ['Rapport généré le', now()->format('d/m/Y à H:i:s')], ';');
                fputcsv($handle, ['Nombre total d\'étudiants', $etudiants->count()], ';');
                fputcsv($handle, ['Filtres appliqués', $this->getAppliedFiltersText($request)], ';');
                
                fclose($handle);
            }, 200, [
                'Content-Type' => 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
                'Cache-Control' => 'no-cache, no-store, must-revalidate',
                'Pragma' => 'no-cache',
                'Expires' => '0'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de l\'exportation en streaming',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Export ultra-simple for testing - Must work
     */
    public function exportSimple(Request $request)
    {
        // Méthode streaming ultra-simple
        $fileName = 'test_export_' . now()->format('Y-m-d_H-i-s') . '.csv';

        return response()->stream(function() {
            echo "\xEF\xBB\xBF"; // BOM UTF-8
            echo "ID;Matricule;Prénom;Nom;Email\n";
            echo "1;MAT001;Ahmed;Benali;ahmed@test.com\n";
            echo "2;MAT002;Fatima;Alami;fatima@test.com\n";
            echo "3;MAT003;Mohamed;Rachid;mohamed@test.com\n";
            echo "\n";
            echo "=== INFORMATIONS ===\n";
            echo "Fichier de test généré le;" . now()->format('d/m/Y à H:i:s') . "\n";
            echo "Type;Export de test ultra-simple\n";
        }, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $fileName . '"',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Pragma' => 'no-cache',
            'Expires' => '0'
        ]);
    }

    /**
     * Parser un fichier Excel (méthode alternative sans PhpSpreadsheet)
     */
    private function parseExcelFile($filePath)
    {
        try {
            // Vérifier si PhpSpreadsheet est disponible
            if (class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
                return $this->parseExcelWithPhpSpreadsheet($filePath);
            }

            // Fallback: essayer avec SimpleXLSX si disponible
            if (class_exists('\SimpleXLSX')) {
                return $this->parseExcelWithSimpleXLSX($filePath);
            }

            // Dernier recours: essayer la conversion LibreOffice
            $csvPath = $this->convertExcelToCsv($filePath);
            if ($csvPath && file_exists($csvPath)) {
                $result = $this->parseCsvFile($csvPath);
                // Nettoyer le fichier temporaire
                unlink($csvPath);
                return $result;
            }

            // Si rien ne fonctionne, essayer une approche basique avec XML
            return $this->parseExcelBasic($filePath);

        } catch (\Exception $e) {
            \Log::error('Erreur lors du parsing Excel: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Parser Excel avec PhpSpreadsheet
     */
    private function parseExcelWithPhpSpreadsheet($filePath)
    {
        try {
            $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
            $reader->setReadDataOnly(true);
            $spreadsheet = $reader->load($filePath);
            $worksheet = $spreadsheet->getActiveSheet();
            
            $data = [];
            $highestRow = $worksheet->getHighestRow();
            $highestColumn = $worksheet->getHighestColumn();
            
            // Lire la première ligne pour les en-têtes
            $headers = [];
            for ($col = 'A'; $col <= $highestColumn; $col++) {
                $cellValue = $worksheet->getCell($col . '1')->getCalculatedValue();
                $headers[] = $cellValue ?? '';
            }
            
            // Lire les données en créant des tableaux associatifs
            for ($row = 2; $row <= $highestRow; $row++) {
                $rowData = [];
                for ($colIndex = 0; $colIndex < count($headers); $colIndex++) {
                    $col = $this->numberToColumn($colIndex + 1);
                    $cellValue = $worksheet->getCell($col . $row)->getCalculatedValue();
                    $rowData[$headers[$colIndex]] = $cellValue ?? '';
                }
                $data[] = $rowData;
            }
            
            return $data;
            
        } catch (\Exception $e) {
            \Log::error('Erreur PhpSpreadsheet: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Parser Excel avec SimpleXLSX
     */
    private function parseExcelWithSimpleXLSX($filePath)
    {
        try {
            $xlsx = new \SimpleXLSX($filePath);
            if ($xlsx->success()) {
                $rows = $xlsx->rows();
                if (empty($rows)) {
                    return [];
                }
                
                // Première ligne = en-têtes
                $headers = array_map('strtolower', array_map('trim', $rows[0]));
                
                // Convertir les données en tableaux associatifs
                $data = [];
                for ($i = 1; $i < count($rows); $i++) {
                    $rowData = [];
                    for ($j = 0; $j < count($headers); $j++) {
                        $rowData[$headers[$j]] = $rows[$i][$j] ?? '';
                    }
                    $data[] = $rowData;
                }
                
                return $data;
            }
            return [];
            
        } catch (\Exception $e) {
            \Log::error('Erreur SimpleXLSX: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Parser Excel basique pour les fichiers .xlsx (format XML)
     */
    private function parseExcelBasic($filePath)
    {
        try {
            // Vérifier si c'est un fichier .xlsx
            if (!file_exists($filePath)) {
                \Log::error('Fichier Excel non trouvé: ' . $filePath);
                return [];
            }

            $zip = new \ZipArchive();
            if ($zip->open($filePath) !== TRUE) {
                \Log::error('Impossible d\'ouvrir le fichier Excel: ' . $filePath);
                return [];
            }

            // Lire le fichier sharedStrings.xml pour les chaînes partagées
            $sharedStrings = $zip->getFromName('xl/sharedStrings.xml');
            $strings = [];
            if ($sharedStrings) {
                // Parser les chaînes partagées
                $dom = new \DOMDocument();
                $dom->loadXML($sharedStrings);
                $siElements = $dom->getElementsByTagName('si');
                foreach ($siElements as $si) {
                    $tElements = $si->getElementsByTagName('t');
                    if ($tElements->length > 0) {
                        $strings[] = $tElements->item(0)->nodeValue;
                    }
                }
            }

            // Lire le fichier worksheet
            $worksheet = $zip->getFromName('xl/worksheets/sheet1.xml');
            if (!$worksheet) {
                $zip->close();
                \Log::error('Impossible de lire le worksheet Excel');
                return [];
            }

            $dom = new \DOMDocument();
            $dom->loadXML($worksheet);
            $cells = $dom->getElementsByTagName('c');
            
            $rows = [];
            $maxRow = 0;
            $maxCol = 0;
            
            foreach ($cells as $cell) {
                $r = $cell->getAttribute('r');
                if (preg_match('/^([A-Z]+)(\d+)$/', $r, $matches)) {
                    $col = $matches[1];
                    $row = (int)$matches[2];
                    
                    $vElement = $cell->getElementsByTagName('v');
                    if ($vElement->length > 0) {
                        $value = $vElement->item(0)->nodeValue;
                        
                        // Si c'est une référence à sharedStrings
                        if ($cell->getAttribute('t') === 's' && isset($strings[$value])) {
                            $value = $strings[$value];
                        }
                        
                        if (!isset($rows[$row])) {
                            $rows[$row] = [];
                        }
                        $rows[$row][$col] = $value;
                        $maxRow = max($maxRow, $row);
                        $maxCol = max($maxCol, $this->columnToNumber($col));
                    }
                }
            }
            
            $zip->close();
            
            // Convertir en tableau associatif
            $data = [];
            if (!empty($rows[1])) {
                // Première ligne = en-têtes
                $headers = [];
                for ($colNum = 1; $colNum <= $maxCol; $colNum++) {
                    $col = $this->numberToColumn($colNum);
                    $headers[] = strtolower(trim($rows[1][$col] ?? ''));
                }
                
                // Lire les données en créant des tableaux associatifs
                for ($row = 2; $row <= $maxRow; $row++) {
                    $rowData = [];
                    for ($colIndex = 0; $colIndex < count($headers); $colIndex++) {
                        $colNum = $colIndex + 1;
                        $col = $this->numberToColumn($colNum);
                        $rowData[$headers[$colIndex]] = $rows[$row][$col] ?? '';
                    }
                    $data[] = $rowData;
                }
            }
            
            return $data;
            
        } catch (\Exception $e) {
            \Log::error('Erreur parsing Excel basique: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Convertir une colonne Excel en numéro
     */
    private function columnToNumber($column)
    {
        $number = 0;
        $length = strlen($column);
        for ($i = 0; $i < $length; $i++) {
            $number = $number * 26 + (ord($column[$i]) - ord('A') + 1);
        }
        return $number;
    }

    /**
     * Convertir un numéro en colonne Excel
     */
    private function numberToColumn($number)
    {
        $column = '';
        while ($number > 0) {
            $remainder = ($number - 1) % 26;
            $column = chr(ord('A') + $remainder) . $column;
            $number = intval(($number - 1) / 26);
        }
        return $column;
    }

    /**
     * Méthode alternative pour traiter les fichiers Excel via conversion CSV
     */
    private function convertExcelToCsv($filePath)
    {
        try {
            // Créer un fichier CSV temporaire
            $tempCsvPath = tempnam(sys_get_temp_dir(), 'excel_convert_') . '.csv';
            
            // Utiliser LibreOffice pour la conversion (si disponible)
            $command = "libreoffice --headless --convert-to csv --outdir " . dirname($tempCsvPath) . " " . escapeshellarg($filePath);
            
            $output = [];
            $returnCode = 0;
            exec($command, $output, $returnCode);
            
            if ($returnCode === 0 && file_exists($tempCsvPath)) {
                return $tempCsvPath;
            }
            
            // Fallback : essayer avec d'autres outils de conversion
            return null;
            
        } catch (\Exception $e) {
            \Log::error('Erreur lors de la conversion Excel: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Parser un fichier CSV/TXT en tableau associatif
     */
    private function parseCsvFile($uploadedFile)
    {
        try {
            $path = is_string($uploadedFile) ? $uploadedFile : $uploadedFile->getRealPath();
            
            // Détecter l'encodage du fichier
            $content = file_get_contents($path);
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            
            // Si ce n'est pas UTF-8, convertir
            if ($encoding && $encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
                // Réécrire le fichier temporairement avec le bon encodage
                $tempPath = tempnam(sys_get_temp_dir(), 'csv_utf8_');
                file_put_contents($tempPath, $content);
                $path = $tempPath;
            }
            
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return [];
            }

            // Détecter le délimiteur
            $firstLine = fgets($handle);
            if ($firstLine === false) {
                fclose($handle);
                return [];
            }
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);

            // Lire l'entête
            $headers = fgetcsv($handle, 0, $delimiter);
            if (!$headers) {
                fclose($handle);
                return [];
            }
            $headers = array_map('trim', $headers);
            $headers = array_map('strtolower', $headers);

            $rows = [];
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                if (count($row) === 1 && trim($row[0]) === '') {
                    continue; // ignorer lignes vides
                }
                // Ajuster la ligne à la taille des headers
                if (count($row) < count($headers)) {
                    $row = array_pad($row, count($headers), null);
                } elseif (count($row) > count($headers)) {
                    $row = array_slice($row, 0, count($headers));
                }
                
                // Nettoyer chaque valeur pour éviter les problèmes d'encodage
                $cleanRow = array_map(function($value) {
                    if ($value === null) return null;
                    // Supprimer les caractères de contrôle et normaliser
                    $value = preg_replace('/[\x00-\x1F\x7F]/', '', $value);
                    return trim($value);
                }, $row);
                
                $assoc = array_combine($headers, $cleanRow);
                if ($assoc !== false) {
                    $rows[] = $assoc;
                }
            }

            fclose($handle);
            
            // Nettoyer le fichier temporaire si créé
            if (isset($tempPath) && file_exists($tempPath)) {
                unlink($tempPath);
            }
            
            return $rows;
        } catch (\Exception $e) {
            \Log::error('Erreur parseCsvFile: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Vérifier si c'est l'ancienne structure de données
     */
    private function isLegacyFormat($headers): bool
    {
        $legacyHeaders = ['matricule', 'name', 'promotion', 'faculte', 'groupe'];
        return count(array_intersect($headers, $legacyHeaders)) >= 3;
    }

    /**
     * Convertir l'ancienne structure vers la nouvelle
     */
    private function convertLegacyFormat($data, $headers): array
    {
        $convertedData = [];
        
        foreach ($data as $row) {
            if (count($row) < count($headers)) {
                continue; // Ignorer les lignes incomplètes
            }
            
            $rowData = array_combine($headers, $row);
            
            // Extraire prénom et nom du champ "name"
            $fullName = trim($rowData['name'] ?? '');
            $nameParts = explode(' ', $fullName, 2);
            $firstName = $nameParts[0] ?? '';
            $lastName = $nameParts[1] ?? '';
            
            // Générer un email basé sur le matricule
            $matricule = trim($rowData['matricule'] ?? '');
            $email = strtolower($firstName . '.' . $lastName . '@etudiant.um6ss.ma');
            $email = str_replace(' ', '', $email); // Supprimer les espaces
            
            $convertedData[] = [
                'matricule' => $matricule,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $email,
                'password' => 'password123' // Mot de passe par défaut
            ];
        }
        
        return $convertedData;
    }

    /**
     * Valider les données d'un étudiant avec suggestions de correction
     */
    private function validateStudentData($studentData, $headers, $useDefaultValues, $defaultValues)
    {
        $errors = [];
        $suggestions = [];
        $data = [];
        
        // Validation des champs obligatoires
        if (empty($studentData['matricule'])) {
            $errors[] = 'Le matricule est obligatoire';
        } else {
            $data['matricule'] = $studentData['matricule'];
        }
        
        if (empty($studentData['first_name'])) {
            $errors[] = 'Le prénom est obligatoire';
        } else {
            $data['first_name'] = $studentData['first_name'];
        }
        
        if (empty($studentData['last_name'])) {
            $errors[] = 'Le nom est obligatoire';
        } else {
            $data['last_name'] = $studentData['last_name'];
        }
        
        if (empty($studentData['email'])) {
            $errors[] = 'L\'email est obligatoire';
        } else {
            $data['email'] = $studentData['email'];
        }
        
        $data['password'] = 'password123'; // Mot de passe en clair pour éviter les timeouts
        
        // Mapping des noms vers les IDs pour les relations
        $relationMapping = [
            'promotion_name' => 'promotion_id',
            'etablissement_name' => 'etablissement_id',
            'ville_name' => 'ville_id',
            'group_title' => 'group_id',
            'option_name' => 'option_id'
        ];
        
        // Validation des relations avec suggestions
        $relations = ['promotion_id', 'etablissement_id', 'ville_id', 'group_id', 'option_id'];
        
        foreach ($relations as $relation) {
            $value = null;
            $suggestion = null;
            
            if ($useDefaultValues && isset($defaultValues[$relation]) && !empty($defaultValues[$relation])) {
                // Utiliser la valeur par défaut quand useDefaultValues est true
                $value = (int) $defaultValues[$relation];
            } else {
                // Chercher d'abord l'ID direct dans les données
                if (in_array($relation, $headers) && !empty($studentData[$relation])) {
                    $value = $this->validateRelationValue($relation, $studentData[$relation], $suggestion);
                } else {
                    // Chercher le nom correspondant et le convertir en ID
                    $nameField = array_search($relation, $relationMapping);
                    if ($nameField && in_array($nameField, $headers) && !empty($studentData[$nameField])) {
                        $value = $this->validateRelationValue($relation, $studentData[$nameField], $suggestion);
                    } elseif ($relation === 'option_id') {
                        // Option est toujours optionnelle
                        $value = null;
                    } else {
                        // Champ manquant seulement si pas de valeur par défaut
                        if (!$useDefaultValues || !isset($defaultValues[$relation]) || empty($defaultValues[$relation])) {
                            $errors[] = "Le champ {$relation} est manquant";
                            $suggestion = $this->getRelationSuggestions($relation);
                        }
                    }
                }
            }
            
            if ($suggestion) {
                $suggestions[$relation] = $suggestion;
            }
            
            $data[$relation] = $value;
        }
        
        return [
            'valid' => empty($errors),
            'message' => implode(', ', $errors),
            'suggestions' => $suggestions,
            'data' => $data
        ];
    }
    
    /**
     * Valider une valeur de relation et suggérer des corrections
     */
    private function validateRelationValue($relation, $value, &$suggestion)
    {
        $suggestion = null;
        
        switch ($relation) {
            case 'promotion_id':
                if (is_numeric($value)) {
                    $promotion = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->find($value);
                    if ($promotion) {
                        return (int) $value;
                    }
                }
                // Chercher par nom avec normalisation (même logique que le frontend)
                $normalizedValue = $this->normalizeString($value);
                $promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->get();
                
                foreach ($promotions as $promotion) {
                    $normalizedPromotionName = $this->normalizeString($promotion->name);
                    if ($normalizedPromotionName === $normalizedValue || 
                        strpos($normalizedPromotionName, $normalizedValue) !== false || 
                        strpos($normalizedValue, $normalizedPromotionName) !== false ||
                        // Recherche par chiffre initial (ex: "4ème" -> "4ème année")
                        (preg_match('/^\d+/', $normalizedValue, $valueMatches) && 
                         preg_match('/^\d+/', $normalizedPromotionName, $promotionMatches) && 
                         $valueMatches[0] === $promotionMatches[0])) {
                        return $promotion->id;
                    }
                }
                $suggestion = $this->getPromotionSuggestions($value);
                return null;
                
            case 'etablissement_id':
                if (is_numeric($value)) {
                    $etablissement = \App\Models\Etablissement::find($value);
                    if ($etablissement) {
                        return (int) $value;
                    }
                }
                $etablissement = \App\Models\Etablissement::where('name', 'like', '%' . $value . '%')->first();
                if ($etablissement) {
                    return $etablissement->id;
                }
                $suggestion = $this->getEtablissementSuggestions($value);
                return null;
                
            case 'ville_id':
                if (is_numeric($value)) {
                    $ville = \App\Models\Ville::find($value);
                    if ($ville) {
                        return (int) $value;
                    }
                }
                $ville = \App\Models\Ville::where('name', 'like', '%' . $value . '%')->first();
                if ($ville) {
                    return $ville->id;
                }
                $suggestion = $this->getVilleSuggestions($value);
                return null;
                
            case 'group_id':
                if (is_numeric($value)) {
                    $group = \App\Models\Group::find($value);
                    if ($group) {
                        return (int) $value;
                    }
                }
                $group = \App\Models\Group::where('title', 'like', '%' . $value . '%')->first();
                if ($group) {
                    return $group->id;
                }
                $suggestion = $this->getGroupSuggestions($value);
                return null;
                
            case 'option_id':
                if (empty($value)) {
                    return null; // Optionnel
                }
                if (is_numeric($value)) {
                    $option = \App\Models\Option::find($value);
                    if ($option) {
                        return (int) $value;
                    }
                }
                $option = \App\Models\Option::where('name', 'like', '%' . $value . '%')->first();
                if ($option) {
                    return $option->id;
                }
                $suggestion = $this->getOptionSuggestions($value);
                return null;
        }
        
        return null;
    }
    
    /**
     * Obtenir des suggestions pour les promotions
     */
    private function getPromotionSuggestions($value)
    {
        $promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->get();
        $suggestions = [];
        
        foreach ($promotions as $promotion) {
            $similarity = similar_text(strtolower($value), strtolower($promotion->name));
            if ($similarity > 3) { // Seuil de similarité
                $suggestions[] = "ID {$promotion->id}: {$promotion->name}";
            }
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucune promotion trouvée';
    }
    
    /**
     * Obtenir des suggestions pour les établissements
     */
    private function getEtablissementSuggestions($value)
    {
        $etablissements = \App\Models\Etablissement::all();
        $suggestions = [];
        
        foreach ($etablissements as $etablissement) {
            $similarity = similar_text(strtolower($value), strtolower($etablissement->name));
            if ($similarity > 3) {
                $suggestions[] = "ID {$etablissement->id}: {$etablissement->name}";
            }
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucun établissement trouvé';
    }
    
    /**
     * Obtenir des suggestions pour les villes
     */
    private function getVilleSuggestions($value)
    {
        $villes = \App\Models\Ville::all();
        $suggestions = [];
        
        foreach ($villes as $ville) {
            $similarity = similar_text(strtolower($value), strtolower($ville->name));
            if ($similarity > 3) {
                $suggestions[] = "ID {$ville->id}: {$ville->name}";
            }
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucune ville trouvée';
    }
    
    /**
     * Obtenir des suggestions pour les groupes
     */
    private function getGroupSuggestions($value)
    {
        $groups = \App\Models\Group::all();
        $suggestions = [];
        
        foreach ($groups as $group) {
            $similarity = similar_text(strtolower($value), strtolower($group->title));
            if ($similarity > 3) {
                $suggestions[] = "ID {$group->id}: {$group->title}";
            }
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucun groupe trouvé';
    }
    
    /**
     * Obtenir des suggestions pour les options
     */
    private function getOptionSuggestions($value)
    {
        $options = \App\Models\Option::all();
        $suggestions = [];
        
        foreach ($options as $option) {
            $similarity = similar_text(strtolower($value), strtolower($option->name));
            if ($similarity > 3) {
                $suggestions[] = "ID {$option->id}: {$option->name}";
            }
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucune option trouvée';
    }
    
    /**
     * Normaliser une chaîne de caractères (même logique que le frontend)
     */
    private function normalizeString($value)
    {
        if (empty($value)) {
            return '';
        }
        
        return mb_strtolower(
            preg_replace('/\p{Diacritic}/u', '', 
                Normalizer::normalize($value, Normalizer::FORM_D)
            )
        );
    }

    /**
     * Obtenir des suggestions générales pour une relation
     */
    private function getRelationSuggestions($relation)
    {
        switch ($relation) {
            case 'promotion_id':
                $promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->get();
                return 'Promotions disponibles: ' . $promotions->pluck('name')->implode(', ');
            case 'etablissement_id':
                $etablissements = \App\Models\Etablissement::all();
                return 'Établissements disponibles: ' . $etablissements->pluck('name')->implode(', ');
            case 'ville_id':
                $villes = \App\Models\Ville::all();
                return 'Villes disponibles: ' . $villes->pluck('name')->implode(', ');
            case 'group_id':
                $groups = \App\Models\Group::all();
                return 'Groupes disponibles: ' . $groups->pluck('title')->implode(', ');
            case 'option_id':
                $options = \App\Models\Option::all();
                return 'Options disponibles: ' . $options->pluck('name')->implode(', ');
        }
        return '';
    }

    /**
     * Supprimer plusieurs étudiants
     */
    public function deleteMultiple(Request $request)
    {
        try {
            // Validation des données
            $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'required|integer|exists:etudiants,id'
            ]);

            $ids = $request->input('ids');
            $deletedCount = 0;
            $errors = [];

            // Supprimer chaque étudiant
            foreach ($ids as $id) {
                try {
                    $etudiant = Etudiant::find($id);
                    
                    if ($etudiant) {
                        // Supprimer la photo si elle existe
                        if ($etudiant->photo) {
                            $photoPath = public_path($etudiant->photo);
                            if (file_exists($photoPath)) {
                                unlink($photoPath);
                            }
                        }
                        
                        // Supprimer l'étudiant
                        $etudiant->delete();
                        $deletedCount++;
                    } else {
                        $errors[] = "Étudiant avec l'ID {$id} non trouvé";
                    }
                } catch (\Exception $e) {
                    $errors[] = "Erreur lors de la suppression de l'étudiant ID {$id}: " . $e->getMessage();
                }
            }

            // Préparer la réponse
            $response = [
                'message' => "Suppression terminée",
                'deleted_count' => $deletedCount,
                'total_requested' => count($ids),
                'status' => 200
            ];

            // Ajouter les erreurs s'il y en a
            if (!empty($errors)) {
                $response['errors'] = $errors;
                $response['message'] = "Suppression partiellement terminée avec des erreurs";
            }

            return response()->json($response, 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression multiple',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }
}

