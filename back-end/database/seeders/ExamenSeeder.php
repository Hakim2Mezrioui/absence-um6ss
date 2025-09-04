<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Examen;
use App\Models\Option;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\TypeExamen;
use App\Models\Salle;
use Carbon\Carbon;

class ExamenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les IDs des tables de référence
        $options = Option::pluck('id')->toArray();
        $etablissements = Etablissement::pluck('id')->toArray();
        $promotions = Promotion::pluck('id')->toArray();
        $typesExamen = TypeExamen::pluck('id')->toArray();
        $salles = Salle::pluck('id')->toArray();
        $groups = \App\Models\Group::pluck('id')->toArray();
        $villes = \App\Models\Ville::pluck('id')->toArray();

        // Vérifier que les tables de référence ont des données
        if (empty($options) || empty($etablissements) || empty($promotions) || empty($typesExamen) || empty($salles) || empty($groups) || empty($villes)) {
            $this->command->warn('⚠️  Certaines tables de référence sont vides. Veuillez exécuter leurs seeders d\'abord.');
            return;
        }

        // Générer des dates et heures pour les examens avec différentes années universitaires
        $now = Carbon::now();
        $currentYear = $now->year;
        
        // Année universitaire actuelle (septembre à août)
        $academicYearStart = Carbon::create($currentYear, 9, 1); // 1er septembre
        $academicYearEnd = Carbon::create($currentYear + 1, 8, 31); // 31 août
        
        // Si on est avant septembre, utiliser l'année précédente
        if ($now->month < 9) {
            $academicYearStart = Carbon::create($currentYear - 1, 9, 1);
            $academicYearEnd = Carbon::create($currentYear, 8, 31);
        }
        
        // Année universitaire précédente
        $previousAcademicYearStart = $academicYearStart->copy()->subYear();
        $previousAcademicYearEnd = $academicYearEnd->copy()->subYear();
        
        // Année universitaire suivante
        $nextAcademicYearStart = $academicYearStart->copy()->addYear();
        $nextAcademicYearEnd = $academicYearEnd->copy()->addYear();
        
        $examens = [];
        
        // EXAMENS DE L'ANNÉE UNIVERSITAIRE PRÉCÉDENTE (PASSÉS)
        $this->addExamensForAcademicYear($examens, $previousAcademicYearStart, $previousAcademicYearEnd, 
            $options, $etablissements, $promotions, $typesExamen, $salles, $groups, $villes, 'passé');
        
        // EXAMENS DE L'ANNÉE UNIVERSITAIRE ACTUELLE (MIXTE)
        $this->addExamensForAcademicYear($examens, $academicYearStart, $academicYearEnd, 
            $options, $etablissements, $promotions, $typesExamen, $salles, $groups, $villes, 'mixte');
        
        // EXAMENS DE L'ANNÉE UNIVERSITAIRE SUIVANTE (FUTURS)
        $this->addExamensForAcademicYear($examens, $nextAcademicYearStart, $nextAcademicYearEnd, 
            $options, $etablissements, $promotions, $typesExamen, $salles, $groups, $villes, 'futur');

        foreach ($examens as $examen) {
            Examen::create($examen);
        }

        $this->command->info('ExamenSeeder exécuté avec succès. ' . count($examens) . ' examens créés.');
        $this->command->info('Année universitaire actuelle: ' . $academicYearStart->format('Y') . '-' . $academicYearEnd->format('Y'));
    }
    
    /**
     * Ajoute des examens pour une année universitaire donnée
     */
    private function addExamensForAcademicYear(&$examens, $startDate, $endDate, $options, $etablissements, $promotions, $typesExamen, $salles, $groups, $villes, $type)
    {
        $currentDate = $startDate->copy();
        $examenIndex = 0;
        
        while ($currentDate <= $endDate && $examenIndex < 15) { // Limiter à 15 examens par année
            // Créer des examens principalement pendant les périodes d'examens (décembre, janvier, mai, juin)
            $month = $currentDate->month;
            $isExamPeriod = in_array($month, [12, 1, 5, 6]);
            
            if ($isExamPeriod && $currentDate->isWeekday()) {
                
                // Examen du matin (8h-10h)
                $examens[] = [
                    'title' => $this->getExamenTitle($examenIndex, 'matin'),
                    'date' => $currentDate->toDateString(),
                    'heure_debut' => '08:00:00',
                    'heure_fin' => '10:00:00',
                    'option_id' => $options[array_rand($options)],
                    'salle_id' => $salles[array_rand($salles)],
                    'promotion_id' => $promotions[array_rand($promotions)],
                    'type_examen_id' => $typesExamen[array_rand($typesExamen)],
                    'etablissement_id' => $etablissements[array_rand($etablissements)],
                    'group_id' => $groups[array_rand($groups)],
                    'ville_id' => $villes[array_rand($villes)],
                    'annee_universitaire' => $startDate->format('Y') . '-' . $endDate->format('Y'),
                    'statut_temporel' => $this->getStatutTemporel($currentDate, '08:00:00', '10:00:00'),
                ];
                
                // Examen de l'après-midi (14h-16h)
                $examens[] = [
                    'title' => $this->getExamenTitle($examenIndex, 'apres-midi'),
                    'date' => $currentDate->toDateString(),
                    'heure_debut' => '14:00:00',
                    'heure_fin' => '16:00:00',
                    'option_id' => $options[array_rand($options)],
                    'salle_id' => $salles[array_rand($salles)],
                    'promotion_id' => $promotions[array_rand($promotions)],
                    'type_examen_id' => $typesExamen[array_rand($typesExamen)],
                    'etablissement_id' => $etablissements[array_rand($etablissements)],
                    'group_id' => $groups[array_rand($groups)],
                    'ville_id' => $villes[array_rand($villes)],
                    'annee_universitaire' => $startDate->format('Y') . '-' . $endDate->format('Y'),
                    'statut_temporel' => $this->getStatutTemporel($currentDate, '14:00:00', '16:00:00'),
                ];
                
                $examenIndex++;
            }
            
            $currentDate->addDay();
        }
    }
    
    /**
     * Génère un titre d'examen basé sur l'index et la période
     */
    private function getExamenTitle($index, $periode): string
    {
        $matieres = [
            'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Informatique',
            'Anglais', 'Français', 'Histoire', 'Géographie', 'Philosophie',
            'Économie', 'Droit', 'Médecine', 'Ingénierie', 'Architecture'
        ];
        
        $types = ['Contrôle', 'Examen', 'Partiel', 'Final', 'Rattrapage'];
        $niveaux = ['I', 'II', 'III', 'Avancé', 'Spécialisé'];
        
        $matiere = $matieres[$index % count($matieres)];
        $type = $types[$index % count($types)];
        $niveau = $niveaux[$index % count($niveaux)];
        $periodeLabel = $periode === 'matin' ? 'Matin' : 'Après-midi';
        
        return $type . ' de ' . $matiere . ' ' . $niveau . ' (' . $periodeLabel . ')';
    }
    
    /**
     * Détermine le statut temporel d'un examen
     */
    private function getStatutTemporel($date, $heureDebut, $heureFin): string
    {
        $now = Carbon::now();
        
        // Créer les objets Carbon pour le début et fin de l'examen
        $examenDate = $date->copy()->setTimeFromTimeString($heureDebut);
        $examenFin = $date->copy()->setTimeFromTimeString($heureFin);
        
        if ($examenFin < $now) {
            return 'passé';
        } elseif ($examenDate <= $now && $examenFin >= $now) {
            return 'en_cours';
        } else {
            return 'futur';
        }
    }
}
