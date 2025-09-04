# Gestion des Absences - AbsenceController et AbsenceService

Ce document décrit l'utilisation du `AbsenceController` et du `AbsenceService` pour la gestion des absences dans l'application.

## Vue d'ensemble

Le système de gestion des absences permet de :
- Créer, lire, mettre à jour et supprimer des absences
- Rechercher des absences par différents critères
- Gérer la pagination et les filtres avancés
- Justifier des absences
- Obtenir des statistiques détaillées
- Gérer les relations avec les étudiants, cours et examens

## Structure des fichiers

```
app/
├── Http/Controllers/
│   └── AbsenceController.php
├── Services/
│   └── AbsenceService.php
└── Models/
    └── Absence.php

database/
└── seeders/
    └── AbsenceSeeder.php
```

## API Endpoints

### Routes principales (API Resource)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/absences` | Liste paginée des absences avec filtres |
| POST | `/api/absences` | Créer une nouvelle absence |
| GET | `/api/absences/{id}` | Afficher une absence spécifique |
| PUT | `/api/absences/{id}` | Mettre à jour une absence |
| DELETE | `/api/absences/{id}` | Supprimer une absence |

### Routes supplémentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/absences/search?search={term}` | Rechercher des absences |
| GET | `/api/absences/all` | Toutes les absences (sans pagination) |
| GET | `/api/absences/etudiant/{id}` | Absences d'un étudiant |
| GET | `/api/absences/cours/{id}` | Absences d'un cours |
| GET | `/api/absences/examen/{id}` | Absences d'un examen |
| PUT | `/api/absences/{id}/justifier` | Justifier une absence |
| GET | `/api/absences/statistics` | Statistiques des absences |

## Utilisation du AbsenceController

### Exemple de création d'une absence

```php
// Dans un autre contrôleur ou service
use App\Http\Controllers\AbsenceController;

$absenceController = new AbsenceController($absenceService);

// Créer une absence
$request = new Request([
    'type_absence' => 'Maladie',
    'etudiant_id' => 1,
    'cours_id' => 5,
    'date_absence' => '2025-01-27',
    'justifiee' => false,
    'motif' => 'Grippe'
]);
$response = $absenceController->store($request);
```

### Exemple de justification d'une absence

```php
// Justifier une absence
$request = new Request([
    'justifiee' => true,
    'motif' => 'Certificat médical fourni',
    'justificatif' => 'certificat_medical.pdf'
]);
$response = $absenceController->justifier($request, $absenceId);
```

## Utilisation du AbsenceService

### Exemple d'utilisation directe

```php
use App\Services\AbsenceService;

$absenceService = new AbsenceService();

// Créer une absence
$absence = $absenceService->createAbsence([
    'type_absence' => 'Retard',
    'etudiant_id' => 1,
    'cours_id' => 5,
    'date_absence' => '2025-01-27',
    'justifiee' => false
]);

// Rechercher des absences
$absences = $absenceService->searchAbsences('Maladie');

// Obtenir les absences d'un étudiant
$absences = $absenceService->getAbsencesByEtudiant(1);

// Justifier une absence
$absence = $absenceService->justifierAbsence(1, [
    'justifiee' => true,
    'motif' => 'Justification acceptée'
]);
```

## Méthodes du AbsenceService

### Méthodes de base

- `getAllAbsences()` : Obtenir toutes les absences
- `getAbsenceById(int $id)` : Obtenir une absence par ID
- `createAbsence(array $data)` : Créer une nouvelle absence
- `updateAbsence(int $id, array $data)` : Mettre à jour une absence
- `deleteAbsence(int $id)` : Supprimer une absence

### Méthodes de recherche et filtrage

- `searchAbsences(string $searchTerm)` : Rechercher des absences
- `getAbsencesPaginated(int $perPage, int $page)` : Absences avec pagination
- `getAbsencesByEtudiant(int $etudiantId)` : Absences par étudiant
- `getAbsencesByCours(int $coursId)` : Absences par cours
- `getAbsencesByExamen(int $examenId)` : Absences par examen
- `getAbsencesByDateRange(string $dateDebut, string $dateFin)` : Absences par période
- `getAbsencesByType(string $type)` : Absences par type
- `getAbsencesByJustification(bool $justifiee)` : Absences justifiées/non justifiées

### Méthodes spécialisées

- `justifierAbsence(int $id, array $data)` : Justifier une absence
- `getAbsencesByEtudiantAndDateRange(int $etudiantId, string $dateDebut, string $dateFin)` : Absences étudiant + période
- `getAbsencesByCoursAndDateRange(int $coursId, string $dateDebut, string $dateFin)` : Absences cours + période
- `createMultipleAbsences(array $absencesData)` : Créer plusieurs absences
- `getAbsencesWithStudentDetails()` : Absences avec détails étudiants

