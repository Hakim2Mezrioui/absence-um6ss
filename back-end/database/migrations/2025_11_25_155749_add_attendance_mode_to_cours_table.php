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
        Schema::table('cours', function (Blueprint $table) {
            $table->enum('attendance_mode', ['normal', 'bicheck'])->default('normal')->after('tolerance');
            $table->unsignedSmallInteger('exit_capture_window')->default(0)->comment('Fenêtre de capture en minutes après heure_fin pour le mode bicheck')->after('attendance_mode');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('cours', function (Blueprint $table) {
            $table->dropColumn(['attendance_mode', 'exit_capture_window']);
        });
    }
};
