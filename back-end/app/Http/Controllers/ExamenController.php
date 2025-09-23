<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Examen;
use DateTime;
use DateTimeZone;
use Illuminate\Support\Facades\Log;

class ExamenController extends Controller
{
    public function index(Request $request)
    {
        // Get query parameters with defaults
        $size = $request->query('size', 10);
        $page = $request->query('page', 1); 
        $etablissement_id = $request->query("etablissement_id", null);
        $promotion_id = $request->query("promotion_id", null);
        $salle_id = $request->query("salle_id", null);
        $group_id = $request->query("group_id", null);
        $ville_id = $request->query("ville_id", null);
        $searchValue = $request->query("searchValue", "");
        $date = $request->query("date", "");

        // Validate pagination parameters
        $size = max(1, min(100, (int) $size)); // Limit size between 1 and 100
        $page = max(1, (int) $page);

        $query = Examen::with(['etablissement', 'promotion', 'typeExamen', 'salle', 'option', 'group', 'ville']);

        // Apply filters
        $this->applyFilters($query, $etablissement_id, $promotion_id, $salle_id, $group_id, $ville_id, $searchValue, $date);

        // Get total count before pagination
        $total = $query->count();

        // Calculate pagination
        $totalPages = ceil($total / $size);
        $currentPage = min($page, $totalPages > 0 ? $totalPages : 1);

        // Get paginated results
        $examens = $query->orderBy('created_at', 'desc')
                        ->offset(($currentPage - 1) * $size)
                        ->limit($size)
                        ->get();

        // Calculer le statut temporel pour chaque examen
        $examens->each(function ($examen) {
            $examen->statut_temporel = $this->calculateStatutTemporel($examen);
        });

        return response()->json([
            "data" => $examens,
            "current_page" => $currentPage,
            "per_page" => $size,
            "total" => $total,
            "last_page" => $totalPages,
            "has_next_page" => $currentPage < $totalPages,
            "has_prev_page" => $currentPage > 1
        ]);
    }

    private function applyFilters($query, $etablissement_id, $promotion_id, $salle_id, $group_id, $ville_id, $searchValue, $date) {
        // Apply establishment filter by ID
        if (!empty($etablissement_id)) {
            $query->where('etablissement_id', $etablissement_id);
        }

        // Apply promotion filter by ID
        if (!empty($promotion_id)) {
            $query->where('promotion_id', $promotion_id);
        }

        // Apply salle filter by ID
        if (!empty($salle_id)) {
            $query->where('salle_id', $salle_id);
        }

        // Apply group filter by ID
        if (!empty($group_id)) {
            $query->where('group_id', $group_id);
        }

        // Apply ville filter by ID
        if (!empty($ville_id)) {
            $query->where('ville_id', $ville_id);
        }

        // Apply search filter
        if (!empty($searchValue)) {
            $query->where("title", "LIKE", "%{$searchValue}%");
        }

        // Apply date filter
        if (!empty($date)) {
            try {                
                // Try to parse the date in Y-m-d format first
                $formattedDate = DateTime::createFromFormat('Y-m-d', $date);
                if (!$formattedDate) {
                    // If that fails, try d/m/Y format
                    $formattedDate = DateTime::createFromFormat('d/m/Y', $date);
                }
                
                if ($formattedDate) {
                    $formattedDateString = $formattedDate->format('Y-m-d');
                    Log::info('Formatted date: ' . $formattedDateString);
                    $query->whereDate("date", $formattedDateString);
                    
                    //Log the SQL query
                    Log::info('SQL Query: ' . $query->toSql());
                    Log::info('Query Bindings: ' . json_encode($query->getBindings()));
                } else {
                    Log::info('Failed to parse date');
                }
            } catch (\Exception $e) {
                Log::error('Date parsing error: ' . $e->getMessage());
            }
        }
    }

    function show($id) {
        $examen = Examen::with(['etablissement', 'promotion', 'typeExamen', 'salle'])->find($id);
        if (!$examen) {
            return response()->json(["message" => "Examen not found", "status" => 404], 404);
        }

        // Calculer le statut temporel
        $examen->statut_temporel = $this->calculateStatutTemporel($examen);

        return response()->json(["examen" => $examen, "status" => 200], 200);
    }

