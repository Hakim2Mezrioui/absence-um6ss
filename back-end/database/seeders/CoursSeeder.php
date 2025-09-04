<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cours;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\TypeCours;
use App\Models\Salle;
use Carbon\Carbon;

class CoursSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les IDs des tables de référence
        $etablissements = Etablissement::pluck('id')->toArray();
        $promotions = Promotion::pluck('id')->toArray();
        $typesCours = TypeCours::pluck('id')->toArray();
        $salles = Salle::pluck('id')->toArray();

        // Vérifier que les tables de référence ont des données
        if (empty($etablissements) || empty($promotions) || empty($typesCours) || empty($salles)) {
            $this->command->warn('Certaines tables de référence sont vides. Veuillez exécuter leurs seeders d\'abord.');
            return;
        }

        // Générer des dates et heures pour les cours avec différentes années universitaires
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
        
        $cours = [];
        
        // COURS DE L'ANNÉE UNIVERSITAIRE PRÉCÉDENTE (PASSÉS)
        $this->addCoursForAcademicYear($cours, $previousAcademicYearStart, $previousAcademicYearEnd, 
            $etablissements, $promotions, $typesCours, $salles, 'passé');
        
        // COURS DE L'ANNÉE UNIVERSITAIRE ACTUELLE (MIXTE)
        $this->addCoursForAcademicYear($cours, $academicYearStart, $academicYearEnd, 
            $etablissements, $promotions, $typesCours, $salles, 'mixte');
        
        // COURS DE L'ANNÉE UNIVERSITAIRE SUIVANTE (FUTURS)
        $this->addCoursForAcademicYear($cours, $nextAcademicYearStart, $nextAcademicYearEnd, 
            $etablissements, $promotions, $typesCours, $salles, 'futur');

        foreach ($cours as $coursData) {
            Cours::create($coursData);
        }

        $this->command->info('CoursSeeder exécuté avec succès. ' . count($cours) . ' cours créés.');
        $this->command->info('Année universitaire actuelle: ' . $academicYearStart->format('Y') . '-' . $academicYearEnd->format('Y'));
    }
    
    /**
     * Ajoute des cours pour une année universitaire donnée
     */
    private function addCoursForAcademicYear(&$cours, $startDate, $endDate, $etablissements, $promotions, $typesCours, $salles, $type)
    {
        $currentDate = $startDate->copy();
        $coursIndex = 0;
        
        while ($currentDate <= $endDate && $coursIndex < 20) { // Limiter à 20 cours par année
            // Ne créer des cours que les jours de semaine (lundi = 1, vendredi = 5)
            if ($currentDate->isWeekday() && $currentDate->dayOfWeek <= 5) {
                
                // Cours du matin (8h-9h30)
                $cours[] = [
                    'name' => $this->getCoursName($coursIndex, 'matin'),
                    'date' => $currentDate->toDateString(),
                    'heure_debut' => '08:00:00',
                    'heure_fin' => '09:30:00',
                    'etablissement_id' => $etablissements[array_rand($etablissements)],
                    'promotion_id' => $promotions[array_rand($promotions)],
                    'type_cours_id' => $typesCours[array_rand($typesCours)],
                    'salle_id' => $salles[array_rand($salles)],
                    'annee_universitaire' => $startDate->format('Y') . '-' . $endDate->format('Y'),
                    'statut_temporel' => $this->getStatutTemporel($currentDate, '08:00:00', '09:30:00'),
                ];
                
                // Cours de l'après-midi (14h-15h30)
                $cours[] = [
                    'name' => $this->getCoursName($coursIndex, 'apres-midi'),
                    'date' => $currentDate->toDateString(),
                    'heure_debut' => '14:00:00',
                    'heure_fin' => '15:30:00',
                    'etablissement_id' => $etablissements[array_rand($etablissements)],
                    'promotion_id' => $promotions[array_rand($promotions)],
                    'type_cours_id' => $typesCours[array_rand($typesCours)],
                    'salle_id' => $salles[array_rand($salles)],
                    'annee_universitaire' => $startDate->format('Y') . '-' . $endDate->format('Y'),
                    'statut_temporel' => $this->getStatutTemporel($currentDate, '14:00:00', '15:30:00'),
                ];
                
                $coursIndex++;
            }
            
            $currentDate->addDay();
        }
    }
    
    /**
     * Génère un nom de cours basé sur l'index et la période
     */
    private function getCoursName($index, $periode): string
    {
        $matieres = [
            'Mathématiques', 'Physique', 'Chimie', 'Biologie', 'Informatique',
            'Anglais', 'Français', 'Histoire', 'Géographie', 'Philosophie',
            'Économie', 'Droit', 'Médecine', 'Ingénierie', 'Architecture'
        ];
        
        $niveaux = ['I', 'II', 'III', 'Avancé', 'Spécialisé'];
        
        $matiere = $matieres[$index % count($matieres)];
        $niveau = $niveaux[$index % count($niveaux)];
        $periodeLabel = $periode === 'matin' ? 'Matin' : 'Après-midi';
        
        return $matiere . ' ' . $niveau . ' (' . $periodeLabel . ')';
    }
    
    /**
     * Détermine le statut temporel d'un cours
     */
    private function getStatutTemporel($date, $heureDebut, $heureFin): string
    {
        $now = Carbon::now();
        
        // Créer les objets Carbon pour le début et fin du cours
        $coursDate = $date->copy()->setTimeFromTimeString($heureDebut);
        $coursFin = $date->copy()->setTimeFromTimeString($heureFin);
        
        if ($coursFin < $now) {
            return 'passé';
        } elseif ($coursDate <= $now && $coursFin >= $now) {
            return 'en_cours';
        } else {
            return 'futur';
        }
    }
}