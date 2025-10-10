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
            'Cours Magistral',
            'Cours Travaux Dirigés',
            'Cours Travaux Pratiques',
        ];

        foreach ($typesCours as $typeCours) {
            TypeCours::create([
                'name' => $typeCours
            ]);
        }

        $this->command->info('TypeCoursSeeder exécuté avec succès. ' . count($typesCours) . ' types de cours créés.');
    }
}
