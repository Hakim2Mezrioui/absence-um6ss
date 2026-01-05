<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Scopes\UserContextScope;

class Salle extends Model
{
    protected $fillable = ['name', 'etage', 'batiment', 'capacite', 'description', 'ville_id', 'devices'];

    protected $casts = [
        'devices' => 'array',
    ];

    public function ville()
    {
        return $this->belongsTo(Ville::class);
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
