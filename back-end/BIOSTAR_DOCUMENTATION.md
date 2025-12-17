# 📘 Documentation Biostar - Système de Pointage

> **Version**: 1.0  
> **Dernière mise à jour**: 2024  
> **Auteur**: Équipe de développement

---

## 📑 Table des matières

- [Introduction](#-introduction)
  - [Vue d'ensemble](#vue-densemble)
  - [Architecture](#architecture)
- [Configuration](#-configuration-de-la-connexion)
  - [Structure de la configuration](#structure-de-la-configuration)
  - [Paramètres de connexion](#paramètres-de-connexion-requis)
  - [Connexion PDO](#connexion-pdo)
  - [Récupération de la configuration](#récupération-de-la-configuration)
- [Structure de la base de données](#-structure-de-la-table-punchlog)
  - [Colonnes principales](#colonnes-principales)
  - [Notes importantes](#notes-importantes)
- [Récupération des données](#-récupération-des-données-de-pointage)
  - [Service principal](#service-principal-biostarattendanceservice)
  - [Format des données](#format-des-pointages-retournés)
- [Requêtes SQL](#-requêtes-sql-utilisées)
  - [Requête principale](#1-requête-principale-de-récupération-des-pointages)
  - [Filtrage par étudiants](#2-requête-avec-filtrage-par-étudiants)
  - [Statistiques](#4-requête-de-statistiques)
- [Fonctionnalités avancées](#-fonctionnalités-avancées)
  - [Gestion des décalages horaires](#gestion-des-décalages-horaires)
  - [Filtrage par devices](#filtrage-par-devices)
- [Exemples d'utilisation](#-exemples-dutilisation)
- [API Reference](#-endpoints-api-disponibles)
- [Bonnes pratiques](#-bonnes-pratiques)
- [Dépannage](#-dépannage)

---

## 🎯 Introduction

### Vue d'ensemble

**Biostar** est un système de contrôle d'accès et de pointage qui utilise la **reconnaissance faciale (Face ID)** pour enregistrer les présences des étudiants. Le système stocke toutes les données de pointage dans une base de données **SQL Server**.

> **💡 Note**: Cette documentation couvre l'intégration complète de Biostar dans le système de gestion des absences.

### Architecture

| Composant | Description |
|-----------|-------------|
| **Base de données** | SQL Server (`BIOSTAR_TA`) |
| **Protocole** | PDO avec driver `sqlsrv` |
| **Table principale** | `punchlog` (enregistrements de pointage) |
| **Tables secondaires** | `device`, `devicegroup` |

**Schéma de connexion**:
```
Application Laravel → ConfigurationService → BiostarAttendanceService → SQL Server (Biostar)
```

---

## ⚙️ Configuration de la connexion

### Structure de la configuration

La configuration Biostar est stockée dans la table `configuration` de l'application Laravel. **Chaque ville peut avoir sa propre configuration de connexion**.

#### Champs de la table `configuration`

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `id` | INT | Identifiant unique | `1` |
| `sqlsrv` | VARCHAR | Adresse IP du serveur | `192.168.1.100` |
| `database` | VARCHAR | Nom de la base de données | `BIOSTAR_TA` |
| `trustServerCertificate` | BOOLEAN | Accepter le certificat SSL | `true` |
| `biostar_username` | VARCHAR | Nom d'utilisateur | `biostar_user` |
| `biostar_password` | VARCHAR | Mot de passe | `********` |
| `ville_id` | INT | ID de la ville associée | `1` |

### Construction du DSN (Data Source Name)

Le DSN est construit automatiquement à partir de la configuration :

```php
$dsn = "sqlsrv:Server={$configuration->sqlsrv};Database={$configuration->database};TrustServerCertificate={$configuration->trustServerCertificate}";
```

**Exemple de DSN généré**:
```
sqlsrv:Server=SERVER_IP;Database=BIOSTAR_TA;TrustServerCertificate=true
```

> **⚠️ Important**: Remplacez `SERVER_IP` par l'adresse IP réelle du serveur SQL Server.

### Paramètres de connexion requis

Pour se connecter à la base de données Biostar, vous devez disposer des paramètres suivants :

| Paramètre | Description | Exemple | Requis |
|-----------|-------------|---------|--------|
| `SERVER_IP` | Adresse IP ou nom d'hôte du serveur SQL Server | `192.168.1.100` | ✅ Oui |
| `DATABASE_NAME` | Nom de la base de données Biostar | `BIOSTAR_TA` | ✅ Oui |
| `USERNAME` | Nom d'utilisateur pour la connexion SQL Server | `biostar_user` | ✅ Oui |
| `PASSWORD` | Mot de passe pour la connexion SQL Server | `votre_mot_de_passe` | ✅ Oui |
| `TRUST_SERVER_CERTIFICATE` | Booléen pour accepter le certificat SSL | `true` | ✅ Oui |

> **📝 Note**: Ces paramètres sont stockés dans la table `configuration` de l'application et sont associés à chaque ville.

### Connexion PDO

```php
// Création de la connexion PDO
$pdo = new PDO($dsn, $config['username'], $config['password']);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

// Ajout d'un timeout de connexion (recommandé)
if (strpos($dsn, 'LoginTimeout=') === false) {
    $dsn .= ';LoginTimeout=3';
}
```

**Gestion des erreurs**:
```php
try {
    $pdo = new PDO($dsn, $username, $password);
    // ... opérations
} catch (PDOException $e) {
    \Log::error('Erreur de connexion Biostar: ' . $e->getMessage());
    throw new \Exception('Impossible de se connecter à Biostar');
}
```

### Récupération de la configuration

La configuration est récupérée via le service `ConfigurationService` :

```php
use App\Services\ConfigurationService;

$configurationService = new ConfigurationService();

// Pour une ville spécifique
$configResult = $configurationService->getConnectionConfigForVille($villeId);

// Pour un cours (basé sur la ville du cours)
$configResult = $configurationService->getConnectionConfigForCours($coursId);

// Pour un examen (basé sur la ville de l'examen)
$configResult = $configurationService->getConnectionConfigForExamen($examenId);
```

**Format de retour**:
```php
[
    'dsn' => 'sqlsrv:Server=SERVER_IP;Database=BIOSTAR_TA;TrustServerCertificate=true',
    'username' => 'BIOSTAR_USERNAME',
    'password' => 'BIOSTAR_PASSWORD',
    'ville_id' => 1
]
```

---

## 🗄️ Structure de la table punchlog

La table `punchlog` est la **table principale** qui contient tous les enregistrements de pointage Biostar.

### Colonnes principales

| Colonne | Type | Description | Nullable | Index |
|---------|------|-------------|----------|-------|
| `id` | INT | Identifiant unique de l'enregistrement | ❌ Non | ✅ Primary |
| `user_id` | VARCHAR | Matricule de l'étudiant (format variable) | ✅ Oui | ✅ Index |
| `bsevtc` | VARCHAR | Code événement alternatif (peut contenir le matricule) | ✅ Oui | ✅ Index |
| `devdt` | DATETIME | **Date et heure du pointage côté device** ⭐ | ❌ Non | ✅ Index |
| `bsevtdt` | DATETIME | Date et heure du pointage côté serveur Biostar | ✅ Oui | - |
| `devid` | INT | Identifiant numérique du device Biostar | ✅ Oui | ✅ Index |
| `devnm` | VARCHAR | Nom du device Biostar (ex: "SALLE 101") | ✅ Oui | ✅ Index |
| `user_name` | VARCHAR | Nom de l'utilisateur | ✅ Oui | - |

> **⭐ Important**: La colonne `devdt` est utilisée pour toutes les requêtes de pointage.

### Notes importantes

#### 1. `devdt` vs `bsevtdt`

| Colonne | Description | Utilisation |
|---------|-------------|-------------|
| `devdt` | Heure enregistrée directement par le device | ✅ **Utilisée pour les requêtes** |
| `bsevtdt` | Heure enregistrée par le serveur Biostar | ⚠️ Peut avoir un décalage |

> **💡 Bonne pratique**: Toujours utiliser `devdt` pour les requêtes de pointage.

#### 2. Identification des étudiants

Le matricule peut être présent dans **deux colonnes** :
- `user_id` : Colonne principale
- `bsevtc` : Colonne alternative

> **⚠️ Attention**: Les deux colonnes sont vérifiées lors du matching avec les étudiants locaux.

#### 3. Filtrage des devices

Les devices de type **"TOUR"** et **"ACCES HCK"** sont **exclus par défaut** de toutes les requêtes.

```sql
WHERE devnm NOT LIKE 'TOUR%' 
  AND devnm NOT LIKE 'ACCES HCK%'
```

---

## 📊 Récupération des données de pointage

### Service principal: `BiostarAttendanceService`

Le service `BiostarAttendanceService` centralise toutes les opérations de récupération des données Biostar.

#### Méthode principale: `getAttendanceData()`

**Signature**:
```php
public function getAttendanceData(
    array $config,                    // Configuration de connexion
    string $date,                     // Date du pointage (YYYY-MM-DD)
    ?string $startTime = null,        // Heure de début (HH:MM ou HH:MM:SS)
    ?string $endTime = null,          // Heure de fin (HH:MM ou HH:MM:SS)
    ?array $studentIds = null,        // Liste optionnelle de matricules
    ?array $allowedDeviceIds = null,  // IDs de devices autorisés
    ?array $allowedDeviceNames = null // Noms de devices autorisés
): array
```

**Paramètres**:

| Paramètre | Type | Requis | Description |
|-----------|------|--------|-------------|
| `$config` | array | ✅ Oui | Configuration de connexion |
| `$date` | string | ✅ Oui | Date au format `YYYY-MM-DD` |
| `$startTime` | string\|null | ❌ Non | Heure de début (`HH:MM` ou `HH:MM:SS`) |
| `$endTime` | string\|null | ❌ Non | Heure de fin (`HH:MM` ou `HH:MM:SS`) |
| `$studentIds` | array\|null | ❌ Non | Liste de matricules à filtrer |
| `$allowedDeviceIds` | array\|null | ❌ Non | IDs des devices autorisés |
| `$allowedDeviceNames` | array\|null | ❌ Non | Noms des devices autorisés |

**Retour**:
```php
[
    'punches' => [...],                    // Liste des pointages
    'total_punches' => 150,                // Nombre total de pointages
    'students_with_punches' => 120,        // Nombre d'étudiants uniques
    'students_without_punches' => 0,       // Étudiants sans pointage
    'date' => '2024-01-15',
    'time_range' => [
        'start' => '08:00:00',
        'end' => '12:00:00'
    ]
]
```

### Format des pointages retournés

Chaque pointage est transformé en format standardisé :

```php
[
    'id' => 12345,                          // ID de l'enregistrement
    'student_id' => 'E123456',              // Matricule (user_id ou bsevtc)
    'bsevtc' => 'E123456',                  // Code événement
    'user_id' => 'E123456',                 // User ID original
    'user_name' => 'DUPONT Jean',           // Nom de l'utilisateur
    'punch_time' => '2024-01-15 08:30:00', // Heure du pointage (devdt)
    'bsevtdt' => '2024-01-15 08:30:00',    // Heure serveur
    'device' => '123',                      // ID du device (devid)
    'device_name' => 'SALLE 101',           // Nom du device (devnm)
    'devnm' => 'SALLE 101',                 // Nom du device (original)
    'devid' => '123',                       // ID du device (original)
    'location' => null                       // Non disponible dans punchlog
]
```

---

## 🔍 Requêtes SQL utilisées

### 1. Requête principale de récupération des pointages

**Requête optimisée avec fenêtre datetime** (utilisée dans `BiostarAttendanceService`):

```sql
SELECT 
    id,
    user_id,
    bsevtc,
    devdt,
    devid,
    devnm,
    bsevtdt,
    user_name
FROM punchlog 
WHERE devdt BETWEEN ? AND ?
  AND devnm NOT LIKE 'TOUR%' 
  AND devnm NOT LIKE 'ACCES HCK%'
ORDER BY devdt ASC
```

**Paramètres**:
- `?` (premier): Date/heure de début formatée (ex: `2024-01-15 07:00:00`)
- `?` (deuxième): Date/heure de fin formatée (ex: `2024-01-15 13:00:00`)

**Avantages**:
- ✅ Utilise une fenêtre datetime continue (plus performant)
- ✅ Gère automatiquement les pointages qui passent minuit
- ✅ Filtre les devices non pertinents (TOUR, ACCES HCK)

### 2. Requête avec filtrage par étudiants

```sql
SELECT 
    id,
    user_id,
    bsevtc,
    devdt,
    devid,
    devnm,
    bsevtdt,
    user_name
FROM punchlog 
WHERE devdt BETWEEN ? AND ?
  AND devnm NOT LIKE 'TOUR%' 
  AND devnm NOT LIKE 'ACCES HCK%'
  AND (user_id IN (?, ?, ?) OR bsevtc IN (?, ?, ?))
ORDER BY devdt ASC
```

**Paramètres**:
- `?` (1-2): Date/heure de début et fin
- `?` (3-N): Liste des matricules (doublée pour user_id et bsevtc)

### 3. Requête avec filtrage par date et heure séparées

**Ancienne méthode** (utilisée dans `RattrapageController`):

```sql
SELECT * 
FROM punchlog 
WHERE CAST(devdt AS date) = CAST(:date AS date) 
  AND CAST(devdt AS time) BETWEEN CAST(:heure1 AS time) AND CAST(:heure2 AS time)
  AND devnm NOT LIKE 'TOUR%' 
  AND devnm NOT LIKE 'ACCES HCK%'
```

**Paramètres**:
- `:date`: Date au format `YYYY-MM-DD`
- `:heure1`: Heure de début au format `HH:MM:SS`
- `:heure2`: Heure de fin au format `HH:MM:SS`

### 4. Requête de statistiques

```sql
-- Nombre total de pointages pour une date
SELECT COUNT(*) as total_punches 
FROM punchlog 
WHERE CAST(devdt AS DATE) = ?

-- Nombre d'étudiants uniques
SELECT COUNT(DISTINCT COALESCE(user_id, bsevtc)) as unique_students 
FROM punchlog 
WHERE CAST(devdt AS DATE) = ?

-- Liste des devices utilisés
SELECT DISTINCT devnm 
FROM punchlog 
WHERE CAST(devdt AS DATE) = ? 
  AND devnm IS NOT NULL

-- Plage horaire (premier et dernier pointage)
SELECT MIN(devdt) as first_punch, MAX(devdt) as last_punch 
FROM punchlog 
WHERE CAST(devdt AS DATE) = ?
```

### 5. Requête de test de connexion

```sql
SELECT TOP 1 * FROM punchlog
```

> **💡 Note**: Cette requête simple permet de vérifier que la connexion fonctionne et que la table contient des données.

---

## ⚡ Fonctionnalités avancées

### Gestion des décalages horaires

#### Problème

Le serveur Biostar peut avoir un **décalage horaire** par rapport à l'heure réelle. Par défaut, le serveur est en retard de **60 minutes** (sauf pour Rabat).

#### Solution implémentée

L'application applique un **offset de -60 minutes** lors de la construction de la fenêtre de requête :

```php
// Offset par défaut: -60 minutes (serveur en retard d'1h)
$offsetMinutes = -60;

// Cas spécial pour Rabat (offset = 0)
if ($villeName === 'rabat') {
    $offsetMinutes = 0;
}

// Construire la fenêtre datetime côté client
$startClientDt = new \DateTime("{$normalizedDate} {$hourStartWithSec}");
$endClientDt = new \DateTime("{$normalizedDate} {$hourEndWithSec}");

// Appliquer l'offset au serveur Biostar
$startServerDt = (clone $startClientDt)->modify("{$offsetMinutes} minutes");
$endServerDt = (clone $endClientDt)->modify("{$offsetMinutes} minutes");

// Si la fenêtre passe minuit côté serveur, étendre la date de fin
if ($endServerDt < $startClientDt) {
    $endServerDt->modify('+1 day');
}
```

#### Exemple

**Scénario**: Cours de 08:00 à 12:00, serveur Biostar en retard de 1h

| Étape | Heure côté client | Heure côté serveur | Action |
|-------|-------------------|-------------------|--------|
| 1 | 08:00 - 12:00 | 07:00 - 11:00 | Requête Biostar |
| 2 | - | Pointages récupérés | Matching avec étudiants |
| 3 | 08:00 - 12:00 | - | Affichage correct |

#### Cas spéciaux par ville

| Ville | Offset | Description |
|-------|--------|-------------|
| **Casablanca/Casa** | +60 minutes | Ajouté côté front-end |
| **Rabat** | 0 minutes | Pas de décalage |
| **Autres villes** | -60 minutes | Défaut |

### Filtrage par devices

#### Principe

Les cours et examens peuvent être associés à des **salles spécifiques**, et chaque salle peut avoir un ou plusieurs devices Biostar assignés. Le système filtre automatiquement les pointages pour ne garder que ceux provenant des devices autorisés.

#### Processus de filtrage

1. **Récupération des devices autorisés**:
   - Pour un cours: devices des salles associées au cours
   - Pour un examen: devices des salles associées à l'examen

2. **Normalisation**:
   - Les noms de devices sont normalisés (trim + lowercase)
   - Les IDs sont convertis en string

3. **Matching**:
   - ✅ Priorité au matching par `devid` (ID numérique)
   - ✅ Fallback sur le matching par `devnm` (nom du device)
   - ✅ Comparaison case-insensitive pour les noms

#### Code de filtrage

```php
if ($allowedDeviceIds !== null || $allowedDeviceNames !== null) {
    $filteredPunches = [];
    
    foreach ($punches as $punch) {
        $matched = false;
        $punchDevId = (string)($punch['devid'] ?? '');
        $punchName = strtolower(trim($punch['devnm'] ?? ''));
        
        // Match par devid (prioritaire)
        if (!empty($normalizedDeviceIds) && $punchDevId) {
            if (in_array($punchDevId, $normalizedDeviceIds, true)) {
                $matched = true;
            }
        }
        
        // Match par nom (fallback)
        if (!$matched && !empty($normalizedDeviceNames) && $punchName) {
            if (in_array($punchName, $normalizedDeviceNames, true)) {
                $matched = true;
            }
        }
        
        if ($matched) {
            $filteredPunches[] = $punch;
        }
    }
    
    $punches = $filteredPunches;
}
```

#### Cas particuliers

| Cas | Comportement |
|-----|--------------|
| **Cours sans devices assignés** | ✅ Tous les pointages acceptés (pas de filtrage) |
| **Cours avec salles mais sans devices** | ✅ Tous les pointages acceptés (pas de filtrage) |
| **Tableaux vides passés** | ❌ Aucun pointage accepté (filtrage strict) |

---

## 💻 Exemples d'utilisation

### 1. Récupérer les pointages pour un cours

```php
use App\Services\BiostarAttendanceService;
use App\Services\ConfigurationService;

$biostarService = new BiostarAttendanceService();
$configService = new ConfigurationService();

// Récupérer la configuration pour le cours
$config = $configService->getConnectionConfigForCours($coursId);

// Récupérer les données de pointage
$attendanceData = $biostarService->getAttendanceData(
    $config,
    '2024-01-15',           // Date du cours
    '08:00:00',             // Heure de début
    '12:00:00',             // Heure de fin
    null,                   // Tous les étudiants
    $allowedDeviceIds,      // IDs des devices autorisés
    $allowedDeviceNames     // Noms des devices autorisés
);

// Traiter les résultats
foreach ($attendanceData['punches'] as $punch) {
    echo "Étudiant: {$punch['student_id']}, Heure: {$punch['punch_time']}, Device: {$punch['device_name']}\n";
}
```

### 2. Récupérer les pointages pour un examen

**Via l'API REST**:
```http
GET /api/biostar/attendance/examen
```

**Paramètres**:
- `examen_id` (required): ID de l'examen
- `date` (required): Date au format `YYYY-MM-DD`
- `start_time` (optional): Heure de début `HH:MM:SS`
- `end_time` (optional): Heure de fin `HH:MM:SS`
- `student_ids` (optional): Tableau de matricules `["E123456", "E789012"]`

### 3. Tester la connexion Biostar

```php
use App\Services\BiostarAttendanceService;

$biostarService = new BiostarAttendanceService();
$config = [
    'dsn' => 'sqlsrv:Server=SERVER_IP;Database=BIOSTAR_TA;TrustServerCertificate=true',
    'username' => 'BIOSTAR_USERNAME',
    'password' => 'BIOSTAR_PASSWORD'
];

$result = $biostarService->testConnection($config);

if ($result['success']) {
    echo "✅ Connexion réussie !\n";
} else {
    echo "❌ Erreur: {$result['message']}\n";
}
```

> **📝 Paramètres à configurer**:
> - `SERVER_IP`: Adresse IP du serveur SQL Server
> - `BIOSTAR_USERNAME`: Nom d'utilisateur Biostar
> - `BIOSTAR_PASSWORD`: Mot de passe Biostar

### 4. Récupérer les statistiques

```php
$statistics = $biostarService->getStatistics($config, '2024-01-15');

echo "Total pointages: {$statistics['total_punches']}\n";
echo "Étudiants uniques: {$statistics['unique_students']}\n";
echo "Devices utilisés: " . implode(', ', $statistics['devices_used']) . "\n";
echo "Premier pointage: {$statistics['time_range']['first_punch']}\n";
echo "Dernier pointage: {$statistics['time_range']['last_punch']}\n";
```

### 5. Récupérer la liste des devices

```php
// Récupérer tous les devices
$devices = $biostarService->getDevices($config);

// Récupérer les devices d'un groupe spécifique
$devices = $biostarService->getDevices($config, [1, 2, 3]); // IDs des groupes

foreach ($devices as $device) {
    echo "Device ID: {$device['devid']}, Nom: {$device['devnm']}\n";
}
```

### 6. Requête directe avec PDO

```php
// Configuration de connexion
$serverIp = 'SERVER_IP';           // Adresse IP du serveur SQL Server
$database = 'BIOSTAR_TA';           // Nom de la base de données
$username = 'BIOSTAR_USERNAME';     // Nom d'utilisateur
$password = 'BIOSTAR_PASSWORD';     // Mot de passe

$dsn = "sqlsrv:Server={$serverIp};Database={$database};TrustServerCertificate=true";
$pdo = new PDO($dsn, $username, $password);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

$sql = "
    SELECT user_id, devdt, devnm 
    FROM punchlog 
    WHERE CAST(devdt AS DATE) = ?
      AND CAST(devdt AS TIME) BETWEEN ? AND ?
      AND devnm NOT LIKE 'TOUR%'
    ORDER BY devdt ASC
";

$stmt = $pdo->prepare($sql);
$stmt->execute(['2024-01-15', '08:00:00', '12:00:00']);
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($results as $row) {
    echo "User: {$row['user_id']}, Heure: {$row['devdt']}, Device: {$row['devnm']}\n";
}
```

> **⚠️ Important**: Utilisez toujours des requêtes préparées pour éviter les injections SQL.

---

## 🌐 Endpoints API disponibles

### 1. Récupérer les pointages d'un cours

```http
GET /api/biostar/attendance/cours
```

**Paramètres**:
- `cours_id` (required): ID du cours
- `date` (required): Date au format `YYYY-MM-DD`
- `start_time` (optional): Heure de début `HH:MM:SS`
- `end_time` (optional): Heure de fin `HH:MM:SS`
- `student_ids` (optional): Tableau de matricules

### 2. Récupérer les pointages d'un examen

```http
GET /api/biostar/attendance/examen
```

**Paramètres**:
- `examen_id` (required): ID de l'examen
- `date` (required): Date au format `YYYY-MM-DD`
- `start_time` (optional): Heure de début `HH:MM:SS`
- `end_time` (optional): Heure de fin `HH:MM:SS`
- `student_ids` (optional): Tableau de matricules

### 3. Récupérer les pointages par ville

```http
GET /api/biostar/attendance/ville
```

**Paramètres**:
- `ville_id` (required): ID de la ville
- `date` (required): Date au format `YYYY-MM-DD`
- `start_time` (optional): Heure de début `HH:MM:SS`
- `end_time` (optional): Heure de fin `HH:MM:SS`
- `student_ids` (optional): Tableau de matricules

### 4. Tester la connexion

```http
GET /api/biostar/test-connection
```

**Paramètres**:
- `ville_id` (required): ID de la ville

### 5. Récupérer les statistiques

```http
GET /api/biostar/statistics
```

**Paramètres**:
- `ville_id` (required): ID de la ville
- `date` (required): Date au format `YYYY-MM-DD`

### 6. Récupérer les devices

```http
GET /api/biostar/devices
```

**Paramètres**:
- `ville_id` (required): ID de la ville
- `device_group_ids` (optional): Tableau d'IDs de groupes

### 7. Récupérer les groupes de devices

```http
GET /api/biostar/device-groups
```

**Paramètres**:
- `ville_id` (required): ID de la ville

---

## ✅ Bonnes pratiques

1. **✅ Toujours utiliser le service `BiostarAttendanceService`** plutôt que des requêtes directes
2. **✅ Gérer les erreurs de connexion** avec des try-catch appropriés
3. **✅ Utiliser les offsets horaires** pour compenser les décalages du serveur Biostar
4. **✅ Filtrer par devices** lorsque les salles sont définies
5. **✅ Normaliser les matricules** lors du matching (trim, uppercase)
6. **✅ Logger les opérations** pour faciliter le débogage
7. **✅ Utiliser des requêtes préparées** pour éviter les injections SQL
8. **✅ Vérifier la configuration** avant chaque connexion
9. **✅ Implémenter un système de cache** pour les configurations fréquemment utilisées
10. **✅ Documenter les offsets horaires** spécifiques à chaque ville

---

## 🔧 Dépannage

### ❌ Problème: Connexion échoue

**Symptômes**:
- Erreur PDO lors de la connexion
- Timeout de connexion
- Erreur "Login failed"

**Solutions**:

1. **Vérifier la connectivité réseau**:
   ```bash
   ping SERVER_IP
   telnet SERVER_IP 1433
   ```

2. **Vérifier les credentials**:
   ```php
   // Vérifier dans la table configuration
   $config = Configuration::where('ville_id', $villeId)->first();
   // Vérifier: sqlsrv, database, biostar_username, biostar_password
   ```

3. **Vérifier le driver PHP**:
   ```bash
   php -m | grep sqlsrv
   ```

4. **Vérifier le firewall**:
   - Port SQL Server (1433) doit être ouvert
   - Règles réseau doivent autoriser les connexions distantes

5. **Vérifier la configuration SQL Server**:
   - SQL Server doit accepter les connexions distantes
   - TCP/IP doit être activé

### ❌ Problème: Aucun pointage retourné

**Symptômes**:
- Requête réussie mais tableau vide
- Aucun résultat trouvé

**Solutions**:

1. **Vérifier la date et les heures**:
   ```php
   // Vérifier que la date est correcte
   $date = '2024-01-15'; // Format YYYY-MM-DD
   $startTime = '08:00:00'; // Format HH:MM:SS
   $endTime = '12:00:00';
   ```

2. **Vérifier l'offset horaire**:
   ```php
   // Le serveur peut être décalé
   // Vérifier l'offset configuré pour la ville
   $offsetMinutes = -60; // Par défaut
   ```

3. **Vérifier le filtrage des devices**:
   ```php
   // Les devices peuvent être filtrés
   // Vérifier $allowedDeviceIds et $allowedDeviceNames
   ```

4. **Vérifier les devices exclus**:
   ```sql
   -- Les devices "TOUR" et "ACCES HCK" sont exclus
   -- Vérifier que les devices ne commencent pas par ces préfixes
   SELECT DISTINCT devnm FROM punchlog 
   WHERE CAST(devdt AS DATE) = '2024-01-15'
   ```

### ❌ Problème: Matching des étudiants échoue

**Symptômes**:
- Pointages présents dans Biostar mais non associés aux étudiants
- Erreurs de matching

**Solutions**:

1. **Vérifier le format des matricules**:
   ```php
   // Normaliser les matricules
   $matricule = strtoupper(trim($matricule));
   ```

2. **Vérifier les deux colonnes**:
   ```php
   // Le matricule peut être dans user_id ou bsevtc
   $studentPunch = collect($biostarResults)->firstWhere('user_id', $matricule);
   if (!$studentPunch) {
       $studentPunch = collect($biostarResults)->firstWhere('bsevtc', $matricule);
   }
   ```

3. **Vérifier les espaces et caractères spéciaux**:
   ```php
   // Supprimer les espaces et caractères invisibles
   $matricule = preg_replace('/\s+/', '', $matricule);
   ```

4. **Logger les échecs de matching**:
   ```php
   \Log::warning('Matching échoué', [
       'matricule' => $matricule,
       'biostar_user_ids' => array_slice(array_unique(array_column($biostarResults, 'user_id')), 0, 10)
   ]);
   ```

---

## 📚 Conclusion

Cette documentation couvre l'utilisation complète de **Biostar** dans le système de gestion des absences. 

**Pour toute question ou problème**:
- 📖 Consulter les logs de l'application (`storage/logs/laravel.log`)
- 💬 Contacter l'équipe de développement
- 🐛 Ouvrir un ticket sur le système de suivi des bugs

---

**Documentation générée le**: 2024  
**Version**: 1.0  
**Maintenu par**: Équipe de développement
