<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Etudiant;
use App\Models\User;
use App\Models\Ville;
use App\Models\Etablissement;

echo "=== DIAGNOSTIC DES ÉTUDIANTS ===\n\n";

// 1. Compter les étudiants
$totalStudents = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->count();
echo "1. Total étudiants dans la DB: {$totalStudents}\n";

if ($totalStudents > 0) {
    $sample = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->first();
    echo "   Premier étudiant: {$sample->first_name} {$sample->last_name}\n";
    echo "   Ville ID: {$sample->ville_id}, Établissement ID: {$sample->etablissement_id}\n";
}

// 2. Vérifier les utilisateurs
echo "\n2. Utilisateurs disponibles:\n";
$users = User::all();
foreach ($users as $user) {
    echo "   - {$user->email}: ville_id={$user->ville_id}, etablissement_id={$user->etablissement_id}\n";
}

// 3. Vérifier les villes et établissements
echo "\n3. Villes disponibles:\n";
$villes = Ville::all();
foreach ($villes as $ville) {
    echo "   - ID {$ville->id}: {$ville->name}\n";
}

echo "\n4. Établissements disponibles:\n";
$etablissements = Etablissement::all();
foreach ($etablissements as $etablissement) {
    echo "   - ID {$etablissement->id}: {$etablissement->name}\n";
}

// 4. Analyser les correspondances
echo "\n5. Analyse des correspondances:\n";
$userVilles = $users->pluck('ville_id')->filter()->unique();
$userEtablissements = $users->pluck('etablissement_id')->filter()->unique();

$studentVilles = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->distinct()->pluck('ville_id')->filter();
$studentEtablissements = Etudiant::withoutGlobalScope(\App\Scopes\UserContextScope::class)->distinct()->pluck('etablissement_id')->filter();

echo "   Villes des utilisateurs: " . $userVilles->implode(', ') . "\n";
echo "   Villes des étudiants: " . $studentVilles->implode(', ') . "\n";
echo "   Établissements des utilisateurs: " . $userEtablissements->implode(', ') . "\n";
echo "   Établissements des étudiants: " . $studentEtablissements->implode(', ') . "\n";

$matchingVilles = $userVilles->intersect($studentVilles);
$matchingEtablissements = $userEtablissements->intersect($studentEtablissements);

echo "   Correspondances villes: " . $matchingVilles->implode(', ') . "\n";
echo "   Correspondances établissements: " . $matchingEtablissements->implode(', ') . "\n";

// 5. Test avec un utilisateur spécifique
echo "\n6. Test avec contexte utilisateur:\n";
if ($users->count() > 0) {
    $testUser = $users->first();
    echo "   Test avec utilisateur: {$testUser->email}\n";
    echo "   Ville: {$testUser->ville_id}, Établissement: {$testUser->etablissement_id}\n";
    
    // Simuler l'authentification
    auth()->login($testUser);
    
    $countWithAuth = Etudiant::count();
    echo "   Étudiants visibles avec auth: {$countWithAuth}\n";
    
    if ($countWithAuth > 0) {
        $visibleStudent = Etudiant::first();
        echo "   Premier étudiant visible: {$visibleStudent->first_name} {$visibleStudent->last_name}\n";
    }
    
    auth()->logout();
}

echo "\n=== RECOMMANDATIONS ===\n";
if ($matchingVilles->isEmpty() || $matchingEtablissements->isEmpty()) {
    echo "❌ PROBLÈME: Aucune correspondance entre les contextes utilisateur et étudiant\n";
    echo "💡 SOLUTION: Mettre à jour les données pour créer des correspondances\n";
} else {
    echo "✅ Des correspondances existent entre utilisateurs et étudiants\n";
}

echo "\nPour tester l'API:\n";
echo "1. Connectez-vous avec un utilisateur\n";
echo "2. Appelez GET /api/diagnostic-etudiants\n";
echo "3. Appelez GET /api/etudiants\n";

