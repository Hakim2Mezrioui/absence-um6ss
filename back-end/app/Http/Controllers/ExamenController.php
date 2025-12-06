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

        $query = Examen::with(['etablissement', 'promotion', 'typeExamen', 'salle', 'salles', 'option', 'group', 'ville'])
                        ->whereNull('archived_at'); // Exclure les examens archivés

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
        $examen = Examen::with(['etablissement', 'promotion', 'typeExamen', 'salle', 'salles', 'option', 'group', 'ville'])->find($id);
        if (!$examen) {
            return response()->json(["message" => "Examen not found", "status" => 404], 404);
        }

        // Calculer le statut temporel
        $examen->statut_temporel = $this->calculateStatutTemporel($examen);

        return response()->json(["examen" => $examen, "status" => 200], 200);
    }

    public function store(Request $request) {
        // Enforce établissement for admin users with assigned établissement
        $authUser = auth()->user();
        if ($authUser && (int)($authUser->role_id) === 2 && !empty($authUser->etablissement_id)) {
            $request->merge([
                'etablissement_id' => $authUser->etablissement_id,
            ]);
        }

        // Build validation rules to support "Tous les groupes"
        $rules = [
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'heure_debut_poigntage' => 'required',
            'heure_debut' => 'required',
            'heure_fin' => 'required',
            'tolerance' => 'nullable|integer|min:0|max:60',
            'tracking_method' => 'nullable|in:biostar,qr_code',
            'option_id' => 'nullable|exists:options,id',
            'salle_id' => 'nullable|exists:salles,id', // Déprécié mais gardé pour compatibilité
            'salles_ids' => 'nullable|array',
            'salles_ids.*' => 'exists:salles,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_examen_id' => 'required|exists:types_examen,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'annee_universitaire' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id',
            'all_groups' => 'nullable|boolean',
        ];

        // Validation : au moins une salle doit être fournie (salle_id ou salles_ids)
        if (empty($request->salles_ids) && empty($request->salle_id)) {
            return response()->json(['message' => 'Au moins une salle doit être sélectionnée (salle_id ou salles_ids)'], 422);
        }

        // If not all groups, require a specific group_id; otherwise allow nullable (fallback "Tous" si null et all_groups absent)
        if (!$request->boolean('all_groups')) {
            $rules['group_id'] = 'nullable|exists:groups,id'; // Permettre null pour fallback "Tous"
        } else {
            $rules['group_id'] = 'nullable|exists:groups,id';
        }

        // Validate the request input
        $request->validate($rules);

        // Si group_id est null et all_groups n'est pas défini, interpréter comme "Tous"
        $group_id = $request->group_id;
        $all_groups = $request->boolean('all_groups') || ($group_id === null);

        // Create a new Examen
        $examen = Examen::create([
            'title' => $request->title,
            'date' => $request->date,
            'heure_debut_poigntage' => $request->heure_debut_poigntage,
            'heure_debut' => $request->heure_debut,
            'heure_fin' => $request->heure_fin,
            'tolerance' => $request->tolerance ?? 15,
            'tracking_method' => $request->tracking_method ?? 'biostar',
            'option_id' => $request->option_id,
            'salle_id' => $request->salle_id ?? ($request->salles_ids[0] ?? null), // Garder salle_id pour compatibilité
            'promotion_id' => $request->promotion_id,
            'type_examen_id' => $request->type_examen_id,
            'etablissement_id' => $request->etablissement_id,
            'annee_universitaire' => $request->annee_universitaire,
            'group_id' => $all_groups ? null : $group_id,
            'ville_id' => $request->ville_id,
        ]);

        // Synchroniser les salles multiples si salles_ids est fourni
        if (!empty($request->salles_ids)) {
            $examen->salles()->sync($request->salles_ids);
        } elseif ($request->salle_id) {
            // Si seulement salle_id est fourni, créer l'association dans le pivot aussi
            $examen->salles()->sync([$request->salle_id]);
        }

        // Charger les relations pour la réponse
        $examen->load(['salles', 'salle']);

        // Return the newly created Examen as a JSON response
        return response()->json(['response' => $examen], 201);
    }

    public function update(Request $request, $id) {
        // Enforce établissement for admin users with assigned établissement
        $authUser = auth()->user();
        if ($authUser && (int)($authUser->role_id) === 2 && !empty($authUser->etablissement_id)) {
            $request->merge([
                'etablissement_id' => $authUser->etablissement_id,
            ]);
        }

        // Build validation rules to support "Tous les groupes"
        $rules = [
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'heure_debut_poigntage' => 'required',
            'heure_debut' => 'required',
            'heure_fin' => 'required',
            'tolerance' => 'nullable|integer|min:0|max:60',
            'tracking_method' => 'nullable|in:biostar,qr_code',
            'option_id' => 'nullable|exists:options,id',
            'salle_id' => 'nullable|exists:salles,id', // Déprécié mais gardé pour compatibilité
            'salles_ids' => 'nullable|array',
            'salles_ids.*' => 'exists:salles,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_examen_id' => 'required|exists:types_examen,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
            'all_groups' => 'nullable|boolean',
        ];

        // Validation : au moins une salle doit être fournie (salle_id ou salles_ids)
        if (empty($request->salles_ids) && empty($request->salle_id)) {
            return response()->json(['message' => 'Au moins une salle doit être sélectionnée (salle_id ou salles_ids)'], 422);
        }

        // If not all groups, require a specific group_id; otherwise allow nullable (fallback "Tous" si null et all_groups absent)
        if (!$request->boolean('all_groups')) {
            $rules['group_id'] = 'nullable|exists:groups,id'; // Permettre null pour fallback "Tous"
        } else {
            $rules['group_id'] = 'nullable|exists:groups,id';
        }

        $request->validate($rules);

        // Find the Examen by id
        $examen = Examen::find($id);
        if (!$examen) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Vérifier si l'examen est dans le passé
        if ($examen->isEnPasse()) {
            return response()->json([
                'message' => 'Impossible de modifier un examen passé',
                'error' => 'PAST_EXAMEN_MODIFICATION_FORBIDDEN'
            ], 403);
        }

        // Si group_id est null et all_groups n'est pas défini, interpréter comme "Tous"
        $group_id = $request->group_id;
        $all_groups = $request->boolean('all_groups') || ($group_id === null);

        // Update the Examen with the new data
        $payload = $request->only([
            'title',
            'date',
            'heure_debut_poigntage',
            'heure_debut',
            'heure_fin',
            'tolerance',
            'tracking_method',
            'option_id',
            'salle_id',
            'promotion_id',
            'type_examen_id',
            'etablissement_id',
            'ville_id'
        ]);
        
        // Mettre à jour group_id selon all_groups
        $payload['group_id'] = $all_groups ? null : $group_id;
        
        // Si salle_id n'est pas dans le payload mais salles_ids est fourni, utiliser la première salle pour salle_id (compatibilité)
        if (!isset($payload['salle_id']) && !empty($request->salles_ids)) {
            $payload['salle_id'] = $request->salles_ids[0];
        }
        
        $examen->update($payload);

        // Synchroniser les salles multiples si salles_ids est fourni
        if (!empty($request->salles_ids)) {
            $examen->salles()->sync($request->salles_ids);
        } elseif ($request->salle_id) {
            // Si seulement salle_id est fourni, synchroniser le pivot aussi
            $examen->salles()->sync([$request->salle_id]);
        }

        // Charger les relations pour la réponse
        $examen->load(['salles', 'salle']);

        // Return the updated Examen as a JSON response
        return response()->json($examen, 200);
    }

    function ImportExamens(Request $request) {
        if (!$request->hasFile('file')) {
            return response()->json(['message' => 'Aucun fichier téléchargé'], 400);
        }

        $file = $request->file('file');
        
        // Vérifier le type de fichier
        $allowedTypes = ['csv', 'txt', 'xlsx', 'xls'];
        $fileExtension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($fileExtension, $allowedTypes)) {
            return response()->json(['message' => 'Type de fichier non supporté. Utilisez CSV, TXT, XLSX ou XLS'], 400);
        }

        try {
            $path = $file->getRealPath();
            
            // Si c'est un fichier Excel, le convertir en CSV d'abord
            if (in_array($fileExtension, ['xlsx', 'xls'])) {
                return $this->importFromExcel($path, $fileExtension);
            }
            
            // Sinon, traiter comme CSV/TXT
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
                    $result = $this->insertExamensWithSalles($examens);
                    
                    $message = $result['created_count'] . ' examen(s) importé(s) avec succès';
                    if ($result['salles_attached'] > 0) {
                        $message .= ' (' . $result['salles_attached'] . ' salle(s) attachée(s))';
                    }
                    
                    return response()->json([
                        'message' => $message,
                        'imported_count' => $result['created_count'],
                        'salles_attached' => $result['salles_attached'],
                        'errors' => $result['errors'],
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
     * Archiver un examen
     */
    public function archive($id) {
        // Find the Examen by id
        $examen = Examen::find($id);

        if (empty($examen)) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Vérifier que l'examen est bien passé
        if (!$examen->isEnPasse()) {
            return response()->json(['message' => 'Seuls les examens passés peuvent être archivés'], 400);
        }

        // Marquer l'examen comme archivé
        $examen->update(['archived_at' => now()]);

        // Return a success response
        return response()->json(['message' => 'Examen archivé avec succès'], 200);
    }

    /**
     * Désarchiver un examen (super-admin et admin uniquement)
     */
    public function unarchive($id) {
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
            return response()->json(['message' => 'Accès refusé. Seuls les super-admin et admin peuvent désarchiver des examens.'], 403);
        }

        // Find the Examen by id
        $examen = Examen::find($id);

        if (empty($examen)) {
            return response()->json(['message' => 'Examen not found'], 404);
        }

        // Vérifier que l'examen est bien archivé
        if (is_null($examen->archived_at)) {
            return response()->json(['message' => 'Cet examen n\'est pas archivé'], 400);
        }

        // Désarchiver l'examen (mettre archived_at à null)
        $examen->update(['archived_at' => null]);

        // Return a success response
        return response()->json(['message' => 'Examen désarchivé avec succès'], 200);
    }

    /**
     * Récupérer les examens archivés
     */
    public function archived(Request $request) {
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

        $query = Examen::with(['etablissement', 'promotion', 'typeExamen', 'salle', 'salles', 'option', 'group', 'ville'])
                        ->whereNotNull('archived_at'); // Seulement les examens archivés

        // Apply filters
        $this->applyFilters($query, $etablissement_id, $promotion_id, $salle_id, $group_id, $ville_id, $searchValue, $date);

        // Get total count before pagination
        $total = $query->count();

        // Calculate pagination
        $totalPages = ceil($total / $size);
        $currentPage = min($page, $totalPages > 0 ? $totalPages : 1);

        // Get paginated results
        $examens = $query->orderBy('archived_at', 'desc')
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
        $promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->select('id', 'name')->get();
        return response()->json(['promotions' => $promotions]);
    }

    /**
     * Get all salles for filter dropdown
     */
    public function getSalles()
    {
        $salles = \App\Models\Salle::select('id', 'name', 'etage', 'batiment', 'etablissement_id', 'ville_id')->get();
        return response()->json(['salles' => $salles]);
    }

    /**
     * Get all filter options in one request
     */
    public function getFilterOptions()
    {
        $etablissements = \App\Models\Etablissement::select('id', 'name')->get();
        $promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->select('id', 'name')->get();
        $salles = \App\Models\Salle::select('id', 'name', 'etage', 'batiment', 'etablissement_id', 'ville_id')->get();
        $options = \App\Models\Option::select('id', 'name', 'etablissement_id')->get();
        $groups = \App\Models\Group::select('id', 'title')->get();
        $villes = \App\Models\Ville::select('id', 'name')->get();
        $typesExamen = \App\Models\TypeExamen::select('id', 'name')->get();

        return response()->json([
            'etablissements' => $etablissements,
            'promotions' => $promotions,
            'salles' => $salles,
            'options' => $options,
            'groups' => $groups,
            'villes' => $villes,
            'typesExamen' => $typesExamen
        ]);
    }

    /**
     * Valider et transformer les données d'un examen
     */
    private function validateAndTransformExamenData(array $data, int $lineNumber): ?array
    {
        // Vérifier que les champs requis de base ne sont pas vides
        $requiredBaseFields = ['title', 'date', 'heure_debut_poigntage', 'heure_debut', 'heure_fin'];
        
        foreach ($requiredBaseFields as $field) {
            if (empty($data[$field])) {
                throw new \Exception("Le champ '$field' est requis à la ligne $lineNumber");
            }
        }

        // Convertir les noms en IDs si nécessaire
        $data = $this->convertNamesToIds($data, $lineNumber);

        // Valider et formater la date
        $date = $this->parseDate($data['date']);
        if (!$date) {
            throw new \Exception("Format de date invalide à la ligne $lineNumber. Utilisez YYYY-MM-DD ou DD/MM/YYYY");
        }

        // Valider et formater les heures
        $heureDebutPoigntage = $this->parseTime($data['heure_debut_poigntage']);
        $heureDebut = $this->parseTime($data['heure_debut']);
        $heureFin = $this->parseTime($data['heure_fin']);
        
        if (!$heureDebutPoigntage || !$heureDebut || !$heureFin) {
            throw new \Exception("Format d'heure invalide à la ligne $lineNumber. Utilisez HH:MM ou HH:MM:SS");
        }

        // Vérifier que l'heure de pointage est avant l'heure de début
        if ($heureDebutPoigntage > $heureDebut) {
            throw new \Exception("L'heure de début de pointage doit être avant l'heure de début de l'examen à la ligne $lineNumber");
        }

        // Vérifier que l'heure de fin est après l'heure de début
        if ($heureDebut >= $heureFin) {
            throw new \Exception("L'heure de fin doit être après l'heure de début à la ligne $lineNumber");
        }

        // Vérifier que les IDs existent
        $this->validateForeignKeys($data, $lineNumber);

        $result = [
            'title' => $data['title'],
            'date' => $date,
            'heure_debut_poigntage' => $heureDebutPoigntage,
            'heure_debut' => $heureDebut,
            'heure_fin' => $heureFin,
            'tolerance' => !empty($data['tolerance']) ? (int)$data['tolerance'] : 15,
            'option_id' => !empty($data['option_id']) ? $data['option_id'] : null,
            'salle_id' => $data['salle_id'] ?? ($data['salle_ids'][0] ?? null), // Utiliser la première salle de salle_ids si salle_id n'est pas défini
            'promotion_id' => $data['promotion_id'],
            'type_examen_id' => $data['type_examen_id'],
            'etablissement_id' => $data['etablissement_id'],
            'group_id' => $data['group_id'],
            'ville_id' => $data['ville_id'],
            'annee_universitaire' => !empty($data['annee_universitaire']) ? $data['annee_universitaire'] : null,
            'created_at' => now(),
            'updated_at' => now()
        ];
        
        // Ajouter salle_ids si présent (pour la relation many-to-many)
        // Priorité à salle_ids si fourni, sinon créer depuis salle_id
        if (!empty($data['salle_ids']) && is_array($data['salle_ids'])) {
            $result['salle_ids'] = $data['salle_ids'];
        } elseif (!empty($result['salle_id'])) {
            // Si seulement salle_id est fourni, créer salle_ids avec cette salle
            $result['salle_ids'] = [$result['salle_id']];
        }
        
        return $result;
    }

    /**
     * Convertir les noms en IDs
     */
    private function convertNamesToIds(array $data, int $lineNumber): array
    {
        // Établissement (avec recherche flexible)
        if (empty($data['etablissement_id']) && !empty($data['etablissement_name'])) {
            $etablissement = $this->findEntityByName(\App\Models\Etablissement::class, $data['etablissement_name']);
            if (!$etablissement) {
                $available = \App\Models\Etablissement::pluck('name')->implode(', ');
                throw new \Exception("Établissement '{$data['etablissement_name']}' introuvable à la ligne $lineNumber. Disponibles: {$available}");
            }
            $data['etablissement_id'] = $etablissement->id;
        }

        // Promotion (avec recherche flexible)
        if (empty($data['promotion_id']) && !empty($data['promotion_name'])) {
            $promotion = $this->findEntityByName(\App\Models\Promotion::class, $data['promotion_name']);
            if (!$promotion) {
                $available = \App\Models\Promotion::pluck('name')->take(10)->implode(', ');
                throw new \Exception("Promotion '{$data['promotion_name']}' introuvable à la ligne $lineNumber. Exemples: {$available}");
            }
            $data['promotion_id'] = $promotion->id;
        }

        // Type d'examen (avec recherche flexible)
        if (empty($data['type_examen_id']) && !empty($data['type_examen_name'])) {
            // Essayer d'abord une correspondance exacte
            $typeExamen = \App\Models\TypeExamen::where('name', $data['type_examen_name'])->first();
            
            // Si pas trouvé, essayer une recherche insensible à la casse
            if (!$typeExamen) {
                $typeExamen = \App\Models\TypeExamen::whereRaw('LOWER(name) = ?', [strtolower($data['type_examen_name'])])->first();
            }
            
            // Si toujours pas trouvé, essayer une recherche partielle
            if (!$typeExamen) {
                $typeExamen = \App\Models\TypeExamen::where('name', 'LIKE', '%' . $data['type_examen_name'] . '%')->first();
            }
            
            if (!$typeExamen) {
                // Suggérer les types disponibles
                $availableTypes = \App\Models\TypeExamen::pluck('name')->implode(', ');
                throw new \Exception("Type d'examen '{$data['type_examen_name']}' introuvable à la ligne $lineNumber. Types disponibles: {$availableTypes}");
            }
            $data['type_examen_id'] = $typeExamen->id;
        }

        // Salle (avec recherche flexible) - Support de plusieurs salles séparées par virgule
        // Parser salle_name si fourni (priorité à salle_name même si salle_id existe)
        if (!empty($data['salle_name'])) {
            // Parser les salles séparées par virgule
            $salleNames = array_map('trim', explode(',', $data['salle_name']));
            $salleIds = [];
            $notFoundSalles = [];
            
            foreach ($salleNames as $salleName) {
                if (empty($salleName)) continue;
                
                $salle = $this->findEntityByName(\App\Models\Salle::class, $salleName);
                if ($salle) {
                    $salleIds[] = $salle->id;
                } else {
                    $notFoundSalles[] = $salleName;
                }
            }
            
            if (empty($salleIds)) {
                $available = \App\Models\Salle::pluck('name')->take(10)->implode(', ');
                throw new \Exception("Aucune salle trouvée à la ligne $lineNumber. Salles recherchées: " . implode(', ', $salleNames) . ". Exemples disponibles: {$available}");
            }
            
            if (!empty($notFoundSalles)) {
                // Avertir mais continuer avec les salles trouvées
                \Log::warning("Certaines salles non trouvées à la ligne $lineNumber: " . implode(', ', $notFoundSalles));
            }
            
            $data['salle_id'] = $salleIds[0]; // Première salle pour compatibilité
            $data['salle_ids'] = $salleIds; // Array de toutes les salles
        }
        
        // Support direct de salle_ids depuis le frontend
        if (!empty($data['salle_ids']) && is_array($data['salle_ids'])) {
            // S'assurer que salle_id est défini (première salle pour compatibilité)
            if (empty($data['salle_id'])) {
                $data['salle_id'] = $data['salle_ids'][0] ?? null;
            }
        }

        // Groupe (avec recherche flexible sur 'title')
        if (empty($data['group_id']) && !empty($data['group_title'])) {
            // Pour les groupes, on utilise 'title' au lieu de 'name'
            $group = \App\Models\Group::where('title', $data['group_title'])->first();
            if (!$group) {
                $group = \App\Models\Group::whereRaw('LOWER(title) = ?', [strtolower($data['group_title'])])->first();
            }
            if (!$group) {
                $group = \App\Models\Group::where('title', 'LIKE', '%' . $data['group_title'] . '%')->first();
            }
            if (!$group) {
                $available = \App\Models\Group::pluck('title')->take(10)->implode(', ');
                throw new \Exception("Groupe '{$data['group_title']}' introuvable à la ligne $lineNumber. Exemples: {$available}");
            }
            $data['group_id'] = $group->id;
        }

        // Ville (avec recherche flexible)
        if (empty($data['ville_id']) && !empty($data['ville_name'])) {
            $ville = $this->findEntityByName(\App\Models\Ville::class, $data['ville_name']);
            if (!$ville) {
                $available = \App\Models\Ville::pluck('name')->implode(', ');
                throw new \Exception("Ville '{$data['ville_name']}' introuvable à la ligne $lineNumber. Disponibles: {$available}");
            }
            $data['ville_id'] = $ville->id;
        }

        // Option (optionnel, avec recherche flexible)
        if (empty($data['option_id']) && !empty($data['option_name'])) {
            $option = $this->findEntityByName(\App\Models\Option::class, $data['option_name']);
            if ($option) {
                $data['option_id'] = $option->id;
            }
        }

        return $data;
    }

    /**
     * Rechercher une entité par son nom avec recherche flexible
     */
    private function findEntityByName(string $modelClass, string $name)
    {
        // 1. Correspondance exacte
        $entity = $modelClass::where('name', $name)->first();
        if ($entity) return $entity;
        
        // 2. Correspondance exacte insensible à la casse
        $entity = $modelClass::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();
        if ($entity) return $entity;
        
        // 3. Correspondance partielle (contient le texte)
        $entity = $modelClass::where('name', 'LIKE', '%' . $name . '%')->first();
        if ($entity) return $entity;
        
        // 4. Le texte contient le nom de l'entité
        $entity = $modelClass::whereRaw('? LIKE CONCAT("%", name, "%")', [$name])->first();
        if ($entity) return $entity;
        
        return null;
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
     * Insérer les examens avec leurs salles (relation many-to-many)
     */
    private function insertExamensWithSalles(array $examens): array
    {
        $createdCount = 0;
        $sallesAttached = 0;
        $errors = [];
        
        foreach ($examens as $index => $examenData) {
            try {
                // Extraire les salle_ids si présents
                $salleIds = $examenData['salle_ids'] ?? [];
                unset($examenData['salle_ids']); // Retirer de l'array pour l'insertion
                
                // Créer l'examen
                $examen = Examen::create($examenData);
                $createdCount++;
                
                // Attacher toutes les salles via la relation many-to-many
                if (!empty($salleIds)) {
                    $examen->salles()->sync($salleIds);
                    $sallesAttached += count($salleIds);
                }
            } catch (\Exception $e) {
                $errors[] = [
                    'index' => $index,
                    'error' => $e->getMessage()
                ];
                \Log::error("Erreur lors de la création de l'examen à l'index $index: " . $e->getMessage());
            }
        }
        
        return [
            'created_count' => $createdCount,
            'salles_attached' => $sallesAttached,
            'errors' => $errors
        ];
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

    /**
     * Importer des examens depuis un fichier Excel
     */
    private function importFromExcel(string $path, string $extension): \Illuminate\Http\JsonResponse
    {
        try {
            // Vérifier si PhpSpreadsheet est disponible
            if (!class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
                return response()->json([
                    'message' => 'La bibliothèque PhpSpreadsheet n\'est pas installée. Veuillez exécuter: composer require phpoffice/phpspreadsheet'
                ], 500);
            }

            // Charger le fichier Excel
            $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($path);
            $worksheet = $spreadsheet->getActiveSheet();
            $rows = $worksheet->toArray();

            if (empty($rows)) {
                return response()->json(['message' => 'Le fichier Excel est vide'], 400);
            }

            // Extraire les en-têtes
            $header = array_shift($rows);
            $header = array_map(function($h) {
                return strtolower(trim($h));
            }, $header);

            // Vérifier les en-têtes requis (accepter soit les noms soit les IDs)
            $requiredBaseHeaders = ['title', 'date', 'heure_debut_poigntage', 'heure_debut', 'heure_fin'];
            $missingBaseHeaders = array_diff($requiredBaseHeaders, $header);
            
            if (!empty($missingBaseHeaders)) {
                return response()->json([
                    'message' => 'En-têtes de base manquants: ' . implode(', ', $missingBaseHeaders),
                    'required_headers' => $requiredBaseHeaders,
                    'found_headers' => $header
                ], 400);
            }
            
            // Vérifier qu'on a soit les IDs soit les noms pour chaque relation
            $hasEtablissementId = in_array('etablissement_id', $header);
            $hasEtablissementName = in_array('etablissement_name', $header);
            $hasPromotionId = in_array('promotion_id', $header);
            $hasPromotionName = in_array('promotion_name', $header);
            $hasTypeExamenId = in_array('type_examen_id', $header);
            $hasTypeExamenName = in_array('type_examen_name', $header);
            $hasSalleId = in_array('salle_id', $header);
            $hasSalleName = in_array('salle_name', $header);
            $hasGroupId = in_array('group_id', $header);
            $hasGroupTitle = in_array('group_title', $header);
            $hasVilleId = in_array('ville_id', $header);
            $hasVilleName = in_array('ville_name', $header);
            
            if (!$hasEtablissementId && !$hasEtablissementName) {
                return response()->json(['message' => 'Colonne etablissement_id ou etablissement_name requise'], 400);
            }
            if (!$hasPromotionId && !$hasPromotionName) {
                return response()->json(['message' => 'Colonne promotion_id ou promotion_name requise'], 400);
            }
            if (!$hasTypeExamenId && !$hasTypeExamenName) {
                return response()->json(['message' => 'Colonne type_examen_id ou type_examen_name requise'], 400);
            }
            if (!$hasSalleId && !$hasSalleName) {
                return response()->json(['message' => 'Colonne salle_id ou salle_name requise'], 400);
            }
            if (!$hasGroupId && !$hasGroupTitle) {
                return response()->json(['message' => 'Colonne group_id ou group_title requise'], 400);
            }
            if (!$hasVilleId && !$hasVilleName) {
                return response()->json(['message' => 'Colonne ville_id ou ville_name requise'], 400);
            }

            $examens = [];
            $errors = [];
            $lineNumber = 1;

            // Traiter chaque ligne
            foreach ($rows as $row) {
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
                    $result = $this->insertExamensWithSalles($examens);
                    
                    $message = $result['created_count'] . ' examen(s) importé(s) avec succès';
                    if ($result['salles_attached'] > 0) {
                        $message .= ' (' . $result['salles_attached'] . ' salle(s) attachée(s))';
                    }
                    
                    return response()->json([
                        'message' => $message,
                        'imported_count' => $result['created_count'],
                        'salles_attached' => $result['salles_attached'],
                        'errors' => $result['errors'],
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
                'message' => 'Erreur lors du traitement du fichier Excel',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
