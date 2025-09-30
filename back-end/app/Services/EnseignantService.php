<?php

namespace App\Services;

use App\Models\Enseignant;
use App\Models\Cours;
use App\Models\User;
use App\Models\Ville;
use App\Models\Role;
use Illuminate\Support\Facades\DB;

class EnseignantService extends BaseService
{
    public function __construct()
    {
        parent::__construct(Enseignant::class);
    }

    public function index(array $filters = [])
    {
        $size = isset($filters['size']) && (int)$filters['size'] > 0 ? (int)$filters['size'] : 20;
        $search = $filters['search'] ?? null;
        $villeId = $filters['ville_id'] ?? null;
        $roleId = $filters['role_id'] ?? null;
        $sortBy = $filters['sortBy'] ?? 'created_at';
        $sortDir = strtolower($filters['sortDir'] ?? 'desc') === 'asc' ? 'asc' : 'desc';

        $query = Enseignant::with(['user', 'ville'])
            ->select('enseignants.*')
            ->leftJoin('users', 'users.id', '=', 'enseignants.user_id');

        if ($search) {
            $query->whereHas('user', function ($q) use ($search) {
                $q->where('first_name', 'like', "%$search%");
                $q->orWhere('last_name', 'like', "%$search%");
                $q->orWhere('email', 'like', "%$search%");
            });
        }

        if ($villeId) {
            $query->where('enseignants.ville_id', $villeId);
        }

        if ($roleId) {
            $query->where('users.role_id', $roleId);
        }

        // Sorting
        if ($sortBy === 'name') {
            $query->orderBy('users.last_name', $sortDir)->orderBy('users.first_name', $sortDir);
        } elseif ($sortBy === 'email') {
            $query->orderBy('users.email', $sortDir);
        } else {
            $query->orderBy('enseignants.created_at', $sortDir);
        }

        $enseignants = $query->paginate($size);
        return $this->successResponse($enseignants);
    }

    public function store(array $data)
    {
        try {
            DB::beginTransaction();
            $enseignant = Enseignant::create($data);
            DB::commit();
            return $this->successResponse($enseignant->load(['user', 'ville']), 'Enseignant créé');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    /**
     * Create a user and enseignant together.
     */
    public function storeWithUser(array $userData, array $enseignantData)
    {
        try {
            DB::beginTransaction();

            $user = User::create($userData);

            $enseignantData['user_id'] = $user->id;
            $enseignant = Enseignant::create($enseignantData);

            DB::commit();
            return $this->successResponse($enseignant->load(['user', 'ville']), 'Utilisateur et enseignant créés');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function show(int $id)
    {
        $enseignant = Enseignant::with(['user', 'ville', 'cours'])->find($id);
        if (!$enseignant) {
            return $this->errorResponse('Enseignant non trouvé', 404);
        }
        return $this->successResponse($enseignant);
    }

    public function update(int $id, array $data)
    {
        $enseignant = Enseignant::find($id);
        if (!$enseignant) {
            return $this->errorResponse('Enseignant non trouvé', 404);
        }
        $enseignant->update($data);
        return $this->successResponse($enseignant->fresh(['user', 'ville']), 'Enseignant mis à jour');
    }

    public function destroy(int $id)
    {
        $enseignant = Enseignant::find($id);
        if (!$enseignant) {
            return $this->errorResponse('Enseignant non trouvé', 404);
        }
        $enseignant->delete();
        return $this->successResponse(null, 'Enseignant supprimé');
    }

    public function assignCours(int $enseignantId, array $coursIds)
    {
        $enseignant = Enseignant::find($enseignantId);
        if (!$enseignant) {
            return $this->errorResponse('Enseignant non trouvé', 404);
        }
        $enseignant->cours()->sync($coursIds);
        return $this->successResponse($enseignant->load('cours'), 'Affectations mises à jour');
    }

    /**
     * Options de filtre pour l'interface enseignants (similaire aux étudiants)
     */
    public function getFilterOptions()
    {
        try {
            $villes = Ville::select('id', 'name')->orderBy('name')->get();
            $roles = Role::select('id', 'name')->orderBy('name')->get();

            return $this->successResponse([
                'villes' => $villes,
                'roles' => $roles,
            ], 'Options de filtre récupérées');
        } catch (\Throwable $e) {
            return $this->errorResponse('Erreur lors du chargement des options: ' . $e->getMessage(), 500);
        }
    }
}


