<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;
use App\Scopes\UserContextScope;

class Examen extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'date', 'heure_debut', 'heure_fin', 'heure_debut_poigntage', 'annee_universitaire', 'tolerance', 'option_id', 'salle_id', 'promotion_id', 'type_examen_id', 'etablissement_id', 'group_id', 'ville_id', 'archived_at'];

    protected $casts = [
        'date' => 'date',
        // Garder les heures en chaîne pour éviter des dates implicites
        'archived_at' => 'datetime',
    ];

    // Accessors pour formater les heures
    public function getHeureDebutAttribute($value)
    {
        if ($value) {
            return \Carbon\Carbon::parse($value)->format('H:i:s');
        }
        return $value;
    }

    public function getHeureFinAttribute($value)
    {
        if ($value) {
            return \Carbon\Carbon::parse($value)->format('H:i:s');
        }
        return $value;
    }

    public function getHeureDebutPoigntageAttribute($value)
    {
        if ($value) {
            return \Carbon\Carbon::parse($value)->format('H:i:s');
        }
        return $value;
    }

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

    public function salles()
    {
        return $this->belongsToMany(Salle::class, 'examen_salle');
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
        $tz = 'Africa/Casablanca';
        $now = Carbon::now($tz);
        $dateString = $this->date instanceof Carbon ? $this->date->format('Y-m-d') : (string) $this->date;
        $debut = Carbon::createFromFormat('Y-m-d H:i:s', $dateString . ' ' . $this->heure_debut, $tz);
        $fin = Carbon::createFromFormat('Y-m-d H:i:s', $dateString . ' ' . $this->heure_fin, $tz);

        return $now->greaterThanOrEqualTo($debut) && $now->lessThan($fin);
    }

    /**
     * Détermine si l'examen est en passe (date passée ou date d'aujourd'hui mais heure fin dépassée)
     */
    public function isEnPasse(): bool
    {
        $tz = 'Africa/Casablanca';
        $now = Carbon::now($tz);
        $dateString = $this->date instanceof Carbon ? $this->date->format('Y-m-d') : (string) $this->date;
        $fin = Carbon::createFromFormat('Y-m-d H:i:s', $dateString . ' ' . $this->heure_fin, $tz);

        return $now->greaterThan($fin);
    }

    /**
     * Détermine si l'examen est futur (date future ou date d'aujourd'hui mais heure début pas encore atteinte)
     */
    public function isFutur(): bool
    {
        $tz = 'Africa/Casablanca';
        $now = Carbon::now($tz);
        $dateString = $this->date instanceof Carbon ? $this->date->format('Y-m-d') : (string) $this->date;
        $debut = Carbon::createFromFormat('Y-m-d H:i:s', $dateString . ' ' . $this->heure_debut, $tz);

        return $now->lessThan($debut);
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

    /**
     * Retourne l'heure limite avec la tolérance (heure de début + tolérance)
     */
    public function getHeureLimiteAvecTolerance(): Carbon
    {
        $heureDebut = Carbon::parse($this->date . ' ' . $this->heure_debut);
        return $heureDebut->addMinutes($this->tolerance ?? 15);
    }

    /**
     * Vérifie si un étudiant est en retard (arrivé après l'heure limite avec tolérance)
     */
    public function isRetard(Carbon $heureArrivee): bool
    {
        $heureLimite = $this->getHeureLimiteAvecTolerance();
        return $heureArrivee->isAfter($heureLimite);
    }

    /**
     * Retourne le nombre de minutes de retard d'un étudiant
     */
    public function getMinutesRetard(Carbon $heureArrivee): int
    {
        if (!$this->isRetard($heureArrivee)) {
            return 0;
        }
        
        $heureLimite = $this->getHeureLimiteAvecTolerance();
        return $heureArrivee->diffInMinutes($heureLimite);
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}