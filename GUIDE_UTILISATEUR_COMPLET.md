# 📖 Guide Utilisateur Complet - Application UM6SS
## Système de Gestion des Absences et Présences

---

## 📋 Table des Matières

1. [Introduction](#introduction)
2. [Les Rôles et Permissions](#les-rôles-et-permissions)
3. [Fonctionnalités Majeures](#fonctionnalités-majeures)
4. [Guides Pratiques](#guides-pratiques)
5. [Contraintes Importantes](#contraintes-importantes)

---

## 🎯 Introduction

Cette application permet de gérer les présences et absences des étudiants aux cours et examens de l'Université Mohammed VI des Sciences de la Santé (UM6SS).

### Connexion

1. Accédez à l'application via votre navigateur
2. Entrez votre **email** et votre **mot de passe**
3. Cliquez sur **"Se connecter"**

> 📷 **Illustration à ajouter :** Capture d'écran de la page de connexion avec les champs email et mot de passe

### Tableau de Bord

Après connexion, vous accédez au tableau de bord qui affiche :
- Vue d'ensemble des statistiques
- Derniers examens et cours
- Notifications importantes

> 📷 **Illustration à ajouter :** Capture d'écran du tableau de bord avec les statistiques et les derniers éléments

---

## 👥 Les Rôles et Permissions

### 👑 Super Administrateur

**Rôle :** Gestion complète de l'application sans aucune restriction.

**Accès :**
- ✅ Tous les établissements et villes
- ✅ Toutes les fonctionnalités
- ✅ Gestion des utilisateurs (création, modification, suppression)
- ✅ Configuration Biostar pour toutes les villes
- ✅ Archivage et désarchivage des examens et cours

**Fonctionnalités disponibles :**
- Tableau de bord global
- Gestion complète des examens (création, modification, suppression, archivage)
- Gestion complète des cours (création, modification, suppression, archivage)
- Gestion des étudiants (tous établissements)
- Gestion des enseignants
- Gestion des groupes
- Gestion des absences
- Gestion des rattrapages
- Gestion des promotions
- Gestion des établissements
- Gestion des salles
- Traquer un étudiant
- Attendance Rapide
- Configuration Biostar
- **Gestion des utilisateurs** (exclusif)

> 📷 **Illustration à ajouter :** Capture d'écran du menu sidebar complet pour Super Admin montrant toutes les options disponibles

**Contraintes :**
- ❌ Aucune contrainte d'accès

---

### 🏢 Administrateur

**Rôle :** Gestion de son établissement uniquement.

**Accès :**
- ✅ Son établissement uniquement
- ✅ Toutes les fonctionnalités pour son établissement
- ✅ Archivage des examens et cours de son établissement

**Fonctionnalités disponibles :**
- Tableau de bord de son établissement
- Gestion des examens de son établissement
- Gestion des cours de son établissement
- Gestion des étudiants de son établissement
- Gestion des enseignants de son établissement
- Gestion des groupes de son établissement
- Gestion des absences de son établissement
- Gestion des rattrapages de son établissement
- Gestion des salles de son établissement
- Traquer un étudiant de son établissement
- Attendance Rapide pour son établissement
- Consultation des établissements

> 📷 **Illustration à ajouter :** Capture d'écran du menu sidebar pour Admin montrant les options disponibles

**Contraintes :**
- ❌ **Ne peut pas** gérer les utilisateurs
- ❌ **Ne peut pas** voir les données d'autres établissements
- ❌ **Ne peut pas** créer ou modifier des établissements
- ❌ **Ne peut pas** désarchiver (seulement archiver)
- ✅ Accès limité à son établissement uniquement

---

### 📚 Scolarité

**Rôle :** Gestion pédagogique quotidienne (étudiants, cours, examens, absences).

**Accès :**
- ✅ Selon son contexte (établissement/ville)
- ✅ Gestion pédagogique complète

**Fonctionnalités disponibles :**
- Tableau de bord
- Gestion des examens (création, modification, consultation)
- Gestion des cours (création, modification, consultation)
- Gestion des étudiants (création, modification, suppression, import)
- Gestion des groupes
- Gestion des absences
- Gestion des rattrapages
- Gestion des promotions
- Gestion des salles
- Traquer un étudiant

> 📷 **Illustration à ajouter :** Capture d'écran du menu sidebar pour Scolarité

**Contraintes :**
- ❌ **Ne peut pas** gérer les enseignants
- ❌ **Ne peut pas** gérer les établissements
- ❌ **Ne peut pas** utiliser "Attendance Rapide"
- ❌ **Ne peut pas** gérer les utilisateurs
- ❌ **Ne peut pas** archiver (seulement consultation)
- ✅ Accès limité selon son contexte (établissement/ville)

---

### 👨‍🏫 Enseignant

**Rôle :** Consultation et suivi de ses cours uniquement.

**Accès :**
- ✅ Ses cours uniquement
- ✅ Consultation en lecture seule

**Fonctionnalités disponibles :**
- Tableau de bord
- Consultation de ses cours
- Suivi de présence pour ses cours
- Consultation des absences de ses étudiants

> 📷 **Illustration à ajouter :** Capture d'écran du menu sidebar pour Enseignant (menu limité)

**Contraintes :**
- ❌ **Ne peut pas** créer ou modifier des examens
- ❌ **Ne peut pas** créer ou modifier des cours
- ❌ **Ne peut pas** gérer les étudiants
- ❌ **Ne peut pas** voir les examens
- ❌ **Ne peut pas** modifier les présences
- ✅ Accès uniquement à ses propres cours
- ✅ Consultation uniquement (lecture seule)

---

### 🎓 Doyen

**Rôle :** Consultation et statistiques pour la prise de décision.

**Accès :**
- ✅ Son établissement en lecture seule
- ✅ Toutes les statistiques

**Fonctionnalités disponibles :**
- Tableau de bord avec statistiques
- Consultation des examens de son établissement
- Consultation des cours de son établissement
- Consultation des étudiants
- Consultation des groupes
- Consultation des absences avec statistiques
- Consultation des rattrapages
- Consultation des salles
- Traquer un étudiant (consultation)
- Archivage des examens et cours (pour organisation)

> 📷 **Illustration à ajouter :** Capture d'écran du tableau de bord Doyen avec les statistiques

**Contraintes :**
- ❌ **Ne peut pas** créer, modifier ou supprimer des données
- ❌ **Ne peut pas** gérer les utilisateurs
- ❌ **Ne peut pas** importer des données
- ❌ **Ne peut pas** désarchiver
- ✅ Accès en **lecture seule** (sauf archivage)
- ✅ Accès limité à son établissement

---

### 🔧 Technicien

**Rôle :** Support technique et assistance dans la gestion.

**Accès :**
- ✅ Selon son contexte
- ✅ Gestion technique

**Fonctionnalités disponibles :**
- Tableau de bord
- Gestion des examens (création, modification, consultation)
- Gestion des cours (création, modification, consultation)
- Consultation des étudiants
- Consultation des groupes
- Consultation des absences
- Gestion des rattrapages
- Gestion des salles
- Traquer un étudiant

**Contraintes :**
- ❌ **Ne peut pas** gérer les utilisateurs
- ❌ **Ne peut pas** gérer les enseignants
- ❌ **Ne peut pas** utiliser "Attendance Rapide"
- ❌ **Ne peut pas** gérer les établissements
- ✅ Peut consulter et modifier certaines données selon contexte

---

### 📺 Défilement

**Rôle :** Affichage des examens sur écrans publics avec défilement automatique.

**Accès :**
- ✅ Affichage public uniquement
- ✅ Défilement automatique des examens

**Fonctionnalités disponibles :**
- Consultation des examens (affichage uniquement)
- Consultation des examens archivés
- Défilement automatique des examens sur écran

> 📷 **Illustration à ajouter :** Capture d'écran de l'affichage défilement avec les examens qui défilent automatiquement

**Contraintes :**
- ❌ **Ne peut pas** créer, modifier ou supprimer
- ❌ **Ne peut pas** voir les présences
- ❌ **Ne peut pas** accéder aux autres sections
- ✅ Accès uniquement à l'affichage des examens
- ✅ Défilement automatique uniquement

---

### 🎓 Étudiant

**Rôle :** Consultation personnelle et scan QR code.

**Accès :**
- ✅ Ses informations personnelles uniquement
- ✅ Scan de QR codes

**Fonctionnalités disponibles :**
- Consultation de ses cours
- Consultation de ses examens
- Scanner des QR codes pour marquer sa présence

> 📷 **Illustration à ajouter :** Capture d'écran de l'interface étudiant avec la liste des cours/examens

**Contraintes :**
- ❌ **Ne peut pas** voir les autres étudiants
- ❌ **Ne peut pas** modifier des données
- ❌ **Ne peut pas** voir les absences des autres
- ✅ Accès uniquement à ses propres informations

---

## 🚀 Fonctionnalités Majeures

### 1. 📱 Scan par QR Code

**Description :** Les étudiants peuvent scanner un QR code affiché par l'enseignant pour marquer automatiquement leur présence.

**Qui peut utiliser :**
- **Enseignants/Admin/Scolarité** : Générer le QR code
- **Étudiants** : Scanner le QR code

**Comment ça marche :**
1. L'enseignant/administrateur génère un QR code dans la page de présence d'un examen ou cours
2. Le QR code s'affiche à l'écran
3. Les étudiants ouvrent l'application sur leur téléphone
4. Ils scannent le QR code
5. Leur présence est enregistrée automatiquement

> 📷 **Illustration à ajouter :** 
> - Capture d'écran du bouton "Générer QR Code" dans la page de présence
> - Capture d'écran du QR code affiché à l'écran
> - Capture d'écran de l'application mobile avec le scanner QR code

**Contraintes :**
- Le QR code a une durée de validité limitée
- Le scan doit être effectué pendant la période de pointage
- L'étudiant doit être inscrit au cours/examen

**Voir le guide détaillé :** [Guide - Scan QR Code](#guide---scan-par-qr-code)

---

### 2. 🔍 Traquer un Étudiant

**Description :** Suivi détaillé de la présence d'un étudiant sur une période donnée.

**Qui peut utiliser :**
- Super Admin, Admin, Scolarité, Doyen, Technicien

**Fonctionnalités :**
- Voir tous les cours et examens d'un étudiant
- Voir le statut de présence pour chaque séance
- Filtrer par statut (présent, absent, en retard)
- Voir les statistiques (nombre de présences, absences, retards)
- Voir les données Biostar (heure de pointage, appareil utilisé)

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page "Traquer Étudiant" avec la barre de recherche
> - Capture d'écran des résultats du suivi avec la liste des cours/examens et les statuts
> - Capture d'écran des statistiques affichées

**Voir le guide détaillé :** [Guide - Traquer un Étudiant](#guide---traquer-un-étudiant)

---

### 3. ⚡ Attendance Rapide

**Description :** Import rapide d'une liste d'étudiants et récupération automatique des présences depuis Biostar.

**Qui peut utiliser :**
- Super Admin, Admin uniquement

**Fonctionnalités :**
- Importer une liste d'étudiants depuis Excel/CSV
- Récupérer automatiquement les présences depuis Biostar
- Filtrer par appareils Biostar
- Voir les résultats en temps réel

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page "Attendance Rapide" avec les sections import et récupération
> - Capture d'écran du formulaire d'import avec le sélecteur de fichier
> - Capture d'écran des résultats de récupération avec la liste des étudiants et leurs statuts

**Voir le guide détaillé :** [Guide - Attendance Rapide](#guide---attendance-rapide)

---

### 4. 📊 Création Automatique d'Absences

**Description :** Créer automatiquement les absences à partir des données de présence.

**Qui peut utiliser :**
- Tous les rôles ayant accès à la présence (selon permissions)

**Fonctionnalités :**
- Dans la page de présence d'un examen/cours
- Si des étudiants sont absents ou en retard
- Bouton "Créer Absences" devient actif
- Crée automatiquement les absences pour les étudiants absents/en retard

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page de présence avec le bouton "Créer Absences" actif
> - Capture d'écran de la boîte de dialogue de confirmation
> - Capture d'écran du message de succès après création

**Comment utiliser :**
1. Aller dans la page de présence d'un examen ou cours
2. Vérifier les statuts des étudiants
3. Si des étudiants sont absents/en retard, cliquer sur "Créer Absences"
4. Confirmer la création
5. Les absences sont créées automatiquement

---

### 5. 📤 Export des Données

**Description :** Exporter les données de présence en CSV ou Excel.

**Qui peut utiliser :**
- Tous les rôles ayant accès à la présence

**Formats disponibles :**
- **CSV** : Fichier texte avec séparateur virgule
- **Excel** : Fichier .xlsx avec plusieurs feuilles

**Contenu de l'export :**
- Informations de l'examen/cours
- Statistiques (présents, absents, en retard)
- Liste complète des étudiants avec statuts
- Heures de pointage
- Appareils utilisés

> 📷 **Illustration à ajouter :**
> - Capture d'écran des boutons "CSV" et "Excel" dans la page de présence
> - Capture d'écran d'un exemple de fichier CSV exporté
> - Capture d'écran d'un exemple de fichier Excel exporté

**Comment utiliser :**
1. Dans la page de présence
2. Cliquer sur le bouton **"CSV"** ou **"Excel"**
3. Le fichier se télécharge automatiquement

---

### 6. 📁 Archivage des Examens et Cours

**Description :** Archiver les examens et cours passés pour les organiser.

**Qui peut archiver :**
- **Super Admin, Admin, Doyen** : Peuvent archiver
- **Super Admin, Admin** : Peuvent désarchiver

**Fonctionnalités :**
- Archiver un examen/cours passé
- Consulter les examens/cours archivés
- Désarchiver (Super Admin et Admin uniquement)

> 📷 **Illustration à ajouter :**
> - Capture d'écran du bouton "Archiver" sur un examen/cours passé
> - Capture d'écran de la boîte de dialogue de confirmation d'archivage
> - Capture d'écran de la page "Examens Archivés" ou "Cours Archivés"
> - Capture d'écran du bouton "Désarchiver" (pour Super Admin/Admin)

**Contraintes :**
- Les examens/cours archivés n'apparaissent plus dans la liste principale
- Ils sont accessibles dans la section "Archivés"
- Les examens/cours archivés ne peuvent plus être modifiés

**Comment archiver :**
1. Aller dans la liste des examens ou cours
2. Sélectionner un examen/cours passé
3. Cliquer sur "Archiver"
4. Confirmer l'archivage

---

## 📝 Guides Pratiques

### Guide - Créer un Examen

#### Méthode 1 : Création Manuelle

**Étape 1 : Accéder au formulaire**
1. Menu → **Examens**
2. Cliquer sur **"Ajouter un examen"**

> 📷 **Illustration à ajouter :** Capture d'écran de la page Examens avec le bouton "Ajouter un examen" mis en évidence

**Étape 2 : Remplir les informations**
- **Titre** : Nom de l'examen (ex: "Examen de Mathématiques")
- **Date** : Date de l'examen
- **Heure de début pointage** : Heure à partir de laquelle les étudiants peuvent pointer
- **Heure de début** : Heure de début de l'examen
- **Heure de fin** : Heure de fin de l'examen
- **Tolérance** : Délai de tolérance pour les retards (ex: 5 minutes)
- **Salle** : Sélectionner une ou plusieurs salles
- **Promotion** : Sélectionner la promotion concernée
- **Groupe** : Sélectionner le groupe (ou "Tous les groupes")
- **Type d'examen** : Sélectionner le type
- **Établissement** : Sélectionner l'établissement
- **Ville** : Sélectionner la ville
- **Option** : Optionnel, si applicable

> 📷 **Illustration à ajouter :** Capture d'écran complète du formulaire de création d'examen avec tous les champs remplis

**Étape 3 : Valider**
1. Vérifier toutes les informations
2. Cliquer sur **"Créer l'examen"**
3. L'examen est créé et apparaît dans la liste

> 📷 **Illustration à ajouter :** Capture d'écran du message de succès après création

**Contraintes :**
- ❌ **Ne peut pas** modifier un examen passé
- ❌ **Ne peut pas** supprimer un examen passé (il faut l'archiver)

---

#### Méthode 2 : Import depuis un Fichier

**Étape 1 : Préparer le fichier**
1. Menu → **Examens** → **Importer**
2. Télécharger le **modèle Excel** si nécessaire
3. Remplir le fichier avec les données des examens

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page d'import avec le bouton "Télécharger le modèle"
> - Capture d'écran d'un exemple de fichier Excel modèle rempli

**Format du fichier :**
- **Colonnes requises :**
  - `title` : Nom de l'examen
  - `date` : Date (format: YYYY-MM-DD ou DD/MM/YYYY)
  - `heure_debut` : Heure de début (format: HH:MM)
  - `heure_fin` : Heure de fin (format: HH:MM)
  - `heure_debut_poigntage` : Heure de début de pointage (format: HH:MM)
  - `salle_id` : ID de la salle
  - `promotion_id` : ID de la promotion
  - `type_examen_id` : ID du type d'examen
  - `etablissement_id` : ID de l'établissement
  - `group_id` : ID du groupe (ou laisser vide pour tous)
  - `ville_id` : ID de la ville
  - `tolerance` : Tolérance en minutes (optionnel)
  - `option_id` : ID de l'option (optionnel)

**Étape 2 : Importer le fichier**
1. Cliquer sur **"Choisir un fichier"**
2. Sélectionner votre fichier Excel ou CSV
3. Le système valide automatiquement les données
4. Corriger les erreurs si nécessaire
5. Cliquer sur **"Importer"**

> 📷 **Illustration à ajouter :**
> - Capture d'écran du sélecteur de fichier
> - Capture d'écran de la validation avec les erreurs affichées (si erreurs)
> - Capture d'écran du message de succès après import

**Étape 3 : Vérifier les résultats**
- Le système affiche le nombre d'examens importés
- Vérifier dans la liste des examens

> 📷 **Illustration à ajouter :** Capture d'écran de la liste des examens avec les nouveaux examens importés

**Contraintes :**
- Le fichier doit respecter le format exact
- Les IDs doivent exister dans la base de données
- Les dates doivent être valides
- Les heures doivent être cohérentes (début < fin)

---

### Guide - Créer un Cours

**Similaire à la création d'examen :**

1. Menu → **Cours** → **Ajouter un cours**
2. Remplir les informations :
   - Nom du cours
   - Date
   - Heures (début pointage, début, fin)
   - Salle
   - Promotion
   - Groupe
   - Type de cours
   - Enseignant
   - Établissement
   - Ville
3. Valider

> 📷 **Illustration à ajouter :** Capture d'écran du formulaire de création de cours

**Import de cours :**
- Menu → **Cours** → **Importer**
- Même processus que pour les examens

> 📷 **Illustration à ajouter :** Capture d'écran de la page d'import de cours

**Contraintes :**
- ❌ **Ne peut pas** modifier un cours passé
- ❌ **Ne peut pas** supprimer un cours passé (il faut l'archiver)

---

### Guide - Traquer un Étudiant

**Étape 1 : Accéder à la fonctionnalité**
1. Menu → **Traquer Étudiant**

> 📷 **Illustration à ajouter :** Capture d'écran du menu avec "Traquer Étudiant" mis en évidence

**Étape 2 : Rechercher l'étudiant**
1. Utiliser la barre de recherche
2. Taper le nom, prénom ou matricule
3. Sélectionner l'étudiant dans les résultats

> 📷 **Illustration à ajouter :** Capture d'écran de la barre de recherche avec des résultats de recherche

**Étape 3 : Définir la période**
1. **Date de début** : Première date à analyser
2. **Date de fin** : Dernière date à analyser
3. **Filtre de statut** (optionnel) :
   - Tous
   - Présents uniquement
   - Absents uniquement

> 📷 **Illustration à ajouter :** Capture d'écran du formulaire avec les champs date de début, date de fin et filtre de statut

**Étape 4 : Lancer le suivi**
1. Cliquer sur **"Traquer"**
2. Le système affiche :
   - Liste de tous les cours et examens de l'étudiant
   - Statut pour chaque séance (présent, absent, en retard)
   - Heure de pointage (si disponible)
   - Appareil utilisé (si disponible)
   - Statistiques globales

> 📷 **Illustration à ajouter :**
> - Capture d'écran complète des résultats du suivi avec la liste des cours/examens
> - Capture d'écran détaillée d'une ligne avec le statut, l'heure de pointage et l'appareil
> - Capture d'écran des statistiques affichées en haut ou en bas

**Informations affichées :**
- **Date et heure** de chaque séance
- **Type** : Cours ou Examen
- **Statut** : Présent ✅, En retard ⏰, Absent ❌
- **Heure de pointage** : Heure exacte du pointage Biostar
- **Appareil** : Terminal Biostar utilisé

**Statistiques :**
- Total de séances
- Nombre de présences
- Nombre d'absences
- Nombre de retards
- Taux de présence

---

### Guide - Scan par QR Code

#### Pour l'Enseignant/Administrateur

**Étape 1 : Générer le QR Code**
1. Aller dans la page de présence d'un examen ou cours
2. Cliquer sur **"Générer QR Code"**
3. Le QR code s'affiche à l'écran

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page de présence avec le bouton "Générer QR Code" mis en évidence
> - Capture d'écran du QR code affiché à l'écran en grand format

**Étape 2 : Afficher le QR Code**
- Le QR code peut être affiché sur un écran/projecteur
- Les étudiants scannent avec leur téléphone

> 📷 **Illustration à ajouter :** Photo ou schéma montrant un écran avec le QR code affiché et un étudiant scannant avec son téléphone

**Informations importantes :**
- Le QR code a une durée de validité limitée
- Il n'est valide que pendant la période de pointage
- Il expire automatiquement après l'heure de fin

---

#### Pour l'Étudiant

**Étape 1 : Se connecter**
1. Ouvrir l'application sur le téléphone
2. Se connecter avec ses identifiants étudiant

> 📷 **Illustration à ajouter :** Capture d'écran de l'application mobile avec la page de connexion

**Étape 2 : Scanner le QR Code**
1. Dans l'application, aller à la fonctionnalité de scan
2. Pointer la caméra vers le QR code affiché
3. Le QR code est scanné automatiquement

> 📷 **Illustration à ajouter :**
> - Capture d'écran de l'application mobile avec l'écran de scan QR code
> - Capture d'écran montrant la caméra pointée vers le QR code

**Étape 3 : Confirmation**
- Si le scan réussit : Message "Présence enregistrée avec succès"
- Si le scan échoue : Message d'erreur expliquant la raison

> 📷 **Illustration à ajouter :**
> - Capture d'écran du message de succès après scan réussi
> - Capture d'écran d'un message d'erreur (ex: QR code expiré)

**Raisons d'échec possibles :**
- QR code expiré
- Scan hors période de pointage
- Étudiant non inscrit au cours/examen
- QR code invalide

---

### Guide - Attendance Rapide

**Qui peut utiliser :** Super Admin et Admin uniquement

**Étape 1 : Importer la liste d'étudiants**
1. Menu → **Attendance Rapide**
2. Section **"Importer la liste"**
3. Cliquer sur **"Choisir un fichier"**
4. Sélectionner un fichier Excel ou CSV

> 📷 **Illustration à ajouter :** Capture d'écran de la page Attendance Rapide avec la section "Importer la liste" mise en évidence

**Format du fichier :**
- Colonnes requises :
  - `matricule` : Matricule de l'étudiant
  - `first_name` : Prénom
  - `last_name` : Nom
  - `promotion_name` : Nom de la promotion (exact)
  - `group_title` : Nom du groupe (exact)
  - `email` : Email (optionnel)
  - `option_name` : Nom de l'option (optionnel)

> 📷 **Illustration à ajouter :** Capture d'écran d'un exemple de fichier Excel avec les colonnes requises

5. Sélectionner l'**établissement** et la **ville**
6. Cliquer sur **"Importer"**

> 📷 **Illustration à ajouter :** Capture d'écran du formulaire avec les sélecteurs établissement et ville, et le bouton Importer

**Étape 2 : Récupérer les présences**
1. Section **"Récupérer les présences"**
2. Renseigner :
   - **Date** : Date du pointage
   - **Heure de début** : Heure de début
   - **Heure de fin** : Heure de fin
   - **Ville** : Ville concernée
   - **Appareils** (optionnel) : Filtrer par terminaux Biostar
3. Cliquer sur **"Lancer la récupération"**

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la section "Récupérer les présences" avec le formulaire rempli
> - Capture d'écran du sélecteur d'appareils Biostar

**Étape 3 : Voir les résultats**
- Le système affiche :
  - Liste des étudiants
  - Statut de présence pour chacun
  - Heure de pointage (si disponible)
  - Appareil utilisé (si disponible)

> 📷 **Illustration à ajouter :**
> - Capture d'écran des résultats avec la liste des étudiants et leurs statuts
> - Capture d'écran détaillée montrant les heures de pointage et appareils

**Fonctionnalités :**
- Export des résultats
- Filtrage par statut
- Recherche d'étudiant

> 📷 **Illustration à ajouter :** Capture d'écran des boutons d'export et des filtres

---

### Guide - Importer des Étudiants

**Voir la documentation détaillée :** [DOCUMENTATION_IMPORTATION_ETUDIANTS.md](./DOCUMENTATION_IMPORTATION_ETUDIANTS.md)

**Résumé :**
1. Menu → **Étudiants** → **Importer**
2. Télécharger le modèle Excel
3. Remplir avec les données
4. Utiliser "Voir les options" pour vérifier les valeurs acceptées
5. Importer le fichier
6. Corriger les erreurs si nécessaire
7. Valider l'importation

> 📷 **Illustration à ajouter :**
> - Capture d'écran de la page d'import d'étudiants
> - Capture d'écran du bouton "Voir les options" et de la fenêtre avec les valeurs
> - Capture d'écran de la validation avec les erreurs affichées
> - Capture d'écran du message de succès

---

## ⚠️ Contraintes Importantes

### Modification et Suppression

#### Examens et Cours Passés

**Règle importante :**
- ❌ **IMPOSSIBLE de modifier** un examen ou cours dont la date est passée
- ❌ **IMPOSSIBLE de supprimer** un examen ou cours passé

> 📷 **Illustration à ajouter :**
> - Capture d'écran d'un examen passé avec le bouton "Modifier" désactivé ou absent
> - Capture d'écran du message d'erreur si tentative de modification d'un examen passé
> - Capture d'écran montrant que seul le bouton "Archiver" est disponible pour un examen passé

**Que faire avec un examen/cours passé ?**
- ✅ **Archiver** : Déplacer vers les archives pour organisation
- ✅ **Consulter** : Toujours accessible en lecture seule
- ✅ **Voir la présence** : Toujours possible de voir les données de présence

**Qui peut archiver :**
- Super Admin, Admin, Doyen

**Qui peut désarchiver :**
- Super Admin, Admin uniquement

**Comment archiver :**
1. Dans la liste des examens/cours
2. Sélectionner un élément passé
3. Cliquer sur **"Archiver"**
4. Confirmer

> 📷 **Illustration à ajouter :** Capture d'écran du processus d'archivage étape par étape

---

### Filtrage Automatique

**Les données sont automatiquement filtrées selon :**
- Votre **établissement** (si vous êtes Admin)
- Votre **ville** (selon votre profil)
- Vos **cours** (si vous êtes Enseignant)

**Vous ne voyez que :**
- Les données auxquelles vous avez accès selon votre rôle
- Les données de votre contexte (établissement/ville)

> 📷 **Illustration à ajouter :** Schéma ou diagramme montrant comment les données sont filtrées selon le rôle

---

### Données Biostar

**Synchronisation automatique :**
- Les données de présence sont récupérées automatiquement depuis Biostar
- La synchronisation se fait en temps réel lors de l'ouverture de la page de présence

> 📷 **Illustration à ajouter :** Capture d'écran de la page de présence montrant les données Biostar synchronisées

**Si la configuration Biostar n'est pas disponible :**
- Les données de pointage ne seront pas synchronisées
- Les étudiants seront marqués comme absents par défaut
- Contactez un administrateur pour configurer Biostar

> 📷 **Illustration à ajouter :** Capture d'écran d'un message d'erreur "Configuration Biostar non disponible"

**Configuration requise :**
- Une configuration Biostar doit être créée pour chaque ville
- La configuration doit être testée et validée

> 📷 **Illustration à ajouter :** Capture d'écran de la page de configuration Biostar

---

### Import de Données

**Règles importantes :**
- ✅ Utilisez **toujours le modèle officiel** pour les imports
- ✅ Vérifiez l'orthographe des valeurs (promotions, groupes, etc.)
- ✅ Utilisez "Voir les options" pour vérifier les valeurs acceptées
- ✅ Les valeurs doivent correspondre **exactement** (majuscules/minuscules)

> 📷 **Illustration à ajouter :**
> - Capture d'écran du bouton "Télécharger le modèle"
> - Capture d'écran de "Voir les options" avec les valeurs acceptées
> - Capture d'écran d'une erreur d'import due à une valeur incorrecte

**Formats acceptés :**
- **Excel** : .xlsx, .xls
- **CSV** : .csv, .txt

**Validation :**
- Le système valide automatiquement les données
- Les erreurs sont affichées ligne par ligne
- Corrigez les erreurs avant de valider l'import

> 📷 **Illustration à ajouter :** Capture d'écran de la validation avec les erreurs détaillées ligne par ligne

---

### Permissions par Rôle

**Résumé des restrictions :**

| Fonctionnalité | Super Admin | Admin | Scolarité | Enseignant | Doyen | Technicien |
|----------------|-------------|-------|-----------|------------|-------|------------|
| Gérer utilisateurs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Gérer établissements | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Attendance Rapide | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Archiver | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ |
| Désarchiver | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Modifier examen/cours passé | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Supprimer examen/cours passé | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

> 📷 **Illustration à ajouter :** Tableau visuel ou diagramme montrant les permissions par rôle de manière graphique

---

## 📞 Besoin d'Aide ?

Si vous rencontrez un problème :

1. **Vérifiez vos permissions** : Assurez-vous d'avoir les droits nécessaires pour l'action
2. **Vérifiez les contraintes** : Un examen/cours passé ne peut pas être modifié
3. **Contactez votre administrateur** : Pour les problèmes de configuration ou permissions
4. **Vérifiez votre connexion** : Assurez-vous que votre connexion internet fonctionne
5. **Essayez de vous reconnecter** : Déconnectez-vous et reconnectez-vous

> 📷 **Illustration à ajouter :** Capture d'écran d'un exemple de message d'erreur avec les étapes de dépannage

---

**Dernière mise à jour :** 2025-01-XX  
**Version de l'application :** 1.0.0


