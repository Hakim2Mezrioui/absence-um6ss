<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Examen extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'date', 'heure_debut', 'heure_fin', 'annee_universitaire', 'option_id', 'salle_id', 'promotion_id', 'type_examen_id', 'etablissement_id', 'group_id', 'ville_id'];

    protected $casts = [
        'date' => 'date',
        'heure_debut' => 'datetime',
        'heure_fin' => 'datetime',
    ];

    // Relations
    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }

    public function promotion()
    {
        return $this->belongsTo(Promotion::class);
    }

    public function typeExamen()
    {
        return $this->belongsTo(TypeExamen::class);
    }

    public function salle()
    {
        return $this->belongsTo(Salle::class);
    }

    public function option()
    {
        return $this->belongsTo(Option::class);
    }

    public function group()
    {
        return $this->belongsTo(Group::class);
    }

    public function ville()
    {
        return $this->belongsTo(Ville::class);
    }

    /**
     * Détermine si l'examen est en cours (date d'aujourd'hui et heure actuelle entre début et fin)
     */
    public function isEnCours(): bool
    {
        $now = Carbon::now();
        $examenDate = Carbon::parse($this->date);
        $heureDebut = Carbon::parse($this->heure_debut);
        $heureFin = Carbon::parse($this->heure_fin);

        return $now->isSameDay($examenDate) && 
               $now->between($heureDebut, $heureFin);
    }

    /**
     * Détermine si l'examen est en passe (date passée ou date d'aujourd'hui mais heure fin dépassée)
     */
    public function isEnPasse(): bool
    {
        $now = Carbon::now();
        $examenDate = Carbon::parse($this->date);
        $heureFin = Carbon::parse($this->heure_fin);

        return $now->isAfter($examenDate) || 
               ($now->isSameDay($examenDate) && $now->isAfter($heureFin));
    }

    /**
     * Détermine si l'examen est futur (date future ou date d'aujourd'hui mais heure début pas encore atteinte)
     */
    public function isFutur(): bool
    {
        $now = Carbon::now();
        $examenDate = Carbon::parse($this->date);
        $heureDebut = Carbon::parse($this->heure_debut);

        return $now->isBefore($examenDate) || 
               ($now->isSameDay($examenDate) && $now->isBefore($heureDebut));
    }

    /**
     * Retourne le statut temporel de l'examen
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