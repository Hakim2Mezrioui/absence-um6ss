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
} 