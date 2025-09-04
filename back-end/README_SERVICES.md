# Architecture des Services - Documentation

## Vue d'ensemble

Cette documentation décrit l'architecture en couches de l'application avec une couche de services qui sépare la logique métier des contrôleurs et des modèles.

## 🏗️ **Architecture en Couches**

```
┌─────────────────────────────────────────────────────────────┐
│                    Contrôleurs (Controllers)                │
│              Gestion des requêtes HTTP                      │
│              Validation des données                         │
│              Réponses JSON                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Services                                 │
│              Logique métier                                 │
│              Règles de gestion                              │
│              Orchestration des modèles                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Modèles (Models)                         │
│              Définition des données                         │
│              Relations Eloquent                             │
│              Accès à la base de données                     │
└─────────────────────────────────────────────────────────────┘
```

## 🔧 **Services Disponibles**

### 1. **BaseService** (Classe abstraite)
Service de base fournissant des fonctionnalités communes à tous les services.

**Fonctionnalités :**
- CRUD de base (Create, Read, Update, Delete)
- Gestion des transactions
- Gestion des erreurs et logging
- Recherche et filtrage
- Pagination
- Opérations en lot (bulk operations)
- Statistiques de base

**Utilisation :**
```php
abstract class BaseService
{
    protected $model;

    public function __construct(string $modelClass)
    {
        $this->model = new $modelClass;
    }
    
    // Méthodes communes disponibles
}
```

### 2. **GroupService**
Gestion des groupes d'étudiants.

**Méthodes principales :**
- `getAllGroups()` - Récupérer tous les groupes
- `getGroupById(int $id)` - Récupérer un groupe spécifique
- `createGroup(array $data)` - Créer un nouveau groupe
- `updateGroup(int $id, array $data)` - Mettre à jour un groupe
- `deleteGroup(int $id)` - Supprimer un groupe
- `getStudentsByGroup(int $groupId)` - Récupérer les étudiants d'un groupe
- `addStudentsToGroup(int $groupId, array $studentIds)` - Ajouter des étudiants
- `removeStudentsFromGroup(int $groupId, array $studentIds)` - Retirer des étudiants
- `getGroupsByEtablissement(int $etablissementId)` - Groupes par établissement
- `getGroupsByPromotion(int $promotionId)` - Groupes par promotion
- `getGroupsByVille(int $villeId)` - Groupes par ville

### 3. **EtudiantService**
Gestion des étudiants.

**Méthodes principales :**
- `getAllEtudiants()` - Récupérer tous les étudiants
- `getEtudiantByMatricule(string $matricule)` - Récupérer un étudiant
- `createEtudiant(array $data)` - Créer un étudiant
- `updateEtudiant(string $matricule, array $data)` - Mettre à jour un étudiant
- `deleteEtudiant(string $matricule)` - Supprimer un étudiant
- `getEtudiantsByPromotion(string $promotion)` - Étudiants par promotion
- `getEtudiantsByFaculte(string $faculte)` - Étudiants par faculté
- `getEtudiantsByGroup(int $groupId)` - Étudiants par groupe
- `searchEtudiants(string $query)` - Rechercher des étudiants
- `getEtudiantsWithFilters(array $filters)` - Filtrer les étudiants
- `assignStudentToGroup(string $matricule, int $groupId)` - Assigner à un groupe
- `getEtudiantsStatistics()` - Statistiques des étudiants
- `importEtudiantsFromCSV(string $filePath)` - Import CSV

### 4. **ExamenService**
Gestion des examens.

**Méthodes principales :**
- `getAllExamens()` - Récupérer tous les examens
- `getExamenById(int $id)` - Récupérer un examen
- `createExamen(array $data)` - Créer un examen
- `updateExamen(int $id, array $data)` - Mettre à jour un examen
- `deleteExamen(int $id)` - Supprimer un examen
- `getExamensByEtablissement(int $etablissementId)` - Examens par établissement
- `getExamensByFaculte(int $faculteId)` - Examens par faculté
- `getExamensByDateRange(string $startDate, string $endDate)` - Examens par période
- `getUpcomingExamens(int $days)` - Examens à venir
- `getExamensForToday()` - Examens du jour
- `checkSalleAvailability(int $salleId, string $date, string $heureDebut, string $heureFin)` - Vérifier disponibilité salle
- `getAvailableSalles(string $date, string $heureDebut, string $heureFin)` - Salles disponibles
- `importExamensFromCSV(string $filePath)` - Import CSV
- `getExamenStatistics()` - Statistiques des examens

