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
        // Supprimer l'ancienne table si elle existe
        Schema::dropIfExists('attendance_rapide');
        
        // Créer la nouvelle structure normalisée
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
            
            // Configuration session
            $table->date('date');
            $table->time('heure_debut');
            $table->time('heure_fin');
            
            // Résultat présence
            $table->enum('status', ['pending', 'present', 'absent'])->default('pending');
            $table->json('punches')->nullable();
            
            $table->timestamps();
            
            // Index pour performance
            $table->index(['etablissement_id', 'date']);
            $table->index('matricule');
            $table->index('status');
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
