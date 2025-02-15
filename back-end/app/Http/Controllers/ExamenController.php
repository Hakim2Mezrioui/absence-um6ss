<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Examen;

class ExamenController extends Controller
{
    function index(Request $request) {
        $size = $request->query('size', 6);
        $page = $request->query('page', 1); 
        $statut = $request->query('statut', "tous"); 
        $faculte = $request->query("faculte", "toutes");
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = Examen::query();

        // Appliquer le filtre sur le statut si nécessaire
        if (!empty($statut) && $statut !== "tous") {
            $query->where("statut", $statut);
        }

        // Appliquer le filtre sur la faculté si nécessaire
        if (!empty($faculte) && $faculte !== "toutes") {
            $query->where("faculte", $faculte);
        }
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where("title", "LIKE", "%{$searchValue}%");
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $examens = $query->limit($size)->skip($skip)->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "examens" => $examens,
            "totalPages" => $totalPages,
            "total" => $total, // Ajout pour debug si nécessaire
            "status" => 200
        ]);


        // if($statut && $statut != "tous") {
        //     $examens = Examen::where("statut", $statut)->limit($size)->skip($skip)->get();
        //     $total = Examen::where('statut', $statut)->count();
        //     $totalPages = ceil($total / $size);
        // } 
        // else {
        //     $examens = Examen::limit($size)->skip($skip)->get();
        //     $total = Examen::count();
        //     $totalPages = ceil($total / $size);
        // }


        // return response()->json([
        //     "examens" => $examens,
        //     "totalPages" => $totalPages,
        //     "status" => 200
        // ]);
    }

    function show(Request $request) {
        $examen = Examen::find($request->id);
        if (!$examen) {
            return response()->json(["message" => "Examen not found", "status" => 404], 404);
        }

        return response()->json(["examen" => $examen, "status" => 200], 200);
    }

    function store(Request $request) {
        // Validate the request input
        $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'hour_debut' => 'required',
            'hour_debut_pointage' => 'required',
            'hour_fin' => 'required',
            'faculte' => 'required|string|max:255',
            'promotion' => 'required|in:1ère annee,2ème annee,3ème annee,4ème annee,5ème annee,6ème annee',
            'statut' => 'required|in:archivé,en cours',
        ]);

        // Create a new Examen
        $examen = Examen::create([
            'title' => $request->title,
            'date' => $request->date,
            'hour_debut' => $request->hour_debut,
            'hour_debut_pointage' => $request->hour_debut_pointage,
            'hour_fin' => $request->hour_fin,
            'faculte' => $request->faculte,
            'promotion' => $request->promotion,
            'statut' => $request->statut,
            'option' => $request->option ?? '',
        ]);

        // Return the newly created Examen as a JSON response
        return response()->json(['response' => $examen], 201);
    }

    function update(Request $request, $id) {
        // Validate the request input
        $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'hour_debut' => 'required',
            'hour_debut_pointage' => 'required',
            'hour_fin' => 'required',
            'faculte' => 'required|string|max:255',
            'promotion' => 'required|in:1ère annee,2ème annee,3ème annee,4ème annee,5ème annee,6ème annee',
            'statut' => 'required|in:archivé,en cours',
        ]);

        // Find the Examen by id
        $examen = Examen::find($id);
        if (!$examen) {
            return response()->json(['message' => 'Examen not found'], 404);
        }


        // Update the Examen with the new data
        $examen->update($request->only(['title', 'date', 'hour_debut', 'hour_debut_pointage', 'hour_fin', 'faculte', 'promotion', 'statut']));

        // Return the updated Examen as a JSON response
        return response()->json($examen, 200);
    }

    function ImportExamens(Request $request) {
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->getRealPath();

            // Open the file for reading
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return response()->json(['message' => 'Unable to open file'], 400);
            }

            // Read the first line to get the headers
            $header = fgetcsv($handle, 0, ',');

            // Ensure the header keys are trimmed and lowercased
            $header = array_map('trim', $header);
            $header = array_map('strtolower', $header);

            // Parse the CSV file and insert data into the database
            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                $row = array_map('trim', $row);
                $examenData = array_combine($header, $row);

                Examen::create([
                    'title' => $examenData['title'],
                    'date' => $examenData['date'],
                    'hour_debut' => $examenData['hour_debut'],
                    'hour_debut_pointage' => $examenData['hour_debut_pointage'],
                    'hour_fin' => $examenData['hour_fin'],
                    'faculte' => $examenData['faculte'],
                    'promotion' => $examenData['promotion'],
                    'statut' => $examenData['statut'],
                ]);
            }

            // Close the file
            fclose($handle);

            return response()->json(['message' => 'Examens imported successfully'], 200);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
    }

    function destroy($id) {
        // Find the Examen by id
        $examen = Examen::find($id);

        if (!$examen) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Delete the Examen
        $examen->delete();

        // Return a success response
        return response()->json(['message' => 'Examen deleted successfully'], 200);
    }

    function search() {
        
    }
}
