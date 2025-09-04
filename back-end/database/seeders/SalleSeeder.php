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
        \App\Models\Salle::create([
            'name' => 'Salle A1',
            'etage' => '1er étage',
            'batiment' => 'Bâtiment A',
            'etablissement_id' => 1
        ]);
        
        \App\Models\Salle::create([
            'name' => 'Salle A2',
            'etage' => '1er étage',
            'batiment' => 'Bâtiment A',
            'etablissement_id' => 1
        ]);
        
        \App\Models\Salle::create([
            'name' => 'Salle B1',
            'etage' => '2ème étage',
            'batiment' => 'Bâtiment B',
            'etablissement_id' => 1
        ]);
        
        \App\Models\Salle::create([
            'name' => 'Amphithéâtre 1',
            'etage' => 'Rez-de-chaussée',
            'batiment' => 'Bâtiment Principal',
            'etablissement_id' => 1
        ]);
    }
}
