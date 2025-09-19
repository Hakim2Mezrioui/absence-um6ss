<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;

abstract class BaseService
{
    protected $model;

    public function __construct($model)
    {
        if (is_string($model)) {
            // Si c'est une chaîne de classe, créer une instance
            $this->model = new $model();
        } elseif ($model instanceof Model) {
            // Si c'est déjà une instance de Model
            $this->model = $model;
        } else {
            throw new \InvalidArgumentException('Le paramètre doit être soit une chaîne de classe soit une instance de Model');
        }
    }

    // Méthodes de base communes
    
    /**
     * Return a success response
     */
    protected function successResponse($data = null, $message = 'Success', $statusCode = 200)
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }
    
    /**
     * Return an error response
     */
    protected function errorResponse($message = 'Error', $statusCode = 400, $data = null)
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => $data
        ], $statusCode);
    }
} 