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
        Schema::create('configuration', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string('sqlsrv')->nullable();
            $table->string('database')->nullable();
            $table->string('trustServerCertificate')->nullable();
            $table->string('biostar_username')->nullable();
            $table->string('biostar_password')->nullable();
            $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('configuration');
    }
};
