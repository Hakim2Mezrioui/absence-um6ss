<?php

echo "🔍 Vérification de la structure de la base de données locale\n";
echo "==========================================================\n\n";

try {
    // Connexion à la base locale SQLite
    echo "📡 Connexion à la base locale SQLite...\n";
    $localPdo = new PDO("sqlite:database/database.sqlite");
    $localPdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "✅ Connexion locale réussie !\n\n";
    
    // Lister toutes les tables
    echo "🔍 Tables disponibles:\n";
    $stmt = $localPdo->query("SELECT name FROM sqlite_master WHERE type='table'");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    foreach ($tables as $table) {
        echo "  - $table\n";
    }
    
    echo "\n";
    
    // Chercher une table qui pourrait contenir les étudiants
    $studentTables = array_filter($tables, function($table) {
        return stripos($table, 'etudiant') !== false || 
               stripos($table, 'student') !== false ||
               stripos($table, 'user') !== false;
    });
    
    if (!empty($studentTables)) {
        echo "👥 Tables contenant 'etudiant', 'student' ou 'user':\n";
        foreach ($studentTables as $table) {
            echo "  - $table\n";
            
            // Afficher la structure de cette table
            $stmt = $localPdo->query("PRAGMA table_info($table)");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo "    Colonnes:\n";
            foreach ($columns as $column) {
                echo "      - {$column['name']} ({$column['type']})\n";
            }
            
            // Afficher quelques exemples de données
            $stmt = $localPdo->query("SELECT * FROM $table LIMIT 3");
            $samples = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (!empty($samples)) {
                echo "    Exemples de données:\n";
                foreach ($samples as $sample) {
                    $data = array_slice($sample, 0, 5); // Limiter à 5 colonnes
                    $dataStr = implode(', ', array_map(function($k, $v) {
                        return "$k: $v";
                    }, array_keys($data), $data));
                    echo "      - $dataStr\n";
                }
            }
            echo "\n";
        }
    } else {
        echo "❌ Aucune table trouvée contenant 'etudiant', 'student' ou 'user'\n";
        
        // Afficher toutes les tables avec leur structure
        echo "\n🔍 Structure de toutes les tables:\n";
        foreach ($tables as $table) {
            echo "📋 Table: $table\n";
            $stmt = $localPdo->query("PRAGMA table_info($table)");
            $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($columns as $column) {
                echo "  - {$column['name']} ({$column['type']})\n";
            }
            echo "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Erreur de connexion: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Erreur: " . $e->getMessage() . "\n";
}

echo "\n🏁 Vérification terminée\n";



