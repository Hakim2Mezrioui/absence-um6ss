<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Remove common suffix variants for Casablanca appended to établissement names
        // Handles ' — Casablanca', ' - Casablanca', and uppercase variants
        try {
            DB::statement("UPDATE etablissements SET name = REPLACE(name, ' — Casablanca', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, ' - Casablanca', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, ' — CASABLANCA', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, ' - CASABLANCA', '')");

            // Also handle en-dash and em-dash without leading space edge-cases
            DB::statement("UPDATE etablissements SET name = REPLACE(name, '— Casablanca', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, '- Casablanca', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, '— CASABLANCA', '')");
            DB::statement("UPDATE etablissements SET name = REPLACE(name, '- CASABLANCA', '')");

            // Trim any trailing/leading whitespace left after replacement
            DB::statement("UPDATE etablissements SET name = TRIM(name)");
        } catch (\Throwable $e) {
            // No-op if table/columns not present during some deployments
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Irreversible content clean-up
    }
};


