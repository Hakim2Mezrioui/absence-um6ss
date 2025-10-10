<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class TypeExamenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\TypeExamen::create(['name' => 'Contrôle Continu']);
        \App\Models\TypeExamen::create(['name' => 'Examen Partiel']);
        \App\Models\TypeExamen::create(['name' => 'Rattrapage']);
    }
}
