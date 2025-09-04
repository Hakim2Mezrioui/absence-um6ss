# Gestion des Groupes - Documentation

## Vue d'ensemble

Ce module permet de gérer les groupes d'étudiants dans le système de gestion des absences. Un groupe peut contenir plusieurs étudiants et est associé à un établissement, une promotion et une ville.

## Architecture en Couches

### Pourquoi utiliser des Services ?

L'application utilise une architecture en couches avec des **Services** qui offrent plusieurs avantages :

#### 1. **Séparation des responsabilités**
- **Contrôleur** : Gère les requêtes HTTP et la validation
- **Service** : Contient la logique métier
- **Modèle** : Gère les données et les relations

#### 2. **Réutilisabilité**
- Le `GroupService` peut être utilisé par plusieurs contrôleurs
- Facilite la création de nouvelles fonctionnalités
- Évite la duplication de code

#### 3. **Testabilité**
- Les services peuvent être testés indépendamment
- Tests unitaires plus faciles à écrire
- Mocking simplifié

#### 4. **Maintenance**
- Code plus organisé et lisible
- Modifications centralisées
- Débogage simplifié

## Structure de la base de données

### Table `groups`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | bigint | Clé primaire auto-incrémentée |
| `title` | varchar(255) | Titre du groupe |
| `promotion_id` | bigint | Référence vers la promotion |
| `etablissement_id` | bigint | Référence vers l'établissement |
| `ville_id` | bigint | Référence vers la ville |
| `created_at` | timestamp | Date de création |
| `updated_at` | timestamp | Date de dernière modification |

### Relations

- **One-to-Many** : Un groupe peut avoir plusieurs étudiants
- **Many-to-One** : Un groupe appartient à une promotion
- **Many-to-One** : Un groupe appartient à un établissement
- **Many-to-One** : Un groupe appartient à une ville

## Modèles

### Group Model

```php
use App\Models\Group;

// Créer un groupe
$group = Group::create([
    'title' => 'Groupe A - Médecine 1ère année',
    'promotion_id' => 1,
    'etablissement_id' => 1,
    'ville_id' => 1
]);

// Récupérer les étudiants d'un groupe
$students = $group->etudiants;

// Récupérer l'établissement du groupe
$etablissement = $group->etablissement;
```

### Etudiant Model

```php
use App\Models\Etudiant;

// Récupérer le groupe d'un étudiant
$etudiant = Etudiant::find('MAT001');
$group = $etudiant->group;

// Assigner un étudiant à un groupe
$etudiant->update(['group_id' => 1]);
```

## Service Layer

### GroupService

Le service `GroupService` est le cœur de la logique métier pour la gestion des groupes :

```php
use App\Services\GroupService;

$groupService = new GroupService();

// Récupérer tous les groupes
$groups = $groupService->getAllGroups();

// Créer un groupe
$group = $groupService->createGroup($data);

// Ajouter des étudiants à un groupe
$groupService->addStudentsToGroup(1, ['MAT001', 'MAT002']);

// Récupérer les groupes par établissement
$groups = $groupService->getGroupsByEtablissement(1);

// Récupérer les groupes par promotion
$groups = $groupService->getGroupsByPromotion(1);

// Récupérer les groupes par ville
$groups = $groupService->getGroupsByVille(1);
```

### Exemple d'utilisation dans un autre service

Le `GroupService` peut être réutilisé dans d'autres services, comme le `PresenceReportService` :

