# API d'Importation des Rattrapages

## Description
Cette API permet d'importer des rattrapages en masse depuis un fichier CSV. Elle valide les données, vérifie les conflits d'horaires et insère les rattrapages valides dans la base de données.

## Endpoint
```
POST /api/rattrapages/import
```

## Authentification
Cette route nécessite une authentification via le middleware `auth:sanctum`.

## Paramètres
- `file` (obligatoire) : Fichier CSV ou TXT à importer

## Format du fichier CSV

### En-têtes requis
Le fichier CSV doit contenir les colonnes suivantes (dans n'importe quel ordre) :
- `name` : Nom du rattrapage
- `date` : Date du rattrapage
- `start_hour` : Heure de début
- `end_hour` : Heure de fin

### Exemple de fichier CSV
```csv
name,date,start_hour,end_hour
Rattrapage Mathématiques,15/01/2025,09:00,11:00
Rattrapage Physique,16/01/2025,14:00,16:00
Rattrapage Chimie,17/01/2025,10:00,12:00
```

### Formats acceptés

#### Dates
- `dd/mm/yyyy` (ex: 15/01/2025)
- `yyyy-mm-dd` (ex: 2025-01-15)

#### Heures
- `HH:MM` (ex: 09:00, 14:30, 16:45)

## Validation des données

### Règles de validation
1. **Nom** : Obligatoire, chaîne de caractères
2. **Date** : Obligatoire, format valide, ne peut pas être dans le passé
3. **Heure de début** : Obligatoire, format HH:MM
4. **Heure de fin** : Obligatoire, format HH:MM, doit être après l'heure de début
5. **Conflits d'horaires** : Vérification automatique des conflits pour la même date

### Vérifications effectuées
- Format des dates et heures
- Cohérence des horaires (début < fin)
- Dates dans le futur uniquement
- Absence de conflits d'horaires avec d'autres rattrapages existants

## Réponses

### Succès (200)
```json
{
  "success": true,
  "message": "5 rattrapages importés avec succès",
  "imported_count": 5,
  "total_processed": 5
}
```

### Erreur de validation (400)
```json
{
  "success": false,
  "message": "Erreurs détectées lors de l'importation",
  "errors": [
    {
      "line": 3,
      "data": ["Rattrapage Test", "invalid-date", "09:00", "11:00"],
      "error": "Format de date invalide. Utilisez dd/mm/yyyy ou yyyy-mm-dd"
    }
  ],
  "total_errors": 1,
  "success_count": 0
}
```

### Erreur de fichier (400)
```json
{
  "success": false,
  "message": "Aucun fichier téléchargé"
}
```

### Erreur de type de fichier (400)
```json
{
  "success": false,
  "message": "Type de fichier non supporté. Utilisez CSV ou TXT"
}
```

### Erreur de traitement (500)
```json
{
  "success": false,
  "message": "Erreur lors du traitement du fichier",
  "error": "Message d'erreur détaillé"
}
```

## Gestion des erreurs

### Types d'erreurs possibles
1. **Fichier manquant** : Aucun fichier n'a été envoyé
2. **Type de fichier invalide** : Seuls les fichiers CSV et TXT sont acceptés
3. **En-têtes manquants** : Colonnes requises absentes du fichier
4. **Données invalides** : Format incorrect des dates/heures
5. **Conflits d'horaires** : Chevauchement avec des rattrapages existants
6. **Erreurs de base de données** : Problèmes lors de l'insertion

### Gestion des transactions
- Utilisation de transactions de base de données pour garantir l'intégrité
- Rollback automatique en cas d'erreur
- Aucun rattrapage n'est inséré si des erreurs sont détectées

## Exemple d'utilisation

### cURL
```bash
curl -X POST \
  http://localhost:8000/api/rattrapages/import \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -F 'file=@rattrapages.csv'
```

### JavaScript/Fetch
```javascript
const formData = new FormData();
formData.append('file', fileInput.files[0]);

fetch('/api/rattrapages/import', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

## Composant Angular

Un composant Angular est disponible pour l'interface utilisateur :
- **Fichier** : `absence/src/app/components/import-rattrapages/`
- **Route** : `/import-rattrapages`
- **Fonctionnalités** :
  - Upload de fichier drag & drop
  - Validation côté client
  - Affichage des erreurs détaillées
  - Téléchargement de template CSV
  - Redirection après succès

## Sécurité

- Authentification requise
- Validation stricte des types de fichiers
- Sanitisation des données d'entrée
- Protection contre les injections SQL
- Limitation de taille de fichier (10MB max)

## Logs

L'API génère des logs détaillés pour :
- Les tentatives d'importation
- Les erreurs de validation
- Les conflits d'horaires détectés
- Les succès d'importation

## Support

Pour toute question ou problème avec cette API, consultez :
- Les logs de l'application
- La documentation des modèles
- Le service `RattrapageService`
- Le contrôleur `RattrapageController` 