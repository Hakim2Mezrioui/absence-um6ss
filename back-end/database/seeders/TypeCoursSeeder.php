<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\TypeCours;

class TypeCoursSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $typesCours = [
            'Mathématiques',
            'Physique',
            'Chimie',
            'Biologie',
            'Informatique',
            'Langues',
            'Géologie',
            'Économie',
            'Histoire',
            'Philosophie',
        ];

        foreach ($typesCours as $typeCours) {
            TypeCours::create([
                'name' => $typeCours
            ]);
        }

        $this->command->info('TypeCoursSeeder exécuté avec succès. ' . count($typesCours) . ' types de cours créés.');
    }
}
