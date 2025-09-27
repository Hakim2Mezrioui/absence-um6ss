<?php

require_once 'vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as Capsule;

// Configuration de la base de données
$capsule = new Capsule;
$capsule->addConnection([
    'driver' => 'sqlite',
    'database' => __DIR__ . '/database/database.sqlite',
    'prefix' => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

// Importer les modèles
require_once 'app/Models/Cours.php';

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

    echo "Cours créé avec succès ! ID: " . $cours->id . "\n";
    echo "Nom: " . $cours->name . "\n";
    echo "Date: " . $cours->date . "\n";
    echo "Heure début: " . $cours->heure_debut . "\n";
    echo "Heure fin: " . $cours->heure_fin . "\n";

} catch (Exception $e) {
    echo "Erreur lors de la création du cours: " . $e->getMessage() . "\n";
}










