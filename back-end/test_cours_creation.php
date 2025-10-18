<?php
// Script de test pour vérifier la création de cours
require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use App\Models\Cours;
use App\Models\Etablissement;
use App\Models\Promotion;
use App\Models\TypeCours;
use App\Models\Salle;
use App\Models\Ville;

// Charger l'application Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Test de création de cours ===\n";

// Vérifier les données nécessaires
echo "1. Vérification des données de référence...\n";

$etablissement = Etablissement::first();
if (!$etablissement) {
    echo "❌ Aucun établissement trouvé\n";
    exit;
}
echo "✅ Établissement trouvé: {$etablissement->name} (ID: {$etablissement->id})\n";

$promotion = Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)->first();
if (!$promotion) {
    echo "❌ Aucune promotion trouvée\n";
    exit;
}
echo "✅ Promotion trouvée: {$promotion->name} (ID: {$promotion->id})\n";

$typeCours = TypeCours::first();
if (!$typeCours) {
    echo "❌ Aucun type de cours trouvé\n";
    exit;
}
echo "✅ Type de cours trouvé: {$typeCours->name} (ID: {$typeCours->id})\n";

$salle = Salle::withoutGlobalScope(\App\Scopes\UserContextScope::class)->first();
if (!$salle) {
    echo "❌ Aucune salle trouvée\n";
    exit;
}
echo "✅ Salle trouvée: {$salle->name} (ID: {$salle->id})\n";

$ville = Ville::first();
if (!$ville) {
    echo "❌ Aucune ville trouvée\n";
    exit;
}
echo "✅ Ville trouvée: {$ville->name} (ID: {$ville->id})\n";

echo "\n2. Test de création de cours...\n";

try {
    $coursData = [
        'name' => 'Test Cours - ' . date('Y-m-d H:i:s'),
        'date' => '2025-10-20',
        'pointage_start_hour' => '08:00',
        'heure_debut' => '08:30',
        'heure_fin' => '10:30',
        'tolerance' => '00:15',
        'etablissement_id' => $etablissement->id,
        'promotion_id' => $promotion->id,
        'type_cours_id' => $typeCours->id,
        'salle_id' => $salle->id,
        'ville_id' => $ville->id,
        'annee_universitaire' => '2025-2026'
    ];

    echo "Données à créer:\n";
    foreach ($coursData as $key => $value) {
        echo "  - {$key}: {$value}\n";
    }

    $cours = Cours::create($coursData);
    echo "✅ Cours créé avec succès! ID: {$cours->id}\n";
    
    // Charger les relations en contournant le UserContextScope
    $cours->load([
        'etablissement' => function($query) {
            $query->withoutGlobalScope(\App\Scopes\UserContextScope::class);
        },
        'promotion' => function($query) {
            $query->withoutGlobalScope(\App\Scopes\UserContextScope::class);
        },
        'type_cours',
        'salle' => function($query) {
            $query->withoutGlobalScope(\App\Scopes\UserContextScope::class);
        },
        'ville'
    ]);
    
    echo "\n3. Vérification des relations...\n";
    echo "✅ Établissement: {$cours->etablissement->name}\n";
    echo "✅ Promotion: {$cours->promotion->name}\n";
    echo "✅ Type: {$cours->type_cours->name}\n";
    echo "✅ Salle: {$cours->salle->name}\n";
    echo "✅ Ville: {$cours->ville->name}\n";
    
    echo "\n=== Test réussi! ===\n";
    
} catch (Exception $e) {
    echo "❌ Erreur lors de la création: " . $e->getMessage() . "\n";
    echo "Stack trace:\n" . $e->getTraceAsString() . "\n";
}
