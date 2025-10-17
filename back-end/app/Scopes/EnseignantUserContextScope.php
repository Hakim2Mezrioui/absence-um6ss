<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class EnseignantUserContextScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        // Skip in console (migrations/seeders) or when no authenticated user
        if (app()->runningInConsole() || !Auth::check()) {
            return;
        }

        $user = Auth::user();
        if (!$user) {
            return;
        }

        $table = $model->getTable();

        // Always enforce ville filter if user has a ville
        if (!is_null($user->ville_id)) {
            if (Schema::hasColumn($table, 'ville_id')) {
                $builder->where($table . '.ville_id', $user->ville_id);
            } else {
                // For enseignants, filter via user relation
                $builder->whereHas('user', function (Builder $q) use ($user) {
                    $q->where('ville_id', $user->ville_id);
                });
            }
        }

        // Enforce etablissement filter only if user has one
        if (!is_null($user->etablissement_id)) {
            // For enseignants, filter via user relation since enseignant doesn't have etablissement_id directly
            $builder->whereHas('user', function (Builder $q) use ($user) {
                $q->where('etablissement_id', $user->etablissement_id);
            });
        }
    }
}