### Méthodes de statistiques

- `getAbsenceStatistics()` : Statistiques complètes des absences
- `getAbsencesCount()` : Nombre total d'absences
- `getJustifiedAbsencesCount()` : Nombre d'absences justifiées
- `getUnjustifiedAbsencesCount()` : Nombre d'absences non justifiées
- `getAbsencesCountByEtudiant(int $etudiantId)` : Nombre d'absences par étudiant
- `getAbsencesCountByCours(int $coursId)` : Nombre d'absences par cours
- `getAbsencesCountByExamen(int $examenId)` : Nombre d'absences par examen

## Validation

### Règles de validation pour la création

```php
'type_absence' => 'required|string|max:255',
'etudiant_id' => 'required|exists:etudiants,id',
'cours_id' => 'nullable|exists:cours,id',
'examen_id' => 'nullable|exists:examens,id',
'date_absence' => 'required|date',
'justifiee' => 'boolean',
'motif' => 'nullable|string|max:500',
'justificatif' => 'nullable|string|max:255'
```

### Règles de validation pour la justification

```php
'justifiee' => 'required|boolean',
'motif' => 'nullable|string|max:500',
'justificatif' => 'nullable|string|max:255'
```

## Relations

Le modèle `Absence` a plusieurs relations :

```php
// Relations BelongsTo
public function etudiant(): BelongsTo
{
    return $this->belongsTo(Etudiant::class);
}

public function cours(): BelongsTo
{
    return $this->belongsTo(Cours::class);
}

public function examen(): BelongsTo
{
    return $this->belongsTo(Examen::class);
}
```

## Tests

Les tests ont été supprimés car le projet utilise principalement les seeders pour la gestion des données de test.

## Seeding

### Types d'absences par défaut

Le `AbsenceSeeder` peut créer des absences avec les types suivants :
- Maladie
- Retard
- Absence non justifiée
- Motif familial
- Rendez-vous médical
- Transport

### Exécuter le seeder

```bash
php artisan db:seed --class=AbsenceSeeder
```

## Factory

Les factories ne sont pas utilisées dans ce projet. Les données de test sont gérées via les seeders.

## Gestion des erreurs

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `404` : Absence non trouvée
- `422` : Erreur de validation

### Messages d'erreur

- "Absence non trouvée" : Quand l'ID n'existe pas
- "Terme de recherche requis" : Quand le paramètre de recherche est manquant
- "Au moins un cours ou un examen doit être spécifié" : Validation métier
- Erreurs de validation Laravel pour les champs invalides

## Sécurité

- Validation des données d'entrée
- Vérification de l'existence des entités liées
- Protection contre les injections SQL via Eloquent
- Validation des types de données

## Performance

- Pagination des résultats
- Requêtes optimisées avec Eloquent et eager loading
- Index sur les colonnes clés recommandés
- Cache possible pour les statistiques fréquemment consultées

## Cas d'usage typiques

### Gestion quotidienne

- Enregistrement des absences lors des cours
- Justification des absences par les étudiants
- Suivi des motifs d'absence
- Gestion des justificatifs

### Reporting et analyse

- Statistiques d'absentéisme par étudiant
- Analyse des absences par cours ou examen
- Suivi des taux de justification
- Rapports mensuels et trimestriels

### Filtrage avancé

- Absences par période (semaine, mois, trimestre)
- Absences par type (maladie, retard, etc.)
- Absences justifiées vs non justifiées
- Absences par établissement ou promotion

## Exemples d'objets JSON pour Postman

### Créer une absence
```json
{
    "type_absence": "Maladie",
    "etudiant_id": 1,
    "cours_id": 5,
    "date_absence": "2025-01-27",
    "justifiee": false,
    "motif": "Grippe"
}
```

### Justifier une absence
```json
{
    "justifiee": true,
    "motif": "Certificat médical fourni",
    "justificatif": "certificat_medical.pdf"
}
```

### Réponse de création
```json
{
    "message": "Absence ajoutée avec succès",
    "absence": {
        "id": 1,
        "type_absence": "Maladie",
        "etudiant_id": 1,
        "cours_id": 5,
        "date_absence": "2025-01-27",
        "justifiee": false,
        "motif": "Grippe",
        "created_at": "2025-01-27T10:00:00.000000Z",
        "updated_at": "2025-01-27T10:00:00.000000Z"
    }
}
```

### Statistiques des absences
```json
{
    "statistics": {
        "total": 150,
        "justified": 120,
        "unjustified": 30,
        "justification_rate": 80.0,
        "monthly_stats": [...],
        "type_stats": [...],
        "student_stats": [...]
    },
    "status": 200
}
``` 