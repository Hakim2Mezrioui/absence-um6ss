<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Etudiant extends Model
{
    use HasFactory;
    
    protected $primaryKey = 'matricule';
    public $incrementing = false; // Si 'matricule' n'est pas auto-incrémenté
    protected $keyType = 'string';

    protected $fillable = [
        "matricule",
        "name",
        "promotion",
        "faculte",
    ];
}
