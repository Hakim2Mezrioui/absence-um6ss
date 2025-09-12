<?php

namespace App\Http\Controllers;

use App\Services\AbsenceAutoService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;

class AbsenceAutoController extends Controller
{
    protected $absenceAutoService;

    public function __construct(AbsenceAutoService $absenceAutoService)
    {
        $this->absenceAutoService = $absenceAutoService;
    }

    /**
     * Crée automatiquement les absences pour un examen spécifique
     */
    public function createAbsencesForExamen(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'examen_id' => 'required|integer|exists:examens,id',
            ]);

            $result = $this->absenceAutoService->createAbsencesForExamen($validatedData['examen_id']);

            if ($result['success']) {
                return response()->json([
                    'message' => $result['message'],
                    'data' => $result,
                    'status' => 200
                ], 200);
            } else {
                return response()->json([
                    'message' => $result['message'],
                    'data' => $result,
                    'status' => 400
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données de validation invalides',
                'errors' => $e->errors(),
                'status' => 422
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la création des absences',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }

    /**
     * Crée automatiquement les absences pour tous les examens d'une date donnée
     */
    public function createAbsencesForDate(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'date' => 'required|date',
            ]);

            $result = $this->absenceAutoService->createAbsencesForDate($validatedData['date']);

            if ($result['success']) {
                return response()->json([
                    'message' => $result['message'],
                    'data' => $result,
                    'status' => 200
                ], 200);
            } else {
                return response()->json([
                    'message' => $result['message'],
                    'data' => $result,
                    'status' => 400
                ], 400);
            }

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données de validation invalides',
                'errors' => $e->errors(),
                'status' => 422
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la création des absences',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }

    /**
     * Obtient les statistiques des absences pour un examen
     */
    public function getAbsenceStatistics(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'examen_id' => 'required|integer|exists:examens,id',
            ]);

            $statistics = $this->absenceAutoService->getAbsenceStatisticsForExamen($validatedData['examen_id']);

            if (isset($statistics['error'])) {
                return response()->json([
                    'message' => $statistics['error'],
                    'status' => 404
                ], 404);
            }

            return response()->json([
                'message' => 'Statistiques récupérées avec succès',
                'data' => $statistics,
                'status' => 200
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données de validation invalides',
                'errors' => $e->errors(),
                'status' => 422
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }

    /**
     * Crée automatiquement les absences basées sur les données d'attendance
     */
    public function createAbsencesFromAttendance(Request $request): JsonResponse
    {
        try {
            $validatedData = $request->validate([
                'examen_id' => 'required|integer|exists:examens,id',
                'etudiants_absents' => 'required|array',
                'etudiants_absents.*.etudiant_id' => 'required|integer|exists:etudiants,id',
                'etudiants_absents.*.status' => 'required|string|in:absent,en retard',
                'etudiants_absents.*.punch_time' => 'nullable|string',
            ]);

            $examenId = $validatedData['examen_id'];
            $etudiantsAbsents = $validatedData['etudiants_absents'];

            // Récupérer l'examen
            $examen = \App\Models\Examen::find($examenId);
            if (!$examen) {
                return response()->json([
                    'message' => 'Examen non trouvé',
                    'status' => 404
                ], 404);
            }

            $absencesCreees = [];
            $absencesExistant = 0;

            foreach ($etudiantsAbsents as $etudiantData) {
                // Vérifier si une absence existe déjà
                $absenceExistante = \App\Models\Absence::where('etudiant_id', $etudiantData['etudiant_id'])
                    ->where('examen_id', $examenId)
                    ->where('date_absence', $examen->date)
                    ->first();

                if ($absenceExistante) {
                    $absencesExistant++;
                    continue;
                }

                // Déterminer le type d'absence
                $typeAbsence = $etudiantData['status'] === 'en retard' ? 'Retard' : 'Absence non justifiée';

                // Créer l'absence
                $absence = \App\Models\Absence::create([
                    'type_absence' => $typeAbsence,
                    'etudiant_id' => $etudiantData['etudiant_id'],
                    'examen_id' => $examenId,
                    'date_absence' => $examen->date,
                    'justifiee' => false,
                    'motif' => $this->genererMotifAbsence($typeAbsence, $examen, $etudiantData),
                    'justificatif' => null,
                ]);

                $absencesCreees[] = [
                    'id' => $absence->id,
                    'etudiant_id' => $etudiantData['etudiant_id'],
                    'type_absence' => $typeAbsence,
                    'status' => $etudiantData['status'],
                    'date_absence' => $examen->date,
                ];
            }

            return response()->json([
                'message' => 'Absences créées avec succès',
                'data' => [
                    'examen' => [
                        'id' => $examen->id,
                        'title' => $examen->title,
                        'date' => $examen->date,
                    ],
                    'statistiques' => [
                        'absences_creees' => count($absencesCreees),
                        'absences_existantes' => $absencesExistant,
                    ],
                    'absences' => $absencesCreees
                ],
                'status' => 200
            ], 200);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Données de validation invalides',
                'errors' => $e->errors(),
                'status' => 422
            ], 422);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Erreur lors de la création des absences',
                'error' => $e->getMessage(),
                'status' => 500
            ], 500);
        }
    }

    /**
     * Génère un motif d'absence basé sur le type, l'examen et les données de l'étudiant
     */
    private function genererMotifAbsence(string $typeAbsence, $examen, array $etudiantData): string
    {
        $dateFormatee = \Carbon\Carbon::parse($examen->date)->format('d/m/Y');
        
        if ($typeAbsence === 'Retard') {
            $motif = "Retard à l'examen '{$examen->title}' du {$dateFormatee}";
            if (isset($etudiantData['punch_time']) && $etudiantData['punch_time']) {
                $motif .= " - Heure de pointage: {$etudiantData['punch_time']}";
            }
            return $motif;
        }
        
        return "Absence à l'examen '{$examen->title}' du {$dateFormatee} de {$examen->heure_debut} à {$examen->heure_fin}";
    }
}
