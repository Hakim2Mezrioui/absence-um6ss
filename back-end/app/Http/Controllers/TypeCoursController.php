<?php

namespace App\Http\Controllers;

use App\Models\TypeCours;
use App\Services\TypeCoursService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TypeCoursController extends Controller
{
    protected $typeCoursService;

    public function __construct(TypeCoursService $typeCoursService)
    {
        $this->typeCoursService = $typeCoursService;
    }

    /**
     * Afficher la liste des types de cours avec pagination et filtres.
     */
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = TypeCours::query();

        // Appliquer le filtre de recherche si nécessaire
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where("name", "LIKE", "%{$searchValue}%");
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $typesCours = $query->limit($size)->skip($skip)->orderBy("name")->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "typesCours" => $typesCours,
            "totalPages" => $totalPages,
            "total" => $total,
            "status" => 200
        ]);
    }

    /**
     * Afficher un type de cours spécifique.
     */
    public function show($id)
    {
        $typeCours = $this->typeCoursService->getTypeCoursById((int) $id);
        
        if (!$typeCours) {
            return response()->json(['message' => 'Type de cours non trouvé'], 404);
        }
        
        return response()->json($typeCours);
    }

    /**
     * Ajouter un nouveau type de cours.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:types_cours,name',
        ]);

        $typeCours = $this->typeCoursService->createTypeCours($validatedData);

        return response()->json([
            'message' => 'Type de cours ajouté avec succès', 
            'typeCours' => $typeCours
        ], 201);
    }

    /**
     * Mettre à jour un type de cours existant.
     */
    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('types_cours', 'name')->ignore($id),
            ],
        ]);

        $typeCours = $this->typeCoursService->updateTypeCours((int) $id, $validatedData);

        if (!$typeCours) {
            return response()->json(['message' => 'Type de cours non trouvé'], 404);
        }

        return response()->json([
            'message' => 'Type de cours mis à jour avec succès', 
            'typeCours' => $typeCours
        ]);
    }

    /**
     * Supprimer un type de cours.
     */
    public function destroy($id)
    {
        $deleted = $this->typeCoursService->deleteTypeCours((int) $id);

        if (!$deleted) {
            return response()->json(['message' => 'Type de cours non trouvé'], 404);
        }

        return response()->json(['message' => 'Type de cours supprimé avec succès']);
    }

    /**
     * Obtenir tous les types de cours (sans pagination).
     */
    public function getAll()
    {
        $typesCours = $this->typeCoursService->getAllTypesCours();
        
        return response()->json([
            'typesCours' => $typesCours,
            'status' => 200
        ]);
    }

    /**
     * Rechercher des types de cours par nom.
     */
    public function search(Request $request)
    {
        $searchValue = $request->query("search", "");
        
        if (empty($searchValue)) {
            return response()->json(['message' => 'Terme de recherche requis'], 400);
        }

        $typesCours = $this->typeCoursService->searchTypesCours($searchValue);
        
        return response()->json([
            'typesCours' => $typesCours,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les types de cours par établissement.
     */
    public function getByEtablissement($etablissementId)
    {
        $typesCours = $this->typeCoursService->getTypesCoursByEtablissement((int) $etablissementId);
        
        return response()->json([
            'typesCours' => $typesCours,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les types de cours par faculté.
     */
    public function getByFaculte($faculteId)
    {
        $typesCours = $this->typeCoursService->getTypesCoursByFaculte((int) $faculteId);
        
        return response()->json([
            'typesCours' => $typesCours,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les types de cours avec le nombre de cours.
     */
    public function getWithCoursCount()
    {
        $typesCours = $this->typeCoursService->getTypesCoursWithCoursCount();
        
        return response()->json([
            'typesCours' => $typesCours,
            'status' => 200
        ]);
    }
} 