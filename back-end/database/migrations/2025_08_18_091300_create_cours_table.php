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
        // Supprimer la table existante
        Schema::dropIfExists('cours');
        
        // Recréer la table selon le schéma
        Schema::create('cours', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->date('date');
            $table->time('pointage_start_hour');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->time('tolerance');
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('promotion_id')->constrained('promotions')->onDelete('cascade');
            $table->foreignId('type_cours_id')->constrained('types_cours')->onDelete('cascade');
            $table->foreignId('salle_id')->constrained('salles')->onDelete('cascade');
            $table->foreignId('option_id')->nullable()->constrained('options')->onDelete('cascade');
            $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
            $table->string('annee_universitaire')->comment('Format: YYYY-YYYY (ex: 2024-2025)');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cours');
    }
}; 