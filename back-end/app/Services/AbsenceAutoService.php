<?php

namespace App\Services;

use App\Models\Absence;
use App\Models\Examen;
use App\Models\Cours;
use App\Models\Etudiant;
use App\Services\AttendanceStateService;
use App\Services\BiostarAttendanceService;
use App\Services\ConfigurationService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AbsenceAutoService
{
    protected $attendanceStateService;
    protected $biostarService;
    protected $configurationService;

    public function __construct(
        AttendanceStateService $attendanceStateService,
        BiostarAttendanceService $biostarService,
        ConfigurationService $configurationService
    ) {
        $this->attendanceStateService = $attendanceStateService;
        $this->biostarService = $biostarService;
        $this->configurationService = $configurationService;
    }

    /**
     * Crée automatiquement les absences pour un examen donné
     * basé sur les étudiants absents ou en retard
     */
    public function createAbsencesForExamen(int $examenId): array
    {
        try {
            DB::beginTransaction();

            // Récupérer l'examen avec ses informations (y compris les groupes many-to-many)
            $examen = Examen::with(['promotion', 'group', 'groups', 'option', 'etablissement', 'ville'])
                ->find($examenId);

            if (!$examen) {
                throw new \Exception("Examen non trouvé avec l'ID: {$examenId}");
            }

            // Construire la liste des groupes concernés pour cet examen
            $groupIds = $examen->groups ? $examen->groups->pluck('id')->filter()->values() : collect();
            if ($examen->group_id) {
                $groupIds->push($examen->group_id);
            }
            $groupIds = $groupIds->unique()->values();

            // Récupérer tous les étudiants de la promotion/groupe(s) concernés
            $etudiantsQuery = Etudiant::where('promotion_id', $examen->promotion_id)
                ->where('etablissement_id', $examen->etablissement_id)
                ->where('ville_id', $examen->ville_id);

            if ($examen->option_id) {
                $etudiantsQuery->where('option_id', $examen->option_id);
            }

            if ($groupIds->isNotEmpty()) {
                $etudiantsQuery->whereIn('group_id', $groupIds);
            }

            $etudiants = $etudiantsQuery->get();

            if ($etudiants->isEmpty()) {
                throw new \Exception("Aucun étudiant trouvé pour cet examen");
            }

            $absencesCreees = [];
            $absencesExistant = 0;

            foreach ($etudiants as $etudiant) {
                // Vérifier si une absence existe déjà pour cet étudiant et cet examen
                $absenceExistante = Absence::where('etudiant_id', $etudiant->id)
                    ->where('examen_id', $examenId)
                    ->where('date_absence', $examen->date)
                    ->first();

                if ($absenceExistante) {
                    $absencesExistant++;
                    continue;
                }

                // Déterminer le type d'absence basé sur le statut de présence
                $typeAbsence = $this->determinerTypeAbsence($etudiant, $examen);

                // Créer l'absence
                $absence = Absence::create([
                    'type_absence' => $typeAbsence,
                    'etudiant_id' => $etudiant->id,
                    'examen_id' => $examenId,
                    'date_absence' => $examen->date,
                    'justifiee' => false,
                    'motif' => $this->genererMotifAbsence($typeAbsence, $examen),
                    'justificatif' => null,
                ]);

                $absencesCreees[] = [
                    'id' => $absence->id,
                    'etudiant' => $etudiant->first_name . ' ' . $etudiant->last_name,
                    'matricule' => $etudiant->matricule,
                    'type_absence' => $typeAbsence,
                    'date_absence' => $examen->date,
                ];

                Log::info("Absence créée pour l'étudiant {$etudiant->matricule} - {$typeAbsence}");
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Absences créées avec succès",
                'examen' => [
                    'id' => $examen->id,
                    'title' => $examen->title,
                    'date' => $examen->date,
                    'heure_debut' => $examen->heure_debut,
                    'heure_fin' => $examen->heure_fin,
                ],
                'statistiques' => [
                    'total_etudiants' => $etudiants->count(),
                    'absences_creees' => count($absencesCreees),
                    'absences_existantes' => $absencesExistant,
                ],
                'absences' => $absencesCreees
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erreur lors de la création des absences: " . $e->getMessage());
            
            return [
                'success' => false,
                'message' => "Erreur lors de la création des absences: " . $e->getMessage(),
                'absences' => []
            ];
        }
    }

    /**
     * Crée automatiquement les absences pour tous les examens d'une date donnée
     */
    public function createAbsencesForDate(string $date): array
    {
        try {
            $examens = Examen::where('date', $date)->get();
            
            if ($examens->isEmpty()) {
                return [
                    'success' => false,
                    'message' => "Aucun examen trouvé pour la date: {$date}",
                    'absences' => []
                ];
            }

            $resultats = [];
            $totalAbsencesCreees = 0;

            foreach ($examens as $examen) {
                $resultat = $this->createAbsencesForExamen($examen->id);
                $resultats[] = $resultat;
                
                if ($resultat['success']) {
                    $totalAbsencesCreees += $resultat['statistiques']['absences_creees'];
                }
            }

            return [
                'success' => true,
                'message' => "Traitement terminé pour {$examens->count()} examen(s)",
                'total_absences_creees' => $totalAbsencesCreees,
                'resultats' => $resultats
            ];

        } catch (\Exception $e) {
            Log::error("Erreur lors de la création des absences pour la date {$date}: " . $e->getMessage());
            
            return [
                'success' => false,
                'message' => "Erreur lors de la création des absences: " . $e->getMessage(),
                'absences' => []
            ];
        }
    }

    /**
     * Détermine le type d'absence basé sur le statut de présence de l'étudiant
     */
    private function determinerTypeAbsence(Etudiant $etudiant, Examen $examen): string
    {
        // Ici, vous pouvez implémenter la logique pour déterminer le type d'absence
        // basé sur les données de présence de l'étudiant
        
        // Pour l'instant, on utilise une logique simple
        // Vous pouvez l'adapter selon vos besoins spécifiques
        
        $maintenant = now();
        $dateExamen = \Carbon\Carbon::parse($examen->date . ' ' . $examen->heure_fin);
        
        if ($maintenant->isAfter($dateExamen)) {
            // L'examen est terminé, l'étudiant est considéré comme absent
            return 'Absence non justifiée';
        }
        
        // Par défaut, on considère l'étudiant comme absent
        return 'Absence non justifiée';
    }

    /**
     * Génère un motif d'absence basé sur le type et l'examen
     */
    private function genererMotifAbsence(string $typeAbsence, Examen $examen): string
    {
        $motifs = [
            'Absence non justifiée' => "Absence à l'examen '{$examen->title}' du " . 
                \Carbon\Carbon::parse($examen->date)->format('d/m/Y') . 
                " de {$examen->heure_debut} à {$examen->heure_fin}",
            'Retard' => "Retard à l'examen '{$examen->title}' du " . 
                \Carbon\Carbon::parse($examen->date)->format('d/m/Y'),
            'Absence justifiée' => "Absence justifiée à l'examen '{$examen->title}' du " . 
                \Carbon\Carbon::parse($examen->date)->format('d/m/Y')
        ];

        return $motifs[$typeAbsence] ?? "Absence à l'examen '{$examen->title}'";
    }

    /**
     * Obtient les statistiques des absences pour un examen
     */
    public function getAbsenceStatisticsForExamen(int $examenId): array
    {
        $examen = Examen::find($examenId);
        if (!$examen) {
            return ['error' => 'Examen non trouvé'];
        }

        // Recalculer la liste des groupes concernés pour les statistiques
        $groupIds = $examen->groups ? $examen->groups->pluck('id')->filter()->values() : collect();
        if ($examen->group_id) {
            $groupIds->push($examen->group_id);
        }
        $groupIds = $groupIds->unique()->values();

        $totalEtudiantsQuery = Etudiant::where('promotion_id', $examen->promotion_id);

        if ($examen->option_id) {
            $totalEtudiantsQuery->where('option_id', $examen->option_id);
        }

        if ($groupIds->isNotEmpty()) {
            $totalEtudiantsQuery->whereIn('group_id', $groupIds);
        }

        $totalEtudiants = $totalEtudiantsQuery->count();

        $absences = Absence::where('examen_id', $examenId)
            ->where('date_absence', $examen->date)
            ->with('etudiant')
            ->get();

        $absencesParType = $absences->groupBy('type_absence');
        $absencesJustifiees = $absences->where('justifiee', true)->count();
        $absencesNonJustifiees = $absences->where('justifiee', false)->count();

        return [
            'examen' => [
                'id' => $examen->id,
                'title' => $examen->title,
                'date' => $examen->date,
                'heure_debut' => $examen->heure_debut,
                'heure_fin' => $examen->heure_fin,
            ],
            'statistiques' => [
                'total_etudiants' => $totalEtudiants,
                'total_absences' => $absences->count(),
                'taux_absence' => $totalEtudiants > 0 ? round(($absences->count() / $totalEtudiants) * 100, 2) : 0,
                'absences_justifiees' => $absencesJustifiees,
                'absences_non_justifiees' => $absencesNonJustifiees,
                'absences_par_type' => $absencesParType->map(function ($group) {
                    return $group->count();
                })->toArray()
            ],
            'absences' => $absences->map(function ($absence) {
                return [
                    'id' => $absence->id,
                    'etudiant' => $absence->etudiant->first_name . ' ' . $absence->etudiant->last_name,
                    'matricule' => $absence->etudiant->matricule,
                    'type_absence' => $absence->type_absence,
                    'justifiee' => $absence->justifiee,
                    'motif' => $absence->motif,
                    'date_absence' => $absence->date_absence,
                ];
            })
        ];
    }

    /**
     * Crée automatiquement les absences pour un cours donné
     * basé sur les étudiants absents ou en retard
     */
    public function createAbsencesForCours(int $coursId): array
    {
        try {
            DB::beginTransaction();

            // Récupérer le cours avec ses informations
            $cours = Cours::withoutGlobalScopes()
                ->with(['promotion', 'groups', 'etablissement', 'ville', 'option'])
                ->find($coursId);

            if (!$cours) {
                throw new \Exception("Cours non trouvé avec l'ID: {$coursId}");
            }

            // Construire la liste des groupes concernés
            $groupIds = $cours->groups ? $cours->groups->pluck('id')->filter()->values() : collect();
            if ($cours->group_id) {
                $groupIds->push($cours->group_id);
            }
            $groupIds = $groupIds->unique()->values();

            // Récupérer tous les étudiants attendus
            $etudiantsQuery = Etudiant::withoutGlobalScopes()
                ->where('promotion_id', $cours->promotion_id)
                ->where('etablissement_id', $cours->etablissement_id)
                ->where('ville_id', $cours->ville_id);

            if ($cours->option_id) {
                $etudiantsQuery->where('option_id', $cours->option_id);
            }

            if ($groupIds->isNotEmpty()) {
                $etudiantsQuery->whereIn('group_id', $groupIds);
            }

            $etudiants = $etudiantsQuery->get();

            if ($etudiants->isEmpty()) {
                throw new \Exception("Aucun étudiant trouvé pour ce cours");
            }

            // Récupérer les données de présence depuis AttendanceStateService
            $absencesCreees = [];
            $absencesExistant = 0;
            $absencesMisesAJour = 0;

            foreach ($etudiants as $etudiant) {
                // Vérifier si une absence existe déjà
                $absenceExistante = Absence::where('etudiant_id', $etudiant->id)
                    ->where('cours_id', $coursId)
                    ->where('date_absence', $cours->date)
                    ->first();

                // Récupérer le statut de présence actuel
                $attendanceState = $this->attendanceStateService->getStudentAttendanceState($cours->id, $etudiant->id);
                $status = $attendanceState['status'] ?? 'absent';

                // Créer une absence seulement si absent ou en retard
                if (in_array($status, ['absent', 'late', 'pending_entry', 'pending_exit', 'left_early'])) {
                    $typeAbsence = $this->getAbsenceTypeFromStatus($status);

                    if ($absenceExistante) {
                        // Mettre à jour si le statut a changé
                        if ($absenceExistante->type_absence !== $typeAbsence) {
                            $absenceExistante->update([
                                'type_absence' => $typeAbsence,
                                'motif' => $this->genererMotifAbsenceCours($typeAbsence, $cours)
                            ]);
                            $absencesMisesAJour++;
                        } else {
                            $absencesExistant++;
                        }
                    } else {
                        // Créer une nouvelle absence
                        $absence = Absence::create([
                            'type_absence' => $typeAbsence,
                            'etudiant_id' => $etudiant->id,
                            'cours_id' => $coursId,
                            'examen_id' => null,
                            'date_absence' => $cours->date,
                            'justifiee' => false,
                            'motif' => $this->genererMotifAbsenceCours($typeAbsence, $cours),
                            'justificatif' => null,
                        ]);

                        $absencesCreees[] = [
                            'id' => $absence->id,
                            'etudiant' => $etudiant->first_name . ' ' . $etudiant->last_name,
                            'matricule' => $etudiant->matricule,
                            'type_absence' => $typeAbsence,
                            'date_absence' => $cours->date,
                        ];

                        Log::info("Absence créée automatiquement pour l'étudiant {$etudiant->matricule} - {$typeAbsence} (cours {$coursId})");
                    }
                } elseif ($absenceExistante && $status === 'present') {
                    // Si l'étudiant est présent mais qu'une absence existe, la supprimer
                    $absenceExistante->delete();
                    Log::info("Absence supprimée pour l'étudiant {$etudiant->matricule} - Présence confirmée (cours {$coursId})");
                }
            }

            DB::commit();

            return [
                'success' => true,
                'message' => "Absences créées avec succès",
                'cours' => [
                    'id' => $cours->id,
                    'name' => $cours->name,
                    'date' => $cours->date,
                    'heure_debut' => $cours->heure_debut,
                    'heure_fin' => $cours->heure_fin,
                ],
                'statistiques' => [
                    'total_etudiants' => $etudiants->count(),
                    'absences_creees' => count($absencesCreees),
                    'absences_existantes' => $absencesExistant,
                    'absences_mises_a_jour' => $absencesMisesAJour,
                ],
                'absences' => $absencesCreees
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error("Erreur lors de la création des absences pour cours {$coursId}: " . $e->getMessage());
            
            return [
                'success' => false,
                'message' => "Erreur lors de la création des absences: " . $e->getMessage(),
                'absences' => []
            ];
        }
    }

    /**
     * Convertir le statut de présence en type d'absence
     */
    private function getAbsenceTypeFromStatus(string $status): string
    {
        switch ($status) {
            case 'late':
                return 'Retard';
            case 'left_early':
                return 'Départ anticipé';
            case 'pending_entry':
            case 'pending_exit':
            case 'absent':
            default:
                return 'Absence non justifiée';
        }
    }

    /**
     * Génère un motif d'absence pour un cours
     */
    private function genererMotifAbsenceCours(string $typeAbsence, Cours $cours): string
    {
        $dateFormatee = \Carbon\Carbon::parse($cours->date)->format('d/m/Y');
        
        $motifs = [
            'Absence non justifiée' => "Absence au cours '{$cours->name}' du {$dateFormatee} de {$cours->heure_debut} à {$cours->heure_fin}",
            'Retard' => "Retard au cours '{$cours->name}' du {$dateFormatee}",
            'Départ anticipé' => "Départ anticipé du cours '{$cours->name}' du {$dateFormatee}",
        ];

        return $motifs[$typeAbsence] ?? "Absence au cours '{$cours->name}' du {$dateFormatee}";
    }
}
