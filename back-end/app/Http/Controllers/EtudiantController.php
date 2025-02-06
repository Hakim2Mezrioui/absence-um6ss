<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etudiant;
use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;
use Illuminate\Support\Facades\Auth;

class EtudiantController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $date = $request->input('date', '2025-02-06'); // Default date if not provided
        $heure1 = $request->input('hour1', '08:00'); // Default start time if not provided
        $heure2 = $request->input('hour2', '10:00'); // Default end time if not provided
        $faculte = $request->input('faculte', "pharmacie");
        $promotion = $request->input("promotion", "1ère annee");

        // Create a PDO connection to the SQL Server database
        $dsn = 'sqlsrv:Server=10.0.2.148;Database=BIOSTAR_TA;TrustServerCertificate=true';
        $username = 'dbuser';
        $password = 'Driss@2024';

        try {
            $pdo = new PDO($dsn, $username, $password);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

            // Execute the query using PDO
            $sql = "SELECT * FROM punchlog WHERE CAST(bsevtdt AS date) = :date AND FORMAT(bsevtdt, 'HH:mm') BETWEEN :heure1 AND :heure2 AND devnm NOT LIKE 'TOUR%' AND devnm NOT LIKE 'ACCES HCK%'";
            $stmt = $pdo->prepare($sql);
            $stmt->execute(['date' => $date, 'heure1' => $heure1, 'heure2' => $heure2]);

            // Fetch the results
            $biostarResults = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Fetch students from the local database
            $localStudents = Etudiant::where("faculte", strtolower($faculte))->where("promotion", $promotion)->get();

            // Compare the two sets of students
            $faceIdStudents = collect($biostarResults)->pluck('user_id')->toArray();
            // $localStudentNames = $localStudents->pluck('name')->toArray();
            $localStudentMatricules = $localStudents->pluck('matricule')->toArray();


            // $studentsWithFaceId = array_intersect($faceIdStudents, $localStudentNames);
            $studentsWithFaceId = array_intersect($faceIdStudents, $localStudentMatricules);
            $studentsWithFaceId = array_values($studentsWithFaceId); // Re-index the array

            return response()->json([
                "students_with_face_id" => $studentsWithFaceId,
                "biostar_results" => $biostarResults,
                "local_students" => $localStudents
            ], 200);
            
            // test a la maison
            // $local_students = Etudiant::where("faculte", strtolower($faculte))->where("promotion", $promotion)->get();

            // return response()->json(["local_students" => $local_students]);

        } catch (PDOException $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
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
                    Etudiant::create([
                        'matricule' => $studentData['matricule'],
                        'name' => $studentData['name'],
                        'faculte' => strtolower($faculte),
                        'promotion' => $studentData['promotion'],
                    ]);
                }
            } else {
                foreach ($data as $row) {
                    // Ensure the row values are trimmed
                    $row = array_map('trim', $row);
    
                    // Combine the header with the row values
                    $studentData = array_combine($header, $row);
    
                    // Insert the student data into the database
                    Etudiant::create([
                        'matricule' => $studentData['matricule'],
                        'name' => $studentData['name'],
                        'faculte' => $studentData['faculte'],
                        'promotion' => $studentData['promotion'],
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
            'matricule' => 'required|integer|unique:etudiants,matricule|digits:6',
            'name' => 'required|string|max:255',
            'promotion' => 'required|in:1ère annee,2ème annee,3ème annee,4ème annee,5ème annee,6ème annee',
            'faculte' => 'required|string|max:255',
        ]);

        // Create a new Etudiant
        $etudiant = Etudiant::create([
            'matricule' => $request->input('matricule'),
            'name' => $request->input('name'),
            'promotion' => $request->input('promotion'),
            'faculte' => $request->input('faculte'),
        ]);

        // Return the newly created Etudiant as a JSON response
        return response()->json($etudiant, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show($matricule)
    {
        // Fetch the student by matricule
        $etudiant = Etudiant::where('matricule', $matricule)->first();

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
    public function update(Request $request, $matricule)
    {
        // Validate the request input
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'promotion' => 'sometimes|required|in:1ère annee,2ème annee,3ème annee,4ème annee,5ème annee,6ème annee',
            'faculte' => 'sometimes|required|string|max:255',
        ]);

        // Find the Etudiant by matricule
        $etudiant = Etudiant::where('matricule', $matricule)->first();
        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        // Update the Etudiant with the new data
        $etudiant->update($request->only(['name', 'promotion', 'faculte']));

        // Return the updated Etudiant as a JSON response
        return response()->json($etudiant, 200);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($matricule)
    {
        // Find the Etudiant by matricule
        $etudiant = Etudiant::where('matricule', $matricule)->first();

        if (!$etudiant) {
            return response()->json(['message' => 'Etudiant not found'], 404);
        }

        // Delete the Etudiant
        $etudiant->delete();

        // Return a success response
        return response()->json(['message' => 'Etudiant deleted successfully'], 200);
    }

    public function fetchEtudiants() {
        $etudiants = Etudiant::all();
        return response()->json(["etudiants" => $etudiants], 200);
    }
}
