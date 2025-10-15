<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Carbon\Carbon;
use App\Scopes\UserContextScope;

class Cours extends Model
{
    protected $fillable = [
        'name',
        'date',
        'pointage_start_hour',
        'heure_debut',
        'heure_fin',
        'tolerance',
        'annee_universitaire',
        'etablissement_id',
        'promotion_id',
        'type_cours_id',
        'salle_id',
        'option_id',
        'ville_id'
    ];

    protected $casts = [
        'date' => 'date',
        'pointage_start_hour' => 'datetime:H:i',
        'heure_debut' => 'datetime:H:i',
        'heure_fin' => 'datetime:H:i',
        'tolerance' => 'datetime:H:i',
    ];

    /**
     * Get the etablissement that owns the cours.
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Get the promotion that owns the cours.
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * Get the typeCours that owns the cours.
     */
    public function type_cours(): BelongsTo
    {
        return $this->belongsTo(TypeCours::class);
    }

    /**
     * Get the salle that owns the cours.
     */
    public function salle(): BelongsTo
    {
        return $this->belongsTo(Salle::class);
    }

    /**
     * Get the option that owns the cours.
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(Option::class);
    }

    /**
     * Get the groups that belong to the cours.
     */
    public function groups(): BelongsToMany
    {
        return $this->belongsToMany(Group::class, 'cours_groups');
    }

    /**
     * Get the enseignants that belong to the cours.
     */
    public function enseignants(): BelongsToMany
    {
        return $this->belongsToMany(Enseignant::class, 'cours_enseignant');
    }

    /**
     * Get the ville that owns the cours.
     */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
