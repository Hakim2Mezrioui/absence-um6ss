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
        Schema::create('rattrapage_salle', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rattrapage_id')->constrained('rattrapages')->onDelete('cascade');
            $table->foreignId('salle_id')->constrained('salles')->onDelete('cascade');
            $table->timestamps();
            
            // Assurer qu'une même salle n'est pas associée deux fois au même rattrapage
            $table->unique(['rattrapage_id', 'salle_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rattrapage_salle');
    }
};
