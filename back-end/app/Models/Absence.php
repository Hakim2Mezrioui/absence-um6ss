<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\Traits\LogsActivity;
use Spatie\Activitylog\LogOptions;

class Absence extends Model
{
    use LogsActivity;
    
    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logOnly(['type_absence', 'justifiee', 'motif', 'date_absence', 'etudiant_id', 'cours_id', 'examen_id'])
            ->logOnlyDirty()
            ->dontSubmitEmptyLogs();
    }
    protected $fillable = [
        'type_absence',
        'etudiant_id',
        'cours_id',
        'examen_id',
        'date_absence',
        'justifiee',
        'motif',
        'justificatif'
    ];

    protected $casts = [
        'date_absence' => 'date',
        'justifiee' => 'boolean',
    ];

    /**
     * Get the student that owns the absence.
     */
    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class);
    }

    /**
     * Get the course related to the absence.
     */
    public function cours(): BelongsTo
    {
        return $this->belongsTo(Cours::class);
    }

    /**
     * Get the exam related to the absence.
     */
    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }
}
