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
        $ville = Ville::first() ?? Ville::create(['nom' => 'Ville Test']);

        for ($i = 1; $i <= 5; $i++) {
            $user = User::create([
                'first_name' => 'Prof'.$i,
                'last_name' => 'Test',
                'email' => 'prof'.$i.'@example.com',
                'password' => 'password',
                'role_id' => 3,
                'ville_id' => $ville->id,
            ]);

            Enseignant::create([
                'user_id' => $user->id,
                'ville_id' => $ville->id,
            ]);
        }
    }
}


