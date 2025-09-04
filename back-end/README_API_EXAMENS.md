# API Examens - Documentation des URLs

## Base URL
```
http://localhost:8000/api
```

## 🔐 Routes protégées (nécessitent une authentification)

### 📚 **CRUD des Examens (API Resource)**
```
GET    /examens                    - Liste tous les examens avec pagination
POST   /examens                    - Créer un nouvel examen
GET    /examens/{id}              - Récupérer un examen par ID
PUT    /examens/{id}              - Mettre à jour un examen
DELETE /examens/{id}              - Supprimer un examen
```

### 📥 **Importation des Examens**
```
POST   /import-examens             - Importer des examens depuis un fichier CSV
```

### 🔍 **Options de Filtrage**
```
GET    /examens/etablissements     - Liste tous les établissements pour les filtres
GET    /examens/promotions         - Liste toutes les promotions pour les filtres
GET    /examens/salles            - Liste toutes les salles pour les filtres
GET    /examens/filter-options    - Toutes les options de filtrage en une seule requête
```

## 📋 **Détail des Endpoints**

### 1. **Liste des Examens** - `GET /examens`
**Paramètres de requête :**
- `size` : Nombre d'éléments par page (défaut: 10, max: 100)
- `page` : Numéro de page (défaut: 1)
- `etablissement_id` : Filtrer par établissement
- `promotion_id` : Filtrer par promotion
- `salle_id` : Filtrer par salle
- `searchValue` : Recherche dans le titre
- `date` : Filtrer par date

**Exemple :**
```
GET /api/examens?size=20&page=1&etablissement_id=1&date=2025-01-15
```

**Réponse :**
```json
{
  "examens": [...],
  "pagination": {
    "current_page": 1,
    "per_page": 20,
    "total": 50,
    "total_pages": 3,
    "has_next_page": true,
    "has_prev_page": false
  },
  "filters": {...},
  "status": 200
}
```

### 2. **Créer un Examen** - `POST /examens`
**Body :**
```json
{
  "title": "Examen de Biologie",
  "date": "2025-01-15",
  "heure_debut": "08:00",
  "heure_fin": "10:00",
  "option_id": 1,
  "salle_id": 1,
  "promotion_id": 1,
  "type_examen_id": 1,
  "etablissement_id": 1
}
```

### 3. **Récupérer un Examen** - `GET /examens/{id}`
**Réponse :**
```json
{
  "examen": {
    "id": 1,
    "title": "Examen de Biologie",
    "date": "2025-01-15",
    "heure_debut": "08:00:00",
    "heure_fin": "10:00:00",
    "option_id": 1,
    "salle_id": 1,
    "promotion_id": 1,
    "type_examen_id": 1,
    "etablissement_id": 1,
    "etablissement": {...},
    "promotion": {...},
    "typeExamen": {...},
    "salle": {...},
    "option": {...}
  },
  "status": 200
}
```

### 4. **Mettre à jour un Examen** - `PUT /examens/{id}`
**Body :** Même structure que la création

### 5. **Supprimer un Examen** - `DELETE /examens/{id}`
**Réponse :**
```json
{
  "message": "Examen deleted successfully"
}
```

### 6. **Importer des Examens** - `POST /import-examens`
**Headers :**
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**Body :**
- `file` : Fichier CSV à importer

**Réponse en cas de succès :**
```json
{
  "message": "3 examens importés avec succès",
  "imported_count": 3,
  "data": [...]
}
```

**Réponse en cas d'erreur :**
```json
{
  "message": "Erreurs détectées lors de l'importation",
  "errors": [
    {
      "line": 3,
      "data": [...],
      "error": "L'ID 999 pour 'salle_id' n'existe pas à la ligne 3"
    }
  ],
  "total_errors": 1
}
```

### 7. **Options de Filtrage** - `GET /examens/filter-options`
**Réponse :**
```json
{
  "etablissements": [
    {"id": 1, "name": "Faculté de Médecine"},
    {"id": 2, "name": "Faculté de Pharmacie"}
  ],
  "promotions": [
    {"id": 1, "name": "1ère année"},
    {"id": 2, "name": "2ème année"}
  ],
  "salles": [
    {"id": 1, "name": "Salle A1", "etage": 1, "batiment": "A"},
    {"id": 2, "name": "Salle B2", "etage": 2, "batiment": "B"}
  ],
  "options": [
    {"id": 1, "name": "Pharmacie"},
    {"id": 2, "name": "Médecine"}
  ]
}
```

## 🔒 **Authentification**

Toutes les routes nécessitent un token Bearer dans le header :
```
Authorization: Bearer {votre_token}
```

## 📊 **Codes de Statut HTTP**

- `200` : Succès
- `201` : Créé avec succès
- `400` : Erreur de validation
- `401` : Non authentifié
- `404` : Ressource non trouvée
- `500` : Erreur serveur

## 🚀 **Exemples d'utilisation**

### **cURL - Liste des examens**
```bash
curl -X GET \
  http://localhost:8000/api/examens \
  -H 'Authorization: Bearer {votre_token}'
```

### **cURL - Créer un examen**
```bash
curl -X POST \
  http://localhost:8000/api/examens \
  -H 'Authorization: Bearer {votre_token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "title": "Examen de Chimie",
    "date": "2025-01-16",
    "heure_debut": "14:00",
    "heure_fin": "16:00",
    "salle_id": 1,
    "promotion_id": 1,
    "type_examen_id": 1,
    "etablissement_id": 1
  }'
```

### **cURL - Importer des examens**
```bash
curl -X POST \
  http://localhost:8000/api/import-examens \
  -H 'Authorization: Bearer {votre_token}' \
  -F 'file=@examens.csv'
```

## 📝 **Notes importantes**

1. **Pagination** : Par défaut 10 éléments par page, maximum 100
2. **Relations** : Les examens sont automatiquement chargés avec leurs relations
3. **Validation** : Toutes les données sont validées avant insertion
4. **Import** : Seuls les fichiers CSV et TXT sont acceptés
5. **Erreurs** : Les erreurs d'importation sont détaillées ligne par ligne 