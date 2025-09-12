<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EtudiantController;
use App\Http\Controllers\EtablissementController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\RattrapageController;
use App\Http\Controllers\CoursController;
use App\Http\Controllers\GroupController;
use App\Http\Controllers\VilleController;
use App\Http\Controllers\SalleController;
use App\Http\Controllers\OptionController;
use App\Http\Controllers\RoleController;
use App\Http\Controllers\PostController;
use App\Http\Controllers\PromotionController;
use App\Http\Controllers\TypeCoursController;
use App\Http\Controllers\AbsenceController;
use App\Http\Controllers\TypeExamenController;
use App\Http\Controllers\ListStudentController;
use App\Http\Controllers\StatisticController;
use App\Http\Controllers\AbsenceAutoController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// Authentification (publiques)
Route::post("register", [AuthController::class, "register"]);     // POST /api/register
Route::post("login", [AuthController::class, "login"]);           // POST /api/login
Route::post("logout", [AuthController::class, "logout"])->middleware('auth:sanctum');         // POST /api/logout

// Utilisateurs (avec middleware auth)
Route::get("user", [AuthController::class, "user"]);              // GET /api/user
Route::post("create", [AuthController::class, "create"]);         // POST /api/create
Route::get("users", [AuthController::class, "users"]);            // GET /api/users
Route::delete("users/{id}", [AuthController::class, "destroy"]);  // POST /api/destroy/{id}
Route::get("users/{id}", [AuthController::class, "show"]); // Nouvelle route
Route::put("users/{id}", [AuthController::class, "update"]); // Nouvelle route
Route::post("profile/change-password", [AuthController::class, "changePassword"])->middleware('auth:sanctum'); // Nouvelle route
Route::get("profile", [AuthController::class, "profile"])->middleware('auth:sanctum'); // Nouvelle route

Route::middleware('auth:sanctum')->group(function () {
// Routes spéciales pour les étudiants (AVANT les ressources)
Route::post("import-etudiants", [EtudiantController::class, "ImportEtudiants"]);
Route::post("import-students-modern", [EtudiantController::class, "importEtudiantsModern"]);

// Route pour les statistiques
Route::get("statistics", [StatisticController::class, "getAllStatistics"]);
Route::get("statistics/filtered", [StatisticController::class, "getFilteredStatistics"]);
Route::get("etudiants/attendance", [EtudiantController::class, "fetchStudentAttendance"]);
Route::get("etudiant/{matricule}", [EtudiantController::class, "getEtudiantByMatricule"]);
Route::put("etudiant/{matricule}", [EtudiantController::class, "updateByMatricule"]);
Route::delete("etudiant/{matricule}", [EtudiantController::class, "destroyByMatricule"]);

// CRUD complet pour les étudiants (routes de ressources)

// Route pour les options de filtre des étudiants
Route::get('/etudiants/filter-options', [EtudiantController::class, 'getFilterOptions']);
// Route pour l'exportation des étudiants
Route::get('/export-etudiants', [EtudiantController::class, 'exportEtudiants']);
// Route de test pour vérifier les étudiants
Route::get('/test-export-etudiants', [EtudiantController::class, 'testExportEtudiants']);
// Route d'export avec streaming (méthode alternative)
Route::get('/export-etudiants-stream', [EtudiantController::class, 'exportEtudiantsStream']);
// Suppression multiple des étudiants
Route::delete('/etudiants/delete-multiple', [EtudiantController::class, 'deleteMultiple']);
Route::apiResource('etudiants', EtudiantController::class);

// Group routes - API Resource (remplace les 6 routes individuelles)
Route::apiResource('groups', GroupController::class);
Route::get("groups/{id}/students", [GroupController::class, "getStudentsByGroup"]);
Route::post("groups/{id}/add-students", [GroupController::class, "addStudentsToGroup"]);
Route::post("groups/{id}/remove-students", [GroupController::class, "removeStudentsFromGroup"]);
Route::get("groups/etablissement/{etablissementId}", [GroupController::class, "getGroupsByEtablissement"]);
Route::get("groups/promotion/{promotionId}", [GroupController::class, "getGroupsByPromotion"]);
Route::get("groups/ville/{villeId}", [GroupController::class, "getGroupsByVille"]);

// Ville routes - API Resource
Route::apiResource('villes', VilleController::class);

// Ville routes supplémentaires
Route::get('villes/search', [VilleController::class, 'search']);
Route::get('villes/etablissement/{etablissementId}', [VilleController::class, 'getByEtablissement']);

// Routes d'examens avec ressource
Route::post('/import-examens', [ExamenController::class, 'ImportExamens']);

// Routes pour les options de filtres
Route::get('/examens/etablissements', [ExamenController::class, 'getEtablissements']);
Route::get('/examens/promotions', [ExamenController::class, 'getPromotions']);
Route::get('/examens/salles', [ExamenController::class, 'getSalles']);
Route::get('/examens/filter-options', [ExamenController::class, 'getFilterOptions']);


// Routes spécifiques pour les établissements AVANT la ressource
Route::get('etablissements/statistics', [EtablissementController::class, 'getStatistics']);
Route::get('etablissements/all', [EtablissementController::class, 'allEtablissements']);

// CRUD complet pour les établissements (routes de ressources)
Route::apiResource('etablissements', EtablissementController::class);
Route::apiResource('examens', ExamenController::class);


});

