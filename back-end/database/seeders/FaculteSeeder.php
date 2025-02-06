<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class FaculteSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $ecoles = [
            ['id' => 1, 'name' => 'Pharmacie'],
            ['id' => 2, 'name' => 'medecine'],
            ['id' => 3, 'name' => 'Dentaire'],
            ['id' => 4, 'name' => 'Esgb'],
        ];

        DB::table('facultes')->insert($ecoles);
    }
}
