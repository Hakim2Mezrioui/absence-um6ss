# Gestion des Utilisateurs - Documentation

## Vue d'ensemble

Cette nouvelle rubrique permet aux super administrateurs de gérer complètement les utilisateurs du système, incluant les opérations CRUD (Création, Lecture, Mise à jour, Suppression) et la gestion des rôles.

## Sécurité

### Restriction d'accès
- **Seuls les super administrateurs** peuvent accéder à cette rubrique
- Authentification Sanctum requise
- Middleware `SuperAdminMiddleware` appliqué à toutes les routes

### Vérification des permissions
Le système vérifie automatiquement :
1. Si l'utilisateur est authentifié
2. Si l'utilisateur a le rôle "Super Admin" (role_id = 1)

## Endpoints API

### Routes principales (CRUD)

#### 1. Lister les utilisateurs
```
GET /api/user-management
```
**Paramètres de requête :**
- `role_id` : Filtrer par rôle
- `etablissement_id` : Filtrer par établissement
- `ville_id` : Filtrer par ville
- `search` : Recherche par nom ou email
- `per_page` : Nombre d'éléments par page (défaut: 15)

**Exemple de réponse :**
```json
{
  "status": "success",
  "data": {
    "data": [
      {
        "id": 1,
        "first_name": "John",
        "last_name": "Doe",
        "email": "john.doe@example.com",
        "role_id": 1,
        "role": {
          "id": 1,
          "name": "Super Admin"
        },
        "post": {
          "id": 1,
          "name": "Administrateur"
        },
        "etablissement": null,
        "ville": null,
        "created_at": "2024-01-01T00:00:00.000000Z",
        "updated_at": "2024-01-01T00:00:00.000000Z"
      }
    ],
    "current_page": 1,
    "per_page": 15,
    "total": 1
  },
  "message": "Liste des utilisateurs récupérée avec succès"
}
```

#### 2. Créer un utilisateur
```
POST /api/user-management
```
**Corps de la requête :**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "password": "motdepasse123",
  "role_id": 2,
  "post_id": 1,
  "etablissement_id": null,
  "ville_id": null
}
```

#### 3. Voir un utilisateur
```
GET /api/user-management/{id}
```

#### 4. Modifier un utilisateur
```
PUT /api/user-management/{id}
```
**Corps de la requête (tous les champs sont optionnels) :**
```json
{
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "jane.smith@example.com",
  "password": "nouveaumotdepasse123",
  "role_id": 3,
  "post_id": 2,
  "etablissement_id": 1,
  "ville_id": 1
}
```

#### 5. Supprimer un utilisateur
```
DELETE /api/user-management/{id}
```
**Note :** Un utilisateur ne peut pas supprimer son propre compte.

### Routes spécialisées

#### 6. Modifier le rôle d'un utilisateur
```
PUT /api/user-management/{id}/role
```
**Corps de la requête :**
```json
{
  "role_id": 3
}
```

#### 7. Obtenir les options pour les formulaires
```
GET /api/user-management/form-options
```
**Réponse :**
```json
{
  "status": "success",
  "data": {
    "roles": [
      {"id": 1, "name": "Super Admin"},
      {"id": 2, "name": "Admin"},
      {"id": 3, "name": "Scolarité"}
    ],
    "posts": [
      {"id": 1, "name": "Administrateur"},
      {"id": 2, "name": "Chef de Projet"}
    ],
    "etablissements": [
      {"id": 1, "name": "École Supérieure"},
      {"id": 2, "name": "Institut"}
    ],
    "villes": [
      {"id": 1, "name": "Casablanca"},
      {"id": 2, "name": "Rabat"}
    ]
  },
  "message": "Options récupérées avec succès"
}
```

#### 8. Obtenir les statistiques
```
GET /api/user-management/statistics
```
**Réponse :**
```json
{
  "status": "success",
  "data": {
    "total_users": 25,
    "users_by_role": [
      {"role_name": "Super Admin", "count": 2},
      {"role_name": "Admin", "count": 5},
      {"role_name": "Scolarité", "count": 8}
    ],
    "recent_users": [
      {
        "id": 25,
        "first_name": "Nouveau",
        "last_name": "Utilisateur",
        "email": "nouveau@example.com",
        "role": {"name": "Enseignant"},
        "post": {"name": "Professeur"}
      }
    ]
  },
  "message": "Statistiques récupérées avec succès"
}
```

#### 9. Rechercher des utilisateurs
```
GET /api/user-management/search?q=terme
```
**Paramètres :**
- `q` : Terme de recherche (requis)

## Codes de réponse

- **200** : Succès
- **201** : Création réussie
- **400** : Requête invalide
- **401** : Non authentifié
- **403** : Accès refusé (pas super admin)
- **404** : Utilisateur non trouvé
- **422** : Erreurs de validation
- **500** : Erreur serveur

## Validation des données

### Création d'utilisateur
- `first_name` : Requis, string, max 255 caractères
- `last_name` : Requis, string, max 255 caractères
- `email` : Requis, email valide, unique
- `password` : Requis, minimum 6 caractères
- `role_id` : Requis, doit exister dans la table roles
- `post_id` : Requis, doit exister dans la table posts
- `etablissement_id` : Optionnel, doit exister dans la table etablissements
- `ville_id` : Optionnel, doit exister dans la table villes

### Mise à jour d'utilisateur
Tous les champs sont optionnels lors de la mise à jour. Les règles de validation s'appliquent uniquement aux champs fournis.

## Gestion des erreurs

Toutes les réponses d'erreur suivent ce format :
```json
{
  "status": "error",
  "message": "Description de l'erreur",
  "errors": {
    "field": ["Message d'erreur spécifique"]
  }
}
```

## Exemples d'utilisation

### 1. Créer un nouvel administrateur
```bash
curl -X POST http://localhost:8000/api/user-management \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Admin",
    "last_name": "User",
    "email": "admin@example.com",
    "password": "securepassword123",
    "role_id": 2,
    "post_id": 1
  }'
```

### 2. Lister tous les utilisateurs avec pagination
```bash
curl -X GET "http://localhost:8000/api/user-management?per_page=10&page=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Rechercher des utilisateurs
```bash
curl -X GET "http://localhost:8000/api/user-management/search?q=john" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 4. Changer le rôle d'un utilisateur
```bash
curl -X PUT http://localhost:8000/api/user-management/5/role \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role_id": 3}'
```

## Tests

Pour tester l'implémentation, exécutez :
```bash
php artisan test:user-management
```

## Sécurité et bonnes pratiques

1. **Toujours utiliser HTTPS** en production
2. **Valider les tokens** côté frontend
3. **Ne pas exposer les mots de passe** dans les réponses
4. **Logger les actions** de gestion des utilisateurs
5. **Sauvegarder régulièrement** la base de données
6. **Utiliser des mots de passe forts** lors de la création d'utilisateurs

## Maintenance

- Les utilisateurs supprimés sont définitivement supprimés de la base de données
- Les relations avec les autres tables sont gérées automatiquement
- Les tokens Sanctum des utilisateurs supprimés sont automatiquement révoqués
