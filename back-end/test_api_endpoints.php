<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as DB;
use App\Models\Etudiant;
use App\Models\User;

// Configuration de la base de données
$capsule = new DB;
$capsule->addConnection([
    'driver' => 'sqlite',
    'database' => __DIR__ . '/database/database.sqlite',
    'prefix' => '',
]);
$capsule->setAsGlobal();
$capsule->bootEloquent();

echo "=== TEST DES ENDPOINTS API ===\n\n";

// Test 1: Compter les étudiants sans filtres
echo "1. Test sans filtres (global scope désactivé):\n";
$countWithoutScope = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->count();
echo "   - Nombre d'étudiants: {$countWithoutScope}\n";

if ($countWithoutScope > 0) {
    $sample = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->first();
    echo "   - Premier étudiant: {$sample->first_name} {$sample->last_name}\n";
    echo "   - Ville: {$sample->ville_id}, Établissement: {$sample->etablissement_id}\n";
}

// Test 2: Compter avec le global scope
echo "\n2. Test avec global scope:\n";
$countWithScope = Etudiant::count();
echo "   - Nombre d'étudiants: {$countWithScope}\n";

// Test 3: Simuler un utilisateur connecté
echo "\n3. Test avec contexte utilisateur simulé:\n";
$users = User::all();
foreach ($users as $user) {
    echo "   - Utilisateur: {$user->email}\n";
    echo "     Ville: {$user->ville_id}, Établissement: {$user->etablissement_id}\n";
    
    // Simuler l'authentification de cet utilisateur
    auth()->login($user);
    
    $countForUser = Etudiant::count();
    echo "     Étudiants visibles: {$countForUser}\n";
    
    if ($countForUser > 0) {
        $sample = Etudiant::first();
        echo "     Premier étudiant visible: {$sample->first_name} {$sample->last_name}\n";
    }
    
    auth()->logout();
    echo "\n";
}

echo "=== RECOMMANDATIONS ===\n";
if ($countWithoutScope == 0) {
    echo "❌ Aucun étudiant dans la base. Exécutez: php artisan db:seed --class=EtudiantSeeder\n";
} elseif ($countWithScope == 0) {
    echo "⚠️  Des étudiants existent mais ne sont pas visibles avec le contexte utilisateur.\n";
    echo "   Vérifiez que les utilisateurs ont des ville_id et etablissement_id valides.\n";
} else {
    echo "✅ Les étudiants sont visibles avec le contexte utilisateur.\n";
}

echo "\nPour tester l'API:\n";
echo "1. Connectez-vous: POST /api/login\n";
echo "2. Diagnostic: GET /api/diagnostic-etudiants\n";
echo "3. Liste: GET /api/etudiants\n";

