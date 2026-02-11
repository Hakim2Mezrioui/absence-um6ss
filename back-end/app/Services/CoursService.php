<?php

namespace App\Services;

use App\Models\Cours;
use App\Models\Etudiant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CoursService
{
    use FilterByUserContext;
    /**
     * Get all courses with their relationships (filtered by user context)
     */
    public function getAllCours(): Collection
    {
        $query = Cours::with(['etablissement', 'promotion', 'salle', 'type_cours', 'ville', 'groups']);
        return $this->applyUserContextFilters($query)->get();
    }

    /**
     * Get a specific course by ID (filtered by user context)
     */
    public function getCoursById(int $id): ?Cours
    {
        $query = Cours::with(['etablissement', 'promotion', 'salle', 'type_cours', 'option', 'ville', 'groups'])->where('id', $id);
        return $this->applyUserContextFilters($query)->first();
    }

    /**
     * Create a new course (with user context)
     */
    public function createCours(array $data): Cours
    {
        $context = $this->getUserContextForFiltering();
        
        // Automatically set ville_id and etablissement_id from user context
        if ($context['ville_id']) {
            $data['ville_id'] = $context['ville_id'];
        }
        if ($context['etablissement_id']) {
            $data['etablissement_id'] = $context['etablissement_id'];
        }
        
        // Extract group_ids from data
        $groupIds = $data['group_ids'] ?? [];
        unset($data['group_ids']); // Remove from main data
        
        // Create the course
        $cours = Cours::create($data);
        
        // Attach groups if provided
        if (!empty($groupIds)) {
            $cours->groups()->attach($groupIds);
        }
        
        return $cours->load('groups');
    }

    /**
     * Update an existing course
     */
    public function updateCours(int $id, array $data): ?Cours
    {
        $cours = Cours::find($id);
        if ($cours) {
            // Extract group_ids from data
            $groupIds = $data['group_ids'] ?? [];
            unset($data['group_ids']); // Remove from main data
            
            // Update the course
            $cours->update($data);
            
            // Sync groups if provided
            if (isset($groupIds)) {
                $cours->groups()->sync($groupIds);
            }
            
            return $cours->fresh(['groups']);
        }
        return null;
    }

    /**
     * Delete a course
     */
    public function deleteCours(int $id): bool
    {
        $cours = Cours::find($id);
        if ($cours) {
            return $cours->delete();
        }
        return false;
    }

    /**
     * Get courses by etablissement
     */
    public function getCoursByEtablissement(int $etablissementId): Collection
    {
        return Cours::where('etablissement_id', $etablissementId)
                   ->with(['faculte', 'salle', 'typeCours'])
                   ->get();
    }

    /**
     * Get courses by faculte
     */
    public function getCoursByFaculte(int $faculteId): Collection
    {
        return Cours::where('faculte_id', $faculteId)
                   ->with(['etablissement', 'salle', 'typeCours'])
                   ->get();
    }

    /**
     * Get courses by type
     */
    public function getCoursByType(int $typeCoursId): Collection
    {
        return Cours::where('type_cours_id', $typeCoursId)
                   ->with(['etablissement', 'faculte', 'salle'])
                   ->get();
    }

    /**
     * Get courses by salle
     */
    public function getCoursBySalle(int $salleId): Collection
    {
        return Cours::where('salle_id', $salleId)
                   ->with(['etablissement', 'faculte', 'typeCours'])
                   ->get();
    }

    /**
     * Get courses by day of week
     */
    public function getCoursByDayOfWeek(int $dayOfWeek): Collection
    {
        return Cours::where('jour_semaine', $dayOfWeek)
                   ->with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->orderBy('heure_debut')
                   ->get();
    }

    /**
     * Get courses for today
     */
    public function getCoursForToday(): Collection
    {
        $today = Carbon::today();
        $dayOfWeek = $today->dayOfWeek; // 0 = Sunday, 1 = Monday, etc.

        return Cours::where('jour_semaine', $dayOfWeek)
                   ->with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->orderBy('heure_debut')
                   ->get();
    }

    /**
     * Get courses for a specific date
     */
    public function getCoursForDate(string $date): Collection
    {
        $carbonDate = Carbon::parse($date);
        $dayOfWeek = $carbonDate->dayOfWeek;

        return Cours::where('jour_semaine', $dayOfWeek)
                   ->with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->orderBy('heure_debut')
                   ->get();
    }

    /**
     * Check salle availability for course
     */
    public function checkSalleAvailability(int $salleId, int $jourSemaine, string $heureDebut, string $heureFin, int $excludeCoursId = null): bool
    {
        $query = Cours::where('salle_id', $salleId)
                      ->where('jour_semaine', $jourSemaine);

        if ($excludeCoursId) {
            $query->where('id', '!=', $excludeCoursId);
        }

        $conflictingCours = $query->where(function ($q) use ($heureDebut, $heureFin) {
            $q->whereBetween('heure_debut', [$heureDebut, $heureFin])
              ->orWhereBetween('heure_fin', [$heureDebut, $heureFin])
              ->orWhere(function ($subQ) use ($heureDebut, $heureFin) {
                  $subQ->where('heure_debut', '<=', $heureDebut)
                        ->where('heure_fin', '>=', $heureFin);
              });
        })->exists();

        return !$conflictingCours;
    }

    /**
     * Get available salles for course (filtered by user context)
     */
    public function getAvailableSalles(int $jourSemaine, string $heureDebut, string $heureFin): Collection
    {
        $salles = \App\Models\Salle::with(['ville'])->get();
        $availableSalles = collect();

        foreach ($salles as $salle) {
            if ($this->checkSalleAvailability($salle->id, $jourSemaine, $heureDebut, $heureFin)) {
                $availableSalles->push($salle);
            }
        }

        return $availableSalles;
    }

    /**
     * Import courses from JSON data (modern method)
     */
    public function importCoursFromData(array $coursesData): array
    {
        $results = [
            'total' => 0,
            'created' => 0,
            'updated' => 0,
            'errors' => 0,
            'error_details' => []
        ];

        try {
            $results['total'] = count($coursesData);
            
            foreach ($coursesData as $index => $courseData) {
                try {
                    // Valider et transformer les données
                    $coursData = $this->transformCoursDataForImport($courseData);
                    
                    // Extraire salle_ids avant la création/mise à jour
                    $salleIds = $coursData['_salle_ids'] ?? [];
                    unset($coursData['_salle_ids']); // Retirer de l'array pour l'insertion
                    
                    // Extraire group_ids avant la création/mise à jour
                    $groupIds = $coursData['group_ids'] ?? [];
                    unset($coursData['group_ids']); // Retirer de l'array pour l'insertion
                    
                    // Vérifier si le cours existe déjà
                    $existingCours = Cours::where('name', $coursData['name'])
                        ->where('date', $coursData['date'])
                        ->where('heure_debut', $coursData['heure_debut'])
                        ->where('etablissement_id', $coursData['etablissement_id'])
                        ->first();

                    if ($existingCours) {
                        // Mettre à jour le cours existant
                        $existingCours->update($coursData);
                        // Synchroniser les salles
                        if (!empty($salleIds)) {
                            $existingCours->salles()->sync($salleIds);
                        }
                        // Synchroniser les groupes si fournis
                        if (!empty($groupIds)) {
                            $existingCours->groups()->sync($groupIds);
                        }
                        $results['updated']++;
                    } else {
                        // Créer un nouveau cours
                        $cours = Cours::create($coursData);
                        // Attacher toutes les salles via la relation many-to-many
                        if (!empty($salleIds)) {
                            $cours->salles()->sync($salleIds);
                        }
                        // Attacher les groupes si fournis
                        if (!empty($groupIds)) {
                            $cours->groups()->sync($groupIds);
                        }
                        $results['created']++;
                    }

                } catch (\Exception $e) {
                    $results['errors']++;
                    $results['error_details'][] = [
                        'line' => $index + 1,
                        'message' => $e->getMessage(),
                        'data' => $courseData
                    ];
                }
            }

        } catch (\Exception $e) {
            $results['errors']++;
            $results['error_details'][] = [
                'line' => 0,
                'message' => 'Erreur lors du traitement des données: ' . $e->getMessage()
            ];
        }

        return $results;
    }

    /**
     * Import courses from Excel file (modern method)
     */
    public function importCoursFromExcel($file, $request = null): array
    {
        $results = [
            'total' => 0,
            'created' => 0,
            'updated' => 0,
            'errors' => 0,
            'error_details' => []
        ];

        try {
            // Le frontend génère un fichier Excel temporaire, on va le traiter directement
            $filePath = $file->getPathname();
            
            // Utiliser une approche différente pour lire le fichier Excel
            // Le frontend génère un fichier Excel avec des données JSON dans le FormData
            $coursesData = [];
            
            // Essayer de récupérer les données depuis le FormData si elles sont disponibles
            if ($request && $request->has('data')) {
                $coursesData = json_decode($request->input('data'), true);
            }
            
            // Si pas de données JSON, essayer de lire le fichier Excel comme CSV avec détection d'encodage
            if (empty($coursesData)) {
                // Détecter l'encodage du fichier
                $content = file_get_contents($filePath);
                $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
                
                if ($encoding === false) {
                    $encoding = 'UTF-8';
                }
                
                // Convertir le contenu en UTF-8 si nécessaire
                if ($encoding !== 'UTF-8') {
                    $content = mb_convert_encoding($content, 'UTF-8', $encoding);
                    file_put_contents($filePath, $content);
                }
                
                $handle = fopen($filePath, 'r');
                if (!$handle) {
                    throw new \Exception('Impossible d\'ouvrir le fichier');
                }
                
                $headers = fgetcsv($handle);
                if (!$headers) {
                    throw new \Exception('Format de fichier invalide');
                }
                
                $headers = array_map('strtolower', array_map('trim', $headers));
                
                while (($row = fgetcsv($handle)) !== false) {
                    $rowData = array_combine($headers, $row);
                    $coursesData[] = $rowData;
                }
                
                fclose($handle);
            }
            
            if (empty($coursesData)) {
                throw new \Exception('Aucune donnée valide trouvée dans le fichier');
            }
            
            $results['total'] = count($coursesData);
            
            foreach ($coursesData as $index => $courseData) {
                try {
                    // Valider et transformer les données
                    $coursData = $this->transformCoursDataForImport($courseData);
                    
                    // Extraire salle_ids avant la création/mise à jour
                    $salleIds = $coursData['_salle_ids'] ?? [];
                    unset($coursData['_salle_ids']); // Retirer de l'array pour l'insertion

                    // Extraire group_ids avant la création/mise à jour
                    $groupIds = $coursData['group_ids'] ?? [];
                    unset($coursData['group_ids']); // Retirer de l'array pour l'insertion
                    
                    // Vérifier si le cours existe déjà
                    $existingCours = Cours::where('name', $coursData['name'])
                        ->where('date', $coursData['date'])
                        ->where('heure_debut', $coursData['heure_debut'])
                        ->where('etablissement_id', $coursData['etablissement_id'])
                        ->first();

                    if ($existingCours) {
                        // Mettre à jour le cours existant
                        $existingCours->update($coursData);
                        // Synchroniser les salles
                        if (!empty($salleIds)) {
                            $existingCours->salles()->sync($salleIds);
                        }
                        // Synchroniser les groupes si fournis
                        if (!empty($groupIds)) {
                            $existingCours->groups()->sync($groupIds);
                        }
                        $results['updated']++;
                    } else {
                        // Créer un nouveau cours
                        $cours = Cours::create($coursData);
                        // Attacher toutes les salles via la relation many-to-many
                        if (!empty($salleIds)) {
                            $cours->salles()->sync($salleIds);
                        }
                        // Attacher les groupes si fournis
                        if (!empty($groupIds)) {
                            $cours->groups()->sync($groupIds);
                        }
                        $results['created']++;
                    }

                } catch (\Exception $e) {
                    $results['errors']++;
                    $results['error_details'][] = [
                        'line' => $index + 1,
                        'message' => $e->getMessage(),
                        'data' => $courseData
                    ];
                }
            }

        } catch (\Exception $e) {
            $results['errors']++;
            $results['error_details'][] = [
                'line' => 0,
                'message' => 'Erreur lors de la lecture du fichier: ' . $e->getMessage()
            ];
        }

        return $results;
    }

    /**
     * Transform course data from Excel import
     */
    private function transformCoursDataForImport(array $data): array
    {
        // Valider les champs requis (mapping des champs du frontend)
        $requiredFields = ['name', 'date', 'heure_debut', 'heure_fin', 'etablissement_id', 'promotion_id', 'type_cours_id', 'ville_id'];
        foreach ($requiredFields as $field) {
            if (empty($data[$field])) {
                throw new \Exception("Le champ '{$field}' est requis");
            }
        }

        // Convertir la date si elle est au format DD/MM/YYYY
        $date = $data['date'];
        if (strpos($date, '/') !== false) {
            $carbonDate = \Carbon\Carbon::createFromFormat('d/m/Y', $date);
            if (!$carbonDate) {
                throw new \Exception("Format de date invalide: '{$date}'. Utilisez le format DD/MM/YYYY");
            }
            $date = $carbonDate->format('Y-m-d');
        }

        // Convertir les heures
        $heureDebut = $this->formatTime($data['heure_debut']);
        $heureFin = $this->formatTime($data['heure_fin']);
        $tolerance = $this->formatTime($data['tolerance'] ?? '00:15');

        // Heure de début de pointage :
        // - si le frontend envoie une valeur dédiée (pointage_start_hour),
        //   on l'utilise après normalisation
        // - sinon, on retombe sur l'heure de début du cours
        if (!empty($data['pointage_start_hour'])) {
            $pointageStartHour = $this->formatTime($data['pointage_start_hour']);
        } else {
            $pointageStartHour = $heureDebut;
        }

        // Parser les salles multiples si salle_name est fourni
        $salleIds = [];
        if (!empty($data['salle_name'])) {
            // Parser les salles séparées par virgule
            $salleNames = array_map('trim', explode(',', $data['salle_name']));
            foreach ($salleNames as $salleName) {
                if (empty($salleName)) continue;
                
                // Rechercher la salle par nom (recherche flexible)
                $salle = \App\Models\Salle::where('name', $salleName)
                    ->orWhereRaw('LOWER(name) = ?', [strtolower($salleName)])
                    ->orWhere('name', 'LIKE', '%' . $salleName . '%')
                    ->first();
                
                if ($salle) {
                    $salleIds[] = $salle->id;
                }
            }
            
            if (empty($salleIds)) {
                throw new \Exception("Aucune salle trouvée pour: " . $data['salle_name']);
            }
        } elseif (!empty($data['salle_id'])) {
            // Si seulement salle_id est fourni, créer salle_ids avec cette salle
            $salleIds = [$data['salle_id']];
        } else {
            throw new \Exception("Le champ 'salle_id' ou 'salle_name' est requis");
        }

        $coursData = [
            'name' => $data['name'],
            'date' => $date,
            'pointage_start_hour' => $pointageStartHour,
            'heure_debut' => $heureDebut,
            'heure_fin' => $heureFin,
            'tolerance' => $tolerance,
            'attendance_mode' => $data['attendance_mode'] ?? 'normal',
            'exit_capture_window' => isset($data['exit_capture_window']) ? (int)$data['exit_capture_window'] : 0,
            'etablissement_id' => $data['etablissement_id'],
            'promotion_id' => $data['promotion_id'],
            'type_cours_id' => $data['type_cours_id'],
            'salle_id' => $salleIds[0], // Première salle pour compatibilité
            'ville_id' => $data['ville_id'],
            'annee_universitaire' => $data['annee_universitaire'] ?? '2024-2025'
        ];

        // Groupes (relation many-to-many)
        // Priorité à group_ids si fourni, sinon fabriquer depuis group_id
        if (!empty($data['group_ids']) && is_array($data['group_ids'])) {
            $coursData['group_ids'] = array_map('intval', $data['group_ids']);
        } elseif (!empty($data['group_id'])) {
            $coursData['group_ids'] = [(int)$data['group_id']];
        }

        // Option (optionnel)
        if (!empty($data['option_id'])) {
            $coursData['option_id'] = $data['option_id'];
        }

        // Rechercher l'enseignant par nom ou email depuis la table enseignant
        if (!empty($data['enseignant_name']) || !empty($data['enseignant_email'])) {
            $searchValue = trim($data['enseignant_name'] ?? $data['enseignant_email']);
            
            if (empty($searchValue)) {
                // Pas d'enseignant à rechercher, continuer sans enseignant_id
                // (enseignant_id peut être null dans la base de données)
            } else {
            
            // IMPORTANT: Supprimer le scope de filtrage pour permettre la recherche de tous les enseignants
            // lors de l'import, peu importe le rôle de l'utilisateur
            $enseignant = \App\Models\Enseignant::withoutGlobalScope(\App\Scopes\EnseignantUserContextScope::class)
                ->with('user')
                ->whereHas('user', function($query) use ($searchValue) {
                    $query->where(function($q) use ($searchValue) {
                        // Nettoyer les espaces multiples dans la recherche
                        $normalizedSearch = preg_replace('/\s+/', ' ', trim($searchValue));
                        
                        // Recherche exacte d'abord (nom complet, insensible à la casse)
                        $q->whereRaw("LOWER(TRIM(CONCAT(first_name, ' ', last_name))) = LOWER(?)", [$normalizedSearch])
                          ->orWhereRaw("LOWER(email) = LOWER(?)", [$searchValue])
                          // Puis recherche partielle (insensible à la casse)
                          ->orWhereRaw("LOWER(TRIM(CONCAT(first_name, ' ', last_name))) LIKE LOWER(?)", ["%{$normalizedSearch}%"])
                          ->orWhereRaw("LOWER(email) LIKE LOWER(?)", ["%{$searchValue}%"])
                          ->orWhereRaw("LOWER(first_name) LIKE LOWER(?)", ["%{$searchValue}%"])
                          ->orWhereRaw("LOWER(last_name) LIKE LOWER(?)", ["%{$searchValue}%"]);
                    });
                })
                ->first();
            
            if ($enseignant && $enseignant->user) {
                $coursData['enseignant_id'] = $enseignant->user->id; // Utiliser user_id car enseignant_id pointe vers User
            } else {
                // Log pour déboguer
                \Log::warning('Enseignant non trouvé lors de l\'import', [
                    'search_value' => $searchValue,
                    'enseignant_name' => $data['enseignant_name'] ?? null,
                    'enseignant_email' => $data['enseignant_email'] ?? null,
                    'user_id' => \Illuminate\Support\Facades\Auth::id(),
                    'user_role' => \Illuminate\Support\Facades\Auth::user()?->role_id
                ]);
                throw new \Exception("Enseignant non trouvé dans la table enseignant: {$searchValue}");
            }
            }
        }

        // Stocker salle_ids pour l'attachement après création
        $coursData['_salle_ids'] = $salleIds;

        return $coursData;
    }

    /**
     * Format time string to HH:MM:SS format
     */
    private function formatTime($timeString): string
    {
        $time = trim($timeString);
        
        // Si c'est déjà au format HH:MM:SS, le retourner tel quel
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $time)) {
            return $time;
        }
        
        // Si c'est au format HH:MM, ajouter :00
        if (preg_match('/^\d{1,2}:\d{2}$/', $time)) {
            return $time . ':00';
        }
        
        // Si c'est au format HHhMM, convertir en HH:MM:SS
        if (preg_match('/^\d{1,2}h\d{2}$/', $time)) {
            return str_replace('h', ':', $time) . ':00';
        }
        
        // Si c'est au format HH.MM, convertir en HH:MM:SS
        if (preg_match('/^\d{1,2}\.\d{2}$/', $time)) {
            return str_replace('.', ':', $time) . ':00';
        }
        
        throw new \Exception("Format d'heure invalide: '{$timeString}'. Utilisez le format HH:MM");
    }

    /**
     * Import courses from CSV
     */
    public function importCoursFromCSV(string $filePath): array
    {
        $results = [
            'success' => 0,
            'errors' => [],
            'total' => 0
        ];

        try {
            $file = fopen($filePath, 'r');
            $headers = fgetcsv($file);
            $results['total'] = count(file($filePath)) - 1; // Exclude header

            while (($row = fgetcsv($file)) !== false) {
                $data = array_combine($headers, $row);
                
                try {
                    // Validate and transform data
                    $transformedData = $this->transformCoursData($data);
                    
                    // Check salle availability
                    if (!$this->checkSalleAvailability(
                        $transformedData['salle_id'],
                        $transformedData['jour_semaine'],
                        $transformedData['heure_debut'],
                        $transformedData['heure_fin']
                    )) {
                        throw new \Exception('Salle non disponible pour cette période');
                    }

                    $this->createCours($transformedData);
                    $results['success']++;
                } catch (\Exception $e) {
                    $results['errors'][] = [
                        'row' => $data,
                        'error' => $e->getMessage()
                    ];
                }
            }

            fclose($file);
        } catch (\Exception $e) {
            $results['errors'][] = [
                'error' => 'Erreur lors de la lecture du fichier: ' . $e->getMessage()
            ];
        }

        return $results;
    }

    /**
     * Transform course data from CSV
     */
    private function transformCoursData(array $data): array
    {
        // Add your transformation logic here
        // This is a placeholder - implement according to your CSV structure
        return $data;
    }

    /**
     * Get course statistics
     */
    public function getCoursStatistics(): array
    {
        $total = Cours::count();
        
        $byType = Cours::select('type_cours_id', DB::raw('count(*) as count'))
                       ->with('typeCours')
                       ->groupBy('type_cours_id')
                       ->get()
                       ->pluck('count', 'typeCours.name')
                       ->toArray();

        $byFaculte = Cours::select('faculte_id', DB::raw('count(*) as count'))
                          ->with('faculte')
                          ->groupBy('faculte_id')
                          ->get()
                          ->pluck('count', 'faculte.name')
                          ->toArray();

        $byJour = Cours::select('jour_semaine', DB::raw('count(*) as count'))
                       ->groupBy('jour_semaine')
                       ->get()
                       ->pluck('count', 'jour_semaine')
                       ->toArray();

        return [
            'total' => $total,
            'by_type' => $byType,
            'by_faculte' => $byFaculte,
            'by_jour' => $byJour
        ];
    }

    /**
     * Get courses with student count
     */
    public function getCoursWithStudentCount(): Collection
    {
        return Cours::with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->withCount('etudiants')
                   ->get();
    }

    /**
     * Search courses
     */
    public function searchCours(string $query): Collection
    {
        return Cours::where('matiere', 'LIKE', "%{$query}%")
                   ->orWhere('description', 'LIKE', "%{$query}%")
                   ->with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->get();
    }

    /**
     * Get courses for a specific group
     */
    public function getCoursForGroup(int $groupId): Collection
    {
        // This would depend on your relationship structure
        // You might need to implement this based on how groups and courses are related
        return Cours::with(['etablissement', 'faculte', 'salle', 'typeCours'])
                   ->get();
    }

    /**
     * Get courses schedule for a week
     */
    public function getWeeklySchedule(int $etablissementId = null): array
    {
        $query = Cours::query();
        
        if ($etablissementId) {
            $query->where('etablissement_id', $etablissementId);
        }

        $cours = $query->with(['etablissement', 'faculte', 'salle', 'typeCours'])
                      ->orderBy('jour_semaine')
                      ->orderBy('heure_debut')
                      ->get();

        $schedule = [];
        for ($i = 1; $i <= 7; $i++) { // Monday to Sunday
            $schedule[$i] = $cours->where('jour_semaine', $i)->values();
        }

        return $schedule;
    }
} 