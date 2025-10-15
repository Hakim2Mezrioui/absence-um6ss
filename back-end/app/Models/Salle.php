<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Scopes\UserContextScope;

class Salle extends Model
{
    protected $fillable = ['name', 'etage', 'batiment', 'etablissement_id', 'capacite', 'description'];
    
    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
