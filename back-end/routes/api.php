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
use App\Http\Controllers\ConfigurationController;
use App\Http\Controllers\BiostarAttendanceController;
use App\Http\Controllers\ListStudentController;
use App\Http\Controllers\StatisticController;
use App\Http\Controllers\AbsenceAutoController;
use App\Http\Controllers\AttendanceStateController;
use App\Http\Controllers\EnseignantController;
use App\Http\Controllers\UserManagementController;
use App\Http\Controllers\AttendanceRapideController;
use App\Http\Controllers\StudentTrackingController;
use App\Http\Controllers\QrCodeAttendanceController;
use App\Http\Middleware\AuthenticateEtudiant;
use App\Http\Controllers\EtudiantAuthController;
use App\Http\Controllers\ActivityLogController;

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

// Authentification des étudiants (publique)
Route::post("etudiants/login", [EtudiantAuthController::class, "login"]);
Route::post("etudiants/logout", [EtudiantAuthController::class, "logout"])->middleware('auth:sanctum');
Route::get("etudiants/me", [EtudiantAuthController::class, "me"])->middleware('auth:sanctum');

// Routes pour les étudiants connectés (cours et examens)
// Utiliser AuthenticateEtudiant au lieu de auth:sanctum car Sanctum ne peut pas résoudre les tokens Etudiant
Route::get("etudiants/me/cours", [EtudiantController::class, "getMyCours"])->middleware(\App\Http\Middleware\AuthenticateEtudiant::class);
Route::get("etudiants/me/examens", [EtudiantController::class, "getMyExamens"])->middleware(\App\Http\Middleware\AuthenticateEtudiant::class);

// Route de scan QR par l'étudiant - DOIT être au même niveau que les routes ci-dessus
Route::post("etudiants/qr-scan", [QrCodeAttendanceController::class, 'scan'])->middleware(\App\Http\Middleware\AuthenticateEtudiant::class);

// Public route for enseignants filter options (must be defined BEFORE the resource route)
Route::get('enseignants/filter-options', [EnseignantController::class, 'getFilterOptions']);

