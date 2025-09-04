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
        // D'abord, nettoyer les données existantes
        DB::statement("UPDATE salles SET etage = CASE 
            WHEN etage LIKE '%rez%' OR etage LIKE '%0%' THEN 0
            WHEN etage LIKE '%1%' THEN 1
            WHEN etage LIKE '%2%' THEN 2
            WHEN etage LIKE '%3%' THEN 3
            WHEN etage LIKE '%4%' THEN 4
            WHEN etage LIKE '%5%' THEN 5
            ELSE 0
        END WHERE etage NOT REGEXP '^[0-9]+$'");
        
        Schema::table('salles', function (Blueprint $table) {
            // Modifier le type de etage
            $table->integer('etage')->change();
            
            // Ajouter les nouveaux champs s'ils n'existent pas
            if (!Schema::hasColumn('salles', 'capacite')) {
                $table->integer('capacite')->nullable();
            }
            if (!Schema::hasColumn('salles', 'description')) {
                $table->text('description')->nullable();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salles', function (Blueprint $table) {
            // Supprimer les colonnes ajoutées
            if (Schema::hasColumn('salles', 'capacite')) {
                $table->dropColumn('capacite');
            }
            if (Schema::hasColumn('salles', 'description')) {
                $table->dropColumn('description');
            }
            // Note: Revert etage change would require backup of original type
        });
    }
};