### 5. **CoursService**
Gestion des cours.

**Méthodes principales :**
- `getAllCours()` - Récupérer tous les cours
- `getCoursById(int $id)` - Récupérer un cours
- `createCours(array $data)` - Créer un cours
- `updateCours(int $id, array $data)` - Mettre à jour un cours
- `deleteCours(int $id)` - Supprimer un cours
- `getCoursByEtablissement(int $etablissementId)` - Cours par établissement
- `getCoursByFaculte(int $faculteId)` - Cours par faculté
- `getCoursByDayOfWeek(int $dayOfWeek)` - Cours par jour de la semaine
- `getCoursForToday()` - Cours du jour
- `getCoursForDate(string $date)` - Cours pour une date
- `checkSalleAvailability(int $salleId, int $jourSemaine, string $heureDebut, string $heureFin)` - Vérifier disponibilité
- `getWeeklySchedule(int $etablissementId)` - Emploi du temps hebdomadaire
- `importCoursFromCSV(string $filePath)` - Import CSV
- `getCoursStatistics()` - Statistiques des cours

### 6. **FaculteService**
Gestion des facultés.

**Méthodes principales :**
- `getAllFacultes()` - Récupérer toutes les facultés
- `getFaculteById(int $id)` - Récupérer une faculté
- `createFaculte(array $data)` - Créer une faculté
- `updateFaculte(int $id, array $data)` - Mettre à jour une faculté
- `deleteFaculte(int $id)` - Supprimer une faculté
- `getFacultesByEtablissement(int $etablissementId)` - Facultés par établissement
- `getFaculteStatistics(int $faculteId)` - Statistiques d'une faculté
- `getFaculteWithDetails(int $faculteId)` - Faculté avec détails complets
- `searchFacultes(string $query)` - Rechercher des facultés
- `getFacultesWithStudentCount()` - Facultés avec nombre d'étudiants
- `getFaculteSummary()` - Résumé des facultés
- `getFacultePerformanceMetrics(int $faculteId, string $period)` - Métriques de performance

### 7. **EtablissementService**
Gestion des établissements.

**Méthodes principales :**
- `getAllEtablissements()` - Récupérer tous les établissements
- `getEtablissementById(int $id)` - Récupérer un établissement
- `createEtablissement(array $data)` - Créer un établissement
- `updateEtablissement(int $id, array $data)` - Mettre à jour un établissement
- `deleteEtablissement(int $id)` - Supprimer un établissement
- `getEtablissementsByVille(int $villeId)` - Établissements par ville
- `getEtablissementStatistics(int $etablissementId)` - Statistiques d'un établissement
- `getEtablissementWithDetails(int $etablissementId)` - Établissement avec détails
- `searchEtablissements(string $query)` - Rechercher des établissements
- `getEtablissementSummary()` - Résumé des établissements
- `getEtablissementCapacity(int $etablissementId)` - Capacité d'un établissement

### 8. **PresenceReportService**
Gestion des rapports de présence.

**Méthodes principales :**
- `generateEtablissementReport(int $etablissementId, string $date)` - Rapport par établissement
- `generateGroupReport(int $groupId, string $date)` - Rapport par groupe
- `getGroupsWithLowPresence(int $etablissementId, float $threshold)` - Groupes avec faible présence
- `getFrequentlyAbsentStudents(int $groupId, int $days)` - Étudiants fréquemment absents

## 🚀 **Utilisation des Services**

### Dans un Contrôleur

```php
class GroupController extends Controller
{
    protected $groupService;

    public function __construct(GroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    public function index(): JsonResponse
    {
        $groups = $this->groupService->getAllGroups();
        return response()->json($groups);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'promotion_id' => 'required|exists:promotions,id',
            'etablissement_id' => 'required|exists:etablissements,id',
            'ville_id' => 'required|exists:villes,id',
        ]);

        $group = $this->groupService->createGroup($request->all());
        
        return response()->json([
            'message' => 'Groupe créé avec succès',
            'group' => $group->load(['etablissement', 'promotion', 'ville'])
        ], 201);
    }
}
```

