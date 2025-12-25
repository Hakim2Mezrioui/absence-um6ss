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
        Schema::table('rattrapages', function (Blueprint $table) {
            $table->unsignedBigInteger('ville_id')->nullable()->after('tolerance');
            $table->unsignedBigInteger('etablissement_id')->nullable()->after('ville_id');
            $table->unsignedBigInteger('salle_id')->nullable()->after('etablissement_id');
            $table->foreign('ville_id')->references('id')->on('villes')->onDelete('set null');
            $table->foreign('etablissement_id')->references('id')->on('etablissements')->onDelete('set null');
            $table->foreign('salle_id')->references('id')->on('salles')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rattrapages', function (Blueprint $table) {
            $table->dropForeign(['salle_id']);
            $table->dropForeign(['etablissement_id']);
            $table->dropForeign(['ville_id']);
            $table->dropColumn('salle_id');
            $table->dropColumn('etablissement_id');
            $table->dropColumn('ville_id');
        });
    }
};
