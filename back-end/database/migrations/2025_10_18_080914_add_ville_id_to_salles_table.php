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
        Schema::table('salles', function (Blueprint $table) {
            // Ajouter la colonne ville_id avec une clé étrangère vers la table villes
            $table->foreignId('ville_id')->nullable()->constrained('villes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salles', function (Blueprint $table) {
            // Supprimer la clé étrangère et la colonne ville_id
            $table->dropForeign(['ville_id']);
            $table->dropColumn('ville_id');
        });
    }
};
