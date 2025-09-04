<?php

namespace App\Services;

use App\Models\ListStudent;
use App\Models\Etudiant;
use App\Models\Rattrapage;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ListStudentService extends BaseService
{
    public function __construct()
    {
        parent::__construct(new ListStudent());
    }

    /**
     * Récupérer tous les étudiants d'une liste
     */
    public function getAllListStudents(): Collection
    {
        return ListStudent::with(['etudiant', 'rattrapage'])->get();
    }

    /**
     * Récupérer un étudiant d'une liste par ID
     */
    public function getListStudentById(int $id): ?ListStudent
    {
        return ListStudent::with(['etudiant', 'rattrapage'])->find($id);
    }

    /**
     * Créer une nouvelle entrée dans la liste
     */
    public function createListStudent(array $data): ListStudent
    {
        return ListStudent::create($data);
    }

    /**
     * Mettre à jour une entrée dans la liste
     */
    public function updateListStudent(int $id, array $data): ?ListStudent
    {
        $listStudent = ListStudent::find($id);
        if ($listStudent) {
            $listStudent->update($data);
            return $listStudent;
        }
        return null;
    }

    /**
     * Supprimer une entrée de la liste
     */
    public function deleteListStudent(int $id): bool
    {
        $listStudent = ListStudent::find($id);
        if ($listStudent) {
            return $listStudent->delete();
        }
        return false;
    }

    /**
     * Récupérer les étudiants d'une liste avec pagination
     */
    public function getListStudentsPaginated(int $size = 10, int $page = 1): LengthAwarePaginator
    {
        return ListStudent::with(['etudiant', 'rattrapage'])
            ->orderBy('created_at', 'desc')
            ->paginate($size, ['*'], 'page', $page);
    }

    /**
     * Récupérer les étudiants par rattrapage avec toutes leurs relations
     */
    public function getStudentsByRattrapage(int $rattrapageId): Collection
    {
        return ListStudent::with([
            'etudiant.promotion',
            'etudiant.etablissement',
            'etudiant.ville',
            'etudiant.group',
            'etudiant.option',
            'rattrapage'
        ])
            ->where('rattrapage_id', $rattrapageId)
            ->get();
    }

    /**
     * Récupérer les rattrapages par étudiant
     */
    public function getRattrapagesByStudent(int $etudiantId): Collection
    {
        return ListStudent::with('rattrapage')
            ->where('etudiant_id', $etudiantId)
            ->get();
    }

    /**
     * Vérifier si un étudiant est dans une liste
     */
    public function studentExistsInList(int $etudiantId, int $rattrapageId): bool
    {
        return ListStudent::where('etudiant_id', $etudiantId)
            ->where('rattrapage_id', $rattrapageId)
            ->exists();
    }

    /**
     * Ajouter un étudiant à une liste
     */
    public function addStudentToList(int $etudiantId, int $rattrapageId): ?ListStudent
    {
        // Vérifier si l'étudiant et le rattrapage existent
        if (!$this->studentAndRattrapageExist($etudiantId, $rattrapageId)) {
            return null;
        }

        // Vérifier si l'étudiant n'est pas déjà dans la liste
        if ($this->studentExistsInList($etudiantId, $rattrapageId)) {
            return null;
        }

        return ListStudent::create([
            'etudiant_id' => $etudiantId,
            'rattrapage_id' => $rattrapageId
        ]);
    }

    /**
     * Ajouter plusieurs étudiants à une liste
     */
    public function addMultipleStudentsToList(array $etudiantIds, int $rattrapageId): array
    {
        $results = [
            'added' => [],
            'already_exists' => [],
            'invalid_students' => [],
            'errors' => []
        ];

        foreach ($etudiantIds as $etudiantId) {
            try {
                if ($this->studentExistsInList($etudiantId, $rattrapageId)) {
                    $results['already_exists'][] = $etudiantId;
                    continue;
                }

                if (!$this->studentAndRattrapageExist($etudiantId, $rattrapageId)) {
                    $results['invalid_students'][] = $etudiantId;
                    continue;
                }

                $listStudent = $this->addStudentToList($etudiantId, $rattrapageId);
                if ($listStudent) {
                    $results['added'][] = $etudiantId;
                }
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'etudiant_id' => $etudiantId,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    /**
     * Supprimer un étudiant d'une liste
     */
    public function removeStudentFromList(int $etudiantId, int $rattrapageId): bool
    {
        return ListStudent::where('etudiant_id', $etudiantId)
            ->where('rattrapage_id', $rattrapageId)
            ->delete() > 0;
    }

    /**
     * Supprimer plusieurs étudiants d'une liste
     */
    public function removeMultipleStudentsFromList(array $etudiantIds, int $rattrapageId): array
    {
        $results = [
            'removed' => [],
            'not_found' => [],
            'errors' => []
        ];

        foreach ($etudiantIds as $etudiantId) {
            try {
                if ($this->removeStudentFromList($etudiantId, $rattrapageId)) {
                    $results['removed'][] = $etudiantId;
                } else {
                    $results['not_found'][] = $etudiantId;
                }
            } catch (\Exception $e) {
                $results['errors'][] = [
                    'etudiant_id' => $etudiantId,
                    'error' => $e->getMessage()
                ];
            }
        }

        return $results;
    }

    /**
     * Vider une liste (supprimer tous les étudiants)
     */
    public function clearList(int $rattrapageId): int
    {
        return ListStudent::where('rattrapage_id', $rattrapageId)->delete();
    }

    /**
     * Compter les étudiants dans une liste
     */
    public function countStudentsInList(int $rattrapageId): int
    {
        return ListStudent::where('rattrapage_id', $rattrapageId)->count();
    }

    /**
     * Compter les rattrapages d'un étudiant
     */
    public function countRattrapagesForStudent(int $etudiantId): int
    {
        return ListStudent::where('etudiant_id', $etudiantId)->count();
    }

    /**
     * Importer une liste d'étudiants depuis un fichier CSV/Excel
     */
    public function importStudentsList(int $rattrapageId, array $studentData): array
    {
        $results = [
            'total_processed' => 0,
            'added' => [],
            'already_exists' => [],
            'invalid_students' => [],
            'errors' => []
        ];

        DB::beginTransaction();

        try {
            foreach ($studentData as $data) {
                $results['total_processed']++;

                // Extraire l'ID de l'étudiant (peut être matricule, ID, ou nom)
                $studentId = $this->extractStudentId($data);

                if (!$studentId) {
                    $results['invalid_students'][] = $data;
                    continue;
                }

                // Vérifier si l'étudiant existe
                if (!$this->studentExists($studentId)) {
                    $results['invalid_students'][] = $data;
                    continue;
                }

                // Vérifier si l'étudiant est déjà dans la liste
                if ($this->studentExistsInList($studentId, $rattrapageId)) {
                    $results['already_exists'][] = $studentId;
                    continue;
                }

                // Ajouter l'étudiant à la liste
                $listStudent = $this->addStudentToList($studentId, $rattrapageId);
                if ($listStudent) {
                    $results['added'][] = $studentId;
                }
            }

            DB::commit();
            return $results;

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error importing students list:', [
                'rattrapage_id' => $rattrapageId,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);

            $results['errors'][] = [
                'message' => 'Erreur lors de l\'import: ' . $e->getMessage()
            ];

            return $results;
        }
    }

    /**
     * Exporter une liste d'étudiants
     */
    public function exportStudentsList(int $rattrapageId): Collection
    {
        return ListStudent::with(['etudiant:id,matricule,name,promotion,faculte'])
            ->where('rattrapage_id', $rattrapageId)
            ->get();
    }

    /**
     * Rechercher des étudiants dans une liste
     */
    public function searchStudentsInList(int $rattrapageId, string $searchValue): Collection
    {
        return ListStudent::with('etudiant')
            ->where('rattrapage_id', $rattrapageId)
            ->whereHas('etudiant', function ($query) use ($searchValue) {
                $query->where('name', 'like', "%{$searchValue}%")
                    ->orWhere('matricule', 'like', "%{$searchValue}%");
            })
            ->get();
    }

    /**
     * Obtenir les statistiques des listes
     */
    public function getListStatistics(): array
    {
        $totalLists = Rattrapage::count();
        $totalStudents = Etudiant::count();
        $totalListStudents = ListStudent::count();

        $rattrapagesWithStudents = Rattrapage::withCount('listStudents')
            ->having('list_students_count', '>', 0)
            ->count();

        $averageStudentsPerList = $totalLists > 0 ? round($totalListStudents / $totalLists, 2) : 0;

        return [
            'total_rattrapages' => $totalLists,
            'total_students' => $totalStudents,
            'total_list_entries' => $totalListStudents,
            'rattrapages_with_students' => $rattrapagesWithStudents,
            'average_students_per_list' => $averageStudentsPerList
        ];
    }

    /**
     * Vérifier si l'étudiant et le rattrapage existent
     */
    private function studentAndRattrapageExist(int $etudiantId, int $rattrapageId): bool
    {
        return Etudiant::where('id', $etudiantId)->exists() &&
               Rattrapage::where('id', $rattrapageId)->exists();
    }

    /**
     * Vérifier si l'étudiant existe
     */
    private function studentExists($identifier): bool
    {
        // Peut être un ID, matricule, ou nom
        if (is_numeric($identifier)) {
            return Etudiant::where('id', $identifier)->exists();
        }

        return Etudiant::where('matricule', $identifier)
            ->orWhere('name', $identifier)
            ->exists();
    }

    /**
     * Extraire l'ID de l'étudiant depuis les données d'import
     */
    private function extractStudentId(array $data): ?int
    {
        // Priorité : ID > matricule > nom
        if (isset($data['id']) && is_numeric($data['id'])) {
            return (int) $data['id'];
        }

        if (isset($data['matricule'])) {
            $etudiant = Etudiant::where('matricule', $data['matricule'])->first();
            return $etudiant ? $etudiant->id : null;
        }

        if (isset($data['name'])) {
            $etudiant = Etudiant::where('name', $data['name'])->first();
            return $etudiant ? $etudiant->id : null;
        }

        return null;
    }
} 