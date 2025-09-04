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
                'name' => 'Pharmacie',
                'description' => 'Formation en sciences pharmaceutiques',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Médecine',
                'description' => 'Formation en sciences médicales',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Dentaire',
                'description' => 'Formation en chirurgie dentaire',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Biologie',
                'description' => 'Formation en sciences biologiques',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Chimie',
                'description' => 'Formation en sciences chimiques',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Physique',
                'description' => 'Formation en sciences physiques',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Mathématiques',
                'description' => 'Formation en mathématiques',
                'etablissement_id' => $etablissements[0],
            ],
            [
                'name' => 'Informatique',
                'description' => 'Formation en sciences informatiques',
                'etablissement_id' => $etablissements[0],
            ]
        ];

        foreach ($options as $option) {
            Option::create($option);
        }

        $this->command->info("✅ " . count($options) . " options ont été créées avec succès !");
    }
} 