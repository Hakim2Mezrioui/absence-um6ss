<?php

require_once __DIR__ . '/vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as DB;
use App\Models\Etudiant;
use App\Models\User;
use App\Models\Ville;
use App\Models\Etablissement;

// Configuration de la base de données
$capsule = new DB;
$capsule->addConnection([
    'driver' => 'sqlite',
    'database' => __DIR__ . '/database/database.sqlite',
    'prefix' => '',
]);
$capsule->setAsGlobal();
$capsule->bootEloquent();

echo "=== DIAGNOSTIC ET CORRECTION DES DONNÉES D'ÉTUDIANTS ===\n\n";

// 1. Vérifier les données existantes
echo "1. Vérification des données existantes:\n";
$totalStudents = Etudiant::count();
echo "   - Total étudiants: {$totalStudents}\n";

if ($totalStudents > 0) {
    $sampleStudent = Etudiant::first();
    echo "   - Premier étudiant: {$sampleStudent->first_name} {$sampleStudent->last_name}\n";
    echo "   - Ville ID: {$sampleStudent->ville_id}\n";
    echo "   - Établissement ID: {$sampleStudent->etablissement_id}\n";
}

// 2. Vérifier les utilisateurs et leur contexte
echo "\n2. Vérification des utilisateurs:\n";
$users = User::all();
foreach ($users as $user) {
    echo "   - {$user->email}: ville_id={$user->ville_id}, etablissement_id={$user->etablissement_id}\n";
}

// 3. Vérifier les villes et établissements
echo "\n3. Vérification des villes et établissements:\n";
$villes = Ville::all();
echo "   - Villes disponibles: " . $villes->pluck('name')->implode(', ') . "\n";

$etablissements = Etablissement::all();
echo "   - Établissements disponibles: " . $etablissements->pluck('name')->implode(', ') . "\n";

// 4. Analyser les problèmes potentiels
echo "\n4. Analyse des problèmes:\n";

if ($totalStudents == 0) {
    echo "   ❌ PROBLÈME: Aucun étudiant trouvé dans la base de données\n";
    echo "   💡 SOLUTION: Exécuter le seeder des étudiants\n";
    echo "   Commande: php artisan db:seed --class=EtudiantSeeder\n";
} else {
    // Vérifier si les étudiants ont des ville_id et etablissement_id valides
    $studentsWithoutVille = Etudiant::whereNull('ville_id')->count();
    $studentsWithoutEtablissement = Etudiant::whereNull('etablissement_id')->count();
    
    if ($studentsWithoutVille > 0) {
        echo "   ⚠️  ATTENTION: {$studentsWithoutVille} étudiants sans ville_id\n";
    }
    
    if ($studentsWithoutEtablissement > 0) {
        echo "   ⚠️  ATTENTION: {$studentsWithoutEtablissement} étudiants sans etablissement_id\n";
    }
    
    // Vérifier les correspondances avec les utilisateurs
    $userVilles = $users->pluck('ville_id')->filter()->unique();
    $userEtablissements = $users->pluck('etablissement_id')->filter()->unique();
    
    $studentVilles = Etudiant::distinct()->pluck('ville_id')->filter();
    $studentEtablissements = Etudiant::distinct()->pluck('etablissement_id')->filter();
    
    $matchingVilles = $userVilles->intersect($studentVilles)->count();
    $matchingEtablissements = $userEtablissements->intersect($studentEtablissements)->count();
    
    if ($matchingVilles == 0) {
        echo "   ❌ PROBLÈME: Aucune correspondance entre les villes des utilisateurs et des étudiants\n";
    } else {
        echo "   ✅ Correspondances villes: {$matchingVilles}\n";
    }
    
    if ($matchingEtablissements == 0) {
        echo "   ❌ PROBLÈME: Aucune correspondance entre les établissements des utilisateurs et des étudiants\n";
    } else {
        echo "   ✅ Correspondances établissements: {$matchingEtablissements}\n";
    }
}

// 5. Proposer des corrections
echo "\n5. Corrections proposées:\n";

if ($totalStudents == 0) {
    echo "   🔧 Exécuter le seeder des étudiants:\n";
    echo "      php artisan db:seed --class=EtudiantSeeder\n";
} else {
    // Si des étudiants existent mais n'ont pas de ville/établissement
    $studentsToFix = Etudiant::where(function($q) {
        $q->whereNull('ville_id')->orWhereNull('etablissement_id');
    })->count();
    
    if ($studentsToFix > 0) {
        echo "   🔧 Corriger les étudiants sans ville/établissement:\n";
        
        // Assigner la première ville disponible
        $firstVille = Ville::first();
        if ($firstVille) {
            Etudiant::whereNull('ville_id')->update(['ville_id' => $firstVille->id]);
            echo "      ✅ Assigné ville_id={$firstVille->id} aux étudiants sans ville\n";
        }
        
        // Assigner le premier établissement disponible
        $firstEtablissement = Etablissement::first();
        if ($firstEtablissement) {
            Etudiant::whereNull('etablissement_id')->update(['etablissement_id' => $firstEtablissement->id]);
            echo "      ✅ Assigné etablissement_id={$firstEtablissement->id} aux étudiants sans établissement\n";
        }
    }
    
    // Vérifier si les utilisateurs ont des contextes valides
    $usersWithoutContext = User::where(function($q) {
        $q->whereNull('ville_id')->orWhereNull('etablissement_id');
    })->count();
    
    if ($usersWithoutContext > 0) {
        echo "   🔧 Corriger les utilisateurs sans contexte:\n";
        
        $firstVille = Ville::first();
        $firstEtablissement = Etablissement::first();
        
        if ($firstVille) {
            User::whereNull('ville_id')->update(['ville_id' => $firstVille->id]);
            echo "      ✅ Assigné ville_id={$firstVille->id} aux utilisateurs sans ville\n";
        }
        
        if ($firstEtablissement) {
            User::whereNull('etablissement_id')->update(['etablissement_id' => $firstEtablissement->id]);
            echo "      ✅ Assigné etablissement_id={$firstEtablissement->id} aux utilisateurs sans établissement\n";
        }
    }
}

echo "\n=== DIAGNOSTIC TERMINÉ ===\n";
echo "Pour tester l'API après correction:\n";
echo "1. Connectez-vous avec un utilisateur\n";
echo "2. Appelez GET /api/diagnostic-etudiants pour vérifier\n";
echo "3. Appelez GET /api/etudiants pour voir la liste\n";

