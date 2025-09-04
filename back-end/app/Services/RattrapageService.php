<?php

namespace App\Services;

use App\Models\Rattrapage;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class RattrapageService extends BaseService
{
    public function __construct()
    {
        parent::__construct(new Rattrapage());
    }

    /**
     * Récupérer tous les rattrapages
     */
    public function getAllRattrapages(): Collection
    {
        return Rattrapage::orderBy('date', 'desc')->get();
    }

    /**
     * Récupérer un rattrapage par ID
     */
    public function getRattrapageById(int $id): ?Rattrapage
    {
        return Rattrapage::find($id);
    }

    /**
     * Créer un nouveau rattrapage
     */
    public function createRattrapage(array $data): Rattrapage
    {
        return Rattrapage::create($data);
    }

    /**
     * Mettre à jour un rattrapage
     */
    public function updateRattrapage(int $id, array $data): ?Rattrapage
    {
        $rattrapage = Rattrapage::find($id);
        if ($rattrapage) {
            $rattrapage->update($data);
            return $rattrapage;
        }
        return null;
    }

    /**
     * Supprimer un rattrapage
     */
    public function deleteRattrapage(int $id): bool
    {
        $rattrapage = Rattrapage::find($id);
        if ($rattrapage) {
            return $rattrapage->delete();
        }
        return false;
    }

    /**
     * Rechercher des rattrapages
     */
    public function searchRattrapages(string $searchValue, int $size = 10, int $page = 1): LengthAwarePaginator
    {
        return Rattrapage::where('name', 'like', "%{$searchValue}%")
            ->orderBy('date', 'desc')
            ->paginate($size, ['*'], 'page', $page);
    }

    /**
     * Récupérer les rattrapages avec pagination
     */
    public function getRattrapagesPaginated(int $size = 10, int $page = 1): LengthAwarePaginator
    {
        return Rattrapage::orderBy('date', 'desc')
            ->paginate($size, ['*'], 'page', $page);
    }

    /**
     * Vérifier si un rattrapage existe
     */
    public function rattrapageExists(int $id): bool
    {
        return Rattrapage::where('id', $id)->exists();
    }

    /**
     * Récupérer plusieurs rattrapages par IDs
     */
    public function getRattrapagesByIds(array $ids): Collection
    {
        return Rattrapage::whereIn('id', $ids)->orderBy('date', 'desc')->get();
    }

    /**
     * Créer plusieurs rattrapages
     */
    public function createMultipleRattrapages(array $rattrapagesData): Collection
    {
        $createdRattrapages = collect();
        
        foreach ($rattrapagesData as $data) {
            $createdRattrapages->push($this->createRattrapage($data));
        }
        
        return $createdRattrapages;
    }

    /**
     * Importer des rattrapages depuis un fichier CSV
     */
    public function importRattrapagesFromCSV(string $filePath): array
    {
        $results = [
            'success' => 0,
            'errors' => [],
            'total' => 0
        ];

        try {
            $file = fopen($filePath, 'r');
            if (!$file) {
                throw new \Exception('Impossible d\'ouvrir le fichier');
            }

            // Détecter le délimiteur
            $firstLine = fgets($file);
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($file);

            // Lire les en-têtes
            $header = fgetcsv($file, 0, $delimiter);
            if (!$header) {
                fclose($file);
                throw new \Exception('Format CSV invalide');
            }

            // Normaliser les en-têtes
            $header = array_map(function($h) {
                return strtolower(trim($h));
            }, $header);

            // Vérifier les en-têtes requis
            $requiredHeaders = ['name', 'date', 'start_hour', 'end_hour'];
            $missingHeaders = array_diff($requiredHeaders, $header);
            
            if (!empty($missingHeaders)) {
                fclose($file);
                throw new \Exception('En-têtes manquants: ' . implode(', ', $missingHeaders));
            }

            $rattrapages = [];
            $lineNumber = 1; // Commencer à 1 car on a déjà lu l'en-tête

            // Lire et traiter chaque ligne
            while (($row = fgetcsv($file, 0, $delimiter)) !== false) {
                $lineNumber++;
                $row = array_map('trim', $row);
                
                // Ignorer les lignes vides
                if (empty(array_filter($row))) {
                    continue;
                }

                try {
                    $rattrapageData = array_combine($header, $row);
                    
                    // Valider et transformer les données
                    $validatedData = $this->validateAndTransformRattrapageData($rattrapageData, $lineNumber);
                    
                    if ($validatedData) {
                        $rattrapages[] = $validatedData;
                    }
                } catch (\Exception $e) {
                    $results['errors'][] = [
                        'line' => $lineNumber,
                        'data' => $row,
                        'error' => $e->getMessage()
                    ];
                }
            }

            fclose($file);

            // Si il y a des erreurs, les retourner
            if (!empty($results['errors'])) {
                $results['total'] = count($results['errors']);
                return $results;
            }

            // Insérer les données dans la base
            if (!empty($rattrapages)) {
                try {
                    DB::beginTransaction();
                    
                    foreach ($rattrapages as $rattrapageData) {
                        $this->createRattrapage($rattrapageData);
                        $results['success']++;
                    }
                    
                    DB::commit();
                    $results['total'] = count($rattrapages);
                    
                } catch (\Exception $e) {
                    DB::rollBack();
                    throw new \Exception('Erreur lors de l\'insertion en base de données: ' . $e->getMessage());
                }
            }

            return $results;

        } catch (\Exception $e) {
            throw new \Exception('Erreur lors du traitement du fichier: ' . $e->getMessage());
        }
    }

    /**
     * Détecter le délimiteur du fichier CSV
     */
    private function detectDelimiter($line): string
    {
        $delimiters = [',', ';', "\t"];
        $counts = [];

        foreach ($delimiters as $delimiter) {
            $counts[$delimiter] = substr_count($line, $delimiter);
        }

        return array_keys($counts, max($counts))[0];
    }

    /**
     * Valider et transformer les données d'un rattrapage
     */
    private function validateAndTransformRattrapageData(array $data, int $lineNumber): ?array
    {
        // Validation des champs requis
        if (empty($data['name'])) {
            throw new \Exception('Le nom est requis');
        }

        if (empty($data['date'])) {
            throw new \Exception('La date est requise');
        }

        if (empty($data['start_hour'])) {
            throw new \Exception('L\'heure de début est requise');
        }

        if (empty($data['end_hour'])) {
            throw new \Exception('L\'heure de fin est requise');
        }

        // Validation et transformation de la date
        $date = \DateTime::createFromFormat('d/m/Y', $data['date']);
        if (!$date) {
            $date = \DateTime::createFromFormat('Y-m-d', $data['date']);
        }
        
        if (!$date) {
            throw new \Exception('Format de date invalide. Utilisez dd/mm/yyyy ou yyyy-mm-dd');
        }

        // Validation et transformation des heures
        $startHour = \DateTime::createFromFormat('H:i', $data['start_hour']);
        if (!$startHour) {
            throw new \Exception('Format d\'heure de début invalide. Utilisez HH:MM');
        }

        $endHour = \DateTime::createFromFormat('H:i', $data['end_hour']);
        if (!$endHour) {
            throw new \Exception('Format d\'heure de fin invalide. Utilisez HH:MM');
        }

        // Vérifier que l'heure de fin est après l'heure de début
        if ($startHour >= $endHour) {
            throw new \Exception('L\'heure de fin doit être après l\'heure de début');
        }

        // Vérifier que la date n'est pas dans le passé
        if ($date < new \DateTime('today')) {
            throw new \Exception('La date ne peut pas être dans le passé');
        }

        // Vérifier les conflits d'horaires
        if ($this->checkTimeConflictsForDate($date->format('Y-m-d'), $startHour->format('H:i'), $endHour->format('H:i'))) {
            throw new \Exception('Conflit d\'horaires détecté pour cette date');
        }

        return [
            'name' => trim($data['name']),
            'date' => $date->format('Y-m-d'),
            'start_hour' => $startHour->format('H:i:s'),
            'end_hour' => $endHour->format('H:i:s')
        ];
    }

    /**
     * Compter le nombre total de rattrapages
     */
    public function getRattrapagesCount(): int
    {
        return Rattrapage::count();
    }

    /**
     * Récupérer les rattrapages par date
     */
    public function getRattrapagesByDate(string $date): Collection
    {
        return Rattrapage::whereDate('date', $date)
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Récupérer les rattrapages par période
     */
    public function getRattrapagesByDateRange(string $startDate, string $endDate): Collection
    {
        return Rattrapage::whereBetween('date', [$startDate, $endDate])
            ->orderBy('date', 'desc')
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Récupérer les rattrapages par heure de début
     */
    public function getRattrapagesByStartHour(string $startHour): Collection
    {
        return Rattrapage::whereTime('start_hour', '>=', $startHour)
            ->orderBy('start_hour')
            ->orderBy('date')
            ->get();
    }

    /**
     * Récupérer les rattrapages par heure de fin
     */
    public function getRattrapagesByEndHour(string $endHour): Collection
    {
        return Rattrapage::whereTime('end_hour', '<=', $endHour)
            ->orderBy('end_hour')
            ->orderBy('date')
            ->get();
    }

    /**
     * Récupérer les rattrapages du jour
     */
    public function getTodayRattrapages(): Collection
    {
        return Rattrapage::whereDate('date', today())
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Récupérer les rattrapages de la semaine
     */
    public function getThisWeekRattrapages(): Collection
    {
        return Rattrapage::whereBetween('date', [now()->startOfWeek(), now()->endOfWeek()])
            ->orderBy('date')
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Récupérer les rattrapages du mois
     */
    public function getThisMonthRattrapages(): Collection
    {
        return Rattrapage::whereMonth('date', now()->month)
            ->whereYear('date', now()->year)
            ->orderBy('date')
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Récupérer les statistiques des rattrapages
     */
    public function getRattrapagesStatistics(): array
    {
        $totalRattrapages = $this->getRattrapagesCount();
        $todayRattrapages = $this->getTodayRattrapages()->count();
        $thisWeekRattrapages = $this->getThisWeekRattrapages()->count();
        $thisMonthRattrapages = $this->getThisMonthRattrapages()->count();
        
        // Rattrapages par mois (12 derniers mois)
        $monthlyStats = [];
        for ($i = 11; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $count = Rattrapage::whereMonth('date', $month->month)
                ->whereYear('date', $month->year)
                ->count();
            $monthlyStats[$month->format('M Y')] = $count;
        }
        
        return [
            'total_rattrapages' => $totalRattrapages,
            'today_rattrapages' => $todayRattrapages,
            'this_week_rattrapages' => $thisWeekRattrapages,
            'this_month_rattrapages' => $thisMonthRattrapages,
            'monthly_statistics' => $monthlyStats,
            'average_per_month' => $totalRattrapages > 0 ? round($totalRattrapages / 12, 2) : 0
        ];
    }

    /**
     * Récupérer les rattrapages avec conflits d'horaires
     */
    public function getRattrapagesWithTimeConflicts(): Collection
    {
        return Rattrapage::whereRaw('start_hour < end_hour')
            ->whereRaw('date = date')
            ->orderBy('date')
            ->orderBy('start_hour')
            ->get();
    }

    /**
     * Vérifier les conflits d'horaires pour une date donnée
     */
    public function checkTimeConflictsForDate(string $date, string $startHour, string $endHour, int $excludeId = null): bool
    {
        $query = Rattrapage::whereDate('date', $date)
            ->where(function ($q) use ($startHour, $endHour) {
                $q->where(function ($subQ) use ($startHour, $endHour) {
                    $subQ->where('start_hour', '<', $endHour)
                        ->where('end_hour', '>', $startHour);
                });
            });
        
        if ($excludeId) {
            $query->where('id', '!=', $excludeId);
        }
        
        return $query->exists();
    }
} 