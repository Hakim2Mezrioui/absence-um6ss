<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Salle;

class BackfillSalleDevices extends Command
{
    protected $signature = 'salles:backfill-devices {--dry-run}';
    protected $description = 'Set devices=[] for salles where devices is NULL';

    public function handle(): int
    {
        $dryRun = (bool)$this->option('dry-run');
        $query = Salle::whereNull('devices');
        $count = $query->count();
        $this->info("Salles with NULL devices: {$count}");
        if ($count === 0) {
            return self::SUCCESS;
        }

        if ($dryRun) {
            $this->info('Dry run mode - no updates performed.');
            return self::SUCCESS;
        }

        $bar = $this->output->createProgressBar($count);
        $bar->start();
        $query->chunkById(200, function($chunk) use ($bar) {
            foreach ($chunk as $salle) {
                $salle->devices = [];
                $salle->save();
                $bar->advance();
            }
        });
        $bar->finish();
        $this->newLine();
        $this->info('Backfill completed.');
        return self::SUCCESS;
    }
}


