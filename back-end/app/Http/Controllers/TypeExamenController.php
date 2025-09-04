<?php

namespace App\Http\Controllers;

use App\Services\TypeExamenService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TypeExamenController extends Controller
{
    protected $typeExamenService;

    public function __construct(TypeExamenService $typeExamenService)
    {
        $this->typeExamenService = $typeExamenService;
    }

    /**
     * Afficher la liste paginée des types d'examen
     */
    public function index(Request $request): JsonResponse
    {
        $size = $request->get('size', 10);
        $page = $request->get('page', 1);

        $typesExamen = $this->typeExamenService->getTypesExamenPaginated($size, $page);

        return response()->json([
            'success' => true,
            'data' => $typesExamen->items(),
            'pagination' => [
                'current_page' => $typesExamen->currentPage(),
                'last_page' => $typesExamen->lastPage(),
                'per_page' => $typesExamen->perPage(),
                'total' => $typesExamen->total()
            ]
        ]);
    }

    /**
     * Afficher un type d'examen spécifique
     */
    public function show($id): JsonResponse
    {
        $typeExamen = $this->typeExamenService->getTypeExamenById((int) $id);

        if (!$typeExamen) {
            return response()->json([
                'success' => false,
                'message' => 'Type d\'examen non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'data' => $typeExamen
        ]);
    }

    /**
     * Créer un nouveau type d'examen
     */
    public function store(Request $request): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:types_examen,name'
        ]);

        $typeExamen = $this->typeExamenService->createTypeExamen($validatedData);

        return response()->json([
            'success' => true,
            'message' => 'Type d\'examen créé avec succès',
            'data' => $typeExamen
        ], 201);
    }

    /**
     * Mettre à jour un type d'examen
     */
    public function update(Request $request, $id): JsonResponse
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:types_examen,name,' . $id
        ]);

        $typeExamen = $this->typeExamenService->updateTypeExamen((int) $id, $validatedData);

        if (!$typeExamen) {
            return response()->json([
                'success' => false,
                'message' => 'Type d\'examen non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Type d\'examen mis à jour avec succès',
            'data' => $typeExamen
        ]);
    }

    /**
     * Supprimer un type d'examen
     */
    public function destroy($id): JsonResponse
    {
        $deleted = $this->typeExamenService->deleteTypeExamen((int) $id);

        if (!$deleted) {
            return response()->json([
                'success' => false,
                'message' => 'Type d\'examen non trouvé'
            ], 404);
        }

        return response()->json([
            'success' => true,
            'message' => 'Type d\'examen supprimé avec succès'
        ]);
    }

    /**
     * Rechercher des types d'examen
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

        $typesExamen = $this->typeExamenService->searchTypesExamen($searchValue, $size, $page);

        return response()->json([
            'success' => true,
            'data' => $typesExamen->items(),
            'pagination' => [
                'current_page' => $typesExamen->currentPage(),
                'last_page' => $typesExamen->lastPage(),
                'per_page' => $typesExamen->perPage(),
                'total' => $typesExamen->total()
            ]
        ]);
    }

    /**
     * Récupérer tous les types d'examen sans pagination
     */
    public function getAll(): JsonResponse
    {
        $typesExamen = $this->typeExamenService->getAllTypesExamen();

        return response()->json([
            'success' => true,
            'data' => $typesExamen
        ]);
    }

    /**
     * Récupérer les types d'examen par catégorie
     */
    public function getByCategory(Request $request): JsonResponse
    {
        $category = $request->get('category', '');

        if (empty($category)) {
            return response()->json([
                'success' => false,
                'message' => 'La catégorie est requise'
            ], 400);
        }

        $typesExamen = $this->typeExamenService->getTypesExamenByCategory($category);

        return response()->json([
            'success' => true,
            'data' => $typesExamen
        ]);
    }

    /**
     * Récupérer les types d'examen par niveau de difficulté
     */
    public function getByDifficulty(Request $request): JsonResponse
    {
        $difficulty = $request->get('difficulty', '');

        if (empty($difficulty)) {
            return response()->json([
                'success' => false,
                'message' => 'Le niveau de difficulté est requis'
            ], 400);
        }

        $typesExamen = $this->typeExamenService->getTypesExamenByDifficulty($difficulty);

        return response()->json([
            'success' => true,
            'data' => $typesExamen
        ]);
    }

    /**
     * Récupérer les types d'examen par semestre
     */
    public function getBySemester(Request $request): JsonResponse
    {
        $semester = $request->get('semester', '');

        if (empty($semester)) {
            return response()->json([
                'success' => false,
                'message' => 'Le semestre est requis'
            ], 400);
        }

        $typesExamen = $this->typeExamenService->getTypesExamenBySemester($semester);

        return response()->json([
            'success' => true,
            'data' => $typesExamen
        ]);
    }

    /**
     * Récupérer les types d'examen avec le nombre d'examens associés
     */
    public function getWithExamensCount(): JsonResponse
    {
        $typesExamen = $this->typeExamenService->getTypesExamenWithExamensCount();

        return response()->json([
            'success' => true,
            'data' => $typesExamen
        ]);
    }

    /**
     * Récupérer les statistiques des types d'examen
     */
    public function getStatistics(): JsonResponse
    {
        $statistics = $this->typeExamenService->getTypesExamenStatistics();

        return response()->json([
            'success' => true,
            'data' => $statistics
        ]);
    }
} 