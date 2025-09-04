<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SalleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $salles = [
            [
                'name' => 'Amphithéâtre A',
                'etage' => 0,
                'batiment' => 'Bâtiment Principal',
                'etablissement_id' => 1,
                'capacite' => 200,
                'description' => 'Grand amphithéâtre équipé d\'un projecteur haute définition et d\'un système audio'
            ],
            [
                'name' => 'Salle A101',
                'etage' => 1,
                'batiment' => 'Bâtiment A',
                'etablissement_id' => 1,
                'capacite' => 30,
                'description' => 'Salle de cours avec tableau interactif'
            ],
            [
                'name' => 'Salle A102',
                'etage' => 1,
                'batiment' => 'Bâtiment A',
                'etablissement_id' => 1,
                'capacite' => 25,
                'description' => 'Salle équipée pour les travaux dirigés'
            ],
            [
                'name' => 'Laboratoire Info B201',
                'etage' => 2,
                'batiment' => 'Bâtiment B',
                'etablissement_id' => 1,
                'capacite' => 20,
                'description' => 'Laboratoire informatique avec 20 postes de travail modernes'
            ],
            [
                'name' => 'Salle B202',
                'etage' => 2,
                'batiment' => 'Bâtiment B',
                'etablissement_id' => 1,
                'capacite' => 40,
                'description' => 'Salle de conférence avec équipement de visioconférence'
            ],
            [
                'name' => 'Salle C301',
                'etage' => 3,
                'batiment' => 'Bâtiment C',
                'etablissement_id' => 1,
                'capacite' => 15,
                'description' => 'Petite salle pour séminaires et réunions'
            ],
            [
                'name' => 'Amphithéâtre B',
                'etage' => 0,
                'batiment' => 'Bâtiment Sciences',
                'etablissement_id' => 1,
                'capacite' => 150,
                'description' => 'Amphithéâtre avec équipement spécialisé pour les sciences'
            ],
            [
                'name' => 'Salle D101',
                'etage' => 1,
                'batiment' => 'Bâtiment D',
                'etablissement_id' => 1,
                'capacite' => 35,
                'description' => 'Salle polyvalente avec mobilier modulaire'
            ]
        ];

        foreach ($salles as $salle) {
            \App\Models\Salle::create($salle);
        }
    }
}
