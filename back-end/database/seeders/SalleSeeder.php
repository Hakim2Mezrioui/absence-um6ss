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
        // Récupérer tous les établissements de Casablanca
        $etablissements = \App\Models\Etablissement::where('ville_id', 1)->pluck('id')->toArray();
        
        if (empty($etablissements)) {
            $this->command->warn('Aucun établissement trouvé pour Casablanca. Veuillez exécuter EtablissementSeeder d\'abord.');
            return;
        }

        // Salles de base à créer pour chaque établissement
        $sallesTemplate = [
            ['name' => 'C501', 'capacite' => 50, 'etage' => 5, 'batiment' => 'C'],
            ['name' => 'C506', 'capacite' => 50, 'etage' => 5, 'batiment' => 'C'],
            ['name' => 'C502', 'capacite' => 50, 'etage' => 5, 'batiment' => 'C'],
            ['name' => 'C504', 'capacite' => 50, 'etage' => 5, 'batiment' => 'C'],
            ['name' => 'C401', 'capacite' => 50, 'etage' => 4, 'batiment' => 'C'],
            ['name' => 'C402', 'capacite' => 50, 'etage' => 4, 'batiment' => 'C'],
            ['name' => 'C301', 'capacite' => 50, 'etage' => 3, 'batiment' => 'C'],
            ['name' => 'C302', 'capacite' => 50, 'etage' => 3, 'batiment' => 'C'],
            ['name' => 'C201', 'capacite' => 50, 'etage' => 2, 'batiment' => 'C'],
            ['name' => 'C202', 'capacite' => 50, 'etage' => 2, 'batiment' => 'C'],
            ['name' => 'C101', 'capacite' => 50, 'etage' => 1, 'batiment' => 'C'],
            ['name' => 'Amphi A', 'capacite' => 200, 'etage' => 0, 'batiment' => 'A'],
        ];

        // Créer des salles pour chaque établissement
        foreach ($etablissements as $etablissementId) {
            foreach ($sallesTemplate as $salleTemplate) {
                \App\Models\Salle::create([
                    'name' => $salleTemplate['name'],
                    'capacite' => $salleTemplate['capacite'],
                    'etage' => $salleTemplate['etage'],
                    'batiment' => $salleTemplate['batiment'],
                    'etablissement_id' => $etablissementId,
                    'ville_id' => 1,
                ]);
            }
        }

        $totalSalles = count($etablissements) * count($sallesTemplate);
        $this->command->info("SalleSeeder exécuté avec succès. {$totalSalles} salles créées pour " . count($etablissements) . " établissement(s).");
    }
}
