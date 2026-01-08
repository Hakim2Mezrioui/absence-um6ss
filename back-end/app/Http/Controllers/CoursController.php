<?php

namespace App\Http\Controllers;

use App\Models\Cours;
use App\Services\AttendanceStateService;
use App\Services\CoursService;
use App\Services\UserContextService;
use App\Services\ConfigurationService;
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
    protected $configurationService;

    public function __construct(AttendanceStateService $attendanceStateService, CoursService $coursService, UserContextService $userContextService, ConfigurationService $configurationService)
    {
        $this->attendanceStateService = $attendanceStateService;
        $this->coursService = $coursService;
        $this->userContextService = $userContextService;
        $this->configurationService = $configurationService;
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

        // Charger les relations, avec salles en option (peut ne pas exister pour les anciens cours)
        $relations = ['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville', 'enseignant'];
        // Ajouter salles seulement si la table existe
        try {
            \DB::select('SELECT 1 FROM cours_salle LIMIT 1');
            $relations[] = 'salles';
        } catch (\Exception $e) {
            // Table n'existe pas encore, ignorer
        }
        $query = Cours::with($relations)
                        ->whereNull('archived_at'); // Exclure les cours archivés

        // Appliquer le filtrage par contexte utilisateur
        $userContext = $this->userContextService->getUserContext();
        $user = \Illuminate\Support\Facades\Auth::user();
        
        // Exception pour technicien (role_id = 5) sans établissement : voir tous les cours
        $isTechnicienWithoutEtablissement = $user && $user->role_id == 5 && is_null($user->etablissement_id);
        
        // Vérifier le rôle defilement (role_id = 8) et verrouiller le filtrage par etablissement_id
        $isDefilement = $user && $user->role_id == 8 && !is_null($user->etablissement_id);
        
        // Si l'utilisateur est un enseignant (role_id = 6), ne montrer que ses cours
        if ($user && $user->role_id == 6) {
            $query->where('enseignant_id', $user->id);
        } elseif (!$this->userContextService->isSuperAdmin() && !$isTechnicienWithoutEtablissement) {
            // Si l'utilisateur n'est pas super-admin et n'est pas technicien sans établissement, appliquer les filtres
            if ($userContext['ville_id']) {
                $query->where('ville_id', $userContext['ville_id']);
            }
            if ($userContext['etablissement_id']) {
                $query->where('etablissement_id', $userContext['etablissement_id']);
            }
        }
        
        // Pour defilement, forcer et verrouiller le filtrage par etablissement_id
        if ($isDefilement) {
            $query->where('etablissement_id', $user->etablissement_id);
            // Ignorer le paramètre etablissement_id de la requête pour éviter le contournement
            $etablissement_id = $user->etablissement_id;
        }

        // Appliquer les filtres (etablissement_id sera ignoré pour defilement)
        if (!empty($etablissement_id) && !$isDefilement) {
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
        // Charger les relations, avec salles en option
        $relations = ['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville', 'enseignant'];
        try {
            \DB::select('SELECT 1 FROM cours_salle LIMIT 1');
            $relations[] = 'salles';
        } catch (\Exception $e) {
            // Table n'existe pas encore, ignorer
        }
        $cours = Cours::with($relations)->find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }
        
        // Si l'utilisateur est un enseignant, vérifier qu'il a accès à ce cours
        $user = \Illuminate\Support\Facades\Auth::user();
        if ($user && $user->role_id == 6 && $cours->enseignant_id != $user->id) {
            return response()->json(['message' => 'Accès non autorisé'], 403);
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
            'attendance_mode' => 'nullable|in:normal,bicheck',
            'tracking_method' => 'nullable|in:biostar,qr_code',
            'exit_capture_window' => 'nullable|integer|min:0|max:120',
            'etablissement_id' => 'required|exists:etablissements,id',
            'promotion_id' => 'required|exists:promotions,id',
            'type_cours_id' => 'required|exists:types_cours,id',
            'salle_id' => 'nullable|exists:salles,id', // Déprécié mais gardé pour compatibilité
            'salles_ids' => 'nullable|array',
            'salles_ids.*' => 'exists:salles,id',
            'option_id' => 'nullable|exists:options,id',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
            'ville_id' => 'required|exists:villes,id',
            'enseignant_id' => 'nullable|exists:users,id',
            'annee_universitaire' => 'required|string|max:9'
        ]);
        
        // Valeurs par défaut pour les nouveaux champs
        $validatedData['attendance_mode'] = $validatedData['attendance_mode'] ?? 'normal';
        $validatedData['exit_capture_window'] = $validatedData['exit_capture_window'] ?? 0;
        $validatedData['tracking_method'] = $validatedData['tracking_method'] ?? 'biostar';

        // Validation : au moins une salle doit être fournie (salle_id ou salles_ids)
        if (empty($validatedData['salles_ids']) && empty($validatedData['salle_id'])) {
            return response()->json(['message' => 'Au moins une salle doit être sélectionnée (salle_id ou salles_ids)'], 422);
        }

        // Extract group_ids and salles_ids from validated data
        $groupIds = $validatedData['group_ids'] ?? [];
        $sallesIds = $validatedData['salles_ids'] ?? [];
        unset($validatedData['group_ids']); // Remove from main data
        unset($validatedData['salles_ids']); // Remove from main data
        
        // Si salles_ids est vide mais salle_id est fourni, utiliser salle_id
        if (empty($sallesIds) && !empty($validatedData['salle_id'])) {
            $sallesIds = [$validatedData['salle_id']];
        }
        
        // Garder salle_id pour compatibilité (première salle)
        if (empty($validatedData['salle_id']) && !empty($sallesIds)) {
            $validatedData['salle_id'] = $sallesIds[0];
        }
        
        $cours = Cours::create($validatedData);
        
        // Synchroniser les salles multiples si salles_ids est fourni
        if (!empty($sallesIds)) {
            $cours->salles()->sync($sallesIds);
        } elseif ($validatedData['salle_id']) {
            // Si seulement salle_id est fourni, créer l'association dans le pivot aussi
            $cours->salles()->sync([$validatedData['salle_id']]);
        }
        
        // Attach groups if provided
        if (!empty($groupIds)) {
            $cours->groups()->attach($groupIds);
        }
        
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'salles', 'option', 'groups', 'ville', 'enseignant']);

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
        // Un cours est passé seulement si sa date de fin (date + heure_fin) est dans le passé
        $coursDate = new \DateTime($cours->date);
        $aujourdhui = new \DateTime();
        
        // Si le cours a une heure de fin, comparer avec la date + heure de fin
        if ($cours->heure_fin) {
            $heureFin = $cours->heure_fin;
            // S'assurer que l'heure est au format H:i ou H:i:s
            if (strlen($heureFin) <= 5) {
                $heureFin .= ':00'; // Ajouter les secondes si nécessaire
            }
            $coursDateTimeFin = clone $coursDate;
            $coursDateTimeFin->setTime(
                (int)substr($heureFin, 0, 2),
                (int)substr($heureFin, 3, 2),
                (int)substr($heureFin, 6, 2) ?? 0
            );
            
            if ($coursDateTimeFin < $aujourdhui) {
                return response()->json([
                    'message' => 'Impossible de modifier un cours passé',
                    'error' => 'PAST_COURS_MODIFICATION_FORBIDDEN'
                ], 403);
            }
        } else {
            // Si pas d'heure de fin, comparer seulement la date (sans l'heure)
            $coursDate->setTime(0, 0, 0);
            $aujourdhui->setTime(0, 0, 0);
            
            if ($coursDate < $aujourdhui) {
                return response()->json([
                    'message' => 'Impossible de modifier un cours passé',
                    'error' => 'PAST_COURS_MODIFICATION_FORBIDDEN'
                ], 403);
            }
        }

        $validatedData = $request->validate([
            'name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'pointage_start_hour' => 'sometimes|date_format:H:i',
            'heure_debut' => 'sometimes|date_format:H:i',
            'heure_fin' => 'sometimes|date_format:H:i|after:heure_debut',
            'tolerance' => 'sometimes|date_format:H:i',
            'attendance_mode' => 'nullable|in:normal,bicheck',
            'tracking_method' => 'nullable|in:biostar,qr_code',
            'exit_capture_window' => 'nullable|integer|min:0|max:120',
            'etablissement_id' => 'sometimes|exists:etablissements,id',
            'promotion_id' => 'sometimes|exists:promotions,id',
            'type_cours_id' => 'sometimes|exists:types_cours,id',
            'salle_id' => 'nullable|exists:salles,id', // Déprécié mais gardé pour compatibilité
            'salles_ids' => 'nullable|array',
            'salles_ids.*' => 'exists:salles,id',
            'option_id' => 'nullable|exists:options,id',
            'group_ids' => 'nullable|array',
            'group_ids.*' => 'exists:groups,id',
            'ville_id' => 'sometimes|exists:villes,id',
            'enseignant_id' => 'nullable|exists:users,id',
            'annee_universitaire' => 'sometimes|string|max:9'
        ]);

        // Extract group_ids and salles_ids from validated data
        $groupIds = $validatedData['group_ids'] ?? null;
        $sallesIds = $validatedData['salles_ids'] ?? null;
        unset($validatedData['group_ids']); // Remove from main data
        unset($validatedData['salles_ids']); // Remove from main data
        
        // Gérer les salles multiples
        if (isset($sallesIds)) {
            if (empty($sallesIds) && !empty($validatedData['salle_id'])) {
                // Si salles_ids est vide mais salle_id est fourni, utiliser salle_id
                $sallesIds = [$validatedData['salle_id']];
            }
            
            // Garder salle_id pour compatibilité (première salle)
            if (!empty($sallesIds)) {
                $validatedData['salle_id'] = $sallesIds[0];
            }
        } elseif (isset($validatedData['salle_id']) && !empty($validatedData['salle_id'])) {
            // Si seulement salle_id est fourni, l'utiliser pour salles_ids
            $sallesIds = [$validatedData['salle_id']];
        }
        
        $cours->update($validatedData);
        
        // Synchroniser les salles multiples si salles_ids est fourni
        if (isset($sallesIds)) {
            $cours->salles()->sync($sallesIds);
        }
        
        // Sync groups if provided
        if (isset($groupIds)) {
            $cours->groups()->sync($groupIds);
        }
        
        $cours->load(['etablissement', 'promotion', 'type_cours', 'salle', 'salles', 'option', 'groups', 'ville', 'enseignant']);

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
            $salles = \App\Models\Salle::select('id', 'name', 'ville_id', 'batiment', 'etage', 'capacite', 'description')
                ->with(['ville:id,name'])
                ->orderBy('name')
                ->get();

            // Récupérer les types de cours
            $typesCours = \App\Models\TypeCours::select('id', 'name')
                ->orderBy('name')
                ->get();

            // Récupérer les options
            $options = \App\Models\Option::select('id', 'name', 'etablissement_id')
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

            // Récupérer les enseignants (users avec role_id = 6)
            $enseignants = \App\Models\User::select('id', 'first_name', 'last_name', 'email')
                ->where('role_id', 6)
                ->orderBy('first_name')
                ->orderBy('last_name')
                ->get()
                ->map(function ($user) {
                    return [
                        'id' => $user->id,
                        'name' => $user->first_name . ' ' . $user->last_name,
                        'email' => $user->email
                    ];
                });

            return response()->json([
                'etablissements' => $etablissements,
                'promotions' => $promotions,
                'salles' => $salles,
                'types_cours' => $typesCours,
                'options' => $options,
                'groups' => $groups,
                'enseignants' => $enseignants,
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
                    'salles', 
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
            
            // Décalage horaire Biostar par défaut: -60 min (serveur en retard d'1h)
            // Exception: si le cours est à Rabat, ne pas appliquer de décalage
            $offsetMinutes = -60;
            if ($cours && $cours->ville && isset($cours->ville->name)) {
                if (strtolower(trim($cours->ville->name)) === 'rabat') {
                    $offsetMinutes = 0;
                }
            }

            // Get connection configuration from database based on cours ville if available
            if ($cours && !empty($cours->ville_id)) {
                $config = $this->configurationService->getConnectionConfigForVille($cours->ville_id);
                \Log::info('Configuration sélectionnée par ville cours', [
                    'cours_id' => $cours->id,
                    'ville_id' => $cours->ville_id,
                    'has_config' => is_array($config) && isset($config['dsn'])
                ]);
            } else {
                $config = $this->configurationService->getConnectionConfig();
                \Log::info('Configuration par défaut utilisée (aucune ville cours)');
            }
            
            if (is_array($config) && isset($config['dsn'])) {
                try {
                    $pdo = new PDO($config['dsn'], $config['username'], $config['password']);
                    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                    
                    // Normaliser la date du cours
                    $normalizedDate = date('Y-m-d', strtotime($date));
                    
                    // Fonction pour normaliser les heures (comme dans EtudiantController)
                    $normalizeTime = function($t) {
                        if (empty($t)) return '00:00:00';
                        // Cas ISO complet
                        if (strpos($t, 'T') !== false || strpos($t, 'Z') !== false || strpos($t, '+') !== false) {
                            try {
                                return (new \DateTime($t))->format('H:i:s');
                            } catch (\Exception $e) {
                                // continue
                            }
                        }
                        // Si format HH:MM, ajouter :00
                        if (preg_match('/^\d{2}:\d{2}$/', $t)) {
                            return $t . ':00';
                        }
                        // Si déjà HH:MM:SS, le retourner tel quel, sinon tenter un parse
                        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) {
                            return $t;
                        }
                        return date('H:i:s', strtotime($t));
                    };
                    
                    // Déterminer l'heure de début réelle à utiliser (pointage si défini sinon heure_debut)
                    $heureReference = $heureDebutPointage ? $heureDebutPointage : $heureDebut;
                    
                    $hourRefWithSec = $normalizeTime($heureReference);
                    $hourFinWithSec = $normalizeTime($heureFin);
                    $exitWindowMinutes = (int)($cours->exit_capture_window ?? 0);
                    
                    // Construire la fenêtre datetime côté client avec la date normalisée
                    $startClientDt = new \DateTime("{$normalizedDate} {$hourRefWithSec}");
                    $endClientDt = new \DateTime("{$normalizedDate} {$hourFinWithSec}");
                    if ($exitWindowMinutes > 0) {
                        $endClientDt->modify("+{$exitWindowMinutes} minutes");
                    }
                    
                    // Le serveur Biostar est décalé de -60 minutes (serveur en retard d'1h)
                    $startServerDt = (clone $startClientDt)->modify("{$offsetMinutes} minutes");
                    $endServerDt = (clone $endClientDt)->modify("{$offsetMinutes} minutes");
                    
                    // Si la fenêtre passe minuit côté serveur, étendre la date de fin
                    if ($endServerDt < $startServerDt) {
                        $endServerDt->modify('+1 day');
                    }
                    
                    $startDtFormatted = $startServerDt->format('Y-m-d H:i:s');
                    $endDtFormatted = $endServerDt->format('Y-m-d H:i:s');
                    
                    \Log::info('CoursController: Paramètres de requête Biostar', [
                        'normalized_date' => $normalizedDate,
                        'heure_reference' => $heureReference,
                        'heure_debut_pointage' => $heureDebutPointage,
                        'heure_debut' => $heureDebut,
                        'heure_fin' => $heureFin,
                        'hour_ref_with_sec' => $hourRefWithSec,
                        'hour_fin_with_sec' => $hourFinWithSec,
                        'offset_minutes' => $offsetMinutes,
                        'start_client_dt' => $startClientDt->format('Y-m-d H:i:s'),
                        'end_client_dt' => $endClientDt->format('Y-m-d H:i:s'),
                        'start_server_dt' => $startDtFormatted,
                        'end_server_dt' => $endDtFormatted,
                        'exit_window_minutes' => $exitWindowMinutes
                    ]);
                    
                    // Requête optimisée: fenêtre datetime continue (comme dans EtudiantController)
                    $sql = "
                        SELECT *
                        FROM punchlog
                        WHERE devdt BETWEEN :start_dt AND :end_dt
                          AND devnm NOT LIKE 'TOUR%'
                          AND devnm NOT LIKE 'ACCES HCK%'
                    ";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute(['start_dt' => $startDtFormatted, 'end_dt' => $endDtFormatted]);
                    
                    // Fetch the results
                    $biostarResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    
                    \Log::info('CoursController: Résultats Biostar récupérés', [
                        'nombre_pointages' => count($biostarResults),
                        'premiers_pointages' => array_slice($biostarResults, 0, 3),
                        'champs_disponibles' => !empty($biostarResults) ? array_keys($biostarResults[0]) : []
                    ]);
                    
                } catch (PDOException $e) {
                    // If Biostar connection fails, log the error
                    \Log::error("Erreur de connexion Biostar:", [
                        'error' => $e->getMessage(),
                        'code' => $e->getCode(),
                        'cours_id' => $cours->id ?? null
                    ]);
                    $biostarResults = [];
                }
            } else {
                \Log::warning('CoursController: Configuration Biostar non trouvée', [
                    'cours_id' => $cours->id ?? null,
                    'ville_id' => $cours->ville_id ?? null
                ]);
                $biostarResults = [];
            }
            
            // Filtrer par devices autorisés de la/les salle(s) (si définis)
            // Priorité: relation 'salles' si présente (multi-salles), sinon 'salle'
            $allowedDeviceIds = [];
            $allowedDeviceNames = [];
            
            // Vérifier si le cours a des salles
            $hasSalles = false;
            
            if ($cours) {
                if (method_exists($cours, 'salles') && $cours->relationLoaded('salles') && $cours->salles && $cours->salles->isNotEmpty()) {
                    $hasSalles = true;
                    // Multi-salles: collecter les devices de toutes les salles
                    foreach ($cours->salles as $salle) {
                        if (is_array($salle->devices)) {
                            foreach ($salle->devices as $d) {
                                if (is_array($d)) {
                                    // Extraire devid et devnm
                                    if (isset($d['devid'])) {
                                        $allowedDeviceIds[] = (string)$d['devid'];
                                    }
                                    if (isset($d['devnm'])) {
                                        $allowedDeviceNames[] = (string)$d['devnm'];
                                    }
                                }
                            }
                        }
                    }
                } elseif ($cours->salle_id && $cours->salle) {
                    $hasSalles = true;
                    if (is_array($cours->salle->devices) && count($cours->salle->devices) > 0) {
                        // Fallback sur salle unique
                        foreach ($cours->salle->devices as $d) {
                            if (is_array($d)) {
                                // Extraire devid et devnm
                                if (isset($d['devid'])) {
                                    $allowedDeviceIds[] = (string)$d['devid'];
                                }
                                if (isset($d['devnm'])) {
                                    $allowedDeviceNames[] = (string)$d['devnm'];
                                }
                            }
                        }
                    }
                }
            }
            
            // Si le cours a des salles mais aucun device assigné, rejeter tous les pointages
            if ($hasSalles && empty($allowedDeviceIds) && empty($allowedDeviceNames)) {
                // Le cours a des salles mais aucun device assigné
                // On rejette tous les pointages
                $biostarResults = [];
                \Log::warning('CoursController: Cours a des salles mais aucun device assigné - tous les pointages sont rejetés', [
                    'cours_id' => $cours->id,
                    'salles_count' => method_exists($cours, 'salles') && $cours->relationLoaded('salles') ? $cours->salles->count() : 0,
                    'salle_id' => $cours->salle_id
                ]);
            } elseif (!empty($allowedDeviceIds) || !empty($allowedDeviceNames)) {
                $beforeCount = is_array($biostarResults) ? count($biostarResults) : 0;
                
                // Normaliser les noms pour comparaison case-insensitive
                $allowedDeviceNames = array_map(function($name) {
                    return strtolower(trim((string)$name));
                }, $allowedDeviceNames);
                
                $allowedDeviceIds = array_values(array_unique(array_filter($allowedDeviceIds)));
                $allowedDeviceNames = array_values(array_unique(array_filter($allowedDeviceNames)));
                
                $biostarResults = array_values(array_filter($biostarResults, function($row) use ($allowedDeviceIds, $allowedDeviceNames) {
                        // Match par devid (prioritaire)
                        if (!empty($allowedDeviceIds)) {
                            $punchDevId = isset($row['devid']) ? (string)$row['devid'] : null;
                            if ($punchDevId && in_array($punchDevId, $allowedDeviceIds, true)) {
                                return true;
                            }
                        }
                        // Match par nom (fallback) - punchlog utilise devnm (pas devmam)
                        if (!empty($allowedDeviceNames)) {
                            $punchName = $row['devnm'] ?? ($row['device_name'] ?? ($row['name'] ?? null));
                            if ($punchName) {
                                $normalizedPunchName = strtolower(trim((string)$punchName));
                                if (in_array($normalizedPunchName, $allowedDeviceNames, true)) {
                                    return true;
                                }
                            }
                        }
                        return false;
                    }));
                    $afterCount = count($biostarResults);
                    \Log::info('Biostar device filtering applied (cours)', [
                        'allowed_device_ids' => $allowedDeviceIds,
                        'allowed_device_names' => $allowedDeviceNames,
                        'before' => $beforeCount,
                        'after' => $afterCount,
                        'ignored' => max(0, $beforeCount - $afterCount),
                        'cours_id' => $cours->id,
                        'sample_punchlog_devices' => array_slice(array_unique(array_column(array_slice($biostarResults, 0, 10), 'devnm')), 0, 5),
                        'filtered' => true
                    ]);
            } else {
                // Pas de filtrage - tous les pointages sont acceptés (cours sans salles)
                \Log::info('Biostar device filtering NOT applied (cours)', [
                    'cours_id' => $cours->id,
                    'has_salles' => $hasSalles,
                    'total_punches' => count($biostarResults),
                    'filtered' => false
                ]);
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
                        'salles' => $cours->salles,
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

            // Récupérer les paramètres du mode bi-check
            $attendanceMode = $cours->attendance_mode ?? 'normal';
            $exitCaptureWindow = $cours->exit_capture_window ?? 0;
            $heureFin = $cours->heure_fin;
            
            // Prepare the final response with attendance status
            $studentsWithAttendance = $localStudents->map(function ($student) use ($presentStudentMatricules, $biostarResults, $heureDebutPointage, $heureDebut, $tolerance, $cours, $attendanceMode, $exitCaptureWindow, $heureFin, $offsetMinutes) {
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
                $status = 'absent';
                $punchTime = null;
                $punchIn = null;
                $punchOut = null;
                $punchInRaw = null;
                $punchOutRaw = null;
                
                if ($attendanceMode === 'bicheck') {
                    // Mode bi-check: nécessite pointage entrée ET sortie
                    $punches = $this->getAllPunches($student->matricule, $biostarResults);
                    
                    if (!empty($punches)) {
                        $punchInRaw = $punches[0];
                        $punchOutRaw = null;
                        
                        // Fonction pour normaliser les heures (ISO -> HH:MM:SS)
                        $normalizeTimeLocal = function($t) {
                            if (empty($t)) return '00:00:00';
                            if (strpos($t, 'T') !== false || strpos($t, 'Z') !== false || strpos($t, '+') !== false) {
                                try {
                                    return (new \DateTime($t))->format('H:i:s');
                                } catch (\Exception $e) {
                                    // continue
                                }
                            }
                            if (preg_match('/^\d{2}:\d{2}$/', $t)) {
                                return $t . ':00';
                            }
                            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) {
                                return $t;
                            }
                            return date('H:i:s', strtotime($t));
                        };
                        
                        // Normaliser la date du cours
                        $normalizedDate = date('Y-m-d', strtotime($cours->date));
                        
                        // Normaliser les heures
                        $heureDebutNormalized = $normalizeTimeLocal($heureDebut);
                        $heureFinNormalized = $normalizeTimeLocal($heureFin);
                        $heurePointageNormalized = $normalizeTimeLocal($cours->pointage_start_hour ?? $heureDebut);
                        $toleranceNormalized = $normalizeTimeLocal($tolerance);
                        
                        // Convertir les heures en timestamps pour comparaison
                        $heureDebutCours = strtotime($normalizedDate . ' ' . $heureDebutNormalized);
                        $heureFinCours = strtotime($normalizedDate . ' ' . $heureFinNormalized);
                        $heureDebutPointageTimestamp = strtotime($normalizedDate . ' ' . $heurePointageNormalized);
                        
                        // Convertir la tolérance en minutes (format HH:MM:SS)
                        $toleranceParts = explode(':', $toleranceNormalized);
                        $toleranceMinutes = (int)$toleranceParts[0] * 60 + (int)$toleranceParts[1];
                        $heureLimiteEntree = $heureDebutCours + ($toleranceMinutes * 60);
                        
                        // Fenêtre de capture sortie (en secondes)
                        $exitWindowSeconds = $exitCaptureWindow * 60;
                        $heureLimiteSortie = $heureFinCours + $exitWindowSeconds;
                        
                        // Offset Biostar: le serveur Biostar est décalé de -60 minutes (sauf Rabat)
                        // Pour comparer les punches avec les fenêtres locales, on doit ajouter l'offset inverse
                        // aux timestamps des punches (c'est-à-dire +60 minutes pour Casablanca)
                        $biostarOffsetSeconds = ($offsetMinutes * -1) * 60; // offsetMinutes = -60 → biostarOffsetSeconds = +3600
                        
                        // Log pour debug bi-check
                        \Log::info('Bi-check fenêtres pour étudiant', [
                            'matricule' => $student->matricule,
                            'date' => $normalizedDate,
                            'heure_debut' => $heureDebutNormalized,
                            'heure_fin' => $heureFinNormalized,
                            'heure_pointage' => $heurePointageNormalized,
                            'tolerance' => $toleranceNormalized,
                            'tolerance_minutes' => $toleranceMinutes,
                            'biostar_offset_seconds' => $biostarOffsetSeconds,
                            'fenetre_entree' => [
                                'debut' => date('Y-m-d H:i:s', $heureDebutPointageTimestamp),
                                'fin' => date('Y-m-d H:i:s', $heureLimiteEntree)
                            ],
                            'fenetre_sortie' => [
                                'debut' => date('Y-m-d H:i:s', $heureFinCours),
                                'fin' => date('Y-m-d H:i:s', $heureLimiteSortie)
                            ],
                            'punches_count' => count($punches),
                            'punches' => array_map(function($p) use ($biostarOffsetSeconds) { 
                                $raw = $p['time'] ?? 'N/A';
                                $adjusted = $raw !== 'N/A' ? date('Y-m-d H:i:s', strtotime($raw) + $biostarOffsetSeconds) : 'N/A';
                                return ['raw' => $raw, 'adjusted' => $adjusted];
                            }, $punches)
                        ]);
                        
                        // Normaliser les punches avec timestamp local (offset Biostar corrigé)
                        $punchesWithTs = array_map(function($p) use ($biostarOffsetSeconds) {
                            return array_merge($p, [
                                'timestamp' => strtotime($p['time']) + $biostarOffsetSeconds
                            ]);
                        }, $punches);

                        // Entrée : conserver le PREMIER punch dans la fenêtre d'entrée
                        $entryCandidates = array_values(array_filter($punchesWithTs, function($p) use ($heureDebutPointageTimestamp, $heureLimiteEntree) {
                            return $p['timestamp'] >= $heureDebutPointageTimestamp && $p['timestamp'] <= $heureLimiteEntree;
                        }));
                        if (!empty($entryCandidates)) {
                            usort($entryCandidates, function($a, $b) { return $a['timestamp'] <=> $b['timestamp']; });
                            $punchIn = [
                                'time' => $entryCandidates[0]['time'],
                                'device' => $entryCandidates[0]['device']
                            ];
                            $punchInRaw = $punchIn;
                        }

                        // Sortie : conserver le DERNIER punch dans la fenêtre de sortie
                        $exitCandidates = array_values(array_filter($punchesWithTs, function($p) use ($heureFinCours, $heureLimiteSortie) {
                            return $p['timestamp'] >= $heureFinCours && $p['timestamp'] <= $heureLimiteSortie;
                        }));
                        if (!empty($exitCandidates)) {
                            usort($exitCandidates, function($a, $b) { return $a['timestamp'] <=> $b['timestamp']; });
                            $lastExit = $exitCandidates[count($exitCandidates) - 1];
                            $punchOut = [
                                'time' => $lastExit['time'],
                                'device' => $lastExit['device']
                            ];
                            $punchOutRaw = $punchOut;
                        } elseif (count($punchesWithTs) > 1) {
                            // Pas de punch valide en sortie → montrer tout de même le dernier brut pour audit
                            $lastPunch = $punchesWithTs[count($punchesWithTs) - 1];
                            $punchOutRaw = [
                                'time' => $lastPunch['time'],
                                'device' => $lastPunch['device']
                            ];
                        }
                        
                        // Déterminer le statut
                        if ($punchIn && $punchOut) {
                            // Les deux pointages sont présents
                            // Appliquer l'offset pour comparer avec l'heure de début du cours
                            $punchInTimestamp = strtotime($punchIn['time']) + $biostarOffsetSeconds;
                            $status = $punchInTimestamp <= $heureDebutCours ? 'present' : 'late';
                            // On considère la sortie comme pointage principal (plus récent)
                            $punchTime = $punchOut;
                        } elseif ($punchIn && !$punchOut) {
                            // Pointage entrée mais pas de sortie
                            $status = 'pending_exit';
                            $punchTime = null;
                        } elseif (!$punchIn && !empty($punches)) {
                            // Pointage détecté mais hors fenêtre d'entrée
                            $status = 'pending_entry';
                            $punchTime = null;
                        }
                    } else {
                        $punchInRaw = null;
                        $punchOutRaw = null;
                    }
                } else {
                    // Mode normal: logique existante
                    $punchTime = $this->getPunchTime($student->matricule, $biostarResults);
                    $isPresent = false;
                    $isLate = false;

                    if ($punchTime) {
                        // Fonction pour normaliser les heures (ISO -> HH:MM:SS)
                        $normalizeTimeLocal = function($t) {
                            if (empty($t)) return '00:00:00';
                            if (strpos($t, 'T') !== false || strpos($t, 'Z') !== false || strpos($t, '+') !== false) {
                                try {
                                    return (new \DateTime($t))->format('H:i:s');
                                } catch (\Exception $e) {
                                    // continue
                                }
                            }
                            if (preg_match('/^\d{2}:\d{2}$/', $t)) {
                                return $t . ':00';
                            }
                            if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) {
                                return $t;
                            }
                            return date('H:i:s', strtotime($t));
                        };
                        
                        // Convertir l'heure de pointage en format comparable
                        $punchTimeFormatted = date('H:i:s', strtotime($punchTime['time']));
                        $heureDebutCoursNormalized = $normalizeTimeLocal($heureDebut);
                        $toleranceNormalized = $normalizeTimeLocal($tolerance);
                        
                        // Convertir la tolérance en minutes (format HH:MM:SS -> minutes)
                        $toleranceParts = explode(':', $toleranceNormalized);
                        $toleranceMinutes = (int)$toleranceParts[0] * 60 + (int)$toleranceParts[1];
                        
                        // Calculer l'heure limite (début + tolérance en minutes)
                        $heureLimite = date('H:i:s', strtotime($heureDebutCoursNormalized . ' + ' . $toleranceMinutes . ' minutes'));
                        
                        if ($punchTimeFormatted <= $heureLimite) {
                            $isPresent = true;
                            $status = $punchTimeFormatted <= $heureDebutCoursNormalized ? 'present' : 'late';
                        }
                    }
                }

                $result = [
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
                
                // Ajouter les pointages d'entrée et de sortie pour le mode bi-check
                if ($attendanceMode === 'bicheck') {
                    $result['punch_in'] = $punchIn;
                    $result['punch_out'] = $punchOut;
                    $result['punch_in_raw'] = $punchInRaw ?? $punchIn;
                    $result['punch_out_raw'] = $punchOutRaw ?? $punchOut;
                }
                
                return $result;
            });

            // Calculer les statistiques
            $totalStudents = $studentsWithAttendance->count();
            $presents = $studentsWithAttendance->where('status', 'present')->count();
            $lates = $studentsWithAttendance->where('status', 'late')->count();
            $absents = $studentsWithAttendance->whereIn('status', ['absent', 'pending_entry', 'pending_exit'])->count();
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
                    'attendance_mode' => $cours->attendance_mode ?? 'normal',
                    'exit_capture_window' => $cours->exit_capture_window ?? 0,
                    'tracking_method' => $cours->tracking_method ?? 'biostar',
                    'etablissement' => $cours->etablissement,
                    'promotion' => $cours->promotion,
                    'type_cours' => $cours->type_cours,
                    'salle' => $cours->salle,
                    'salles' => $cours->salles,
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
     * Prend le dernier pointage de l'étudiant
     */
    private function getPunchTime($matricule, $biostarResults)
    {
        // Utilitaires de sélection du dernier pointage
        $getTimestamp = function ($punch) {
            $raw = $punch['devdt'] ?? ($punch['punch_time'] ?? null);
            return $raw ? strtotime($raw) : null;
        };
        $pickLatest = function ($collection) use ($getTimestamp) {
            $sorted = $collection
                ->filter(function ($p) use ($getTimestamp) { return $getTimestamp($p) !== null; })
                ->sortBy(function ($p) use ($getTimestamp) { return $getTimestamp($p); });
            return $sorted->last();
        };

        // Stratégie 1: Correspondance exacte (dernier pointage)
        $matches = collect($biostarResults)->filter(function ($punch) use ($matricule) {
            return isset($punch['user_id']) && $punch['user_id'] == $matricule;
        });
        if ($matches->isNotEmpty()) {
            $studentPunch = $pickLatest($matches);
            return [
                'time' => $studentPunch['devdt'] ?? $studentPunch['punch_time'],
                'device' => ($studentPunch['devnm'] ?? ($studentPunch['device'] ?? ($studentPunch['device_name'] ?? ($studentPunch['name'] ?? 'Inconnu'))))
            ];
        }
        
        // Stratégie 2: Supprimer les zéros de début (ex: "000123" → "123")
        $matriculeTrimmed = ltrim($matricule, '0');
        if ($matriculeTrimmed !== $matricule && !empty($matriculeTrimmed)) {
            $matches = collect($biostarResults)->filter(function ($punch) use ($matriculeTrimmed) {
                return isset($punch['user_id']) && $punch['user_id'] == $matriculeTrimmed;
            });
            if ($matches->isNotEmpty()) {
                $studentPunch = $pickLatest($matches);
                \Log::info("Match trouvé avec suppression des zéros: '$matricule' → '$matriculeTrimmed'");
                return [
                    'time' => $studentPunch['devdt'] ?? $studentPunch['punch_time'],
                    'device' => ($studentPunch['devnm'] ?? ($studentPunch['device'] ?? ($studentPunch['device_name'] ?? ($studentPunch['name'] ?? 'Inconnu'))))
                ];
            }
        }
        
        // Stratégie 3: Ajouter des zéros de début (ex: "123" → "000123")
        $matriculePadded = str_pad($matricule, 6, '0', STR_PAD_LEFT);
        if ($matriculePadded !== $matricule) {
            $matches = collect($biostarResults)->filter(function ($punch) use ($matriculePadded) {
                return isset($punch['user_id']) && $punch['user_id'] == $matriculePadded;
            });
            if ($matches->isNotEmpty()) {
                $studentPunch = $pickLatest($matches);
                \Log::info("Match trouvé avec ajout de zéros: '$matricule' → '$matriculePadded'");
                return [
                    'time' => $studentPunch['devdt'] ?? $studentPunch['punch_time'],
                    'device' => ($studentPunch['devnm'] ?? ($studentPunch['device'] ?? ($studentPunch['device_name'] ?? ($studentPunch['name'] ?? 'Inconnu'))))
                ];
            }
        }
        
        // Stratégie 4: Recherche partielle (contient le matricule)
        $matches = collect($biostarResults)->filter(function ($punch) use ($matricule) {
            return isset($punch['user_id']) && strpos($punch['user_id'], $matricule) !== false;
        });
        if ($matches->isNotEmpty()) {
            $studentPunch = $pickLatest($matches);
            \Log::info("Match trouvé avec recherche partielle (dernier conservé): '$matricule'");
            return [
                'time' => $studentPunch['devdt'] ?? $studentPunch['punch_time'],
                'device' => ($studentPunch['devnm'] ?? ($studentPunch['device'] ?? ($studentPunch['device_name'] ?? ($studentPunch['name'] ?? 'Inconnu'))))
            ];
        }
        
        // Stratégie 5: Recherche inverse (le matricule contient le user_id)
        $matches = collect($biostarResults)->filter(function ($punch) use ($matricule) {
            return isset($punch['user_id']) && strpos($matricule, $punch['user_id']) !== false;
        });
        if ($matches->isNotEmpty()) {
            $studentPunch = $pickLatest($matches);
            \Log::info("Match trouvé avec recherche inverse (dernier conservé): '$matricule'");
            return [
                'time' => $studentPunch['devdt'] ?? $studentPunch['punch_time'],
                'device' => ($studentPunch['devnm'] ?? ($studentPunch['device'] ?? ($studentPunch['device_name'] ?? ($studentPunch['name'] ?? 'Inconnu'))))
            ];
        }
        
        // Aucun match trouvé
        \Log::warning("Aucun match trouvé pour le matricule: '$matricule'");
        return null;
    }

    /**
     * Get all punches for a specific student (for bi-check mode)
     */
    private function getAllPunches($matricule, $biostarResults)
    {
        $getTimestamp = function ($punch) {
            $raw = $punch['devdt'] ?? ($punch['punch_time'] ?? null);
            return $raw ? strtotime($raw) : null;
        };
        
        $findMatches = function ($searchMatricule) use ($biostarResults) {
            $matches = collect($biostarResults)->filter(function ($punch) use ($searchMatricule) {
                return isset($punch['user_id']) && $punch['user_id'] == $searchMatricule;
            });
            
            if ($matches->isEmpty()) {
                // Essayer avec suppression des zéros
                $trimmed = ltrim($searchMatricule, '0');
                if ($trimmed !== $searchMatricule && !empty($trimmed)) {
                    $matches = collect($biostarResults)->filter(function ($punch) use ($trimmed) {
                        return isset($punch['user_id']) && $punch['user_id'] == $trimmed;
                    });
                }
            }
            
            if ($matches->isEmpty()) {
                // Essayer avec ajout de zéros
                $padded = str_pad($searchMatricule, 6, '0', STR_PAD_LEFT);
                if ($padded !== $searchMatricule) {
                    $matches = collect($biostarResults)->filter(function ($punch) use ($padded) {
                        return isset($punch['user_id']) && $punch['user_id'] == $padded;
                    });
                }
            }
            
            if ($matches->isEmpty()) {
                // Recherche partielle (contient le matricule)
                $matches = collect($biostarResults)->filter(function ($punch) use ($searchMatricule) {
                    return isset($punch['user_id']) && strpos($punch['user_id'], $searchMatricule) !== false;
                });
            }

            if ($matches->isEmpty()) {
                // Recherche inverse (le matricule contient user_id)
                $matches = collect($biostarResults)->filter(function ($punch) use ($searchMatricule) {
                    return isset($punch['user_id']) && strpos($searchMatricule, $punch['user_id']) !== false;
                });
            }

            return $matches;
        };
        
        $matches = $findMatches($matricule);
        
        if ($matches->isEmpty()) {
            return [];
        }
        
        // Trier par timestamp et retourner tous les pointages
        return $matches
            ->filter(function ($p) use ($getTimestamp) { return $getTimestamp($p) !== null; })
            ->sortBy(function ($p) use ($getTimestamp) { return $getTimestamp($p); })
            ->map(function ($punch) {
                return [
                    'time' => $punch['devdt'] ?? $punch['punch_time'],
                    'device' => ($punch['devnm'] ?? ($punch['device'] ?? ($punch['device_name'] ?? ($punch['name'] ?? 'Inconnu'))))
                ];
            })
            ->values()
            ->toArray();
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

        // Charger les relations, avec salles en option
        $relations = ['etablissement', 'promotion', 'type_cours', 'salle', 'option', 'groups', 'ville', 'enseignant'];
        try {
            \DB::select('SELECT 1 FROM cours_salle LIMIT 1');
            $relations[] = 'salles';
        } catch (\Exception $e) {
            // Table n'existe pas encore, ignorer
        }
        $query = Cours::with($relations)
                        ->whereNotNull('archived_at'); // Seulement les cours archivés

        // Appliquer le filtrage par contexte utilisateur
        $userContext = $this->userContextService->getUserContext();
        $user = \Illuminate\Support\Facades\Auth::user();
        
        // Exception pour technicien (role_id = 5) sans établissement : voir tous les cours
        $isTechnicienWithoutEtablissement = $user && $user->role_id == 5 && is_null($user->etablissement_id);
        
        // Vérifier le rôle defilement (role_id = 8) et verrouiller le filtrage par etablissement_id
        $isDefilement = $user && $user->role_id == 8 && !is_null($user->etablissement_id);
        
        // Si l'utilisateur est un enseignant (role_id = 6), ne montrer que ses cours
        if ($user && $user->role_id == 6) {
            $query->where('enseignant_id', $user->id);
        } elseif (!$this->userContextService->isSuperAdmin() && !$isTechnicienWithoutEtablissement) {
            // Si l'utilisateur n'est pas super-admin et n'est pas technicien sans établissement, appliquer les filtres
            if ($userContext['ville_id']) {
                $query->where('ville_id', $userContext['ville_id']);
            }
            if ($userContext['etablissement_id']) {
                $query->where('etablissement_id', $userContext['etablissement_id']);
            }
        }
        
        // Pour defilement, forcer et verrouiller le filtrage par etablissement_id
        if ($isDefilement) {
            $query->where('etablissement_id', $user->etablissement_id);
            // Ignorer le paramètre etablissement_id de la requête pour éviter le contournement
            $etablissement_id = $user->etablissement_id;
        }

        // Appliquer les filtres (etablissement_id sera ignoré pour defilement)
        if (!empty($etablissement_id) && !$isDefilement) {
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
