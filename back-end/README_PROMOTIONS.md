# Gestion des Promotions - PromotionController et PromotionService

Ce document décrit l'utilisation du `PromotionController` et du `PromotionService` pour la gestion des promotions dans l'application.

## Vue d'ensemble

Le système de gestion des promotions permet de :
- Créer, lire, mettre à jour et supprimer des promotions
- Rechercher des promotions par nom
- Gérer la pagination des résultats
- Valider l'unicité des noms de promotions
- Filtrer les promotions par établissement et faculté
- Gérer les relations avec les étudiants et groupes

## Structure des fichiers

```
app/
├── Http/Controllers/
│   └── PromotionController.php
├── Services/
│   └── PromotionService.php
└── Models/
    └── Promotion.php

database/
└── seeders/
    └── PromotionSeeder.php
```

## API Endpoints

### Routes principales (API Resource)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/promotions` | Liste paginée des promotions |
| POST | `/api/promotions` | Créer une nouvelle promotion |
| GET | `/api/promotions/{id}` | Afficher une promotion spécifique |
| PUT | `/api/promotions/{id}` | Mettre à jour une promotion |
| DELETE | `/api/promotions/{id}` | Supprimer une promotion |

### Routes supplémentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/promotions/search?search={term}` | Rechercher des promotions par nom |
| GET | `/api/promotions/all` | Obtenir toutes les promotions (sans pagination) |
| GET | `/api/promotions/etablissement/{id}` | Promotions par établissement |
| GET | `/api/promotions/faculte/{id}` | Promotions par faculté |

## Utilisation du PromotionController

### Exemple de création d'une promotion

```php
// Dans un autre contrôleur ou service
use App\Http\Controllers\PromotionController;

$promotionController = new PromotionController($promotionService);

// Créer une promotion
$request = new Request(['name' => '1ère année']);
$response = $promotionController->store($request);
```

### Exemple de mise à jour d'une promotion

```php
// Mettre à jour une promotion
$request = new Request(['name' => '2ème année']);
$response = $promotionController->update($request, $promotionId);
```

## Utilisation du PromotionService

### Exemple d'utilisation directe

```php
use App\Services\PromotionService;

$promotionService = new PromotionService();

// Créer une promotion
$promotion = $promotionService->createPromotion(['name' => '3ème année']);

// Rechercher des promotions
$promotions = $promotionService->searchPromotions('année');

// Obtenir une promotion par ID
$promotion = $promotionService->getPromotionById(1);

// Mettre à jour une promotion
$updatedPromotion = $promotionService->updatePromotion(1, ['name' => '4ème année']);

// Supprimer une promotion
$deleted = $promotionService->deletePromotion(1);
```

## Méthodes du PromotionService

### Méthodes de base

- `getAllPromotions()` : Obtenir toutes les promotions
- `getPromotionById(int $id)` : Obtenir une promotion par ID
- `getPromotionByName(string $name)` : Obtenir une promotion par nom
- `createPromotion(array $data)` : Créer une nouvelle promotion
- `updatePromotion(int $id, array $data)` : Mettre à jour une promotion
- `deletePromotion(int $id)` : Supprimer une promotion

### Méthodes avancées

- `searchPromotions(string $searchTerm)` : Rechercher des promotions
- `getPromotionsPaginated(int $perPage, int $page)` : Obtenir des promotions avec pagination
- `promotionExists(string $name)` : Vérifier si une promotion existe
- `getPromotionsByIds(array $ids)` : Obtenir plusieurs promotions par IDs
- `createMultiplePromotions(array $promotionsData)` : Créer plusieurs promotions
- `getPromotionsCount()` : Obtenir le nombre total de promotions

### Méthodes de filtrage

- `getPromotionsByEtablissement(int $etablissementId)` : Promotions par établissement
- `getPromotionsByFaculte(int $faculteId)` : Promotions par faculté
- `getPromotionsByYearLevel(string $yearLevel)` : Promotions par niveau d'année
- `getActivePromotions()` : Promotions actives (avec étudiants ou groupes)

### Méthodes de statistiques

- `getPromotionsWithStudentsCount()` : Promotions avec nombre d'étudiants
- `getPromotionsWithGroupsCount()` : Promotions avec nombre de groupes

## Validation

### Règles de validation pour la création

```php
'name' => 'required|string|max:255|unique:promotions,name'
```

### Règles de validation pour la mise à jour

```php
'name' => [
    'required',
    'string',
    'max:255',
    Rule::unique('promotions', 'name')->ignore($id),
]
```

## Relations

Le modèle `Promotion` a plusieurs relations :

```php
// Relations HasMany
public function etudiants(): HasMany
{
    return $this->hasMany(Etudiant::class);
}

public function groups(): HasMany
{
    return $this->hasMany(Group::class);
}

// Relations BelongsTo
public function etablissement(): BelongsTo
{
    return $this->belongsTo(Etablissement::class);
}

public function faculte(): BelongsTo
{
    return $this->belongsTo(Faculte::class);
}
```

## Tests

Les tests ont été supprimés car le projet utilise principalement les seeders pour la gestion des données de test.

## Seeding

### Promotions par défaut

Le `PromotionSeeder` crée automatiquement les promotions suivantes :
- 1ère année
- 2ème année
- 3ème année
- 4ème année
- 5ème année
- 6ème année

### Exécuter le seeder

```bash
php artisan db:seed --class=PromotionSeeder
```

## Factory

Les factories ne sont pas utilisées dans ce projet. Les données de test sont gérées via les seeders.

## Gestion des erreurs

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `404` : Promotion non trouvée
- `422` : Erreur de validation

### Messages d'erreur

- "Promotion non trouvée" : Quand l'ID n'existe pas
- "Terme de recherche requis" : Quand le paramètre de recherche est manquant
- Erreurs de validation Laravel pour les champs invalides

## Sécurité

- Validation des données d'entrée
- Vérification de l'unicité des noms de promotions
- Protection contre les injections SQL via Eloquent
- Validation des types de données

## Performance

- Pagination des résultats
- Requêtes optimisées avec Eloquent
- Index sur la colonne `name` recommandé
- Cache possible pour les promotions fréquemment utilisées

## Cas d'usage typiques

### Gestion académique

- Création de nouvelles promotions lors de la restructuration
- Modification des noms de promotions existantes
- Suppression de promotions obsolètes
- Recherche de promotions par nom ou niveau

### Filtrage et organisation

- Promotions par établissement (faculté, école, etc.)
- Promotions par faculté
- Promotions actives (celles qui ont des étudiants)
- Promotions par niveau d'année

### Intégration avec d'autres entités

- Attribution de promotions aux étudiants
- Création de groupes par promotion
- Gestion des cours par promotion
- Contrôle d'accès basé sur les promotions 