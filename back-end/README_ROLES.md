# Gestion des Rôles - RoleController et RoleService

Ce document décrit l'utilisation du `RoleController` et du `RoleService` pour la gestion des rôles dans l'application.

## Vue d'ensemble

Le système de gestion des rôles permet de :
- Créer, lire, mettre à jour et supprimer des rôles
- Rechercher des rôles par nom
- Gérer la pagination des résultats
- Valider l'unicité des noms de rôles

## Structure des fichiers

```
app/
├── Http/Controllers/
│   └── RoleController.php
├── Services/
│   └── RoleService.php
└── Models/
    └── Role.php

database/
└── seeders/
    └── RoleSeeder.php
```

## API Endpoints

### Routes principales (API Resource)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/roles` | Liste paginée des rôles |
| POST | `/api/roles` | Créer un nouveau rôle |
| GET | `/api/roles/{id}` | Afficher un rôle spécifique |
| PUT | `/api/roles/{id}` | Mettre à jour un rôle |
| DELETE | `/api/roles/{id}` | Supprimer un rôle |

### Routes supplémentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/roles/search?search={term}` | Rechercher des rôles par nom |
| GET | `/api/roles/all` | Obtenir tous les rôles (sans pagination) |

## Utilisation du RoleController

### Exemple de création d'un rôle

```php
// Dans un autre contrôleur ou service
use App\Http\Controllers\RoleController;

$roleController = new RoleController($roleService);

// Créer un rôle
$request = new Request(['name' => 'Moderator']);
$response = $roleController->store($request);
```

### Exemple de mise à jour d'un rôle

```php
// Mettre à jour un rôle
$request = new Request(['name' => 'Senior Moderator']);
$response = $roleController->update($request, $roleId);
```

## Utilisation du RoleService

### Exemple d'utilisation directe

```php
use App\Services\RoleService;

$roleService = new RoleService();

// Créer un rôle
$role = $roleService->createRole(['name' => 'Editor']);

// Rechercher des rôles
$roles = $roleService->searchRoles('Admin');

// Obtenir un rôle par ID
$role = $roleService->getRoleById(1);

// Mettre à jour un rôle
$updatedRole = $roleService->updateRole(1, ['name' => 'Senior Editor']);

// Supprimer un rôle
$deleted = $roleService->deleteRole(1);
```

## Méthodes du RoleService

### Méthodes de base

- `getAllRoles()` : Obtenir tous les rôles
- `getRoleById(int $id)` : Obtenir un rôle par ID
- `getRoleByName(string $name)` : Obtenir un rôle par nom
- `createRole(array $data)` : Créer un nouveau rôle
- `updateRole(int $id, array $data)` : Mettre à jour un rôle
- `deleteRole(int $id)` : Supprimer un rôle

### Méthodes avancées

- `searchRoles(string $searchTerm)` : Rechercher des rôles
- `getRolesPaginated(int $perPage, int $page)` : Obtenir des rôles avec pagination
- `roleExists(string $name)` : Vérifier si un rôle existe
- `getRolesByIds(array $ids)` : Obtenir plusieurs rôles par IDs
- `createMultipleRoles(array $rolesData)` : Créer plusieurs rôles
- `getRolesCount()` : Obtenir le nombre total de rôles
- `getRolesWithUsersCount()` : Obtenir les rôles avec le nombre d'utilisateurs

## Validation

### Règles de validation pour la création

```php
'name' => 'required|string|max:255|unique:roles,name'
```

### Règles de validation pour la mise à jour

```php
'name' => [
    'required',
    'string',
    'max:255',
    Rule::unique('roles', 'name')->ignore($id),
]
```

## Relations

Le modèle `Role` a une relation `hasMany` avec le modèle `User` :

```php
// Dans le modèle Role
public function users(): HasMany
{
    return $this->hasMany(User::class);
}

// Dans le modèle User
public function role()
{
    return $this->belongsTo(Role::class);
}
```

## Tests

Les tests ont été supprimés car le projet utilise principalement les seeders pour la gestion des données de test.

## Seeding

### Rôles par défaut

Le `RoleSeeder` crée automatiquement les rôles suivants :
- Super Admin
- Admin
- Scolarité
- Professeur
- User

### Exécuter le seeder

```bash
php artisan db:seed --class=RoleSeeder
```

## Factory

Les factories ne sont pas utilisées dans ce projet. Les données de test sont gérées via les seeders.

## Gestion des erreurs

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `404` : Rôle non trouvé
- `422` : Erreur de validation

### Messages d'erreur

- "Rôle non trouvé" : Quand l'ID n'existe pas
- "Terme de recherche requis" : Quand le paramètre de recherche est manquant
- Erreurs de validation Laravel pour les champs invalides

## Sécurité

- Validation des données d'entrée
- Vérification de l'unicité des noms de rôles
- Protection contre les injections SQL via Eloquent
- Validation des types de données

## Performance

- Pagination des résultats
- Requêtes optimisées avec Eloquent
- Index sur la colonne `name` recommandé
- Cache possible pour les rôles fréquemment utilisés 