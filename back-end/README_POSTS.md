# Gestion des Postes - PostController et PostService

Ce document décrit l'utilisation du `PostController` et du `PostService` pour la gestion des postes dans l'application.

## Vue d'ensemble

Le système de gestion des postes permet de :
- Créer, lire, mettre à jour et supprimer des postes
- Rechercher des postes par nom
- Gérer la pagination des résultats
- Valider l'unicité des noms de postes

## Structure des fichiers

```
app/
├── Http/Controllers/
│   └── PostController.php
├── Services/
│   └── PostService.php
└── Models/
    └── Post.php

database/
└── seeders/
    └── PostSeeder.php
```

## API Endpoints

### Routes principales (API Resource)

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/posts` | Liste paginée des postes |
| POST | `/api/posts` | Créer un nouveau poste |
| GET | `/api/posts/{id}` | Afficher un poste spécifique |
| PUT | `/api/posts/{id}` | Mettre à jour un poste |
| DELETE | `/api/posts/{id}` | Supprimer un poste |

### Routes supplémentaires

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/posts/search?search={term}` | Rechercher des postes par nom |
| GET | `/api/posts/all` | Obtenir tous les postes (sans pagination) |

## Utilisation du PostController

### Exemple de création d'un poste

```php
// Dans un autre contrôleur ou service
use App\Http\Controllers\PostController;

$postController = new PostController($postService);

// Créer un poste
$request = new Request(['name' => 'Chef de Département']);
$response = $postController->store($request);
```

### Exemple de mise à jour d'un poste

```php
// Mettre à jour un poste
$request = new Request(['name' => 'Directeur Adjoint']);
$response = $postController->update($request, $postId);
```

## Utilisation du PostService

### Exemple d'utilisation directe

```php
use App\Services\PostService;

$postService = new PostService();

// Créer un poste
$post = $postService->createPost(['name' => 'Professeur']);

// Rechercher des postes
$posts = $postService->searchPosts('Chef');

// Obtenir un poste par ID
$post = $postService->getPostById(1);

// Mettre à jour un poste
$updatedPost = $postService->updatePost(1, ['name' => 'Professeur Principal']);

// Supprimer un poste
$deleted = $postService->deletePost(1);
```

## Méthodes du PostService

### Méthodes de base

- `getAllPosts()` : Obtenir tous les postes
- `getPostById(int $id)` : Obtenir un poste par ID
- `getPostByName(string $name)` : Obtenir un poste par nom
- `createPost(array $data)` : Créer un nouveau poste
- `updatePost(int $id, array $data)` : Mettre à jour un poste
- `deletePost(int $id)` : Supprimer un poste

### Méthodes avancées

- `searchPosts(string $searchTerm)` : Rechercher des postes
- `getPostsPaginated(int $perPage, int $page)` : Obtenir des postes avec pagination
- `postExists(string $name)` : Vérifier si un poste existe
- `getPostsByIds(array $ids)` : Obtenir plusieurs postes par IDs
- `createMultiplePosts(array $postsData)` : Créer plusieurs postes
- `getPostsCount()` : Obtenir le nombre total de postes
- `getPostsWithUsersCount()` : Obtenir les postes avec le nombre d'utilisateurs

## Validation

### Règles de validation pour la création

```php
'name' => 'required|string|max:255|unique:posts,name'
```

### Règles de validation pour la mise à jour

```php
'name' => [
    'required',
    'string',
    'max:255',
    Rule::unique('posts', 'name')->ignore($id),
]
```

## Relations

Le modèle `Post` a une relation `hasMany` avec le modèle `User` :

```php
// Dans le modèle Post
public function users(): HasMany
{
    return $this->hasMany(User::class);
}

// Dans le modèle User
public function post()
{
    return $this->belongsTo(Post::class);
}
```

## Tests

Les tests ont été supprimés car le projet utilise principalement les seeders pour la gestion des données de test.

## Seeding

### Postes par défaut

Le `PostSeeder` crée automatiquement les postes suivants :
- Directeur
- Directeur Adjoint
- Chef de Département
- Professeur
- Assistant

### Exécuter le seeder

```bash
php artisan db:seed --class=PostSeeder
```

## Factory

Les factories ne sont pas utilisées dans ce projet. Les données de test sont gérées via les seeders.

## Gestion des erreurs

### Codes de statut HTTP

- `200` : Succès
- `201` : Créé avec succès
- `400` : Requête invalide
- `404` : Poste non trouvé
- `422` : Erreur de validation

### Messages d'erreur

- "Poste non trouvé" : Quand l'ID n'existe pas
- "Terme de recherche requis" : Quand le paramètre de recherche est manquant
- Erreurs de validation Laravel pour les champs invalides

## Sécurité

- Validation des données d'entrée
- Vérification de l'unicité des noms de postes
- Protection contre les injections SQL via Eloquent
- Validation des types de données

## Performance

- Pagination des résultats
- Requêtes optimisées avec Eloquent
- Index sur la colonne `name` recommandé
- Cache possible pour les postes fréquemment utilisés

## Cas d'usage typiques

### Gestion des postes dans une organisation

- Création de nouveaux postes lors de la restructuration
- Modification des noms de postes existants
- Suppression de postes obsolètes
- Recherche de postes par nom ou description

### Intégration avec les utilisateurs

- Attribution de postes aux utilisateurs
- Gestion des hiérarchies organisationnelles
- Contrôle d'accès basé sur les postes 