<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Salle extends Model
{
    protected $fillable = ['name', 'etage', 'batiment', 'etablissement_id'];
    
    public function etablissement()
    {
        return $this->belongsTo(Etablissement::class);
    }
}
