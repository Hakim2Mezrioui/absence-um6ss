# Gestion des Utilisateurs - Frontend Angular

## Vue d'ensemble

Le composant `UserManagementComponent` fournit une interface utilisateur complète pour la gestion des utilisateurs du système. Cette interface est accessible uniquement aux super administrateurs et permet d'effectuer toutes les opérations CRUD sur les utilisateurs.

## Fonctionnalités

### 🔐 Sécurité
- **Accès restreint** : Seuls les super administrateurs peuvent accéder à cette interface
- **Authentification requise** : Token Sanctum nécessaire pour toutes les opérations
- **Protection des routes** : Guard Angular `RoleGuard` avec restriction `['super-admin']`

### 📊 Interface utilisateur
- **Tableau interactif** : Affichage paginé des utilisateurs avec tri et filtrage
- **Recherche avancée** : Recherche par nom, prénom ou email
- **Filtres multiples** : Par rôle, établissement, ville
- **Actions rapides** : Modification des rôles directement dans le tableau
- **Modales élégantes** : Création, modification et suppression avec confirmation

### 🎯 Opérations disponibles
- **Création** : Nouvel utilisateur avec validation complète
- **Lecture** : Liste paginée avec informations détaillées
- **Modification** : Édition des informations utilisateur
- **Suppression** : Suppression avec confirmation
- **Gestion des rôles** : Changement de rôle en temps réel

## Structure du composant

### Fichiers
```
src/app/components/user-management/
├── user-management.component.ts    # Logique du composant
├── user-management.component.html  # Template HTML
└── user-management.component.css   # Styles CSS
```

### Interfaces TypeScript
```typescript
interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  role?: { id: number; name: string; };
  post_id: number;
  post?: { id: number; name: string; };
  etablissement_id?: number;
  etablissement?: { id: number; name: string; };
  ville_id?: number;
  ville?: { id: number; name: string; };
  created_at: string;
  updated_at: string;
}
```

## Utilisation

### 1. Accès à l'interface
- Connectez-vous avec un compte super administrateur
- Cliquez sur "Gestion des utilisateurs" dans la sidebar
- L'interface se charge automatiquement avec la liste des utilisateurs

### 2. Navigation et filtrage
- **Recherche** : Tapez dans le champ de recherche et appuyez sur Entrée
- **Filtres** : Sélectionnez un rôle, établissement ou ville dans les listes déroulantes
- **Pagination** : Utilisez les boutons de navigation en bas du tableau

### 3. Création d'un utilisateur
1. Cliquez sur "Nouvel Utilisateur"
2. Remplissez le formulaire avec les informations requises
3. Cliquez sur "Créer" pour enregistrer

### 4. Modification d'un utilisateur
1. Cliquez sur l'icône "Modifier" (crayon) dans la ligne de l'utilisateur
2. Modifiez les informations dans le formulaire
3. Cliquez sur "Modifier" pour sauvegarder

### 5. Changement de rôle rapide
1. Cliquez sur le menu déroulant "Rôle" dans la ligne de l'utilisateur
2. Sélectionnez le nouveau rôle
3. Le changement est appliqué automatiquement

### 6. Suppression d'un utilisateur
1. Cliquez sur l'icône "Supprimer" (poubelle) dans la ligne de l'utilisateur
2. Confirmez la suppression dans la modal
3. L'utilisateur est supprimé définitivement

## Configuration

### URL de l'API
```typescript
private apiUrl = 'http://localhost:8000/api';
```

### Endpoints utilisés
- `GET /api/user-management` - Liste des utilisateurs
- `POST /api/user-management` - Créer un utilisateur
- `GET /api/user-management/{id}` - Voir un utilisateur
- `PUT /api/user-management/{id}` - Modifier un utilisateur
- `DELETE /api/user-management/{id}` - Supprimer un utilisateur
- `PUT /api/user-management/{id}/role` - Changer le rôle
- `GET /api/user-management/form-options` - Options des formulaires
- `GET /api/user-management/statistics` - Statistiques
- `GET /api/user-management/search` - Recherche

### Authentification
Le composant utilise automatiquement le token d'authentification stocké dans :
1. Cookies (`auth_token`)
2. LocalStorage (`auth_token`)
3. SessionStorage (`auth_token`)

## Personnalisation

### Styles CSS
Le composant utilise Tailwind CSS avec des classes personnalisées :
- `.user-avatar` - Styles pour les avatars utilisateur
- `.role-badge` - Badges colorés pour les rôles
- `.modal-content` - Styles pour les modales
- `.table-container` - Styles pour le tableau

### Responsive Design
- **Desktop** : Interface complète avec sidebar
- **Tablet** : Adaptation des colonnes du tableau
- **Mobile** : Interface optimisée avec modales adaptées

## Gestion des erreurs

### Messages d'erreur
- **Validation** : Erreurs de formulaire affichées en rouge
- **API** : Erreurs serveur affichées avec détails
- **Réseau** : Messages d'erreur de connexion

### États de chargement
- **Spinner** : Indicateur de chargement pendant les opérations
- **Désactivation** : Boutons désactivés pendant les requêtes
- **Feedback visuel** : Animations et transitions

## Intégration avec la sidebar

### Ajout dans la navigation
```typescript
{
  label: 'Gestion des utilisateurs',
  icon: 'admin_panel_settings',
  route: '/user-management',
  tooltip: 'Gestion complète des utilisateurs et rôles',
  roles: ['super-admin']
}
```

### Restriction d'accès
- Seuls les utilisateurs avec le rôle `super-admin` voient cette option
- Le composant vérifie automatiquement les permissions
- Redirection automatique si l'utilisateur n'a pas les droits

## Tests et débogage

### Console du navigateur
- **Logs** : Messages détaillés des opérations API
- **Erreurs** : Affichage des erreurs avec stack trace
- **État** : Informations sur l'état du composant

### Outils de développement
- **Network** : Surveillance des requêtes API
- **Application** : Inspection du localStorage/sessionStorage
- **Elements** : Inspection du DOM et des styles

## Bonnes pratiques

### Sécurité
- ✅ Vérification des permissions côté client ET serveur
- ✅ Validation des données avant envoi
- ✅ Gestion sécurisée des tokens d'authentification
- ✅ Protection contre les attaques XSS

### Performance
- ✅ Pagination pour les grandes listes
- ✅ Chargement paresseux des données
- ✅ Mise en cache des options de formulaire
- ✅ Optimisation des requêtes API

### Accessibilité
- ✅ Navigation au clavier
- ✅ Labels appropriés pour les formulaires
- ✅ Contraste de couleurs suffisant
- ✅ Messages d'erreur clairs

## Maintenance

### Mise à jour des données
- Les données sont rechargées automatiquement après chaque opération
- Synchronisation en temps réel des changements
- Gestion des conflits de données

### Sauvegarde
- Les modifications sont sauvegardées automatiquement
- Possibilité d'annuler les modifications non sauvegardées
- Historique des actions dans les logs

Cette interface de gestion des utilisateurs est maintenant entièrement intégrée dans l'application et accessible via la sidebar pour les super administrateurs uniquement.
