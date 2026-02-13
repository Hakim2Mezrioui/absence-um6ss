<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Colonne enseignant_name : accepte n'importe quelle valeur saisie sans vérification en base.
     */
    public function up(): void
    {
        Schema::table('cours', function (Blueprint $table) {
            $table->string('enseignant_name')->nullable()->after('enseignant_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cours', function (Blueprint $table) {
            $table->dropColumn('enseignant_name');
        });
    }
};
