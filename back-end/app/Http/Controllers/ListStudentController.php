<?php

namespace App\Http\Controllers;

use App\Services\ListStudentService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class ListStudentController extends Controller
{
    protected $listStudentService;

    public function __construct(ListStudentService $listStudentService)
    {
        $this->listStudentService = $listStudentService;
    }

    /**
     * Afficher la liste paginée des étudiants dans les listes
     */
    public function index(Request $request): JsonResponse
    {
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);

        $listStudents = $this->listStudentService->getListStudentsPaginated($size, $page);

        return response()->json([
            'success' => true,
            'data' => $listStudents->items(),
            'pagination' => [
                'current_page' => $listStudents->currentPage(),
                'last_page' => $listStudents->lastPage(),
                'per_page' => $listStudents->perPage(),
                'total' => $listStudents->total()
            ]
        ]);
    }

    /**
     * Afficher un étudiant d'une liste spécifique
     */
    public function show($id): JsonResponse
    {
        $listStudent = $this->listStudentService->getListStudentById((int) $id);

        if (!$listStudent) {
            return response()->json([
                'success' => false,
                'message' => 'Étudiant de liste non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $listStudent
        ]);
    }

    /**
     * Créer une nouvelle entrée dans une liste
     */
    public function store(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_id' => 'required|integer|exists:etudiants,id',
                'rattrapage_id' => 'required|integer|exists:rattrapages,id'
            ]);

            // Vérifier si l'étudiant n'est pas déjà dans la liste
            if ($this->listStudentService->studentExistsInList($validatedData['etudiant_id'], $validatedData['rattrapage_id'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'L\'étudiant est déjà dans cette liste'
                ], 400);
            }

            $listStudent = $this->listStudentService->createListStudent($validatedData);

            return response()->json([
                'success' => true,
                'message' => 'Étudiant ajouté à la liste avec succès',
                'data' => $listStudent
            ], 201);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('ListStudent store error:', [
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout de l\'étudiant à la liste'
            ], 500);
        }
    }

    /**
     * Mettre à jour une entrée dans une liste
     */
    public function update(Request $request, $id): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_id' => 'required|integer|exists:etudiants,id',
                'rattrapage_id' => 'required|integer|exists:rattrapages,id'
            ]);

            $listStudent = $this->listStudentService->updateListStudent((int) $id, $validatedData);

            if (!$listStudent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Étudiant de liste non trouvé'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Liste mise à jour avec succès',
                'data' => $listStudent
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('ListStudent update error:', [
                'id' => $id,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la mise à jour'
            ], 500);
        }
    }

    /**
     * Supprimer une entrée de la liste
     */
    public function destroy($id): JsonResponse
    {
        $deleted = $this->listStudentService->deleteListStudent((int) $id);

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Étudiant de liste non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Étudiant supprimé de la liste avec succès'
        ]);
    }

    /**
     * Récupérer tous les étudiants d'une liste
     */
    public function getAll(): JsonResponse
    {
        $listStudents = $this->listStudentService->getAllListStudents();

        return response()->json([
            'success' => true,
            'data' => $listStudents
        ]);
    }

    /**
     * Récupérer les étudiants d'un rattrapage spécifique
     */
    public function getStudentsByRattrapage($rattrapageId): JsonResponse
    {
        $students = $this->listStudentService->getStudentsByRattrapage((int) $rattrapageId);

        // Structurer les données pour inclure toutes les relations
        $formattedStudents = $students->map(function ($listStudent) {
            return [
                'id' => $listStudent->id,
                'etudiant_id' => $listStudent->etudiant_id,
                'rattrapage_id' => $listStudent->rattrapage_id,
                'created_at' => $listStudent->created_at,
                'updated_at' => $listStudent->updated_at,
                'etudiant' => [
                    'id' => $listStudent->etudiant->id,
                    'matricule' => $listStudent->etudiant->matricule,
                    'first_name' => $listStudent->etudiant->first_name,
                    'last_name' => $listStudent->etudiant->last_name,
                    'full_name' => $listStudent->etudiant->full_name,
                    'email' => $listStudent->etudiant->email,
                    'photo' => $listStudent->etudiant->photo,
                    'promotion' => $listStudent->etudiant->promotion ? [
                        'id' => $listStudent->etudiant->promotion->id,
                        'name' => $listStudent->etudiant->promotion->name,
                        'year' => $listStudent->etudiant->promotion->year,
                    ] : null,
                    'etablissement' => $listStudent->etudiant->etablissement ? [
                        'id' => $listStudent->etudiant->etablissement->id,
                        'name' => $listStudent->etudiant->etablissement->name,
                        'address' => $listStudent->etudiant->etablissement->address,
                    ] : null,
                    'ville' => $listStudent->etudiant->ville ? [
                        'id' => $listStudent->etudiant->ville->id,
                        'name' => $listStudent->etudiant->ville->name,
                    ] : null,
                    'group' => $listStudent->etudiant->group ? [
                        'id' => $listStudent->etudiant->group->id,
                        'name' => $listStudent->etudiant->group->title,
                    ] : null,
                    'option' => $listStudent->etudiant->option ? [
                        'id' => $listStudent->etudiant->option->id,
                        'name' => $listStudent->etudiant->option->name,
                    ] : null,
                ],
                'rattrapage' => $listStudent->rattrapage ? [
                    'id' => $listStudent->rattrapage->id,
                    'name' => $listStudent->rattrapage->name,
                    'date' => $listStudent->rattrapage->date,
                    'start_time' => $listStudent->rattrapage->start_time,
                    'end_time' => $listStudent->rattrapage->end_time,
                ] : null,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedStudents,
            'count' => $students->count(),
            'message' => 'Étudiants récupérés avec succès avec toutes leurs relations'
        ]);
    }

    /**
     * Récupérer les rattrapages d'un étudiant spécifique
     */
    public function getRattrapagesByStudent($studentId): JsonResponse
    {
        $rattrapages = $this->listStudentService->getRattrapagesByStudent((int) $studentId);

        return response()->json([
            'success' => true,
            'data' => $rattrapages,
            'count' => $rattrapages->count()
        ]);
    }

    /**
     * Ajouter un étudiant à une liste
     */
    public function addStudentToList(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_id' => 'required|integer',
                'rattrapage_id' => 'required|integer'
            ]);

            $listStudent = $this->listStudentService->addStudentToList(
                $validatedData['etudiant_id'],
                $validatedData['rattrapage_id']
            );

            if (!$listStudent) {
                return response()->json([
                    'success' => false,
                    'message' => 'Impossible d\'ajouter l\'étudiant à la liste'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'message' => 'Étudiant ajouté à la liste avec succès',
                'data' => $listStudent
            ], 201);

        } catch (\Exception $e) {
            Log::error('Add student to list error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout de l\'étudiant'
            ], 500);
        }
    }

    /**
     * Ajouter plusieurs étudiants à une liste
     */
    public function addMultipleStudentsToList(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_ids' => 'required|array',
                'etudiant_ids.*' => 'integer',
                'rattrapage_id' => 'required|integer'
            ]);

            $results = $this->listStudentService->addMultipleStudentsToList(
                $validatedData['etudiant_ids'],
                $validatedData['rattrapage_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Opération terminée',
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Add multiple students to list error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'ajout des étudiants'
            ], 500);
        }
    }

    /**
     * Supprimer un étudiant d'une liste
     */
    public function removeStudentFromList(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_id' => 'required|integer',
                'rattrapage_id' => 'required|integer'
            ]);

            $removed = $this->listStudentService->removeStudentFromList(
                $validatedData['etudiant_id'],
                $validatedData['rattrapage_id']
            );

            if (!$removed) {
                return response()->json([
                    'success' => false,
                    'message' => 'Étudiant non trouvé dans la liste'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Étudiant supprimé de la liste avec succès'
            ]);

        } catch (\Exception $e) {
            Log::error('Remove student from list error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }

    /**
     * Supprimer plusieurs étudiants d'une liste
     */
    public function removeMultipleStudentsFromList(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'etudiant_ids' => 'required|array',
                'etudiant_ids.*' => 'integer',
                'rattrapage_id' => 'required|integer'
            ]);

            $results = $this->listStudentService->removeMultipleStudentsFromList(
                $validatedData['etudiant_ids'],
                $validatedData['rattrapage_id']
            );

            return response()->json([
                'success' => true,
                'message' => 'Opération terminée',
                'data' => $results
            ]);

        } catch (\Exception $e) {
            Log::error('Remove multiple students from list error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la suppression'
            ], 500);
        }
    }

    /**
     * Vider une liste (supprimer tous les étudiants)
     */
    public function clearList($rattrapageId): JsonResponse
    {
        try {
            $count = $this->listStudentService->clearList((int) $rattrapageId);

            return response()->json([
                'success' => true,
                'message' => 'Liste vidée avec succès',
                'data' => [
                    'deleted_count' => $count
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('Clear list error:', [
                'rattrapage_id' => $rattrapageId,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors du vidage de la liste'
            ], 500);
        }
    }

    /**
     * Compter les étudiants dans une liste
     */
    public function countStudentsInList($rattrapageId): JsonResponse
    {
        $count = $this->listStudentService->countStudentsInList((int) $rattrapageId);

        return response()->json([
            'success' => true,
            'data' => [
                'rattrapage_id' => $rattrapageId,
                'student_count' => $count
            ]
        ]);
    }

    /**
     * Compter les rattrapages d'un étudiant
     */
    public function countRattrapagesForStudent($studentId): JsonResponse
    {
        $count = $this->listStudentService->countRattrapagesForStudent((int) $studentId);

        return response()->json([
            'success' => true,
            'data' => [
                'student_id' => $studentId,
                'rattrapage_count' => $count
            ]
        ]);
    }

    /**
     * Importer une liste d'étudiants
     */
    public function importStudentsList(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'rattrapage_id' => 'required|integer|exists:rattrapages,id',
                'students' => 'required|array',
                'students.*' => 'array'
            ]);

            $results = $this->listStudentService->importStudentsList(
                $validatedData['rattrapage_id'],
                $validatedData['students']
            );

            return response()->json([
                'success' => true,
                'message' => 'Import terminé',
                'data' => $results
            ]);

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);

        } catch (\Exception $e) {
            Log::error('Import students list error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'import'
            ], 500);
        }
    }

    /**
     * Exporter une liste d'étudiants
     */
    public function exportStudentsList($rattrapageId): JsonResponse
    {
        try {
            $students = $this->listStudentService->exportStudentsList((int) $rattrapageId);

            return response()->json([
                'success' => true,
                'data' => $students,
                'count' => $students->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Export students list error:', [
                'rattrapage_id' => $rattrapageId,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'export'
            ], 500);
        }
    }

    /**
     * Rechercher des étudiants dans une liste
     */
    public function searchStudentsInList(Request $request, $rattrapageId): JsonResponse
    {
        try {
            $searchValue = $request->get('search', '');

            if (empty($searchValue)) {
                return response()->json([
                    'success' => false,
                    'message' => 'Le terme de recherche est requis'
                ], 400);
            }

            $students = $this->listStudentService->searchStudentsInList(
                (int) $rattrapageId,
                $searchValue
            );

            return response()->json([
                'success' => true,
                'data' => $students,
                'count' => $students->count()
            ]);

        } catch (\Exception $e) {
            Log::error('Search students in list error:', [
                'rattrapage_id' => $rattrapageId,
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la recherche'
            ], 500);
        }
    }

    /**
     * Obtenir les statistiques des listes
     */
    public function getStatistics(): JsonResponse
    {
        try {
            $statistics = $this->listStudentService->getListStatistics();

            return response()->json([
                'success' => true,
                'data' => $statistics
            ]);

        } catch (\Exception $e) {
            Log::error('Get list statistics error:', [
                'message' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques'
            ], 500);
        }
    }
} 