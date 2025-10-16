<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Etudiant;
use App\Models\User;

echo "=== DEBUG DU GLOBAL SCOPE ===\n\n";

// Test 1: Sans authentification
echo "1. Test sans authentification:\n";
echo "   Auth::check(): " . (Auth::check() ? 'true' : 'false') . "\n";
$count = Etudiant::count();
echo "   Étudiants visibles: {$count}\n";

// Test 2: Avec authentification
echo "\n2. Test avec authentification:\n";
$user = User::first();
echo "   Utilisateur: {$user->email}\n";
echo "   Role ID: {$user->role_id}\n";
echo "   Ville ID: {$user->ville_id}\n";
echo "   Établissement ID: {$user->etablissement_id}\n";

auth()->login($user);

echo "   Auth::check(): " . (Auth::check() ? 'true' : 'false') . "\n";
$count = Etudiant::count();
echo "   Étudiants visibles: {$count}\n";

// Test 3: Vérifier les rôles
echo "\n3. Vérification des rôles:\n";
$users = User::all();
foreach ($users as $u) {
    $isSuperAdmin = ($u->role_id == 1 || $u->role === 'super-admin');
    echo "   {$u->email}: role_id={$u->role_id}, super-admin=" . ($isSuperAdmin ? 'OUI' : 'NON') . "\n";
}

auth()->logout();

// Test 4: Vérifier la structure de la table
echo "\n4. Structure de la table etudiants:\n";
$columns = \Illuminate\Support\Facades\Schema::getColumnListing('etudiants');
echo "   Colonnes: " . implode(', ', $columns) . "\n";

echo "\n=== SOLUTION PROPOSÉE ===\n";
echo "Le problème semble être que le scope ne bloque pas l'accès sans authentification.\n";
echo "Modifions le scope pour être plus strict.\n";
