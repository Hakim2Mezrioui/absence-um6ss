# Student Photo Upload System

## Overview
Ce document décrit le système d'upload de photos pour les étudiants implémenté dans l'application.

## Fonctionnalités

### Backend (Laravel)
- Upload de photos dans `storage/app/public/photos/`
- Validation des formats : JPG, PNG, WEBP (max 2MB)
- Nommage des fichiers : `{matricule}_{timestamp}.{extension}`
- Suppression automatique de l'ancienne photo lors de la mise à jour
- Création automatique du dossier si nécessaire

### Frontend (Angular)
- Interface d'upload dans le formulaire "Ajouter un étudiant"
- Preview de la photo avant l'upload
- Validation côté client (taille et format)
- Affichage des photos au lieu des initiales
- Fallback sur les initiales si pas de photo

## Configuration

### 1. Lien symbolique Laravel

**IMPORTANT** : Vous devez créer le lien symbolique pour que les photos soient accessibles publiquement :

```bash
cd back-end
php artisan storage:link
```

Cela créera un lien symbolique de `public/storage` vers `storage/app/public`, permettant l'accès aux photos via l'URL :
```
http://votre-domaine/storage/photos/filename.jpg
```

### 2. Structure de stockage

Les photos sont stockées dans :
```
back-end/storage/app/public/photos/
```

Chaque photo est nommée avec le format :
```
{matricule}_{timestamp}.{extension}
```

Exemple : `ETU2024001_1704628800.jpg`

### 3. Permissions

Assurez-vous que le dossier a les bonnes permissions :

```bash
chmod -R 755 back-end/storage/app/public/photos
```

## Utilisation

### Ajouter une photo lors de la création d'un étudiant

1. Ouvrir le formulaire "Ajouter un étudiant"
2. Cliquer sur "Choisir une photo" dans la section "Photo de profil"
3. Sélectionner une image (JPG, PNG ou WEBP, max 2MB)
4. La photo s'affichera dans le preview
5. Cliquer sur "Créer l'étudiant"

### Afficher les photos des étudiants

Les photos s'affichent automatiquement à la place des initiales dans :
- Liste des étudiants (vue cartes et table)
- Détails de l'étudiant
- Tous les composants qui utilisent `getPhotoUrl()`

Si un étudiant n'a pas de photo, les initiales sont affichées par défaut.

## API Endpoints

### POST `/api/etudiants`
Crée un nouvel étudiant avec une photo optionnelle.

**Body** (FormData) :
- `photo`: Fichier image (optionnel)
- Autres champs standard de l'étudiant

**Validation** :
- `photo`: nullable|image|mimes:jpeg,jpg,png,webp|max:2048

### PUT `/api/etudiants/{id}`
Met à jour un étudiant avec une nouvelle photo optionnelle.

**Body** (FormData) :
- `photo`: Fichier image (optionnel)
- Autres champs à modifier

## Composants modifiés

### Backend
- `app/Http/Controllers/EtudiantController.php` : Gestion upload/suppression
- `app/Models/Etudiant.php` : Champ `photo` dans fillable

### Frontend
- `src/app/services/etudiants.service.ts` : Support FormData
- `src/app/components/add-student/add-student.component.ts` : Logique upload
- `src/app/components/add-student/add-student.component.html` : UI upload
- `src/app/components/etudiants/etudiants.component.ts` : Méthode getPhotoUrl()
- `src/app/components/etudiants/etudiants.component.html` : Affichage photos

## Format des URL de photos

Les photos sont accessibles via :
```
http://127.0.0.1:8000/storage/photos/{matricule}_{timestamp}.{ext}
```

Le chemin stocké en base de données est :
```
photos/{matricule}_{timestamp}.{ext}
```

## Limitations

- Taille maximale : 2MB
- Formats acceptés : JPG, PNG, WEBP
- Pas d'import en masse de photos (uniquement upload individuel)
- Photos non incluses dans l'import CSV

## Notes importantes

1. Les photos sont stockées côté serveur (pas d'URL externe)
2. L'ancienne photo est automatiquement supprimée lors d'une mise à jour
3. Le champ `photo` est optionnel
4. Les erreurs d'upload sont gérées avec validation avant soumission
