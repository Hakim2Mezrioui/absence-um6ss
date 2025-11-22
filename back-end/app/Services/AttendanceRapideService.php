<?php

namespace App\Services;

use App\Models\AttendanceRapide;
use App\Models\Etablissement;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Csv;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class AttendanceRapideService extends BaseService
{
    protected $configurationService;
    protected $biostarAttendanceService;
    protected $referenceDataLoaded = false;
    
    // Propriétés pour stocker les données préchargées
    protected $villes = [];
    protected $etablissements = [];
    protected $groups = [];
    protected $options = [];
    protected $promotions = [];

    public function __construct()
    {
        parent::__construct(AttendanceRapide::class);
        $this->configurationService = new ConfigurationService();
        $this->biostarAttendanceService = new BiostarAttendanceService();
    }

    /**
     * Charger toutes les données de référence pour les suggestions
     */
    private function loadReferenceData()
    {
        if ($this->referenceDataLoaded) {
            return;
        }
        
        // Charger toutes les villes
        $this->villes = \App\Models\Ville::all(['id', 'name'])->toArray();
        
        // Charger tous les établissements
        $this->etablissements = \App\Models\Etablissement::all(['id', 'name'])->toArray();
        
        // Charger tous les groupes
        $this->groups = \App\Models\Group::all(['id', 'title'])->toArray();
        
        // Charger toutes les options
        $this->options = \App\Models\Option::all(['id', 'name'])->toArray();
        
        // Charger toutes les promotions (sans scope pour avoir toutes)
        $this->promotions = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)
            ->get(['id', 'name'])->toArray();
        
        $this->referenceDataLoaded = true;
    }

    /**
     * Normaliser une chaîne de caractères (même logique que EtudiantController)
     */
    private function normalizeString($value)
    {
        if (empty($value)) {
            return '';
        }
        
        // Convertir en minuscules
        $normalized = mb_strtolower(trim($value), 'UTF-8');
        
        // Supprimer les accents
        $normalized = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $normalized);
        
        // Supprimer les caractères spéciaux
        $normalized = preg_replace('/[^a-z0-9\s]/', '', $normalized);
        
        // Supprimer les espaces multiples
        $normalized = preg_replace('/\s+/', ' ', $normalized);
        
        return trim($normalized);
    }

    /**
     * Calculer la distance de Levenshtein entre deux chaînes
     */
    private function levenshteinDistance($str1, $str2)
    {
        $len1 = mb_strlen($str1, 'UTF-8');
        $len2 = mb_strlen($str2, 'UTF-8');
        
        if ($len1 === 0) {
            return $len2;
        }
        if ($len2 === 0) {
            return $len1;
        }
        
        $matrix = [];
        
        // Initialiser la première ligne et colonne
        for ($i = 0; $i <= $len1; $i++) {
            $matrix[$i][0] = $i;
        }
        for ($j = 0; $j <= $len2; $j++) {
            $matrix[0][$j] = $j;
        }
        
        // Remplir la matrice
        for ($i = 1; $i <= $len1; $i++) {
            for ($j = 1; $j <= $len2; $j++) {
                $char1 = mb_substr($str1, $i - 1, 1, 'UTF-8');
                $char2 = mb_substr($str2, $j - 1, 1, 'UTF-8');
                
                $cost = ($char1 === $char2) ? 0 : 1;
                
                $matrix[$i][$j] = min(
                    $matrix[$i - 1][$j] + 1,      // Suppression
                    $matrix[$i][$j - 1] + 1,      // Insertion
                    $matrix[$i - 1][$j - 1] + $cost // Substitution
                );
            }
        }
        
        return $matrix[$len1][$len2];
    }

    /**
     * Résoudre un ID depuis un nom (helper pour importList)
     */
    private function resolveId(string $type, string $name): ?int
    {
        if (empty($name)) {
            return null;
        }

        $normalized = strtolower(trim($name));
        
        switch ($type) {
            case 'promotion':
                foreach ($this->promotions as $promo) {
                    if (strtolower(trim($promo['name'])) === $normalized) {
                        return $promo['id'];
                    }
                }
                break;
            case 'group':
                foreach ($this->groups as $group) {
                    if (strtolower(trim($group['title'])) === $normalized) {
                        return $group['id'];
                    }
                }
                break;
            case 'option':
                foreach ($this->options as $option) {
                    if (strtolower(trim($option['name'])) === $normalized) {
                        return $option['id'];
                    }
                }
                break;
        }
        
        return null;
    }

    /**
     * Calculer les suggestions avec scoring (inspiré de simple-cours-import)
     */
    private function computeSuggestionsWithScoring($relation, $value)
    {
        $this->loadReferenceData();
        
        if (empty($value)) {
            return [
                'auto_applied' => false,
                'value' => [],
                'score' => 0
            ];
        }

        $normalizedValue = $this->normalizeString($value);
        $reference = [];
        
        // Obtenir les données de référence selon la relation
        // Note: ville_name et etablissement_name ne sont plus supportés car ils viennent de la configuration
        switch ($relation) {
            case 'group_title':
                $reference = $this->groups;
                $labelKey = 'title';
                $idKey = 'id';
                break;
            case 'option_name':
                $reference = $this->options;
                $labelKey = 'name';
                $idKey = 'id';
                break;
            case 'promotion_name':
                $reference = $this->promotions;
                $labelKey = 'name';
                $idKey = 'id';
                break;
            default:
                return [
                    'auto_applied' => false,
                    'value' => [],
                    'score' => 0
                ];
        }

        if (empty($reference)) {
            return [
                'auto_applied' => false,
                'value' => [],
                'score' => 0
            ];
        }

        // Vérifier correspondance exacte
        foreach ($reference as $entry) {
            $normalizedEntry = $this->normalizeString($entry[$labelKey]);
            if ($normalizedEntry === $normalizedValue) {
                return [
                    'auto_applied' => true,
                    'value' => $entry[$labelKey],
                    'score' => 100
                ];
            }
        }

        // Pour les entrées courtes (< 3 caractères), recherche rapide
        if (mb_strlen($normalizedValue, 'UTF-8') < 3) {
            $quickCandidates = [];
            foreach ($reference as $entry) {
                $normalizedEntry = $this->normalizeString($entry[$labelKey]);
                if (mb_strpos($normalizedEntry, $normalizedValue) !== false || 
                    mb_strpos($normalizedValue, $normalizedEntry) !== false) {
                    $quickCandidates[] = [
                        'label' => $entry[$labelKey],
                        'id' => $entry[$idKey],
                        'normalized' => $normalizedEntry
                    ];
                }
            }
            
            if (!empty($quickCandidates)) {
                return [
                    'auto_applied' => false,
                    'value' => array_slice($quickCandidates, 0, 5),
                    'score' => 0
                ];
            }
            
            // Si pas de correspondance rapide, retourner les premières entrées
            $fallback = array_slice($reference, 0, 5);
            return [
                'auto_applied' => false,
                'value' => array_map(function($entry) use ($labelKey, $idKey) {
                    return [
                        'label' => $entry[$labelKey],
                        'id' => $entry[$idKey]
                    ];
                }, $fallback),
                'score' => 0
            ];
        }

        // Filtrer les candidats rapides (commence par, contient, ou est contenu)
        $quickCandidates = [];
        foreach ($reference as $entry) {
            $normalizedEntry = $this->normalizeString($entry[$labelKey]);
            if (mb_strpos($normalizedEntry, $normalizedValue) !== false || 
                mb_strpos($normalizedValue, $normalizedEntry) !== false) {
                $quickCandidates[] = $entry;
            }
        }

        // Limiter le pool à scorer (max 300)
        $pool = !empty($quickCandidates) 
            ? array_slice($quickCandidates, 0, 300)
            : array_slice($reference, 0, min(300, count($reference)));

        // Extraire le chiffre initial pour les promotions
        $numMatch = function($str) {
            if (preg_match('/^(\d+)/', $str, $matches)) {
                return $matches[1];
            }
            return null;
        };
        $termNum = $numMatch($normalizedValue);

        // Calculer les scores
        $scored = [];
        foreach ($pool as $entry) {
            $normalizedEntry = $this->normalizeString($entry[$labelKey]);
            $score = 0;

            // Correspondance partielle (includes)
            if (mb_strpos($normalizedEntry, $normalizedValue) !== false || 
                mb_strpos($normalizedValue, $normalizedEntry) !== false) {
                $score += 50;
            }

            // Commence par
            if (mb_strpos($normalizedEntry, $normalizedValue) === 0) {
                $score += 20;
            }

            // Distance de Levenshtein
            $distance = $this->levenshteinDistance($normalizedValue, $normalizedEntry);
            $score += max(0, 40 - $distance * 10);

            // Bonus chiffre initial identique (pour promotions)
            if ($termNum) {
                $entryNum = $numMatch($normalizedEntry);
                if ($entryNum && $entryNum === $termNum) {
                    $score += 60;
                }
            }

            if ($score > 0) {
                $scored[] = [
                    'entry' => $entry,
                    'score' => $score
                ];
            }
        }

        // Trier par score décroissant
        usort($scored, function($a, $b) {
            return $b['score'] - $a['score'];
        });

        // Si le meilleur score >= 80, auto-validation
        if (!empty($scored) && $scored[0]['score'] >= 80) {
            return [
                'auto_applied' => true,
                'value' => $scored[0]['entry'][$labelKey],
                'score' => $scored[0]['score']
            ];
        }

        // Sinon, retourner les 5 meilleures suggestions avec scores
        $suggestions = [];
        $baseCandidates = !empty($scored) ? $scored : array_slice($reference, 0, 3);
        
        foreach (array_slice($baseCandidates, 0, 5) as $item) {
            if (isset($item['entry'])) {
                $suggestions[] = [
                    'label' => $item['entry'][$labelKey],
                    'id' => $item['entry'][$idKey],
                    'score' => $item['score'] ?? 0
                ];
            } else {
                $suggestions[] = [
                    'label' => $item[$labelKey],
                    'id' => $item[$idKey],
                    'score' => 0
                ];
            }
        }

        return [
            'auto_applied' => false,
            'value' => $suggestions,
            'score' => 0
        ];
    }

    /**
     * Vérifier si une valeur existe exactement dans la base de données
     */
    private function checkExactMatchInDatabase($field, $value)
    {
        $normalizedValue = $this->normalizeString($value);
        
        switch ($field) {
            case 'promotion_name':
                $promotion = \App\Models\Promotion::withoutGlobalScope(\App\Scopes\UserContextScope::class)
                    ->whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($value))])
                    ->first();
                if ($promotion) {
                    return ['found' => true, 'value' => $promotion->name];
                }
                break;
                
            case 'group_title':
                $group = \App\Models\Group::whereRaw('LOWER(TRIM(title)) = ?', [strtolower(trim($value))])
                    ->first();
                if ($group) {
                    return ['found' => true, 'value' => $group->title];
                }
                break;
                
            case 'option_name':
                $option = \App\Models\Option::whereRaw('LOWER(TRIM(name)) = ?', [strtolower(trim($value))])
                    ->first();
                if ($option) {
                    return ['found' => true, 'value' => $option->name];
                }
                break;
        }
        
        return ['found' => false, 'value' => null];
    }

    /**
     * Suggestions dynamiques pour un champ relationnel (validation live)
     */
    public function getFieldSuggestionsResponse($field, $value)
    {
        $allowedFields = [
            'promotion_name',
            'group_title',
            'option_name'
        ];
        
        if (!in_array($field, $allowedFields, true)) {
            return $this->errorResponse('Champ non supporté pour les suggestions: ' . $field, 422);
        }
        
        $this->loadReferenceData();
        $inputValue = is_string($value) ? trim($value) : '';
        
        if ($inputValue === '') {
            $rawSuggestions = array_slice($this->getAllSuggestionsForField($field), 0, 10);
            return $this->successResponse([
                'field' => $field,
                'valid' => false,
                'auto_applied' => false,
                'match' => null,
                'suggestions' => $this->normalizeRawSuggestionList($rawSuggestions)
            ], 'Suggestions générées');
        }
        
        // ÉTAPE 1: Vérifier d'abord si la valeur existe exactement dans la base de données
        $exactMatch = $this->checkExactMatchInDatabase($field, $inputValue);
        if ($exactMatch['found']) {
            return $this->successResponse([
                'field' => $field,
                'valid' => true,
                'auto_applied' => false,
                'match' => $exactMatch['value'],
                'suggestions' => []
            ], 'Valeur trouvée dans la base de données');
        }
        
        // ÉTAPE 2: Si pas de correspondance exacte, chercher des suggestions avec scoring
        $scoringResult = $this->computeSuggestionsWithScoring($field, $inputValue);
        
        if ($scoringResult['auto_applied']) {
            // Score élevé = bonne correspondance, proposer automatiquement
            return $this->successResponse([
                'field' => $field,
                'valid' => true,
                'auto_applied' => true,
                'match' => $scoringResult['value'],
                'suggestions' => []
            ], 'Correspondance trouvée avec score élevé');
        }
        
        // ÉTAPE 3: Pas de correspondance exacte et score faible = erreur avec suggestions
        return $this->successResponse([
            'field' => $field,
            'valid' => false,
            'auto_applied' => false,
            'match' => null,
            'suggestions' => $this->formatScoredSuggestions($scoringResult['value'])
        ], 'Valeur non trouvée - Suggestions proposées');
    }

    /**
     * Valider un fichier avant l'importation
     */
    public function validateFile($file)
    {
        try {
            // Charger les données de référence une seule fois
            $this->loadReferenceData();
            
            // Parser le fichier
            $extension = strtolower($file->getClientOriginalExtension());
            $isExcel = in_array($extension, ['xlsx', 'xls']);
            
            $data = [];
            if ($isExcel) {
                $data = $this->parseExcelFile($file->getRealPath());
            } else {
                $data = $this->parseCsvFile($file);
            }

            if (empty($data)) {
                return $this->errorResponse('Le fichier est vide ou ne peut pas être lu', 400);
            }

            // Normaliser les en-têtes
            $headers = array_keys($data[0]);
            $headers = array_map(function($h) {
                return strtolower(trim($h));
            }, $headers);

            // Vérifier les colonnes requises
            $requiredColumns = ['matricule', 'first_name', 'last_name'];
            $missingColumns = [];
            foreach ($requiredColumns as $col) {
                if (!in_array($col, $headers)) {
                    $missingColumns[] = $col;
                }
            }

            // Valider les données avec suggestions
            $errors = [];
            $warnings = [];
            $errorRows = []; // Lignes avec erreurs pour le datatable
            $allRowsData = []; // Toutes les lignes pour le datatable éditable
            $validRows = 0;
            $totalRows = count($data);
            $sampleData = array_slice($data, 0, 5); // Aperçu des 5 premières lignes

            foreach ($data as $index => $row) {
                $lineNumber = $index + 1;
                
                // Normaliser la ligne avec les headers normalisés
                $normalizedRow = [];
                foreach ($headers as $header) {
                    $normalizedRow[$header] = isset($row[$header]) ? trim($row[$header]) : '';
                }
                
                $rowErrors = [];
                $rowSuggestions = [];
                
                // Vérifier que le matricule existe
                $matricule = $normalizedRow['matricule'] ?? '';
                if (empty($matricule)) {
                    $rowErrors['matricule'] = 'Matricule manquant';
                    // Suggestion : chercher des étudiants similaires
                    $rowSuggestions['matricule'] = $this->getMatriculeSuggestions('');
                } else {
                    // Vérifier si le matricule existe dans la BDD et suggérer les données
                    $etudiant = \App\Models\Etudiant::where('matricule', $matricule)->first();
                    if ($etudiant) {
                        // Suggérer les données de la BDD si des champs sont manquants
                        if (empty($normalizedRow['first_name']) && $etudiant->first_name) {
                            $rowSuggestions['first_name'] = $etudiant->first_name;
                        }
                        if (empty($normalizedRow['last_name']) && $etudiant->last_name) {
                            $rowSuggestions['last_name'] = $etudiant->last_name;
                        }
                        if (empty($normalizedRow['email']) && $etudiant->email) {
                            $rowSuggestions['email'] = $etudiant->email;
                        }
                    } else {
                        // Suggestion de matricules similaires
                        $rowSuggestions['matricule'] = $this->getMatriculeSuggestions($matricule);
                    }
                }

                // Vérifier les champs requis
                $first_name = $normalizedRow['first_name'] ?? '';
                $last_name = $normalizedRow['last_name'] ?? '';

                if (empty($first_name)) {
                    $rowErrors['first_name'] = 'Prénom manquant';
                    if (empty($rowSuggestions['first_name'])) {
                        $warnings[] = [
                            'line' => $lineNumber,
                            'message' => 'Prénom manquant pour le matricule: ' . $matricule
                        ];
                    }
                }

                if (empty($last_name)) {
                    $rowErrors['last_name'] = 'Nom manquant';
                    if (empty($rowSuggestions['last_name'])) {
                        $warnings[] = [
                            'line' => $lineNumber,
                            'message' => 'Nom manquant pour le matricule: ' . $matricule
                        ];
                    }
                }

                // Valider les relations avec suggestions automatiques
                // Note: etablissement_name et ville_name ne sont plus validés car ils viennent de la configuration
                // Note: option_name n'est plus obligatoire, mais peut être validé si présent
                $relationMapping = [
                    'promotion_name' => 'promotion_id',
                    'group_title' => 'group_id'
                ];
                
                // Valider option_name seulement s'il est présent (optionnel)
                if (isset($normalizedRow['option_name']) && !empty($normalizedRow['option_name'])) {
                    $optionValue = $normalizedRow['option_name'];
                    
                    // ÉTAPE 1: Vérifier d'abord si la valeur existe exactement dans la base de données
                    $exactMatch = $this->checkExactMatchInDatabase('option_name', $optionValue);
                    
                    if ($exactMatch['found']) {
                        // Valeur trouvée exactement dans la BDD = valide
                        $normalizedRow['option_name'] = $exactMatch['value'];
                        // Pas d'erreur, pas de suggestion nécessaire
                    } else {
                        // ÉTAPE 2: Si pas de correspondance exacte, chercher avec scoring
                        $scoringResult = $this->computeSuggestionsWithScoring('option_name', $optionValue);
                        
                        if ($scoringResult['auto_applied']) {
                            $normalizedRow['option_name'] = $scoringResult['value'];
                            $rowSuggestions['option_name'] = [
                                'value' => $scoringResult['value'],
                                'auto_applied' => true,
                                'score' => $scoringResult['score']
                            ];
                        } else {
                            if (!empty($scoringResult['value'])) {
                                $rowSuggestions['option_name'] = [
                                    'value' => $scoringResult['value'],
                                    'auto_applied' => false,
                                    'score' => 0
                                ];
                            } else {
                                $suggestion = $this->validateRelationAndGetSuggestion('option_id', $optionValue);
                                if ($suggestion && !$suggestion['valid']) {
                                    $rowSuggestions['option_name'] = [
                                        'value' => $suggestion['suggestions'] ?? [],
                                        'auto_applied' => false
                                    ];
                                }
                            }
                        }
                    }
                }

                foreach ($relationMapping as $nameField => $idField) {
                    $value = $normalizedRow[$nameField] ?? '';
                    
                    // Si le champ existe dans les données (même vide)
                    if (isset($normalizedRow[$nameField])) {
                        if (!empty($value)) {
                            // ÉTAPE 1: Vérifier d'abord si la valeur existe exactement dans la base de données
                            $exactMatch = $this->checkExactMatchInDatabase($nameField, $value);
                            
                            if ($exactMatch['found']) {
                                // Valeur trouvée exactement dans la BDD = valide
                                $normalizedRow[$nameField] = $exactMatch['value'];
                                // Pas d'erreur, pas de suggestion nécessaire
                            } else {
                                // ÉTAPE 2: Si pas de correspondance exacte, chercher avec scoring
                                $scoringResult = $this->computeSuggestionsWithScoring($nameField, $value);
                                
                                if ($scoringResult['auto_applied']) {
                                    // Si score >= 80, appliquer automatiquement
                                    $normalizedRow[$nameField] = $scoringResult['value'];
                                    $rowSuggestions[$nameField] = [
                                        'value' => $scoringResult['value'],
                                        'auto_applied' => true,
                                        'score' => $scoringResult['score']
                                    ];
                                    // Ne pas marquer comme erreur si auto-appliqué
                                } else {
                                    // ÉTAPE 3: Pas de correspondance exacte et score faible = erreur avec suggestions
                                    $rowErrors[$nameField] = 'Valeur introuvable dans la base de données';
                                    if (!empty($scoringResult['value'])) {
                                        $rowSuggestions[$nameField] = [
                                            'value' => $scoringResult['value'],
                                            'auto_applied' => false,
                                            'score' => 0
                                        ];
                                    } else {
                                        // Fallback: utiliser la validation existante si pas de suggestions
                                        $suggestion = $this->validateRelationAndGetSuggestion($idField, $value);
                                        if ($suggestion && !$suggestion['valid']) {
                                            $rowErrors[$nameField] = $suggestion['message'];
                                            if (!empty($suggestion['suggestions'])) {
                                                $suggestionsList = is_array($suggestion['suggestions']) 
                                                    ? $suggestion['suggestions'] 
                                                    : [$suggestion['suggestions']];
                                                $rowSuggestions[$nameField] = [
                                                    'value' => $suggestionsList,
                                                    'auto_applied' => false
                                                ];
                                            }
                                        }
                                    }
                                }
                            }
                        } else {
                            // Si valeur vide, proposer toutes les valeurs disponibles
                            $allSuggestions = $this->getAllSuggestionsForField($nameField);
                            if (!empty($allSuggestions)) {
                                $rowErrors[$nameField] = 'Valeur manquante';
                                $rowSuggestions[$nameField] = [
                                    'value' => $allSuggestions,
                                    'auto_applied' => false
                                ];
                            }
                        }
                    }
                }

                // Vérifier si la ligne a des suggestions auto-appliquées
                $hasAutoApplied = false;
                foreach ($rowSuggestions as $suggestion) {
                    if (isset($suggestion['auto_applied']) && $suggestion['auto_applied'] === true) {
                        $hasAutoApplied = true;
                        break;
                    }
                }

                // Ajouter TOUTES les lignes à all_rows_data pour le datatable éditable
                $allRowsData[] = [
                    'line' => $lineNumber,
                    'data' => $normalizedRow,
                    'errors' => $rowErrors,
                    'suggestions' => $rowSuggestions,
                    'has_auto_applied' => $hasAutoApplied,
                    'is_valid' => empty($rowErrors) // Indique si la ligne est valide
                ];

                // Si la ligne a des erreurs, l'ajouter au tableau des erreurs
                if (!empty($rowErrors)) {
                    $errorRows[] = [
                        'line' => $lineNumber,
                        'data' => $normalizedRow,
                        'errors' => $rowErrors,
                        'suggestions' => $rowSuggestions,
                        'has_auto_applied' => $hasAutoApplied
                    ];
                    $errors[] = [
                        'line' => $lineNumber,
                        'message' => implode(', ', array_values($rowErrors)),
                        'data' => $normalizedRow
                    ];
                } elseif ($hasAutoApplied) {
                    // Si seulement des suggestions auto-appliquées, les inclure pour affichage
                    $errorRows[] = [
                        'line' => $lineNumber,
                        'data' => $normalizedRow,
                        'errors' => [],
                        'suggestions' => $rowSuggestions,
                        'has_auto_applied' => true
                    ];
                    // Compter comme valide mais inclure dans errorRows pour affichage
                    $validRows++;
                } else {
                    // Ligne entièrement valide sans suggestions
                    $validRows++;
                }
            }

            return $this->successResponse([
                'valid' => empty($missingColumns) && empty($errors),
                'total_rows' => $totalRows,
                'valid_rows' => $validRows,
                'error_rows' => count($errors),
                'warnings_count' => count($warnings),
                'missing_columns' => $missingColumns,
                'errors' => $errors,
                'error_rows_data' => $errorRows, // Lignes avec erreurs pour le datatable (rétrocompatibilité)
                'all_rows_data' => $allRowsData, // TOUTES les lignes pour le datatable éditable
                'warnings' => $warnings,
                'headers' => $headers,
                'sample_data' => $sampleData
            ], 'Validation terminée');

        } catch (\Exception $e) {
            Log::error('Erreur lors de la validation du fichier: ' . $e->getMessage());
            return $this->errorResponse('Erreur lors de la validation: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Importer une liste d'étudiants et écrase l'ancienne importation pour l'établissement
     */
    public function importList($file, $etablissementId, $villeId)
    {
        try {
            DB::beginTransaction();

            // 1. SUPPRIMER tous les anciens étudiants de cet établissement
            AttendanceRapide::where('etablissement_id', $etablissementId)->delete();

            // 2. Parser le fichier
            $extension = strtolower($file->getClientOriginalExtension());
            $isExcel = in_array($extension, ['xlsx', 'xls']);
            
            $data = $isExcel ? $this->parseExcelFile($file->getRealPath()) : $this->parseCsvFile($file);

            if (empty($data)) {
                DB::rollBack();
                return $this->errorResponse('Le fichier est vide', 400);
            }

            // 3. Normaliser les en-têtes
            $headers = array_map(fn($h) => strtolower(trim($h)), array_keys($data[0]));

            // Colonnes requises
            $requiredColumns = ['matricule', 'first_name', 'last_name', 'promotion_name', 'group_title'];
            $missingColumns = array_diff($requiredColumns, $headers);

            if (!empty($missingColumns)) {
                DB::rollBack();
                return $this->errorResponse('Colonnes manquantes: ' . implode(', ', $missingColumns), 400);
            }

            // 4. Charger les données de référence pour la résolution
            $this->loadReferenceData();

            // 5. INSÉRER chaque ligne avec résolution des IDs
            $insertedCount = 0;
            $errors = [];

            foreach ($data as $index => $row) {
                $normalizedRow = [];
                foreach ($headers as $header) {
                    $normalizedRow[$header] = isset($row[$header]) ? trim($row[$header]) : '';
                }
                
                // Ignorer les lignes sans matricule
                if (empty($normalizedRow['matricule'])) {
                    continue;
                }

                // RÉSOUDRE LES IDs depuis les noms
                $promotionId = $this->resolveId('promotion', $normalizedRow['promotion_name']);
                $groupId = $this->resolveId('group', $normalizedRow['group_title']);
                $optionId = !empty($normalizedRow['option_name']) 
                    ? $this->resolveId('option', $normalizedRow['option_name']) 
                    : null;

                // Vérifier que les IDs ont été trouvés
                if (!$promotionId) {
                    $errors[] = "Ligne " . ($index + 2) . ": Promotion '{$normalizedRow['promotion_name']}' introuvable";
                    continue;
                }
                if (!$groupId) {
                    $errors[] = "Ligne " . ($index + 2) . ": Groupe '{$normalizedRow['group_title']}' introuvable";
                    continue;
                }
                
                AttendanceRapide::create([
                    'matricule' => $normalizedRow['matricule'],
                    'first_name' => $normalizedRow['first_name'],
                    'last_name' => $normalizedRow['last_name'],
                    'email' => $normalizedRow['email'] ?? null,
                    'promotion_id' => $promotionId,
                    'group_id' => $groupId,
                    'option_id' => $optionId,
                    'etablissement_id' => $etablissementId,
                    'ville_id' => $villeId
                ]);
                
                $insertedCount++;
            }

            if ($insertedCount === 0) {
                DB::rollBack();
                $errorMessage = !empty($errors) ? implode('; ', $errors) : 'Aucune donnée valide trouvée';
                return $this->errorResponse($errorMessage, 400);
            }

            DB::commit();

            $message = "Liste importée avec succès: $insertedCount étudiant(s)";
            if (!empty($errors)) {
                $message .= ". Erreurs: " . implode('; ', $errors);
            }

            return $this->successResponse([
                'total_students' => $insertedCount,
                'errors' => $errors
            ], $message);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Erreur import: ' . $e->getMessage());
            return $this->errorResponse('Erreur lors de l\'import: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Récupérer les données d'attendance rapide pour un établissement
     */
    public function getAttendanceRapide($etablissementId)
    {
        try {
            $attendanceRapide = AttendanceRapide::with(['etablissement', 'ville'])
                ->where('etablissement_id', $etablissementId)
                ->first();

            if (!$attendanceRapide) {
                return $this->errorResponse('Aucune importation trouvée pour cet établissement', 404);
            }

            return $this->successResponse($attendanceRapide, 'Données récupérées avec succès');
        } catch (\Exception $e) {
            Log::error('Erreur lors de la récupération attendance rapide: ' . $e->getMessage());
            return $this->errorResponse('Erreur lors de la récupération: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Récupérer les devices selon la ville
     */
    public function getDevicesForVille($villeId)
    {
        try {
            // Récupérer config Biostar
            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            
            if (is_object($configResult) && method_exists($configResult, 'getData')) {
                $errorData = $configResult->getData(true);
                return $this->errorResponse($errorData['message'] ?? 'Configuration Biostar non trouvée', 404);
            }
            
            $config = $configResult;
            if (!is_array($config) || !isset($config['dsn'])) {
                return $this->errorResponse('Configuration Biostar invalide', 404);
            }

            // Récupérer tous les devices
            $devices = $this->biostarAttendanceService->getDevices($config);

            return $this->successResponse([
                'devices' => $devices
            ], 'Devices récupérés avec succès');

        } catch (\Exception $e) {
            Log::error('Erreur getDevicesForVille: ' . $e->getMessage());
            return $this->errorResponse('Erreur: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Lancer la récupération des données Biostar et calculer les statuts
     */
    public function lancerRecuperation($etablissementId, $date, $heureDebut, $heureFin, $villeId, $allowedDeviceIds = null, $allowedDeviceNames = null)
    {
        try {
            // 1. Récupérer TOUS les étudiants de l'établissement (PAS de filtre date/heure)
            $students = AttendanceRapide::where('etablissement_id', $etablissementId)
                ->with(['promotion', 'group', 'option', 'etablissement', 'ville']) // Eager loading
                ->get();

            if ($students->isEmpty()) {
                return $this->errorResponse('Aucun étudiant importé. Veuillez d\'abord importer une liste.', 404);
            }

            // 2. Récupérer config Biostar
            $configResult = $this->configurationService->getConnectionConfigForVille($villeId);
            
            if (is_object($configResult) && method_exists($configResult, 'getData')) {
                $errorData = $configResult->getData(true);
                return $this->errorResponse($errorData['message'] ?? 'Configuration Biostar non trouvée', 404);
            }
            
            $config = $configResult;
            if (!is_array($config) || !isset($config['dsn'])) {
                return $this->errorResponse('Configuration Biostar invalide', 404);
            }

            // 3. Extraire matricules
            $matricules = $students->pluck('matricule')->filter()->toArray();

            if (empty($matricules)) {
                return $this->errorResponse('Aucun matricule valide', 400);
            }

            // 4. Interroger Biostar avec date/heure passées en paramètres ET devices
            $biostarData = $this->biostarAttendanceService->getAttendanceData(
                $config, $date, $heureDebut, $heureFin, $matricules, $allowedDeviceIds, $allowedDeviceNames
            );

            // 5. Index des présents
            $punchesByMatricule = [];
            
            if (isset($biostarData['punches']) && is_array($biostarData['punches'])) {
                foreach ($biostarData['punches'] as $punch) {
                    $matricule = $punch['user_id'] ?? $punch['bsevtc'] ?? null;
                    if ($matricule) {
                        $punchesByMatricule[$matricule][] = $punch;
                    }
                }
            }

            // 6. Construire résultats (SANS stocker dans la base)
            $presentCount = 0;
            $absentCount = 0;
            $results = [];

            foreach ($students as $student) {
                $isPresent = isset($punchesByMatricule[$student->matricule]) 
                          && count($punchesByMatricule[$student->matricule]) > 0;
                
                $results[] = [
                    'matricule' => $student->matricule,
                    'first_name' => $student->first_name,
                    'last_name' => $student->last_name,
                    'email' => $student->email,
                    'promotion_name' => $student->promotion->name ?? '',
                    'etablissement_name' => $student->etablissement->name ?? '',
                    'ville_name' => $student->ville->name ?? '',
                    'group_title' => $student->group->title ?? '',
                    'option_name' => $student->option->name ?? '',
                    'status' => $isPresent ? 'present' : 'absent',        // Calculé, pas stocké
                    'punches' => $punchesByMatricule[$student->matricule] ?? [] // Retourné, pas stocké
                ];

                $isPresent ? $presentCount++ : $absentCount++;
            }

            // 7. Retourner résultats (PAS de DB::commit car rien n'est stocké)
            return $this->successResponse([
                'students' => $results,
                'total_students' => count($results),
                'present_count' => $presentCount,
                'absent_count' => $absentCount,
                'etablissement_name' => $students->first()->etablissement->name ?? '',
                'ville_name' => $students->first()->ville->name ?? '',
                'date' => $date,
                'heure_debut' => $heureDebut,
                'heure_fin' => $heureFin
            ], 'Récupération Biostar terminée avec succès');

        } catch (\Exception $e) {
            Log::error('Erreur lancerRecuperation: ' . $e->getMessage());
            return $this->errorResponse('Erreur: ' . $e->getMessage(), 500);
        }
    }

    /**
     * Générer un fichier modèle CSV/Excel
     */
    public function generateTemplate($format = 'csv')
    {
        try {
            // En-têtes
            // Note: etablissement_name et ville_name ne sont plus inclus car ils viennent de la configuration
            $headers = [
                'matricule',
                'first_name',
                'last_name',
                'email',
                'promotion_name',
                'group_title',
                'option_name'
            ];

            // Exemple de données
            $exampleData = [
                ['MAT001', 'John', 'Doe', 'john.doe@example.com', 'L3', 'Groupe 1', 'Option 1'],
                ['MAT002', 'Jane', 'Smith', 'jane.smith@example.com', 'L3', 'Groupe 1', 'Option 1']
            ];

            if ($format === 'xlsx') {
                // Générer Excel avec PhpSpreadsheet
                if (!class_exists('\PhpOffice\PhpSpreadsheet\Spreadsheet')) {
                    throw new \Exception('PhpSpreadsheet n\'est pas installé. Veuillez exécuter: composer require phpoffice/phpspreadsheet');
                }

                $spreadsheet = new Spreadsheet();
                $sheet = $spreadsheet->getActiveSheet();

                // En-têtes
                $col = 'A';
                foreach ($headers as $header) {
                    $sheet->setCellValue($col . '1', $header);
                    $col++;
                }

                // Données d'exemple
                $row = 2;
                foreach ($exampleData as $data) {
                    $col = 'A';
                    foreach ($data as $value) {
                        $sheet->setCellValue($col . $row, $value);
                        $col++;
                    }
                    $row++;
                }

                // Générer le fichier temporaire
                $tempFile = tempnam(sys_get_temp_dir(), 'attendance_rapide_template_');
                $tempFile .= '.xlsx';
                
                $writer = new Xlsx($spreadsheet);
                $writer->save($tempFile);

                return [
                    'file_path' => $tempFile,
                    'filename' => 'attendance_rapide_template.xlsx',
                    'mime_type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                ];
            } else {
                // Générer CSV directement (plus fiable)
                $tempFile = tempnam(sys_get_temp_dir(), 'attendance_rapide_template_');
                $tempFile .= '.csv';
                
                $file = fopen($tempFile, 'w');
                
                // Ajouter BOM pour UTF-8 (pour que Excel reconnaisse les accents)
                fwrite($file, "\xEF\xBB\xBF");
                
                // Écrire les en-têtes
                fputcsv($file, $headers, ';');
                
                // Écrire les données d'exemple
                foreach ($exampleData as $row) {
                    fputcsv($file, $row, ';');
                }
                
                fclose($file);

                return [
                    'file_path' => $tempFile,
                    'filename' => 'attendance_rapide_template.csv',
                    'mime_type' => 'text/csv; charset=utf-8'
                ];
            }

        } catch (\Exception $e) {
            Log::error('Erreur lors de la génération du modèle: ' . $e->getMessage());
            throw $e;
        }
    }

    /**
     * Parser un fichier Excel
     */
    private function parseExcelFile($filePath)
    {
        try {
            if (class_exists('\PhpOffice\PhpSpreadsheet\IOFactory')) {
                $reader = \PhpOffice\PhpSpreadsheet\IOFactory::createReaderForFile($filePath);
                $reader->setReadDataOnly(true);
                $spreadsheet = $reader->load($filePath);
                $worksheet = $spreadsheet->getActiveSheet();
                
                $data = [];
                $highestRow = $worksheet->getHighestRow();
                $highestColumn = $worksheet->getHighestColumn();
                
                // Lire la première ligne pour les en-têtes
                $headers = [];
                for ($col = 'A'; $col <= $highestColumn; $col++) {
                    $cellValue = $worksheet->getCell($col . '1')->getCalculatedValue();
                    $headers[] = $cellValue ? strtolower(trim($cellValue)) : '';
                }
                
                // Lire les données
                for ($row = 2; $row <= $highestRow; $row++) {
                    $rowData = [];
                    for ($colIndex = 0; $colIndex < count($headers); $colIndex++) {
                        $col = $this->numberToColumn($colIndex + 1);
                        $cellValue = $worksheet->getCell($col . $row)->getCalculatedValue();
                        $rowData[$headers[$colIndex]] = $cellValue ?? '';
                    }
                    if (!empty(array_filter($rowData))) {
                        $data[] = $rowData;
                    }
                }
                
                return $data;
            }
            
            return [];
        } catch (\Exception $e) {
            Log::error('Erreur parseExcelFile: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Parser un fichier CSV
     */
    private function parseCsvFile($uploadedFile)
    {
        try {
            $path = is_string($uploadedFile) ? $uploadedFile : $uploadedFile->getRealPath();
            
            // Détecter l'encodage
            $content = file_get_contents($path);
            $encoding = mb_detect_encoding($content, ['UTF-8', 'ISO-8859-1', 'Windows-1252'], true);
            
            if ($encoding && $encoding !== 'UTF-8') {
                $content = mb_convert_encoding($content, 'UTF-8', $encoding);
                $tempPath = tempnam(sys_get_temp_dir(), 'csv_utf8_');
                file_put_contents($tempPath, $content);
                $path = $tempPath;
            }
            
            $handle = fopen($path, 'r');
            if ($handle === false) {
                return [];
            }
            
            // Détecter le délimiteur
            $firstLine = fgets($handle);
            $delimiter = $this->detectDelimiter($firstLine);
            rewind($handle);
            
            // Lire les en-têtes
            $headers = fgetcsv($handle, 0, $delimiter);
            if (!$headers) {
                fclose($handle);
                return [];
            }
            
            // Normaliser les en-têtes
            $headers = array_map(function($h) {
                return strtolower(trim($h));
            }, $headers);
            
            // Lire les données
            $data = [];
            while (($row = fgetcsv($handle, 0, $delimiter)) !== false) {
                if (empty(array_filter($row))) {
                    continue;
                }
                $rowData = array_combine($headers, array_pad($row, count($headers), ''));
                $data[] = $rowData;
            }
            
            fclose($handle);
            return $data;
            
        } catch (\Exception $e) {
            Log::error('Erreur parseCsvFile: ' . $e->getMessage());
            return [];
        }
    }

    /**
     * Détecter le délimiteur CSV
     */
    private function detectDelimiter($line)
    {
        $delimiters = [',', ';', "\t"];
        $counts = [];
        foreach ($delimiters as $delimiter) {
            $counts[$delimiter] = substr_count($line, $delimiter);
        }
        return array_search(max($counts), $counts) ?: ',';
    }

    /**
     * Convertir un numéro de colonne en lettre (1 -> A, 2 -> B, etc.)
     */
    private function numberToColumn($number)
    {
        $column = '';
        while ($number > 0) {
            $mod = ($number - 1) % 26;
            $column = chr(65 + $mod) . $column;
            $number = (int)(($number - $mod) / 26);
        }
        return $column;
    }

    /**
     * Valider une relation et obtenir des suggestions
     */
    private function validateRelationAndGetSuggestion($relation, $value)
    {
        $suggestions = [];
        
        switch ($relation) {
            case 'promotion_id':
                if (is_numeric($value)) {
                    $promotion = \App\Models\Promotion::find($value);
                    if ($promotion) {
                        return ['valid' => true];
                    }
                }
                $promotion = \App\Models\Promotion::where('name', 'like', '%' . $value . '%')->first();
                if ($promotion) {
                    return ['valid' => true];
                }
                $suggestions = $this->getPromotionSuggestions($value);
                return [
                    'valid' => false,
                    'message' => 'Promotion non trouvée: ' . $value,
                    'suggestions' => $suggestions
                ];
                
            case 'etablissement_id':
                if (is_numeric($value)) {
                    $etablissement = \App\Models\Etablissement::find($value);
                    if ($etablissement) {
                        return ['valid' => true];
                    }
                }
                $etablissement = \App\Models\Etablissement::where('name', 'like', '%' . $value . '%')->first();
                if ($etablissement) {
                    return ['valid' => true];
                }
                $suggestions = $this->getEtablissementSuggestions($value);
                return [
                    'valid' => false,
                    'message' => 'Établissement non trouvé: ' . $value,
                    'suggestions' => $suggestions
                ];
                
            case 'ville_id':
                if (is_numeric($value)) {
                    $ville = \App\Models\Ville::find($value);
                    if ($ville) {
                        return ['valid' => true];
                    }
                }
                $ville = \App\Models\Ville::where('name', 'like', '%' . $value . '%')->first();
                if ($ville) {
                    return ['valid' => true];
                }
                $suggestions = $this->getVilleSuggestions($value);
                return [
                    'valid' => false,
                    'message' => 'Ville non trouvée: ' . $value,
                    'suggestions' => $suggestions
                ];
                
            case 'group_id':
                if (is_numeric($value)) {
                    $group = \App\Models\Group::find($value);
                    if ($group) {
                        return ['valid' => true];
                    }
                }
                $group = \App\Models\Group::where('title', 'like', '%' . $value . '%')->first();
                if ($group) {
                    return ['valid' => true];
                }
                $suggestions = $this->getGroupSuggestions($value);
                return [
                    'valid' => false,
                    'message' => 'Groupe non trouvé: ' . $value,
                    'suggestions' => $suggestions
                ];
                
            case 'option_id':
                if (empty($value)) {
                    return ['valid' => true]; // Optionnel
                }
                if (is_numeric($value)) {
                    $option = \App\Models\Option::find($value);
                    if ($option) {
                        return ['valid' => true];
                    }
                }
                $option = \App\Models\Option::where('name', 'like', '%' . $value . '%')->first();
                if ($option) {
                    return ['valid' => true];
                }
                $suggestions = $this->getOptionSuggestions($value);
                return [
                    'valid' => false,
                    'message' => 'Option non trouvée: ' . $value,
                    'suggestions' => $suggestions
                ];
        }
        
        return ['valid' => true];
    }

    /**
     * Obtenir des suggestions de matricules
     */
    private function getMatriculeSuggestions($matricule)
    {
        if (empty($matricule)) {
            // Retourner quelques exemples de matricules
            $etudiants = \App\Models\Etudiant::limit(5)->get(['matricule', 'first_name', 'last_name']);
            $suggestions = [];
            foreach ($etudiants as $etudiant) {
                $suggestions[] = $etudiant->matricule . ' (' . $etudiant->first_name . ' ' . $etudiant->last_name . ')';
            }
            return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucun matricule trouvé';
        }
        
        // Chercher des matricules similaires
        $etudiants = \App\Models\Etudiant::where('matricule', 'like', '%' . $matricule . '%')
            ->limit(5)
            ->get(['matricule', 'first_name', 'last_name']);
        
        $suggestions = [];
        foreach ($etudiants as $etudiant) {
            $suggestions[] = $etudiant->matricule . ' (' . $etudiant->first_name . ' ' . $etudiant->last_name . ')';
        }
        
        return !empty($suggestions) ? implode(', ', $suggestions) : 'Aucun matricule similaire trouvé';
    }

    /**
     * Obtenir des suggestions pour les promotions (utilise les données préchargées)
     */
    private function getPromotionSuggestions($value)
    {
        $suggestions = [];
        $normalizedValue = $this->normalizeString($value);
        
        // Utiliser les données préchargées
        foreach ($this->promotions as $promotion) {
            $normalizedName = $this->normalizeString($promotion['name']);
            // Si correspondance partielle ou si valeur vide, inclure toutes les promotions
            if (empty($value) || 
                stripos($normalizedName, $normalizedValue) !== false || 
                stripos($normalizedValue, $normalizedName) !== false ||
                (preg_match('/^\d+/', $normalizedValue, $valueMatches) && 
                 preg_match('/^\d+/', $normalizedName, $promotionMatches) && 
                 $valueMatches[0] === $promotionMatches[0])) {
                $suggestions[] = $promotion['name'] . ' (ID: ' . $promotion['id'] . ')';
                if (count($suggestions) >= 10) {
                    break; // Limiter à 10 suggestions
                }
            }
        }
        
        // Si aucune correspondance et valeur non vide, retourner toutes les promotions (limitées)
        if (empty($suggestions) && !empty($value)) {
            foreach (array_slice($this->promotions, 0, 10) as $promotion) {
                $suggestions[] = $promotion['name'] . ' (ID: ' . $promotion['id'] . ')';
            }
        }
        
        return !empty($suggestions) ? $suggestions : [];
    }

    /**
     * Obtenir des suggestions pour les établissements (utilise les données préchargées)
     */
    private function getEtablissementSuggestions($value)
    {
        $suggestions = [];
        $normalizedValue = $this->normalizeString($value);
        
        // Utiliser les données préchargées
        foreach ($this->etablissements as $etablissement) {
            $normalizedName = $this->normalizeString($etablissement['name']);
            // Si correspondance partielle ou si valeur vide, inclure tous les établissements
            if (empty($value) || 
                stripos($normalizedName, $normalizedValue) !== false || 
                stripos($normalizedValue, $normalizedName) !== false) {
                $suggestions[] = $etablissement['name'] . ' (ID: ' . $etablissement['id'] . ')';
                if (count($suggestions) >= 10) {
                    break;
                }
            }
        }
        
        // Si aucune correspondance et valeur non vide, retourner tous les établissements
        if (empty($suggestions) && !empty($value)) {
            foreach ($this->etablissements as $etablissement) {
                $suggestions[] = $etablissement['name'] . ' (ID: ' . $etablissement['id'] . ')';
            }
        }
        
        return !empty($suggestions) ? $suggestions : [];
    }

    /**
     * Obtenir des suggestions pour les villes (utilise les données préchargées)
     */
    private function getVilleSuggestions($value)
    {
        $suggestions = [];
        $normalizedValue = $this->normalizeString($value);
        
        // Utiliser les données préchargées
        foreach ($this->villes as $ville) {
            $normalizedName = $this->normalizeString($ville['name']);
            // Si correspondance partielle ou si valeur vide, inclure toutes les villes
            if (empty($value) || 
                stripos($normalizedName, $normalizedValue) !== false || 
                stripos($normalizedValue, $normalizedName) !== false) {
                $suggestions[] = $ville['name'] . ' (ID: ' . $ville['id'] . ')';
                if (count($suggestions) >= 10) {
                    break;
                }
            }
        }
        
        // Si aucune correspondance et valeur non vide, retourner toutes les villes
        if (empty($suggestions) && !empty($value)) {
            foreach ($this->villes as $ville) {
                $suggestions[] = $ville['name'] . ' (ID: ' . $ville['id'] . ')';
            }
        }
        
        return !empty($suggestions) ? $suggestions : [];
    }

    /**
     * Obtenir des suggestions pour les groupes (utilise les données préchargées)
     */
    private function getGroupSuggestions($value)
    {
        $suggestions = [];
        $normalizedValue = $this->normalizeString($value);
        
        // Utiliser les données préchargées
        foreach ($this->groups as $group) {
            $normalizedTitle = $this->normalizeString($group['title']);
            // Si correspondance partielle ou si valeur vide, inclure tous les groupes
            if (empty($value) || 
                stripos($normalizedTitle, $normalizedValue) !== false || 
                stripos($normalizedValue, $normalizedTitle) !== false) {
                $suggestions[] = $group['title'] . ' (ID: ' . $group['id'] . ')';
                if (count($suggestions) >= 10) {
                    break;
                }
            }
        }
        
        // Si aucune correspondance et valeur non vide, retourner tous les groupes (limités)
        if (empty($suggestions) && !empty($value)) {
            foreach (array_slice($this->groups, 0, 10) as $group) {
                $suggestions[] = $group['title'] . ' (ID: ' . $group['id'] . ')';
            }
        }
        
        return !empty($suggestions) ? $suggestions : [];
    }

    /**
     * Obtenir des suggestions pour les options (utilise les données préchargées)
     */
    private function getOptionSuggestions($value)
    {
        $suggestions = [];
        $normalizedValue = $this->normalizeString($value);
        
        // Utiliser les données préchargées
        foreach ($this->options as $option) {
            $normalizedName = $this->normalizeString($option['name']);
            // Si correspondance partielle ou si valeur vide, inclure toutes les options
            if (empty($value) || 
                stripos($normalizedName, $normalizedValue) !== false || 
                stripos($normalizedValue, $normalizedName) !== false) {
                $suggestions[] = $option['name'] . ' (ID: ' . $option['id'] . ')';
                if (count($suggestions) >= 10) {
                    break;
                }
            }
        }
        
        // Si aucune correspondance et valeur non vide, retourner toutes les options
        if (empty($suggestions) && !empty($value)) {
            foreach ($this->options as $option) {
                $suggestions[] = $option['name'] . ' (ID: ' . $option['id'] . ')';
            }
        }
        
        return !empty($suggestions) ? $suggestions : [];
    }

    /**
     * Obtenir toutes les suggestions disponibles pour un champ (quand valeur vide)
     */
    private function getAllSuggestionsForField($field)
    {
        $suggestions = [];
        
        switch ($field) {
            // Note: ville_name et etablissement_name ne sont plus supportés car ils viennent de la configuration
            case 'group_title':
                foreach (array_slice($this->groups, 0, 20) as $group) {
                    $suggestions[] = $group['title'] . ' (ID: ' . $group['id'] . ')';
                }
                break;
                
            case 'option_name':
                foreach ($this->options as $option) {
                    $suggestions[] = $option['name'] . ' (ID: ' . $option['id'] . ')';
                }
                break;
                
            case 'promotion_name':
                foreach ($this->promotions as $promotion) {
                    $suggestions[] = $promotion['name'] . ' (ID: ' . $promotion['id'] . ')';
                }
                break;
        }
        
        return $suggestions;
    }
    
    /**
     * Formater une liste brute ("Libellé (ID: 1)") en suggestions structurées
     */
    private function normalizeRawSuggestionList($rawSuggestions)
    {
        $formatted = [];
        
        foreach ($rawSuggestions as $entry) {
            $label = trim(preg_replace('/\(ID:.*/', '', $entry));
            $id = null;
            
            if (preg_match('/\(ID:\s*(\d+)\)/i', $entry, $matches)) {
                $id = (int) $matches[1];
            }
            
            if ($label !== '') {
                $formatted[] = [
                    'label' => $label,
                    'id' => $id,
                    'score' => 0
                ];
            }
        }
        
        return $formatted;
    }
    
    /**
     * Garantir que les suggestions retournées par le scoring ont la structure attendue
     */
    private function formatScoredSuggestions($suggestions)
    {
        if (empty($suggestions) || !is_array($suggestions)) {
            return [];
        }
        
        return array_map(function ($item) {
            if (isset($item['label'])) {
                return [
                    'label' => $item['label'],
                    'id' => $item['id'] ?? null,
                    'score' => $item['score'] ?? 0
                ];
            }
            
            $label = $item['name'] ?? $item['title'] ?? (string) ($item['entry']['name'] ?? $item['entry']['title'] ?? '');
            
            return [
                'label' => $label,
                'id' => $item['id'] ?? ($item['entry']['id'] ?? null),
                'score' => $item['score'] ?? 0
            ];
        }, $suggestions);
    }
}

