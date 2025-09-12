# 📋 Composant Profil Utilisateur

## Description

Le composant `ProfileComponent` permet aux utilisateurs de visualiser et modifier leur profil personnel. Il utilise l'authentification par token avec Laravel Sanctum.

## Fonctionnalités

### 👤 **Visualisation du Profil**
- Informations personnelles (nom, email, rôle, poste, établissement)
- Avatar utilisateur
- Statut de connexion
- Dates de création et dernière mise à jour

### ✏️ **Modification du Profil**
- Édition des informations de base
- Changement de mot de passe
- Upload d'avatar
- Préférences utilisateur

### 🔐 **Sécurité**
- Authentification par token Bearer
- Validation côté client et serveur
- Gestion d'erreur robuste

## Structure

```
profile/
├── profile.component.ts          # Logique du composant
├── profile.component.html        # Template HTML
├── profile.component.css         # Styles CSS
└── README.md                     # Documentation
```

## Utilisation

### **Route**
```typescript
{ path: "profile", component: ProfileComponent }
```

### **Accès**
- URL : `/dashboard/profile`
- Authentification requise
- Redirection vers `/login` si non authentifié

## API Endpoints

### **GET /api/profile**
- Récupère le profil de l'utilisateur connecté
- Headers : `Authorization: Bearer {token}`

### **PUT /api/users/{id}**
- Met à jour les informations utilisateur
- Headers : `Authorization: Bearer {token}`

### **POST /api/profile/change-password**
- Change le mot de passe
- Headers : `Authorization: Bearer {token}`

### **POST /api/profile/avatar**
- Upload un avatar
- Headers : `Authorization: Bearer {token}`

## Interfaces TypeScript

### **UserProfile**
```typescript
interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  post_id: number;
  etablissement_id: number;
  created_at: string;
  updated_at: string;
  role: { id: number; name: string; ... };
  post: { id: number; name: string; ... };
  etablissement: { id: number; name: string; ... };
  avatar?: string;
  last_login?: string;
  status?: 'active' | 'inactive' | 'suspended';
  preferences?: { language?: string; theme?: string; notifications?: boolean; };
}
```

### **ProfileUpdateData**
```typescript
interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  preferences?: { language?: string; theme?: string; notifications?: boolean; };
}
```

## Services Utilisés

### **ProfileService**
- `getUserProfile()` : Récupère le profil utilisateur
- `updateUserProfile()` : Met à jour le profil
- `changePassword()` : Change le mot de passe
- `uploadAvatar()` : Upload un avatar

### **AuthService**
- `getToken()` : Récupère le token d'authentification
- `logout()` : Déconnexion utilisateur

## Styles

### **Design Responsive**
- Mobile-first approach
- Breakpoints : 480px, 768px, 1024px
- Dark mode support

### **Composants Visuels**
- Header avec avatar et informations
- Onglets pour navigation
- Formulaires d'édition
- Messages d'erreur et de succès

## Gestion d'Erreur

### **États d'Erreur**
- Utilisateur non authentifié
- Erreur de chargement
- Erreur de mise à jour
- Erreur d'upload

### **Messages Utilisateur**
- Messages d'erreur clairs
- Boutons d'action (Réessayer, Se connecter)
- Feedback visuel

## Dépendances

- Angular 17+
- RxJS
- Material Icons
- Tailwind CSS (impliqué)

## Maintenance

### **Logs**
- Console logs pour debugging
- Gestion d'erreur détaillée
- Suivi des requêtes API

### **Performance**
- Lazy loading des données
- Gestion des observables
- Nettoyage des subscriptions