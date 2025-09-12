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
            $table->integer('tolerance')->default(5)->comment('Tolérance en minutes pour les retards');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rattrapages', function (Blueprint $table) {
            $table->dropColumn('tolerance');
        });
    }
};
