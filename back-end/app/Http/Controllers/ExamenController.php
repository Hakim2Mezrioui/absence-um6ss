<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Examen;

class ExamenController extends Controller
{
    function index() {
        $examens = Examen::all();

        return response()->json(["examens" => $examens, "status" => 200]);
    }

    function store(Request $request) {
        // Examen::create([

        // ]);
    }
}
