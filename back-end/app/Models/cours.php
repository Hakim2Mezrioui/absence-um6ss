<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

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
        'option_id'
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

}
