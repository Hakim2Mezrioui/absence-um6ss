<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les IDs des tables de référence
        $roles = Role::pluck('id')->toArray();
        $etablissements = \App\Models\Etablissement::pluck('id')->toArray();

        // Vérifier que les tables de référence ont des données
        if (empty($roles)) {
            $this->command->warn('La table des rôles est vide. Veuillez exécuter RoleSeeder d\'abord.');
            return;
        }

        if (empty($etablissements)) {
            $this->command->warn('La table des établissements est vide. Veuillez exécuter EtablissementSeeder d\'abord.');
            return;
        }

        $users = [
            // Administrateur système
            [
                'first_name' => 'Hakim',
                'last_name' => 'Mezrioui',
                'email' => 'hmezrioui@um6ss.ma',
                'password' => Hash::make('casa012000'),
                'role_id' => $roles[0], // Premier rôle (probablement Admin)
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[0] ?? null, // Premier établissement
            ],
            [
                'first_name' => 'Driss',
                'last_name' => 'Charai',
                'email' => 'dcharai@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[0], // Deuxième rôle ou premier si pas assez
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[1] ?? null, // Deuxième établissement
            ],
            [
                'first_name' => 'Youssef',
                'last_name' => 'Alkandry',
                'email' => 'yalkandry@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[2] ?? $roles[0],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[2] ?? null, // Troisième établissement
            ],
            [
                'first_name' => 'Mohamed Taoufik',
                'last_name' => 'Abdennacer',
                'email' => 'mtabdennacer@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[0],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[3] ?? null, // Quatrième établissement
            ],
            [
                'first_name' => 'Anas',
                'last_name' => 'Oudadsse',
                'email' => 'aoudadsse@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[0] ?? $roles[0],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[0] ?? null, // Premier établissement
            ],
            [
                'first_name' => 'Salma',
                'last_name' => 'Lamsahel',
                'email' => 'slamsahel@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[4],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[1] ?? null, // Deuxième établissement
            ],
            [
                'first_name' => 'Lhoussaine',
                'last_name' => 'balouch',
                'email' => 'lbalaouch@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[3] ?? $roles[0],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[2] ?? null, // Troisième établissement
            ],
            [
                'first_name' => 'Hicham',
                'last_name' => 'Benyoussef',
                'email' => 'hbenyoussef@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[3] ?? $roles[0],
                'ville_id' => 1, // Casablanca
                'etablissement_id' => $etablissements[3] ?? null, // Quatrième établissement
            ]
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        $this->command->info('UserSeeder exécuté avec succès. ' . count($users) . ' utilisateurs créés.');
    }
}