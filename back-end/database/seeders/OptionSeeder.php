<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Option;
use App\Models\Etablissement;

class OptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les IDs des établissements
        $etablissements = Etablissement::pluck('id')->toArray();

        // Vérifier que la table des établissements a des données
        if (empty($etablissements)) {
            $this->command->warn('⚠️  La table des établissements est vide. Veuillez exécuter EtablissementSeeder d\'abord.');
            return;
        }

        $options = [
            [
                'name' => 'Generale',
                'description' => 'Formation générale',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPDN',
                'description' => 'Licence Professionnelle en Diététique Nutrition',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPIAR',
                'description' => 'Licence Professionnelle en Anesthésie et Réanimation',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPIBO',
                'description' => 'Licence Professionnelle en Infirmier du Bloc Opératoire',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPINP',
                'description' => 'Licence Professionnelle en Néonatologie et Pédiatrie',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPIP',
                'description' => 'Licence Professionnelle Infirmier Polyvalent',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPKN',
                'description' => 'Licence Professionnelle en Kinésithérapie',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPOR',
                'description' => 'Licence Professionnelle en Orthophonie',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPOT',
                'description' => 'Licence Professionnelle en Orthoptie',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPPS',
                'description' => 'Licence Professionnelle en Psychomotricité',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPSG',
                'description' => 'Licence Professionnelle en Sage femme',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPTIM',
                'description' => 'Licence Professionnelle Technicien Imagerie Médicale',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'LPTL',
                'description' => 'Licence Professionnelle Technicien de Laboratoire',
                'etablissement_id' => $etablissements[0],
            ]
        ];

        foreach ($options as $option) {
            Option::create($option);
        }

        $this->command->info("✅ " . count($options) . " options ont été créées avec succès !");
    }
} 