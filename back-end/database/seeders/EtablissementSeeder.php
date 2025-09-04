<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class EtablissementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DE MÉDECINE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'MOHAMMED VI FACULTY OF MEDICINE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DE MÉDECINE DENTAIRE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DE PHARMACIE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'ECOLE MOHAMMED VI DE MÉDECINE VÉTÉRINAIRE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'ECOLE SUPÉRIEURE MOHAMMED VI D\'INGÉNIEURS EN SCIENCES DE LA SANTÉ UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DES SCIENCES INFIRMIÈRES ET PROFESSIONS DE LA SANTÉ UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'ECOLE INTERNATIONALE MOHAMMED VI DE SANTÉ PUBLIQUE UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'INSTITUT SUPÉRIEUR MOHAMMED VI DE BIOSCIENCES ET BIOTECHNOLOGIES UM6SS',
            'ville_id' => 1 // Casablanca
        ]);
    }
}
