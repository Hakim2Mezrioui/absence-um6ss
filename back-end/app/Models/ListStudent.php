<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ListStudent extends Model
{
    protected $table = 'list_students';

    protected $fillable = [
        'etudiant_id',
        'rattrapage_id'
    ];

    /**
     * Relation avec l'étudiant
     */
    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class, 'etudiant_id');
    }

    /**
     * Relation avec le rattrapage
     */
    public function rattrapage(): BelongsTo
    {
        return $this->belongsTo(Rattrapage::class);
    }
}
