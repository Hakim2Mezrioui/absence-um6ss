# RattrapageController et RattrapageService - Documentation API

## Vue d'ensemble

Le `RattrapageController` et `RattrapageService` gèrent les sessions de rattrapage dans le système. Ils fournissent des fonctionnalités CRUD complètes, la recherche, la pagination, la gestion des conflits d'horaires et des méthodes spécialisées pour filtrer et analyser les rattrapages.

## Endpoints API

### 1. **GET /api/rattrapages** - Liste paginée
Récupère la liste paginée des rattrapages.

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
      "name": "Rattrapage Mathématiques - Algèbre",
      "start_hour": "09:00",
      "end_hour": "11:00",
      "date": "2025-01-17",
      "created_at": "2025-01-15T10:00:00.000000Z",
      "updated_at": "2025-01-15T10:00:00.000000Z"
    }
  ],
  "pagination": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 10,
    "total": 10
  }
}
```

### 2. **GET /api/rattrapages/{id}** - Détails d'un rattrapage
Récupère les détails d'un rattrapage spécifique.

**Paramètres de route :**
- `id` : ID du rattrapage

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Rattrapage Mathématiques - Algèbre",
    "start_hour": "09:00",
    "end_hour": "11:00",
    "date": "2025-01-17",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 3. **POST /api/rattrapages** - Créer un rattrapage
Crée une nouvelle session de rattrapage.

**Corps de la requête :**
```json
{
  "name": "Rattrapage Physique - Thermodynamique",
  "start_hour": "14:00",
  "end_hour": "16:00",
  "date": "2025-01-20"
}
```

**Validation :**
- `name` : Requis, chaîne de caractères, maximum 255 caractères
- `start_hour` : Requis, format HH:MM
- `end_hour` : Requis, format HH:MM, doit être après start_hour
- `date` : Requis, date, doit être aujourd'hui ou dans le futur

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Rattrapage créé avec succès",
  "data": {
    "id": 11,
    "name": "Rattrapage Physique - Thermodynamique",
    "start_hour": "14:00",
    "end_hour": "16:00",
    "date": "2025-01-20",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 4. **PUT /api/rattrapages/{id}** - Mettre à jour
Met à jour un rattrapage existant.

**Paramètres de route :**
- `id` : ID du rattrapage

**Corps de la requête :**
```json
{
  "name": "Rattrapage Physique - Thermodynamique Modifié",
  "start_hour": "15:00",
  "end_hour": "17:00",
  "date": "2025-01-20"
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Rattrapage mis à jour avec succès",
  "data": {
    "id": 11,
    "name": "Rattrapage Physique - Thermodynamique Modifié",
    "start_hour": "15:00",
    "end_hour": "17:00",
    "date": "2025-01-20",
    "created_at": "2025-01-15T10:00:00.000000Z",
    "updated_at": "2025-01-15T10:00:00.000000Z"
  }
}
```

### 5. **DELETE /api/rattrapages/{id}** - Supprimer
Supprime un rattrapage.

**Paramètres de route :**
- `id` : ID du rattrapage

**Exemple de réponse :**
```json
{
  "success": true,
  "message": "Rattrapage supprimé avec succès"
}
```

### 6. **GET /api/rattrapages/search** - Recherche
Recherche des rattrapages par nom.

**Paramètres de requête :**
- `search` : Terme de recherche (requis)
- `size` (optionnel) : Nombre d'éléments par page (défaut: 10)
- `page` (optionnel) : Numéro de page (défaut: 1)

**Exemple :**
```
GET /api/rattrapages/search?search=Mathématiques&size=5&page=1
```

### 7. **GET /api/rattrapages/all** - Tous les rattrapages
Récupère tous les rattrapages sans pagination.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Rattrapage Mathématiques - Algèbre",
      "start_hour": "09:00",
      "end_hour": "11:00",
      "date": "2025-01-17"
    }
  ]
}
```

