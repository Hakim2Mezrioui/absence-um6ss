<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Scopes\UserContextScope;

class Etudiant extends Model
{
    use HasFactory;
    
    // protected $primaryKey = 'matricule'; // Commenté pour utiliser 'id' par défaut
    // public $incrementing = false; // Commenté pour permettre l'auto-incrémentation
    // protected $keyType = 'string'; // Commenté car 'id' est un entier
    
    protected $fillable = [
        "matricule",
        "first_name",
        "last_name",
        "email",
        "password",
        "photo",
        "promotion_id",
        "etablissement_id",
        "ville_id",
        "group_id",
        "option_id", // Optionnel - toutes les écoles n'utilisent pas les options
    ];

    /**
     * Get the promotion that owns the etudiant.
     */
    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    /**
     * Get the etablissement that owns the etudiant.
     */
    public function etablissement(): BelongsTo
    {
        return $this->belongsTo(Etablissement::class);
    }

    /**
     * Get the ville that owns the etudiant.
     */
    public function ville(): BelongsTo
    {
        return $this->belongsTo(Ville::class);
    }

    /**
     * Get the group that owns the etudiant.
     */
    public function group(): BelongsTo
    {
        return $this->belongsTo(Group::class);
    }

    /**
     * Get the option that owns the etudiant.
     */
    public function option(): BelongsTo
    {
        return $this->belongsTo(Option::class);
    }

    /**
     * Get the full name of the etudiant.
     */
    public function getFullNameAttribute(): string
    {
        return $this->first_name . ' ' . $this->last_name;
    }

    protected static function booted(): void
    {
        static::addGlobalScope(new UserContextScope);
    }
}
