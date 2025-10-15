# Implémentation du Filtrage par Ville et Établissement

## Vue d'ensemble

Cette implémentation ajoute un système de filtrage automatique basé sur la ville et l'établissement de l'utilisateur authentifié. Toutes les entités (groupes, étudiants, examens, cours, enseignants, promotions, salles) sont automatiquement filtrées selon le contexte de l'utilisateur connecté.

## Architecture

### Backend (Laravel)

#### 1. Services de Contexte Utilisateur

**UserContextService** (`app/Services/UserContextService.php`)
- Récupère le contexte de l'utilisateur authentifié (ville_id, etablissement_id)
- Fournit des méthodes utilitaires pour vérifier le contexte utilisateur

**FilterByUserContext** (`app/Services/FilterByUserContext.php`)
- Trait réutilisable pour ajouter le filtrage par contexte utilisateur
- Applique automatiquement les filtres ville_id et etablissement_id

#### 2. Services Mis à Jour

Tous les services principaux ont été mis à jour pour utiliser le trait `FilterByUserContext` :

- **EtudiantService** : Filtrage automatique des étudiants par ville/établissement
- **CoursService** : Filtrage automatique des cours par ville/établissement  
- **GroupService** : Filtrage automatique des groupes par ville/établissement
- **ExamenService** : Filtrage automatique des examens par ville/établissement
- **EnseignantService** : Filtrage automatique des enseignants par ville/établissement
- **SalleService** : Filtrage automatique des salles par ville/établissement
- **PromotionService** : Filtrage automatique des promotions par ville/établissement
- **ConfigurationService** : Sélection automatique de la configuration Biostar par ville

#### 3. Contrôleurs Mis à Jour

Les contrôleurs principaux appliquent maintenant le filtrage par contexte utilisateur :

- **EtudiantController** : Filtrage automatique dans les méthodes index, create, update, delete
- **CoursController** : Filtrage automatique dans les méthodes index, create, update
- **ConfigurationController** : Nouvelle méthode `getForUserVille()` pour récupérer la configuration de la ville de l'utilisateur

#### 4. Routes API

Nouvelle route ajoutée :
```
GET /api/configuration/user-ville
```
Récupère automatiquement la configuration Biostar pour la ville de l'utilisateur connecté.

### Frontend (Angular)

#### 1. Services de Contexte Utilisateur

**UserContextService** (`src/app/services/user-context.service.ts`)
- Gère le contexte utilisateur côté frontend
- Charge automatiquement la configuration Biostar pour la ville de l'utilisateur
- Fournit des méthodes utilitaires pour le filtrage

**BaseApiService** (`src/app/services/base-api.service.ts`)
- Service de base pour les appels API avec filtrage automatique
- Ajoute automatiquement les paramètres de contexte utilisateur aux requêtes
- Méthodes utilitaires pour POST/PUT avec contexte utilisateur

#### 2. Services Mis à Jour

**AuthService** (`src/app/services/auth.service.ts`)
- Initialise automatiquement le contexte utilisateur lors de la connexion
- Charge la configuration Biostar pour la ville de l'utilisateur
- Nettoie le contexte lors de la déconnexion

**EtudiantsService** (`src/app/services/etudiants.service.ts`)
- Hérite de BaseApiService pour le filtrage automatique
- Méthodes getEtudiants, createEtudiant, updateEtudiant utilisent le contexte utilisateur

**CoursService** (`src/app/services/cours.service.ts`)
- Hérite de BaseApiService pour le filtrage automatique
- Méthodes getCours, createCours, updateCours utilisent le contexte utilisateur

## Logique de Filtrage

### Règles de Filtrage

1. **Filtrage par Ville** : Toujours appliqué si l'utilisateur a une ville assignée
2. **Filtrage par Établissement** : Appliqué seulement si l'utilisateur a un établissement assigné
3. **Configuration Biostar** : Sélectionnée automatiquement selon la ville de l'utilisateur

### Exemple de Filtrage

```php
// Backend - Dans un service utilisant FilterByUserContext
public function getAllEtudiants(): Collection
{
    $query = Etudiant::with(['group', 'etablissement', 'promotion', 'ville']);
    return $this->applyUserContextFilters($query)->get();
}
```

```typescript
// Frontend - Dans un service héritant de BaseApiService
getEtudiants(filters: EtudiantFilters = {}): Observable<EtudiantResponse> {
    let params = new HttpParams();
    // ... ajout des filtres spécifiques
    params = this.addUserContextFilters(params); // Filtrage automatique
    return this.http.get<EtudiantResponse>(`${this.baseUrl}/etudiants`, { params });
}
```

## Configuration Biostar Automatique

La configuration de connexion Biostar est automatiquement sélectionnée selon la ville de l'utilisateur :

1. Lors de la connexion, le frontend charge la configuration pour la ville de l'utilisateur
2. Le backend fournit l'endpoint `/api/configuration/user-ville` pour récupérer cette configuration
3. Cette configuration est utilisée pour toutes les opérations nécessitant une connexion Biostar

## Sécurité

- Le filtrage est appliqué côté serveur pour garantir la sécurité
- Les utilisateurs ne peuvent accéder qu'aux données de leur ville/établissement
- La configuration Biostar est automatiquement sélectionnée selon le contexte utilisateur

## Utilisation

### Pour les Développeurs

1. **Nouveaux Services** : Hériter de `BaseApiService` pour le filtrage automatique
2. **Nouveaux Modèles** : Ajouter les champs `ville_id` et `etablissement_id` si nécessaire
3. **Nouveaux Contrôleurs** : Utiliser `UserContextService` pour récupérer le contexte utilisateur

### Pour les Utilisateurs

- Aucune action requise
- Le filtrage est automatique et transparent
- Les données affichées sont automatiquement limitées au contexte de l'utilisateur
- La configuration Biostar est automatiquement sélectionnée

## Tests

Pour tester l'implémentation :

1. Connectez-vous avec un utilisateur ayant une ville et un établissement assignés
2. Vérifiez que seules les données de cette ville/établissement sont affichées
3. Créez de nouvelles entités et vérifiez qu'elles sont automatiquement assignées au bon contexte
4. Vérifiez que la configuration Biostar est automatiquement chargée pour la ville de l'utilisateur
