<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Classe;

class ClassSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $classes = [
            ['title' => 'Class 1', 'faculte' => 'Pharmacie', 'promotion' => '1ere annee'],
            ['title' => 'Class 2', 'faculte' => 'Medcine', 'promotion' => '2eme annee'],
            ['title' => 'Class 3', 'faculte' => 'Dentaire', 'promotion' => '3eme annee'],
            ['title' => 'Class 4', 'faculte' => 'Esgb', 'promotion' => '4eme annee'],
        ];

        foreach ($classes as $class) {
            Classe::create($class);
        }
    }
}
