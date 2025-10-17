<?php

require_once __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Etudiant;
use App\Models\Etablissement;

echo "=== CORRECTION DE LA RÉPARTITION DES ÉTUDIANTS ===\n\n";

// 1. Vérifier la situation actuelle
$etablissements = Etablissement::all();
echo "1. Établissements disponibles:\n";
foreach ($etablissements as $etablissement) {
    $count = Etudiant::where('etablissement_id', $etablissement->id)->count();
    echo "   - ID {$etablissement->id}: {$etablissement->name} ({$count} étudiants)\n";
}

// 2. Répartir les étudiants équitablement
echo "\n2. Répartition des étudiants...\n";
$totalStudents = Etudiant::count();
$etablissementCount = $etablissements->count();
$studentsPerEtablissement = floor($totalStudents / $etablissementCount);

echo "   Total étudiants: {$totalStudents}\n";
echo "   Nombre d'établissements: {$etablissementCount}\n";
echo "   Étudiants par établissement: {$studentsPerEtablissement}\n";

// Répartir les étudiants
$students = Etudiant::all();
$etablissementIndex = 0;

foreach ($students as $index => $student) {
    $etablissementId = $etablissements[$etablissementIndex]->id;
    $student->update(['etablissement_id' => $etablissementId]);
    
    // Passer au prochain établissement
    if (($index + 1) % $studentsPerEtablissement == 0 && $etablissementIndex < $etablissementCount - 1) {
        $etablissementIndex++;
    }
}

// 3. Vérifier la nouvelle répartition
echo "\n3. Nouvelle répartition:\n";
foreach ($etablissements as $etablissement) {
    $count = Etudiant::where('etablissement_id', $etablissement->id)->count();
    echo "   - ID {$etablissement->id}: {$etablissement->name} ({$count} étudiants)\n";
}

echo "\n✅ Répartition terminée !\n";
echo "Maintenant chaque utilisateur devrait voir des étudiants selon son établissement.\n";

