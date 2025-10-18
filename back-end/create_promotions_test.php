<?php
// Script pour créer des promotions de test
require_once 'vendor/autoload.php';

use App\Models\Promotion;

// Charger l'application Laravel
$app = require_once 'bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

echo "=== Création des promotions de test ===\n";

$promotions = [
    ['name' => '1ère année'],
    ['name' => '2ème année'],
    ['name' => '3ème année'],
    ['name' => '4ème année'],
    ['name' => '5ème année'],
    ['name' => '6ème année']
];

foreach ($promotions as $promotionData) {
    try {
        $promotion = Promotion::create($promotionData);
        echo "✅ Promotion créée: {$promotion->name} (ID: {$promotion->id})\n";
    } catch (Exception $e) {
        echo "❌ Erreur pour {$promotionData['name']}: " . $e->getMessage() . "\n";
    }
}

echo "\n=== Création terminée ===\n";
