<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Configuration;
use App\Models\Ville;

class ConfigurationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer la première ville disponible ou créer une par défaut
        $ville = Ville::first();
        
        if (!$ville) {
            $ville = Ville::create([
                'nom' => 'Ville par défaut'
            ]);
        }

        // Créer ou mettre à jour la configuration
        Configuration::updateOrCreate(
            ['id' => 1],
            [
                'sqlsrv' => '10.0.2.148',
                'database' => 'BIOSTAR_TA',
                'trustServerCertificate' => 'true',
                'biostar_username' => 'dbuser',
                'biostar_password' => 'Driss@2024',
                'ville_id' => $ville->id
            ]
        );
    }
}
