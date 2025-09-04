<?php

/**
 * Script de migration pour ajouter group_id et ville_id aux examens existants
 * 
 * Ce script doit être exécuté après avoir ajouté les colonnes group_id et ville_id
 * à la table examens via la migration.
 * 
 * Usage: php migrate_existing_examens.php
 */

require_once 'vendor/autoload.php';

use Illuminate\Database\Capsule\Manager as Capsule;

// Configuration de la base de données
$capsule = new Capsule;

$capsule->addConnection([
    'driver'    => 'sqlite',
    'database'  => __DIR__ . '/database/database.sqlite',
    'prefix'    => '',
]);

$capsule->setAsGlobal();
$capsule->bootEloquent();

echo "🚀 Début de la migration des examens existants...\n";

try {
    // Vérifier que les colonnes existent
    $columns = Capsule::select("PRAGMA table_info(examens)");
    $columnNames = array_column($columns, 'name');
    
    if (!in_array('group_id', $columnNames) || !in_array('ville_id', $columnNames)) {
        echo "❌ Les colonnes group_id et ville_id n'existent pas encore.\n";
        echo "Veuillez d'abord exécuter la migration : php artisan migrate\n";
        exit(1);
    }

    // Compter les examens sans group_id ou ville_id
    $count = Capsule::table('examens')
        ->whereNull('group_id')
        ->orWhereNull('ville_id')
        ->count();

    if ($count === 0) {
        echo "✅ Tous les examens ont déjà group_id et ville_id.\n";
        exit(0);
    }

    echo "📊 Nombre d'examens à migrer : $count\n";

    // Récupérer le premier groupe et la première ville disponibles
    $firstGroup = Capsule::table('groups')->first();
    $firstVille = Capsule::table('villes')->first();

    if (!$firstGroup || !$firstVille) {
        echo "❌ Aucun groupe ou ville trouvé dans la base de données.\n";
        echo "Veuillez d'abord exécuter les seeders pour groups et villes.\n";
        exit(1);
    }

    echo "🔧 Utilisation du groupe : {$firstGroup->name} (ID: {$firstGroup->id})\n";
    echo "🔧 Utilisation de la ville : {$firstVille->name} (ID: {$firstVille->id})\n";

    // Mettre à jour les examens
    $updated = Capsule::table('examens')
        ->whereNull('group_id')
        ->orWhereNull('ville_id')
        ->update([
            'group_id' => $firstGroup->id,
            'ville_id' => $firstVille->id,
            'updated_at' => now()
        ]);

    echo "✅ $updated examens ont été mis à jour avec succès.\n";

    // Vérifier que tous les examens ont maintenant group_id et ville_id
    $remaining = Capsule::table('examens')
        ->whereNull('group_id')
        ->orWhereNull('ville_id')
        ->count();

    if ($remaining === 0) {
        echo "🎉 Migration terminée avec succès !\n";
    } else {
        echo "⚠️  $remaining examens n'ont toujours pas group_id ou ville_id.\n";
    }

} catch (Exception $e) {
    echo "❌ Erreur lors de la migration : " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n📝 Prochaines étapes :\n";
echo "1. Vérifier que les examens ont bien group_id et ville_id\n";
echo "2. Tester l'API pour s'assurer que tout fonctionne\n";
echo "3. Mettre à jour manuellement group_id et ville_id si nécessaire\n";
echo "4. Exécuter le seeder d'examens si vous voulez des données de test\n";
echo "   php artisan db:seed --class=ExamenSeeder\n";
