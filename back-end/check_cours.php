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

try {
    // Vérifier si des cours existent
    $cours = Capsule::table('cours')->get();
    
    echo "Nombre de cours dans la base de données: " . count($cours) . "\n";
    
    if (count($cours) > 0) {
        echo "Premier cours:\n";
        $premierCours = $cours->first();
        echo "ID: " . $premierCours->id . "\n";
        echo "Nom: " . $premierCours->name . "\n";
        echo "Date: " . $premierCours->date . "\n";
    } else {
        echo "Aucun cours trouvé dans la base de données.\n";
    }

} catch (Exception $e) {
    echo "Erreur: " . $e->getMessage() . "\n";
}























