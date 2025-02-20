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
        Schema::create('cours', function (Blueprint $table) {
            $table->id();
            $table->timestamps();
            $table->string("title");
            $table->date("date");
            $table->time("hour_debut");
            $table->integer("tolerance");
            $table->time("hour_fin");
            $table->string("faculte");
            $table->integer("groupe");
            $table->enum('promotion', ['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee']);
            $table->string("option")->default("");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cours');
    }
};
