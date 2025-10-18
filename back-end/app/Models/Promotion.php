<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Scopes\UserContextScope;

class Promotion extends Model
{
    protected $fillable = ['name'];

    /**
     * Get the students that belong to this promotion.
     */
    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class);
    }

    /**
     * Get the etablissement that owns this promotion.
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Get the faculte that owns this promotion.
     */
    public function faculte(): BelongsTo
    {
        return $this->belongsTo(Faculte::class);
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
