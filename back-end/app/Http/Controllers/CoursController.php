<?php

namespace App\Http\Controllers;

use App\Models\Cours;
use App\Services\AttendanceStateService;
use App\Services\CoursService;
use App\Services\UserContextService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use DateTime;   
use Carbon\Carbon;
use PDO;
use PDOException;

class CoursController extends Controller
{
    protected $attendanceStateService;
    protected $coursService;
    protected $userContextService;

    public function __construct(AttendanceStateService $attendanceStateService, CoursService $coursService, UserContextService $userContextService)
    {
        $this->attendanceStateService = $attendanceStateService;
        $this->coursService = $coursService;
        $this->userContextService = $userContextService;
    }
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $etablissement_id = $request->query('etablissement_id');
        $promotion_id = $request->query('promotion_id');
        $salle_id = $request->query('salle_id');
        $type_cours_id = $request->query('type_cours_id');
        $group_id = $request->query('group_id');
        $ville_id = $request->query('ville_id');
        $searchValue = $request->query('searchValue', '');
        $date = $request->query('date');

        $query = Cours::with(['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville'])
                        ->whereNull('archived_at'); // Exclure les cours archivés

        // Appliquer le filtrage par contexte utilisateur
        $userContext = $this->userContextService->getUserContext();
        
        // Si l'utilisateur n'est pas super-admin, appliquer les filtres de contexte
        if (!$this->userContextService->isSuperAdmin()) {
            if ($userContext['ville_id']) {
                $query->where('ville_id', $userContext['ville_id']);
            }
            if ($userContext['etablissement_id']) {
                $query->where('etablissement_id', $userContext['etablissement_id']);
            }
        }

        // Appliquer les filtres
        if (!empty($etablissement_id)) {
            $query->where('etablissement_id', $etablissement_id);
        }

        if (!empty($promotion_id)) {
            $query->where('promotion_id', $promotion_id);
        }

        if (!empty($salle_id)) {
            $query->where('salle_id', $salle_id);
        }

        if (!empty($type_cours_id)) {
            $query->where('type_cours_id', $type_cours_id);
        }

        if (!empty($group_id)) {
            $query->whereHas('groups', function($q) use ($group_id) {
                $q->where('groups.id', $group_id);
            });
        }

        if (!empty($ville_id)) {
            $query->where('ville_id', $ville_id);
        }

        if (!empty($searchValue)) {
            $query->where('name', 'LIKE', "%{$searchValue}%");
        }

        if (!empty($date)) {
            $query->whereDate('date', $date);
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $cours = $query->orderByDesc('created_at')
                      ->paginate($size, ['*'], 'page', $page);

        return response()->json([
            'data' => $cours->items(),
            'current_page' => $cours->currentPage(),
            'last_page' => $cours->lastPage(),
            'per_page' => $cours->perPage(),
            'total' => $cours->total()
        ]);
    }

    /**
     * Afficher un cours spécifique.
     */
    public function show($id)
    {
        $cours = Cours::with(['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville'])->find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }
        
