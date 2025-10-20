<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Vérifier si la colonne existe déjà
        if (!Schema::hasColumn('enseignants', 'ville_id')) {
            // Get default ville before creating column
            $firstVille = DB::table('villes')->first();
            $defaultVilleId = $firstVille ? $firstVille->id : null;
            
            Schema::table('enseignants', function (Blueprint $table) use ($defaultVilleId) {
                // Add column as nullable initially to allow data population
                $table->unsignedBigInteger('ville_id')->nullable();
                $table->foreign('ville_id')->references('id')->on('villes')->onDelete('cascade');
            });
            
            // Mettre à jour les enregistrements existants avec une valeur par défaut
            if ($defaultVilleId) {
                DB::table('enseignants')
                    ->whereNull('ville_id')
                    ->update(['ville_id' => $defaultVilleId]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('enseignants', function (Blueprint $table) {
            $table->dropForeign(['ville_id']);
            $table->dropColumn('ville_id');
        });
    }
};
