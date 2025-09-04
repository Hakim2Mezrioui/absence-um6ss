<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Etablissement extends Model
{
    protected $fillable = ['name', 'ville_id'];
    
    public function ville()
    {
        return $this->belongsTo(Ville::class);
    }
}
