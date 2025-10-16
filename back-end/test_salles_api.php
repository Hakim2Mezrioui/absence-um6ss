<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\Salle;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Test de l'API des salles ===\n\n";

// Test 1: Récupération des salles avec le scope normal
echo "1. Salles avec UserContextScope (comportement normal):\n";
try {
    $sallesWithScope = Salle::select('id', 'name', 'etage', 'batiment')->get();
    echo "Nombre de salles trouvées: " . $sallesWithScope->count() . "\n";
    foreach ($sallesWithScope as $salle) {
        echo "  - ID: {$salle->id}, Nom: {$salle->name}, Bâtiment: {$salle->batiment}, Étage: {$salle->etage}\n";
    }
} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 2: Récupération des salles sans le scope
echo "2. Salles sans UserContextScope (comportement corrigé):\n";
try {
    $sallesWithoutScope = Salle::withoutGlobalScope(\App\Scopes\UserContextScope::class)->select('id', 'name', 'etage', 'batiment')->get();
    echo "Nombre de salles trouvées: " . $sallesWithoutScope->count() . "\n";
    foreach ($sallesWithoutScope as $salle) {
        echo "  - ID: {$salle->id}, Nom: {$salle->name}, Bâtiment: {$salle->batiment}, Étage: {$salle->etage}\n";
    }
} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}

echo "\n";

// Test 3: Vérifier s'il y a des salles dans la base
echo "3. Vérification des données en base:\n";
try {
    $totalSalles = DB::table('salles')->count();
    echo "Total des salles en base: " . $totalSalles . "\n";
    
    if ($totalSalles > 0) {
        $sampleSalles = DB::table('salles')->select('id', 'name', 'etage', 'batiment')->limit(5)->get();
        echo "Échantillon de salles:\n";
        foreach ($sampleSalles as $salle) {
            echo "  - ID: {$salle->id}, Nom: {$salle->name}, Bâtiment: {$salle->batiment}, Étage: {$salle->etage}\n";
        }
    } else {
        echo "Aucune salle trouvée en base de données!\n";
    }
} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}

echo "\n=== Fin du test ===\n";
