# Guide de test Postman pour l'API Examens

## 🚀 **Installation et configuration**

### 1. **Importer la collection**
1. Ouvrez Postman
2. Cliquez sur "Import"
3. Sélectionnez le fichier `Postman_Examens_Collection.json`
4. La collection "API Examens - Tests" sera importée

### 2. **Configuration des variables**
1. Cliquez sur l'icône ⚙️ (engrenage) à côté de la collection
2. Dans l'onglet "Variables", configurez :
   - `base_url` : `http://127.0.0.1:8000/api`
   - `auth_token` : Votre token d'authentification

### 3. **Démarrer le serveur Laravel**
```bash
cd back-end
php artisan serve --host=127.0.0.1 --port=8000
```

## 🔐 **Authentification**

### Obtenir un token
```bash
# Créer un utilisateur de test
php artisan tinker
User::create(['name' => 'Test User', 'email' => 'test@test.com', 'password' => Hash::make('password')]);

# Ou utiliser un utilisateur existant
```

### Headers requis
```
Authorization: Bearer {votre_token}
Content-Type: application/json
```

## 📋 **Tests à exécuter dans l'ordre**

### **Phase 1 : Tests de base**

#### 1. **Récupérer tous les examens**
- **Endpoint** : `GET /api/examens`
- **Attendu** : Liste paginée des examens avec relations
- **Vérifier** : 
  - Status 200
  - Données paginées
  - Relations `group` et `ville` chargées

#### 2. **Récupérer les options de filtre**
- **Endpoint** : `GET /api/examens/filter-options`
- **Attendu** : Liste des options pour les filtres
- **Vérifier** :
  - Status 200
  - Présence de `groups` et `villes`
  - Autres options disponibles

#### 3. **Récupérer un examen spécifique**
- **Endpoint** : `GET /api/examens/1`
- **Attendu** : Détails d'un examen avec relations
- **Vérifier** :
  - Status 200
  - Relations `group` et `ville` chargées
  - Tous les champs présents

### **Phase 2 : Tests de création**

#### 4. **Créer un nouvel examen**
- **Endpoint** : `POST /api/examens`
- **Body** : Voir JSON ci-dessous
- **Attendu** : Status 201, examen créé
- **Vérifier** :
  - Status 201
  - Tous les champs sauvegardés
  - Relations créées

```json
{
  "title": "Examen de Mathématiques Avancées",
  "date": "2025-02-15",
  "heure_debut": "09:00:00",
  "heure_fin": "11:00:00",
  "annee_universitaire": "2024-2025",
  "group_id": 1,
  "ville_id": 1,
  "etablissement_id": 1,
  "promotion_id": 1,
  "type_examen_id": 1,
  "salle_id": 1,
  "option_id": 1
}
```

#### 5. **Créer un examen sans option**
- **Endpoint** : `POST /api/examens`
- **Body** : Sans `option_id`
- **Attendu** : Status 201, examen créé
- **Vérifier** : `option_id` est null

### **Phase 3 : Tests de modification**

#### 6. **Modifier un examen existant**
- **Endpoint** : `PUT /api/examens/{id}`
- **Body** : Modifier quelques champs
- **Attendu** : Status 200, examen modifié
- **Vérifier** : Changements appliqués

### **Phase 4 : Tests de filtrage**

#### 7. **Filtrage par groupe**
- **Endpoint** : `GET /api/examens?group_id=1`
- **Attendu** : Examens du groupe 1 uniquement
- **Vérifier** : Tous les examens ont `group_id = 1`

#### 8. **Filtrage par ville**
- **Endpoint** : `GET /api/examens?ville_id=1`
- **Attendu** : Examens de la ville 1 uniquement
- **Vérifier** : Tous les examens ont `ville_id = 1`

#### 9. **Filtrage combiné**
- **Endpoint** : `GET /api/examens?group_id=1&ville_id=1&size=5`
- **Attendu** : Examens du groupe 1 ET de la ville 1
- **Vérifier** : Filtres combinés fonctionnent

#### 10. **Recherche par titre**
- **Endpoint** : `GET /api/examens?searchValue=mathématique`
- **Attendu** : Examens contenant "mathématique" dans le titre
- **Vérifier** : Recherche insensible à la casse

#### 11. **Filtrage par date**
- **Endpoint** : `GET /api/examens?date=2025-01-15`
- **Attendu** : Examens du 15 janvier 2025
- **Vérifier** : Format de date accepté

