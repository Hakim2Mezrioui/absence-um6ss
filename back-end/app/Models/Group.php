<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Scopes\UserContextScope;

class Group extends Model
{
    protected $fillable = [
        'title'
    ];

    /**
     * Get the etudiants for the group.
     */
    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class);
    }

    /**
     * Get the cours that belong to the group.
     */
    public function cours(): BelongsToMany
    {
        return $this->belongsToMany(Cours::class, 'cours_groups');
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
