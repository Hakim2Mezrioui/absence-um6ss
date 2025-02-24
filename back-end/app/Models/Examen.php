<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Examen extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'date', 'hour_debut', 'hour_fin', 'hour_debut_pointage', 'faculte', 'promotion', 'statut', 'option'];
}