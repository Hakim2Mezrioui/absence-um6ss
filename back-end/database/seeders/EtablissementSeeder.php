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
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DE MÉDECINE DENTAIRE UM6SS',
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DE PHARMACIE UM6SS',
        ]);
        
        \App\Models\Etablissement::create([
            'name' => 'FACULTÉ MOHAMMED VI DES SCIENCES INFIRMIÈRES ET PROFESSIONS DE LA SANTÉ UM6SS',
        ]);
    }
}
