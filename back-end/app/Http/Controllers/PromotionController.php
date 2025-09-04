<?php

namespace App\Http\Controllers;

use App\Models\Promotion;
use App\Services\PromotionService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PromotionController extends Controller
{
    protected $promotionService;

    public function __construct(PromotionService $promotionService)
    {
        $this->promotionService = $promotionService;
    }

    /**
     * Afficher la liste des promotions avec pagination et filtres.
     */
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = Promotion::query();

        // Appliquer le filtre de recherche si nécessaire
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where("name", "LIKE", "%{$searchValue}%");
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $promotions = $query->limit($size)->skip($skip)->orderBy("name")->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "promotions" => $promotions,
            "totalPages" => $totalPages,
            "total" => $total,
            "status" => 200
        ]);
    }

    /**
     * Afficher une promotion spécifique.
     */
    public function show($id)
    {
        $promotion = $this->promotionService->getPromotionById((int) $id);
        
        if (!$promotion) {
            return response()->json(['message' => 'Promotion non trouvée'], 404);
        }
        
        return response()->json($promotion);
    }

    /**
     * Ajouter une nouvelle promotion.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:promotions,name',
        ]);

        $promotion = $this->promotionService->createPromotion($validatedData);

        return response()->json([
            'message' => 'Promotion ajoutée avec succès', 
            'promotion' => $promotion
        ], 201);
    }

    /**
     * Mettre à jour une promotion existante.
     */
    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('promotions', 'name')->ignore($id),
            ],
        ]);

        $promotion = $this->promotionService->updatePromotion((int) $id, $validatedData);

        if (!$promotion) {
            return response()->json(['message' => 'Promotion non trouvée'], 404);
        }

        return response()->json([
            'message' => 'Promotion mise à jour avec succès', 
            'promotion' => $promotion
        ]);
    }

    /**
     * Supprimer une promotion.
     */
    public function destroy($id)
    {
        $deleted = $this->promotionService->deletePromotion((int) $id);

        if (!$deleted) {
            return response()->json(['message' => 'Promotion non trouvée'], 404);
        }

        return response()->json(['message' => 'Promotion supprimée avec succès']);
    }

    /**
     * Obtenir toutes les promotions (sans pagination).
     */
    public function getAll()
    {
        $promotions = $this->promotionService->getAllPromotions();
        
        return response()->json([
            'promotions' => $promotions,
            'status' => 200
        ]);
    }

    /**
     * Rechercher des promotions par nom.
     */
    public function search(Request $request)
    {
        $searchValue = $request->query("search", "");
        
        if (empty($searchValue)) {
            return response()->json(['message' => 'Terme de recherche requis'], 400);
        }

        $promotions = $this->promotionService->searchPromotions($searchValue);
        
        return response()->json([
            'promotions' => $promotions,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les promotions par établissement.
     */
    public function getByEtablissement($etablissementId)
    {
        $promotions = $this->promotionService->getPromotionsByEtablissement((int) $etablissementId);
        
        return response()->json([
            'promotions' => $promotions,
            'status' => 200
        ]);
    }

    /**
     * Obtenir les promotions par faculté.
     */
    public function getByFaculte($faculteId)
    {
        $promotions = $this->promotionService->getPromotionsByFaculte((int) $faculteId);
        
        return response()->json([
            'promotions' => $promotions,
            'status' => 200
        ]);
    }
} 