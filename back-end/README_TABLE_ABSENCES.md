# Structure de la Table Absences

Ce document décrit la structure de la table `absences` dans la base de données.

## Vue d'ensemble

La table `absences` stocke toutes les informations relatives aux absences des étudiants, que ce soit pour des cours ou des examens.

## Structure de la table

### Colonnes principales

| Colonne | Type | Nullable | Description |
|---------|------|----------|-------------|
| `id` | `bigint unsigned` | ❌ | Clé primaire auto-incrémentée |
| `type_absence` | `varchar(255)` | ❌ | Type d'absence (Maladie, Retard, etc.) |
| `etudiant_id` | `bigint unsigned` | ❌ | ID de l'étudiant (clé étrangère) |
| `cours_id` | `bigint unsigned` | ✅ | ID du cours (clé étrangère, nullable) |
| `examen_id` | `bigint unsigned` | ✅ | ID de l'examen (clé étrangère, nullable) |
| `date_absence` | `date` | ❌ | Date de l'absence |
| `justifiee` | `boolean` | ❌ | Statut de justification (défaut: false) |
| `motif` | `text` | ✅ | Motif de l'absence |
| `justificatif` | `varchar(255)` | ✅ | Nom du fichier justificatif |
| `created_at` | `timestamp` | ❌ | Date de création de l'enregistrement |
| `updated_at` | `timestamp` | ❌ | Date de dernière modification |

### Contraintes de clés étrangères

- `etudiant_id` → `etudiants.id` (CASCADE DELETE)
- `cours_id` → `cours.id` (CASCADE DELETE)
- `examen_id` → `examens.id` (CASCADE DELETE)

### Index de performance

```sql
-- Index composites pour les requêtes fréquentes
INDEX `absences_etudiant_id_date_absence_index` (`etudiant_id`, `date_absence`)
INDEX `absences_cours_id_date_absence_index` (`cours_id`, `date_absence`)
INDEX `absences_examen_id_date_absence_index` (`examen_id`, `date_absence`)

-- Index simples pour les filtres
INDEX `absences_type_absence_index` (`type_absence`)
INDEX `absences_justifiee_index` (`justifiee`)
```

## Règles métier

### Contraintes de validation

1. **Au moins une référence** : Soit `cours_id` soit `examen_id` doit être renseigné
2. **Étudiant obligatoire** : `etudiant_id` est toujours requis
3. **Date obligatoire** : `date_absence` est toujours requise
4. **Type d'absence** : `type_absence` est toujours requis

### Types d'absences courants

- **Maladie** : Absence pour raison médicale
- **Retard** : Arrivée en retard
- **Absence non justifiée** : Absence sans motif valable
- **Motif familial** : Absence pour raison familiale
- **Rendez-vous médical** : Consultation médicale
- **Transport** : Problème de transport
- **Absence à un examen** : Absence lors d'un examen
- **Retard à un examen** : Retard lors d'un examen

## Exemples d'utilisation

### Création d'une absence pour un cours

```sql
INSERT INTO absences (
    type_absence,
    etudiant_id,
    cours_id,
    date_absence,
    justifiee,
    motif
) VALUES (
    'Maladie',
    1,
    5,
    '2025-01-27',
    false,
    'Grippe'
);
```

### Création d'une absence pour un examen

```sql
INSERT INTO absences (
    type_absence,
    etudiant_id,
    examen_id,
    date_absence,
    justifiee,
    motif,
    justificatif
) VALUES (
    'Maladie',
    2,
    3,
    '2025-01-28',
    true,
    'Certificat médical',
    'certificat_001.pdf'
);
```

### Mise à jour du statut de justification

```sql
UPDATE absences 
SET justifiee = true,
    motif = 'Certificat médical fourni',
    justificatif = 'certificat_002.pdf'
WHERE id = 1;
```

## Requêtes SQL utiles

### Absences par étudiant

```sql
SELECT 
    e.nom,
    e.prenom,
    a.type_absence,
    a.date_absence,
    a.justifiee,
    a.motif
FROM absences a
JOIN etudiants e ON a.etudiant_id = e.id
WHERE a.etudiant_id = 1
ORDER BY a.date_absence DESC;
```

### Absences par cours

```sql
SELECT 
    c.title as cours,
    e.nom,
    e.prenom,
    a.type_absence,
    a.date_absence,
    a.justifiee
FROM absences a
JOIN etudiants e ON a.etudiant_id = e.id
JOIN cours c ON a.cours_id = c.id
WHERE a.cours_id = 5
ORDER BY a.date_absence DESC;
```

### Statistiques des absences

```sql
SELECT 
    type_absence,
    COUNT(*) as total,
    SUM(CASE WHEN justifiee = 1 THEN 1 ELSE 0 END) as justifiees,
    SUM(CASE WHEN justifiee = 0 THEN 1 ELSE 0 END) as non_justifiees
FROM absences
GROUP BY type_absence
ORDER BY total DESC;
```

### Absences par période

```sql
SELECT 
    DATE(date_absence) as date,
    COUNT(*) as total_absences,
    SUM(CASE WHEN justifiee = 1 THEN 1 ELSE 0 END) as justifiees
FROM absences
WHERE date_absence BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY DATE(date_absence)
ORDER BY date;
```

## Migration

### Exécuter la migration

```bash
php artisan migrate
```

### Annuler la migration

```bash
php artisan migrate:rollback
```

### Recréer la table

```bash
php artisan migrate:refresh
```

## Seeding

### Exécuter le seeder

```bash
php artisan db:seed --class=AbsenceSeeder
```

### Données de test créées

Le seeder crée 10 absences de test avec différents types, motifs et statuts de justification pour tester le système.

## Maintenance

### Vérification de l'intégrité

```sql
-- Vérifier les clés étrangères orphelines
SELECT a.* 
FROM absences a
LEFT JOIN etudiants e ON a.etudiant_id = e.id
WHERE e.id IS NULL;

SELECT a.* 
FROM absences a
LEFT JOIN cours c ON a.cours_id = c.id
WHERE a.cours_id IS NOT NULL AND c.id IS NULL;

SELECT a.* 
FROM absences a
LEFT JOIN examens ex ON a.examen_id = ex.id
WHERE a.examen_id IS NOT NULL AND ex.id IS NULL;
```

### Nettoyage des données

```sql
-- Supprimer les absences sans référence valide
DELETE a FROM absences a
LEFT JOIN etudiants e ON a.etudiant_id = e.id
WHERE e.id IS NULL;
```

## Performance

### Recommandations

1. **Index** : Les index composites sont essentiels pour les requêtes fréquentes
2. **Partitionnement** : Considérer le partitionnement par date pour les grandes tables
3. **Archivage** : Archiver les anciennes absences (plus de 2 ans)
4. **Cache** : Mettre en cache les statistiques fréquemment consultées

### Monitoring

```sql
-- Vérifier la taille de la table
SELECT 
    table_name,
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size (MB)'
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name = 'absences';

-- Vérifier l'utilisation des index
SHOW INDEX FROM absences;
``` 