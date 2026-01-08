<?php

namespace App\Jobs;

use App\Services\AbsenceAutoService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateAbsencesForCoursJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $coursId;

    /**
     * Nombre de tentatives en cas d'échec
     */
    public $tries = 3;

    /**
     * Délai entre les tentatives (en secondes)
     */
    public $backoff = 60;

    public function __construct(int $coursId)
    {
        $this->coursId = $coursId;
    }

    public function handle(AbsenceAutoService $absenceAutoService)
    {
        try {
            Log::info("Début création automatique absences pour cours {$this->coursId}");
            
            $result = $absenceAutoService->createAbsencesForCours($this->coursId);
            
            if ($result['success']) {
                Log::info("Absences créées avec succès pour cours {$this->coursId}", [
                    'created' => $result['statistiques']['absences_creees'] ?? 0
                ]);
            } else {
                Log::warning("Échec création absences pour cours {$this->coursId}: " . $result['message']);
            }
        } catch (\Exception $e) {
            Log::error("Erreur job création absences cours {$this->coursId}: " . $e->getMessage());
            throw $e; // Relancer pour réessayer
        }
    }

    /**
     * Gérer l'échec du job
     */
    public function failed(\Throwable $exception)
    {
        Log::error("Job création absences échoué pour cours {$this->coursId}", [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}

