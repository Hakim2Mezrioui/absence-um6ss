# ListStudentController et ListStudentService - Documentation API

## Vue d'ensemble

Le `ListStudentController` et `ListStudentService` gèrent la table pivot `list_students` qui relie les étudiants aux rattrapages. Ils fournissent des fonctionnalités CRUD complètes, la gestion des listes d'étudiants, l'import/export, et des méthodes spécialisées pour une gestion fluide des relations.

## Endpoints API

### 1. **GET /api/list-students** - Liste paginée
Récupère la liste paginée des étudiants dans les listes.

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
      "etudiant_id": 1,
      "rattrapage_id": 1,
      "created_at": "2025-01-15T10:00:00.000000Z",
      "updated_at": "2025-01-15T10:00:00.000000Z",
      "etudiant": {
        "id": 1,
        "matricule": "E001",
        "name": "Ahmed Ben Ali",
        "promotion": "2024",
        "faculte": "Médecine"
      },
      "rattrapage": {
        "id": 1,
        "name": "Rattrapage Mathématiques",
        "start_hour": "09:00",
        "end_hour": "11:00",
        "date": "2025-01-20"
      }
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 25
  }
}
```

### 2. **GET /api/list-students/{id}** - Détails d'une entrée
Récupère les détails d'une entrée spécifique dans la liste.

**Paramètres de route :**
- `id` : ID de l'entrée dans la liste

### 3. **POST /api/list-students** - Créer une entrée
Crée une nouvelle entrée dans la liste.

**Corps de la requête :**
```json
{
  "etudiant_id": 1,
  "rattrapage_id": 1
}
```

**Validation :**
- `etudiant_id` : Requis, entier, doit exister dans la table `etudiants`
- `rattrapage_id` : Requis, entier, doit exister dans la table `rattrapages`

### 4. **PUT /api/list-students/{id}** - Mettre à jour
Met à jour une entrée existante.

**Corps de la requête :**
```json
{
  "etudiant_id": 2,
  "rattrapage_id": 1
}
```

### 5. **DELETE /api/list-students/{id}** - Supprimer
Supprime une entrée de la liste.

### 6. **GET /api/list-students/all** - Toutes les entrées
Récupère toutes les entrées sans pagination.

### 7. **GET /api/list-students/rattrapage/{rattrapageId}** - Étudiants d'un rattrapage
Récupère tous les étudiants d'un rattrapage spécifique.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "etudiant_id": 1,
      "rattrapage_id": 1,
      "etudiant": {
        "id": 1,
        "matricule": "E001",
        "name": "Ahmed Ben Ali"
      }
    }
  ],
  "count": 15
}
```

### 8. **GET /api/list-students/student/{studentId}** - Rattrapages d'un étudiant
Récupère tous les rattrapages d'un étudiant spécifique.

### 9. **POST /api/list-students/add-student** - Ajouter un étudiant
Ajoute un étudiant à une liste.

**Corps de la requête :**
```json
{
  "etudiant_id": 1,
  "rattrapage_id": 1
}
```

### 10. **POST /api/list-students/add-multiple-students** - Ajouter plusieurs étudiants
Ajoute plusieurs étudiants à une liste.

**Corps de la requête :**
```json
{
  "etudiant_ids": [1, 2, 3, 4, 5],
  "rattrapage_id": 1
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Opération terminée",
  "data": {
    "added": [1, 2, 3],
    "already_exists": [4],
    "invalid_students": [5],
    "errors": []
  }
}
```

### 11. **POST /api/list-students/remove-student** - Supprimer un étudiant
Supprime un étudiant d'une liste.

**Corps de la requête :**
```json
{
  "etudiant_id": 1,
  "rattrapage_id": 1
}
```

### 12. **POST /api/list-students/remove-multiple-students** - Supprimer plusieurs étudiants
Supprime plusieurs étudiants d'une liste.

**Corps de la requête :**
```json
{
  "etudiant_ids": [1, 2, 3],
  "rattrapage_id": 1
}
```

### 13. **DELETE /api/list-students/rattrapage/{rattrapageId}/clear** - Vider une liste
Supprime tous les étudiants d'une liste.

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Liste vidée avec succès",
  "data": {
    "deleted_count": 15
  }
}
```

### 14. **GET /api/list-students/rattrapage/{rattrapageId}/count** - Compter les étudiants
Compte le nombre d'étudiants dans une liste.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "rattrapage_id": 1,
    "student_count": 15
  }
}
```

### 15. **GET /api/list-students/student/{studentId}/count** - Compter les rattrapages
Compte le nombre de rattrapages d'un étudiant.

### 16. **POST /api/list-students/import** - Importer une liste
Importe une liste d'étudiants.

**Corps de la requête :**
```json
{
  "rattrapage_id": 1,
  "students": [
    {
      "id": 1
    },
    {
      "matricule": "E002"
    },
    {
      "name": "Fatima Zahra"
    }
  ]
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Import terminé",
  "data": {
    "total_processed": 3,
    "added": [1, 2, 3],
    "already_exists": [],
    "invalid_students": [],
    "errors": []
  }
}
```

### 17. **GET /api/list-students/rattrapage/{rattrapageId}/export** - Exporter une liste
Exporte une liste d'étudiants.

### 18. **GET /api/list-students/rattrapage/{rattrapageId}/search** - Rechercher dans une liste
Recherche des étudiants dans une liste spécifique.

