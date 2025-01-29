<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\EtudiantController;
use App\Http\Controllers\FaculteController;
use App\Http\Controllers\ExamenController;

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');


Route::get("etudiants", [EtudiantController::class, "index"]);
Route::post("import-etudiants", [EtudiantController::class, "ImportEtudiants"]);
Route::get("fetchEtudiantByPromotion", [EtudiantController::class, "fetchEtudiantByPromotion"]);

Route::get("facultes", [FaculteController::class, "allFacultes"]);

Route::get("examens", [ExamenController::class, "index"]);
Route::post("create-exam", [ExamenController::class, "store"]);
