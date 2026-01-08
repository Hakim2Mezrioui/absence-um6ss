<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote')->hourly();

// Planifier la création automatique des absences
Schedule::command('absences:auto-create --hours=1 --type=both')
    ->hourly()
    ->withoutOverlapping()
    ->onOneServer();
