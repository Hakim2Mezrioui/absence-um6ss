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
        Schema::create('qr_code_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('cours_id')
                ->nullable()
                ->constrained('cours')
                ->onDelete('cascade');

            $table->foreignId('examen_id')
                ->nullable()
                ->constrained('examens')
                ->onDelete('cascade');

            $table->string('token', 191)->unique();
            $table->dateTime('expires_at');

            $table->foreignId('created_by_user_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->timestamps();

            $table->index(['cours_id', 'examen_id']);
            $table->index('expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('qr_code_sessions');
    }
};


