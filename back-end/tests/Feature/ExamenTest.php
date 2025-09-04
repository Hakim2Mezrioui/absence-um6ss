<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Examen;
use App\Models\Group;
use App\Models\Ville;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\TypeExamen;
use App\Models\Salle;
use App\Models\Option;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ExamenTest extends TestCase
{
    use RefreshDatabase;

    public function test_examen_can_be_created_with_group_and_ville()
    {
        // Créer les données de test en utilisant les seeders
        $this->seed([
            \Database\Seeders\VilleSeeder::class,
            \Database\Seeders\EtablissementSeeder::class,
            \Database\Seeders\PromotionSeeder::class,
            \Database\Seeders\TypeExamenSeeder::class,
            \Database\Seeders\SalleSeeder::class,
            \Database\Seeders\OptionSeeder::class,
            \Database\Seeders\GroupSeeder::class,
        ]);

        // Récupérer les premières données disponibles
        $group = Group::first();
        $ville = Ville::first();
        $etablissement = Etablissement::first();
        $promotion = Promotion::first();
        $typeExamen = TypeExamen::first();
        $salle = Salle::first();
        $option = Option::first();

        $this->assertNotNull($group, 'Group should exist');
        $this->assertNotNull($ville, 'Ville should exist');
        $this->assertNotNull($etablissement, 'Etablissement should exist');
        $this->assertNotNull($promotion, 'Promotion should exist');
        $this->assertNotNull($typeExamen, 'TypeExamen should exist');
        $this->assertNotNull($salle, 'Salle should exist');
        $this->assertNotNull($option, 'Option should exist');

        $examenData = [
            'title' => 'Test Examen',
            'date' => '2025-01-15',
            'heure_debut' => '09:00:00',
            'heure_fin' => '11:00:00',
            'annee_universitaire' => '2024-2025',
            'group_id' => $group->id,
            'ville_id' => $ville->id,
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'type_examen_id' => $typeExamen->id,
            'salle_id' => $salle->id,
            'option_id' => $option->id,
        ];

        $examen = Examen::create($examenData);

        $this->assertDatabaseHas('examens', [
            'id' => $examen->id,
            'group_id' => $group->id,
            'ville_id' => $ville->id,
        ]);

        // Vérifier les relations
        $this->assertEquals($group->id, $examen->group->id);
        $this->assertEquals($ville->id, $examen->ville->id);
    }

    public function test_examen_requires_group_and_ville()
    {
        $this->expectException(\Illuminate\Database\QueryException::class);

        Examen::create([
            'title' => 'Test Examen',
            'date' => '2025-01-15',
            'heure_debut' => '09:00:00',
            'heure_fin' => '11:00:00',
            'annee_universitaire' => '2024-2025',
            // group_id et ville_id manquants
            'etablissement_id' => 1,
            'promotion_id' => 1,
            'type_examen_id' => 1,
            'salle_id' => 1,
        ]);
    }
}
