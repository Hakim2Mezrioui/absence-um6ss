<?php

require_once 'vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use PDO;
use PDOException;

echo "🔍 Comparaison des matricules étudiants avec les user_id Biostar\n";
echo "==============================================================\n\n";

// Configuration de connexion Biostar
$dsn = 'sqlsrv:Server=10.0.2.148;Database=BIOSTAR_TA;TrustServerCertificate=true';
$username = 'dbuser';
$password = 'Driss@2024';

try {
    // Connexion à Biostar
    echo "📡 Connexion à la base Biostar...\n";
    $pdo = new PDO($dsn, $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Connexion Biostar réussie !\n\n";
    
    // Connexion à la base locale Laravel
    echo "📡 Connexion à la base locale...\n";
    $config = require 'config/database.php';
    $localConfig = $config['connections']['sqlite'];
    $localPdo = new PDO("sqlite:" . $localConfig['database']);
    $localPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Connexion locale réussie !\n\n";
    
    // Récupérer quelques matricules d'étudiants locaux
    echo "🔍 Récupération des matricules étudiants locaux...\n";
    $stmt = $localPdo->query("SELECT matricule, first_name, last_name FROM etudiants LIMIT 10");
    $localStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "👥 Étudiants locaux (10 premiers):\n";
    foreach ($localStudents as $student) {
        echo "  - Matricule: {$student['matricule']}, Nom: {$student['last_name']} {$student['first_name']}\n";
    }
    
    echo "\n";
    
    // Récupérer quelques user_id de Biostar récents
    echo "🔍 Récupération des user_id Biostar récents...\n";
    $stmt = $pdo->query("SELECT DISTINCT TOP 10 user_id FROM punchlog WHERE CAST(bsevtdt AS DATE) >= DATEADD(day, -3, GETDATE()) ORDER BY user_id");
    $biostarUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "👥 User IDs Biostar récents (10 premiers):\n";
    foreach ($biostarUserIds as $userId) {
        echo "  - User ID: $userId\n";
    }
    
    echo "\n";
    
    // Vérifier les correspondances exactes
    echo "🔍 Recherche de correspondances exactes...\n";
    $matches = 0;
    $totalChecked = 0;
    
    foreach ($localStudents as $student) {
        $totalChecked++;
        $matricule = $student['matricule'];
        
        // Chercher ce matricule dans Biostar
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM punchlog WHERE user_id = ?");
        $stmt->execute([$matricule]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            $matches++;
            echo "✅ Correspondance trouvée: Matricule {$matricule} ({$student['last_name']} {$student['first_name']})\n";
            
            // Afficher les pointages récents pour cet étudiant
            $stmt = $pdo->prepare("SELECT TOP 3 bsevtdt, devnm FROM punchlog WHERE user_id = ? ORDER BY bsevtdt DESC");
            $stmt->execute([$matricule]);
            $punches = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "   📅 Pointages récents:\n";
            foreach ($punches as $punch) {
                echo "     - {$punch['bsevtdt']} sur {$punch['devnm']}\n";
            }
        } else {
            echo "❌ Aucun pointage trouvé pour le matricule: {$matricule} ({$student['last_name']} {$student['first_name']})\n";
        }
    }
    
    echo "\n📊 Résumé des correspondances:\n";
    echo "  - Étudiants vérifiés: $totalChecked\n";
    echo "  - Correspondances trouvées: $matches\n";
    echo "  - Pourcentage de correspondance: " . round(($matches / $totalChecked) * 100, 2) . "%\n";
    
    // Vérifier s'il y a des patterns dans les user_id de Biostar
    echo "\n🔍 Analyse des patterns dans les user_id Biostar...\n";
    
    $stmt = $pdo->query("
        SELECT user_id, COUNT(*) as punch_count 
        FROM punchlog 
        WHERE CAST(bsevtdt AS DATE) >= DATEADD(day, -7, GETDATE())
        GROUP BY user_id 
        ORDER BY punch_count DESC 
        LIMIT 20
    ");
    $topUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "👥 Top 20 user_id par nombre de pointages (7 derniers jours):\n";
    foreach ($topUsers as $user) {
        echo "  - User ID: {$user['user_id']}, Pointages: {$user['punch_count']}\n";
    }
    
    // Vérifier si les matricules sont des nombres ou des chaînes
    echo "\n🔍 Analyse du format des matricules...\n";
    
    $stmt = $localPdo->query("SELECT matricule FROM etudiants LIMIT 20");
    $matricules = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "📋 Exemples de matricules locaux:\n";
    foreach ($matricules as $matricule) {
        $type = is_numeric($matricule) ? 'numérique' : 'texte';
        echo "  - {$matricule} (type: $type)\n";
    }
    
} catch (PDOException $e) {
    echo "❌ Erreur de connexion: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n🏁 Analyse terminée\n";