**Paramètres de requête :**
- `search` : Terme de recherche (requis)

**Exemple :**
```
GET /api/list-students/rattrapage/1/search?search=Ahmed
```

### 19. **GET /api/list-students/statistics** - Statistiques
Récupère les statistiques des listes.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "total_rattrapages": 10,
    "total_students": 150,
    "total_list_entries": 75,
    "rattrapages_with_students": 8,
    "average_students_per_list": 7.5
  }
}
```

## Méthodes du Service

### Méthodes CRUD
- `getAllListStudents()` : Récupère tous les étudiants des listes
- `getListStudentById(int $id)` : Récupère par ID
- `createListStudent(array $data)` : Crée une nouvelle entrée
- `updateListStudent(int $id, array $data)` : Met à jour
- `deleteListStudent(int $id)` : Supprime

### Méthodes de gestion des listes
- `getStudentsByRattrapage(int $rattrapageId)` : Étudiants d'un rattrapage
- `getRattrapagesByStudent(int $studentId)` : Rattrapages d'un étudiant
- `addStudentToList(int $studentId, int $rattrapageId)` : Ajouter un étudiant
- `addMultipleStudentsToList(array $studentIds, int $rattrapageId)` : Ajouter plusieurs étudiants
- `removeStudentFromList(int $studentId, int $rattrapageId)` : Supprimer un étudiant
- `removeMultipleStudentsFromList(array $studentIds, int $rattrapageId)` : Supprimer plusieurs étudiants
- `clearList(int $rattrapageId)` : Vider une liste

### Méthodes d'analyse
- `countStudentsInList(int $rattrapageId)` : Compter les étudiants
- `countRattrapagesForStudent(int $studentId)` : Compter les rattrapages
- `getListStatistics()` : Statistiques complètes

### Méthodes d'import/export
- `importStudentsList(int $rattrapageId, array $studentData)` : Importer une liste
- `exportStudentsList(int $rattrapageId)` : Exporter une liste
- `searchStudentsInList(int $rattrapageId, string $searchValue)` : Rechercher

## Modèle et Relations

### ListStudent Model
```php
protected $fillable = [
    'student_id',
    'rattrapage_id'
];

public function etudiant(): BelongsTo
{
    return $this->belongsTo(Etudiant::class, 'student_id');
}

public function rattrapage(): BelongsTo
{
    return $this->belongsTo(Rattrapage::class);
}
```

### Relations
- **ListStudent** → **Etudiant** : `belongsTo` (chaque entrée appartient à un étudiant)
- **ListStudent** → **Rattrapage** : `belongsTo` (chaque entrée appartient à un rattrapage)
- **Rattrapage** → **ListStudent** : `hasMany` (un rattrapage peut avoir plusieurs étudiants)

## Fonctionnalités d'import

### Formats supportés
- **ID** : Identifiant numérique de l'étudiant
- **Matricule** : Numéro de matricule de l'étudiant
- **Nom** : Nom complet de l'étudiant

### Priorité d'identification
1. **ID** (priorité la plus haute)
2. **Matricule**
3. **Nom** (priorité la plus basse)

### Gestion des erreurs
- **Étudiants déjà dans la liste** : Ignorés, rapportés
- **Étudiants invalides** : Ignorés, rapportés
- **Erreurs système** : Loggées, rapportées

## Utilisation avec Postman

### Ajouter un étudiant à une liste
```json
POST /api/list-students/add-student
{
  "etudiant_id": 1,
  "rattrapage_id": 1
}
```

### Ajouter plusieurs étudiants
```json
POST /api/list-students/add-multiple-students
{
  "etudiant_ids": [1, 2, 3, 4, 5],
  "rattrapage_id": 1
}
```

### Importer une liste
```json
POST /api/list-students/import
{
  "rattrapage_id": 1,
  "students": [
    {"id": 1},
    {"matricule": "E002"},
    {"name": "Fatima Zahra"}
  ]
}
```

### Obtenir les étudiants d'un rattrapage
```
GET /api/list-students/rattrapage/1
```

### Compter les étudiants
```
GET /api/list-students/rattrapage/1/count
```

### Statistiques
```
GET /api/list-students/statistics
```

## Gestion des erreurs

### Erreur 400 - Étudiant déjà dans la liste
```json
{
  "success": false,
  "message": "L'étudiant est déjà dans cette liste"
}
```

### Erreur 404 - Étudiant de liste non trouvé
```json
{
  "success": false,
  "message": "Étudiant de liste non trouvé"
}
```

### Erreur 422 - Validation échouée
```json
{
  "success": false,
  "message": "Erreur de validation",
  "errors": {
    "etudiant_id": ["Le champ etudiant_id est requis"]
  }
}
```

## Notes importantes

1. **Table pivot** : `list_students` est une table pivot qui relie étudiants et rattrapages
2. **Validation** : Vérifie l'existence des étudiants et rattrapages avant création
3. **Import flexible** : Accepte ID, matricule ou nom pour identifier les étudiants
4. **Gestion des doublons** : Empêche l'ajout d'étudiants déjà dans une liste
5. **Transactions** : L'import utilise des transactions pour garantir la cohérence
6. **Relations** : Utilise `with()` pour optimiser les requêtes avec relations
7. **Statistiques** : Fournit des métriques utiles pour l'analyse des listes
8. **Logging** : Toutes les erreurs sont loggées pour le débogage 