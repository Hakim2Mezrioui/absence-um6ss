<?php

namespace App\Http\Controllers;

use App\Services\EnseignantService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class EnseignantController extends Controller
{
    public function __construct(private EnseignantService $enseignantService)
    {
    }

    public function index(): JsonResponse
    {
        $filters = request()->only(['size', 'search', 'sortBy', 'sortDir', 'ville_id', 'role_id']);
        return $this->enseignantService->index($filters);
    }

    /**
     * Récupérer les options de filtre (villes, rôles)
     */
    public function getFilterOptions(): JsonResponse
    {
        return $this->enseignantService->getFilterOptions();
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'ville_id' => 'required|exists:villes,id',
        ]);
        return $this->enseignantService->store($validated);
    }

    public function show(int $id): JsonResponse
    {
        return $this->enseignantService->show($id);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'user_id' => 'sometimes|exists:users,id',
            'ville_id' => 'sometimes|exists:villes,id',
        ]);
        return $this->enseignantService->update($id, $validated);
    }

    public function destroy(int $id): JsonResponse
    {
        return $this->enseignantService->destroy($id);
    }

    public function assignCours(Request $request, int $id): JsonResponse
    {
        $validated = $request->validate([
            'cours_ids' => 'array',
            'cours_ids.*' => 'integer|exists:cours,id',
        ]);
        return $this->enseignantService->assignCours($id, $validated['cours_ids'] ?? []);
    }

    public function storeWithUser(Request $request): JsonResponse
    {
        $validatedUser = $request->validate([
            'user.first_name' => 'required|string|max:255',
            'user.last_name' => 'required|string|max:255',
            'user.email' => 'required|email|unique:users,email',
            'user.password' => 'required|string|min:6',
            'user.role_id' => 'required|exists:roles,id',
            'user.post_id' => 'required|exists:posts,id',
            // 'user.etablissement_id' => 'nullable|exists:etablissements,id',
            'user.ville_id' => 'required|exists:villes,id',
            'enseignant.ville_id' => 'required|exists:villes,id'
        ]);

        $userData = $request->input('user');
        $enseignantData = $request->input('enseignant');

        return $this->enseignantService->storeWithUser($userData, $enseignantData);
    }
}


