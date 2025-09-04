# 🚀 Tests Postman pour l'API de Statistiques

## 📋 Configuration Postman

### **Base URL**
```
http://localhost:8000/api
```

### **Headers**
```
Content-Type: application/json
Accept: application/json
```

---

## 🎯 Test 1: Récupération des Statistiques Générales

### **Endpoint**
```
GET /statistics
```

### **Description**
Récupère toutes les statistiques du système, y compris les nouvelles statistiques temporelles.

### **Réponse Attendue**
```json
{
  "success": true,
  "message": "Statistiques récupérées avec succès",
  "data": {
    "general": {
      "total_villes": 5,
      "total_etudiants": 150,
      "total_groups": 25,
      "total_etablissements": 8,
      "total_promotions": 6,
      "total_options": 12,
      "total_cours": 25,
      "total_examens": 18,
      "total_absences": 45,
      "total_rattrapages": 12
    },
    "cours": {
      "total": 25,
      "par_type": [
        {
          "type_name": "Cours magistral",
          "count": 15
        },
        {
          "type_name": "Travaux pratiques",
          "count": 8
        },
        {
          "type_name": "Travaux dirigés",
          "count": 2
        }
      ],
      "par_promotion": [
        {
          "promotion_name": "1ère année",
          "count": 8
        },
        {
          "promotion_name": "2ème année",
          "count": 7
        },
        {
          "promotion_name": "3ème année",
          "count": 5
        },
        {
          "promotion_name": "4ème année",
          "count": 3
        },
        {
          "promotion_name": "5ème année",
          "count": 2
        }
      ],
      "par_etablissement": [
        {
          "etablissement_name": "Faculté des Sciences",
          "count": 15
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "count": 10
        }
      ],
      "par_statut_temporel": {
        "en_cours": 3,
        "en_passe": 18,
        "futur": 4
      }
    },
    "examens": {
      "total": 18,
      "par_type": [
        {
          "type_name": "Examen final",
          "count": 12
        },
        {
          "type_name": "Contrôle continu",
          "count": 4
        },
        {
          "type_name": "Partiel",
          "count": 2
        }
      ],
      "par_etablissement": [
        {
          "etablissement_name": "Faculté des Sciences",
          "count": 12
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "count": 6
        }
      ],
      "par_statut_temporel": {
        "en_cours": 1,
        "en_passe": 12,
        "futur": 5
      }
    },
    "etudiants": {
      "total": 150,
      "par_ville": [
        {
          "ville_name": "Casablanca",
          "count": 45
        },
        {
          "ville_name": "Rabat",
          "count": 38
        },
        {
          "ville_name": "Fès",
          "count": 25
        },
        {
          "ville_name": "Marrakech",
          "count": 22
        },
        {
          "ville_name": "Tanger",
          "count": 20
        }
      ],
      "par_etablissement": [
        {
          "etablissement_name": "Faculté des Sciences",
          "count": 85
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "count": 65
        }
      ],
      "par_promotion": [
        {
          "promotion_name": "1ère année",
          "count": 30
        },
        {
          "promotion_name": "2ème année",
          "count": 28
        },
        {
          "promotion_name": "3ème année",
          "count": 25
        },
        {
          "promotion_name": "4ème année",
          "count": 22
        },
        {
          "promotion_name": "5ème année",
          "count": 20
        },
        {
          "promotion_name": "6ème année",
          "count": 15
        }
      ],
      "par_option": [
        {
          "option_name": "Mathématiques",
          "count": 25
        },
        {
          "option_name": "Physique",
          "count": 22
        },
        {
          "option_name": "Chimie",
          "count": 20
        },
        {
          "option_name": "Biologie",
          "count": 18
        },
        {
          "option_name": "Informatique",
          "count": 15
        }
      ]
    },
    "villes": [
      {
        "ville_id": 1,
        "ville_name": "Casablanca",
        "nombre_etudiants": 45,
        "nombre_groups": 8,
        "nombre_etablissements": 3,
        "pourcentage_etudiants": 30.0,
        "pourcentage_groups": 32.0
      },
      {
        "ville_id": 2,
        "ville_name": "Rabat",
        "nombre_etudiants": 38,
        "nombre_groups": 6,
        "nombre_etablissements": 2,
        "pourcentage_etudiants": 25.3,
        "pourcentage_groups": 24.0
      }
    ],
    "groups": {
      "total": 25,
      "par_ville": [
        {
          "ville_name": "Casablanca",
          "count": 8
        },
        {
          "ville_name": "Rabat",
          "count": 6
        }
      ],
      "par_etablissement": [
        {
          "etablissement_name": "Faculté des Sciences",
          "count": 15
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "count": 10
        }
      ],
      "par_promotion": [
        {
          "promotion_name": "1ère année",
          "count": 5
        },
        {
          "promotion_name": "2ème année",
          "count": 5
        }
      ],
      "taille_moyenne": 6.0,
      "repartition_taille": [
        {
          "group_title": "Groupe A",
          "student_count": 8
        },
        {
          "group_title": "Groupe B",
          "student_count": 6
        }
      ]
    },
    "etablissements": {
      "total": 8,
      "par_ville": [
        {
          "ville_name": "Casablanca",
          "count": 3
        },
        {
          "ville_name": "Rabat",
          "count": 2
        }
      ],
      "capacite_detaille": [
        {
          "etablissement_name": "Faculté des Sciences",
          "ville_name": "Casablanca",
          "nombre_etudiants": 85,
          "nombre_groups": 15
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "ville_name": "Rabat",
          "nombre_etudiants": 65,
          "nombre_groups": 10
        }
      ]
    },
    "promotions": {
      "total": 6,
      "etudiants_par_promotion": [
        {
          "promotion_name": "1ère année",
          "nombre_etudiants": 30
        },
        {
          "promotion_name": "2ème année",
          "nombre_etudiants": 28
        }
      ]
    },
    "options": {
      "total": 12,
      "par_etablissement": [
        {
          "etablissement_name": "Faculté des Sciences",
          "count": 8
        },
        {
          "etablissement_name": "Faculté de Médecine",
          "count": 4
        }
      ],
      "etudiants_par_option": [
        {
          "option_name": "Mathématiques",
          "etablissement_name": "Faculté des Sciences",
          "nombre_etudiants": 25
        },
        {
          "option_name": "Physique",
          "etablissement_name": "Faculté des Sciences",
          "nombre_etudiants": 22
        }
      ]
    },
    "absences": {
      "total": 45,
      "top_absences_etudiants": [
        {
          "first_name": "Ahmed",
          "last_name": "Benali",
          "nombre_absences": 8
        },
        {
          "first_name": "Fatima",
          "last_name": "Zahra",
          "nombre_absences": 6
        }
      ]
    },
    "rattrapages": {
      "total": 12,
      "par_mois": [
        {
          "mois": 1,
          "annee": 2025,
          "nombre_rattrapages": 5
        },
        {
          "mois": 2,
          "annee": 2025,
          "nombre_rattrapages": 7
        }
      ]
    },
    "repartition_geographique": {
      "densite_par_ville": [
        {
          "ville_name": "Casablanca",
          "nombre_etudiants": 45,
          "nombre_groups": 8,
          "nombre_etablissements": 3
        },
        {
          "ville_name": "Rabat",
          "nombre_etudiants": 38,
          "nombre_groups": 6,
          "nombre_etablissements": 2
        }
      ],
      "top_5_villes": [
        {
          "ville_name": "Casablanca",
          "nombre_etudiants": 45,
          "nombre_groups": 8,
          "nombre_etablissements": 3
        },
        {
          "ville_name": "Rabat",
          "nombre_etudiants": 38,
          "nombre_groups": 6,
          "nombre_etablissements": 2
        }
      ]
    },
    "performance": {
      "taux_presence_approximatif": 70.0,
      "total_absences": 45,
      "total_etudiants": 150
    }
  }
}
```

