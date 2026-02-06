<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use App\Scopes\EnseignantUserContextScope;

class Enseignant extends Model
{
    protected $fillable = [
        'user_id',
        'statut',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cours(): BelongsToMany
    {
        return $this->belongsToMany(Cours::class, 'cours_enseignant');
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new EnseignantUserContextScope);
    }
}


