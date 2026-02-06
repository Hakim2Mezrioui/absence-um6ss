<?php

namespace App\Services;

use App\Models\Enseignant;
use App\Models\Cours;
use App\Models\User;
use App\Models\Ville;
use App\Models\Role;
use App\Models\Post;
use Illuminate\Support\Facades\DB;

class EnseignantService extends BaseService
{
    use FilterByUserContext;
    public function __construct()
    {
        parent::__construct(Enseignant::class);
    }

    public function index(array $filters = [])
    {
        // Pour l'optimisation frontend, nous retournons tous les enseignants
        // Le filtrage, tri et pagination sont gérés côté client
        $query = Enseignant::with(['user'])
            ->select('enseignants.*')
            ->leftJoin('users', 'users.id', '=', 'enseignants.user_id')
            ->orderBy('enseignants.created_at', 'desc');

        // Retourner tous les enseignants sans pagination ni filtres backend
        $enseignants = $query->get();
        return $this->successResponse($enseignants);
    }

    public function store(array $data)
    {
        try {
            DB::beginTransaction();
            $enseignant = Enseignant::create($data);
            DB::commit();
            return $this->successResponse($enseignant->load(['user']), 'Enseignant créé');
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
            return $this->successResponse($enseignant->load(['user']), 'Utilisateur et enseignant créés');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->errorResponse($e->getMessage(), 500);
        }
    }

    public function show(int $id)
    {
        $enseignant = Enseignant::with(['user', 'cours'])->find($id);
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
        return $this->successResponse($enseignant->fresh(['user']), 'Enseignant mis à jour');
    }

    /**
     * Update a user and enseignant together.
     */
    public function updateWithUser(int $id, array $userData, array $enseignantData)
    {
        try {
            DB::beginTransaction();

            $enseignant = Enseignant::find($id);
            if (!$enseignant) {
                return $this->errorResponse('Enseignant non trouvé', 404);
            }

            // Mettre à jour l'utilisateur
            $user = $enseignant->user;
            if ($user) {
                $user->update($userData);
            }

            // Mettre à jour l'enseignant
            $enseignant->update($enseignantData);

            DB::commit();
            return $this->successResponse($enseignant->fresh(['user']), 'Utilisateur et enseignant mis à jour');
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->errorResponse($e->getMessage(), 500);
        }
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
            $posts = Post::select('id', 'name')->orderBy('name')->get();

            return $this->successResponse([
                'villes' => $villes,
                'roles' => $roles,
                'posts' => $posts,
            ], 'Options de filtre récupérées');
        } catch (\Throwable $e) {
            return $this->errorResponse('Erreur lors du chargement des options: ' . $e->getMessage(), 500);
        }
    }
}