    public function store(Request $request) {
        // Build validation rules to support "Tous les groupes"
        $rules = [
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'heure_debut_poigntage' => 'required',
            'heure_debut' => 'required',
            'heure_fin' => 'required',
            'tolerance' => 'nullable|integer|min:0|max:60',
            'option_id' => 'nullable|exists:options,id',
            'salle_id' => 'required|exists:salles,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_examen_id' => 'required|exists:types_examen,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'annee_universitaire' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id',
            'all_groups' => 'nullable|boolean',
        ];

        // If not all groups, require a specific group_id; otherwise allow nullable
        if (!$request->boolean('all_groups')) {
            $rules['group_id'] = 'required|exists:groups,id';
        } else {
            $rules['group_id'] = 'nullable|exists:groups,id';
        }

        // Validate the request input
        $request->validate($rules);

        // Create a new Examen
        $examen = Examen::create([
            'title' => $request->title,
            'date' => $request->date,
            'heure_debut_poigntage' => $request->heure_debut_poigntage,
            'heure_debut' => $request->heure_debut,
            'heure_fin' => $request->heure_fin,
            'tolerance' => $request->tolerance ?? 15,
            'option_id' => $request->option_id,
            'salle_id' => $request->salle_id,
            'promotion_id' => $request->promotion_id,
            'type_examen_id' => $request->type_examen_id,
            'etablissement_id' => $request->etablissement_id,
            'annee_universitaire' => $request->annee_universitaire,
            'group_id' => $request->group_id,
            'ville_id' => $request->ville_id,
        ]);

        // Return the newly created Examen as a JSON response
        return response()->json(['response' => $examen], 201);
    }

    public function update(Request $request, $id) {
        // Build validation rules to support "Tous les groupes"
        $rules = [
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'heure_debut_poigntage' => 'required',
            'heure_debut' => 'required',
            'heure_fin' => 'required',
            'tolerance' => 'nullable|integer|min:0|max:60',
            'option_id' => 'nullable|exists:options,id',
            'salle_id' => 'required|exists:salles,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_examen_id' => 'required|exists:types_examen,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
            'all_groups' => 'nullable|boolean',
        ];

        if (!$request->boolean('all_groups')) {
            $rules['group_id'] = 'required|exists:groups,id';
        } else {
            $rules['group_id'] = 'nullable|exists:groups,id';
        }

        $request->validate($rules);

        // Find the Examen by id
        $examen = Examen::find($id);
        if (!$examen) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Update the Examen with the new data
        $payload = $request->only(['title', 'date', 'heure_debut_poigntage', 'heure_debut', 'heure_fin', 'tolerance', 'option_id', 'salle_id', 'promotion_id', 'type_examen_id', 'etablissement_id', 'group_id', 'ville_id']);
        $examen->update($payload);

        // Return the updated Examen as a JSON response
        return response()->json($examen, 200);
    }

