<?php

use App\Http\Controllers\AuthController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EtudiantController;
use App\Http\Controllers\FaculteController;
use App\Http\Controllers\ExamenController;
use App\Http\Controllers\RattrapageController;
use App\Http\Controllers\CoursController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::get("user", [AuthController::class, "user"])->middleware("auth:sanctum");
Route::post("create", [AuthController::class,"create"])->middleware("auth:sanctum");
Route::get("users", [AuthController::class, "users"]);
Route::post("destroy/{id}", [AuthController::class, "destroy"]);

Route::middleware('auth:sanctum')->group(function () {
Route::get("etudiants", [EtudiantController::class, "index"]);
Route::post("import-etudiants", [EtudiantController::class, "ImportEtudiants"]);
Route::get("fetchEtudiantByPromotion", [EtudiantController::class, "fetchEtudiantByPromotion"]);
Route::get("fetchEtudiantByFaculte", [EtudiantController::class, "fetchEtudiantByFaculte"]);
Route::get("etudiant/{matricule}", [EtudiantController::class, "show"]);
Route::post("add-etudiant", [EtudiantController::class, "store"]);
Route::put('/update-etudiant/{matricule}', [EtudiantController::class, 'update']);
Route::delete('/delete-etudiants/{matricule}', [EtudiantController::class, 'destroy']);
Route::get("/fetch-etudiants", [EtudiantController::class, "fetchEtudiants"]);

Route::get("examens", [ExamenController::class, "index"]);
Route::post("create-exam", [ExamenController::class, "store"]);
Route::post('/import-examens', [ExamenController::class, 'ImportExamens']);
Route::get('/examens/{id}', [ExamenController::class, 'show']);
Route::put('/examens/{id}', [ExamenController::class, 'update']);
Route::post('/examens', [ExamenController::class, 'store']);
Route::delete('/examens/{id}', [ExamenController::class, 'destroy']);


Route::get('/facultes', [FaculteController::class, 'allFacultes']);
Route::get('/facultes/{id}', [FaculteController::class, 'show']);
Route::post('/facultes', [FaculteController::class, 'store']);
Route::put('/facultes/{id}', [FaculteController::class, 'update']);
Route::delete('/facultes/{id}', [FaculteController::class, 'destroy']);

Route::post("rattrapage-importation", [RattrapageController::class, "importation"]);
Route::get("rattrapage", [RattrapageController::class, "index"]);
});

Route::get('/cours', [CoursController::class, 'index']);
Route::get('/cours/{id}', [CoursController::class, 'show']);
Route::post('/cours', [CoursController::class, 'store']);
Route::put('/cours/{id}', [CoursController::class, 'update']);
Route::delete('/cours/{id}', [CoursController::class, 'destroy']);
Route::post('/import-cours', [CoursController::class, 'ImportCourse']);

Route::post("register", [AuthController::class, "register"]);
Route::post("login", [AuthController::class, "login"]);
Route::post("logout", [AuthController::class,"logout"]);
