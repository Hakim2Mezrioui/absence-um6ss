<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Option;
use App\Services\OptionService;

class OptionController extends Controller
{
    protected $optionService;

    public function __construct(OptionService $optionService)
    {
        $this->optionService = $optionService;
    }

    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        try {
            $options = $this->optionService->getAllOptions();
            return response()->json([
                "options" => $options, 
                "status" => 200
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération des options",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Display a listing of the resource (alias for index).
     */
    public function allOptions()
    {
        return $this->index();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return response()->json([
            'message' => 'Use POST /options to create a new option'
        ], 405);
    }

    /**
     * Display the specified resource.
     */
    public function show($id)
    {
        try {
            $option = $this->optionService->getOptionById($id);
            if (!$option) {
                return response()->json([
                    "message" => "Option not found", 
                    "status" => 404
                ], 404);
            }

            return response()->json([
                "option" => $option, 
                "status" => 200
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération de l'option",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit($id)
    {
        return response()->json([
            'message' => 'Use PUT /options/{id} to update an option'
        ], 405);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $request->validate([
                'name' => 'required|string|max:255',
                'description' => 'nullable|string',
                'etablissement_id' => 'required|exists:etablissements,id',
            ]);

            $option = $this->optionService->createOption($request->all());
            return response()->json($option, 201);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la création de l'option",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, $id)
    {
        try {
            $request->validate([
                'name' => 'sometimes|required|string|max:255',
                'description' => 'sometimes|nullable|string',
                'etablissement_id' => 'sometimes|required|exists:etablissements,id'
            ]);

            $option = $this->optionService->updateOption($id, $request->only([
                'name', 'description', 'etablissement_id'
            ]));

            if (!$option) {
                return response()->json([
                    'message' => 'Option not found'
                ], 404);
            }

            return response()->json($option, 200);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la mise à jour de l'option",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            $deleted = $this->optionService->deleteOption($id);
            if (!$deleted) {
                return response()->json([
                    'message' => 'Option not found'
                ], 404);
            }

            return response()->json([
                'message' => 'Option deleted successfully'
            ], 200);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la suppression de l'option",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get options by etablissement
     */
    public function getByEtablissement($etablissementId)
    {
        try {
            $options = $this->optionService->getOptionsByEtablissement($etablissementId);
            return response()->json([
                "options" => $options,
                "status" => 200
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération des options",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Search options
     */
    public function search(Request $request)
    {
        try {
            $request->validate([
                'query' => 'required|string|min:2'
            ]);

            $options = $this->optionService->searchOptions($request->query);
            return response()->json([
                "options" => $options,
                "status" => 200
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la recherche des options",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get option statistics
     */
    public function getStatistics($id)
    {
        try {
            $statistics = $this->optionService->getOptionStatistics($id);
            return response()->json([
                "statistics" => $statistics,
                "status" => 200
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération des statistiques",
                "error" => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get popular options
     */
    public function getPopularOptions(Request $request)
    {
        try {
            $limit = $request->get('limit', 10);
            $options = $this->optionService->getPopularOptions($limit);
            return response()->json([
                "options" => $options,
                "status" => 200
            ]);
        } catch (\Exception $e) {
            return response()->json([
                "message" => "Erreur lors de la récupération des options populaires",
                "error" => $e->getMessage()
            ], 500);
        }
    }
} 