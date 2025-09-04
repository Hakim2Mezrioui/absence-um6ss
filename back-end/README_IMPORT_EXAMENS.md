# Importation des Examens

## Description
Ce module permet d'importer des examens depuis un fichier CSV vers la base de données.

## Format du fichier CSV

### En-têtes requis
Le fichier CSV doit contenir les colonnes suivantes (dans n'importe quel ordre) :

- `title` : Titre de l'examen (obligatoire)
- `date` : Date de l'examen (obligatoire)
- `heure_debut` : Heure de début (obligatoire)
- `heure_fin` : Heure de fin (obligatoire)
- `salle_id` : ID de la salle (obligatoire)
- `promotion_id` : ID de la promotion (obligatoire)
- `type_examen_id` : ID du type d'examen (obligatoire)
- `etablissement_id` : ID de l'établissement (obligatoire)
- `option_id` : ID de l'option (optionnel)

### Formats de date supportés
- `YYYY-MM-DD` (ex: 2025-01-15)
- `DD/MM/YYYY` (ex: 15/01/2025)
- `DD-MM-YYYY` (ex: 15-01-2025)
- `MM/DD/YYYY` (ex: 01/15/2025)

### Formats d'heure supportés
- `HH:MM` (ex: 08:00)
- `HH:MM:SS` (ex: 08:00:00)
- `H:M` (ex: 8:0)
- `H:M:S` (ex: 8:0:0)

## Exemple de fichier CSV

```csv
title,date,heure_debut,heure_fin,option_id,salle_id,promotion_id,type_examen_id,etablissement_id
Examen de Biologie,2025-01-15,08:00,10:00,1,1,1,1,1
Examen de Chimie,2025-01-16,14:00,16:00,2,2,1,1,1
Examen de Physique,2025-01-17,09:00,11:00,1,3,2,2,1
```

## Utilisation de l'API

### Endpoint
```
POST /api/import-examens
```

### Headers
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

### Paramètres
- `file` : Fichier CSV à importer

### Exemple de requête cURL
```bash
curl -X POST \
  http://localhost:8000/api/import-examens \
  -H 'Authorization: Bearer {votre_token}' \
  -F 'file=@examens.csv'
```

### Réponse en cas de succès
```json
{
  "message": "3 examens importés avec succès",
  "imported_count": 3,
  "data": [...]
}
```

### Réponse en cas d'erreur
```json
{
  "message": "Erreurs détectées lors de l'importation",
  "errors": [
    {
      "line": 3,
      "data": ["Examen de Physique", "2025-01-17", "09:00", "11:00", "1", "999", "2", "2", "1"],
      "error": "L'ID 999 pour 'salle_id' n'existe pas à la ligne 3"
    }
  ],
  "total_errors": 1
}
```

## Validation des données

### Vérifications effectuées
1. **Champs requis** : Tous les champs obligatoires doivent être présents et non vides
2. **Format de date** : La date doit être dans un des formats supportés
3. **Format d'heure** : Les heures doivent être dans un des formats supportés
4. **Cohérence des heures** : L'heure de fin doit être après l'heure de début
5. **Clés étrangères** : Tous les IDs référencés doivent exister dans leurs tables respectives

### Tables de référence
- `salles` : Pour `salle_id`
- `promotions` : Pour `promotion_id`
- `types_examen` : Pour `type_examen_id`
- `etablissements` : Pour `etablissement_id`
- `options` : Pour `option_id` (si fourni)

## Gestion des erreurs

### Types d'erreurs
- **Erreurs de validation** : Données mal formatées ou invalides
- **Erreurs de référence** : IDs inexistants dans les tables de référence
- **Erreurs de base de données** : Problèmes lors de l'insertion

### Stratégie de traitement
- Les erreurs sont collectées ligne par ligne
- L'importation s'arrête si des erreurs sont détectées
- Aucune donnée n'est insérée en cas d'erreur
- Un rapport détaillé des erreurs est retourné

## Bonnes pratiques

### Préparation du fichier
1. Vérifiez que tous les IDs référencés existent dans la base
2. Utilisez des formats de date et d'heure cohérents
3. Testez avec un petit fichier avant l'importation en masse

### Gestion des données
1. Sauvegardez vos données avant l'importation
2. Vérifiez les contraintes de votre base de données
3. Surveillez les logs pour détecter d'éventuels problèmes

## Support technique

En cas de problème :
1. Vérifiez le format de votre fichier CSV
2. Consultez les messages d'erreur retournés par l'API
3. Vérifiez que tous les IDs référencés existent
4. Consultez les logs du serveur pour plus de détails 