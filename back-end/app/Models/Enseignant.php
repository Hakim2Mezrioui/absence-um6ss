<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Enseignant extends Model
{
    protected $fillable = [
        'user_id',
        'ville_id',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    public function cours(): BelongsToMany
    {
        return $this->belongsToMany(Cours::class, 'cours_enseignant');
    }
}