        return response()->json($cours);
    }

    /**
     * Ajouter un nouveau cours.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'pointage_start_hour' => 'required|date_format:H:i',
            'heure_debut' => 'required|date_format:H:i',
            'heure_fin' => 'required|date_format:H:i|after:heure_debut',
            'tolerance' => 'required|date_format:H:i',
            'etablissement_id' => 'required|exists:etablissements,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_cours_id' => 'required|exists:types_cours,id',
            'salle_id' => 'required|exists:salles,id',
            'option_id' => 'nullable|exists:options,id',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
            'ville_id' => 'required|exists:villes,id',
            'annee_universitaire' => 'required|string|max:9'
        ]);

        // Extract group_ids from validated data
        $groupIds = $validatedData['group_ids'] ?? [];
        unset($validatedData['group_ids']); // Remove from main data
        
        $cours = Cours::create($validatedData);
        
        // Attach groups if provided
        if (!empty($groupIds)) {
            $cours->groups()->attach($groupIds);
        }
        
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville']);

        return response()->json(['message' => 'Cours ajouté avec succès', 'cours' => $cours], 201);
    }

    /**
     * Mettre à jour un cours.
     */
    public function update(Request $request, $id)
    {
        $cours = Cours::find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        // Vérifier si le cours est dans le passé
        $coursDate = new \DateTime($cours->date);
        $aujourdhui = new \DateTime();
        
        if ($coursDate < $aujourdhui) {
            return response()->json([
                'message' => 'Impossible de modifier un cours passé',
                'error' => 'PAST_COURS_MODIFICATION_FORBIDDEN'
            ], 403);
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'pointage_start_hour' => 'sometimes|date_format:H:i',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin' => 'sometimes|date_format:H:i|after:heure_debut',
            'tolerance' => 'sometimes|date_format:H:i',
            'etablissement_id' => 'sometimes|exists:etablissements,id',
            'promotion_id' => 'sometimes|exists:promotions,id',
            'type_cours_id' => 'sometimes|exists:types_cours,id',
            'salle_id' => 'sometimes|exists:salles,id',
            'option_id' => 'nullable|exists:options,id',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
            'ville_id' => 'sometimes|exists:villes,id',
            'annee_universitaire' => 'sometimes|string|max:9'
        ]);

        // Extract group_ids from validated data
        $groupIds = $validatedData['group_ids'] ?? null;
        unset($validatedData['group_ids']); // Remove from main data
        
        $cours->update($validatedData);
        
        // Sync groups if provided
        if (isset($groupIds)) {
            $cours->groups()->sync($groupIds);
        }
        
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville']);

        return response()->json(['message' => 'Cours mis à jour avec succès', 'cours' => $cours]);
    }

    // function ImportCourse(Request $request) {
    //     if ($request->hasFile('file')) {
    //         $file = $request->file('file');
    //         $path = $file->getRealPath();

    //         // Open the file for reading
    //         $handle = fopen($path, 'r');
    //         if ($handle === false) {
    //             return response()->json(['message' => 'Unable to open file'], 400);
    //         }
    //         $firstLine = fgets($handle);
    //         $delimiter = $this->detectDelimiter($firstLine);

    //         // Read the first line to get the headers
    //         $header = fgetcsv($handle, 0, $delimiter);

    //         // Ensure the header keys are trimmed and lowercased
    //         $header = array_map('trim', $header);
    //         $header = array_map('strtolower', $header);


    //         rewind($handle);

    //         // Parse the CSV file and insert data into the database
    //         while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
    //             $row = array_map('trim', $row);
    //             $coursData = array_combine($header, $row);
    //             return response()->json($coursData);

    //             // Cours::create([
    //             //     'title' => $coursData['title'],
    //             //     'date' => $coursData['date'],
    //             //     'hour_debut' => $coursData['hour_debut'],
    //             //     'hour_fin' => $coursData['hour_fin'],
    //             //     'faculte' => $coursData['faculte'],
    //             //     'promotion' => $coursData['promotion'],
    //             //     'groupe' => $coursData['groupe'],
    //             //     'option' => $coursData['option'] ?? null,
    //             //     'tolerance' => $coursData['tolerance'],
    //             // ]);
    //         }

    //         // Close the file
    //         fclose($handle);

    //         return response()->json(['message' => 'Cours imported successfully'], 200);
    //     }

    //     return response()->json(['message' => 'No file uploaded'], 400);
    // }

    /**
     * Import moderne des cours depuis un fichier Excel
     */
    public function importCoursModern(Request $request)
    {
        try {
            // Vérifier si des données JSON sont fournies directement
            if ($request->has('data')) {
                $coursesData = json_decode($request->input('data'), true);
                
                if (empty($coursesData)) {
                    return response()->json(['message' => 'Aucune donnée fournie'], 400);
                }
                
                // Utiliser le service CoursService pour l'import
                $results = $this->coursService->importCoursFromData($coursesData);
                
                return response()->json([
                    'message' => 'Importation terminée',
                    'summary' => [
                        'total_processed' => $results['total'],
                        'created' => $results['created'],
                        'updated' => $results['updated'],
                        'errors' => $results['errors']
                    ],
                    'error_details' => $results['error_details'] ?? []
                ]);
            }
            
            // Fallback pour les fichiers Excel
            if (!$request->hasFile('file')) {
                return response()->json(['message' => 'Aucun fichier fourni'], 400);
            }

            $file = $request->file('file');
            
            // Vérifier que c'est un fichier Excel
            $allowedMimes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
            if (!in_array($file->getMimeType(), $allowedMimes)) {
                return response()->json(['message' => 'Format de fichier non supporté. Veuillez utiliser un fichier Excel (.xlsx ou .xls)'], 400);
            }

            // Utiliser le service CoursService pour l'import
            $results = $this->coursService->importCoursFromExcel($file, $request);

            return response()->json([
                'message' => 'Importation terminée',
                'summary' => [
                    'total_processed' => $results['total'],
                    'created' => $results['created'],
                    'updated' => $results['updated'],
                    'errors' => $results['errors']
                ],
                'error_details' => $results['error_details'] ?? []
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de l\'importation',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    function ImportCourse(Request $request) {
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->getRealPath();
    
            // Open the file for reading
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return response()->json(['message' => 'Unable to open file'], 400);
            }
    
            $firstLine = fgets($handle);
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);
    
            // Read the first line to get the headers
            $header = fgetcsv($handle, 0, $delimiter);
            if (!$header) {
                return response()->json(['message' => 'Invalid CSV format'], 400);
            }
    
            // Ensure the header keys are trimmed and lowercased
            $header = array_map('trim', $header);
            $header = array_map('strtolower', $header);
    
            $courses = [];
    
            // Parse the CSV file and insert data into the database
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $row = array_map('trim', $row);
                $coursData = array_combine($header, $row);
    
                // Vérifier si la ligne est bien formatée
                if ($coursData && isset($coursData['title'], $coursData['date'], $coursData['hour_debut'], $coursData['hour_fin'], $coursData['faculte'], $coursData['promotion'], $coursData['groupe'], $coursData['tolerance'])) {
                    // Convertir la date en format MySQL (YYYY-MM-DD)
                    $date = DateTime::createFromFormat('d/m/Y', $coursData['date']);
                    $coursData['date'] = $date ? $date->format('Y-m-d') : null;
    
                    $courses[] = [
                        'title' => $coursData['title'],
                        'date' => $coursData['date'],
                        'hour_debut' => $coursData['hour_debut'],
                        'hour_fin' => $coursData['hour_fin'],
                        'faculte' => $coursData['faculte'],
                        'promotion' => $coursData['promotion'],
                        'groupe' => $coursData['groupe'],
                        'option' => $coursData['option'] ?? null,
                        'tolerance' => $coursData['tolerance'],
                    ];
                }
            }
    
            fclose($handle);
    
            if (!empty($courses)) {
                // Insérer tous les cours en une seule requête pour optimiser la base de données
                Cours::insert($courses);
                return response()->json(['message' => 'Cours imported successfully', 'data' => $courses], 200);
            }
    
            return response()->json(['message' => 'No valid data found in CSV'], 400);
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

    /**
     * Supprimer un cours.
     */
    public function destroy($id)
    {
        $cours = Cours::find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        // Vérifier si le cours est passé
        $coursDate = new \DateTime($cours->date);
        $aujourdhui = new \DateTime();
        
        if ($coursDate < $aujourdhui) {
            return response()->json([
                'message' => 'Les cours passés ne peuvent pas être supprimés. Veuillez les archiver à la place.'
            ], 400);
        }

        $cours->delete();
        return response()->json(['message' => 'Cours supprimé avec succès']);
    }

    /**
     * Récupérer les options de filtre pour les cours.
     */
    public function getFilterOptions()
    {
        try {
            // Récupérer les établissements
            $etablissements = \App\Models\Etablissement::select('id', 'name')
                ->orderBy('name')
                ->get();

            // Récupérer les promotions
            $promotions = \App\Models\Promotion::select('id', 'name')
                ->orderBy('name')
                ->get();

            // Récupérer les salles avec toutes les informations nécessaires
            $salles = \App\Models\Salle::select('id', 'name', 'etablissement_id', 'ville_id', 'batiment', 'etage', 'capacite', 'description')
                ->with(['etablissement:id,name', 'ville:id,name'])
                ->orderBy('name')
                ->get();

            // Récupérer les types de cours
            $typesCours = \App\Models\TypeCours::select('id', 'name')
                ->orderBy('name')
                ->get();

            // Récupérer les options
            $options = \App\Models\Option::select('id', 'name')
                ->orderBy('name')
                ->get();

            // Récupérer les groupes
            $groups = \App\Models\Group::select('id', \DB::raw('title as name'))
                ->orderBy('title')
                ->get();

            // Récupérer les villes
            $villes = \App\Models\Ville::select('id', 'name')
                ->orderBy('name')
                ->get();

            return response()->json([
                'etablissements' => $etablissements,
                'promotions' => $promotions,
                'salles' => $salles,
                'types_cours' => $typesCours,
                'options' => $options,
                'groups' => $groups,
                'villes' => $villes
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des options de filtre',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer l'attendance des étudiants pour un cours spécifique
     */
    public function fetchCoursAttendance(Request $request, $coursId)
    {
        try {
            // Récupérer le cours avec ses relations
            // Contourner le UserContextScope pour le cours et les groupes afin de récupérer tous les groupes associés au cours
            $cours = Cours::withoutGlobalScope(\App\Scopes\UserContextScope::class)
                ->with([
                    'etablissement', 
                    'promotion', 
                    'type_cours', 
                    'salle', 
                    'option', 
                    'groups' => function($query) {
                        $query->withoutGlobalScope(\App\Scopes\UserContextScope::class);
                    }, 
                    'ville'
                ])->find($coursId);
            
            if (!$cours) {
                return response()->json([
                    'message' => 'Cours non trouvé',
                    'status' => 404
                ], 404);
            }
            
            $date = $cours->date;
            $heureDebut = $cours->heure_debut;
            $heureFin = $cours->heure_fin;
            $heureDebutPointage = $cours->pointage_start_hour;
            $tolerance = $cours->tolerance;

            // Récupérer les paramètres de filtre
            $promotion_id = $request->input("promotion_id", $cours->promotion_id);
            $etablissement_id = $request->input("etablissement_id", $cours->etablissement_id);
            $ville_id = $request->input("ville_id", $cours->ville_id);
            $group_id = $request->query("group_id", null);
            $option_id = $request->query("option_id", $cours->option_id);
            
            // Récupérer les IDs des groupes associés au cours
            $coursGroupIds = $cours->groups->pluck('id')->toArray();

            // Initialize variables
            $biostarResults = [];
            $localStudents = collect();
            
            // Create a PDO connection to the SQL Server database
            $dsn = 'sqlsrv:Server=10.0.2.148;Database=BIOSTAR_TA;TrustServerCertificate=true';
            $username = 'dbuser';
            $password = 'Driss@2024';
            
            try {
                $pdo = new PDO($dsn, $username, $password);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                
                // Format date and time for SQL Server compatibility
                $formattedDate = date('Y-m-d', strtotime($date));
                $formattedTime1 = date('H:i:s', strtotime($heureDebut));
                $formattedTime2 = date('H:i:s', strtotime($heureFin));
                $formattedTimeRef = date('H:i:s', strtotime($heureDebutPointage));

                // Execute the query using PDO with proper date formatting
                $sql = "SELECT * FROM punchlog WHERE CAST(bsevtdt AS date) = CAST(:date AS date) AND CAST(bsevtdt AS time) BETWEEN CAST(:heure1 AS time) AND CAST(:heure2 AS time) AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";
                $stmt = $pdo->prepare($sql);
                $stmt->execute(['date' => $formattedDate, 'heure1' => $formattedTimeRef, 'heure2' => $formattedTime2]);
                
                // Fetch the results
                $biostarResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                // If Biostar connection fails, continue with empty results
                $biostarResults = [];
            }
            
            // Fetch students from the local database with relations
            $query = \App\Models\Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion']);
            
            // Filtrer par les groupes du cours (si des groupes sont associés au cours)
            if (!empty($coursGroupIds)) {
                $query->whereIn('group_id', $coursGroupIds);
            }
            
            // Filtrer par ville du cours (obligatoire)
            if (!empty($ville_id) && $ville_id != 'null') {
                $query->where('ville_id', $ville_id);
            }
            
            // Filtres optionnels supplémentaires
            if (!empty($group_id) && $group_id != 'null') {
                $query->where('group_id', $group_id);
            }
            
            if (!empty($option_id) && $option_id != 'null') {
                $query->where('option_id', $option_id);
            }
            
            if (!empty($etablissement_id) && $etablissement_id != 'null') {
                $query->where('etablissement_id', $etablissement_id);
            }
            
            if (!empty($promotion_id) && $promotion_id != 'null') {
                $query->where('promotion_id', $promotion_id);
            }
            
            $localStudents = $query->get();
            
            // Check if any students were found
            if ($localStudents->isEmpty()) {
                return response()->json([
                    "message" => "Aucun étudiant trouvé avec les critères spécifiés",
                    "cours" => [
                        'id' => $cours->id,
                        'name' => $cours->name,
                        'date' => $cours->date,
                        'pointage_start_hour' => $cours->pointage_start_hour,
                        'heure_debut' => $cours->heure_debut,
                        'heure_fin' => $cours->heure_fin,
                        'tolerance' => $cours->tolerance,
                        'etablissement' => $cours->etablissement,
                        'promotion' => $cours->promotion,
                        'type_cours' => $cours->type_cours,
                        'salle' => $cours->salle,
                        'option' => $cours->option,
                        'groups' => $cours->groups,
                        'ville' => $cours->ville
                    ],
                    "filtres_appliques" => [
                        'promotion_id' => $promotion_id,
                        'etablissement_id' => $etablissement_id,
                        'ville_id' => $ville_id,
                        'cours_group_ids' => $coursGroupIds,
                        'group_id' => $group_id,
                        'option_id' => $option_id
                    ],
                    "statistics" => [
                        "total_students" => 0,
                        "presents" => 0,
                        "absents" => 0,
                        "lates" => 0,
                        "excused" => 0
                    ],
                    "students" => [],
                    "status" => 200
                ], 200);
            }

            // Get present students (those who have punched in Biostar)
            $presentStudentMatricules = collect($biostarResults)->pluck('user_id')->toArray();

            // Prepare the final response with attendance status
            $studentsWithAttendance = $localStudents->map(function ($student) use ($presentStudentMatricules, $biostarResults, $heureDebutPointage, $heureDebut, $tolerance, $cours) {
                // Vérifier d'abord s'il y a un état manuellement défini dans la table absences
                $manualState = $this->attendanceStateService->getStudentAttendanceState($cours->id, $student->id);
                
                // Si un état manuel existe, l'utiliser
                if ($manualState['absence']) {
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
                        'status' => $manualState['status'],
                        'punch_time' => null,
                        'manual_override' => true,
                        'absence' => $manualState['absence']
                    ];
                }

                // Sinon, calculer l'état basé sur les données Biostar
                $punchTime = $this->getPunchTime($student->matricule, $biostarResults);
                $isPresent = false;
                $isLate = false;
                $status = 'absent';

                if ($punchTime) {
                    // Convertir l'heure de pointage en format comparable
                    $punchTimeFormatted = date('H:i:s', strtotime($punchTime['time']));
                    $heureDebutCours = date('H:i:s', strtotime($heureDebut));
                    
                    // Convertir la tolérance en minutes (format HH:MM -> minutes)
                    $toleranceParts = explode(':', $tolerance);
                    $toleranceMinutes = (int)$toleranceParts[0] * 60 + (int)$toleranceParts[1];
                    
                    // Calculer l'heure limite (début + tolérance en minutes)
                    $heureLimite = date('H:i:s', strtotime($heureDebut . ' + ' . $toleranceMinutes . ' minutes'));
                    
                    // Debug logs pour le calcul du statut
                    \Log::info("Calcul statut pour étudiant {$student->matricule}:", [
                        'punch_time' => $punchTime['time'],
                        'punch_time_formatted' => $punchTimeFormatted,
                        'heure_debut_cours' => $heureDebutCours,
                        'tolerance_original' => $tolerance,
                        'tolerance_minutes' => $toleranceMinutes,
                        'heure_limite' => $heureLimite,
                        'comparison' => $punchTimeFormatted . ' <= ' . $heureLimite . ' = ' . ($punchTimeFormatted <= $heureLimite ? 'true' : 'false')
                    ]);
                    
                    if ($punchTimeFormatted <= $heureLimite) {
                        $isPresent = true;
                        $status = $punchTimeFormatted <= $heureDebutCours ? 'present' : 'late';
                        
                        \Log::info("Étudiant {$student->matricule} marqué comme présent:", [
                            'status' => $status,
                            'is_present' => $isPresent,
                            'is_late' => $punchTimeFormatted > $heureDebutCours
                        ]);
                    } else {
                        \Log::info("Étudiant {$student->matricule} marqué comme absent (en retard):", [
                            'punch_time' => $punchTimeFormatted,
                            'heure_limite' => $heureLimite
                        ]);
                    }
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
                    'manual_override' => false,
                    'absence' => null
                ];
            });

            // Calculer les statistiques
            $totalStudents = $studentsWithAttendance->count();
            $presents = $studentsWithAttendance->where('status', 'present')->count();
            $lates = $studentsWithAttendance->where('status', 'late')->count();
            $absents = $studentsWithAttendance->where('status', 'absent')->count();
            $excused = 0; // Pour l'instant, pas de gestion des excuses

            return response()->json([
                "message" => "Liste des étudiants avec statut de présence pour le cours",
                "cours" => [
                    'id' => $cours->id,
                    'name' => $cours->name,
                    'date' => $cours->date,
                    'pointage_start_hour' => $cours->pointage_start_hour,
                    'heure_debut' => $cours->heure_debut,
                    'heure_fin' => $cours->heure_fin,
                    'tolerance' => $cours->tolerance,
                    'etablissement' => $cours->etablissement,
                    'promotion' => $cours->promotion,
                    'type_cours' => $cours->type_cours,
                    'salle' => $cours->salle,
                    'option' => $cours->option,
                    'groups' => $cours->groups,
                    'ville' => $cours->ville
                ],
                "statistics" => [
                    "total_students" => $totalStudents,
                    "presents" => $presents,
                    "absents" => $absents,
                    "lates" => $lates,
                    "excused" => $excused
                ],
                "students" => $studentsWithAttendance,
                "logique_presence" => [
                    "heure_debut_cours" => $heureDebut,
                    "heure_debut_pointage" => $heureDebutPointage,
                    "tolerance" => $tolerance,
                    "critere" => "Étudiant présent s'il pointe avant l'heure de début du cours + tolérance",
                    "description" => "L'heure de début de pointage indique quand commencer le pointage, mais la présence est déterminée par rapport à l'heure de début du cours plus la tolérance"
                ],
                "status" => 200
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération de l\'attendance du cours',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
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
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm']
            ];
        }
        
        // Stratégie 2: Supprimer les zéros de début (ex: "000123" → "123")
        $matriculeTrimmed = ltrim($matricule, '0');
        if ($matriculeTrimmed !== $matricule && !empty($matriculeTrimmed)) {
            $studentPunch = collect($biostarResults)->firstWhere('user_id', $matriculeTrimmed);
            if ($studentPunch) {
                \Log::info("Match trouvé avec suppression des zéros: '$matricule' → '$matriculeTrimmed'");
                return [
                    'time' => $studentPunch['bsevtdt'],
                    'device' => $studentPunch['devnm']
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
                    'time' => $studentPunch['bsevtdt'],
                    'device' => $studentPunch['devnm']
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
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm']
            ];
        }
        
        // Stratégie 5: Recherche inverse (le matricule contient le user_id)
        $studentPunch = collect($biostarResults)->first(function ($punch) use ($matricule) {
            return strpos($matricule, $punch['user_id']) !== false;
        });
        if ($studentPunch) {
            \Log::info("Match trouvé avec recherche inverse: '{$studentPunch['user_id']}' contenu dans '$matricule'");
            return [
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm']
            ];
        }
        
        // Aucun match trouvé
        \Log::warning("Aucun match trouvé pour le matricule: '$matricule'");
        return null;
    }

    /**
     * Archiver un cours (super-admin, admin, doyen uniquement)
     */
    public function archive($id)
    {
        // Vérifier les permissions de l'utilisateur
        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        // Charger la relation role
        $user->load('role');

        // Vérifier si l'utilisateur est super-admin, admin ou doyen via la relation
        $userRole = $user->role ? $user->role->name : null;
        
        // Normaliser le rôle pour la comparaison (enlever espaces, tirets, majuscules)
        $normalizedRole = $userRole ? strtolower(str_replace([' ', '-', '_'], '', $userRole)) : null;
        $allowedRoles = ['superadmin', 'admin', 'doyen'];
        
        if (!$normalizedRole || !in_array($normalizedRole, $allowedRoles)) {
            return response()->json(['message' => 'Accès refusé. Seuls les super-admin, admin et doyen peuvent archiver des cours.'], 403);
        }

        // Find the Cours by id
        $cours = Cours::find($id);

        if (empty($cours)) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        // Vérifier que le cours n'est pas déjà archivé
        if (!is_null($cours->archived_at)) {
            return response()->json(['message' => 'Ce cours est déjà archivé'], 400);
        }

        // Vérifier que le cours est passé
        $coursDate = new \DateTime($cours->date);
        $aujourdhui = new \DateTime();
        
        if ($coursDate >= $aujourdhui) {
            return response()->json(['message' => 'Seuls les cours passés peuvent être archivés'], 400);
        }

        // Marquer le cours comme archivé
        $cours->update(['archived_at' => now()]);

        // Return a success response
        return response()->json(['message' => 'Cours archivé avec succès'], 200);
    }

    /**
     * Désarchiver un cours (super-admin et admin uniquement)
     */
    public function unarchive($id)
    {
        // Vérifier les permissions de l'utilisateur
        $user = auth()->user();
        if (!$user) {
            return response()->json(['message' => 'Non authentifié'], 401);
        }

        // Charger la relation role
        $user->load('role');

        // Vérifier si l'utilisateur est super-admin ou admin via la relation
        $userRole = $user->role ? $user->role->name : null;
        
        // Normaliser le rôle pour la comparaison (enlever espaces, tirets, majuscules)
        $normalizedRole = $userRole ? strtolower(str_replace([' ', '-', '_'], '', $userRole)) : null;
        $allowedRoles = ['superadmin', 'admin'];
        
        if (!$normalizedRole || !in_array($normalizedRole, $allowedRoles)) {
            return response()->json(['message' => 'Accès refusé. Seuls les super-admin et admin peuvent désarchiver des cours.'], 403);
        }

        // Find the Cours by id
        $cours = Cours::find($id);

        if (empty($cours)) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        // Vérifier que le cours est bien archivé
        if (is_null($cours->archived_at)) {
            return response()->json(['message' => 'Ce cours n\'est pas archivé'], 400);
        }

        // Désarchiver le cours (mettre archived_at à null)
        $cours->update(['archived_at' => null]);

        // Return a success response
        return response()->json(['message' => 'Cours désarchivé avec succès'], 200);
    }

    /**
     * Récupérer les cours archivés
     */
    public function archived(Request $request)
    {
        // Get query parameters with defaults
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $etablissement_id = $request->query('etablissement_id');
        $promotion_id = $request->query('promotion_id');
        $salle_id = $request->query('salle_id');
        $type_cours_id = $request->query('type_cours_id');
        $group_id = $request->query('group_id');
        $ville_id = $request->query('ville_id');
        $searchValue = $request->query('searchValue', '');
        $date = $request->query('date');

        $query = Cours::with(['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville'])
                        ->whereNotNull('archived_at'); // Seulement les cours archivés

        // Appliquer le filtrage par contexte utilisateur
        $userContext = $this->userContextService->getUserContext();
        
        // Si l'utilisateur n'est pas super-admin, appliquer les filtres de contexte
        if (!$this->userContextService->isSuperAdmin()) {
            if ($userContext['ville_id']) {
                $query->where('ville_id', $userContext['ville_id']);
            }
            if ($userContext['etablissement_id']) {
                $query->where('etablissement_id', $userContext['etablissement_id']);
            }
        }

        // Appliquer les filtres
        if (!empty($etablissement_id)) {
            $query->where('etablissement_id', $etablissement_id);
        }

        if (!empty($promotion_id)) {
            $query->where('promotion_id', $promotion_id);
        }

        if (!empty($salle_id)) {
            $query->where('salle_id', $salle_id);
        }

        if (!empty($type_cours_id)) {
            $query->where('type_cours_id', $type_cours_id);
        }

        if (!empty($group_id)) {
            $query->whereHas('groups', function($q) use ($group_id) {
                $q->where('groups.id', $group_id);
            });
        }

        if (!empty($ville_id)) {
            $query->where('ville_id', $ville_id);
        }

        if (!empty($searchValue)) {
            $query->where('name', 'LIKE', "%{$searchValue}%");
        }

        if (!empty($date)) {
            $query->whereDate('date', $date);
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination et trier par date d'archivage décroissante
        $cours = $query->orderBy('archived_at', 'desc')
                      ->paginate($size, ['*'], 'page', $page);

        return response()->json([
            'data' => $cours->items(),
            'current_page' => $cours->currentPage(),
            'last_page' => $cours->lastPage(),
            'per_page' => $cours->perPage(),
            'total' => $cours->total()
        ]);
    }
}
