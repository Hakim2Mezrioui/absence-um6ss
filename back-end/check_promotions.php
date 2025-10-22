<?php

require __DIR__.'/vendor/autoload.php';

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use App\Models\Promotion;
use App\Models\User;
use Illuminate\Support\Facades\DB;

echo "=== Vérification des Promotions ===\n\n";

// 1. Compter toutes les promotions (sans scope)
$totalPromotions = DB::table('promotions')->count();
echo "Total des promotions (sans scope): {$totalPromotions}\n\n";

// 2. Afficher toutes les promotions (sans scope)
if ($totalPromotions > 0) {
    echo "Liste des promotions:\n";
    $promotions = DB::table('promotions')->get();
    foreach ($promotions as $promotion) {
        echo "  - ID: {$promotion->id}, Nom: {$promotion->name}\n";
    }
    echo "\n";
}

// 3. Vérifier la structure de la table
echo "Structure de la table 'promotions':\n";
$columns = DB::getSchemaBuilder()->getColumnListing('promotions');
foreach ($columns as $column) {
    echo "  - {$column}\n";
}
echo "\n";

// 4. Créer quelques promotions de test si aucune n'existe
if ($totalPromotions === 0) {
    echo "Aucune promotion trouvée. Création de promotions de test...\n";
    
    $testPromotions = [
        'L1 Informatique',
        'L2 Informatique',
        'L3 Informatique',
        'M1 Informatique',
        'M2 Informatique',
        'L1 Mathématiques',
        'L2 Mathématiques',
    ];
    
    foreach ($testPromotions as $name) {
        DB::table('promotions')->insert([
            'name' => $name,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        echo "  ✓ Promotion '{$name}' créée\n";
    }
    
    echo "\nTotal après création: " . DB::table('promotions')->count() . "\n";
}

// 5. Vérifier les utilisateurs
echo "\n=== Vérification des Utilisateurs ===\n";
$totalUsers = User::count();
echo "Total des utilisateurs: {$totalUsers}\n\n";

if ($totalUsers > 0) {
    echo "Liste des utilisateurs:\n";
    $users = User::all();
    foreach ($users as $user) {
        $roleName = $user->role_id == 1 ? 'Super Admin' : 'User';
        echo "  - ID: {$user->id}, Email: {$user->email}, Role: {$roleName} (ID: {$user->role_id})";
        if ($user->ville_id) {
            echo ", Ville ID: {$user->ville_id}";
        }
        if ($user->etablissement_id) {
            echo ", Etablissement ID: {$user->etablissement_id}";
        }
        echo "\n";
    }
}

echo "\n=== Fin de la vérification ===\n";
