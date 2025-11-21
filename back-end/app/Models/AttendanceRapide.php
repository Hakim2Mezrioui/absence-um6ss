<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AttendanceRapide extends Model
{
    protected $table = 'attendance_rapide';

    protected $fillable = [
        'matricule',
        'first_name',
        'last_name',
        'email',
        'promotion_id',
        'group_id',
        'option_id',
        'etablissement_id',
        'ville_id'
    ];

    protected $casts = [
        // Pas de casts nécessaires
    ];

    /**
     * Get the promotion that owns the attendance rapide.
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * Get the group that owns the attendance rapide.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Get the option that owns the attendance rapide.
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(Option::class);
    }

    /**
     * Get the etablissement that owns the attendance rapide.
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Get the ville that owns the attendance rapide.
     */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }
}

