<?php

namespace App\Observers;

use App\Models\Cours;
use App\Services\AbsenceAutoService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class CoursObserver
{
    protected $absenceAutoService;

    public function __construct(AbsenceAutoService $absenceAutoService)
    {
        $this->absenceAutoService = $absenceAutoService;
    }

    /**
     * Déclenché après la création d'un cours
     */
    public function created(Cours $cours)
    {
        $this->scheduleAbsenceCreation($cours);
    }

    /**
     * Déclenché après la mise à jour d'un cours
     */
    public function updated(Cours $cours)
    {
        if ($cours->isDirty(['date', 'heure_fin'])) {
            $this->scheduleAbsenceCreation($cours);
        }
    }

    /**
     * Planifier la création automatique des absences
     */
    private function scheduleAbsenceCreation(Cours $cours)
    {
        try {
            $coursDate = Carbon::parse($cours->date);
            $coursEndTime = Carbon::parse($cours->heure_fin);
            
            $coursEndDateTime = $coursDate->copy()
                ->setTimeFromTimeString($coursEndTime->format('H:i:s'))
                ->addMinutes(5); // Attendre 5 minutes après la fin
            
            if ($coursEndDateTime->isPast()) {
                $this->createAbsencesForCours($cours->id);
            } else {
                \App\Jobs\CreateAbsencesForCoursJob::dispatch($cours->id)
                    ->delay($coursEndDateTime);
                    
                Log::info("Création absences planifiée pour cours {$cours->id}", [
                    'scheduled_at' => $coursEndDateTime->format('Y-m-d H:i:s')
                ]);
            }
        } catch (\Exception $e) {
            Log::error("Erreur planification absences pour cours {$cours->id}: " . $e->getMessage());
        }
    }

    /**
     * Créer les absences pour un cours
     */
    private function createAbsencesForCours(int $coursId)
    {
        try {
            $result = $this->absenceAutoService->createAbsencesForCours($coursId);
            Log::info("Absences créées automatiquement pour cours {$coursId}", [
                'created' => $result['statistiques']['absences_creees'] ?? 0
            ]);
        } catch (\Exception $e) {
            Log::error("Erreur création absences pour cours {$coursId}: " . $e->getMessage());
        }
    }
}

