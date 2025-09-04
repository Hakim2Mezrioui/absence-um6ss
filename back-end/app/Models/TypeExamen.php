<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TypeExamen extends Model
{
    protected $table = 'types_examen';
    
    protected $fillable = ['name'];

    /**
     * Relation avec les examens
     */
    public function examens(): HasMany
    {
        return $this->hasMany(Examen::class, 'type_examen_id');
    }
}
