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
        Schema::table('absences', function (Blueprint $table) {
            // Vérifier si la colonne n'existe pas déjà
            if (!Schema::hasColumn('absences', 'examen_id')) {
                $table->foreignId('examen_id')->nullable()->constrained('examens')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('absences', function (Blueprint $table) {
            if (Schema::hasColumn('absences', 'examen_id')) {
                $table->dropForeign(['examen_id']);
                $table->dropColumn('examen_id');
            }
        });
    }
};
