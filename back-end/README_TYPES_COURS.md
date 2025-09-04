# Gestion des Types de Cours - TypeCoursController et TypeCoursService

Ce document décrit l'utilisation du `TypeCoursController` et du `TypeCoursService` pour la gestion des types de cours dans l'application.

## Vue d'ensemble

Le système de gestion des types de cours permet de :
- Créer, lire, mettre à jour et supprimer des types de cours
- Rechercher des types de cours par nom
- Gérer la pagination des résultats
- Valider l'unicité des noms de types de cours
- Filtrer les types de cours par établissement et faculté
- Gérer les relations avec les cours

## Structure des fichiers

```
app/
├── Http/Controllers/
│   └── TypeCoursController.php
├── Services/
│   └── TypeCoursService.php
└── Models/
    └── TypeCours.php

database/
└── seeders/
    └── TypeCoursSeeder.php
```

## API Endpoints

### Routes principales (API Resource)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/types-cours` | Liste paginée des types de cours |
| POST | `/api/types-cours` | Créer un nouveau type de cours |
| GET | `/api/types-cours/{id}` | Afficher un type de cours spécifique |
| PUT | `/api/types-cours/{id}` | Mettre à jour un type de cours |
| DELETE | `/api/types-cours/{id}` | Supprimer un type de cours |

### Routes supplémentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/types-cours/search?search={term}` | Rechercher des types de cours par nom |
| GET | `/api/types-cours/all` | Obtenir tous les types de cours (sans pagination) |
| GET | `/api/types-cours/etablissement/{id}` | Types de cours par établissement |
| GET | `/api/types-cours/faculte/{id}` | Types de cours par faculté |
| GET | `/api/types-cours/with-cours-count` | Types de cours avec nombre de cours |

## Utilisation du TypeCoursController

### Exemple de création d'un type de cours

```php
// Dans un autre contrôleur ou service
use App\Http\Controllers\TypeCoursController;

$typeCoursController = new TypeCoursController($typeCoursService);

// Créer un type de cours
$request = new Request(['name' => 'Cours magistral']);
$response = $typeCoursController->store($request);
```

### Exemple de mise à jour d'un type de cours

```php
// Mettre à jour un type de cours
$request = new Request(['name' => 'Cours magistral avancé']);
$response = $typeCoursController->update($request, $typeCoursId);
```

## Utilisation du TypeCoursService

### Exemple d'utilisation directe

```php
use App\Services\TypeCoursService;

$typeCoursService = new TypeCoursService();

// Créer un type de cours
$typeCours = $typeCoursService->createTypeCours(['name' => 'Travaux pratiques']);

// Rechercher des types de cours
$typesCours = $typeCoursService->searchTypesCours('pratique');

// Obtenir un type de cours par ID
$typeCours = $typeCoursService->getTypeCoursById(1);

// Mettre à jour un type de cours
$updatedTypeCours = $typeCoursService->updateTypeCours(1, ['name' => 'Travaux dirigés']);

// Supprimer un type de cours
$deleted = $typeCoursService->deleteTypeCours(1);
```

## Méthodes du TypeCoursService

### Méthodes de base

- `getAllTypesCours()` : Obtenir tous les types de cours
- `getTypeCoursById(int $id)` : Obtenir un type de cours par ID
- `getTypeCoursByName(string $name)` : Obtenir un type de cours par nom
- `createTypeCours(array $data)` : Créer un nouveau type de cours
- `updateTypeCours(int $id, array $data)` : Mettre à jour un type de cours
- `deleteTypeCours(int $id)` : Supprimer un type de cours

### Méthodes avancées

- `searchTypesCours(string $searchTerm)` : Rechercher des types de cours
- `getTypesCoursPaginated(int $perPage, int $page)` : Obtenir des types de cours avec pagination
- `typeCoursExists(string $name)` : Vérifier si un type de cours existe
- `getTypesCoursByIds(array $ids)` : Obtenir plusieurs types de cours par IDs
- `createMultipleTypesCours(array $typesCoursData)` : Créer plusieurs types de cours
- `getTypesCoursCount()` : Obtenir le nombre total de types de cours