    function ImportExamens(Request $request) {
        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'Aucun fichier téléchargé'], 400);
        }

        $file = $request->file('file');
        
        // Vérifier le type de fichier
        $allowedTypes = ['csv', 'txt'];
        $fileExtension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($fileExtension, $allowedTypes)) {
            return response()->json(['message' => 'Type de fichier non supporté. Utilisez CSV ou TXT'], 400);
        }

        try {
            $path = $file->getRealPath();
            $handle = fopen($path, 'r');
            
            if ($handle === false) {
                return response()->json(['message' => 'Impossible d\'ouvrir le fichier'], 400);
            }
            
            // Détecter le délimiteur
            $firstLine = fgets($handle);
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);

            // Lire les en-têtes
            $header = fgetcsv($handle, 0, $delimiter);
            if (!$header) {
                fclose($handle);
                return response()->json(['message' => 'Format CSV invalide'], 400);
            }

            // Normaliser les en-têtes
            $header = array_map(function($h) {
                return strtolower(trim($h));
            }, $header);

            // Vérifier les en-têtes requis
            $requiredHeaders = ['title', 'date', 'heure_debut', 'heure_fin', 'salle_id', 'promotion_id', 'type_examen_id', 'etablissement_id', 'group_id', 'ville_id'];
            $optionalHeaders = ['tolerance', 'option_id'];
            $missingHeaders = array_diff($requiredHeaders, $header);
            
            if (!empty($missingHeaders)) {
                fclose($handle);
                return response()->json([
                    'message' => 'En-têtes manquants: ' . implode(', ', $missingHeaders),
                    'required_headers' => $requiredHeaders,
                    'found_headers' => $header
                ], 400);
            }

            $examens = [];
            $errors = [];
            $lineNumber = 1; // Commencer à 1 car on a déjà lu l'en-tête

            // Lire et traiter chaque ligne
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                $lineNumber++;
                $row = array_map('trim', $row);
                
                // Ignorer les lignes vides
                if (empty(array_filter($row))) {
                    continue;
                }

                try {
                    $examenData = array_combine($header, $row);
                    
                    // Valider et transformer les données
                    $validatedData = $this->validateAndTransformExamenData($examenData, $lineNumber);
                    
                    if ($validatedData) {
                        $examens[] = $validatedData;
                    }
                } catch (\Exception $e) {
                    $errors[] = [
                        'line' => $lineNumber,
                        'data' => $row,
                        'error' => $e->getMessage()
                    ];
                }
            }

            fclose($handle);

            // Si il y a des erreurs, les retourner
            if (!empty($errors)) {
                return response()->json([
                    'message' => 'Erreurs détectées lors de l\'importation',
                    'errors' => $errors,
                    'total_errors' => count($errors)
                ], 400);
            }

            // Insérer les données dans la base
            if (!empty($examens)) {
                try {
                    Examen::insert($examens);
                    
                    return response()->json([
                        'message' => count($examens) . ' examens importés avec succès',
                        'imported_count' => count($examens),
                        'data' => $examens
                    ], 200);
                } catch (\Exception $e) {
                    return response()->json([
                        'message' => 'Erreur lors de l\'insertion en base de données',
                        'error' => $e->getMessage()
                    ], 500);
                }
            }

            return response()->json(['message' => 'Aucune donnée valide trouvée dans le fichier'], 400);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors du traitement du fichier',
                'error' => $e->getMessage()
            ], 500);
        }
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

    public function destroy($id) {
        // Find the Examen by id
        $examen = Examen::find($id);

        if (empty($examen)) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Delete the Examen
        $examen->delete();

        // Return a success response
        return response()->json(['message' => 'Examen deleted successfully'], 200);
    }

    /**
     * Get all establishments for filter dropdown
     */
    public function getEtablissements()
    {
        $etablissements = \App\Models\Etablissement::select('id', 'name')->get();
        return response()->json(['etablissements' => $etablissements]);
    }

    /**
     * Get all promotions for filter dropdown
     */
    public function getPromotions()
    {
        $promotions = \App\Models\Promotion::select('id', 'name')->get();
        return response()->json(['promotions' => $promotions]);
    }

    /**
     * Get all salles for filter dropdown
     */
    public function getSalles()
    {
        $salles = \App\Models\Salle::select('id', 'name', 'etage', 'batiment')->get();
        return response()->json(['salles' => $salles]);
    }

    /**
     * Get all filter options in one request
     */
    public function getFilterOptions()
    {
        $etablissements = \App\Models\Etablissement::select('id', 'name')->get();
        $promotions = \App\Models\Promotion::select('id', 'name')->get();
        $salles = \App\Models\Salle::select('id', 'name', 'etage', 'batiment')->get();
        $options = \App\Models\Option::select('id', 'name')->get();
        $groups = \App\Models\Group::select('id', 'title')->get();
        $villes = \App\Models\Ville::select('id', 'name')->get();

        return response()->json([
            'etablissements' => $etablissements,
            'promotions' => $promotions,
            'salles' => $salles,
            'options' => $options,
            'groups' => $groups,
            'villes' => $villes
        ]);
    }

    /**
     * Valider et transformer les données d'un examen
     */
    private function validateAndTransformExamenData(array $data, int $lineNumber): ?array
    {
        // Vérifier que les champs requis ne sont pas vides
        $requiredFields = ['title', 'date', 'heure_debut', 'heure_fin', 'salle_id', 'promotion_id', 'type_examen_id', 'etablissement_id', 'group_id', 'ville_id'];
        
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new \Exception("Le champ '$field' est requis à la ligne $lineNumber");
            }
        }

        // Valider et formater la date
        $date = $this->parseDate($data['date']);
        if (!$date) {
            throw new \Exception("Format de date invalide à la ligne $lineNumber. Utilisez YYYY-MM-DD ou DD/MM/YYYY");
        }

        // Valider et formater les heures
        $heureDebut = $this->parseTime($data['heure_debut']);
        $heureFin = $this->parseTime($data['heure_fin']);
        
        if (!$heureDebut || !$heureFin) {
            throw new \Exception("Format d'heure invalide à la ligne $lineNumber. Utilisez HH:MM ou HH:MM:SS");
        }

        // Vérifier que l'heure de fin est après l'heure de début
        if ($heureDebut >= $heureFin) {
            throw new \Exception("L'heure de fin doit être après l'heure de début à la ligne $lineNumber");
        }

        // Vérifier que les IDs existent
        $this->validateForeignKeys($data, $lineNumber);

        return [
            'title' => $data['title'],
            'date' => $date,
            'heure_debut' => $heureDebut,
            'heure_fin' => $heureFin,
            'tolerance' => !empty($data['tolerance']) ? (int)$data['tolerance'] : 15,
            'option_id' => !empty($data['option_id']) ? $data['option_id'] : null,
            'salle_id' => $data['salle_id'],
            'promotion_id' => $data['promotion_id'],
            'type_examen_id' => $data['type_examen_id'],
            'etablissement_id' => $data['etablissement_id'],
            'group_id' => $data['group_id'],
            'ville_id' => $data['ville_id'],
            'created_at' => now(),
            'updated_at' => now()
        ];
    }

    /**
     * Parser une date depuis différents formats
     */
    private function parseDate(string $dateString): ?string
    {
        $formats = ['Y-m-d', 'd/m/Y', 'd-m-Y', 'm/d/Y'];
        
        foreach ($formats as $format) {
            $date = DateTime::createFromFormat($format, $dateString);
            if ($date !== false) {
                return $date->format('Y-m-d');
            }
        }
        
        return null;
    }

    /**
     * Parser une heure depuis différents formats
     */
    private function parseTime(string $timeString): ?string
    {
        $formats = ['H:i', 'H:i:s', 'G:i', 'G:i:s'];
        
        foreach ($formats as $format) {
            $time = DateTime::createFromFormat($format, $timeString);
            if ($time !== false) {
                return $time->format('H:i:s');
            }
        }
        
        return null;
    }

    /**
     * Valider que les clés étrangères existent
     */
    private function validateForeignKeys(array $data, int $lineNumber): void
    {
        $foreignKeys = [
            'salle_id' => \App\Models\Salle::class,
            'promotion_id' => \App\Models\Promotion::class,
            'type_examen_id' => \App\Models\TypeExamen::class,
            'etablissement_id' => \App\Models\Etablissement::class,
            'group_id' => \App\Models\Group::class,
            'ville_id' => \App\Models\Ville::class
        ];

        if (!empty($data['option_id'])) {
            $foreignKeys['option_id'] = \App\Models\Option::class;
        }

        foreach ($foreignKeys as $field => $modelClass) {
            if (!empty($data[$field])) {
                $exists = $modelClass::find($data[$field]);
                if (!$exists) {
                    throw new \Exception("L'ID {$data[$field]} pour '$field' n'existe pas à la ligne $lineNumber");
                }
            }
        }
    }

    /**
     * Calculer le statut temporel d'un examen
     */
    private function calculateStatutTemporel($examen)
    {
        $timezone = new DateTimeZone('Africa/Casablanca'); // Définir le fuseau horaire marocain
        $now = new DateTime('now', $timezone); // Utiliser l'heure actuelle dans le fuseau horaire marocain
        $examenDate = new DateTime($examen->date, $timezone); // Utiliser la date de l'examen dans le fuseau horaire marocain
        
        // Comparer seulement les dates (sans l'heure)
        $nowDate = $now->format('Y-m-d');
        $examenDateOnly = $examenDate->format('Y-m-d');
        
        // Si la date de l'examen est dans le passé
        if ($examenDateOnly < $nowDate) {
            return 'passé';
        }
        
        // Si c'est aujourd'hui, vérifier les heures
        if ($examenDateOnly === $nowDate) {
            // Créer les dates complètes avec l'heure en utilisant seulement la date
            $dateOnly = $examenDate->format('Y-m-d');
            $heureDebut = new DateTime($dateOnly . ' ' . $examen->heure_debut, $timezone);
            $heureFin = new DateTime($dateOnly . ' ' . $examen->heure_fin, $timezone);
            
            // Comparer les heures avec les secondes pour une précision exacte
            $nowTime = $now->format('H:i:s');
            $heureDebutTime = $heureDebut->format('H:i:s');
            $heureFinTime = $heureFin->format('H:i:s');
            
            // Si l'heure actuelle est avant le début
            if ($nowTime < $heureDebutTime) {
                return 'futur';
            }
            
            // Si l'heure actuelle est incluse entre le début et la fin (inclus)
            if ($nowTime >= $heureDebutTime && $nowTime < $heureFinTime) {
                return 'en_cours';
            }
            
            // Si l'heure actuelle est après la fin
            return 'passé';
        }
        
        // Si la date est dans le futur
        return 'futur';
    }
}
