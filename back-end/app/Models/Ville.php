<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Ville extends Model
{
    protected $fillable = ['name'];

    /**
     * Get the etudiants for the ville.
     */
    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class);
    }

    /**
     * Get the groups for the ville.
     */
    public function groups(): HasMany
    {
        return $this->hasMany(Group::class);
    }

    // Relation vers etablissements supprimée: plus de FK ville_id sur etablissements
}
