<?php

// Charger l'autoloader de Laravel
require_once __DIR__ . '/vendor/autoload.php';

// Démarrer l'application Laravel
$app = require_once __DIR__ . '/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

use App\Models\Cours;

try {
    // Créer un cours de test
    $cours = Cours::create([
        'name' => 'Mathématiques - Analyse 1',
        'date' => '2024-01-15',
        'pointage_start_hour' => '08:00:00',
        'heure_debut' => '08:30:00',
        'heure_fin' => '10:30:00',
        'tolerance' => '00:15:00',
        'etablissement_id' => 1,
        'promotion_id' => 1,
        'type_cours_id' => 1,
        'salle_id' => 1,
        'option_id' => 1,
        'annee_universitaire' => '2023-2024',
        'statut_temporel' => 'futur'
    ]);

    echo "Cours créé avec succès !\n";
    echo "ID: " . $cours->id . "\n";
    echo "Nom: " . $cours->name . "\n";
    echo "Date: " . $cours->date . "\n";

} catch (Exception $e) {
    echo "Erreur lors de la création du cours: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
























