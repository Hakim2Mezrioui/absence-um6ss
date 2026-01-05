<?php

namespace App\Services;

use App\Models\Examen;
use App\Models\Etudiant;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ExamenService
{
    use FilterByUserContext;
    /**
     * Get all exams with their relationships (filtered by user context)
     */
    public function getAllExamens(): Collection
    {
        $query = Examen::with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville']);
        return $this->applyUserContextFilters($query)->get();
    }

    /**
     * Get a specific exam by ID
     */
    public function getExamenById(int $id): ?Examen
    {
        return Examen::with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])->find($id);
    }

    /**
     * Create a new exam (with user context)
     */
    public function createExamen(array $data): Examen
    {
        $context = $this->getUserContextForFiltering();
        
        // Automatically set ville_id and etablissement_id from user context
        if ($context['ville_id']) {
            $data['ville_id'] = $context['ville_id'];
        }
        if ($context['etablissement_id']) {
            $data['etablissement_id'] = $context['etablissement_id'];
        }
        
        return Examen::create($data);
    }

    /**
     * Update an existing exam
     */
    public function updateExamen(int $id, array $data): ?Examen
    {
        $examen = Examen::find($id);
        if ($examen) {
            $examen->update($data);
            return $examen->fresh();
        }
        return null;
    }

    /**
     * Delete an exam
     */
    public function deleteExamen(int $id): bool
    {
        $examen = Examen::find($id);
        if ($examen) {
            return $examen->delete();
        }
        return false;
    }

    /**
     * Get exams by etablissement
     */
    public function getExamensByEtablissement(int $etablissementId): Collection
    {
        return Examen::where('etablissement_id', $etablissementId)
                    ->with(['promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->get();
    }

    /**
     * Get exams by promotion
     */
    public function getExamensByPromotion(int $promotionId): Collection
    {
        return Examen::where('promotion_id', $promotionId)
                    ->with(['etablissement', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->get();
    }

    /**
     * Get exams by date range
     */
    public function getExamensByDateRange(string $startDate, string $endDate): Collection
    {
        return Examen::whereBetween('date', [$startDate, $endDate])
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->get();
    }

    /**
     * Get exams by type
     */
    public function getExamensByType(int $typeExamenId): Collection
    {
        return Examen::where('type_examen_id', $typeExamenId)
                    ->with(['etablissement', 'promotion', 'salle', 'option', 'group', 'ville'])
                    ->get();
    }

    /**
     * Get exams by salle
     */
    public function getExamensBySalle(int $salleId): Collection
    {
        return Examen::where('salle_id', $salleId)
                    ->with(['etablissement', 'promotion', 'typeExamen', 'option', 'group', 'ville'])
                    ->get();
    }

    /**
     * Get exams by group
     */
    public function getExamensByGroup(int $groupId): Collection
    {
        return Examen::where('group_id', $groupId)
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'ville'])
                    ->get();
    }

    /**
     * Get exams by ville
     */
    public function getExamensByVille(int $villeId): Collection
    {
        return Examen::where('ville_id', $villeId)
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group'])
                    ->get();
    }

    /**
     * Get upcoming exams
     */
    public function getUpcomingExamens(int $days = 7): Collection
    {
        $startDate = Carbon::today();
        $endDate = Carbon::today()->addDays($days);

        return Examen::whereBetween('date', [$startDate, $endDate])
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->orderBy('date')
                    ->orderBy('heure_debut')
                    ->get();
    }

    /**
     * Get exams for today
     */
    public function getExamensForToday(): Collection
    {
        $today = Carbon::today();

        return Examen::whereDate('date', $today)
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->orderBy('heure_debut')
                    ->get();
    }

    /**
     * Check salle availability for exam
     */
    public function checkSalleAvailability(int $salleId, string $date, string $heureDebut, string $heureFin, int $excludeExamenId = null): bool
    {
        $query = Examen::where('salle_id', $salleId)
                       ->where('date', $date);

        if ($excludeExamenId) {
            $query->where('id', '!=', $excludeExamenId);
        }

        $conflictingExams = $query->where(function ($q) use ($heureDebut, $heureFin) {
            $q->whereBetween('heure_debut', [$heureDebut, $heureFin])
              ->orWhereBetween('heure_fin', [$heureDebut, $heureFin])
              ->orWhere(function ($subQ) use ($heureDebut, $heureFin) {
                  $subQ->where('heure_debut', '<=', $heureDebut)
                        ->where('heure_fin', '>=', $heureFin);
              });
        })->exists();

        return !$conflictingExams;
    }

    /**
     * Get available salles for exam (filtered by user context)
     */
    public function getAvailableSalles(string $date, string $heureDebut, string $heureFin): Collection
    {
        // Get all salles filtered by user context
        $salles = \App\Models\Salle::with(['ville'])->get();
        $availableSalles = collect();

        foreach ($salles as $salle) {
            if ($this->checkSalleAvailability($salle->id, $date, $heureDebut, $heureFin)) {
                $availableSalles->push($salle);
            }
        }

        return $availableSalles;
    }

    /**
     * Import exams from CSV
     */
    public function importExamensFromCSV(string $filePath): array
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
                    $transformedData = $this->transformExamData($data);
                    
                    // Check salle availability
                    if (!$this->checkSalleAvailability(
                        $transformedData['salle_id'],
                        $transformedData['date'],
                        $transformedData['heure_debut'],
                        $transformedData['heure_fin']
                    )) {
                        throw new \Exception('Salle non disponible pour cette période');
                    }

                    $this->createExamen($transformedData);
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
     * Transform exam data from CSV
     */
    private function transformExamData(array $data): array
    {
        // Add your transformation logic here
        // This is a placeholder - implement according to your CSV structure
        return $data;
    }

    /**
     * Get exam statistics
     */
    public function getExamenStatistics(): array
    {
        $total = Examen::count();
        $today = Examen::whereDate('date', Carbon::today())->count();
        $thisWeek = Examen::whereBetween('date', [
            Carbon::today()->startOfWeek(),
            Carbon::today()->endOfWeek()
        ])->count();
        $thisMonth = Examen::whereMonth('date', Carbon::today()->month)->count();

        $byType = Examen::select('type_examen_id', DB::raw('count(*) as count'))
                        ->with('typeExamen')
                        ->groupBy('type_examen_id')
                        ->get()
                        ->pluck('count', 'typeExamen.name')
                        ->toArray();

        $byPromotion = Examen::select('promotion_id', DB::raw('count(*) as count'))
                           ->with('promotion')
                           ->groupBy('promotion_id')
                           ->get()
                           ->pluck('count', 'promotion.name')
                           ->toArray();

        return [
            'total' => $total,
            'today' => $today,
            'this_week' => $thisWeek,
            'this_month' => $thisMonth,
            'by_type' => $byType,
            'by_promotion' => $byPromotion
        ];
    }

    /**
     * Get exams with student count
     */
    public function getExamensWithStudentCount(): Collection
    {
        return Examen::with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->withCount('etudiants')
                    ->get();
    }

    /**
     * Search exams
     */
    public function searchExamens(string $query): Collection
    {
        return Examen::where('title', 'LIKE', "%{$query}%")
                    ->orWhere('option', 'LIKE', "%{$query}%")
                    ->with(['etablissement', 'promotion', 'salle', 'typeExamen', 'option', 'group', 'ville'])
                    ->get();
    }
} 