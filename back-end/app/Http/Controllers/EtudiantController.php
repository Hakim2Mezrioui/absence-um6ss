<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etudiant;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\GroupService;
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

    public function __construct(ConfigurationService $configurationService)
    {
        $this->configurationService = $configurationService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Récupérer les paramètres de pagination
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);
        
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
        $examen = \App\Models\Examen::with('salle')
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
            } catch (PDOException $e) {
                // If Biostar connection fails, continue with empty results
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
            
            // Check if any students were found
            if ($localStudents->isEmpty()) {
                return response()->json([
                    "message" => "Aucun étudiant trouvé avec les critères spécifiés",
                    "date" => $date,
                    "heure_debut_poigntage" => $heureDebutPointage,
                    "heure_debut" => $heure1,
                    "heure_fin" => $heure2,
                    "tolerance" => $examen ? $examen->tolerance : 15,
                    "salle" => $salle,
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
            $presentStudentMatricules = collect($biostarResults)->pluck('user_id')->toArray();
            
            // ici biostarResults ca marche bien

            // Prepare the final response with attendance status
            $studentsWithAttendance = $localStudents->map(function ($student) use ($presentStudentMatricules, $biostarResults, $heureDebutPointage, $heure1) {
                $punchTime = $this->getPunchTime($student->matricule, $biostarResults);
                $isPresent = false;
                
                if ($punchTime) {
                    // Convertir l'heure de pointage en format comparable
                    $punchTimeFormatted = date('H:i:s', strtotime($punchTime['time']));
                    
                    // L'étudiant est présent s'il a pointé avant l'heure de début de l'examen
                    // (peu importe l'heure de début de pointage, l'important est d'arriver avant le début de l'examen)
                    $heureDebutExamen = date('H:i:s', strtotime($heure1));
                    $isPresent = $punchTimeFormatted < $heureDebutExamen;
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
                    'status' => $isPresent ? 'présent' : 'absent',
                    'punch_time' => $punchTime,
                ];
            });

            // ca marche pas bien ici

            
            return response()->json([
                "message" => "Liste des étudiants avec statut de présence",
                "date" => $date,
                "heure_debut_poigntage" => $heureDebutPointage,
                "heure_debut" => $heure1,
                "heure_fin" => $heure2,
                "tolerance" => $examen ? $examen->tolerance : 15,
                "salle" => $salle,
                "examen_id" => $examen ? $examen->id : null,
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
     * Get punch time for a specific student
     */
    private function getPunchTime($matricule, $biostarResults)
    {
        $studentPunch = collect($biostarResults)->firstWhere('user_id', $matricule);
        if ($studentPunch) {
            return [
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm']
            ];
        }
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
            'option_id' => 'required|exists:options,id',
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
            'option_id' => $request->input('option_id'),
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
            'option_id' => 'sometimes|required|exists:options,id',
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
            'option_id' => 'sometimes|required|exists:options,id',
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
                'promotions' => \App\Models\Promotion::select('id', 'name')->get(),
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
            'file' => 'required|file|mimes:csv,txt|max:10240', // 10MB max
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
            // Ouvrir le fichier
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return response()->json(['message' => 'Unable to open file'], 400);
            }

            // Détecter le délimiteur
            $firstLine = fgets($handle);
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);

            // Parser le CSV
            $data = [];
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $data[] = $row;
            }
            fclose($handle);

            if (empty($data)) {
                return response()->json(['message' => 'File is empty'], 400);
            }

            // En-têtes (première ligne)
            $headers = array_shift($data);
            $headers = array_map('trim', $headers);
            $headers = array_map('strtolower', $headers);

            // Définir les colonnes requises en fonction du mode
            if ($useDefaultValues) {
                $requiredColumns = ['matricule', 'first_name', 'last_name', 'email'];
                $optionalColumns = ['promotion_id', 'etablissement_id', 'ville_id', 'group_id', 'option_id'];
            } else {
                $requiredColumns = [
                    'matricule', 'first_name', 'last_name', 'email', 
                    'promotion_id', 'etablissement_id', 'ville_id', 'group_id', 'option_id'
                ];
                $optionalColumns = [];
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

            foreach ($data as $index => $row) {
                $lineNumber = $index + 2; // +2 car on a supprimé l'en-tête et les index commencent à 0
                
                try {
                    // Assurer que la ligne a le bon nombre de colonnes
                    if (count($row) !== count($headers)) {
                        $errorDetails[] = [
                            'line' => $lineNumber,
                            'message' => 'Number of columns does not match headers'
                        ];
                        $errors++;
                        continue;
                    }

                    // Créer un tableau associatif
                    $studentData = array_combine($headers, array_map('trim', $row));

                    // Validation des données
                    if (empty($studentData['matricule']) || empty($studentData['email'])) {
                        $errorDetails[] = [
                            'line' => $lineNumber,
                            'message' => 'Matricule and email are required'
                        ];
                        $errors++;
                        continue;
                    }

                    // Préparer les données à sauvegarder
                    $dataToSave = [
                        'matricule' => $studentData['matricule'],
                        'first_name' => $studentData['first_name'],
                        'last_name' => $studentData['last_name'],
                        'email' => $studentData['email'],
                        'password' => bcrypt('password123'), // Mot de passe par défaut
                    ];

                    // Ajouter les IDs selon le mode
                    if ($useDefaultValues) {
                        // Utiliser les valeurs par défaut de la configuration
                        $dataToSave['promotion_id'] = (int) $defaultValues['promotion_id'];
                        $dataToSave['etablissement_id'] = (int) $defaultValues['etablissement_id'];
                        $dataToSave['ville_id'] = (int) $defaultValues['ville_id'];
                        $dataToSave['group_id'] = (int) $defaultValues['group_id'];
                        $dataToSave['option_id'] = (int) $defaultValues['option_id'];
                        
                        // Si des colonnes optionnelles sont présentes dans le CSV, les utiliser
                        foreach ($optionalColumns as $column) {
                            if (in_array($column, $headers) && !empty($studentData[$column])) {
                                $dataToSave[$column] = (int) $studentData[$column];
                            }
                        }
                    } else {
                        // Utiliser les valeurs du CSV
                        $dataToSave['promotion_id'] = (int) $studentData['promotion_id'];
                        $dataToSave['etablissement_id'] = (int) $studentData['etablissement_id'];
                        $dataToSave['ville_id'] = (int) $studentData['ville_id'];
                        $dataToSave['group_id'] = (int) $studentData['group_id'];
                        $dataToSave['option_id'] = (int) $studentData['option_id'];
                    }

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
                    $errorDetails[] = [
                        'line' => $lineNumber,
                        'message' => $e->getMessage()
                    ];
                    $errors++;
                }
            }

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
            return response()->json([
                'message' => 'Error processing file',
                'error' => $e->getMessage()
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
