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
        'option_id',
        'statut_temporel'
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
     * Détermine si le cours est en cours (date d'aujourd'hui et heure actuelle entre début et fin)
     */
    public function isEnCours(): bool
    {
        $now = Carbon::now();
        $coursDate = Carbon::parse($this->date);
        $heureDebut = Carbon::parse($this->heure_debut);
        $heureFin = Carbon::parse($this->heure_fin);

        return $now->isSameDay($coursDate) && 
               $now->between($heureDebut, $heureFin);
    }

    /**
     * Détermine si le cours est en passe (date passée ou date d'aujourd'hui mais heure fin dépassée)
     */
    public function isEnPasse(): bool
    {
        $now = Carbon::now();
        $coursDate = Carbon::parse($this->date);
        $heureFin = Carbon::parse($this->heure_fin);

        return $now->isAfter($coursDate) || 
               ($now->isSameDay($coursDate) && $now->isAfter($heureFin));
    }

    /**
     * Détermine si le cours est futur (date future ou date d'aujourd'hui mais heure début pas encore atteinte)
     */
    public function isFutur(): bool
    {
        $now = Carbon::now();
        $coursDate = Carbon::parse($this->date);
        $heureDebut = Carbon::parse($this->heure_debut);

        return $now->isBefore($coursDate) || 
               ($now->isSameDay($coursDate) && $now->isBefore($heureDebut));
    }

    /**
     * Retourne le statut temporel du cours
     */
    public function getStatutTemporel(): string
    {
        if ($this->isEnCours()) {
            return 'en_cours';
        } elseif ($this->isEnPasse()) {
            return 'en_passe';
        } else {
            return 'futur';
        }
    }
}
