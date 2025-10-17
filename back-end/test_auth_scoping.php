<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Etudiant;
use App\Models\User;

echo "=== TEST AVEC AUTHENTIFICATION RÉELLE ===\n\n";

// Test avec différents utilisateurs
$users = User::all();

foreach ($users as $user) {
    echo "Test avec utilisateur: {$user->email}\n";
    echo "  Ville: {$user->ville_id}, Établissement: {$user->etablissement_id}\n";
    
    // Authentifier l'utilisateur
    auth()->login($user);
    
    // Compter les étudiants visibles
    $count = Etudiant::count();
    echo "  Étudiants visibles: {$count}\n";
    
    if ($count > 0) {
        $sample = Etudiant::first();
        echo "  Premier étudiant: {$sample->first_name} {$sample->last_name}\n";
        echo "  Son établissement: {$sample->etablissement_id}\n";
        
        // Vérifier que tous les étudiants visibles appartiennent au bon établissement
        $wrongEtablissement = Etudiant::where('etablissement_id', '!=', $user->etablissement_id)->count();
        if ($wrongEtablissement > 0) {
            echo "  ⚠️  PROBLÈME: {$wrongEtablissement} étudiants d'un autre établissement sont visibles\n";
        } else {
            echo "  ✅ Tous les étudiants visibles appartiennent au bon établissement\n";
        }
    }
    
    auth()->logout();
    echo "\n";
}

echo "=== TEST SANS AUTHENTIFICATION ===\n";
$countWithoutAuth = Etudiant::count();
echo "Étudiants sans auth: {$countWithoutAuth}\n";

if ($countWithoutAuth > 0) {
    echo "⚠️  PROBLÈME: Des étudiants sont visibles sans authentification\n";
} else {
    echo "✅ Aucun étudiant visible sans authentification\n";
}

