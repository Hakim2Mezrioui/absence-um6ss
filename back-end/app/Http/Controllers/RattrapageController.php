<?php

namespace App\Http\Controllers;

use App\Services\RattrapageService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class RattrapageController extends Controller
{
    protected $rattrapageService;

    public function __construct(RattrapageService $rattrapageService)
    {
        $this->rattrapageService = $rattrapageService;
    }

    /**
     * Afficher la liste paginée des rattrapages avec filtres
     */
    public function index(Request $request): JsonResponse
    {
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);
        
        // Récupérer les filtres
        $filters = [
            'search' => $request->get('search', ''),
            'date' => $request->get('date', ''),
            'date_from' => $request->get('date_from', ''),
            'date_to' => $request->get('date_to', ''),
            'start_hour' => $request->get('start_hour', ''),
            'end_hour' => $request->get('end_hour', ''),
            'sort_by' => $request->get('sort_by', 'date'),
            'sort_direction' => $request->get('sort_direction', 'desc')
        ];

        $rattrapages = $this->rattrapageService->getRattrapagesPaginatedWithFilters($size, $page, $filters);

        return response()->json([
            'success' => true,
            'data' => $rattrapages->items(),
            'pagination' => [
                'current_page' => $rattrapages->currentPage(),
                'last_page' => $rattrapages->lastPage(),
                'per_page' => $rattrapages->perPage(),
                'total' => $rattrapages->total(),
                'has_next_page' => $rattrapages->hasMorePages(),
                'has_prev_page' => $rattrapages->currentPage() > 1
            ],
            'filters_applied' => array_filter($filters, function($value) {
                return !empty($value);
            })
        ]);
    }

    /**
     * Afficher un rattrapage spécifique
     */
    public function show($id): JsonResponse
    {
        $rattrapage = $this->rattrapageService->getRattrapageById((int) $id);

        if (!$rattrapage) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $rattrapage
        ]);
    }

    /**
     * Créer un nouveau rattrapage
     */
    public function store(Request $request): JsonResponse
    {
        try {
            // Log de la requête pour déboguer
            \Log::info('Rattrapage store request:', $request->all());
            
            $validatedData = $request->validate([
                'name' => 'required|string|max:255',
                'start_hour' => 'required|date_format:H:i',
                'end_hour' => 'required|date_format:H:i|after:start_hour',
                'date' => 'required|date'
            ]);

            // Log des données validées
            \Log::info('Rattrapage validated data:', $validatedData);

            // Vérifier que la date n'est pas dans le passé
            if (strtotime($validatedData['date']) < strtotime(date('Y-m-d'))) {
                return response()->json([
                    'success' => false,
                    'message' => 'La date ne peut pas être dans le passé'
                ], 400);
            }



            $rattrapage = $this->rattrapageService->createRattrapage($validatedData);

            // Log du rattrapage créé
            \Log::info('Rattrapage created:', $rattrapage->toArray());

            return response()->json([
                'success' => true,
                'message' => 'Rattrapage créé avec succès',
                'data' => $rattrapage
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            \Log::error('Rattrapage validation error:', $e->errors());
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            \Log::error('Rattrapage store error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la création du rattrapage: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mettre à jour un rattrapage
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255',
            'start_hour' => 'required|date_format:H:i',
            'end_hour' => 'required|date_format:H:i|after:start_hour',
            'date' => 'required|date'
        ]);



        $rattrapage = $this->rattrapageService->updateRattrapage((int) $id, $validatedData);

        if (!$rattrapage) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rattrapage mis à jour avec succès',
            'data' => $rattrapage
        ]);
    }

    /**
     * Supprimer un rattrapage
     */
    public function destroy($id): JsonResponse
    {
        $deleted = $this->rattrapageService->deleteRattrapage((int) $id);

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Rattrapage non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Rattrapage supprimé avec succès'
        ]);
    }

    /**
     * Rechercher des rattrapages
     */
    public function search(Request $request): JsonResponse
    {
        $searchValue = $request->get('search', '');
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);

        if (empty($searchValue)) {
            return response()->json([
                'success' => false,
                'message' => 'Le terme de recherche est requis'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->searchRattrapages($searchValue, $size, $page);

        return response()->json([
            'success' => true,
            'data' => $rattrapages->items(),
            'pagination' => [
                'current_page' => $rattrapages->currentPage(),
                'last_page' => $rattrapages->lastPage(),
                'per_page' => $rattrapages->perPage(),
                'total' => $rattrapages->total()
            ]
        ]);
    }

    /**
     * Récupérer tous les rattrapages sans pagination
     */
    public function getAll(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getAllRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par date
     */
    public function getByDate(Request $request): JsonResponse
    {
        $date = $request->get('date', '');

        if (empty($date)) {
            return response()->json([
                'success' => false,
                'message' => 'La date est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByDate($date);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par période
     */
    public function getByDateRange(Request $request): JsonResponse
    {
        $startDate = $request->get('start_date', '');
        $endDate = $request->get('end_date', '');

        if (empty($startDate) || empty($endDate)) {
            return response()->json([
                'success' => false,
                'message' => 'Les dates de début et de fin sont requises'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByDateRange($startDate, $endDate);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages du jour
     */
    public function getToday(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getTodayRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages de la semaine
     */
    public function getThisWeek(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getThisWeekRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages du mois
     */
    public function getThisMonth(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getThisMonthRattrapages();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par heure de début
     */
    public function getByStartHour(Request $request): JsonResponse
    {
        $startHour = $request->get('start_hour', '');

        if (empty($startHour)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'heure de début est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByStartHour($startHour);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les rattrapages par heure de fin
     */
    public function getByEndHour(Request $request): JsonResponse
    {
        $endHour = $request->get('end_hour', '');

        if (empty($endHour)) {
            return response()->json([
                'success' => false,
                'message' => 'L\'heure de fin est requise'
            ], 400);
        }

        $rattrapages = $this->rattrapageService->getRattrapagesByEndHour($endHour);

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Récupérer les statistiques des rattrapages
     */
    public function getStatistics(): JsonResponse
    {
        $statistics = $this->rattrapageService->getRattrapagesStatistics();

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }

    /**
     * Récupérer les rattrapages avec conflits d'horaires
     */
    public function getWithTimeConflicts(): JsonResponse
    {
        $rattrapages = $this->rattrapageService->getRattrapagesWithTimeConflicts();

        return response()->json([
            'success' => true,
            'data' => $rattrapages
        ]);
    }

    /**
     * Vérifier les conflits d'horaires
     */
    public function checkTimeConflicts(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'date' => 'required|date',
            'start_hour' => 'required|date_format:H:i',
            'end_hour' => 'required|date_format:H:i|after:start_hour',
            'exclude_id' => 'nullable|integer'
        ]);

        $hasConflicts = $this->rattrapageService->checkTimeConflictsForDate(
            $validatedData['date'],
            $validatedData['start_hour'],
            $validatedData['end_hour'],
            $validatedData['exclude_id'] ?? null
        );

        return response()->json([
            'success' => true,
            'data' => [
                'has_conflicts' => $hasConflicts,
                'date' => $validatedData['date'],
                'start_hour' => $validatedData['start_hour'],
                'end_hour' => $validatedData['end_hour']
            ]
        ]);
    }

    /**
     * Importer des rattrapages depuis un fichier CSV
     */
    public function importRattrapages(Request $request): JsonResponse
    {
        if (!$request->hasFile('file')) {
            return response()->json([
                'success' => false,
                'message' => 'Aucun fichier téléchargé'
            ], 400);
        }

        $file = $request->file('file');
        
        // Vérifier le type de fichier
        $allowedTypes = ['csv', 'txt'];
        $fileExtension = strtolower($file->getClientOriginalExtension());
        
        if (!in_array($fileExtension, $allowedTypes)) {
            return response()->json([
                'success' => false,
                'message' => 'Type de fichier non supporté. Utilisez CSV ou TXT'
            ], 400);
        }

        try {
            $path = $file->getRealPath();
            $results = $this->rattrapageService->importRattrapagesFromCSV($path);
            
            if (!empty($results['errors'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Erreurs détectées lors de l\'importation',
                    'errors' => $results['errors'],
                    'total_errors' => count($results['errors']),
                    'success_count' => $results['success']
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => $results['success'] . ' rattrapages importés avec succès',
                'imported_count' => $results['success'],
                'total_processed' => $results['total']
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du traitement du fichier',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
