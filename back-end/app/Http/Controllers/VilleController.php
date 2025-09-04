<?php

namespace App\Http\Controllers;

use App\Models\Ville;
use App\Services\VilleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class VilleController extends Controller
{
    protected $villeService;

    public function __construct(VilleService $villeService)
    {
        $this->villeService = $villeService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $villes = $this->villeService->getAllVilles();
        return response()->json([
            'villes' => $villes,
            'status' => 'success'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:villes,name',
            'code_postal' => 'nullable|string|max:10',
            'pays' => 'nullable|string|max:100',
        ]);

        $ville = $this->villeService->createVille($request->all());
        
        return response()->json([
            'message' => 'Ville créée avec succès',
            'ville' => $ville,
            'status' => 'success'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $ville = $this->villeService->getVilleById($id);
        
        if (!$ville) {
            return response()->json([
                'message' => 'Ville non trouvée',
                'status' => 'error'
            ], 404);
        }

        return response()->json([
            'ville' => $ville,
            'status' => 'success'
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255|unique:villes,name,' . $id,
            'code_postal' => 'nullable|string|max:10',
            'pays' => 'nullable|string|max:100',
        ]);

        $ville = $this->villeService->updateVille($id, $request->all());
        
        if (!$ville) {
            return response()->json([
                'message' => 'Ville non trouvée',
                'status' => 'error'
            ], 404);
        }

        return response()->json([
            'message' => 'Ville mise à jour avec succès',
            'ville' => $ville,
            'status' => 'success'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $deleted = $this->villeService->deleteVille($id);
            
            if (!$deleted) {
                return response()->json([
                    'message' => 'Ville non trouvée ou utilisée dans d\'autres tables',
                    'status' => 'error'
                ], 404);
            }
            
            return response()->json([
                'message' => 'Ville supprimée avec succès',
                'status' => 'success'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression de la ville',
                'status' => 'error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search villes by name
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2'
        ]);

        $villes = $this->villeService->searchVilles($request->q);
        
        return response()->json([
            'villes' => $villes,
            'status' => 'success'
        ]);
    }

    /**
     * Get villes by establishment
     */
    public function getByEtablissement(string $etablissementId): JsonResponse
    {
        $villes = $this->villeService->getVillesByEtablissement($etablissementId);
        
        return response()->json([
            'villes' => $villes,
            'status' => 'success'
        ]);
    }
} 