// Public routes for students
Route::get("test-etudiants", [EtudiantController::class, "index"]);
Route::get("test-etudiants-count", [EtudiantController::class, "testStudentsCount"]);

// Routes d'export publiques pour test (sans authentification)
Route::get('/export-simple-public', [EtudiantController::class, 'exportSimple']);
Route::get('/export-etudiants-public', [EtudiantController::class, 'exportEtudiantsStream']);

Route::get('/cours', [CoursController::class, 'index']);
Route::get('/cours/{id}', [CoursController::class, 'show']);
Route::post('/cours', [CoursController::class, 'store']);
Route::put('/cours/{id}', [CoursController::class, 'update']);
Route::delete('/cours/{id}', [CoursController::class, 'destroy']);
Route::post('/import-cours', [CoursController::class, 'ImportCourse']);

// Salle routes - API Resource
Route::apiResource('salles', SalleController::class);

// Salle routes supplémentaires
Route::get('salles/search', [SalleController::class, 'search']);
Route::get('salles/etablissement/{etablissementId}', [SalleController::class, 'getByEtablissement']);
Route::get('salles/building/{batiment}', [SalleController::class, 'getByBuilding']);
Route::get('salles/floor/{etage}', [SalleController::class, 'getByFloor']);
Route::post('salles/available', [SalleController::class, 'getAvailable']);

// Option routes - API Resource
Route::apiResource('options', OptionController::class);

// Role routes - Routes spécifiques AVANT la ressource
Route::get('roles/search', [RoleController::class, 'search']);
Route::get('roles/all', [RoleController::class, 'getAll']);
Route::apiResource('roles', RoleController::class);

// Post routes - Routes spécifiques AVANT la ressource
Route::get('posts/search', [PostController::class, 'search']);
Route::get('posts/all', [PostController::class, 'getAll']);
Route::apiResource('posts', PostController::class);

// Promotion routes - Routes spécifiques AVANT la ressource
Route::get('promotions/search', [PromotionController::class, 'search']);
Route::get('promotions/all', [PromotionController::class, 'getAll']);
Route::get('promotions/etablissement/{etablissementId}', [PromotionController::class, 'getByEtablissement']);
Route::get('promotions/faculte/{faculteId}', [PromotionController::class, 'getByFaculte']);
Route::apiResource('promotions', PromotionController::class);

// TypeCours routes - Routes spécifiques AVANT la ressource
Route::get('types-cours/search', [TypeCoursController::class, 'search']);
Route::get('types-cours/all', [TypeCoursController::class, 'getAll']);
Route::get('types-cours/etablissement/{etablissementId}', [TypeCoursController::class, 'getByEtablissement']);
Route::get('types-cours/faculte/{faculteId}', [TypeCoursController::class, 'getByFaculte']);
Route::get('types-cours/with-cours-count', [TypeCoursController::class, 'getWithCoursCount']);
Route::apiResource('types-cours', TypeCoursController::class);

// Absence routes - Routes spécifiques AVANT la ressource
Route::get('absences/search', [AbsenceController::class, 'search']);
Route::get('absences/all', [AbsenceController::class, 'getAll']);
Route::get('absences/etudiant/{etudiantId}', [AbsenceController::class, 'getByEtudiant']);
Route::get('absences/cours/{coursId}', [AbsenceController::class, 'getByCours']);
Route::get('absences/examen/{examenId}', [AbsenceController::class, 'getByExamen']);
Route::put('absences/{id}/justifier', [AbsenceController::class, 'justifier']);
Route::get('absences/statistics', [AbsenceController::class, 'getStatistics']);

// Routes pour la création automatique des absences
Route::post('absences/auto/create-for-examen', [AbsenceAutoController::class, 'createAbsencesForExamen']);
Route::post('absences/auto/create-for-date', [AbsenceAutoController::class, 'createAbsencesForDate']);
Route::post('absences/auto/create-from-attendance', [AbsenceAutoController::class, 'createAbsencesFromAttendance']);
Route::get('absences/auto/statistics', [AbsenceAutoController::class, 'getAbsenceStatistics']);

