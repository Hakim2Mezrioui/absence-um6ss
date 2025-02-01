<?php

namespace App\Http\Controllers;

use App\Models\Rattrapage;
use Illuminate\Http\Request;
use PDO;
use PDOException;

class RattrapageController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $date = $request->input('date', '2025-01-02'); // Default date if not provided
        $heure1 = $request->input('hour1', '09:00'); // Default start time if not provided
        $heure2 = $request->input('hour2', '10:00'); // Default end time if not provided

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
            $localStudents = Rattrapage::all();

            // Compare the two sets of students
            $faceIdStudents = collect($biostarResults)->pluck('user_id')->toArray();
            $localStudentMatricules = $localStudents->pluck('matricule')->toArray();

            $studentsWithFaceId = array_intersect($faceIdStudents, $localStudentMatricules);
            $studentsWithFaceId = array_values($studentsWithFaceId); // Re-index the array

            return response()->json([
                "students_with_face_id" => $studentsWithFaceId,
                "biostar_results" => $biostarResults,
                "local_students" => $localStudents
            ], 200);

        } catch (PDOException $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    public function importation(Request $request) {
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
            
            Rattrapage::truncate();

            foreach ($data as $row) {
                // Ensure the row values are trimmed
                $row = array_map('trim', $row);
    
                // Combine the header with the row values
                $studentData = array_combine($header, $row);
    
                // Insert the student data into the database
                Rattrapage::create([
                    'matricule' => $studentData['matricule'],
                    'name' => $studentData['name'],
                    'faculte' => $studentData['faculte'],
                    'promotion' => $studentData['promotion'],
                ]);
            }
    
            return response()->json(['message' => 'Students imported successfully'], 200);
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
     * Display the specified resource.
     */
    public function show(Rattrapage $rattrapage)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Rattrapage $rattrapage)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Rattrapage $rattrapage)
    {
        //
    }
}
