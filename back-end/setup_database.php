<?php

/**
 * Script de configuration de la base de données
 * Exécute les migrations et les seeders dans le bon ordre
 */

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\Artisan;

echo "🚀 Configuration de la base de données...\n\n";

try {
    // 1. Exécuter toutes les migrations (fresh pour recréer les tables)
    echo "📋 Exécution des migrations (fresh)...\n";
    Artisan::call('migrate:fresh');
    echo "✅ Migrations exécutées avec succès\n\n";

    // 2. Exécuter les seeders dans l'ordre
    echo "🌱 Exécution des seeders...\n";
    
    $seeders = [
        'VilleSeeder',
        'EtablissementSeeder', 
        'PromotionSeeder',
        'OptionSeeder',
        'TypeCoursSeeder',
        'TypeExamenSeeder',
        'SalleSeeder',
        'CoursSeeder',
        'ExamenSeeder'
    ];

    foreach ($seeders as $seeder) {
        echo "📦 Exécution de $seeder...\n";
        try {
            Artisan::call('db:seed', ['--class' => $seeder]);
            echo "✅ $seeder exécuté avec succès\n";
        } catch (Exception $e) {
            echo "⚠️  Erreur lors de l'exécution de $seeder: " . $e->getMessage() . "\n";
        }
    }

    echo "\n🎉 Configuration de la base de données terminée !\n";
    echo "📊 Vous pouvez maintenant tester l'API de statistiques avec:\n";
    echo "   GET /api/statistics\n";

} catch (Exception $e) {
    echo "❌ Erreur lors de la configuration: " . $e->getMessage() . "\n";
    echo "💡 Assurez-vous que votre base de données est configurée et accessible\n";
}
