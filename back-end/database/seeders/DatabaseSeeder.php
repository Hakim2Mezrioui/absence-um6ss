<?php

namespace Database\Seeders;

use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        $this->call([
            VilleSeeder::class,
            EtablissementSeeder::class,
            PromotionSeeder::class,
            RoleSeeder::class,
            PostSeeder::class,
            TypeCoursSeeder::class,
            TypeExamenSeeder::class,
            // SalleSeeder::class,
            OptionSeeder::class,
            GroupSeeder::class,        // Déplacé avant ExamenSeeder
            // ExamenSeeder::class,       // Maintenant après GroupSeeder
            // EtudiantSeeder::class,
            // CoursSeeder::class,
            UserSeeder::class,
            EnseignantSeeder::class,
            AbsenceSeeder::class,      // Après ExamenSeeder
            RattrapageSeeder::class,
        ]);
    }
}
