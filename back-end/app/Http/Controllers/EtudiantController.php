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

class EtudiantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        // Récupérer les paramètres de pagination
        $page = $request->get('page', 1);
        $perPage = $request->get('per_page', 10);
        
        // Récupérer les étudiants avec pagination et relations
        $etudiants = Etudiant::with(['ville', 'group', 'option', 'etablissement', 'promotion'])
            ->paginate($perPage, ['*'], 'page', $page);
        
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
        
        // Format date and time for SQL Server compatibility
        $formattedDate = date('Y-m-d', strtotime($date));
        $formattedTime1 = date('H:i:s', strtotime($heure1));
        $formattedTime2 = date('H:i:s', strtotime($heure2));
        $promotion_id = $request->input("promotion_id", 1);
        $etablissement_id = $request->input("etablissement_id", 1);
        $ville_id = $request->input("ville_id", null);
        $group_id = $request->query("group_id", null);
        $option_id = $request->query("option_id", null);

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

            // Execute the query using PDO with proper date formatting
            $sql = "SELECT * FROM punchlog WHERE CAST(bsevtdt AS date) = CAST(:date AS date) AND CAST(bsevtdt AS time) BETWEEN CAST(:heure1 AS time) AND CAST(:heure2 AS time) AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $formattedDate, 'heure1' => $formattedTime1, 'heure2' => $formattedTime2]);

            // Fetch the results
            $biostarResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (PDOException $e) {
            // If Biostar connection fails, continue with empty results
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
                    "heure_debut" => $heure1,
                    "heure_fin" => $heure2,
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
            $studentsWithAttendance = $localStudents->map(function ($student) use ($presentStudentMatricules, $biostarResults) {
                $isPresent = in_array($student->matricule, $presentStudentMatricules);
                
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
                    'punch_time' => $isPresent ? $this->getPunchTime($student->matricule, $biostarResults) : null,
                ];
            });

            // ca marche pas bien ici

            
            return response()->json([
                "message" => "Liste des étudiants avec statut de présence",
                "date" => $date,
                "heure_debut" => $heure1,
                "heure_fin" => $heure2,
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
}
