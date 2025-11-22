<?php

namespace App\Http\Controllers;

use App\Services\AttendanceRapideService;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class AttendanceRapideController extends Controller
{
    protected $attendanceRapideService;

    public function __construct(AttendanceRapideService $attendanceRapideService)
    {
        $this->attendanceRapideService = $attendanceRapideService;
    }

    /**
     * Valider un fichier avant l'importation
     */
    public function validate(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
            ]);

            $file = $request->file('file');
            $result = $this->attendanceRapideService->validateFile($file);

            return response()->json($result->getData(), $result->getStatusCode());

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la validation du fichier: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la validation: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Suggestions dynamiques pour une colonne
     */
    public function suggest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'field' => 'required|string',
            'value' => 'nullable|string'
        ]);
        
        return $this->attendanceRapideService->getFieldSuggestionsResponse(
            $validated['field'],
            $validated['value'] ?? ''
        );
    }

    /**
     * Importer une liste d'étudiants
     */
    public function import(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'file' => 'required|file|mimes:csv,txt,xlsx,xls|max:10240',
                'etablissement_id' => 'required|exists:etablissements,id',
                'ville_id' => 'required|exists:villes,id'
            ]);

            $file = $request->file('file');
            $result = $this->attendanceRapideService->importList(
                $file,
                $request->etablissement_id,
                $request->ville_id
            );

            // Si c'est une réponse d'erreur, la retourner directement
            if (isset($result->getData()->success) && !$result->getData()->success) {
                return $result;
            }

            return response()->json($result->getData(), $result->getStatusCode());

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de l\'import attendance rapide: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de l\'import: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Lancer la récupération des données Biostar
     */
    public function lancer(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'etablissement_id' => 'required|exists:etablissements,id',
                'date' => 'required|date',
                'heure_debut' => 'required|date_format:H:i',
                'heure_fin' => 'required|date_format:H:i|after:heure_debut',
                'ville_id' => 'required|exists:villes,id',
                'device_ids' => 'nullable|array',
                'device_ids.*' => 'nullable|string',
                'device_names' => 'nullable|array',
                'device_names.*' => 'nullable|string'
            ]);

            $result = $this->attendanceRapideService->lancerRecuperation(
                $request->etablissement_id,
                $request->date,
                $request->heure_debut,
                $request->heure_fin,
                $request->ville_id,
                $request->device_ids ?? null,
                $request->device_names ?? null
            );

            return response()->json($result->getData(), $result->getStatusCode());

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors du lancement récupération Biostar: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer les données d'attendance rapide pour un établissement
     */
    public function get($etablissementId): JsonResponse
    {
        try {
            $result = $this->attendanceRapideService->getAttendanceRapide($etablissementId);

            return response()->json($result->getData(), $result->getStatusCode());

        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération attendance rapide: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Récupérer les devices selon la ville
     */
    public function getDevices(Request $request): JsonResponse
    {
        try {
            $request->validate([
                'ville_id' => 'required|exists:villes,id'
            ]);

            $result = $this->attendanceRapideService->getDevicesForVille($request->ville_id);

            return response()->json($result->getData(), $result->getStatusCode());

        } catch (\Illuminate\Validation\ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Erreur de validation',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération des devices: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la récupération des devices: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Télécharger le modèle CSV/Excel
     */
    public function template(Request $request)
    {
        try {
            $format = $request->get('format', 'csv'); // csv ou xlsx
            
            if (!in_array($format, ['csv', 'xlsx'])) {
                return response()->json([
                    'success' => false,
                    'message' => 'Format non supporté. Utilisez csv ou xlsx'
                ], 400);
            }

            $template = $this->attendanceRapideService->generateTemplate($format);

            // Vérifier que le fichier existe
            if (!file_exists($template['file_path'])) {
                throw new \Exception('Le fichier modèle n\'a pas pu être créé');
            }

            // Vérifier que le fichier n'est pas vide
            $fileSize = filesize($template['file_path']);
            if ($fileSize === 0) {
                throw new \Exception('Le fichier modèle généré est vide');
            }

            return response()->download(
                $template['file_path'],
                $template['filename'],
                [
                    'Content-Type' => $template['mime_type'],
                    'Content-Disposition' => 'attachment; filename="' . $template['filename'] . '"',
                    'Content-Length' => $fileSize,
                    'Cache-Control' => 'no-cache, no-store, must-revalidate',
                    'Pragma' => 'no-cache',
                    'Expires' => '0'
                ]
            )->deleteFileAfterSend(true);

        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération du modèle: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Erreur lors de la génération du modèle: ' . $e->getMessage()
            ], 500);
        }
    }
}

