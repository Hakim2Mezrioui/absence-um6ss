<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class UserContextScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Block access when no authenticated user
        if (!Auth::check()) {
            $builder->whereRaw('1 = 0'); // This will return no results
            return;
        }

        $user = Auth::user();
        if (!$user) {
            return;
        }

        $table = $model->getTable();

        // Skip filtering for super-admin users (role_id = 1 or role = 'super-admin')
        if ($user->role_id == 1 || $user->role === 'super-admin') {
            return;
        }

        // Skip filtering for groups table since groups are now global
        if ($table === 'groups') {
            return;
        }

        // Exception pour technicien (role_id = 5) sans établissement : voir tous les examens/cours
        // Si le technicien n'a pas d'établissement, il peut voir tous les examens et cours de toutes les villes et établissements
        if ($user->role_id == 5 && is_null($user->etablissement_id)) {
            // Ne pas appliquer de filtres pour les techniciens sans établissement
            return;
        }

        // Apply ville filter if user has a ville
        if (!is_null($user->ville_id)) {
            if (Schema::hasColumn($table, 'ville_id')) {
                $builder->where($table . '.ville_id', $user->ville_id);
            }
            // Note: Groups are now global, so we don't filter by ville_id through groups anymore
        }

        // Apply etablissement filter if user has one
        if (!is_null($user->etablissement_id)) {
            if (Schema::hasColumn($table, 'etablissement_id')) {
                $builder->where($table . '.etablissement_id', $user->etablissement_id);
            }
            // Note: Groups are now global, so we don't filter by etablissement_id through groups anymore
        }
    }
}


