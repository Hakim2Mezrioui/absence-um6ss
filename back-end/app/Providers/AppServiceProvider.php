<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use App\Models\Examen;
use App\Models\Cours;
use App\Observers\ExamenObserver;
use App\Observers\CoursObserver;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Enregistrer les observers pour la création automatique des absences
        Examen::observe(ExamenObserver::class);
        Cours::observe(CoursObserver::class);
    }
}
