<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Etablissement;

class EtablissementController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $etablissements = Etablissement::all();
        return response()->json(["etablissements" => $etablissements, "status" => 200]);
    }

    /**
     * Display a listing of the resource (alias for index).
     */
    public function allEtablissements()
    {
        return $this->index();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        // Cette méthode n'est généralement pas utilisée pour les APIs
        return response()->json(['message' => 'Use POST /etablissements to create a new establishment'], 405);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        $etablissement = Etablissement::with('ville')->find($id);
        if (!$etablissement) {
            return response()->json(["message" => "Etablissement not found", "status" => 404], 404);
        }

        return response()->json(["etablissement" => $etablissement, "status" => 200], 200);
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        // Cette méthode n'est généralement pas utilisée pour les APIs
        return response()->json(['message' => 'Use PUT /etablissements/{id} to update an establishment'], 405);
    }

    function store(Request $request) {
        // Validate the request input
        $request->validate([
            'name' => 'required|string|max:255',
            'ville_id' => 'required|exists:villes,id',
        ]);

        // Create a new Etablissement
        $etablissement = Etablissement::create($request->all());

        // Return the newly created Etablissement as a JSON response
        return response()->json($etablissement, 201);
    }

    function update(Request $request, $id) {
        // Validate the request input
        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'ville_id' => 'sometimes|required|exists:villes,id',
        ]);

        // Find the Etablissement by id
        $etablissement = Etablissement::with('ville')->find($id);
        if (!$etablissement) {
            return response()->json(['message' => 'Etablissement not found'], 404);
        }

        // Update the Etablissement with the new data
        $etablissement->update($request->only(['name', 'ville_id']));

        // Return the updated Etablissement as a JSON response
        return response()->json($etablissement, 200);
    }

    function destroy($id) {
        // Find the Etablissement by id
        $etablissement = Etablissement::find($id);

        if (!$etablissement) {
            return response()->json(['message' => 'Etablissement not found'], 404);
        }

        // Delete the Etablissement
        $etablissement->delete();

        // Return a success response
        return response()->json(['message' => 'Etablissement deleted successfully'], 200);
    }
} 