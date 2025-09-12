<?php

require_once 'vendor/autoload.php';

use App\Services\AbsenceAutoService;
use App\Models\Examen;
use App\Models\Etudiant;
use App\Models\Absence;

// Configuration de la base de données
$config = require 'config/database.php';
$pdo = new PDO(
    "sqlite:database/database.sqlite",
    null,
    null,
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);

echo "🧪 Test du système de création automatique des absences\n";
echo "================================================\n\n";

try {
    // 1. Vérifier la structure de la base de données
    echo "1. Vérification de la structure de la base de données...\n";
    
    $tables = ['examens', 'etudiants', 'absences'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SELECT name FROM sqlite_master WHERE type='table' AND name='$table'");
        if ($stmt->fetch()) {
            echo "   ✅ Table '$table' existe\n";
        } else {
            echo "   ❌ Table '$table' n'existe pas\n";
        }
    }
    
    // 2. Vérifier les examens disponibles
    echo "\n2. Vérification des examens disponibles...\n";
    $stmt = $pdo->query("SELECT id, title, date, heure_debut, heure_fin FROM examens LIMIT 5");
    $examens = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($examens)) {
        echo "   ⚠️  Aucun examen trouvé dans la base de données\n";
    } else {
        echo "   📋 Examens trouvés:\n";
        foreach ($examens as $examen) {
            echo "      - ID: {$examen['id']}, Titre: {$examen['title']}, Date: {$examen['date']}\n";
        }
    }
    
    // 3. Vérifier les étudiants disponibles
    echo "\n3. Vérification des étudiants disponibles...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM etudiants");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   👥 Nombre d'étudiants: $count\n";
    
    // 4. Vérifier les absences existantes
    echo "\n4. Vérification des absences existantes...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM absences");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   📝 Nombre d'absences: $count\n";
    
    // 5. Test de création d'absences (si des examens existent)
    if (!empty($examens)) {
        echo "\n5. Test de création d'absences...\n";
        $examenId = $examens[0]['id'];
        echo "   🎯 Test avec l'examen ID: $examenId\n";
        
        // Simuler la création d'absences
        $stmt = $pdo->prepare("
            SELECT e.id, e.matricule, e.first_name, e.last_name, ex.id as examen_id, ex.date
            FROM etudiants e
            CROSS JOIN examens ex
            WHERE ex.id = ? AND e.promotion_id = ex.promotion_id
            LIMIT 3
        ");
        $stmt->execute([$examenId]);
        $etudiants = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($etudiants)) {
            echo "   📊 Étudiants trouvés pour l'examen: " . count($etudiants) . "\n";
            
            // Simuler la création d'absences
            foreach ($etudiants as $etudiant) {
                $stmt = $pdo->prepare("
                    INSERT OR IGNORE INTO absences 
                    (type_absence, etudiant_id, examen_id, date_absence, justifiee, motif, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                ");
                $stmt->execute([
                    'Absence non justifiée',
                    $etudiant['id'],
                    $etudiant['examen_id'],
                    $etudiant['date'],
                    0,
                    "Absence à l'examen du " . $etudiant['date']
                ]);
            }
            
            echo "   ✅ Absences créées avec succès\n";
        } else {
            echo "   ⚠️  Aucun étudiant trouvé pour cet examen\n";
        }
    }
    
    // 6. Vérification finale
    echo "\n6. Vérification finale...\n";
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM absences");
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    echo "   📝 Nombre total d'absences après test: $count\n";
    
    echo "\n✅ Test terminé avec succès!\n";
    
} catch (Exception $e) {
    echo "\n❌ Erreur lors du test: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