### Méthodes de filtrage

- `getTypesCoursByEtablissement(int $etablissementId)` : Types de cours par établissement
- `getTypesCoursByFaculte(int $faculteId)` : Types de cours par faculté
- `getTypesCoursByCategory(string $category)` : Types de cours par catégorie
- `getTypesCoursByDifficulty(string $difficulty)` : Types de cours par niveau de difficulté
- `getTypesCoursBySemester(string $semester)` : Types de cours par semestre
- `getActiveTypesCours()` : Types de cours actifs (avec des cours)

### Méthodes de statistiques

- `getTypesCoursWithCoursCount()` : Types de cours avec nombre de cours
- `getTypesCoursWithMostCourses(int $limit)` : Types de cours avec le plus de cours

## Validation

### Règles de validation pour la création

```php
'name' => 'required|string|max:255|unique:types_cours,name'
```

### Règles de validation pour la mise à jour

```php
'name' => [
    'required',
    'string',
    'max:255',
    Rule::unique('types_cours', 'name')->ignore($id),
]
```

## Relations

Le modèle `TypeCours` a une relation `hasMany` avec le modèle `Cours` :

```php
// Dans le modèle TypeCours
public function cours(): HasMany
{
    return $this->hasMany(Cours::class, 'type_cours_id');
}

// Dans le modèle Cours
public function typeCours()
{
    return $this->belongsTo(TypeCours::class, 'type_cours_id');
}
```

## Tests

Les tests ont été supprimés car le projet utilise principalement les seeders pour la gestion des données de test.

## Seeding

### Types de cours par défaut

Le `TypeCoursSeeder` crée automatiquement les types de cours suivants :
- Cours magistral
- Travaux pratiques
- Travaux dirigés
- Séminaire
- Conférence
- Stage

### Exécuter le seeder

```bash
php artisan db:seed --class=TypeCoursSeeder
```

## Factory

Les factories ne sont pas utilisées dans ce projet. Les données de test sont gérées via les seeders.

## Gestion des erreurs

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `404` : Type de cours non trouvé
- `422` : Erreur de validation

### Messages d'erreur

- "Type de cours non trouvé" : Quand l'ID n'existe pas
- "Terme de recherche requis" : Quand le paramètre de recherche est manquant
- Erreurs de validation Laravel pour les champs invalides

## Sécurité

- Validation des données d'entrée
- Vérification de l'unicité des noms de types de cours
- Protection contre les injections SQL via Eloquent
- Validation des types de données

## Performance

- Pagination des résultats
- Requêtes optimisées avec Eloquent
- Index sur la colonne `name` recommandé
- Cache possible pour les types de cours fréquemment utilisés

## Cas d'usage typiques

### Gestion académique

- Création de nouveaux types de cours lors de la restructuration
- Modification des noms de types de cours existants
- Suppression de types de cours obsolètes
- Recherche de types de cours par nom ou catégorie

### Filtrage et organisation

- Types de cours par établissement (faculté, école, etc.)
- Types de cours par faculté
- Types de cours actifs (ceux qui ont des cours)
- Types de cours par catégorie ou niveau

### Intégration avec d'autres entités

- Attribution de types aux cours
- Gestion des cours par type
- Statistiques d'utilisation des types de cours
- Contrôle d'accès basé sur les types de cours

## Exemples d'objets JSON pour Postman

### Créer un type de cours
```json
{
    "name": "Cours magistral"
}
```

### Mettre à jour un type de cours
```json
{
    "name": "Cours magistral avancé"
}
```

### Réponse de création
```json
{
    "message": "Type de cours ajouté avec succès",
    "typeCours": {
        "id": 1,
        "name": "Cours magistral",
        "created_at": "2025-01-27T10:00:00.000000Z",
        "updated_at": "2025-01-27T10:00:00.000000Z"
    }
}
``` 