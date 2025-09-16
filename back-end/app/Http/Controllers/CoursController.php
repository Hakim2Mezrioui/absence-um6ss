<?php

namespace App\Http\Controllers;

use App\Models\Cours;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use DateTime;   
use Carbon\Carbon;

class CoursController extends Controller
{
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $etablissement_id = $request->query('etablissement_id');
        $promotion_id = $request->query('promotion_id');
        $salle_id = $request->query('salle_id');
        $type_cours_id = $request->query('type_cours_id');
        $searchValue = $request->query('searchValue', '');
        $date = $request->query('date');

        $query = Cours::with(['etablissement', 'promotion', 'type_cours', 'salle', 'option']);

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
        $cours = Cours::with(['etablissement', 'promotion', 'type_cours', 'salle', 'option'])->find($id);
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
            'annee_universitaire' => 'required|string|max:9',
            'statut_temporel' => 'nullable|in:passé,en_cours,futur'
        ]);

        $cours = Cours::create($validatedData);
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'option']);

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
            'annee_universitaire' => 'sometimes|string|max:9',
            'statut_temporel' => 'sometimes|in:passé,en_cours,futur'
        ]);

        $cours->update($validatedData);
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'option']);

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

            // Récupérer les salles
            $salles = \App\Models\Salle::select('id', 'name')
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

            return response()->json([
                'etablissements' => $etablissements,
                'promotions' => $promotions,
                'salles' => $salles,
                'types_cours' => $typesCours,
                'options' => $options
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des options de filtre',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
