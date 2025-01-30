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

    function show($id) {
        $faculte = Faculte::find($id);
        if (!$faculte) {
            return response()->json(["message" => "Faculte not found", "status" => 404], 404);
        }

        return response()->json(["faculte" => $faculte, "status" => 200], 200);
    }

    function store(Request $request) {
        // Validate the request input
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        // Create a new Faculte
        $faculte = Faculte::create($request->all());

        // Return the newly created Faculte as a JSON response
        return response()->json($faculte, 201);
    }

    function update(Request $request, $id) {
        // Validate the request input
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
        ]);

        // Find the Faculte by id
        $faculte = Faculte::find($id);
        if (!$faculte) {
            return response()->json(['message' => 'Faculte not found'], 404);
        }

        // Update the Faculte with the new data
        $faculte->update($request->only(['name']));

        // Return the updated Faculte as a JSON response
        return response()->json($faculte, 200);
    }

    function destroy($id) {
        // Find the Faculte by id
        $faculte = Faculte::find($id);

        if (!$faculte) {
            return response()->json(['message' => 'Faculte not found'], 404);
        }

        // Delete the Faculte
        $faculte->delete();

        // Return a success response
        return response()->json(['message' => 'Faculte deleted successfully'], 200);
    }
}