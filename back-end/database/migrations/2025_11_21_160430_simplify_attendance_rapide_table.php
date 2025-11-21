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
        // Supprimer l'ancienne table
        Schema::dropIfExists('attendance_rapide');
        
        // Créer la nouvelle structure SIMPLIFIÉE (sans date, heure, status, punches)
        Schema::create('attendance_rapide', function (Blueprint $table) {
            $table->id();
            
            // Informations étudiant
            $table->string('matricule');
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->nullable();
            
            // Relations (IDs - architecture normalisée)
            $table->foreignId('promotion_id')->constrained('promotions')->onDelete('cascade');
            $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
            $table->foreignId('option_id')->nullable()->constrained('options')->onDelete('cascade');
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
            
            // PAS de: date, heure_debut, heure_fin, status, punches
            // Ces données sont passées en paramètres ou calculées à la volée
            
            $table->timestamps();
            
            // Index pour performance
            $table->index('etablissement_id');
            $table->index('matricule');
            $table->index('promotion_id');
            $table->index('group_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('attendance_rapide');
    }
};
