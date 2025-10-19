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
            Schema::table('enseignants', function (Blueprint $table) {
                $table->unsignedBigInteger('ville_id')->nullable();
            });
            
            // Mettre à jour les enregistrements existants avec une valeur par défaut
            $firstVille = DB::table('villes')->first();
            if ($firstVille) {
                DB::table('enseignants')->update(['ville_id' => $firstVille->id]);
            }
            
            // Ajouter la contrainte de clé étrangère
            Schema::table('enseignants', function (Blueprint $table) {
                $table->foreign('ville_id')->references('id')->on('villes')->onDelete('cascade');
                $table->change('ville_id')->nullable(false);
            });
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
