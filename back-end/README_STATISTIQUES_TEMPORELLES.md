# Statistiques par Statut Temporel

## Vue d'ensemble

Ce document décrit les nouvelles fonctionnalités ajoutées au `StatisticController` pour fournir des statistiques basées sur le statut temporel des cours et des examens.

## Fonctionnalités Ajoutées

### 1. Statistiques des Cours par Statut Temporel

Les cours sont maintenant classés selon trois statuts temporels :

- **En cours** : Cours qui se déroulent actuellement (date d'aujourd'hui et heure actuelle entre l'heure de début et l'heure de fin)
- **En passe** : Cours qui se sont déjà terminés (date passée ou date d'aujourd'hui mais heure de fin dépassée)
- **Futur** : Cours qui n'ont pas encore commencé (date future ou date d'aujourd'hui mais heure de début pas encore atteinte)

### 2. Statistiques des Examens par Statut Temporel

Les examens sont également classés selon les mêmes trois statuts temporels :

- **En cours** : Examen qui se déroule actuellement
- **En passe** : Examen qui s'est déjà terminé
- **Futur** : Examen qui n'a pas encore commencé

## Structure des Données

### Réponse de l'API

```json
{
  "success": true,
  "message": "Statistiques récupérées avec succès",
  "data": {
    "cours": {
      "total": 150,
      "par_type": [...],
      "par_promotion": [...],
      "par_etablissement": [...],
      "par_statut_temporel": {
        "en_cours": 5,
        "en_passe": 120,
        "futur": 25
      }
    },
    "examens": {
      "total": 45,
      "par_type": [...],
      "par_etablissement": [...],
      "par_statut_temporel": {
        "en_cours": 2,
        "en_passe": 30,
        "futur": 13
      }
    }
  }
}
```

## Modifications Apportées

### 1. Modèles

#### Cours.php
- Ajout des champs `date`, `heure_debut`, `heure_fin`
- Ajout des méthodes `isEnCours()`, `isEnPasse()`, `isFutur()`, `getStatutTemporel()`
- Ajout des casts appropriés pour les dates et heures

#### Examen.php
- Ajout des méthodes `isEnCours()`, `isEnPasse()`, `isFutur()`, `getStatutTemporel()`
- Ajout des casts appropriés pour les dates et heures

### 2. Migrations

#### 2025_01_20_000000_add_date_fields_to_cours_table.php
- Ajout des champs `date`, `heure_debut`, `heure_fin` à la table `cours`

#### 2025_01_20_000001_add_date_fields_to_examens_table.php
- Vérification et ajout des champs de date si nécessaire à la table `examens`

### 3. Contrôleur

#### StatisticController.php
- Ajout de la méthode `getCoursStatutTemporel()`
- Ajout de la méthode `getExamenStatutTemporel()`
- Intégration des statistiques temporelles dans `getCoursStatistics()` et `getExamenStatistics()`

## Logique de Calcul

### Cours/Examen "En Cours"
```php
$now->isSameDay($date) && $now->between($heure_debut, $heure_fin)
```

### Cours/Examen "En Passe"
```php
$now->isAfter($date) || ($now->isSameDay($date) && $now->isAfter($heure_fin))
```

### Cours/Examen "Futur"
```php
$now->isBefore($date) || ($now->isSameDay($date) && $now->isBefore($heure_debut))
```

## Tests

Un fichier de test complet a été créé (`StatisticControllerTest.php`) qui vérifie :

1. La récupération des statistiques des cours avec statut temporel
2. La récupération des statistiques des examens avec statut temporel
3. La structure correcte de la réponse JSON
4. Les comptages corrects pour chaque statut

## Utilisation

### Récupération des Statistiques

```php
// Appel de l'API
GET /api/statistics

// Accès aux statistiques temporelles
$coursStats = $response->json('data.cours.par_statut_temporel');
$examensStats = $response->json('data.examens.par_statut_temporel');
```

### Utilisation dans le Code

```php
// Dans un contrôleur ou service
$statistics = app(StatisticController::class)->getAllStatistics();

$coursEnCours = $statistics['cours']['par_statut_temporel']['en_cours'];
$examensFuturs = $statistics['examens']['par_statut_temporel']['futur'];
```

## Avantages

1. **Vue en temps réel** : Permet de voir combien de cours/examens sont actuellement en cours
2. **Planification** : Aide à identifier le nombre de cours/examens à venir
3. **Analyse historique** : Permet de voir combien de cours/examens se sont déjà déroulés
4. **Performance** : Calculs optimisés avec des requêtes SQL directes
5. **Flexibilité** : Facilement extensible pour d'autres types de statistiques temporelles

## Maintenance

- Les statistiques sont calculées en temps réel à chaque appel de l'API
- Aucune mise en cache n'est implémentée pour l'instant
- Les calculs sont basés sur l'heure du serveur
- Considérer l'ajout d'un index sur les champs `date`, `heure_debut`, `heure_fin` pour améliorer les performances
