<?php

namespace App\Http\Controllers;

use App\Models\Group;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\Ville;
use App\Services\GroupService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class GroupController extends Controller
{
    protected $groupService;

    public function __construct(GroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        // Récupérer les paramètres de filtrage
        $filters = $request->only(['searchValue', 'etablissement_id', 'promotion_id', 'ville_id']);
        
        \Log::info('🔍 Filtres reçus:', $filters);
        
        // Filtrer les groupes selon les critères
        $query = Group::with(['etablissement', 'promotion', 'ville', 'etudiants']);
        
        // Filtre par recherche (titre du groupe)
        if (!empty($filters['searchValue'])) {
            $query->where('title', 'like', '%' . $filters['searchValue'] . '%');
            \Log::info('🔍 Filtre recherche appliqué:', ['searchValue' => $filters['searchValue']]);
        }
        
        // Filtre par établissement
        if (!empty($filters['etablissement_id'])) {
            $query->where('etablissement_id', $filters['etablissement_id']);
            \Log::info('🔍 Filtre établissement appliqué:', ['etablissement_id' => $filters['etablissement_id']]);
        }
        
        // Filtre par promotion
        if (!empty($filters['promotion_id'])) {
            $query->where('promotion_id', $filters['promotion_id']);
            \Log::info('🔍 Filtre promotion appliqué:', ['promotion_id' => $filters['promotion_id']]);
        }
        
        // Filtre par ville
        if (!empty($filters['ville_id'])) {
            $query->where('ville_id', $filters['ville_id']);
            \Log::info('🔍 Filtre ville appliqué:', ['ville_id' => $filters['ville_id']]);
        }
        
        $groups = $query->select('id', \DB::raw('title as name'), 'etablissement_id', 'ville_id', 'promotion_id')->get();
        
        \Log::info('📊 Nombre de groupes trouvés:', ['count' => $groups->count()]);
        
        return response()->json($groups);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(): JsonResponse
    {
        $etablissements = Etablissement::all();
        $promotions = Promotion::all();
        $villes = Ville::all();
        
        return response()->json([
            'etablissements' => $etablissements,
            'promotions' => $promotions,
            'villes' => $villes
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'promotion_id' => 'required|exists:promotions,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
        ]);

        $group = $this->groupService->createGroup($request->all());
        
        return response()->json([
            'message' => 'Groupe créé avec succès',
            'group' => $group->load(['etablissement', 'promotion', 'ville'])
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id): JsonResponse
    {
        $group = $this->groupService->getGroupById($id);
        return response()->json($group);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id): JsonResponse
    {
        $group = $this->groupService->getGroupById($id);
        $etablissements = Etablissement::all();
        $promotions = Promotion::all();
        $villes = Ville::all();
        
        return response()->json([
            'group' => $group,
            'etablissements' => $etablissements,
            'promotions' => $promotions,
            'villes' => $villes
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'promotion_id' => 'required|exists:promotions,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
        ]);

        $group = $this->groupService->updateGroup($id, $request->all());
        
        return response()->json([
            'message' => 'Groupe mis à jour avec succès',
            'group' => $group->load(['etablissement', 'promotion', 'ville'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id): JsonResponse
    {
        try {
            // Supprimer le groupe directement
            $deleted = $this->groupService->deleteGroup($id);
            
            if (!$deleted) {
                return response()->json([
                    'message' => 'Groupe non trouvé',
                    'status' => 'error'
                ], 404); 
            }
            
            return response()->json([
                'message' => 'Groupe supprimé avec succès',
                'status' => 'success'
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la suppression du groupe',
                'status' => 'error',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get students by group
     */
    public function getStudentsByGroup(string $id): JsonResponse
    {
        $students = $this->groupService->getStudentsByGroup($id);
        return response()->json($students);
    }

    /**
     * Add students to a group
     */
    public function addStudentsToGroup(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'string'
        ]);

        $this->groupService->addStudentsToGroup($id, $request->student_ids);
        
        return response()->json([
            'message' => 'Étudiants ajoutés au groupe avec succès'
        ]);
    }

    /**
     * Remove students from a group
     */
    public function removeStudentsFromGroup(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'student_ids' => 'required|array',
            'student_ids.*' => 'string'
        ]);

        $this->groupService->removeStudentsFromGroup($id, $request->student_ids);
        
        return response()->json([
            'message' => 'Étudiants retirés du groupe avec succès'
        ]);
    }

    /**
     * Get groups by etablissement
     */
    public function getGroupsByEtablissement(string $etablissementId): JsonResponse
    {
        $groups = $this->groupService->getGroupsByEtablissement($etablissementId);
        return response()->json($groups);
    }

    /**
     * Get groups by promotion
     */
    public function getGroupsByPromotion(string $promotionId): JsonResponse
    {
        $groups = $this->groupService->getGroupsByPromotion($promotionId);
        return response()->json($groups);
    }

    /**
     * Get groups by ville
     */
    public function getGroupsByVille(string $villeId): JsonResponse
    {
        $groups = $this->groupService->getGroupsByVille($villeId);
        return response()->json($groups);
    }
}
