# Mise à jour des Examens - Ajout de group_id et ville_id

## Vue d'ensemble

Cette mise à jour ajoute deux nouveaux champs obligatoires à la table `examens` :
- `group_id` : Référence vers la table `groups` pour spécifier le groupe de l'examen
- `ville_id` : Référence vers la table `villes` pour spécifier la ville de l'examen

## Changements effectués

### 1. Base de données

#### Migration
- **Fichier** : `database/migrations/2025_08_18_091800_create_examens_table.php`
- **Ajouts** :
  ```php
  $table->foreignId('group_id')->constrained('groups')->onDelete('cascade');
  $table->foreignId('ville_id')->constrained('villes')->onDelete('cascade');
  ```

### 2. Modèle Eloquent

#### Examen.php
- **Ajouts dans `$fillable`** : `group_id`, `ville_id`
- **Nouvelles relations** :
  ```php
  public function group()
  {
      return $this->belongsTo(Group::class);
  }

  public function ville()
  {
      return $this->belongsTo(Ville::class);
  }
  ```

### 3. Contrôleur

#### ExamenController.php
- **Nouveaux paramètres de filtre** : `group_id`, `ville_id`
- **Validation mise à jour** : Les champs sont maintenant requis
- **Relations chargées** : `group` et `ville` sont inclus dans les requêtes
- **Méthode `getFilterOptions()`** : Retourne maintenant `groups` et `villes`

### 4. Service

#### ExamenService.php
- **Nouvelles méthodes** :
  - `getExamensByGroup(int $groupId)`
  - `getExamensByVille(int $villeId)`
- **Relations mises à jour** : Toutes les méthodes chargent maintenant `group` et `ville`

### 5. Seeder

#### ExamenSeeder.php
- **Nouvelles données de référence** : Récupération des IDs de `groups` et `villes`
- **Données d'examen** : Chaque examen a maintenant un `group_id` et `ville_id` aléatoire

### 6. Frontend Angular

#### Interface TypeScript
- **Examen interface** : Ajout de `group_id`, `ville_id` et relations `group?`, `ville?`
- **ExamenFilters** : Ajout de `group_id?`, `ville_id?`

#### Composants
- **examens.component.html** : Nouveaux filtres pour groupe et ville
- **examen-modal.component.ts** : Nouveaux champs dans le formulaire
- **import-examens.component.ts** : Nouveaux champs dans l'import

## Utilisation

### Filtrage
```typescript
// Filtrer par groupe
const filters: ExamenFilters = {
  group_id: 1,
  size: 10,
  page: 1
};

// Filtrer par ville
const filters: ExamenFilters = {
  ville_id: 2,
  size: 10,
  page: 1
};
```

### Création d'examen
```typescript
const examen: Partial<Examen> = {
  title: 'Examen de Mathématiques',
  date: '2025-01-15',
  heure_debut: '09:00:00',
  heure_fin: '11:00:00',
  group_id: 1,        // Nouveau champ obligatoire
  ville_id: 2,         // Nouveau champ obligatoire
  // ... autres champs
};
```

## Migration des données existantes

Si vous avez des données existantes dans la table `examens`, vous devrez :

1. **Exécuter la migration** :
   ```bash
   php artisan migrate
   ```

2. **Mettre à jour les données existantes** :
   ```sql
   -- Exemple de mise à jour
   UPDATE examens 
   SET group_id = (SELECT id FROM groups LIMIT 1),
       ville_id = (SELECT id FROM villes LIMIT 1)
   WHERE group_id IS NULL OR ville_id IS NULL;
   ```

3. **Exécuter le seeder** :
   ```bash
   php artisan db:seed --class=ExamenSeeder
   ```

## Tests

Un fichier de test a été créé pour vérifier le bon fonctionnement :
- **Fichier** : `tests/Feature/ExamenTest.php`
- **Tests** :
  - Création d'examen avec `group_id` et `ville_id`
  - Validation que les champs sont obligatoires

## Impact sur l'API

### Endpoints affectés
- `GET /api/examens` : Nouveaux paramètres de filtre
- `POST /api/examens` : Nouveaux champs obligatoires
- `PUT /api/examens/{id}` : Nouveaux champs obligatoires
- `GET /api/examens/filter-options` : Retourne maintenant `groups` et `villes`

### Réponse des examens
Chaque examen retourné inclut maintenant :
```json
{
  "id": 1,
  "title": "Examen de Mathématiques",
  "group": {
    "id": 1,
    "name": "Groupe A"
  },
  "ville": {
    "id": 2,
    "name": "Paris"
  }
  // ... autres champs
}
```

## Notes importantes

1. **Champs obligatoires** : `group_id` et `ville_id` sont maintenant requis
2. **Cascade delete** : La suppression d'un groupe ou d'une ville supprimera les examens associés
3. **Performance** : Les relations sont chargées par défaut, ce qui peut affecter les performances sur de gros volumes
4. **Validation** : La validation côté serveur vérifie l'existence des IDs de groupe et ville

## Prochaines étapes

1. Tester la migration sur un environnement de développement
2. Vérifier que tous les composants frontend fonctionnent correctement
3. Mettre à jour la documentation de l'API si nécessaire
4. Former les utilisateurs sur les nouveaux champs
