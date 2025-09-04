<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        \App\Models\Promotion::create(['name' => '1ère année']);
        \App\Models\Promotion::create(['name' => '2ème année']);
        \App\Models\Promotion::create(['name' => '3ème année']);
        \App\Models\Promotion::create(['name' => '4ème année']);
        \App\Models\Promotion::create(['name' => '5ème année']);
        \App\Models\Promotion::create(['name' => '6ème année']);
        \App\Models\Promotion::create(['name' => 'LIC 1ère année']);
        \App\Models\Promotion::create(['name' => 'LIC 2ème année']);
        \App\Models\Promotion::create(['name' => 'LIC 3ème année']);
    }
}
