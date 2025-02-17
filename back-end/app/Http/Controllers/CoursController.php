<?php

namespace App\Http\Controllers;

use App\Models\Cours;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CoursController extends Controller
{
    public function index(Request $request)
    {
        $size = $request->query('size', 6);
        $page = $request->query('page', 1);
        $faculte = $request->query("faculte", "toutes");
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = Cours::query();

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
        $cours = $query->limit($size)->skip($skip)->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "cours" => $cours,
            "totalPages" => $totalPages,
            "total" => $total, // Ajout pour debug si nécessaire
            "status" => 200
        ]);
    }

    /**
     * Afficher un cours spécifique.
     */
    public function show($id)
    {
        $cours = Cours::find($id);
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
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'hour_debut' => 'required',
            'hour_fin' => 'required|after:hour_debut',
            'faculte' => 'required|string|max:255',
            'groupe' => 'required|integer',
            'promotion' => ['required', Rule::in(['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee'])],
            'option' => 'nullable|string',
        ]);

        $cours = new Cours();
        $cours->title = $validatedData['title'];
        $cours->date = $validatedData['date'];
        $cours->hour_debut = $validatedData['hour_debut'];
        $cours->hour_fin = $validatedData['hour_fin'];
        $cours->faculte = $validatedData['faculte'];
        $cours->groupe = $validatedData['groupe'];
        $cours->promotion = $validatedData['promotion'];
        $cours->option = $validatedData['option'] ?? '';
        $cours->save();

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

        $validatedData = $request->validate([
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'hour_debut' => 'sometimes',
            'hour_fin' => 'sometimes|after:hour_debut',
            'faculte' => 'sometimes|string|max:255',
            'groupe' => 'sometimes|integer',
            'promotion' => ['sometimes', Rule::in(['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee'])],
            'option' => 'nullable|string',
        ]);

        $cours->update($validatedData);
        return response()->json(['message' => 'Cours mis à jour avec succès', 'cours' => $cours]);
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

            // Read the first line to get the headers
            $header = fgetcsv($handle, 0, ',');

            // Ensure the header keys are trimmed and lowercased
            $header = array_map('trim', $header);
            $header = array_map('strtolower', $header);

            // Parse the CSV file and insert data into the database
            while (($row = fgetcsv($handle, 0, ',')) !== false) {
                $row = array_map('trim', $row);
                $examenData = array_combine($header, $row);

                Cours::create([
                    'title' => $examenData['title'],
                    'date' => $examenData['date'],
                    'hour_debut' => $examenData['hour_debut'],
                    'hour_fin' => $examenData['hour_fin'],
                    'faculte' => $examenData['faculte'],
                    'promotion' => $examenData['promotion'],
                    'groupe' => $examenData['groupe'],
                    'option' => $examenData['option'],
                ]);
            }

            // Close the file
            fclose($handle);

            return response()->json(['message' => 'Cours imported successfully'], 200);
        }

        return response()->json(['message' => 'No file uploaded'], 400);
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

        $cours->delete();
        return response()->json(['message' => 'Cours supprimé avec succès']);
    }
}
