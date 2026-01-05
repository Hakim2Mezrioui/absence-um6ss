<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     * Supprime le rôle "Affichage Public" (ID 7) de la base de données
     */
    public function up(): void
    {
        // Supprimer le rôle "Affichage Public" (ID 7 ou par nom)
        DB::table('roles')
            ->where('id', 7)
            ->orWhere('name', 'Affichage Public')
            ->orWhere('name', 'affichage-public')
            ->delete();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Recréer le rôle "Affichage Public" si nécessaire
        // Note: L'ID peut être différent si d'autres rôles ont été créés entre-temps
        if (!DB::table('roles')->where('name', 'Affichage Public')->exists()) {
            DB::table('roles')->insert([
                'name' => 'Affichage Public',
                'created_at' => now(),
                'updated_at' => now()
            ]);
        }
    }
};
