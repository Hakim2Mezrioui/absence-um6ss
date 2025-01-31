<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Rattrapage extends Model
{
    protected $fillable = [
        "matricule",
        "name",
        "promotion",
        "faculte",
    ];
}
