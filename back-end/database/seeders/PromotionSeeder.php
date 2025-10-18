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
        // Vérifier si des promotions existent déjà
        if (\App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->count() > 0) {
            $this->command->info("ℹ️  Des promotions existent déjà. Le seeder sera ignoré.");
            return;
        }

        // Bypasser le UserContextScope pour créer les promotions
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '1ère année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '2ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '3ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '4ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '5ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => '6ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => 'LIC 1ère année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => 'LIC 2ème année']);
        \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->create(['name' => 'LIC 3ème année']);

        $this->command->info("✅ 9 promotions ont été créées avec succès !");
    }
}
