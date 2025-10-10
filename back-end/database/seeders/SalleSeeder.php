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
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C506',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C502',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C504',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C03',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C401',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C402',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C02',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C01',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'C603',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'D601',
                'capacity' => 50,
                'etablissement_id' => 1,
            ],
            [
                'name' => 'Amphi D6',
                'capacity' => 200,
                'etablissement_id' => 1,
            ],
        ];

        foreach ($salles as $salle) {
            \App\Models\Salle::create($salle);
        }
    }
}
