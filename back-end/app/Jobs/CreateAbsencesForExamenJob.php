<?php

namespace App\Jobs;

use App\Services\AbsenceAutoService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class CreateAbsencesForExamenJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $examenId;

    /**
     * Nombre de tentatives en cas d'échec
     */
    public $tries = 3;

    /**
     * Délai entre les tentatives (en secondes)
     */
    public $backoff = 60;

    public function __construct(int $examenId)
    {
        $this->examenId = $examenId;
    }

    public function handle(AbsenceAutoService $absenceAutoService)
    {
        try {
            Log::info("Début création automatique absences pour examen {$this->examenId}");
            
            $result = $absenceAutoService->createAbsencesForExamen($this->examenId);
            
            if ($result['success']) {
                Log::info("Absences créées avec succès pour examen {$this->examenId}", [
                    'created' => $result['statistiques']['absences_creees'] ?? 0
                ]);
            } else {
                Log::warning("Échec création absences pour examen {$this->examenId}: " . $result['message']);
            }
        } catch (\Exception $e) {
            Log::error("Erreur job création absences examen {$this->examenId}: " . $e->getMessage());
            throw $e; // Relancer pour réessayer
        }
    }

    /**
     * Gérer l'échec du job
     */
    public function failed(\Throwable $exception)
    {
        Log::error("Job création absences échoué pour examen {$this->examenId}", [
            'error' => $exception->getMessage(),
            'trace' => $exception->getTraceAsString()
        ]);
    }
}

