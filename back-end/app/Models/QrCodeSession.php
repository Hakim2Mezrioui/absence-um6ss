<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class QrCodeSession extends Model
{
    protected $table = 'qr_code_sessions';

    protected $fillable = [
        'cours_id',
        'examen_id',
        'token',
        'expires_at',
        'created_by_user_id',
    ];

    protected $casts = [
        'expires_at' => 'datetime',
    ];

    public function cours(): BelongsTo
    {
        return $this->belongsTo(Cours::class);
    }

    public function examen(): BelongsTo
    {
        return $this->belongsTo(Examen::class);
    }

    public function scans(): HasMany
    {
        return $this->hasMany(QrCodeScan::class, 'qr_code_session_id');
    }

    public function isExpired(): bool
    {
        return $this->expires_at instanceof Carbon
            ? $this->expires_at->isPast()
            : Carbon::parse($this->expires_at)->isPast();
    }
}