Route::apiResource('absences', AbsenceController::class);

// Rattrapage routes - Routes spécifiques AVANT la ressource
Route::get('rattrapages/search', [RattrapageController::class, 'search']);
Route::get('rattrapages/all', [RattrapageController::class, 'getAll']);
Route::get('rattrapages/date', [RattrapageController::class, 'getByDate']);
Route::get('rattrapages/date-range', [RattrapageController::class, 'getByDateRange']);
Route::get('rattrapages/today', [RattrapageController::class, 'getToday']);
Route::get('rattrapages/this-week', [RattrapageController::class, 'getThisWeek']);
Route::get('rattrapages/this-month', [RattrapageController::class, 'getThisMonth']);
Route::get('rattrapages/start-hour', [RattrapageController::class, 'getByStartHour']);
Route::get('rattrapages/end-hour', [RattrapageController::class, 'getByEndHour']);
Route::get('rattrapages/statistics', [RattrapageController::class, 'getStatistics']);
Route::get('rattrapages/time-conflicts', [RattrapageController::class, 'getWithTimeConflicts']);
Route::post('rattrapages/check-conflicts', [RattrapageController::class, 'checkTimeConflicts']);
Route::post('rattrapages/import', [RattrapageController::class, 'importRattrapages']);
Route::get('rattrapages/{id}/attendance', [RattrapageController::class, 'getAttendance']);
Route::put('rattrapages/{id}/attendance/{studentId}', [RattrapageController::class, 'updateStudentAttendance']);
Route::get('rattrapages/{id}/export/csv', [RattrapageController::class, 'exportAttendanceCSV']);
Route::get('rattrapages/{id}/export/excel', [RattrapageController::class, 'exportAttendanceExcel']);
Route::apiResource('rattrapages', RattrapageController::class);

// TypeExamen routes - Routes spécifiques AVANT la ressource
Route::get('types-examen/search', [TypeExamenController::class, 'search']);
Route::get('types-examen/all', [TypeExamenController::class, 'getAll']);
Route::get('types-examen/category', [TypeExamenController::class, 'getByCategory']);
Route::get('types-examen/difficulty', [TypeExamenController::class, 'getByDifficulty']);
Route::get('types-examen/semester', [TypeExamenController::class, 'getBySemester']);
Route::get('types-examen/with-examens-count', [TypeExamenController::class, 'getWithExamensCount']);
Route::get('types-examen/statistics', [TypeExamenController::class, 'getStatistics']);
Route::apiResource('types-examen', TypeExamenController::class);

// ListStudent routes - Routes spécifiques AVANT la ressource
Route::get('list-students/all', [ListStudentController::class, 'getAll']);
Route::get('list-students/rattrapage/{rattrapageId}', [ListStudentController::class, 'getStudentsByRattrapage']);
Route::get('list-students/student/{studentId}', [ListStudentController::class, 'getRattrapagesByStudent']);
Route::post('list-students/add-student', [ListStudentController::class, 'addStudentToList']);
Route::post('list-students/add-multiple-students', [ListStudentController::class, 'addMultipleStudentsToList']);
Route::post('list-students/remove-student', [ListStudentController::class, 'removeStudentFromList']);
Route::post('list-students/remove-multiple-students', [ListStudentController::class, 'removeMultipleStudentsToList']);
Route::delete('list-students/rattrapage/{rattrapageId}/clear', [ListStudentController::class, 'clearList']);
Route::get('list-students/rattrapage/{rattrapageId}/count', [ListStudentController::class, 'countStudentsInList']);
Route::get('list-students/student/{studentId}/count', [ListStudentController::class, 'countRattrapagesForStudent']);
Route::post('list-students/import', [ListStudentController::class, 'importStudentsList']);
Route::get('list-students/rattrapage/{rattrapageId}/export', [ListStudentController::class, 'exportStudentsList']);
Route::get('list-students/rattrapage/{rattrapageId}/search', [ListStudentController::class, 'searchStudentsInList']);
Route::get('list-students/statistics', [ListStudentController::class, 'getStatistics']);
Route::apiResource('list-students', ListStudentController::class);

// Option routes supplémentaires
Route::get('options/search', [OptionController::class, 'search']);
Route::get('options/etablissement/{etablissementId}', [OptionController::class, 'getByEtablissement']);
Route::get('options/{id}/statistics', [OptionController::class, 'getStatistics']);
Route::get('options/popular', [OptionController::class, 'getPopularOptions']);
