# Auto-sélection des Configurations Biostar par Ville

## Vue d'ensemble

Cette implémentation ajoute un système d'auto-sélection des configurations Biostar basé sur la ville associée aux cours et examens. Le système charge automatiquement la configuration appropriée et récupère les données de pointage en temps réel depuis la base de données Biostar.

## Fonctionnalités

### 1. Auto-sélection des Configurations

- **Pour les cours** : Le système identifie automatiquement la ville du cours et charge la configuration Biostar correspondante
- **Pour les examens** : Le système identifie automatiquement la ville de l'examen et charge la configuration Biostar correspondante
- **Gestion des erreurs** : Notifications appropriées si aucune configuration n'est trouvée

### 2. Récupération Automatique des Données de Pointage

- **Synchronisation temps réel** : Les données de pointage sont récupérées depuis Biostar et intégrées avec les étudiants
- **Calcul automatique des statuts** : Les statuts de présence sont recalculés avec les données Biostar
- **Mise à jour des statistiques** : Les statistiques sont automatiquement mises à jour

## Architecture

### Backend (Laravel)

#### Services

**ConfigurationService** (`app/Services/ConfigurationService.php`)
- `getConfigurationForVille($villeId)` : Récupère la configuration pour une ville spécifique
- `getConfigurationForCours($coursId)` : Récupère la configuration pour un cours
- `getConfigurationForExamen($examenId)` : Récupère la configuration pour un examen
- `getConnectionConfigForVille($villeId)` : Récupère la configuration de connexion pour une ville
- `getConnectionConfigForCours($coursId)` : Récupère la configuration de connexion pour un cours
- `getConnectionConfigForExamen($examenId)` : Récupère la configuration de connexion pour un examen

**BiostarAttendanceService** (`app/Services/BiostarAttendanceService.php`)
- `getAttendanceData($config, $date, $startTime, $endTime, $studentIds)` : Récupère les données de pointage depuis Biostar
- `testConnection($config)` : Teste la connexion à la base Biostar
- `getStatistics($config, $date)` : Récupère les statistiques de pointage
- `getPunchDataForStudents($config, $studentIds, $date, $startTime, $endTime)` : Récupère les pointages pour des étudiants spécifiques

#### Contrôleurs

**ConfigurationController** (`app/Http/Controllers/ConfigurationController.php`)
- Nouvelles méthodes pour l'auto-sélection des configurations
- Gestion des configurations par ville, cours et examen

**BiostarAttendanceController** (`app/Http/Controllers/BiostarAttendanceController.php`)
- `getCoursAttendance()` : Récupère les données de pointage pour un cours
- `getExamenAttendance()` : Récupère les données de pointage pour un examen
- `getAttendanceByVille()` : Récupère les données de pointage pour une ville
- `testConnection()` : Teste la connexion Biostar
- `getStatistics()` : Récupère les statistiques de pointage

#### Routes API

```php
// Auto-selection routes for configuration based on ville
Route::get('configuration/for-ville/{villeId}', [ConfigurationController::class, 'getConfigurationForVille']);
Route::get('configuration/for-cours/{coursId}', [ConfigurationController::class, 'getConfigurationForCours']);
Route::get('configuration/for-examen/{examenId}', [ConfigurationController::class, 'getConfigurationForExamen']);
Route::get('configuration/connection/for-ville/{villeId}', [ConfigurationController::class, 'getConnectionConfigForVille']);
Route::get('configuration/connection/for-cours/{coursId}', [ConfigurationController::class, 'getConnectionConfigForCours']);
Route::get('configuration/connection/for-examen/{examenId}', [ConfigurationController::class, 'getConnectionConfigForExamen']);

// Biostar attendance routes
Route::get('biostar-attendance/cours', [BiostarAttendanceController::class, 'getCoursAttendance']);
Route::get('biostar-attendance/examen', [BiostarAttendanceController::class, 'getExamenAttendance']);
Route::get('biostar-attendance/ville', [BiostarAttendanceController::class, 'getAttendanceByVille']);
Route::get('biostar-attendance/test-connection', [BiostarAttendanceController::class, 'testConnection']);
Route::get('biostar-attendance/statistics', [BiostarAttendanceController::class, 'getStatistics']);
```

### Frontend (Angular)

#### Services