```php
use App\Services\PresenceReportService;

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

### Avantages de cette approche

1. **Code DRY** : Pas de duplication de logique
2. **Cohérence** : Même logique partout dans l'application
3. **Évolutivité** : Facile d'ajouter de nouvelles fonctionnalités
4. **Tests** : Services testables indépendamment

## API Endpoints

### Récupérer tous les groupes
```
GET /api/groups
```

### Créer un nouveau groupe
```
POST /api/groups
```

**Body:**
```json
{
    "title": "Groupe A - Médecine 1ère année",
    "promotion_id": 1,
    "etablissement_id": 1,
    "ville_id": 1
}
```

### Récupérer un groupe spécifique
```
GET /api/groups/{id}
```

### Mettre à jour un groupe
```
PUT /api/groups/{id}
```

### Supprimer un groupe
```
DELETE /api/groups/{id}
```

### Récupérer les étudiants d'un groupe
```
GET /api/groups/{id}/students
```

### Ajouter des étudiants à un groupe
```
POST /api/groups/{id}/add-students
```

**Body:**
```json
{
    "student_ids": ["MAT001", "MAT002", "MAT003"]
}
```

### Retirer des étudiants d'un groupe
```
POST /api/groups/{id}/remove-students
```

### Récupérer les groupes par établissement
```
GET /api/groups/etablissement/{etablissementId}
```

### Récupérer les groupes par promotion
```
GET /api/groups/promotion/{promotionId}
```

### Récupérer les groupes par ville
```
GET /api/groups/ville/{villeId}
```

## Migration et Seeding

### Exécuter les migrations
```bash
php artisan migrate
```

### Exécuter les seeders
```bash
php artisan db:seed --class=GroupSeeder
```

### Exécuter tous les seeders
```bash
php artisan db:seed
```

## Exemples d'utilisation

### Créer un groupe avec des étudiants

```php
// 1. Créer le groupe
$group = Group::create([
    'title' => 'Groupe A - Médecine 1ère année',
    'promotion_id' => 1,
    'etablissement_id' => 1,
    'ville_id' => 1
]);

// 2. Assigner des étudiants au groupe
$studentIds = ['MAT001', 'MAT002', 'MAT003'];
foreach ($studentIds as $studentId) {
    $etudiant = Etudiant::where('matricule', $studentId)->first();
    if ($etudiant) {
        $etudiant->update(['group_id' => $group->id]);
    }
}
```

### Récupérer les informations complètes d'un groupe

```php
$group = Group::with([
    'etablissement',
    'promotion',
    'ville',
    'etudiants'
])->find(1);

// Accéder aux données
echo $group->title; // Titre du groupe
echo $group->etablissement->name; // Nom de l'établissement
echo $group->promotion->name; // Nom de la promotion
echo $group->ville->name; // Nom de la ville
echo $group->etudiants->count(); // Nombre d'étudiants
```

### Utiliser le service dans un contrôleur personnalisé

```php
class CustomController extends Controller
{
    protected $groupService;

    public function __construct(GroupService $groupService)
    {
        $this->groupService = $groupService;
    }

    public function customMethod()
    {
        // Utilise la logique du service
        $groups = $this->groupService->getGroupsByEtablissement(1);
        
        // Traite les données selon vos besoins
        return response()->json($groups);
    }
}
```

## Validation

Les données des groupes sont validées avec les règles suivantes :

- `title` : Requis, chaîne de caractères, max 255 caractères
- `promotion_id` : Requis, doit exister dans la table promotions
- `etablissement_id` : Requis, doit exister dans la table etablissements
- `ville_id` : Requis, doit exister dans la table villes

## Gestion des erreurs

Le système gère automatiquement les erreurs suivantes :

- Groupe non trouvé (404)
- Validation des données (422)
- Erreurs de base de données (500)

## Tests

Pour exécuter les tests des groupes :

```bash
php artisan test --filter=GroupTest
```

### Exemple de test avec le service

```php
/** @test */
public function it_can_create_a_group_using_service()
{
    $groupService = new GroupService();
    
    $groupData = [
        'title' => 'Test Group',
        'etablissement_id' => 1,
        'promotion_id' => 1,
        'ville_id' => 1,
    ];
    
    $group = $groupService->createGroup($groupData);
    
    $this->assertInstanceOf(Group::class, $group);
    $this->assertEquals('Test Group', $group->title);
}
```

## Notes importantes

1. **Suppression en cascade** : Lorsqu'un groupe est supprimé, la colonne `group_id` des étudiants est mise à `null`
2. **Relations obligatoires** : Les relations avec `promotion`, `etablissement` et `ville` sont obligatoires
3. **Intégrité référentielle** : Toutes les clés étrangères sont protégées par des contraintes de base de données
4. **Performance** : Utilisez `with()` pour charger les relations et éviter le problème N+1
5. **Architecture** : Utilisez toujours les services pour la logique métier, pas directement les modèles dans les contrôleurs 