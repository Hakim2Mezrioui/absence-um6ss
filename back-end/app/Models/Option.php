<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Option extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'description',
        'etablissement_id'
    ];

    /**
     * Relation one-to-many avec Etudiant
     * Une option peut avoir plusieurs étudiants
     */
    public function etudiants(): HasMany
    {
        return $this->hasMany(Etudiant::class);
    }

    /**
     * Relation many-to-one avec Etablissement
     * Une option appartient à un établissement
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Relation one-to-many avec Cours
     * Une option peut avoir plusieurs cours
     */
    public function cours(): HasMany
    {
        return $this->hasMany(Cours::class);
    }
} 