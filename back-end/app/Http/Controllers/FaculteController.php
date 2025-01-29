<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Faculte;

class FaculteController extends Controller
{
    function allFacultes() {
        $facultes = Faculte::all();

        return response()->json(["facultes" => $facultes, "status" => 200]);
    }
}
