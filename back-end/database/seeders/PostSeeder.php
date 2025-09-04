<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class PostSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $posts = [
            [
                'name' => 'Doyen',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Technicien SI',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Chef de Projet',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Étudiant',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Scolarité',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'name' => 'Enseignant',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        DB::table('posts')->insert($posts);
    }
}
