# Fiche Biostar – Présentation et usage

## 1) Description
- Biostar est la solution de pointage utilisée dans l’université (contrôle d’accès & assiduité).
- Authentification : Face ID / badge / PIN selon la configuration locale.
- **Hébergement** : déployé en **local (on-premise)** sur l’infrastructure de l’université, accessible uniquement sur le réseau interne.

## 2) Version
- Version Biostar serveur : **2.9**

## 3) Device de pointage
- Modèle utilisé : **[nom exact du device]** (ex. FaceStation / BioStation).
- Photo du device installé :  
  ![Device Biostar](path/vers/photo-device.jpg)

## 4) Interface – Dashboard (illustration)
- Capture de l’écran d’accueil / tableau de bord :  
  ![Dashboard Biostar](path/vers/screenshot-dashboard.png)

## 5) Créer un étudiant (illustration)
1) Aller dans **Users / Utilisateurs** > **Add / Nouveau**.  
2) Renseigner Nom, Prénom, Matricule (User ID), etc.  
3) Sauvegarder.  
   ![Création étudiant](path/vers/screenshot-create-user.png)

## 6) Ajouter une photo à un étudiant (unitaire)
1) Ouvrir la fiche de l’utilisateur.  
2) Cliquer sur **Photo / Enroll Photo**.  
3) Importer la photo (JPG/PNG), valider.  
   ![Ajout photo](path/vers/screenshot-add-photo.png)

## 7) Importer des photos en masse (batch)
1) Préparer un dossier d’images nommées avec le matricule (ex. `MAT0001.jpg`).  
2) Dans **Users / Import**, choisir **Import Photos** (import groupé).  
3) Lancer l’import et vérifier l’appariement matricule ↔ fichier.  
   ![Import photos](path/vers/screenshot-import-photos.png)

## 8) Contacts
- Référent interne : **[nom / email / téléphone]**

## 9) Connexion & consommation des données (vue d’ensemble)
- La solution de l’université lit les **données de pointage** dans la base Biostar (SQL Server) et les intègre dans le système d’assiduité.
- Le prestataire pourra soit :
  - se connecter à la **base Biostar** (lecture seule) pour récupérer les pointages,
  - soit consommer les **API internes** déjà exposées par notre application (endpoints d’attendance, statistiques, devices).
- Les détails techniques (schéma complet, credentials, choix exact d’intégration) sont à définir avec le prestataire en fonction de sa solution.

## 10) Connexion & consommation des données (version courte technique)

### 10.1 Configuration de connexion (SQL Server)
- Base : **SQL Server**  
- Base de données Biostar : par ex. `BIOSTAR_TA`  
- DSN type (PDO / SQL Server) :
  ```text
  sqlsrv:Server=SERVER_IP;Database=BIOSTAR_TA;TrustServerCertificate=true
  ```
- Paramètres à prévoir :
  - `SERVER_IP` : IP ou hostname du serveur SQL
  - `USERNAME` / `PASSWORD` : compte SQL **lecture seule** sur la base Biostar

### 10.2 Consommation des pointages
- Table principale de pointage : **`punchlog`**
- Colonnes utilisées : `id`, `user_id`, `bsevtc`, `devdt`, `devid`, `devnm`, `bsevtdt`, `user_name`
- Exemple simple de requête (lecture des pointages sur une plage horaire) :
  ```sql
  SELECT id, user_id, bsevtc, devdt, devid, devnm, bsevtdt, user_name
  FROM punchlog
  WHERE devdt BETWEEN @startDateTime AND @endDateTime
    AND devnm NOT LIKE 'TOUR%'
    AND devnm NOT LIKE 'ACCES HCK%'
  ORDER BY devdt ASC;
  ```
- Le prestataire peut ensuite filtrer par matricules (`user_id` / `bsevtc`) et/ou par devices (`devid` / `devnm`) selon ses besoins.