Route::middleware('auth:sanctum')->group(function () {
// Configuration routes
Route::get('configuration', [ConfigurationController::class, 'index']);
Route::get('configuration/user-ville', [ConfigurationController::class, 'getForUserVille']);
Route::get('configuration/ville/{villeId}', [ConfigurationController::class, 'getByVille']);
Route::post('configuration', [ConfigurationController::class, 'store']);
Route::put('configuration/{id}', [ConfigurationController::class, 'update']);
Route::delete('configuration/{id}', [ConfigurationController::class, 'destroy']);
Route::post('configuration/test-connection', [ConfigurationController::class, 'testConnection']);
Route::get('configuration/villes', [ConfigurationController::class, 'getVilles']);

// Auto-selection routes for configuration based on ville
Route::get('configuration/for-ville/{villeId}', [ConfigurationController::class, 'getConfigurationForVille']);
Route::get('configuration/for-cours/{coursId}', [ConfigurationController::class, 'getConfigurationForCours']);
Route::get('configuration/for-examen/{examenId}', [ConfigurationController::class, 'getConfigurationForExamen']);
Route::get('configuration/connection/for-ville/{villeId}', [ConfigurationController::class, 'getConnectionConfigForVille']);
Route::get('configuration/connection/for-cours/{coursId}', [ConfigurationController::class, 'getConnectionConfigForCours']);
Route::get('configuration/connection/for-examen/{examenId}', [ConfigurationController::class, 'getConnectionConfigForExamen']);

// Biostar attendance routes
Route::get('biostar-attendance/cours', [BiostarAttendanceController::class, 'getCoursAttendance']);
Route::get('biostar-attendance/examen', [BiostarAttendanceController::class, 'getExamenAttendance']);
Route::get('biostar-attendance/ville', [BiostarAttendanceController::class, 'getAttendanceByVille']);
Route::get('biostar-attendance/test-connection', [BiostarAttendanceController::class, 'testConnection']);
Route::get('biostar-attendance/statistics', [BiostarAttendanceController::class, 'getStatistics']);

// Routes spéciales pour les étudiants (AVANT les ressources)
Route::post("import-etudiants", [EtudiantController::class, "ImportEtudiants"]);
Route::post("import-students-modern", [EtudiantController::class, "importEtudiantsModern"]);
Route::post("validate-students-file", [EtudiantController::class, "validateStudentsFile"]);

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
Route::get("groups/create", [GroupController::class, "create"]);
Route::get("groups/{id}/edit", [GroupController::class, "edit"]);
Route::get("groups/{id}/students", [GroupController::class, "getStudentsByGroup"]);
Route::post("groups/{id}/students", [GroupController::class, "addStudentsToGroup"]);
Route::delete("groups/{id}/students", [GroupController::class, "removeStudentsFromGroup"]);
Route::get("groups/by-etablissement/{etablissementId}", [GroupController::class, "getGroupsByEtablissement"]);
Route::get("groups/by-promotion/{promotionId}", [GroupController::class, "getGroupsByPromotion"]);
Route::get("groups/by-ville/{villeId}", [GroupController::class, "getGroupsByVille"]);

// Ville routes - Routes spécifiques AVANT la ressource
Route::get('villes/search', [VilleController::class, 'search']);
Route::get('villes/etablissement/{etablissementId}', [VilleController::class, 'getByEtablissement']);

// Ville routes - API Resource
Route::apiResource('villes', VilleController::class);

// Routes spécifiques pour les examens AVANT la ressource
Route::post('/examens/import-examens', [ExamenController::class, 'ImportExamens']);
Route::get('/examens/etablissements', [ExamenController::class, 'getEtablissements']);
Route::get('/examens/promotions', [ExamenController::class, 'getPromotions']);
Route::get('/examens/salles', [ExamenController::class, 'getSalles']);
Route::get('/examens/filter-options', [ExamenController::class, 'getFilterOptions']);
Route::get('/examens/archived', [ExamenController::class, 'archived']);
Route::patch('/examens/{id}/archive', [ExamenController::class, 'archive']);

// Route pour désarchiver un examen (super-admin et admin uniquement)
Route::patch('/examens/{id}/unarchive', [ExamenController::class, 'unarchive'])->middleware('auth:sanctum');

// Routes spécifiques pour les établissements AVANT la ressource
Route::get('etablissements/statistics', [EtablissementController::class, 'getStatistics']);
Route::get('etablissements/all', [EtablissementController::class, 'allEtablissements']);

// CRUD complet pour les établissements et examens (routes de ressources)
Route::apiResource('etablissements', EtablissementController::class);
Route::apiResource('examens', ExamenController::class);

// Routes pour les cours
Route::get("/cours/{coursId}/attendance", [CoursController::class, "fetchCoursAttendance"]);
Route::get('/cours/filter-options', [CoursController::class, 'getFilterOptions']);
Route::get('/cours/archived', [CoursController::class, 'archived']);
Route::patch('/cours/{id}/archive', [CoursController::class, 'archive']);
Route::patch('/cours/{id}/unarchive', [CoursController::class, 'unarchive']);
Route::get('/cours', [CoursController::class, 'index']);
Route::get('/cours/{id}', [CoursController::class, 'show']);
Route::post('/cours', [CoursController::class, 'store']);
Route::put('/cours/{id}', [CoursController::class, 'update']);
Route::delete('/cours/{id}', [CoursController::class, 'destroy']);
Route::post('/import-cours', [CoursController::class, 'importCoursModern']);

// Promotion routes - Routes spécifiques AVANT la ressource
Route::get('promotions/search', [PromotionController::class, 'search']);
Route::get('promotions/all', [PromotionController::class, 'getAll']);
Route::get('promotions/etablissement/{etablissementId}', [PromotionController::class, 'getByEtablissement']);
Route::get('promotions/faculte/{faculteId}', [PromotionController::class, 'getByFaculte']);
Route::apiResource('promotions', PromotionController::class);

// Enseignants - API Resource (protected)
Route::post('enseignants-with-user', [EnseignantController::class, 'storeWithUser']);
Route::put('enseignants-with-user/{id}', [EnseignantController::class, 'updateWithUser']);
Route::apiResource('enseignants', EnseignantController::class);

// Gestion des utilisateurs - Accès restreint aux super admins uniquement
Route::middleware(['auth:sanctum', 'super.admin'])->group(function () {
    // Routes CRUD pour la gestion des utilisateurs
    Route::get('user-management/form-options', [UserManagementController::class, 'getFormOptions']);
    Route::apiResource('user-management', UserManagementController::class);
    
    // Routes supplémentaires pour la gestion des utilisateurs
    Route::put('user-management/{id}/role', [UserManagementController::class, 'updateRole']);
    Route::get('user-management/statistics', [UserManagementController::class, 'getStatistics']);
    Route::get('user-management/search', [UserManagementController::class, 'search']);
    
    // Routes pour les logs d'activité (traçabilité)
    Route::get('activity-logs', [ActivityLogController::class, 'index']);
    Route::get('activity-logs/{id}', [ActivityLogController::class, 'show']);
    Route::get('activity-logs/statistics', [ActivityLogController::class, 'statistics']);
});

// Public routes for students
Route::get("test-etudiants", [EtudiantController::class, "index"]);
Route::get("test-etudiants-count", [EtudiantController::class, "testStudentsCount"]);
Route::get("diagnostic-etudiants", [EtudiantController::class, "diagnosticStudents"])->middleware('auth:sanctum');

// Routes d'export publiques pour test (sans authentification)
Route::get('/export-simple-public', [EtudiantController::class, 'exportSimple']);
Route::get('/export-etudiants-public', [EtudiantController::class, 'exportEtudiantsStream']);


// Salle routes - Routes spécifiques AVANT la ressource
Route::get('salles/search', [SalleController::class, 'search']);
Route::get('salles/etablissement/{etablissementId}', [SalleController::class, 'getByEtablissement']);
Route::get('salles/building/{batiment}', [SalleController::class, 'getByBuilding']);
Route::get('salles/floor/{etage}', [SalleController::class, 'getByFloor']);
Route::post('salles/available', [SalleController::class, 'getAvailable']);

// Salle routes - API Resource
Route::apiResource('salles', SalleController::class);

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

// Biostar devices & healthcheck (protected)
Route::middleware('auth:sanctum')->group(function () {
    Route::get('biostar/devices', [BiostarAttendanceController::class, 'getDevices']);
    Route::get('biostar/device-groups', [BiostarAttendanceController::class, 'getDeviceGroups']);
    Route::get('biostar/health', [BiostarAttendanceController::class, 'testConnection']);
});

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
Route::get('absences/students/ranking', [AbsenceController::class, 'getStudentsRanking']);
Route::post('absences/{id}/upload-justificatif', [AbsenceController::class, 'uploadJustificatif']);
Route::get('absences/{id}/download-justificatif', [AbsenceController::class, 'downloadJustificatif']);
Route::delete('absences/{id}/justificatif', [AbsenceController::class, 'deleteJustificatif']);

// Routes pour la création automatique des absences
Route::post('absences/auto/create-for-examen', [AbsenceAutoController::class, 'createAbsencesForExamen']);
Route::post('absences/auto/create-for-date', [AbsenceAutoController::class, 'createAbsencesForDate']);
Route::post('absences/auto/create-from-attendance', [AbsenceAutoController::class, 'createAbsencesFromAttendance']);
Route::get('absences/auto/statistics', [AbsenceAutoController::class, 'getAbsenceStatistics']);

// Routes pour la gestion des états de présence
Route::post('attendance-states/cours/update', [AttendanceStateController::class, 'updateCoursAttendanceState']);
Route::post('attendance-states/examen/update', [AttendanceStateController::class, 'updateExamenAttendanceState']);
Route::get('attendance-states/cours/get', [AttendanceStateController::class, 'getCoursAttendanceState']);
Route::get('attendance-states/examen/get', [AttendanceStateController::class, 'getExamenAttendanceState']);
Route::post('attendance-states/justify', [AttendanceStateController::class, 'justifyAbsence']);
Route::get('attendance-states/available-statuses', [AttendanceStateController::class, 'getAvailableStatuses']);
Route::post('attendance-states/cours/bulk-update', [AttendanceStateController::class, 'updateCoursAttendanceStatesBulk']);
Route::post('attendance-states/examen/bulk-update', [AttendanceStateController::class, 'updateExamenAttendanceStatesBulk']);

Route::apiResource('absences', AbsenceController::class);

// Attendance Rapide routes
Route::post('attendance-rapide/validate', [AttendanceRapideController::class, 'validate']);
Route::post('attendance-rapide/suggest', [AttendanceRapideController::class, 'suggest']);
Route::post('attendance-rapide/import', [AttendanceRapideController::class, 'import']);
Route::post('attendance-rapide/lancer', [AttendanceRapideController::class, 'lancer']);
Route::get('attendance-rapide/template', [AttendanceRapideController::class, 'template']);
Route::get('attendance-rapide/devices', [AttendanceRapideController::class, 'getDevices']);
Route::get('attendance-rapide/{etablissementId}', [AttendanceRapideController::class, 'get']);

// Student Tracking routes
Route::get('student-tracking/track', [StudentTrackingController::class, 'track']);

// QR Code attendance routes


// Routes pour enseignants / admin / super-admin
Route::middleware('auth:sanctum')->prefix('qr-attendance')->group(function () {
    // Génération de QR pour les cours / examens
    Route::post('cours/{coursId}/generate', [QrCodeAttendanceController::class, 'generateForCours']);
    Route::post('examens/{examenId}/generate', [QrCodeAttendanceController::class, 'generateForExamen']);

    // Lecture de l'attendance QR pour un cours
    Route::get('cours/{coursId}', [QrCodeAttendanceController::class, 'getAttendanceForCours']);
    
    // Lecture de l'attendance QR pour un examen
    Route::get('examens/{examenId}/attendance', [QrCodeAttendanceController::class, 'getAttendanceForExamen']);
});

// Scan QR par l'étudiant - utiliser AuthenticateEtudiant middleware

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
});
