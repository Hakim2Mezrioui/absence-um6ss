<?php

/**
 * Script de test pour l'exportation des rattrapages
 * Ce script teste les endpoints d'exportation CSV et Excel
 */

require_once 'vendor/autoload.php';

use Illuminate\Http\Request;
use App\Http\Controllers\RattrapageController;
use App\Services\RattrapageService;

// Configuration de base pour les tests
$baseUrl = 'http://localhost:8000/api';

echo "=== Test d'exportation des rattrapages ===\n\n";

// Test 1: Vérifier qu'un rattrapage existe
echo "1. Vérification de l'existence d'un rattrapage...\n";
$rattrapageId = 1; // ID de test - à adapter selon votre base de données

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . "/rattrapages/{$rattrapageId}");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $data = json_decode($response, true);
    echo "✅ Rattrapage trouvé: " . $data['data']['name'] . "\n";
} else {
    echo "❌ Rattrapage non trouvé (HTTP $httpCode)\n";
    echo "Réponse: $response\n";
    exit(1);
}

// Test 2: Test d'exportation CSV
echo "\n2. Test d'exportation CSV...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . "/rattrapages/{$rattrapageId}/export/csv");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: text/csv',
    'Content-Type: application/json'
]);

$csvResponse = curl_exec($ch);
$csvHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$csvContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($csvHttpCode === 200) {
    echo "✅ Export CSV réussi\n";
    echo "   Type de contenu: $csvContentType\n";
    echo "   Taille: " . strlen($csvResponse) . " bytes\n";
    
    // Sauvegarder le fichier CSV pour inspection
    file_put_contents("test_rattrapage_export.csv", $csvResponse);
    echo "   Fichier sauvegardé: test_rattrapage_export.csv\n";
} else {
    echo "❌ Export CSV échoué (HTTP $csvHttpCode)\n";
    echo "Réponse: $csvResponse\n";
}

// Test 3: Test d'exportation Excel
echo "\n3. Test d'exportation Excel...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . "/rattrapages/{$rattrapageId}/export/excel");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Type: application/json'
]);

$excelResponse = curl_exec($ch);
$excelHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$excelContentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
curl_close($ch);

if ($excelHttpCode === 200) {
    echo "✅ Export Excel réussi\n";
    echo "   Type de contenu: $excelContentType\n";
    echo "   Taille: " . strlen($excelResponse) . " bytes\n";
    
    // Sauvegarder le fichier Excel pour inspection
    file_put_contents("test_rattrapage_export.xlsx", $excelResponse);
    echo "   Fichier sauvegardé: test_rattrapage_export.xlsx\n";
} else {
    echo "❌ Export Excel échoué (HTTP $excelHttpCode)\n";
    echo "Réponse: $excelResponse\n";
}

// Test 4: Test des données d'attendance
echo "\n4. Test des données d'attendance...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl . "/rattrapages/{$rattrapageId}/attendance");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Accept: application/json',
    'Content-Type: application/json'
]);

$attendanceResponse = curl_exec($ch);
$attendanceHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($attendanceHttpCode === 200) {
    $attendanceData = json_decode($attendanceResponse, true);
    echo "✅ Données d'attendance récupérées\n";
    echo "   Total étudiants: " . $attendanceData['total_students'] . "\n";
    echo "   Présents: " . $attendanceData['presents'] . "\n";
    echo "   Absents: " . $attendanceData['absents'] . "\n";
    echo "   En retard: " . $attendanceData['lates'] . "\n";
    echo "   Excusés: " . $attendanceData['excused'] . "\n";
} else {
    echo "❌ Récupération des données d'attendance échouée (HTTP $attendanceHttpCode)\n";
    echo "Réponse: $attendanceResponse\n";
}

echo "\n=== Tests terminés ===\n";
echo "Vérifiez les fichiers générés:\n";
echo "- test_rattrapage_export.csv\n";
echo "- test_rattrapage_export.xlsx\n";
