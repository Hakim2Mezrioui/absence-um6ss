<?php

echo "🔍 Diagnostic et Correction du Problème de Matching Biostar\n";
echo "==========================================================\n\n";

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
    $localPdo = new PDO("sqlite:database/database.sqlite");
    $localPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Connexion locale réussie !\n\n";
    
    // Vérifier les tables disponibles
    echo "🔍 Vérification des tables disponibles...\n";
    $stmt = $localPdo->query("SELECT name FROM sqlite_master WHERE type='table'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "📋 Tables disponibles: " . implode(', ', $tables) . "\n\n";
    
    // Utiliser la bonne table (probablement 'etudiants' ou 'list_students')
    $studentTable = 'etudiants';
    if (!in_array('etudiants', $tables)) {
        if (in_array('list_students', $tables)) {
            $studentTable = 'list_students';
        } else {
            echo "❌ Aucune table d'étudiants trouvée !\n";
            return;
        }
    }
    
    echo "📋 Utilisation de la table: $studentTable\n\n";
    
    // 1. Analyser les formats de matricules locaux
    echo "🔍 Analyse des formats de matricules locaux...\n";
    echo "==============================================\n";
    
    $stmt = $localPdo->query("SELECT matricule, first_name, last_name FROM $studentTable LIMIT 10");
    $localStudents = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "👥 Exemples de matricules locaux:\n";
    foreach ($localStudents as $student) {
        echo "  - Matricule: '{$student['matricule']}', Nom: {$student['last_name']} {$student['first_name']}\n";
    }
    
    echo "\n";
    
    // 2. Analyser les formats de user_id Biostar
    echo "🔍 Analyse des formats de user_id Biostar...\n";
    echo "============================================\n";
    
    $stmt = $pdo->query("SELECT DISTINCT TOP 20 user_id FROM punchlog WHERE CAST(bsevtdt AS DATE) >= DATEADD(day, -7, GETDATE()) ORDER BY user_id");
    $biostarUserIds = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "👥 Exemples de user_id Biostar:\n";
    foreach ($biostarUserIds as $userId) {
        echo "  - User ID: '$userId'\n";
    }
    
    echo "\n";
    
    // 3. Tester différentes stratégies de matching
    echo "🔍 Test des stratégies de matching...\n";
    echo "====================================\n";
    
    $matches = 0;
    $totalChecked = 0;
    $matchingStrategies = [];
    
    foreach ($localStudents as $student) {
        $totalChecked++;
        $matricule = $student['matricule'];
        $found = false;
        $strategy = '';
        
        // Stratégie 1: Correspondance exacte
        $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM punchlog WHERE user_id = ?");
        $stmt->execute([$matricule]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            $matches++;
            $found = true;
            $strategy = 'Exacte';
            echo "✅ Correspondance exacte: '$matricule' → '$matricule'\n";
        }
        
        // Stratégie 2: Supprimer les zéros de début
        if (!$found) {
            $matriculeTrimmed = ltrim($matricule, '0');
            if ($matriculeTrimmed !== $matricule) {
                $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM punchlog WHERE user_id = ?");
                $stmt->execute([$matriculeTrimmed]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result['count'] > 0) {
                    $matches++;
                    $found = true;
                    $strategy = 'Sans zéros de début';
                    echo "✅ Correspondance sans zéros: '$matricule' → '$matriculeTrimmed'\n";
                }
            }
        }
        
        // Stratégie 3: Ajouter des zéros de début
        if (!$found) {
            $matriculePadded = str_pad($matricule, 6, '0', STR_PAD_LEFT);
            if ($matriculePadded !== $matricule) {
                $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM punchlog WHERE user_id = ?");
                $stmt->execute([$matriculePadded]);
                $result = $stmt->fetch(PDO::FETCH_ASSOC);
                
                if ($result['count'] > 0) {
                    $matches++;
                    $found = true;
                    $strategy = 'Avec zéros de début';
                    echo "✅ Correspondance avec zéros: '$matricule' → '$matriculePadded'\n";
                }
            }
        }
        
        // Stratégie 4: Recherche partielle (contient)
        if (!$found) {
            $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM punchlog WHERE user_id LIKE ?");
            $stmt->execute(["%$matricule%"]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($result['count'] > 0) {
                $matches++;
                $found = true;
                $strategy = 'Contient';
                echo "✅ Correspondance partielle: '$matricule' contenu dans user_id\n";
            }
        }
        
        if (!$found) {
            echo "❌ Aucune correspondance trouvée pour: '$matricule'\n";
            $strategy = 'Aucune';
        }
        
        $matchingStrategies[$strategy] = ($matchingStrategies[$strategy] ?? 0) + 1;
    }
    
    echo "\n📊 Résumé des stratégies de matching:\n";
    foreach ($matchingStrategies as $strategy => $count) {
        echo "  - $strategy: $count étudiants\n";
    }
    
    echo "\n📊 Résumé global:\n";
    echo "  - Étudiants vérifiés: $totalChecked\n";
    echo "  - Correspondances trouvées: $matches\n";
    echo "  - Pourcentage de correspondance: " . round(($matches / $totalChecked) * 100, 2) . "%\n";
    
    // 4. Recommandations
    echo "\n💡 Recommandations pour corriger le problème:\n";
    echo "============================================\n";
    
    if ($matches == 0) {
        echo "🚨 PROBLÈME CRITIQUE: Aucune correspondance trouvée !\n";
        echo "   → Vérifier la configuration des matricules dans Biostar\n";
        echo "   → Vérifier la configuration des matricules dans la base locale\n";
        echo "   → Créer une table de mapping entre les deux systèmes\n";
    } elseif ($matches < $totalChecked * 0.5) {
        echo "⚠️  PROBLÈME MAJEUR: Moins de 50% de correspondances\n";
        echo "   → Implémenter une logique de matching plus flexible\n";
        echo "   → Créer une fonction de normalisation des matricules\n";
    } else {
        echo "✅ CORRESPONDANCES TROUVÉES: " . round(($matches / $totalChecked) * 100, 2) . "%\n";
        echo "   → Implémenter la stratégie de matching la plus efficace\n";
    }
    
    // 5. Code de correction suggéré
    echo "\n🛠️  Code de correction suggéré:\n";
    echo "===============================\n";
    
    echo "// Fonction de matching améliorée\n";
    echo "private function findStudentInBiostar(\$matricule, \$biostarResults) {\n";
    echo "    // Stratégie 1: Correspondance exacte\n";
    echo "    \$studentPunch = collect(\$biostarResults)->firstWhere('user_id', \$matricule);\n";
    echo "    if (\$studentPunch) return \$studentPunch;\n";
    echo "    \n";
    echo "    // Stratégie 2: Supprimer les zéros de début\n";
    echo "    \$matriculeTrimmed = ltrim(\$matricule, '0');\n";
    echo "    if (\$matriculeTrimmed !== \$matricule) {\n";
    echo "        \$studentPunch = collect(\$biostarResults)->firstWhere('user_id', \$matriculeTrimmed);\n";
    echo "        if (\$studentPunch) return \$studentPunch;\n";
    echo "    }\n";
    echo "    \n";
    echo "    // Stratégie 3: Ajouter des zéros de début\n";
    echo "    \$matriculePadded = str_pad(\$matricule, 6, '0', STR_PAD_LEFT);\n";
    echo "    if (\$matriculePadded !== \$matricule) {\n";
    echo "        \$studentPunch = collect(\$biostarResults)->firstWhere('user_id', \$matriculePadded);\n";
    echo "        if (\$studentPunch) return \$studentPunch;\n";
    echo "    }\n";
    echo "    \n";
    echo "    return null;\n";
    echo "}\n";
    
} catch (PDOException $e) {
    echo "❌ Erreur de connexion: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur générale: " . $e->getMessage() . "\n";
}

echo "\n🏁 Diagnostic terminé\n";
