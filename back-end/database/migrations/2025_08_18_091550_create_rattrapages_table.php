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
		// Supprimer la table existante
		Schema::dropIfExists('rattrapages');
		
		// Recréer la table selon le schéma
		Schema::create('rattrapages', function (Blueprint $table) {
			$table->id();
			$table->string('name');
			$table->time('start_hour');
			$table->time('end_hour');
			$table->date('date');
			$table->timestamps();
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