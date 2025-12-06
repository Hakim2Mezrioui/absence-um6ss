<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QrCodeScan extends Model
{
    protected $table = 'qr_code_scans';

    protected $fillable = [
        'qr_code_session_id',
        'etudiant_id',
        'scanned_at',
        'status',
        'meta',
    ];

    protected $casts = [
        'scanned_at' => 'datetime',
        'meta' => 'array',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(QrCodeSession::class, 'qr_code_session_id');
    }

    public function etudiant(): BelongsTo
    {
        return $this->belongsTo(Etudiant::class, 'etudiant_id');
    }
}


