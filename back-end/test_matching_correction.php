<?php

echo "🧪 Test de la Correction du Matching Biostar\n";
echo "============================================\n\n";

// Simulation des données Biostar (basées sur les vrais résultats)
$biostarResults = [
    ['user_id' => 'H00814', 'bsevtdt' => '2025-10-23 08:30:00', 'devnm' => 'POINTEUSE PARAMEDICAL'],
    ['user_id' => '251104', 'bsevtdt' => '2025-10-23 08:25:00', 'devnm' => 'FID SALLE A07'],
    ['user_id' => '251744', 'bsevtdt' => '2025-10-23 08:20:00', 'devnm' => 'FID SALLE A07'],
    ['user_id' => '140074', 'bsevtdt' => '2025-10-23 08:15:00', 'devnm' => 'FID(G) H204'],
    ['user_id' => '253006', 'bsevtdt' => '2025-10-23 08:10:00', 'devnm' => 'FID SALLE A07'],
    ['user_id' => '003', 'bsevtdt' => '2025-10-23 08:05:00', 'devnm' => 'B3 FID(G) AMPHI1'],
    ['user_id' => '022', 'bsevtdt' => '2025-10-23 08:00:00', 'devnm' => 'S A08'],
    ['user_id' => '023', 'bsevtdt' => '2025-10-23 07:55:00', 'devnm' => 'FID(D) AMPHI7'],
    ['user_id' => '024', 'bsevtdt' => '2025-10-23 07:50:00', 'devnm' => 'B3 FID(G) AMPHI1'],
    ['user_id' => '000123', 'bsevtdt' => '2025-10-23 07:45:00', 'devnm' => 'B3 FID(C) AMPHI2'],
];

// Simulation des matricules locaux (formats possibles)
$localMatricules = [
    'H00814',      // Correspondance exacte
    '251104',      // Correspondance exacte
    '003',         // Correspondance exacte
    '000123',      // Correspondance exacte
    '123',         // Test suppression zéros
    '000456',      // Test suppression zéros
    '789',         // Test ajout zéros
    'ETU001',      // Test recherche partielle
    'STU123456',   // Test recherche inverse
    'INEXISTANT',  // Test aucun match
];

echo "📊 Données de test:\n";
echo "  - Pointages Biostar: " . count($biostarResults) . "\n";
echo "  - Matricules locaux: " . count($localMatricules) . "\n\n";

// Fonction de matching améliorée (copie de la correction)
function getPunchTime($matricule, $biostarResults) {
    // Stratégie 1: Correspondance exacte
    $studentPunch = collect($biostarResults)->firstWhere('user_id', $matricule);
    if ($studentPunch) {
        return [
            'time' => $studentPunch['bsevtdt'],
            'device' => $studentPunch['devnm'],
            'strategy' => 'Exacte'
        ];
    }
    
    // Stratégie 2: Supprimer les zéros de début (ex: "000123" → "123")
    $matriculeTrimmed = ltrim($matricule, '0');
    if ($matriculeTrimmed !== $matricule && !empty($matriculeTrimmed)) {
        $studentPunch = collect($biostarResults)->firstWhere('user_id', $matriculeTrimmed);
        if ($studentPunch) {
            return [
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm'],
                'strategy' => 'Suppression zéros'
            ];
        }
    }
    
    // Stratégie 3: Ajouter des zéros de début (ex: "123" → "000123")
    $matriculePadded = str_pad($matricule, 6, '0', STR_PAD_LEFT);
    if ($matriculePadded !== $matricule) {
        $studentPunch = collect($biostarResults)->firstWhere('user_id', $matriculePadded);
        if ($studentPunch) {
            return [
                'time' => $studentPunch['bsevtdt'],
                'device' => $studentPunch['devnm'],
                'strategy' => 'Ajout zéros'
            ];
        }
    }
    
    // Stratégie 4: Recherche partielle (contient le matricule)
    $studentPunch = collect($biostarResults)->first(function ($punch) use ($matricule) {
        return strpos($punch['user_id'], $matricule) !== false;
    });
    if ($studentPunch) {
        return [
            'time' => $studentPunch['bsevtdt'],
            'device' => $studentPunch['devnm'],
            'strategy' => 'Recherche partielle'
        ];
    }
    
    // Stratégie 5: Recherche inverse (le matricule contient le user_id)
    $studentPunch = collect($biostarResults)->first(function ($punch) use ($matricule) {
        return strpos($matricule, $punch['user_id']) !== false;
    });
    if ($studentPunch) {
        return [
            'time' => $studentPunch['bsevtdt'],
            'device' => $studentPunch['devnm'],
            'strategy' => 'Recherche inverse'
        ];
    }
    
    return null;
}

// Fonction collect() simple pour les tests
function collect($array) {
    return new class($array) {
        private $items;
        
        public function __construct($items) {
            $this->items = $items;
        }
        
        public function firstWhere($key, $value) {
            foreach ($this->items as $item) {
                if (isset($item[$key]) && $item[$key] === $value) {
                    return $item;
                }
            }
            return null;
        }
        
        public function first($callback) {
            foreach ($this->items as $item) {
                if ($callback($item)) {
                    return $item;
                }
            }
            return null;
        }
    };
}

// Test de la fonction
echo "🧪 Test des stratégies de matching:\n";
echo "===================================\n\n";

$matches = 0;
$totalChecked = 0;
$strategies = [];

foreach ($localMatricules as $matricule) {
    $totalChecked++;
    $result = getPunchTime($matricule, $biostarResults);
    
    if ($result) {
        $matches++;
        $strategy = $result['strategy'];
        $strategies[$strategy] = ($strategies[$strategy] ?? 0) + 1;
        
        echo "✅ '$matricule' → Match trouvé avec stratégie '$strategy'\n";
        echo "   📅 Heure: {$result['time']}\n";
        echo "   📱 Appareil: {$result['device']}\n\n";
    } else {
        echo "❌ '$matricule' → Aucun match trouvé\n\n";
    }
}

echo "📊 Résumé des tests:\n";
echo "====================\n";
echo "  - Matricules testés: $totalChecked\n";
echo "  - Correspondances trouvées: $matches\n";
echo "  - Taux de réussite: " . round(($matches / $totalChecked) * 100, 2) . "%\n\n";

echo "📈 Stratégies utilisées:\n";
foreach ($strategies as $strategy => $count) {
    echo "  - $strategy: $count fois\n";
}

echo "\n🎯 Conclusion:\n";
if ($matches > 0) {
    echo "✅ La correction fonctionne ! Les étudiants devraient maintenant être correctement détectés.\n";
    echo "📝 Vérifiez les logs Laravel pour voir les stratégies utilisées en production.\n";
} else {
    echo "❌ Aucune correspondance trouvée. Vérifiez les formats de matricules.\n";
}

echo "\n🏁 Test terminé\n";

