### 8. **GET /api/rattrapages/date** - Par date
Filtre les rattrapages par date spécifique.

**Paramètres de requête :**
- `date` : Date au format YYYY-MM-DD (requis)

**Exemple :**
```
GET /api/rattrapages/date?date=2025-01-17
```

### 9. **GET /api/rattrapages/date-range** - Par période
Filtre les rattrapages par période.

**Paramètres de requête :**
- `start_date` : Date de début au format YYYY-MM-DD (requis)
- `end_date` : Date de fin au format YYYY-MM-DD (requis)

**Exemple :**
```
GET /api/rattrapages/date-range?start_date=2025-01-17&end_date=2025-01-20
```

### 10. **GET /api/rattrapages/today** - Rattrapages du jour
Récupère les rattrapages programmés aujourd'hui.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Rattrapage Mathématiques - Algèbre",
      "start_hour": "09:00",
      "end_hour": "11:00",
      "date": "2025-01-15"
    }
  ]
}
```

### 11. **GET /api/rattrapages/this-week** - Rattrapages de la semaine
Récupère les rattrapages de la semaine en cours.

### 12. **GET /api/rattrapages/this-month** - Rattrapages du mois
Récupère les rattrapages du mois en cours.

### 13. **GET /api/rattrapages/start-hour** - Par heure de début
Filtre les rattrapages par heure de début.

**Paramètres de requête :**
- `start_hour` : Heure au format HH:MM (requis)

**Exemple :**
```
GET /api/rattrapages/start-hour?start_hour=09:00
```

### 14. **GET /api/rattrapages/end-hour** - Par heure de fin
Filtre les rattrapages par heure de fin.

**Paramètres de requête :**
- `end_hour` : Heure au format HH:MM (requis)

### 15. **GET /api/rattrapages/statistics** - Statistiques
Récupère les statistiques des rattrapages.

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "total_rattrapages": 10,
    "today_rattrapages": 0,
    "this_week_rattrapages": 3,
    "this_month_rattrapages": 10,
    "monthly_statistics": {
      "Jan 2025": 10
    },
    "average_per_month": 10
  }
}
```

### 16. **GET /api/rattrapages/time-conflicts** - Conflits d'horaires
Récupère les rattrapages avec des conflits d'horaires.

### 17. **POST /api/rattrapages/check-conflicts** - Vérifier les conflits
Vérifie s'il y a des conflits d'horaires pour une date et des heures données.

**Corps de la requête :**
```json
{
  "date": "2025-01-20",
  "start_hour": "14:00",
  "end_hour": "16:00",
  "exclude_id": 1
}
```

**Exemple de réponse :**
```json
{
  "success": true,
  "data": {
    "has_conflicts": false,
    "date": "2025-01-20",
    "start_hour": "14:00",
    "end_hour": "16:00"
  }
}
```

## Méthodes du Service

### Méthodes CRUD
- `getAllRattrapages()` : Récupère tous les rattrapages
- `getRattrapageById(int $id)` : Récupère par ID
- `createRattrapage(array $data)` : Crée un nouveau rattrapage
- `updateRattrapage(int $id, array $data)` : Met à jour
- `deleteRattrapage(int $id)` : Supprime

### Méthodes de recherche et pagination
- `searchRattrapages(string $searchValue, int $size, int $page)` : Recherche avec pagination
- `getRattrapagesPaginated(int $size, int $page)` : Pagination simple

### Méthodes de filtrage temporel
- `getRattrapagesByDate(string $date)` : Par date spécifique
- `getRattrapagesByDateRange(string $startDate, string $endDate)` : Par période
- `getTodayRattrapages()` : Du jour
- `getThisWeekRattrapages()` : De la semaine
- `getThisMonthRattrapages()` : Du mois

### Méthodes de filtrage par heure
- `getRattrapagesByStartHour(string $startHour)` : Par heure de début
- `getRattrapagesByEndHour(string $endHour)` : Par heure de fin

