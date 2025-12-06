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
        Schema::create('qr_code_scans', function (Blueprint $table) {
            $table->id();

            $table->foreignId('qr_code_session_id')
                ->constrained('qr_code_sessions')
                ->onDelete('cascade');

            $table->foreignId('etudiant_id')
                ->constrained('etudiants')
                ->onDelete('cascade');

            $table->dateTime('scanned_at');

            $table->enum('status', ['present', 'invalid', 'duplicate'])
                ->default('present');

            $table->json('meta')->nullable();

            $table->timestamps();

            $table->unique(['qr_code_session_id', 'etudiant_id']);
            $table->index('status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_code_scans');
    }
};


