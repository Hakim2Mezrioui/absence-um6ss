<?php

namespace Tests\Feature;

use Tests\TestCase;
use App\Models\Group;
use App\Models\Etudiant;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\Ville;
use App\Services\GroupService;
use Illuminate\Foundation\Testing\RefreshDatabase;

class GroupTest extends TestCase
{
    use RefreshDatabase;

    protected $groupService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->groupService = new GroupService();
    }

    /** @test */
    public function it_can_create_a_group()
    {
        // Arrange
        $etablissement = Etablissement::factory()->create();
        $promotion = Promotion::factory()->create();
        $ville = Ville::factory()->create();

        $groupData = [
            'title' => 'Test Group',
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville->id,
        ];

        // Act
        $group = $this->groupService->createGroup($groupData);

        // Assert
        $this->assertInstanceOf(Group::class, $group);
        $this->assertEquals('Test Group', $group->title);
        $this->assertEquals($etablissement->id, $group->etablissement_id);
    }

    /** @test */
    public function it_can_get_all_groups()
    {
        // Arrange
        $etablissement = Etablissement::factory()->create();
        $promotion = Promotion::factory()->create();
        $ville = Ville::factory()->create();

        Group::factory()->count(3)->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville->id,
        ]);

        // Act
        $groups = $this->groupService->getAllGroups();

        // Assert
        $this->assertCount(3, $groups);
    }

    /** @test */
    public function it_can_add_students_to_group()
    {
        // Arrange
        $etablissement = Etablissement::factory()->create();
        $promotion = Promotion::factory()->create();
        $ville = Ville::factory()->create();

        $group = Group::factory()->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville->id,
        ]);

        $students = Etudiant::factory()->count(3)->create([
            'etablissement_id' => $etablissement->id,
        ]);

        $studentIds = $students->pluck('matricule')->toArray();

        // Act
        $result = $this->groupService->addStudentsToGroup($group->id, $studentIds);

        // Assert
        $this->assertTrue($result);
        $this->assertCount(3, $group->fresh()->etudiants);
    }

    /** @test */
    public function it_can_get_groups_by_etablissement()
    {
        // Arrange
        $etablissement1 = Etablissement::factory()->create();
        $etablissement2 = Etablissement::factory()->create();
        $promotion = Promotion::factory()->create();
        $ville = Ville::factory()->create();

        Group::factory()->count(2)->create([
            'etablissement_id' => $etablissement1->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville->id,
        ]);

        Group::factory()->count(1)->create([
            'etablissement_id' => $etablissement2->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville->id,
        ]);

        // Act
        $groups = $this->groupService->getGroupsByEtablissement($etablissement1->id);

        // Assert
        $this->assertCount(2, $groups);
        $groups->each(function ($group) use ($etablissement1) {
            $this->assertEquals($etablissement1->id, $group->etablissement_id);
        });
    }

    /** @test */
    public function it_can_get_groups_by_promotion()
    {
        // Arrange
        $etablissement = Etablissement::factory()->create();
        $promotion1 = Promotion::factory()->create();
        $promotion2 = Promotion::factory()->create();
        $ville = Ville::factory()->create();

        Group::factory()->count(2)->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion1->id,
            'ville_id' => $ville->id,
        ]);

        Group::factory()->count(1)->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion2->id,
            'ville_id' => $ville->id,
        ]);

        // Act
        $groups = $this->groupService->getGroupsByPromotion($promotion1->id);

        // Assert
        $this->assertCount(2, $groups);
        $groups->each(function ($group) use ($promotion1) {
            $this->assertEquals($promotion1->id, $group->promotion_id);
        });
    }

    /** @test */
    public function it_can_get_groups_by_ville()
    {
        // Arrange
        $etablissement = Etablissement::factory()->create();
        $promotion = Promotion::factory()->create();
        $ville1 = Ville::factory()->create();
        $ville2 = Ville::factory()->create();

        Group::factory()->count(2)->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville1->id,
        ]);

        Group::factory()->count(1)->create([
            'etablissement_id' => $etablissement->id,
            'promotion_id' => $promotion->id,
            'ville_id' => $ville2->id,
        ]);

        // Act
        $groups = $this->groupService->getGroupsByVille($ville1->id);

        // Assert
        $this->assertCount(2, $groups);
        $groups->each(function ($group) use ($ville1) {
            $this->assertEquals($ville1->id, $group->ville_id);
        });
    }
}
