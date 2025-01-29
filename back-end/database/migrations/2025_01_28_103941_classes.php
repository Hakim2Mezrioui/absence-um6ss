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
    //     Schema::create('classes', function (Blueprint $table) {
    //         $table->id();
    //         $table->timestamps();
    //         $table->string("title");
    //         $table->enum("promotion", ["1ere annee", "2eme annee", "3eme annee", "4eme annee", "5eme annee"]);
    //         $table->string('faculte');
    //     });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Schema::dropIfExists('classes');
    }
};
