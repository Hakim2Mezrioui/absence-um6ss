<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Option;
use App\Models\Etablissement;

class OptionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Utiliser l'établissement ID 4 pour toutes les options (sauf "Général")
        $etablissementId = 4;
        
        // Vérifier que l'établissement ID 4 existe
        $etablissement = Etablissement::find($etablissementId);
        if (!$etablissement) {
            $this->command->warn("⚠️  L'établissement avec l'ID {$etablissementId} n'existe pas.");
            $this->command->warn('⚠️  Veuillez vérifier que l\'établissement ID 4 existe dans la base de données.');
            return;
        }
        
        $this->command->info("✅ Établissement ID {$etablissementId} trouvé: {$etablissement->name}");
        
        // Utiliser l'établissement ID 4 pour "Général" également
        $generalEtablissementId = 4;

        $options = [
            [
                'name' => 'Generale',
                'description' => 'Formation générale',
                'etablissement_id' => $generalEtablissementId, // "Général" garde le premier établissement
            ],
            [
                'name' => 'LPDN',
                'description' => 'Licence Professionnelle en Diététique Nutrition',
                'etablissement_id' => $etablissementId, // Établissement ID 4
            ],
            [
                'name' => 'LPIAR',
                'description' => 'Licence Professionnelle en Anesthésie et Réanimation',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPIBO',
                'description' => 'Licence Professionnelle en Infirmier du Bloc Opératoire',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPINP',
                'description' => 'Licence Professionnelle en Néonatologie et Pédiatrie',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPIP',
                'description' => 'Licence Professionnelle Infirmier Polyvalent',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPKN',
                'description' => 'Licence Professionnelle en Kinésithérapie',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPOR',
                'description' => 'Licence Professionnelle en Orthophonie',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPOT',
                'description' => 'Licence Professionnelle en Orthoptie',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPPS',
                'description' => 'Licence Professionnelle en Psychomotricité',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPSG',
                'description' => 'Licence Professionnelle en Sage femme',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPTIM',
                'description' => 'Licence Professionnelle Technicien Imagerie Médicale',
                'etablissement_id' => $etablissementId,
            ],
            [
                'name' => 'LPTL',
                'description' => 'Licence Professionnelle Technicien de Laboratoire',
                'etablissement_id' => $etablissementId,
            ]
        ];

        foreach ($options as $option) {
            // Vérifier si l'option existe déjà et la mettre à jour, sinon la créer
            $existingOption = Option::where('name', $option['name'])->first();
            
            if ($existingOption) {
                $existingOption->update([
                    'description' => $option['description'],
                    'etablissement_id' => $option['etablissement_id']
                ]);
                $this->command->info("✅ Option '{$option['name']}' mise à jour (ID: {$existingOption->id})");
            } else {
                Option::create($option);
                $this->command->info("✅ Option '{$option['name']}' créée");
            }
        }

        $this->command->info("✅ " . count($options) . " options ont été traitées avec succès !");
    }
} 