### **Phase 5 : Tests de validation**

#### 12. **Test de validation - Champs manquants**
- **Endpoint** : `POST /api/examens`
- **Body** : Sans `group_id` et `ville_id`
- **Attendu** : Status 422, erreurs de validation
- **Vérifier** : Messages d'erreur appropriés

#### 13. **Test de validation - Heures invalides**
- **Endpoint** : `POST /api/examens`
- **Body** : `heure_fin` avant `heure_debut`
- **Attendu** : Status 422, erreur de validation
- **Vérifier** : Message d'erreur sur les heures

#### 14. **Test de validation - ID inexistant**
- **Endpoint** : `POST /api/examens`
- **Body** : `group_id = 999` (n'existe pas)
- **Attendu** : Status 422, erreur de validation
- **Vérifier** : Message d'erreur sur les clés étrangères

### **Phase 6 : Tests de suppression**

#### 15. **Supprimer un examen**
- **Endpoint** : `DELETE /api/examens/{id}`
- **Attendu** : Status 200, message de succès
- **Vérifier** : Examen supprimé de la base

## 🔍 **Vérifications importantes**

### **Structure de réponse attendue**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Examen de Mathématiques",
      "date": "2025-01-15",
      "heure_debut": "09:00:00",
      "heure_fin": "11:00:00",
      "annee_universitaire": "2024-2025",
      "group_id": 1,
      "ville_id": 1,
      "group": {
        "id": 1,
        "name": "Groupe A"
      },
      "ville": {
        "id": 1,
        "name": "Paris"
      },
      "etablissement": { ... },
      "promotion": { ... },
      "type_examen": { ... },
      "salle": { ... },
      "option": { ... }
    }
  ],
  "current_page": 1,
  "per_page": 10,
  "total": 90,
  "last_page": 9
}
```

### **Codes de statut attendus**
- `200` : Succès (GET, PUT)
- `201` : Créé (POST)
- `422` : Erreur de validation
- `404` : Non trouvé
- `500` : Erreur serveur

## 🧪 **Tests automatisés**

### **Scripts de test Postman**
Ajoutez ces scripts dans l'onglet "Tests" de chaque requête :

#### **Test de base pour GET**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has data", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('data');
});
```

#### **Test pour création d'examen**
```javascript
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Examen has required fields", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.response).to.have.property('group_id');
    pm.expect(jsonData.response).to.have.property('ville_id');
});
```

## 🚨 **Dépannage**

### **Erreurs communes**

#### **401 Unauthorized**
- Vérifiez que le token est valide
- Vérifiez le format : `Bearer {token}`

#### **422 Validation Error**
- Vérifiez que tous les champs requis sont présents
- Vérifiez les formats de date et heure
- Vérifiez que les IDs de référence existent

#### **404 Not Found**
- Vérifiez que l'URL est correcte
- Vérifiez que l'ID existe dans la base

#### **500 Internal Server Error**
- Vérifiez les logs Laravel
- Vérifiez la connexion à la base de données

### **Vérification de la base**
```bash
# Vérifier les examens
php verify_examens.php

# Vérifier les relations
php artisan tinker
Examen::with(['group', 'ville'])->first()
```

## 📊 **Métriques de test**

### **Tests de performance**
- Temps de réponse < 500ms pour les requêtes simples
- Temps de réponse < 2s pour les requêtes avec filtres complexes
- Gestion de la pagination pour de gros volumes

### **Tests de charge**
- Créer 100+ examens pour tester la pagination
- Tester avec des filtres complexes
- Vérifier la mémoire et les performances

## 🎯 **Objectifs de test**

- ✅ **Fonctionnalité** : Toutes les opérations CRUD fonctionnent
- ✅ **Validation** : Les erreurs sont gérées correctement
- ✅ **Relations** : Les nouveaux champs `group_id` et `ville_id` fonctionnent
- ✅ **Filtrage** : Tous les filtres fonctionnent correctement
- ✅ **Performance** : Les réponses sont rapides
- ✅ **Sécurité** : L'authentification est requise

## 📝 **Documentation des tests**

Après chaque test, documentez :
- **Résultat** : Succès/Échec
- **Temps de réponse** : En millisecondes
- **Problèmes rencontrés** : Description détaillée
- **Suggestions d'amélioration** : Si applicable

Cette documentation vous aidera à identifier les problèmes et à améliorer l'API.
