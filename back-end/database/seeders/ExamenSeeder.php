<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Examen;


class ExamenSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $examens = [
            ['title' => 'Examen 1', 'date' => '2025-01-15', 'hour_debut' => '08:00:00', 'hour_fin' => '09:00:00', 'hour_debut_pointage' => '07:30:00', 'faculte' => 'Pharmacie', 'promotion' => '1ere annee'],
            ['title' => 'Examen 2', 'date' => '2025-01-16', 'hour_debut' => '09:00:00', 'hour_fin' => '10:00:00','hour_debut_pointage' => '08:30:00', 'faculte' => 'medecine', 'promotion' => '2eme annee'],
            ['title' => 'Examen 3', 'date' => '2025-01-17', 'hour_debut' => '10:00:00', 'hour_fin' => '11:00:00','hour_debut_pointage' => '09:30:00', 'faculte' => 'Dentaire', 'promotion' => '3eme annee'],
            ['title' => 'Examen 4', 'date' => '2025-01-18', 'hour_debut' => '11:00:00', 'hour_fin' => '12:00:00','hour_debut_pointage' => '10:30:00', 'faculte' => 'Esgb', 'promotion' => '4eme annee'],
        ];

        foreach ($examens as $examen) {
            Examen::create($examen);
        }
    }
}
