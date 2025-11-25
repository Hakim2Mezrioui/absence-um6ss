<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Role::create(['name' => 'Defilement']);
        // \App\Models\Role::create(['name' => 'Super Admin']);
        // \App\Models\Role::create(['name' => 'Admin']);
        // \App\Models\Role::create(['name' => 'Scolarité']);
        // \App\Models\Role::create(['name' => 'Doyen']);
        // \App\Models\Role::create(['name' => 'Technicien SI']);
        // \App\Models\Role::create(['name' => 'Enseignant']);
        // \App\Models\Role::create(['name' => 'Affichage Public']);
    }
}
