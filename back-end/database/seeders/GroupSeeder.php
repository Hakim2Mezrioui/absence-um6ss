<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Groupe 1 - Médecine 1ère année
        \App\Models\Group::create([
            'title' => 'Groupe A - Médecine 1ère année',
            'promotion_id' => 1, // Assurez-vous que cette promotion existe
            'etablissement_id' => 1, // FACULTÉ MOHAMMED VI DE MÉDECINE UM6SS
            'ville_id' => 1, // Casablanca
        ]);

        // Groupe 2 - Médecine 1ère année
        \App\Models\Group::create([
            'title' => 'Groupe B - Médecine 1ère année',
            'promotion_id' => 1, // Assurez-vous que cette promotion existe
            'etablissement_id' => 1, // FACULTÉ MOHAMMED VI DE MÉDECINE UM6SS
            'ville_id' => 1, // Casablanca
        ]);

        // Groupe 3 - Pharmacie 1ère année
        \App\Models\Group::create([
            'title' => 'Groupe A - Pharmacie 1ère année',
            'promotion_id' => 1, // Assurez-vous que cette promotion existe
            'etablissement_id' => 4, // FACULTÉ MOHAMMED VI DE PHARMACIE UM6SS
            'ville_id' => 1, // Casablanca
        ]);

        // Groupe 4 - Médecine Dentaire 1ère année
        \App\Models\Group::create([
            'title' => 'Groupe A - Médecine Dentaire 1ère année',
            'promotion_id' => 1, // Assurez-vous que cette promotion existe
            'etablissement_id' => 3, // FACULTÉ MOHAMMED VI DE MÉDECINE DENTAIRE UM6SS
            'ville_id' => 1, // Casablanca
        ]);

        // Groupe 5 - Médecine Vétérinaire 1ère année
        \App\Models\Group::create([
            'title' => 'Groupe A - Médecine Vétérinaire 1ère année',
            'promotion_id' => 1, // Assurez-vous que cette promotion existe
            'etablissement_id' => 5, // ECOLE MOHAMMED VI DE MÉDECINE VÉTÉRINAIRE UM6SS
            'ville_id' => 1, // Casablanca
        ]);
    }
}
