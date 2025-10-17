<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Cours;

class CoursSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Désactiver temporairement le scope pour les seeders
        Cours::withoutGlobalScope(\App\Scopes\UserContextScope::class);
        
        // Créer quelques cours de test
        $cours1 = Cours::create([
            'name' => 'Mathématiques - Analyse 1',
            'date' => '2024-01-15',
            'pointage_start_hour' => '08:00:00',
            'heure_debut' => '08:30:00',
            'heure_fin' => '10:30:00',
            'tolerance' => '00:15:00',
            'etablissement_id' => 1,
            'promotion_id' => 1,
            'type_cours_id' => 1,
            'salle_id' => 1,
            'option_id' => 1,
            'ville_id' => 1,
            'annee_universitaire' => '2023-2024'
        ]);

        $cours2 = Cours::create([
            'name' => 'Physique - Mécanique',
            'date' => '2024-01-16',
            'pointage_start_hour' => '10:00:00',
            'heure_debut' => '10:30:00',
            'heure_fin' => '12:30:00',
            'tolerance' => '00:15:00',
            'etablissement_id' => 1,
            'promotion_id' => 1,
            'type_cours_id' => 1,
            'salle_id' => 1,
            'option_id' => 1,
            'ville_id' => 1,
            'annee_universitaire' => '2023-2024'
        ]);

        // Attacher des groupes aux cours (si des groupes existent)
        if (\App\Models\Group::count() > 0) {
            $groups = \App\Models\Group::take(2)->pluck('id')->toArray();
            $cours1->groups()->attach($groups);
            $cours2->groups()->attach($groups);
        }
    }
}