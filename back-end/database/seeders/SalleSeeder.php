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
                'name' => 'C501',
                'capacite' => 50,
                'etage' => 5,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C506',
                'capacite' => 50,
                'etage' => 5,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C502',
                'capacite' => 50,
                'etage' => 5,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C504',
                'capacite' => 50,
                'etage' => 5,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C03',
                'capacite' => 50,
                'etage' => 0,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C401',
                'capacite' => 50,
                'etage' => 4,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C402',
                'capacite' => 50,
                'etage' => 4,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C02',
                'capacite' => 50,
                'etage' => 0,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C01',
                'capacite' => 50,
                'etage' => 0,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'C603',
                'capacite' => 50,
                'etage' => 6,
                'batiment' => 'C',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'D601',
                'capacite' => 50,
                'etage' => 6,
                'batiment' => 'D',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
            [
                'name' => 'Amphi D6',
                'capacite' => 200,
                'etage' => 6,
                'batiment' => 'D',
                'etablissement_id' => 1,
                'ville_id' => 1,
            ],
        ];

        foreach ($salles as $salle) {
            \App\Models\Salle::create($salle);
        }
    }
}
