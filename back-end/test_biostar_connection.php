<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

echo "🔍 Test de connexion à la base Biostar\n";
echo "=====================================\n\n";

// Configuration de connexion (utilisez les mêmes paramètres que dans votre application)
$dsn = 'sqlsrv:Server=10.0.2.148;Database=BIOSTAR_TA;TrustServerCertificate=true';
$username = 'dbuser';
$password = 'Driss@2024';

try {
    echo "📡 Connexion à la base Biostar...\n";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Connexion réussie !\n\n";
    
    // Test 1: Vérifier la structure de la table punchlog
    echo "🔍 Test 1: Structure de la table punchlog\n";
    echo "----------------------------------------\n";
    
    $stmt = $pdo->query("SELECT TOP 1 * FROM punchlog");
    $sample = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($sample) {
        echo "📋 Champs disponibles dans punchlog:\n";
        foreach (array_keys($sample) as $field) {
            echo "  - $field\n";
        }
        echo "\n📊 Exemple de données:\n";
        foreach ($sample as $key => $value) {
            echo "  $key: $value\n";
        }
    } else {
        echo "❌ Aucune donnée trouvée dans punchlog\n";
    }
    
    echo "\n";
    
    // Test 2: Compter les enregistrements récents
    echo "🔍 Test 2: Enregistrements récents\n";
    echo "--------------------------------\n";
    
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM punchlog WHERE CAST(bsevtdt AS DATE) >= DATEADD(day, -7, GETDATE())");
    $count = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "📊 Pointages des 7 derniers jours: " . $count['total'] . "\n";
    
    // Test 3: Vérifier les données d'aujourd'hui
    echo "\n🔍 Test 3: Données d'aujourd'hui\n";
    echo "-------------------------------\n";
    
    $today = date('Y-m-d');
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM punchlog WHERE CAST(bsevtdt AS DATE) = ?");
    $stmt->execute([$today]);
    $todayCount = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "📅 Pointages aujourd'hui ($today): " . $todayCount['total'] . "\n";
    
    if ($todayCount['total'] > 0) {
        // Afficher quelques exemples d'aujourd'hui
        $stmt = $pdo->prepare("SELECT TOP 5 user_id, bsevtdt, devnm FROM punchlog WHERE CAST(bsevtdt AS DATE) = ? ORDER BY bsevtdt DESC");
        $stmt->execute([$today]);
        $todayData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "\n📋 Exemples de pointages d'aujourd'hui:\n";
        foreach ($todayData as $row) {
            echo "  - user_id: {$row['user_id']}, heure: {$row['bsevtdt']}, appareil: {$row['devnm']}\n";
        }
    }
    
    // Test 4: Vérifier les user_id uniques récents
    echo "\n🔍 Test 4: User IDs récents\n";
    echo "--------------------------\n";
    
    $stmt = $pdo->query("SELECT DISTINCT TOP 10 user_id FROM punchlog WHERE CAST(bsevtdt AS DATE) >= DATEADD(day, -3, GETDATE()) ORDER BY user_id");
    $userIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "👥 User IDs récents (3 derniers jours):\n";
    foreach ($userIds as $userId) {
        echo "  - $userId\n";
    }
    
    // Test 5: Test avec une date spécifique (aujourd'hui)
    echo "\n🔍 Test 5: Test avec une plage horaire\n";
    echo "------------------------------------\n";
    
    $testDate = $today;
    $testStartTime = '08:00:00';
    $testEndTime = '12:00:00';
    
    echo "📅 Test avec date: $testDate, heure: $testStartTime - $testEndTime\n";
    
    $stmt = $pdo->prepare("
        SELECT user_id, bsevtdt, devnm 
        FROM punchlog 
        WHERE CAST(bsevtdt AS DATE) = ? 
        AND CAST(bsevtdt AS TIME) BETWEEN ? AND ?
        AND devnm NOT LIKE 'TOUR%' 
        AND devnm NOT LIKE 'ACCES HCK%'
        ORDER BY bsevtdt ASC
    ");
    $stmt->execute([$testDate, $testStartTime, $testEndTime]);
    $testResults = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📊 Résultats trouvés: " . count($testResults) . "\n";
    
    if (count($testResults) > 0) {
        echo "📋 Premiers résultats:\n";
        foreach (array_slice($testResults, 0, 5) as $row) {
            echo "  - user_id: {$row['user_id']}, heure: {$row['bsevtdt']}, appareil: {$row['devnm']}\n";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Erreur de connexion: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n🏁 Test terminé\n";



