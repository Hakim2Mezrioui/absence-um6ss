<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $groups = [];
        
        // Établissements (4 facultés)
        $etablissements = [
            1 => 'MÉDECINE',
            2 => 'DENTAIRE', 
            3 => 'PHARMACIE',
            4 => 'SCIENCES INFIRMIÈRES'
        ];
        
        // Créer 20 groupes pour chaque faculté
        foreach ($etablissements as $etablissementId => $etablissementName) {
            for ($i = 1; $i <= 20; $i++) {
                $groups[] = [
                    'title' => "Groupe {$i}",
                    'promotion_id' => 1,
                    'etablissement_id' => $etablissementId,
                    'ville_id' => 1, // Casablanca
                ];
            }
        }

        foreach ($groups as $group) {
            \App\Models\Group::create($group);
        }

        $this->command->info("✅ " . count($groups) . " groupes ont été créés avec succès !");
    }
}
