# Endpoints API pour le Profil Utilisateur

## Configuration des Routes

Le composant profil utilise maintenant les endpoints suivants pour consulter les cookies storage :

### 🔐 **Endpoints avec Authentification (Cookies)**

#### 1. **Récupérer le profil de l'utilisateur connecté**
```
GET /api/profile
```
- **Description** : Récupère les données de l'utilisateur connecté depuis les cookies
- **Authentification** : Cookies (withCredentials: true)
- **Réponse** : Données complètes de l'utilisateur connecté

#### 2. **Mettre à jour le profil de l'utilisateur connecté**
```
PUT /api/profile
```
- **Description** : Met à jour les informations du profil de l'utilisateur connecté
- **Authentification** : Cookies (withCredentials: true)
- **Body** : Données à mettre à jour (first_name, last_name, email, preferences)

#### 3. **Changer le mot de passe**
```
POST /api/profile/change-password
```
- **Description** : Change le mot de passe de l'utilisateur connecté
- **Authentification** : Cookies (withCredentials: true)
- **Body** : { current_password, new_password, confirm_password }

#### 4. **Uploader un avatar**
```
POST /api/profile/avatar
```
- **Description** : Upload un avatar pour l'utilisateur connecté
- **Authentification** : Cookies (withCredentials: true)
- **Body** : FormData avec le fichier image

### 🔍 **Endpoints pour utilisateurs spécifiques (optionnels)**

#### 5. **Récupérer le profil d'un utilisateur par ID**
```
GET /api/users/{id}
```
- **Description** : Récupère les données d'un utilisateur spécifique
- **Authentification** : Non requise (pour usage interne)
- **Réponse** : { status: "success", user: {...} }

## 🍪 **Gestion des Cookies**

### **Consultation des Données**
- ✅ **Lecture** : Les données sont lues depuis les cookies storage
- ✅ **Affichage** : Les informations sont affichées sans modification
- ✅ **Préservation** : Les cookies ne sont pas supprimés ou modifiés

### **Mise à Jour des Données**
- ✅ **Local** : Les données sont mises à jour localement pour l'affichage
- ✅ **Serveur** : Les modifications sont envoyées au serveur
- ✅ **Synchronisation** : Les cookies sont mis à jour par le serveur

## 🔧 **Configuration du Service**

### **URLs de Base**
```typescript
private readonly API_URL = 'http://10.0.244.100:8000/api';
private readonly PROFILE_ENDPOINT = `${this.API_URL}/users`;
```

### **Méthodes Principales**
- `getUserProfile()` : Récupère le profil depuis les cookies
- `updateUserProfile(data)` : Met à jour le profil
- `changePassword(data)` : Change le mot de passe
- `uploadAvatar(file)` : Upload un avatar

## 📋 **Structure des Données**

### **Réponse du Profil**
```json
{
  "id": 1,
  "first_name": "Admin",
  "last_name": "System",
  "email": "admin@um6ss.ma",
  "role_id": 1,
  "post_id": 1,
  "etablissement_id": 1,
  "created_at": "2025-09-09T09:26:55.000000Z",
  "updated_at": "2025-09-09T09:26:55.000000Z",
  "role": {
    "id": 1,
    "name": "Super Admin"
  },
  "post": {
    "id": 1,
    "name": "Doyen"
  },
  "etablissement": {
    "id": 1,
    "name": "FACULTÉ MOHAMMED VI DE MÉDECINE UM6SS"
  }
}
```

## 🚀 **Utilisation**

### **Chargement du Profil**
```typescript
// Le composant charge automatiquement les données depuis les cookies
ngOnInit() {
  this.loadUserProfile(); // Utilise GET /api/profile
}
```

### **Mise à Jour du Profil**
```typescript
// Mise à jour des informations
this.profileService.updateUserProfile(updateData)
  .subscribe(updatedProfile => {
    // Les données sont mises à jour localement
  });
```

## ⚠️ **Points Importants**

1. **Cookies Storage** : Les données sont consultées depuis les cookies sans les supprimer
2. **Authentification** : Tous les endpoints utilisent `withCredentials: true`
3. **Synchronisation** : Les modifications sont synchronisées avec le serveur
4. **Sécurité** : Les cookies sont gérés par le serveur pour la sécurité
5. **Performance** : Les données sont mises en cache localement pour un affichage rapide
