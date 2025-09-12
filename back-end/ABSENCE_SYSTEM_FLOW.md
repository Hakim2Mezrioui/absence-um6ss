# Diagramme de Flux - Système de Création Automatique des Absences

## Flux Principal

```mermaid
graph TD
    A[Interface d'Attendance] --> B{Étudiants absents/en retard?}
    B -->|Oui| C[Bouton "Créer Absences" actif]
    B -->|Non| D[Bouton "Créer Absences" désactivé]
    
    C --> E[Clic sur le bouton]
    E --> F[Dialogue de confirmation]
    F --> G{Utilisateur confirme?}
    G -->|Oui| H[Appel API createAbsencesFromAttendance]
    G -->|Non| I[Annulation]
    
    H --> J[Service AbsenceAutoService]
    J --> K[Validation des données]
    K --> L{Données valides?}
    L -->|Oui| M[Création des absences en base]
    L -->|Non| N[Retour d'erreur]
    
    M --> O[Notification de succès]
    O --> P[Fermeture du dialogue]
    
    N --> Q[Notification d'erreur]
    Q --> R[Affichage de l'erreur]
```

## Architecture du Système

```mermaid
graph LR
    subgraph "Frontend Angular"
        A[AttendanceComponent]
        B[AbsenceAutoService]
        C[NotificationService]
    end
    
    subgraph "Backend Laravel"
        D[AbsenceAutoController]
        E[AbsenceAutoService]
        F[Absence Model]
        G[Examen Model]
        H[Etudiant Model]
    end
    
    subgraph "Base de Données"
        I[(Table absences)]
        J[(Table examens)]
        K[(Table etudiants)]
    end
    
    A --> B
    B --> D
    D --> E
    E --> F
    E --> G
    E --> H
    F --> I
    G --> J
    H --> K
```

## Flux de Données

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant AC as AttendanceComponent
    participant AAS as AbsenceAutoService
    participant AAC as AbsenceAutoController
    participant AASB as AbsenceAutoService (Backend)
    participant DB as Base de Données
    
    U->>AC: Clique "Créer Absences"
    AC->>AC: Vérifie étudiants absents
    AC->>U: Affiche dialogue de confirmation
    U->>AC: Confirme la création
    AC->>AAS: createAbsencesFromAttendance()
    AAS->>AAC: POST /api/absences/auto/create-from-attendance
    AAC->>AASB: createAbsencesFromAttendance()
    AASB->>DB: Vérifie existence examen
    AASB->>DB: Vérifie absences existantes
    AASB->>DB: Crée nouvelles absences
    AASB->>AAC: Retourne résultat
    AAC->>AAS: Retourne réponse
    AAS->>AC: Retourne résultat
    AC->>U: Affiche notification de succès
```

## États des Étudiants

```mermaid
stateDiagram-v2
    [*] --> Présent: Pointage avant heure début
    [*] --> En_Retard: Pointage entre début et tolérance
    [*] --> Absent: Pas de pointage ou après tolérance
    
    Présent --> Absence_Non_Créée: Pas d'action requise
    En_Retard --> Absence_Retard: Création automatique
    Absent --> Absence_Non_Justifiée: Création automatique
    
    Absence_Retard --> [*]
    Absence_Non_Justifiée --> [*]
    Absence_Non_Créée --> [*]
```

## Gestion des Erreurs

```mermaid
graph TD
    A[Requête de création d'absences] --> B{Validation des données}
    B -->|Échec| C[Erreur de validation]
    B -->|Succès| D{Examen existe?}
    
    D -->|Non| E[Erreur: Examen non trouvé]
    D -->|Oui| F{Étudiants trouvés?}
    
    F -->|Non| G[Erreur: Aucun étudiant]
    F -->|Oui| H[Création des absences]
    
    H --> I{Transaction réussie?}
    I -->|Non| J[Rollback + Erreur]
    I -->|Oui| K[Succès]
    
    C --> L[Notification d'erreur]
    E --> L
    G --> L
    J --> L
    K --> M[Notification de succès]
```

## Types d'Absences

```mermaid
graph LR
    A[Statut Étudiant] --> B{Type d'absence}
    B -->|absent| C[Absence non justifiée]
    B -->|en retard| D[Retard]
    
    C --> E[Motif: Absence à l'examen]
    D --> F[Motif: Retard à l'examen]
    
    E --> G[justifiee: false]
    F --> H[justifiee: false]
    
    G --> I[Enregistrement en base]
    H --> I
```

## Sécurité et Validation

```mermaid
graph TD
    A[Requête API] --> B{Authentification}
    B -->|Échec| C[401 Unauthorized]
    B -->|Succès| D{Validation des paramètres}
    
    D -->|Échec| E[422 Validation Error]
    D -->|Succès| F{Vérification existence}
    
    F -->|Échec| G[404 Not Found]
    F -->|Succès| H{Contrôle des doublons}
    
    H -->|Doublon| I[Skip + Log]
    H -->|Nouveau| J[Création]
    
    J --> K{Transaction}
    K -->|Échec| L[Rollback + 500]
    K -->|Succès| M[201 Created]
```

## Monitoring et Logs

```mermaid
graph TD
    A[Action utilisateur] --> B[Log: Action initiée]
    B --> C[Validation]
    C --> D[Log: Validation réussie/échouée]
    D --> E[Création des absences]
    E --> F[Log: Absences créées]
    F --> G[Notification utilisateur]
    G --> H[Log: Action terminée]
    
    I[Erreur] --> J[Log: Erreur détaillée]
    J --> K[Notification d'erreur]
```

## Configuration et Déploiement

```mermaid
graph TD
    A[Code Source] --> B[Tests unitaires]
    B --> C[Tests d'intégration]
    C --> D[Migration base de données]
    D --> E[Déploiement backend]
    E --> F[Déploiement frontend]
    F --> G[Configuration production]
    G --> H[Monitoring]
    
    I[Documentation] --> J[Guide utilisateur]
    I --> K[API Documentation]
    I --> L[Guide de maintenance]
```
