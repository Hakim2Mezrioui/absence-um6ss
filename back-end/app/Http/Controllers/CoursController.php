<?php

namespace App\Http\Controllers;

use App\Models\Cours;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CoursController extends Controller
{
    public function index()
    {
        $cours = Cours::all();
        return response()->json($cours);
    }

    /**
     * Afficher un cours spécifique.
     */
    public function show($id)
    {
        $cours = Cours::find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }
        return response()->json($cours);
    }

    /**
     * Ajouter un nouveau cours.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'title' => 'required|string|max:255',
            'date' => 'required|date',
            'hour_debut' => 'required',
            'hour_fin' => 'required|after:hour_debut',
            'faculte' => 'required|string|max:255',
            'groupe' => 'required|integer',
            'promotion' => ['required', Rule::in(['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee'])],
            'option' => 'nullable|string',
        ]);

        $cours = new Cours();
        $cours->title = $validatedData['title'];
        $cours->date = $validatedData['date'];
        $cours->hour_debut = $validatedData['hour_debut'];
        $cours->hour_fin = $validatedData['hour_fin'];
        $cours->faculte = $validatedData['faculte'];
        $cours->groupe = $validatedData['groupe'];
        $cours->promotion = $validatedData['promotion'];
        $cours->option = $validatedData['option'] ?? '';
        $cours->save();

        return response()->json(['message' => 'Cours ajouté avec succès', 'cours' => $cours], 201);
    }

    /**
     * Mettre à jour un cours.
     */
    public function update(Request $request, $id)
    {
        $cours = Cours::find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        $validatedData = $request->validate([
            'title' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'hour_debut' => 'sometimes',
            'hour_fin' => 'sometimes|after:hour_debut',
            'faculte' => 'sometimes|string|max:255',
            'groupe' => 'sometimes|integer',
            'promotion' => ['sometimes', Rule::in(['1ère annee', '2ème annee', '3ème annee', '4ème annee', '5ème annee', '6ème annee'])],
            'option' => 'nullable|string',
        ]);

        $cours->update($validatedData);
        return response()->json(['message' => 'Cours mis à jour avec succès', 'cours' => $cours]);
    }

    /**
     * Supprimer un cours.
     */
    public function destroy($id)
    {
        $cours = Cours::find($id);
        if (!$cours) {
            return response()->json(['message' => 'Cours non trouvé'], 404);
        }

        $cours->delete();
        return response()->json(['message' => 'Cours supprimé avec succès']);
    }
}
