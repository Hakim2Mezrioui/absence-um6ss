# Documentation - Création Automatique des Absences

## Vue d'ensemble

Ce système permet de créer automatiquement des absences pour les étudiants absents ou en retard lors d'examens, basé sur les données de présence récupérées du système Biostar.

## Fonctionnalités

### 1. Création Automatique des Absences
- **Manuelle** : Bouton dans l'interface d'attendance pour déclencher la création
- **Automatique** : Peut être configurée pour se déclencher automatiquement
- **Basée sur les données d'attendance** : Utilise les statuts "absent" et "en retard"

### 2. Types d'Absences Créées
- **Absence non justifiée** : Pour les étudiants marqués comme "absent"
- **Retard** : Pour les étudiants marqués comme "en retard"

### 3. Informations Stockées
- ID de l'étudiant
- ID de l'examen
- Date de l'absence
- Type d'absence
- Motif automatiquement généré
- Statut de justification (par défaut: non justifié)

## Structure de la Base de Données

### Table `absences`
```sql
CREATE TABLE absences (
    id INTEGER PRIMARY KEY,
    type_absence VARCHAR(255) NOT NULL,
    etudiant_id INTEGER NOT NULL,
    cours_id INTEGER NULL,
    examen_id INTEGER NULL,  -- Nouveau champ ajouté
    date_absence DATE NOT NULL,
    justifiee BOOLEAN DEFAULT 0,
    motif TEXT NULL,
    justificatif VARCHAR(255) NULL,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (etudiant_id) REFERENCES etudiants(id),
    FOREIGN KEY (examen_id) REFERENCES examens(id)
);
```

## API Endpoints

### 1. Créer des absences pour un examen spécifique
```http
POST /api/absences/auto/create-for-examen
Content-Type: application/json

{
    "examen_id": 123
}
```

### 2. Créer des absences pour tous les examens d'une date
```http
POST /api/absences/auto/create-for-date
Content-Type: application/json

{
    "date": "2025-01-20"
}
```

### 3. Créer des absences basées sur les données d'attendance
```http
POST /api/absences/auto/create-from-attendance
Content-Type: application/json

{
    "examen_id": 123,
    "etudiants_absents": [
        {
            "etudiant_id": 456,
            "status": "absent",
            "punch_time": "2025-01-20 08:30:00"
        },
        {
            "etudiant_id": 789,
            "status": "en retard",
            "punch_time": "2025-01-20 09:15:00"
        }
    ]
}
```

### 4. Obtenir les statistiques des absences
```http
GET /api/absences/auto/statistics?examen_id=123
```

## Interface Utilisateur

### Bouton de Création d'Absences
- **Emplacement** : Interface de suivi des présences
- **Couleur** : Rouge pour indiquer l'action importante
- **Badge** : Affiche le nombre d'étudiants concernés
- **État désactivé** : Quand aucun étudiant absent/en retard

### Dialogue de Confirmation
- **Avertissement** : Action irréversible
- **Informations de l'examen** : Date, heure, salle
- **Statistiques** : Nombre d'étudiants concernés
- **Liste détaillée** : Étudiants absents/en retard
- **Boutons** : Annuler / Confirmer

## Logique de Création

### 1. Filtrage des Étudiants
```typescript
const etudiantsAbsents = students.filter(student => 
    student.status === 'absent' || student.status === 'en retard'
);
```

### 2. Détermination du Type d'Absence
```typescript
const typeAbsence = student.status === 'en retard' ? 'Retard' : 'Absence non justifiée';
```

### 3. Génération du Motif
```typescript
const motif = `Absence à l'examen '${examen.title}' du ${dateFormatee}`;
```

## Configuration

### Variables d'Environnement
```env
# Base de données
DB_CONNECTION=sqlite
DB_DATABASE=database/database.sqlite

# API
API_URL=http://localhost:8000/api
```

### Paramètres par Défaut
- **Tolérance** : 15 minutes
- **Type d'absence par défaut** : "Absence non justifiée"
- **Justification par défaut** : false

## Utilisation

### 1. Accès à l'Interface
1. Naviguer vers la page de suivi des présences
2. Sélectionner les filtres (date, promotion, groupe, etc.)
3. Cliquer sur "Actualiser" pour charger les données

### 2. Création des Absences
1. Vérifier que des étudiants sont marqués comme absents/en retard
2. Cliquer sur le bouton "Créer Absences" (rouge)
3. Examiner le dialogue de confirmation
4. Cliquer sur "Créer les absences" pour confirmer

### 3. Vérification
1. Les absences sont créées dans la base de données
2. Une notification de succès s'affiche
3. Le dialogue se ferme automatiquement

## Sécurité

### Vérifications
- **Existence de l'examen** : Vérification avant création
- **Existence de l'étudiant** : Validation des IDs
- **Absences existantes** : Évite les doublons
- **Transaction** : Rollback en cas d'erreur

### Permissions
- **Authentification requise** : Tous les endpoints sont protégés
- **Validation des données** : Contrôle strict des entrées
- **Logs** : Traçabilité des actions

## Monitoring et Logs

### Logs de Création
```php
Log::info("Absence créée pour l'étudiant {$etudiant->matricule} - {$typeAbsence}");
```

### Logs d'Erreur
```php
Log::error("Erreur lors de la création des absences: " . $e->getMessage());
```

### Métriques
- Nombre d'absences créées
- Nombre d'absences existantes (évitées)
- Temps de traitement
- Taux de succès

## Maintenance

### Nettoyage des Données
```sql
-- Supprimer les absences d'un examen spécifique
DELETE FROM absences WHERE examen_id = ?;

-- Supprimer les absences d'une date spécifique
DELETE FROM absences WHERE date_absence = ?;
```

### Vérification de l'Intégrité
```sql
-- Vérifier les absences orphelines
SELECT * FROM absences a 
LEFT JOIN etudiants e ON a.etudiant_id = e.id 
WHERE e.id IS NULL;

-- Vérifier les examens orphelins
SELECT * FROM absences a 
LEFT JOIN examens e ON a.examen_id = e.id 
WHERE e.id IS NULL;
```

## Dépannage

### Problèmes Courants

1. **Aucun étudiant trouvé**
   - Vérifier les filtres appliqués
   - Vérifier la connexion à la base de données

2. **ID d'examen manquant**
   - Vérifier que l'examen existe
   - Vérifier les paramètres de route

3. **Erreur de création**
   - Vérifier les logs d'erreur
   - Vérifier la structure de la base de données

### Commandes de Test
```bash
# Tester la création d'absences
php test_absence_creation.php

# Vérifier les migrations
php artisan migrate:status

# Vérifier les logs
tail -f storage/logs/laravel.log
```

## Évolutions Futures

### Fonctionnalités Prévues
- **Création automatique** : Déclenchement automatique à la fin des examens
- **Notifications** : Alertes par email pour les absences importantes
- **Rapports** : Génération de rapports d'absences
- **Intégration** : Synchronisation avec d'autres systèmes

### Améliorations Techniques
- **Queue** : Traitement asynchrone pour les gros volumes
- **Cache** : Mise en cache des données fréquemment utilisées
- **API** : Endpoints supplémentaires pour la gestion avancée
