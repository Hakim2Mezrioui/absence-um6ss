<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('examens', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->date('date');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->time('heure_debut_poigntage');
            $table->foreignId('option_id')->nullable()->constrained('options')->onDelete('cascade');
            $table->foreignId('salle_id')->constrained('salles')->onDelete('cascade');
            $table->foreignId('promotion_id')->constrained('promotions')->onDelete('cascade');
            $table->foreignId('type_examen_id')->constrained('types_examen')->onDelete('cascade');
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->string('annee_universitaire')->comment('Format: YYYY-YYYY (ex: 2024-2025)');
            $table->enum('statut_temporel', ['passé', 'en_cours', 'futur'])->default('futur');
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('examens');
    }
}; 