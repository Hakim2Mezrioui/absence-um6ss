# TypeExamenController et TypeExamenService - Documentation API

## Vue d'ensemble

Le `TypeExamenController` et `TypeExamenService` gèrent les types d'examen dans le système. Ils fournissent des fonctionnalités CRUD complètes, la recherche, la pagination et des méthodes spécialisées pour filtrer et analyser les types d'examen.

## Endpoints API

### 1. **GET /api/types-examen** - Liste paginée
Récupère la liste paginée des types d'examen.

**Paramètres de requête :**
- `size` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `page` (optionnel) : Numéro de page (défaut: 1)

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Contrôle Continu",
      "created_at": "2025-01-15T10:00:00.000000Z",
      "updated_at": "2025-01-15T10:00:00.000000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 5
  }
}
```

### 2. **GET /api/types-examen/{id}** - Détails d'un type
Récupère les détails d'un type d'examen spécifique.

**Paramètres de route :**
- `id` : ID du type d'examen

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Contrôle Continu",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 3. **POST /api/types-examen** - Créer un type
Crée un nouveau type d'examen.

**Corps de la requête :**
```json
{
  "name": "Examen Oral"
}
```

**Validation :**
- `name` : Requis, chaîne de caractères, maximum 255 caractères, unique

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Type d'examen créé avec succès",
  "data": {
    "id": 6,
    "name": "Examen Oral",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 4. **PUT /api/types-examen/{id}** - Mettre à jour
Met à jour un type d'examen existant.

**Paramètres de route :**
- `id` : ID du type d'examen

**Corps de la requête :**
```json
{
  "name": "Examen Oral Modifié"
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Type d'examen mis à jour avec succès",
  "data": {
    "id": 6,
    "name": "Examen Oral Modifié",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 5. **DELETE /api/types-examen/{id}** - Supprimer
Supprime un type d'examen.

**Paramètres de route :**
- `id` : ID du type d'examen

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Type d'examen supprimé avec succès"
}
```

### 6. **GET /api/types-examen/search** - Recherche
Recherche des types d'examen par nom.

**Paramètres de requête :**
- `search` : Terme de recherche (requis)
- `size` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `page` (optionnel) : Numéro de page (défaut: 1)

**Exemple :**
```
GET /api/types-examen/search?search=Contrôle&size=5&page=1
```

### 7. **GET /api/types-examen/all** - Tous les types
Récupère tous les types d'examen sans pagination.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Contrôle Continu"
    },
    {
      "id": 2,
      "name": "Examen Partiel"
    }
  ]
}
```

### 8. **GET /api/types-examen/category** - Par catégorie
Filtre les types d'examen par catégorie.

**Paramètres de requête :**
- `category` : Catégorie de recherche (requis)

**Exemple :**
```
GET /api/types-examen/category?category=Contrôle
```

### 9. **GET /api/types-examen/difficulty** - Par difficulté
Filtre les types d'examen par niveau de difficulté.

**Paramètres de requête :**
- `difficulty` : Niveau de difficulté (requis)

### 10. **GET /api/types-examen/semester** - Par semestre
Filtre les types d'examen par semestre.

**Paramètres de requête :**
- `semester` : Semestre (requis)

### 11. **GET /api/types-examen/with-examens-count** - Avec comptage
Récupère les types d'examen avec le nombre d'examens associés.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Contrôle Continu",
      "examens_count": 15
    },
    {
      "id": 2,
      "name": "Examen Partiel",
      "examens_count": 8
    }
  ]
}
```

### 12. **GET /api/types-examen/statistics** - Statistiques
Récupère les statistiques des types d'examen.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "total_types": 5,
    "most_used_type": "Contrôle Continu",
    "most_used_count": 15,
    "least_used_type": "Oral",
    "least_used_count": 3,
    "average_examens_per_type": 8.4
  }
}
```

## Méthodes du Service

### Méthodes CRUD
- `getAllTypesExamen()` : Récupère tous les types
- `getTypeExamenById(int $id)` : Récupère par ID
- `createTypeExamen(array $data)` : Crée un nouveau type
- `updateTypeExamen(int $id, array $data)` : Met à jour
- `deleteTypeExamen(int $id)` : Supprime

### Méthodes de recherche et pagination
- `searchTypesExamen(string $searchValue, int $size, int $page)` : Recherche avec pagination
- `getTypesExamenPaginated(int $size, int $page)` : Pagination simple

### Méthodes de filtrage
- `getTypesExamenByCategory(string $category)` : Par catégorie
- `getTypesExamenByDifficulty(string $difficulty)` : Par difficulté
- `getTypesExamenBySemester(string $semester)` : Par semestre

### Méthodes d'analyse
- `getTypesExamenWithExamensCount()` : Avec comptage d'examens
- `getTypesExamenStatistics()` : Statistiques complètes
- `getTypesExamenCount()` : Nombre total

## Modèle et Relations

### TypeExamen Model
```php
protected $fillable = ['name'];

public function examens(): HasMany
{
    return $this->hasMany(Examen::class, 'type_examen_id');
}
```

### Relations
- **TypeExamen** → **Examen** : `hasMany` (un type peut avoir plusieurs examens)

## Règles de validation

### Création
- `name` : Requis, chaîne, max 255 caractères, unique

### Mise à jour
- `name` : Requis, chaîne, max 255 caractères, unique (sauf pour l'ID actuel)

## Seeding

Le `TypeExamenSeeder` crée automatiquement 5 types d'examen :
- Contrôle Continu
- Examen Partiel
- Examen Final
- Rattrapage
- Oral

## Utilisation avec Postman

### Créer un type d'examen
```json
POST /api/types-examen
{
  "name": "Examen de Laboratoire"
}
```

### Mettre à jour un type
```json
PUT /api/types-examen/1
{
  "name": "Contrôle Continu Modifié"
}
```

### Rechercher des types
```
GET /api/types-examen/search?search=Examen&size=5&page=1
```

### Obtenir les statistiques
```
GET /api/types-examen/statistics
```

## Gestion des erreurs

### Erreur 404 - Type non trouvé
```json
{
  "success": false,
  "message": "Type d'examen non trouvé"
}
```

### Erreur 400 - Validation échouée
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "name": ["Le nom est requis"]
  }
}
```

### Erreur 400 - Terme de recherche manquant
```json
{
  "success": false,
  "message": "Le terme de recherche est requis"
}
```

## Notes importantes

1. **Ordre des routes** : Les routes spécifiques sont définies avant `Route::apiResource` pour éviter les conflits
2. **Type casting** : Les paramètres `$id` sont explicitement castés en `int`
3. **Relations** : Utilise `withCount('examens')` pour optimiser les requêtes
4. **Validation** : Vérifie l'unicité du nom lors de la création et mise à jour
5. **Pagination** : Toutes les méthodes de liste supportent la pagination
6. **Statistiques** : Fournit des métriques utiles pour l'analyse des types d'examen 