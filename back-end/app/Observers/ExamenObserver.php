<?php

namespace App\Observers;

use App\Models\Examen;
use App\Services\AbsenceAutoService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class ExamenObserver
{
    protected $absenceAutoService;

    public function __construct(AbsenceAutoService $absenceAutoService)
    {
        $this->absenceAutoService = $absenceAutoService;
    }

    /**
     * Déclenché après la création d'un examen
     * Planifier la création automatique des absences à la fin de l'examen
     */
    public function created(Examen $examen)
    {
        // Planifier la création des absences à la fin de l'examen
        $this->scheduleAbsenceCreation($examen);
    }

    /**
     * Déclenché après la mise à jour d'un examen
     * Re-planifier si les heures ont changé
     */
    public function updated(Examen $examen)
    {
        // Si la date ou l'heure de fin a changé, re-planifier
        if ($examen->isDirty(['date', 'heure_fin'])) {
            $this->scheduleAbsenceCreation($examen);
        }
    }

    /**
     * Planifier la création automatique des absences
     */
    private function scheduleAbsenceCreation(Examen $examen)
    {
        try {
            $examenDate = Carbon::parse($examen->date);
            $examenEndTime = Carbon::parse($examen->heure_fin);
            
            // Calculer la date/heure de fin complète
            $examenEndDateTime = $examenDate->copy()
                ->setTimeFromTimeString($examenEndTime->format('H:i:s'))
                ->addMinutes(5); // Attendre 5 minutes après la fin pour être sûr
            
            // Si l'examen est déjà terminé, créer les absences immédiatement
            if ($examenEndDateTime->isPast()) {
                $this->createAbsencesForExamen($examen->id);
            } else {
                // Sinon, planifier la création avec un job différé
                \App\Jobs\CreateAbsencesForExamenJob::dispatch($examen->id)
                    ->delay($examenEndDateTime);
                    
                Log::info("Création absences planifiée pour examen {$examen->id}", [
                    'scheduled_at' => $examenEndDateTime->format('Y-m-d H:i:s')
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Erreur planification absences pour examen {$examen->id}: " . $e->getMessage());
        }
    }

    /**
     * Créer les absences pour un examen
     */
    private function createAbsencesForExamen(int $examenId)
    {
        try {
            $result = $this->absenceAutoService->createAbsencesForExamen($examenId);
            Log::info("Absences créées automatiquement pour examen {$examenId}", [
                'created' => $result['statistiques']['absences_creees'] ?? 0
            ]);
        } catch (\Exception $e) {
            Log::error("Erreur création absences pour examen {$examenId}: " . $e->getMessage());
        }
    }
}

