<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Group extends Model
{
    protected $fillable = [
        'title',
        'promotion_id',
        'etablissement_id',
        'ville_id'
    ];

    /**
     * Get the promotion that owns the group.
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * Get the etablissement that owns the group.
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Get the ville that owns the group.
     */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    /**
     * Get the etudiants for the group.
     */
    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class);
    }
}
