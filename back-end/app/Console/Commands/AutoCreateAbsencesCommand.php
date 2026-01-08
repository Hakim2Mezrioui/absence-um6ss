<?php

namespace App\Console\Commands;

use App\Models\Examen;
use App\Models\Cours;
use App\Services\AbsenceAutoService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AutoCreateAbsencesCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'absences:auto-create 
                            {--hours=1 : Nombre d\'heures après la fin pour créer les absences}
                            {--date= : Date spécifique (YYYY-MM-DD)}
                            {--type=both : Type (cours, examen, both)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Créer automatiquement les absences pour les examens/cours terminés';

    /**
     * Execute the console command.
     */
    public function handle(AbsenceAutoService $absenceAutoService)
    {
        $hours = (int) $this->option('hours');
        $dateOption = $this->option('date');
        $type = $this->option('type');
        
        $cutoffTime = Carbon::now()->subHours($hours);
        
        if ($dateOption) {
            $this->info("Traitement des examens/cours pour la date: {$dateOption}");
            $this->processForDate($absenceAutoService, $dateOption, $type);
        } else {
            $this->info("Recherche des examens/cours terminés depuis {$hours} heure(s)...");
            $this->processFinished($absenceAutoService, $cutoffTime, $type);
        }
    }

    /**
     * Traiter les examens/cours terminés
     */
    private function processFinished(AbsenceAutoService $absenceAutoService, Carbon $cutoffTime, string $type)
    {
        $totalCreated = 0;
        $totalUpdated = 0;

        // Traiter les examens
        if ($type === 'examen' || $type === 'both') {
            $examens = Examen::where('date', '<=', Carbon::now()->format('Y-m-d'))
                ->where(function($query) use ($cutoffTime) {
                    $query->whereRaw("CONCAT(date, ' ', heure_fin) <= ?", [$cutoffTime->format('Y-m-d H:i:s')]);
                })
                ->get();

            $this->info("Trouvé {$examens->count()} examen(s) terminé(s)");

            foreach ($examens as $examen) {
                $this->info("Traitement examen ID: {$examen->id} - {$examen->title}");
                $result = $absenceAutoService->createAbsencesForExamen($examen->id);
                
                if ($result['success']) {
                    $created = $result['statistiques']['absences_creees'] ?? 0;
                    $totalCreated += $created;
                    $this->info("  ✓ {$created} absence(s) créée(s)");
                } else {
                    $this->error("  ✗ Erreur: {$result['message']}");
                }
            }
        }

        // Traiter les cours
        if ($type === 'cours' || $type === 'both') {
            $cours = Cours::withoutGlobalScopes()
                ->where('date', '<=', Carbon::now()->format('Y-m-d'))
                ->where(function($query) use ($cutoffTime) {
                    $query->whereRaw("CONCAT(date, ' ', heure_fin) <= ?", [$cutoffTime->format('Y-m-d H:i:s')]);
                })
                ->get();

            $this->info("Trouvé {$cours->count()} cours terminé(s)");

            foreach ($cours as $c) {
                $this->info("Traitement cours ID: {$c->id} - {$c->name}");
                $result = $absenceAutoService->createAbsencesForCours($c->id);
                
                if ($result['success']) {
                    $created = $result['statistiques']['absences_creees'] ?? 0;
                    $updated = $result['statistiques']['absences_mises_a_jour'] ?? 0;
                    $totalCreated += $created;
                    $totalUpdated += $updated;
                    $this->info("  ✓ {$created} absence(s) créée(s), {$updated} mise(s) à jour");
                } else {
                    $this->error("  ✗ Erreur: {$result['message']}");
                }
            }
        }

        $this->info("Terminé ! Total: {$totalCreated} absence(s) créée(s), {$totalUpdated} mise(s) à jour");
    }

    /**
     * Traiter pour une date spécifique
     */
    private function processForDate(AbsenceAutoService $absenceAutoService, string $date, string $type)
    {
        $totalCreated = 0;

        if ($type === 'examen' || $type === 'both') {
            $examens = Examen::where('date', $date)->get();
            foreach ($examens as $examen) {
                $result = $absenceAutoService->createAbsencesForExamen($examen->id);
                if ($result['success']) {
                    $totalCreated += $result['statistiques']['absences_creees'] ?? 0;
                }
            }
        }

        if ($type === 'cours' || $type === 'both') {
            $cours = Cours::withoutGlobalScopes()->where('date', $date)->get();
            foreach ($cours as $c) {
                $result = $absenceAutoService->createAbsencesForCours($c->id);
                if ($result['success']) {
                    $totalCreated += $result['statistiques']['absences_creees'] ?? 0;
                }
            }
        }

        $this->info("Terminé ! Total: {$totalCreated} absence(s) créée(s) pour la date {$date}");
    }
}

