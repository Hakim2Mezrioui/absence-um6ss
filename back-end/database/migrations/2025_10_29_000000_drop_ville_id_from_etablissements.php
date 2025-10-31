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
        // Backfill establishment names to include city for readability when applicable
        try {
            // Only run if column exists
            if (Schema::hasColumn('etablissements', 'ville_id')) {
                DB::statement(
                    "UPDATE etablissements e JOIN villes v ON e.ville_id = v.id " .
                    "SET e.name = CONCAT(e.name, ' — ', v.name) " .
                    "WHERE e.ville_id IS NOT NULL AND e.name NOT LIKE CONCAT('%', ' — ', v.name)")
                ;
            }
        } catch (\Throwable $e) {
            // If backfill fails, continue with schema change to avoid blocking deploy
        }

        if (Schema::hasColumn('etablissements', 'ville_id')) {
            Schema::table('etablissements', function (Blueprint $table) {
                try {
                    $table->dropForeign(['ville_id']);
                } catch (\Throwable $e) {
                    // FK might already be absent; ignore
                }
            });

            Schema::table('etablissements', function (Blueprint $table) {
                if (Schema::hasColumn('etablissements', 'ville_id')) {
                    $table->dropColumn('ville_id');
                }
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasColumn('etablissements', 'ville_id')) {
            Schema::table('etablissements', function (Blueprint $table) {
                $table->unsignedBigInteger('ville_id')->nullable();
                $table->foreign('ville_id')->references('id')->on('villes')->onDelete('cascade');
            });
        }
        // Note: We do not attempt to revert name backfill reliably.
    }
};





