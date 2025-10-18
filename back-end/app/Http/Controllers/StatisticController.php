<?php

namespace App\Http\Controllers;

use App\Models\Ville;
use App\Models\Etudiant;
use App\Models\Group;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\Option;
use App\Models\Cours;
use App\Models\Examen;
use App\Models\Absence;
use App\Models\Rattrapage;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class StatisticController extends Controller
{
    /**
     * Collecte toutes les statistiques possibles du système
     */
    public function getAllStatistics(): JsonResponse
    {
        try {
            $statistics = [
                'general' => $this->getGeneralStatistics(),
                'villes' => $this->getVilleStatistics(),
                'etudiants' => $this->getEtudiantStatistics(),
                'groups' => $this->getGroupStatistics(),
                'etablissements' => $this->getEtablissementStatistics(),
                'promotions' => $this->getPromotionStatistics(),
                'options' => $this->getOptionStatistics(),
                'cours' => $this->getCoursStatisticsWithFilters(), // Utiliser la nouvelle méthode
                'examens' => $this->getExamenStatisticsWithFilters(), // Utiliser la nouvelle méthode
                'absences' => $this->getAbsenceStatistics(),
                'rattrapages' => $this->getRattrapageStatistics(),
                'repartition_geographique' => $this->getGeographicDistribution(),
                'performance' => $this->getPerformanceStatistics(),
            ];

            return response()->json([
                'success' => true,
                'message' => 'Statistiques récupérées avec succès',
                'data' => $statistics
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Collecte les statistiques avec filtres par date et année universitaire
     */
    public function getFilteredStatistics(Request $request): JsonResponse
    {
        try {
            $anneeUniversitaire = $request->get('annee_universitaire');
            $dateDebut = $request->get('date_debut');
            $dateFin = $request->get('date_fin');
            $statutTemporel = $request->get('statut_temporel'); // passé, en_cours, futur
            
            $statistics = [
                'general' => $this->getGeneralStatistics(),
                'villes' => $this->getVilleStatistics(),
                'etudiants' => $this->getEtudiantStatistics(),
                'groups' => $this->getGroupStatistics(),
                'etablissements' => $this->getEtablissementStatistics(),
                'promotions' => $this->getPromotionStatistics(),
                'options' => $this->getOptionStatistics(),
                'cours' => $this->getCoursStatisticsWithFilters($anneeUniversitaire, $dateDebut, $dateFin, $statutTemporel),
                'examens' => $this->getExamenStatisticsWithFilters($anneeUniversitaire, $dateDebut, $dateFin, $statutTemporel),
                'absences' => $this->getAbsenceStatistics(),
                'rattrapages' => $this->getRattrapageStatistics(),
                'repartition_geographique' => $this->getGeographicDistribution(),
                'performance' => $this->getPerformanceStatistics(),
                'filtres_appliques' => [
                    'annee_universitaire' => $anneeUniversitaire,
                    'date_debut' => $dateDebut,
                    'date_fin' => $dateFin,
                    'statut_temporel' => $statutTemporel,
                ]
            ];

            return response()->json([
                'success' => true,
                'message' => 'Statistiques filtrées récupérées avec succès',
                'data' => $statistics
            ], 200);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des statistiques filtrées',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Statistiques générales du système
     */
    private function getGeneralStatistics(): array
    {
        return [
            'total_villes' => Ville::count(),
            'total_etudiants' => Etudiant::count(),
            'total_groups' => Group::count(),
            'total_etablissements' => Etablissement::count(),
            'total_promotions' => Promotion::count(),
            'total_options' => Option::count(),
            'total_cours' => Cours::count(),
            'total_examens' => Examen::count(),
            'total_absences' => Absence::count(),
            'total_rattrapages' => Rattrapage::count(),
        ];
    }

    /**
     * Statistiques par ville
     */
    private function getVilleStatistics(): array
    {
        $villes = Ville::withCount([
            'etudiants',
            'etablissements'
        ])->get();

        $statistics = [];
        foreach ($villes as $ville) {
            // Calculer le nombre de groupes via les étudiants de cette ville
            $nombreGroups = Etudiant::where('ville_id', $ville->id)
                ->distinct('group_id')
                ->count('group_id');
            
            $statistics[] = [
                'ville_id' => $ville->id,
                'ville_name' => $ville->name,
                'nombre_etudiants' => $ville->etudiants_count,
                'nombre_groups' => $nombreGroups,
                'nombre_etablissements' => $ville->etablissements_count,
                'pourcentage_etudiants' => $this->calculatePercentage($ville->etudiants_count, Etudiant::count()),
                'pourcentage_groups' => $this->calculatePercentage($nombreGroups, Group::count()),
            ];
        }

        return $statistics;
    }

    /**
     * Statistiques des étudiants
     */
    private function getEtudiantStatistics(): array
    {
        $totalEtudiants = Etudiant::count();
        
        // Étudiants par ville
        $etudiantsParVille = Etudiant::select('villes.name as ville_name', DB::raw('count(*) as count'))
            ->join('villes', 'etudiants.ville_id', '=', 'villes.id')
            ->groupBy('villes.id', 'villes.name')
            ->orderBy('count', 'desc')
            ->get();

        // Étudiants par établissement
        $etudiantsParEtablissement = Etudiant::select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'etudiants.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        // Étudiants par promotion
        $etudiantsParPromotion = Etudiant::select('promotions.name as promotion_name', DB::raw('count(*) as count'))
            ->join('promotions', 'etudiants.promotion_id', '=', 'promotions.id')
            ->groupBy('promotions.id', 'promotions.name')
            ->orderBy('count', 'desc')
            ->get();

        // Étudiants par option
        $etudiantsParOption = Etudiant::select('options.name as option_name', DB::raw('count(*) as count'))
            ->join('options', 'etudiants.option_id', '=', 'options.id')
            ->groupBy('options.id', 'options.name')
            ->orderBy('count', 'desc')
            ->get();

        return [
            'total' => $totalEtudiants,
            'par_ville' => $etudiantsParVille,
            'par_etablissement' => $etudiantsParEtablissement,
            'par_promotion' => $etudiantsParPromotion,
            'par_option' => $etudiantsParOption,
        ];
    }

    /**
     * Statistiques des groupes
     */
    private function getGroupStatistics(): array
    {
        $totalGroups = Group::count();
        
        // Groupes par ville (via les étudiants)
        $groupsParVille = Etudiant::select('villes.name as ville_name', DB::raw('count(distinct etudiants.group_id) as count'))
            ->join('villes', 'etudiants.ville_id', '=', 'villes.id')
            ->whereNotNull('etudiants.group_id')
            ->groupBy('villes.id', 'villes.name')
            ->orderBy('count', 'desc')
            ->get();

        // Groupes par établissement (via les étudiants)
        $groupsParEtablissement = Etudiant::select('etablissements.name as etablissement_name', DB::raw('count(distinct etudiants.group_id) as count'))
            ->join('etablissements', 'etudiants.etablissement_id', '=', 'etablissements.id')
            ->whereNotNull('etudiants.group_id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        // Groupes par promotion (via les étudiants)
        $groupsParPromotion = Etudiant::select('promotions.name as promotion_name', DB::raw('count(distinct etudiants.group_id) as count'))
            ->join('promotions', 'etudiants.promotion_id', '=', 'promotions.id')
            ->whereNotNull('etudiants.group_id')
            ->groupBy('promotions.id', 'promotions.name')
            ->orderBy('count', 'desc')
            ->get();

        // Taille moyenne des groupes
        $tailleMoyenneGroupes = Etudiant::select('groups.title as group_title', DB::raw('count(*) as student_count'))
            ->join('groups', 'etudiants.group_id', '=', 'groups.id')
            ->groupBy('groups.id', 'groups.title')
            ->get();

        $moyenne = $tailleMoyenneGroupes->avg('student_count');

        return [
            'total' => $totalGroups,
            'par_ville' => $groupsParVille,
            'par_etablissement' => $groupsParEtablissement,
            'par_promotion' => $groupsParPromotion,
            'taille_moyenne' => round($moyenne, 2),
            'repartition_taille' => $tailleMoyenneGroupes,
        ];
    }

    /**
     * Statistiques des établissements
     */
    private function getEtablissementStatistics(): array
    {
        $totalEtablissements = Etablissement::count();
        
        // Établissements par ville
        $etablissementsParVille = Etablissement::select('villes.name as ville_name', DB::raw('count(*) as count'))
            ->join('villes', 'etablissements.ville_id', '=', 'villes.id')
            ->groupBy('villes.id', 'villes.name')
            ->orderBy('count', 'desc')
            ->get();

        // Capacité des établissements (nombre d'étudiants)
        $capaciteEtablissements = Etablissement::select(
                'etablissements.name as etablissement_name',
                'villes.name as ville_name',
                DB::raw('count(etudiants.id) as nombre_etudiants'),
                DB::raw('count(distinct etudiants.group_id) as nombre_groups')
            )
            ->leftJoin('etudiants', 'etablissements.id', '=', 'etudiants.etablissement_id')
            ->leftJoin('villes', 'etablissements.ville_id', '=', 'villes.id')
            ->groupBy('etablissements.id', 'etablissements.name', 'villes.name')
            ->orderBy('nombre_etudiants', 'desc')
            ->get();

        return [
            'total' => $totalEtablissements,
            'par_ville' => $etablissementsParVille,
            'capacite_detaille' => $capaciteEtablissements,
        ];
    }

    /**
     * Statistiques des promotions
     */
    private function getPromotionStatistics(): array
    {
        $totalPromotions = Promotion::count();
        
        // Étudiants par promotion
        $etudiantsParPromotion = Promotion::select(
                'promotions.name as promotion_name',
                DB::raw('count(etudiants.id) as nombre_etudiants')
            )
            ->leftJoin('etudiants', 'promotions.id', '=', 'etudiants.promotion_id')
            ->groupBy('promotions.id', 'promotions.name')
            ->orderBy('nombre_etudiants', 'desc')
            ->get();

        return [
            'total' => $totalPromotions,
            'etudiants_par_promotion' => $etudiantsParPromotion,
        ];
    }

    /**
     * Statistiques des options
     */
    private function getOptionStatistics(): array
    {
        $totalOptions = Option::count();
        
        // Options par établissement
        $optionsParEtablissement = Option::select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'options.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        // Étudiants par option
        $etudiantsParOption = Option::select(
                'options.name as option_name',
                'etablissements.name as etablissement_name',
                DB::raw('count(etudiants.id) as nombre_etudiants')
            )
            ->leftJoin('etudiants', 'options.id', '=', 'etudiants.option_id')
            ->leftJoin('etablissements', 'options.etablissement_id', '=', 'etablissements.id')
            ->groupBy('options.id', 'options.name', 'etablissements.name')
            ->orderBy('nombre_etudiants', 'desc')
            ->get();

        return [
            'total' => $totalOptions,
            'par_etablissement' => $optionsParEtablissement,
            'etudiants_par_option' => $etudiantsParOption,
        ];
    }

    /**
     * Statistiques des cours
     */
    private function getCoursStatistics(): array
    {
        $totalCours = Cours::count();
        
        // Cours par type
        $coursParType = Cours::select('types_cours.name as type_name', DB::raw('count(*) as count'))
            ->join('types_cours', 'cours.type_cours_id', '=', 'types_cours.id')
            ->groupBy('types_cours.id', 'types_cours.name')
            ->orderBy('count', 'desc')
            ->get();

        // Cours par promotion
        $coursParPromotion = Cours::select('promotions.name as promotion_name', DB::raw('count(*) as count'))
            ->join('promotions', 'cours.promotion_id', '=', 'promotions.id')
            ->groupBy('promotions.id', 'promotions.name')
            ->orderBy('count', 'desc')
            ->get();

        // Cours par établissement
        $coursParEtablissement = Cours::select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'cours.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        return [
            'total' => $totalCours,
            'par_type' => $coursParType,
            'par_promotion' => $coursParPromotion,
            'par_etablissement' => $coursParEtablissement,
            'par_statut_temporel' => $this->getCoursStatutTemporel(),
        ];
    }

    /**
     * Statistiques des examens
     */
    private function getExamenStatistics(): array
    {
        $totalExamens = Examen::count();
        
        // Examens par type
        $examensParType = Examen::select('types_examen.name as type_name', DB::raw('count(*) as count'))
            ->join('types_examen', 'examens.type_examen_id', '=', 'types_examen.id')
            ->groupBy('types_examen.id', 'types_examen.name')
            ->orderBy('count', 'desc')
            ->get();

        // Examens par établissement
        $examensParEtablissement = Examen::select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'examens.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        return [
            'total' => $totalExamens,
            'par_type' => $examensParType,
            'par_etablissement' => $examensParEtablissement,
            'par_statut_temporel' => $this->getExamenStatutTemporel(),
        ];
    }

    /**
     * Statistiques des absences
     */
    private function getAbsenceStatistics(): array
    {
        $totalAbsences = Absence::count();
        
        // Absences par étudiant
        $absencesParEtudiant = Absence::select(
                'etudiants.first_name',
                'etudiants.last_name',
                DB::raw('count(*) as nombre_absences')
            )
            ->join('etudiants', 'absences.etudiant_id', '=', 'etudiants.id')
            ->groupBy('etudiants.id', 'etudiants.first_name', 'etudiants.last_name')
            ->orderBy('nombre_absences', 'desc')
            ->limit(10)
            ->get();

        return [
            'total' => $totalAbsences,
            'top_absences_etudiants' => $absencesParEtudiant,
        ];
    }

    /**
     * Statistiques des rattrapages
     */
    private function getRattrapageStatistics(): array
    {
        $totalRattrapages = Rattrapage::count();
        
        // Rattrapages par mois
        $rattrapagesParMois = Rattrapage::select(
                DB::raw('MONTH(date) as mois'),
                DB::raw('YEAR(date) as annee'),
                DB::raw('count(*) as nombre_rattrapages')
            )
            ->groupBy(DB::raw('MONTH(date)'), DB::raw('YEAR(date)'))
            ->orderBy('annee', 'desc')
            ->orderBy('mois', 'desc')
            ->get();

        return [
            'total' => $totalRattrapages,
            'par_mois' => $rattrapagesParMois,
        ];
    }

    /**
     * Répartition géographique
     */
    private function getGeographicDistribution(): array
    {
        // Densité des étudiants par ville
        $densiteEtudiants = Ville::select(
                'villes.name as ville_name',
                DB::raw('count(etudiants.id) as nombre_etudiants'),
                DB::raw('count(distinct etudiants.group_id) as nombre_groups'),
                DB::raw('count(etablissements.id) as nombre_etablissements')
            )
            ->leftJoin('etudiants', 'villes.id', '=', 'etudiants.ville_id')
            ->leftJoin('etablissements', 'villes.id', '=', 'etablissements.ville_id')
            ->groupBy('villes.id', 'villes.name')
            ->orderBy('nombre_etudiants', 'desc')
            ->get();

        // Top 5 des villes avec le plus d'étudiants
        $topVilles = $densiteEtudiants->take(5);

        return [
            'densite_par_ville' => $densiteEtudiants,
            'top_5_villes' => $topVilles,
        ];
    }

    /**
     * Statistiques de performance
     */
    private function getPerformanceStatistics(): array
    {
        // Taux de présence (calculé à partir des absences)
        $totalEtudiants = Etudiant::count();
        $totalAbsences = Absence::count();
        
        // Note: Ceci est une approximation simplifiée
        $tauxPresence = $totalEtudiants > 0 ? (($totalEtudiants - $totalAbsences) / $totalEtudiants) * 100 : 0;

        return [
            'taux_presence_approximatif' => round($tauxPresence, 2),
            'total_absences' => $totalAbsences,
            'total_etudiants' => $totalEtudiants,
        ];
    }

    /**
     * Calcule le pourcentage
     */
    private function calculatePercentage($value, $total): float
    {
        if ($total == 0) return 0;
        return round(($value / $total) * 100, 2);
    }

    /**
     * Calcule les statistiques par statut temporel pour les cours
     */
    private function getCoursStatutTemporel(): array
    {
        $now = now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        // Cours en cours aujourd'hui
        $coursEnCours = Cours::whereDate('date', $today)
            ->whereTime('heure_debut', '<=', $currentTime)
            ->whereTime('heure_fin', '>=', $currentTime)
            ->count();

        // Cours en passe (date passée ou aujourd'hui mais heure fin dépassée)
        $coursEnPasse = Cours::where(function($query) use ($today, $currentTime) {
            $query->whereDate('date', '<', $today)
                  ->orWhere(function($q) use ($today, $currentTime) {
                      $q->whereDate('date', $today)
                        ->whereTime('heure_fin', '<', $currentTime);
                  });
        })->count();

        // Cours futurs (date future ou aujourd'hui mais heure début pas encore atteinte)
        $coursFuturs = Cours::where(function($query) use ($today, $currentTime) {
            $query->whereDate('date', '>', $today)
                  ->orWhere(function($q) use ($today, $currentTime) {
                      $q->whereDate('date', $today)
                        ->whereTime('heure_debut', '>', $currentTime);
                  });
        })->count();

        return [
            'en_cours' => $coursEnCours,
            'en_passe' => $coursEnPasse,
            'futur' => $coursFuturs,
        ];
    }

    /**
     * Calcule les statistiques par statut temporel pour les examens
     */
    private function getExamenStatutTemporel(): array
    {
        $now = now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        // Examens en cours aujourd'hui
        $examensEnCours = Examen::whereDate('date', $today)
            ->whereTime('heure_debut', '<=', $currentTime)
            ->whereTime('heure_fin', '>=', $currentTime)
            ->count();

        // Examens en passe (date passée ou aujourd'hui mais heure fin dépassée)
        $examensEnPasse = Examen::where(function($query) use ($today, $currentTime) {
            $query->whereDate('date', '<', $today)
                  ->orWhere(function($q) use ($today, $currentTime) {
                      $q->whereDate('date', $today)
                        ->whereTime('heure_fin', '<', $currentTime);
                  });
        })->count();

        // Examens futurs (date future ou aujourd'hui mais heure début pas encore atteinte)
        $examensFuturs = Examen::where(function($query) use ($today, $currentTime) {
            $query->whereDate('date', '>', $today)
                  ->orWhere(function($q) use ($today, $currentTime) {
                      $q->whereDate('date', $today)
                        ->whereTime('heure_debut', '>', $currentTime);
                  });
        })->count();

        return [
            'en_cours' => $examensEnCours,
            'en_passe' => $examensEnPasse,
            'futur' => $examensFuturs,
        ];
    }

    /**
     * Statistiques des cours avec filtres
     */
    private function getCoursStatisticsWithFilters($anneeUniversitaire = null, $dateDebut = null, $dateFin = null, $statutTemporel = null): array
    {
        $query = Cours::query();
        
        // Appliquer les filtres
        if ($anneeUniversitaire) {
            $query->where('annee_universitaire', $anneeUniversitaire);
        }
        
        if ($dateDebut) {
            $query->whereDate('date', '>=', $dateDebut);
        }
        
        if ($dateFin) {
            $query->whereDate('date', '<=', $dateFin);
        }
        
        // Filtrer par statut temporel sans colonne dédiée
        if ($statutTemporel) {
            $now = now();
            $today = $now->toDateString();
            $currentTime = $now->toTimeString();

            if ($statutTemporel === 'en_cours') {
                $query->whereDate('date', $today)
                      ->whereTime('heure_debut', '<=', $currentTime)
                      ->whereTime('heure_fin', '>=', $currentTime);
            } elseif ($statutTemporel === 'passé') {
                $query->where(function($q) use ($today, $currentTime) {
                    $q->whereDate('date', '<', $today)
                      ->orWhere(function($qq) use ($today, $currentTime) {
                          $qq->whereDate('date', $today)
                             ->whereTime('heure_fin', '<', $currentTime);
                      });
                });
            } elseif ($statutTemporel === 'futur') {
                $query->where(function($q) use ($today, $currentTime) {
                    $q->whereDate('date', '>', $today)
                      ->orWhere(function($qq) use ($today, $currentTime) {
                          $qq->whereDate('date', $today)
                             ->whereTime('heure_debut', '>', $currentTime);
                      });
                });
            }
        }
        
        $totalCours = $query->count();
        
        // Cours par type avec filtres
        $coursParType = (clone $query)
            ->select('types_cours.name as type_name', DB::raw('count(*) as count'))
            ->join('types_cours', 'cours.type_cours_id', '=', 'types_cours.id')
            ->groupBy('types_cours.id', 'types_cours.name')
            ->orderBy('count', 'desc')
            ->get();

        // Cours par promotion avec filtres
        $coursParPromotion = (clone $query)
            ->select('promotions.name as promotion_name', DB::raw('count(*) as count'))
            ->join('promotions', 'cours.promotion_id', '=', 'promotions.id')
            ->groupBy('promotions.id', 'promotions.name')
            ->orderBy('count', 'desc')
            ->get();

        // Cours par établissement avec filtres
        $coursParEtablissement = (clone $query)
            ->select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'cours.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        // Statistiques par année universitaire
        $coursParAnnee = (clone $query)
            ->select('annee_universitaire', DB::raw('count(*) as count'))
            ->whereNotNull('annee_universitaire')
            ->groupBy('annee_universitaire')
            ->orderBy('annee_universitaire', 'desc')
            ->get();

        // Statistiques par statut temporel (calculées dynamiquement)
        $now = now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        $baseQuery = clone $query;
        $enCoursCount = (clone $baseQuery)
            ->whereDate('date', $today)
            ->whereTime('heure_debut', '<=', $currentTime)
            ->whereTime('heure_fin', '>=', $currentTime)
            ->count();

        $enPasseCount = (clone $baseQuery)
            ->where(function($q) use ($today, $currentTime) {
                $q->whereDate('date', '<', $today)
                  ->orWhere(function($qq) use ($today, $currentTime) {
                      $qq->whereDate('date', $today)
                         ->whereTime('heure_fin', '<', $currentTime);
                  });
            })
            ->count();

        $futurCount = (clone $baseQuery)
            ->where(function($q) use ($today, $currentTime) {
                $q->whereDate('date', '>', $today)
                  ->orWhere(function($qq) use ($today, $currentTime) {
                      $qq->whereDate('date', $today)
                         ->whereTime('heure_debut', '>', $currentTime);
                  });
            })
            ->count();

        $coursParStatut = collect([
            ['statut_temporel' => 'en_cours', 'count' => $enCoursCount],
            ['statut_temporel' => 'passé', 'count' => $enPasseCount],
            ['statut_temporel' => 'futur', 'count' => $futurCount],
        ]);

        // Détail du statut temporel
        $statutTemporelDetail = [
            'en_cours' => $enCoursCount,
            'en_passe' => $enPasseCount,
            'futur' => $futurCount,
        ];

        return [
            'total' => $totalCours,
            'par_type' => $coursParType,
            'par_promotion' => $coursParPromotion,
            'par_etablissement' => $coursParEtablissement,
            'par_annee_universitaire' => $coursParAnnee,
            'par_statut_temporel' => $coursParStatut,
            'par_statut_temporel_detaille' => $statutTemporelDetail,
        ];
    }

    /**
     * Statistiques des examens avec filtres
     */
    private function getExamenStatisticsWithFilters($anneeUniversitaire = null, $dateDebut = null, $dateFin = null, $statutTemporel = null): array
    {
        $query = Examen::query();
        
        // Appliquer les filtres
        if ($anneeUniversitaire) {
            $query->where('annee_universitaire', $anneeUniversitaire);
        }
        
        if ($dateDebut) {
            $query->whereDate('date', '>=', $dateDebut);
        }
        
        if ($dateFin) {
            $query->whereDate('date', '<=', $dateFin);
        }
        
        // Filtrer par statut temporel sans colonne dédiée
        if ($statutTemporel) {
            $now = now();
            $today = $now->toDateString();
            $currentTime = $now->toTimeString();

            if ($statutTemporel === 'en_cours') {
                $query->whereDate('date', $today)
                      ->whereTime('heure_debut', '<=', $currentTime)
                      ->whereTime('heure_fin', '>=', $currentTime);
            } elseif ($statutTemporel === 'passé') {
                $query->where(function($q) use ($today, $currentTime) {
                    $q->whereDate('date', '<', $today)
                      ->orWhere(function($qq) use ($today, $currentTime) {
                          $qq->whereDate('date', $today)
                             ->whereTime('heure_fin', '<', $currentTime);
                      });
                });
            } elseif ($statutTemporel === 'futur') {
                $query->where(function($q) use ($today, $currentTime) {
                    $q->whereDate('date', '>', $today)
                      ->orWhere(function($qq) use ($today, $currentTime) {
                          $qq->whereDate('date', $today)
                             ->whereTime('heure_debut', '>', $currentTime);
                      });
                });
            }
        }
        
        $totalExamens = $query->count();
        
        // Examens par type avec filtres
        $examensParType = (clone $query)
            ->select('types_examen.name as type_name', DB::raw('count(*) as count'))
            ->join('types_examen', 'examens.type_examen_id', '=', 'types_examen.id')
            ->groupBy('types_examen.id', 'types_examen.name')
            ->orderBy('count', 'desc')
            ->get();

        // Examens par établissement avec filtres
        $examensParEtablissement = (clone $query)
            ->select('etablissements.name as etablissement_name', DB::raw('count(*) as count'))
            ->join('etablissements', 'examens.etablissement_id', '=', 'etablissements.id')
            ->groupBy('etablissements.id', 'etablissements.name')
            ->orderBy('count', 'desc')
            ->get();

        // Statistiques par année universitaire
        $examensParAnnee = (clone $query)
            ->select('annee_universitaire', DB::raw('count(*) as count'))
            ->whereNotNull('annee_universitaire')
            ->groupBy('annee_universitaire')
            ->orderBy('annee_universitaire', 'desc')
            ->get();

        // Statistiques par statut temporel (calculées dynamiquement)
        $now = now();
        $today = $now->toDateString();
        $currentTime = $now->toTimeString();

        $baseQuery = clone $query;
        $enCoursCount = (clone $baseQuery)
            ->whereDate('date', $today)
            ->whereTime('heure_debut', '<=', $currentTime)
            ->whereTime('heure_fin', '>=', $currentTime)
            ->count();

        $enPasseCount = (clone $baseQuery)
            ->where(function($q) use ($today, $currentTime) {
                $q->whereDate('date', '<', $today)
                  ->orWhere(function($qq) use ($today, $currentTime) {
                      $qq->whereDate('date', $today)
                         ->whereTime('heure_fin', '<', $currentTime);
                  });
            })
            ->count();

        $futurCount = (clone $baseQuery)
            ->where(function($q) use ($today, $currentTime) {
                $q->whereDate('date', '>', $today)
                  ->orWhere(function($qq) use ($today, $currentTime) {
                      $qq->whereDate('date', $today)
                         ->whereTime('heure_debut', '>', $currentTime);
                  });
            })
            ->count();

        $examensParStatut = collect([
            ['statut_temporel' => 'en_cours', 'count' => $enCoursCount],
            ['statut_temporel' => 'passé', 'count' => $enPasseCount],
            ['statut_temporel' => 'futur', 'count' => $futurCount],
        ]);

        // Détail du statut temporel
        $statutTemporelDetail = [
            'en_cours' => $enCoursCount,
            'en_passe' => $enPasseCount,
            'futur' => $futurCount,
        ];

        return [
            'total' => $totalExamens,
            'par_type' => $examensParType,
            'par_etablissement' => $examensParEtablissement,
            'par_annee_universitaire' => $examensParAnnee,
            'par_statut_temporel' => $examensParStatut,
            'par_statut_temporel_detaille' => $statutTemporelDetail,
        ];
    }
}
