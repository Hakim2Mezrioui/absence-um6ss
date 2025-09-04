<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Cours;
use App\Models\Examen;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\TypeCours;
use App\Models\TypeExamen;
use App\Models\Salle;
use App\Models\Option;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Carbon\Carbon;

class StatisticControllerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Créer les données de base nécessaires
        $this->etablissement = Etablissement::factory()->create();
        $this->promotion = Promotion::factory()->create();
        $this->typeCours = TypeCours::factory()->create();
        $this->typeExamen = TypeExamen::factory()->create();
        $this->salle = Salle::factory()->create();
        $this->option = Option::factory()->create();
    }

    /** @test */
    public function it_can_get_cours_statistics_with_temporal_status()
    {
        $now = Carbon::now();
        
        // Créer des cours avec différents statuts temporels
        $coursEnCours = Cours::factory()->create([
            'date' => $now->toDateString(),
            'heure_debut' => $now->subHour()->toTimeString(),
            'heure_fin' => $now->addHour()->toTimeString(),
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_cours_id' => $this->typeCours->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $coursEnPasse = Cours::factory()->create([
            'date' => $now->subDay()->toDateString(),
            'heure_debut' => '08:00:00',
            'heure_fin' => '09:00:00',
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_cours_id' => $this->typeCours->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $coursFutur = Cours::factory()->create([
            'date' => $now->addDay()->toDateString(),
            'heure_debut' => '08:00:00',
            'heure_fin' => '09:00:00',
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_cours_id' => $this->typeCours->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $response = $this->getJson('/api/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'cours' => [
                            'total',
                            'par_type',
                            'par_promotion',
                            'par_etablissement',
                            'par_statut_temporel' => [
                                'en_cours',
                                'en_passe',
                                'futur'
                            ]
                        ]
                    ]
                ]);

        $coursStats = $response->json('data.cours');
        $this->assertEquals(3, $coursStats['total']);
        $this->assertEquals(1, $coursStats['par_statut_temporel']['en_cours']);
        $this->assertEquals(1, $coursStats['par_statut_temporel']['en_passe']);
        $this->assertEquals(1, $coursStats['par_statut_temporel']['futur']);
    }

    /** @test */
    public function it_can_get_examen_statistics_with_temporal_status()
    {
        $now = Carbon::now();
        
        // Créer des examens avec différents statuts temporels
        $examenEnCours = Examen::factory()->create([
            'date' => $now->toDateString(),
            'heure_debut' => $now->subHour()->toTimeString(),
            'heure_fin' => $now->addHour()->toTimeString(),
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_examen_id' => $this->typeExamen->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $examenEnPasse = Examen::factory()->create([
            'date' => $now->subDay()->toDateString(),
            'heure_debut' => '08:00:00',
            'heure_fin' => '09:00:00',
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_examen_id' => $this->typeExamen->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $examenFutur = Examen::factory()->create([
            'date' => $now->addDay()->toDateString(),
            'heure_debut' => '08:00:00',
            'heure_fin' => '09:00:00',
            'etablissement_id' => $this->etablissement->id,
            'promotion_id' => $this->promotion->id,
            'type_examen_id' => $this->typeExamen->id,
            'salle_id' => $this->salle->id,
            'option_id' => $this->option->id,
        ]);

        $response = $this->getJson('/api/statistics');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'success',
                    'message',
                    'data' => [
                        'examens' => [
                            'total',
                            'par_type',
                            'par_etablissement',
                            'par_statut_temporel' => [
                                'en_cours',
                                'en_passe',
                                'futur'
                            ]
                        ]
                    ]
                ]);

        $examenStats = $response->json('data.examens');
        $this->assertEquals(3, $examenStats['total']);
        $this->assertEquals(1, $examenStats['par_statut_temporel']['en_cours']);
        $this->assertEquals(1, $examenStats['par_statut_temporel']['en_passe']);
        $this->assertEquals(1, $examenStats['par_statut_temporel']['futur']);
    }
}
