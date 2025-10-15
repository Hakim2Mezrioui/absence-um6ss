<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Models\Enseignant;
use App\Models\Ville;

class EnseignantSeeder extends Seeder
{
    public function run(): void
    {
        // Créer l'enseignant Jamila Embarek
        $user = User::create([
            'first_name' => 'Jamila',
            'last_name' => 'Embarek',
            'email' => 'jembarek@um6ss.ma',
            'password' => Hash::make('UM6SS@2025'),
            'role_id' => 3, // Rôle enseignant
            'ville_id' => 1, // Casablanca
            'etablissement_id' => 1, // FACULTÉ MOHAMMED VI DE MÉDECINE UM6SS
        ]);

        Enseignant::create([
            'user_id' => $user->id,
        ]);

        $this->command->info("✅ Enseignant Jamila Embarek créé avec succès !");
    }
}


