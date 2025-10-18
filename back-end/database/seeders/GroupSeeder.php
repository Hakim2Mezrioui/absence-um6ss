<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class GroupSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Vérifier si des groupes existent déjà (bypasser le UserContextScope)
        if (\App\Models\Group::withoutGlobalScope(\App\Scopes\UserContextScope::class)->count() > 0) {
            $this->command->info("ℹ️  Des groupes existent déjà. Le seeder sera ignoré.");
            return;
        }

        $groups = [];
        
        // Créer 20 groupes globaux (1 à 20)
        for ($i = 1; $i <= 20; $i++) {
            $groups[] = [
                'title' => "Groupe $i",
            ];
        }

        foreach ($groups as $group) {
            \App\Models\Group::create($group);
        }

        $this->command->info("✅ " . count($groups) . " groupes globaux ont été créés avec succès !");
        $this->command->info("📊 Groupes créés:");
        foreach ($groups as $group) {
            $this->command->info("   - {$group['title']}");
        }
    }
}
