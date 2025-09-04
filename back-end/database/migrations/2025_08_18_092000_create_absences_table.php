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
        Schema::create('absences', function (Blueprint $table) {
            $table->id();
            $table->string('type_absence');
            $table->foreignId('etudiant_id')->constrained('etudiants')->onDelete('cascade');
            $table->foreignId('cours_id')->nullable()->constrained('cours')->onDelete('cascade');
            $table->foreignId('examen_id')->nullable()->constrained('examens')->onDelete('cascade');
            $table->date('date_absence');
            $table->boolean('justifiee')->default(false);
            $table->text('motif')->nullable();
            $table->string('justificatif')->nullable();
            $table->timestamps();
            
            // Index pour améliorer les performances
            $table->index(['etudiant_id', 'date_absence']);
            $table->index(['cours_id', 'date_absence']);
            $table->index(['examen_id', 'date_absence']);
            $table->index('type_absence');
            $table->index('justifiee');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('absences');
    }
}; 