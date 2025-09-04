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
        if (empty($roles) || empty($posts) || empty($etablissements)) {
            $this->command->warn('Certaines tables de référence sont vides. Veuillez exécuter leurs seeders d\'abord.');
            return;
        }

        $users = [
            // Administrateur système
            [
                'first_name' => 'Admin',
                'last_name' => 'System',
                'email' => 'admin@um6ss.ma',
                'password' => Hash::make('admin123'),
                'role_id' => $roles[0], // Premier rôle (probablement Admin)
                'post_id' => $posts[0], // Premier poste
                'etablissement_id' => $etablissements[0], // Premier établissement
            ],
            [
                'first_name' => 'Mohammed',
                'last_name' => 'Alaoui',
                'email' => 'm.alaoui@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[1] ?? $roles[0], // Deuxième rôle ou premier si pas assez
                'post_id' => $posts[1] ?? $posts[0], // Deuxième poste ou premier si pas assez
                'etablissement_id' => $etablissements[0],
            ],
            [
                'first_name' => 'Fatima',
                'last_name' => 'Benjelloun',
                'email' => 'f.benjelloun@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[1] ?? $roles[0],
                'post_id' => $posts[2] ?? $posts[0],
                'etablissement_id' => $etablissements[0],
            ],
            [
                'first_name' => 'Ahmed',
                'last_name' => 'Tazi',
                'email' => 'a.tazi@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[2] ?? $roles[0],
                'post_id' => $posts[3] ?? $posts[0],
                'etablissement_id' => $etablissements[0],
            ],
            [
                'first_name' => 'Amina',
                'last_name' => 'El Fassi',
                'email' => 'a.elfassi@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[2] ?? $roles[0],
                'post_id' => $posts[4] ?? $posts[0],
                'etablissement_id' => $etablissements[0],
            ],
            [
                'first_name' => 'Karim',
                'last_name' => 'Bennani',
                'email' => 'k.bennani@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[1] ?? $roles[0],
                'post_id' => $posts[1] ?? $posts[0],
                'etablissement_id' => $etablissements[1] ?? $etablissements[0],
            ],
            [
                'first_name' => 'Sara',
                'last_name' => 'Mouline',
                'email' => 's.mouline@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[1] ?? $roles[0],
                'post_id' => $posts[2] ?? $posts[0],
                'etablissement_id' => $etablissements[1] ?? $etablissements[0],
            ],
            [
                'first_name' => 'Youssef',
                'last_name' => 'Cherkaoui',
                'email' => 'y.cherkaoui@um6ss.ma',
                'password' => Hash::make('password123'),
                'role_id' => $roles[2] ?? $roles[0],
                'post_id' => $posts[3] ?? $posts[0],
                'etablissement_id' => $etablissements[1] ?? $etablissements[0],
            ]
        ];

        foreach ($users as $userData) {
            User::create($userData);
        }

        $this->command->info('UserSeeder exécuté avec succès. ' . count($users) . ' utilisateurs créés.');
    }
} 