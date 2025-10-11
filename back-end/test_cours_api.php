<?php

// Test de l'API pour créer un cours
$url = 'http://127.0.0.1:8000/api/cours';
$data = [
    'name' => 'Mathématiques - Analyse 1',
    'date' => '2024-01-15',
    'pointage_start_hour' => '08:00',
    'heure_debut' => '08:30',
    'heure_fin' => '10:30',
    'tolerance' => '00:15',
    'etablissement_id' => 1,
    'promotion_id' => 1,
    'type_cours_id' => 1,
    'salle_id' => 1,
    'option_id' => 1,
    'annee_universitaire' => '2023-2024'
];

$options = [
    'http' => [
        'header' => "Content-type: application/json\r\n",
        'method' => 'POST',
        'content' => json_encode($data)
    ]
];

$context = stream_context_create($options);
$result = file_get_contents($url, false, $context);

if ($result === FALSE) {
    echo "Erreur lors de la création du cours\n";
} else {
    echo "Réponse de l'API:\n";
    echo $result . "\n";
}





