---

## 🔍 Test 2: Vérification des Statistiques Temporelles

### **Points Clés à Vérifier**

1. **Cours par statut temporel** :
   - `en_cours` : Cours qui se déroulent actuellement
   - `en_passe` : Cours qui se sont terminés
   - `futur` : Cours qui n'ont pas encore commencé

2. **Examens par statut temporel** :
   - `en_cours` : Examen en cours
   - `en_passe` : Examens terminés
   - `futur` : Examens à venir

---

## 📊 Test 3: Validation des Données

### **Vérifications à Faire**

1. **Totaux cohérents** : La somme des statuts temporels doit égaler le total
2. **Dates logiques** : Les cours/examens en cours doivent avoir des dates d'aujourd'hui
3. **Heures cohérentes** : `heure_debut` < `heure_fin`
4. **Statuts temporels** : Doivent correspondre aux valeurs enum : `['passé', 'en_cours', 'futur']`

---

## 🚨 Test 4: Gestion des Erreurs

### **Test avec Base de Données Vide**

```json
{
  "success": false,
  "message": "Erreur lors de la récupération des statistiques",
  "error": "SQLSTATE[42S02]: Base table or view not found"
}
```

### **Test avec Données Manquantes**

```json
{
  "success": false,
  "message": "Erreur lors de la récupération des statistiques",
  "error": "SQLSTATE[42S22]: Column not found"
}
```

---

## 📱 Collection Postman

### **Variables d'Environnement**

```json
{
  "base_url": "http://localhost:8000/api",
  "port": "8000"
}
```

### **Tests Automatiques**

```javascript
// Test de succès
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success true", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Statistics data exists", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('cours');
    pm.expect(jsonData.data).to.have.property('examens');
});

pm.test("Temporal status exists for courses", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.cours).to.have.property('par_statut_temporel');
    pm.expect(jsonData.data.cours.par_statut_temporel).to.have.property('en_cours');
    pm.expect(jsonData.data.cours.par_statut_temporel).to.have.property('en_passe');
    pm.expect(jsonData.data.cours.par_statut_temporel).to.have.property('futur');
});

pm.test("Temporal status exists for exams", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.data.examens).to.have.property('par_statut_temporel');
    pm.expect(jsonData.data.examens.par_statut_temporel).to.have.property('en_cours');
    pm.expect(jsonData.data.examens.par_statut_temporel).to.have.property('en_passe');
    pm.expect(jsonData.data.examens.par_statut_temporel).to.have.property('futur');
});
```

---

## 🎯 Résumé des Tests

1. **Test Principal** : `GET /api/statistics`
2. **Vérification** : Structure JSON et données temporelles
3. **Validation** : Cohérence des totaux et des statuts
4. **Gestion d'erreurs** : Tests avec données manquantes

## 🚀 Prochaines Étapes

1. **Importer** cette collection dans Postman
2. **Configurer** l'environnement avec votre base URL
3. **Exécuter** les tests après avoir configuré la base de données
4. **Vérifier** que toutes les statistiques temporelles fonctionnent

---

## 📞 Support

Si vous rencontrez des problèmes :
- Vérifiez que la base de données est configurée
- Consultez les logs Laravel
- Vérifiez que tous les seeders ont été exécutés
