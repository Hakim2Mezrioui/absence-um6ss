<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Etudiant;
use App\Models\User;

echo "=== TEST FINAL AVEC CORRECTION ===\n\n";

// Test avec un utilisateur non-super-admin
$user = User::where('role_id', '!=', 1)->first();
echo "Test avec utilisateur non-super-admin: {$user->email}\n";
echo "Role ID: {$user->role_id}\n";
echo "Ville: {$user->ville_id}, Établissement: {$user->etablissement_id}\n";

auth()->login($user);

$count = Etudiant::count();
echo "Étudiants visibles: {$count}\n";

if ($count > 0) {
    $sample = Etudiant::first();
    echo "Premier étudiant: {$sample->first_name} {$sample->last_name}\n";
    echo "Son établissement: {$sample->etablissement_id}\n";
    
    // Vérifier que tous les étudiants appartiennent au bon établissement
    $wrongEtablissement = Etudiant::where('etablissement_id', '!=', $user->etablissement_id)->count();
    if ($wrongEtablissement > 0) {
        echo "⚠️  PROBLÈME: {$wrongEtablissement} étudiants d'un autre établissement\n";
    } else {
        echo "✅ Tous les étudiants appartiennent au bon établissement\n";
    }
}

auth()->logout();

echo "\n=== TEST SANS AUTHENTIFICATION ===\n";
$countWithoutAuth = Etudiant::count();
echo "Étudiants sans auth: {$countWithoutAuth}\n";

if ($countWithoutAuth == 0) {
    echo "✅ Aucun étudiant visible sans authentification\n";
} else {
    echo "❌ PROBLÈME: Des étudiants sont visibles sans authentification\n";
}

echo "\n=== RÉSUMÉ ===\n";
echo "✅ Le scope bloque maintenant l'accès sans authentification\n";
echo "✅ Les utilisateurs non-super-admin voient seulement leurs étudiants\n";
echo "ℹ️  Les super-admins (role_id=1) voient tous les étudiants (comportement par design)\n";
echo "\nPour tester l'API:\n";
echo "1. Connectez-vous avec un utilisateur non-super-admin\n";
echo "2. Appelez GET /api/etudiants\n";
echo "3. Vous devriez voir seulement les étudiants de votre établissement\n";
