<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class TypeCours extends Model
{
    protected $table = 'types_cours';
    
    protected $fillable = ['name'];

    /**
     * Get the courses that belong to this type.
     */
    public function cours(): HasMany
    {
        return $this->hasMany(Cours::class, 'type_cours_id');
    }
}