### Méthodes d'analyse et gestion des conflits
- `getRattrapagesStatistics()` : Statistiques complètes
- `getRattrapagesWithTimeConflicts()` : Rattrapages avec conflits
- `checkTimeConflictsForDate(string $date, string $startHour, string $endHour, int $excludeId)` : Vérification des conflits

## Modèle et Relations

### Rattrapage Model
```php
protected $fillable = [
    'name',
    'start_hour',
    'end_hour',
    'date'
];

protected $casts = [
    'start_hour' => 'datetime:H:i',
    'end_hour' => 'datetime:H:i',
    'date' => 'date'
];
```

### Méthodes utilitaires du modèle
- `hasTimeConflict(Rattrapage $other)` : Vérifie les conflits avec un autre rattrapage
- `getDurationInMinutes()` : Calcule la durée en minutes
- `getDurationFormatted()` : Retourne la durée formatée (ex: "2h 30min")

## Règles de validation

### Création
- `name` : Requis, chaîne, max 255 caractères
- `start_hour` : Requis, format HH:MM
- `end_hour` : Requis, format HH:MM, après start_hour
- `date` : Requis, date, aujourd'hui ou futur

### Mise à jour
- Mêmes règles que la création
- Vérification des conflits d'horaires (exclut l'ID actuel)

## Gestion des conflits d'horaires

Le système vérifie automatiquement les conflits d'horaires lors de la création et mise à jour :
- Deux rattrapages ne peuvent pas avoir des horaires qui se chevauchent le même jour
- La validation empêche la création de conflits
- Méthode dédiée pour vérifier les conflits avant création

## Seeding

Le `RattrapageSeeder` crée automatiquement 10 sessions de rattrapage d'exemple :
- Mathématiques, Physique, Chimie, Biologie, Anglais
- Informatique, Statistiques, Histoire, Philosophie, Géographie
- Horaires variés sur les prochains jours
- Durées différentes (1h30 à 3h)

## Utilisation avec Postman

### Créer un rattrapage
```json
POST /api/rattrapages
{
  "name": "Rattrapage Chimie - Inorganique",
  "start_hour": "10:00",
  "end_hour": "12:00",
  "date": "2025-01-25"
}
```

### Mettre à jour un rattrapage
```json
PUT /api/rattrapages/1
{
  "name": "Rattrapage Mathématiques - Algèbre Modifié",
  "start_hour": "10:00",
  "end_hour": "12:00",
  "date": "2025-01-17"
}
```

### Rechercher des rattrapages
```
GET /api/rattrapages/search?search=Mathématiques&size=5&page=1
```

### Obtenir les statistiques
```
GET /api/rattrapages/statistics
```

### Vérifier les conflits
```json
POST /api/rattrapages/check-conflicts
{
  "date": "2025-01-20",
  "start_hour": "14:00",
  "end_hour": "16:00"
}
```

## Gestion des erreurs

### Erreur 404 - Rattrapage non trouvé
```json
{
  "success": false,
  "message": "Rattrapage non trouvé"
}
```

### Erreur 400 - Conflit d'horaires
```json
{
  "success": false,
  "message": "Conflit d'horaires détecté pour cette date"
}
```

### Erreur 400 - Validation échouée
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "end_hour": ["L'heure de fin doit être après l'heure de début"]
  }
}
```

## Notes importantes

1. **Ordre des routes** : Les routes spécifiques sont définies avant `Route::apiResource` pour éviter les conflits
2. **Type casting** : Les paramètres `$id` sont explicitement castés en `int`
3. **Gestion des conflits** : Vérification automatique des conflits d'horaires
4. **Validation temporelle** : Les dates doivent être aujourd'hui ou dans le futur
5. **Format des heures** : Format HH:MM pour les heures de début et fin
6. **Pagination** : Toutes les méthodes de liste supportent la pagination
7. **Statistiques** : Fournit des métriques temporelles utiles
8. **Accesseurs** : Formatage automatique des heures et dates 