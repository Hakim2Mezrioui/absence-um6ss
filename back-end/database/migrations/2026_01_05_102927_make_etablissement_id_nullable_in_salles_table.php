<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Supprime complètement la colonne etablissement_id de la table salles
     */
    public function up(): void
    {
        // Pour MySQL/MariaDB, on doit utiliser DB::statement pour supprimer une colonne avec clé étrangère
        if (DB::getDriverName() === 'mysql') {
            // Supprimer la contrainte de clé étrangère
            DB::statement('ALTER TABLE salles DROP FOREIGN KEY salles_etablissement_id_foreign');
            // Supprimer la colonne
            DB::statement('ALTER TABLE salles DROP COLUMN etablissement_id');
        } else {
            // Pour PostgreSQL et autres SGBD
            Schema::table('salles', function (Blueprint $table) {
                $table->dropForeign(['etablissement_id']);
                $table->dropColumn('etablissement_id');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('salles', function (Blueprint $table) {
            $table->foreignId('etablissement_id')->nullable()->constrained('etablissements')->onDelete('cascade');
        });
    }
};
