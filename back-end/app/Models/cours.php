<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class cours extends Model
{
    protected $fillable = [
        'title',
        'date',
        'hour_debut',
        'hour_fin',
        'faculte',
        'groupe',
        'promotion',
        'option',
        'tolerance'
    ];
}
