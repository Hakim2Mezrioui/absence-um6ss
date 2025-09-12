<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Rattrapage extends Model
{
    protected $fillable = [
        'name',
        'pointage_start_hour',
        'start_hour',
        'end_hour',
        'date',
        'tolerance'
    ];

    protected $casts = [
        'pointage_start_hour' => 'datetime:H:i',
        'start_hour' => 'datetime:H:i',
        'end_hour' => 'datetime:H:i',
        'date' => 'date',
        'tolerance' => 'integer'
    ];

    /**
     * Relation avec les étudiants de la liste
     */
    public function listStudents(): HasMany
    {
        return $this->hasMany(ListStudent::class);
    }

    /**
     * Accesseur pour formater l'heure de pointage
     */
    protected function pointageStartHour(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i') : null,
            set: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i:s') : null
        );
    }

    /**
     * Accesseur pour formater l'heure de début
     */
    protected function startHour(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i') : null,
            set: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i:s') : null
        );
    }

    /**
     * Accesseur pour formater l'heure de fin
     */
    protected function endHour(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i') : null,
            set: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('H:i:s') : null
        );
    }

    /**
     * Accesseur pour formater la date
     */
    protected function date(): Attribute
    {
        return Attribute::make(
            get: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : null,
            set: fn ($value) => $value ? \Carbon\Carbon::parse($value)->format('Y-m-d') : null
        );
    }

    /**
     * Vérifier s'il y a un conflit d'horaires avec un autre rattrapage
     */
    public function hasTimeConflict(Rattrapage $other): bool
    {
        if ($this->date != $other->date) {
            return false;
        }

        $thisStart = \Carbon\Carbon::parse($this->start_hour);
        $thisEnd = \Carbon\Carbon::parse($this->end_hour);
        $otherStart = \Carbon\Carbon::parse($other->start_hour);
        $otherEnd = \Carbon\Carbon::parse($other->end_hour);

        return $thisStart < $otherEnd && $thisEnd > $otherStart;
    }

    /**
     * Obtenir la durée du rattrapage en minutes
     */
    public function getDurationInMinutes(): int
    {
        $start = \Carbon\Carbon::parse($this->start_hour);
        $end = \Carbon\Carbon::parse($this->end_hour);
        
        return $start->diffInMinutes($end);
    }

    /**
     * Obtenir la durée du rattrapage formatée
     */
    public function getDurationFormatted(): string
    {
        $minutes = $this->getDurationInMinutes();
        $hours = intval($minutes / 60);
        $remainingMinutes = $minutes % 60;
        
        if ($hours > 0) {
            return "{$hours}h {$remainingMinutes}min";
        }
        
        return "{$remainingMinutes}min";
    }
}