**ConfigurationAutoService** (`src/app/services/configuration-auto.service.ts`)
- Gestion de l'auto-sélection des configurations
- Observable pour suivre la configuration actuelle
- Méthodes pour vérifier la disponibilité des configurations

**BiostarAttendanceService** (`src/app/services/biostar-attendance.service.ts`)
- Interface avec l'API Biostar
- Récupération des données de pointage
- Synchronisation avec les cours et examens

#### Composants

**AttendanceCoursComponent** (`src/app/components/attendance-cours/attendance-cours.component.ts`)
- Auto-sélection de la configuration lors du chargement du cours
- Récupération automatique des données de pointage depuis Biostar
- Intégration des données Biostar avec les étudiants
- Recalcul automatique des statuts et statistiques

**AttendanceComponent** (`src/app/components/attendance/attendance.component.ts`)
- Auto-sélection de la configuration lors du chargement de l'examen
- Récupération automatique des données de pointage depuis Biostar
- Intégration des données Biostar avec les étudiants
- Recalcul automatique des statuts et statistiques

## Utilisation

### 1. Configuration des Villes

Avant d'utiliser la fonctionnalité, assurez-vous que chaque ville a une configuration Biostar configurée :

1. Accédez à la page de configuration
2. Créez une configuration pour chaque ville avec les paramètres Biostar appropriés
3. Testez la connexion pour chaque configuration

### 2. Utilisation avec les Cours

1. Naviguez vers un cours spécifique
2. Le système charge automatiquement la configuration Biostar de la ville du cours
3. Les données de pointage sont récupérées et intégrées automatiquement
4. Les statuts de présence sont calculés en temps réel

### 3. Utilisation avec les Examens

1. Naviguez vers un examen spécifique
2. Le système charge automatiquement la configuration Biostar de la ville de l'examen
3. Les données de pointage sont récupérées et intégrées automatiquement
4. Les statuts de présence sont calculés en temps réel

## Flux de Données

### Pour les Cours

1. **Chargement du composant** → Récupération de l'ID du cours
2. **Auto-sélection** → Identification de la ville du cours → Chargement de la configuration Biostar
3. **Récupération des données** → Connexion à Biostar → Récupération des pointages
4. **Intégration** → Association des pointages avec les étudiants → Recalcul des statuts
5. **Mise à jour** → Actualisation des statistiques et de l'interface

### Pour les Examens

1. **Chargement du composant** → Récupération des paramètres de l'examen
2. **Auto-sélection** → Identification de la ville de l'examen → Chargement de la configuration Biostar
3. **Récupération des données** → Connexion à Biostar → Récupération des pointages
4. **Intégration** → Association des pointages avec les étudiants → Recalcul des statuts
5. **Mise à jour** → Actualisation des statistiques et de l'interface

## Gestion des Erreurs

### Configuration Manquante

- **Notification** : "Configuration manquante"
- **Message** : "Aucune configuration Biostar trouvée pour la ville de ce cours/examen"
- **Impact** : Les données de pointage ne seront pas disponibles

### Erreur de Connexion

- **Notification** : "Données de pointage indisponibles"
- **Message** : "Impossible de récupérer les données de pointage depuis Biostar"
- **Action** : Vérifier la configuration et la connectivité

### Données Introuvables

- **Notification** : Information normale
- **Message** : "Aucun pointage trouvé pour cette période"
- **Impact** : Tous les étudiants seront marqués comme absents

## Avantages

1. **Automatisation** : Plus besoin de sélectionner manuellement la configuration
2. **Temps réel** : Données de pointage toujours à jour
3. **Fiabilité** : Gestion automatique des erreurs et notifications
4. **Performance** : Chargement optimisé des données
5. **Flexibilité** : Support pour plusieurs villes avec configurations différentes

## Maintenance

### Vérification des Configurations

- Vérifiez régulièrement que toutes les villes ont des configurations valides
- Testez les connexions Biostar périodiquement
- Surveillez les logs pour détecter les erreurs de connexion

### Mise à Jour des Données

- Les données de pointage sont récupérées automatiquement
- L'actualisation automatique fonctionne toutes les 30 secondes
- Les utilisateurs peuvent forcer une actualisation manuelle

### Monitoring

- Surveillez les notifications d'erreur dans l'interface
- Vérifiez les logs backend pour les erreurs de connexion
- Contrôlez les performances des requêtes Biostar
