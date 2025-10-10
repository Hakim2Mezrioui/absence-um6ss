<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class VilleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Ville::create(['name' => 'Casablanca']);
        \App\Models\Ville::create(['name' => 'Rabat']);
        \App\Models\Ville::create(['name' => 'Agadir']);
        \App\Models\Ville::create(['name' => 'Dakhla']);
        \App\Models\Ville::create(['name' => 'Marrakech']);
    }
}
