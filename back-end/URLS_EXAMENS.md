# 📚 URLs API Examens - Résumé Rapide

## 🔐 **Routes Protégées (Authentification requise)**

### **CRUD Examens**
```
GET    /api/examens                    - Liste des examens
POST   /api/examens                    - Créer un examen
GET    /api/examens/{id}              - Récupérer un examen
PUT    /api/examens/{id}              - Modifier un examen
DELETE /api/examens/{id}              - Supprimer un examen
```

### **Importation**
```
POST   /api/import-examens             - Importer depuis CSV
```

### **Filtres et Options**
```
GET    /api/examens/etablissements     - Liste établissements
GET    /api/examens/promotions         - Liste promotions
GET    /api/examens/salles            - Liste salles
GET    /api/examens/filter-options    - Toutes les options
```

## 📥 **Importation CSV**

**Endpoint :** `POST /api/import-examens`

**Format CSV requis :**
```csv
title,date,heure_debut,heure_fin,option_id,salle_id,promotion_id,type_examen_id,etablissement_id
Examen Bio,2025-01-15,08:00,10:00,1,1,1,1,1
```

**Headers :**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

## 🚀 **Exemple cURL**

```bash
# Importer des examens
curl -X POST \
  http://localhost:8000/api/import-examens \
  -H 'Authorization: Bearer {token}' \
  -F 'file=@examens.csv'

# Lister les examens
curl -X GET \
  http://localhost:8000/api/examens \
  -H 'Authorization: Bearer {token}'
```

---
*Documentation complète : `README_API_EXAMENS.md`* 