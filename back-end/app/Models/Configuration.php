<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Configuration extends Model
{
    use HasFactory;
    
    // Explicit table name because migration created `configuration`
    protected $table = 'configuration';

    protected $fillable = [
        'sqlsrv',
        'database',
        'trustServerCertificate',
        'biostar_username',
        'biostar_password',
        'ville_id'
    ];

    protected $hidden = [
        'biostar_password'
    ];

    public function ville()
    {
        return $this->belongsTo(Ville::class);
    }
}
