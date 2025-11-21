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
        Schema::create('attendance_rapide', function (Blueprint $table) {
            $table->id();
            $table->foreignId('etablissement_id')->constrained('etablissements')->onDelete('cascade');
            $table->date('date');
            $table->time('heure_debut');
            $table->time('heure_fin');
            $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
            $table->json('imported_data'); // Stocke les données importées
            $table->json('attendance_data')->nullable(); // Stocke les résultats de présence après récupération Biostar
            $table->timestamps();
            
            // Index unique sur etablissement_id pour permettre l'écrasement
            $table->unique('etablissement_id');
            $table->index(['ville_id', 'date']);
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
