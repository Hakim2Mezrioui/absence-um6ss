<?php
// Script pour vérifier les promotions dans la base de données
require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;

// Charger l'application Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Vérification des promotions ===\n";

try {
    $promotions = DB::table('promotions')->get();
    
    if ($promotions->count() > 0) {
        echo "✅ Promotions trouvées:\n";
        foreach ($promotions as $promotion) {
            echo "  - ID: {$promotion->id}, Name: {$promotion->name}\n";
        }
    } else {
        echo "❌ Aucune promotion trouvée dans la base de données\n";
    }
    
    // Vérifier aussi avec le modèle
    echo "\n=== Test avec le modèle Promotion ===\n";
    $promotionsModel = \App\Models\Promotion::all();
    
    if ($promotionsModel->count() > 0) {
        echo "✅ Promotions trouvées avec le modèle:\n";
        foreach ($promotionsModel as $promotion) {
            echo "  - ID: {$promotion->id}, Name: {$promotion->name}\n";
        }
    } else {
        echo "❌ Aucune promotion trouvée avec le modèle\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}
