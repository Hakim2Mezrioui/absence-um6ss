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
        Schema::create('rattrapages', function (Blueprint $table) {
            $table->timestamps();
            $table->id("matricule");
            $table->string('name');
            $table->enum('promotion', ['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee']);
            $table->string("faculte");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('rattrapages');
    }
};