### Dans un autre Service

```php
class PresenceReportService
{
    protected $groupService;

    public function __construct(GroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    public function generateEtablissementReport(int $etablissementId): array
    {
        // Utilise GroupService pour récupérer les groupes
        $groups = $this->groupService->getGroupsByEtablissement($etablissementId);
        
        $report = [];
        foreach ($groups as $group) {
            // Utilise GroupService pour récupérer les étudiants
            $students = $this->groupService->getStudentsByGroup($group->id);
            
            $report[] = [
                'group' => $group->title,
                'total_students' => $students->count(),
                // ... autres données
            ];
        }
        
        return $report;
    }
}
```

## ✅ **Avantages de l'Architecture des Services**

### 1. **Séparation des responsabilités**
- **Contrôleurs** : Gestion HTTP, validation, réponses
- **Services** : Logique métier, règles de gestion
- **Modèles** : Accès aux données, relations

### 2. **Réutilisabilité**
- Services utilisables par plusieurs contrôleurs
- Logique métier centralisée
- Pas de duplication de code

### 3. **Testabilité**
- Services testables indépendamment
- Tests unitaires plus faciles
- Mocking simplifié

### 4. **Maintenance**
- Code plus organisé et lisible
- Modifications centralisées
- Débogage simplifié

### 5. **Évolutivité**
- Facile d'ajouter de nouvelles fonctionnalités
- Architecture extensible
- Respect des principes SOLID

## 🔄 **Injection de Dépendances**

Laravel gère automatiquement l'injection de dépendances des services :

```php
// Dans le constructeur d'un contrôleur
public function __construct(
    GroupService $groupService,
    EtudiantService $etudiantService,
    ExamenService $examenService
) {
    $this->groupService = $groupService;
    $this->etudiantService = $etudiantService;
    $this->examenService = $examenService;
}
```

## 📊 **Gestion des Erreurs**

Tous les services incluent une gestion robuste des erreurs :

```php
try {
    $result = $this->service->someMethod();
    return response()->json($result);
} catch (\Exception $e) {
    Log::error("Error in service: " . $e->getMessage());
    return response()->json([
        'error' => 'Une erreur est survenue',
        'message' => $e->getMessage()
    ], 500);
}
```

## 🧪 **Tests des Services**

### Test d'un Service

```php
class GroupServiceTest extends TestCase
{
    protected $groupService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->groupService = new GroupService();
    }

    /** @test */
    public function it_can_create_a_group()
    {
        $data = [
            'title' => 'Test Group',
            'etablissement_id' => 1,
            'promotion_id' => 1,
            'ville_id' => 1,
        ];

        $group = $this->groupService->createGroup($data);

        $this->assertInstanceOf(Group::class, $group);
        $this->assertEquals('Test Group', $group->title);
    }
}
```

## 📝 **Bonnes Pratiques**

### 1. **Nommage des Services**
- Utiliser le suffixe `Service`
- Nom au singulier : `GroupService`, pas `GroupsService`

### 2. **Méthodes des Services**
- Noms descriptifs et clairs
- Une méthode = une responsabilité
- Retourner des types spécifiques

### 3. **Gestion des Erreurs**
- Toujours utiliser try-catch
- Logger les erreurs
- Retourner des réponses appropriées

### 4. **Relations entre Services**
- Éviter les dépendances circulaires
- Utiliser l'injection de dépendances
- Services spécialisés pour des domaines spécifiques

### 5. **Documentation**
- Commenter toutes les méthodes publiques
- Expliquer les paramètres et retours
- Donner des exemples d'utilisation

## 🔮 **Évolutions Futures**

### Services à créer :
- **UserService** - Gestion des utilisateurs
- **AuthService** - Authentification et autorisation
- **NotificationService** - Gestion des notifications
- **ReportService** - Génération de rapports
- **DashboardService** - Données du tableau de bord
- **ImportExportService** - Import/Export de données

### Améliorations possibles :
- **CacheService** - Mise en cache des données
- **ValidationService** - Validation centralisée
- **AuditService** - Traçabilité des actions
- **ScheduleService** - Gestion des planifications

Cette architecture des services garantit une application maintenable, testable et évolutive ! 🎯 