<?php

namespace App\Http\Controllers;

use App\Models\Salle;
use App\Services\SalleService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SalleController extends Controller
{
    protected $salleService;

    public function __construct(SalleService $salleService)
    {
        $this->salleService = $salleService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $salles = $this->salleService->getAllSalles();
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'etage' => 'required|integer|min:0',
            'batiment' => 'required|string|max:100',
            'etablissement_id' => 'required|exists:etablissements,id',
            'capacite' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'devices' => 'required|array|min:1',
            'devices.*.devid' => 'required',
            'devices.*.devnm' => 'required|string',
        ]);

        $salle = $this->salleService->createSalle($request->all());
        
        return response()->json([
            'message' => 'Salle créée avec succès',
            'salle' => $salle,
            'status' => 'success'
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $salle = $this->salleService->getSalleById($id);
        
        if (!$salle) {
            return response()->json([
                'message' => 'Salle non trouvée',
                'status' => 'error'
            ], 404);
        }

        return response()->json([
            'salle' => $salle,
            'status' => 'success'
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'etage' => 'required|integer|min:0',
            'batiment' => 'required|string|max:100',
            'etablissement_id' => 'required|exists:etablissements,id',
            'capacite' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:500',
            'devices' => 'required|array|min:1',
            'devices.*.devid' => 'required',
            'devices.*.devnm' => 'required|string',
        ]);

        $salle = $this->salleService->updateSalle($id, $request->all());
        
        if (!$salle) {
            return response()->json([
                'message' => 'Salle non trouvée',
                'status' => 'error'
            ], 404);
        }

        return response()->json([
            'message' => 'Salle mise à jour avec succès',
            'salle' => $salle,
            'status' => 'success'
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            $deleted = $this->salleService->deleteSalle($id);
            
            if (!$deleted) {
                return response()->json([
                    'message' => 'Salle non trouvée ou utilisée dans d\'autres tables',
                    'status' => 'error'
                ], 404);
            }
            
            return response()->json([
                'message' => 'Salle supprimée avec succès',
                'status' => 'success'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression de la salle',
                'status' => 'error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search salles by name or building
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => 'required|string|min:2'
        ]);

        $salles = $this->salleService->searchSalles($request->q);
        
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }

    /**
     * Get salles by establishment
     */
    public function getByEtablissement(string $etablissementId): JsonResponse
    {
        $salles = $this->salleService->getSallesByEtablissement($etablissementId);
        
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }

    /**
     * Get salles by building
     */
    public function getByBuilding(string $batiment): JsonResponse
    {
        $salles = $this->salleService->getSallesByBuilding($batiment);
        
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }

    /**
     * Get salles by floor
     */
    public function getByFloor(int $etage): JsonResponse
    {
        $salles = $this->salleService->getSallesByFloor($etage);
        
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }

    /**
     * Get available salles for a time slot
     */
    public function getAvailable(Request $request): JsonResponse
    {
        $request->validate([
            'date' => 'required|date',
            'heure_debut' => 'required|date_format:H:i:s',
            'heure_fin' => 'required|date_format:H:i:s|after:heure_debut',
        ]);

        $salles = $this->salleService->getAvailableSalles(
            $request->date,
            $request->heure_debut,
            $request->heure_fin
        );
        
        return response()->json([
            'salles' => $salles,
            'status' => 'success'
        ]);
    }
} 