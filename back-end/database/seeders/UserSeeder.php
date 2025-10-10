<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use App\Models\Role;
use App\Models\Post;
use App\Models\Etablissement;
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
        $posts = Post::pluck('id')->toArray();
        $etablissements = Etablissement::pluck('id')->toArray();

        // Vérifier que les tables de référence ont des données
        if (empty($roles) || empty($posts)) {
            $this->command->warn('Certaines tables de référence sont vides. Veuillez exécuter leurs seeders d\'abord.');
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
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Driss',
                'last_name' => 'Charai',
                'email' => 'dcharai@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[0], // Deuxième rôle ou premier si pas assez
                'post_id' => $posts[1] ?? $posts[0], // Deuxième poste ou premier si pas assez
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Youssef',
                'last_name' => 'Alkandry',
                'email' => 'yalkandry@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[2] ?? $roles[0],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Mohamed Taoufik',
                'last_name' => 'Abdennacer',
                'email' => 'mtabdennacer@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[0],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Anas',
                'last_name' => 'Oudadsse',
                'email' => 'aoudadsse@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[0] ?? $roles[0],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Salma',
                'last_name' => 'Lamsahel',
                'email' => 'slamsahel@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[1] ?? $roles[4],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Jamila',
                'last_name' => 'Embarek',
                'email' => 'jembarek@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[5] ?? $roles[0],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Lhoussaine',
                'last_name' => 'balouch',
                'email' => 'lbalaouch@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[3] ?? $roles[0],
                'ville_id' => 0,
            ],
            [
                'first_name' => 'Hicham',
                'last_name' => 'Benyoussef',
                'email' => 'hbenyoussef@um6ss.ma',
                'password' => Hash::make('UM6SS@2025'),
                'role_id' => $roles[3] ?? $roles[0],
                'ville_id' => 0,
            ]
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        $this->command->info('UserSeeder exécuté avec succès. ' . count($users) . ' utilisateurs créés.');
    }
}