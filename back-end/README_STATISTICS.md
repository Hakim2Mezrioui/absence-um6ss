# Contrôleur de Statistiques

Ce contrôleur fournit une fonction complète pour collecter toutes les statistiques possibles du système de gestion des absences.

## Route

```
GET /api/statistics
```

**Authentification requise** : Oui (middleware `auth:sanctum`)

## Fonctionnalités

### 1. Statistiques Générales (`general`)
- Total des villes
- Total des étudiants
- Total des groupes
- Total des établissements
- Total des promotions
- Total des options
- Total des cours
- Total des examens
- Total des absences
- Total des rattrapages

### 2. Statistiques par Ville (`villes`)
- Nombre d'étudiants par ville
- Nombre de groupes par ville
- Nombre d'établissements par ville
- Pourcentages par rapport aux totaux

### 3. Statistiques des Étudiants (`etudiants`)
- Total des étudiants
- Répartition par ville
- Répartition par établissement
- Répartition par promotion
- Répartition par option

### 4. Statistiques des Groupes (`groups`)
- Total des groupes
- Répartition par ville
- Répartition par établissement
- Répartition par promotion
- Taille moyenne des groupes
- Répartition détaillée de la taille des groupes

### 5. Statistiques des Établissements (`etablissements`)
- Total des établissements
- Répartition par ville
- Capacité détaillée (étudiants, groupes, promotions)

### 6. Statistiques des Promotions (`promotions`)
- Total des promotions
- Répartition par établissement
- Nombre d'étudiants par promotion

### 7. Statistiques des Options (`options`)
- Total des options
- Répartition par établissement
- Nombre d'étudiants par option

### 8. Statistiques des Cours (`cours`)
- Total des cours
- Répartition par type

### 9. Statistiques des Examens (`examens`)
- Total des examens
- Répartition par type

### 10. Statistiques des Absences (`absences`)
- Total des absences
- Top 10 des étudiants avec le plus d'absences

### 11. Statistiques des Rattrapages (`rattrapages`)
- Total des rattrapages
- Répartition par mois/année

### 12. Répartition Géographique (`repartition_geographique`)
- Densité des étudiants par ville
- Top 5 des villes avec le plus d'étudiants
- Nombre de groupes et établissements par ville

### 13. Statistiques de Performance (`performance`)
- Taux de présence approximatif
- Total des absences
- Total des étudiants

## Exemple de Réponse

```json
{
  "success": true,
  "message": "Statistiques récupérées avec succès",
  "data": {
    "general": {
      "total_villes": 15,
      "total_etudiants": 1250,
      "total_groups": 45,
      "total_etablissements": 8,
      "total_promotions": 12,
      "total_options": 24,
      "total_cours": 180,
      "total_examens": 95,
      "total_absences": 156,
      "total_rattrapages": 23
    },
    "villes": [
      {
        "ville_id": 1,
        "ville_name": "Casablanca",
        "nombre_etudiants": 450,
        "nombre_groups": 18,
        "nombre_etablissements": 3,
        "pourcentage_etudiants": 36.0,
        "pourcentage_groups": 40.0
      }
    ],
    "etudiants": {
      "total": 1250,
      "par_ville": [
        {
          "ville_name": "Casablanca",
          "count": 450
        }
      ],
      "par_etablissement": [
        {
          "etablissement_name": "Université Hassan II",
          "count": 320
        }
      ]
    }
  }
}
```

## Utilisation

### Avec cURL
```bash
curl -X GET "http://localhost:8000/api/statistics" \
  -H "Authorization: Bearer {votre_token}" \
  -H "Accept: application/json"
```

### Avec JavaScript/Fetch
```javascript
fetch('/api/statistics', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json'
  }
})
.then(response => response.json())
.then(data => {
  console.log('Statistiques:', data.data);
  
  // Accès aux statistiques spécifiques
  console.log('Total étudiants:', data.data.general.total_etudiants);
  console.log('Étudiants par ville:', data.data.etudiants.par_ville);
  console.log('Top 5 villes:', data.data.repartition_geographique.top_5_villes);
});
```

### Avec Axios
```javascript
import axios from 'axios';

const response = await axios.get('/api/statistics', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const statistics = response.data.data;
console.log('Statistiques complètes:', statistics);
```

## Notes Importantes

1. **Authentification requise** : Cette route nécessite un token d'authentification valide
2. **Performance** : La fonction exécute plusieurs requêtes SQL complexes, elle peut prendre du temps sur de grandes bases de données
3. **Données en temps réel** : Les statistiques sont calculées à chaque appel de l'API
4. **Gestion d'erreurs** : Le contrôleur inclut une gestion d'erreurs complète avec des messages appropriés

## Cas d'Usage

- **Tableaux de bord** : Affichage des métriques clés du système
- **Rapports administratifs** : Génération de rapports pour la direction
- **Analyses géographiques** : Compréhension de la répartition des étudiants
- **Suivi des performances** : Monitoring des taux de présence et d'absence
- **Planification** : Aide à la planification des ressources éducatives
