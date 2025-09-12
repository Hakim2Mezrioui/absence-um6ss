<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Rattrapage;
use App\Models\ListStudent;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class RattrapageSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Désactiver temporairement la vérification des clés étrangères
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        
        // Supprimer les données existantes
        Rattrapage::truncate();
        
        // Réactiver la vérification des clés étrangères
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        // Données d'exemple pour les rattrapages
        $rattrapages = [
            [
                'name' => 'Rattrapage Mathématiques - Algèbre',
                'pointage_start_hour' => '08:30:00',
                'start_hour' => '09:00:00',
                'end_hour' => '11:00:00',
                'date' => Carbon::now()->addDays(2)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Physique - Mécanique',
                'pointage_start_hour' => '13:30:00',
                'start_hour' => '14:00:00',
                'end_hour' => '16:00:00',
                'date' => Carbon::now()->addDays(2)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Chimie - Organique',
                'pointage_start_hour' => '08:30:00',
                'start_hour' => '09:00:00',
                'end_hour' => '12:00:00',
                'date' => Carbon::now()->addDays(3)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Biologie - Cellulaire',
                'pointage_start_hour' => '12:30:00',
                'start_hour' => '13:00:00',
                'end_hour' => '15:00:00',
                'date' => Carbon::now()->addDays(3)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Anglais - Grammaire',
                'pointage_start_hour' => '09:30:00',
                'start_hour' => '10:00:00',
                'end_hour' => '11:30:00',
                'date' => Carbon::now()->addDays(4)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Informatique - Programmation',
                'pointage_start_hour' => '14:30:00',
                'start_hour' => '15:00:00',
                'end_hour' => '17:00:00',
                'date' => Carbon::now()->addDays(4)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Statistiques - Probabilités',
                'pointage_start_hour' => '08:00:00',
                'start_hour' => '08:30:00',
                'end_hour' => '10:30:00',
                'date' => Carbon::now()->addDays(5)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Histoire - Contemporaine',
                'pointage_start_hour' => '10:30:00',
                'start_hour' => '11:00:00',
                'end_hour' => '12:30:00',
                'date' => Carbon::now()->addDays(5)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Philosophie - Logique',
                'pointage_start_hour' => '14:00:00',
                'start_hour' => '14:30:00',
                'end_hour' => '16:30:00',
                'date' => Carbon::now()->addDays(6)->format('Y-m-d')
            ],
            [
                'name' => 'Rattrapage Géographie - Économique',
                'pointage_start_hour' => '09:00:00',
                'start_hour' => '09:30:00',
                'end_hour' => '11:00:00',
                'date' => Carbon::now()->addDays(6)->format('Y-m-d')
            ]
        ];

        // Créer les rattrapages
        foreach ($rattrapages as $rattrapageData) {
            Rattrapage::create($rattrapageData);
        }

        $this->command->info('RattrapageSeeder: ' . count($rattrapages) . ' rattrapages créés avec succès.');
    }
} 