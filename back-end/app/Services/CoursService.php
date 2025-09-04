<?php

namespace App\Services;

use App\Models\Cours;
use App\Models\Etudiant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class CoursService
{
    /**
     * Get all courses with their relationships
     */
    public function getAllCours(): Collection
    {
        return Cours::with(['etablissement', 'faculte', 'salle', 'typeCours'])->get();
    }

    /**
     * Get a specific course by ID
     */
    public function getCoursById(int $id): ?Cours
    {
        return Cours::with(['etablissement', 'faculte', 'salle', 'typeCours'])->find($id);
    }

    /**
     * Create a new course
     */
    public function createCours(array $data): Cours
    {
        return Cours::create($data);
    }

    /**
     * Update an existing course
     */
    public function updateCours(int $id, array $data): ?Cours
    {
        $cours = Cours::find($id);
        if ($cours) {
            $cours->update($data);
            return $cours->fresh();
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
     * Get available salles for course
     */
    public function getAvailableSalles(int $jourSemaine, string $heureDebut, string $heureFin): Collection
    {
        $salles = \App\Models\Salle::all();
        $availableSalles = collect();

        foreach ($salles as $salle) {
            if ($this->checkSalleAvailability($salle->id, $jourSemaine, $heureDebut, $heureFin)) {
                $availableSalles->push($salle);
            }
        }

        return $availableSalles;
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