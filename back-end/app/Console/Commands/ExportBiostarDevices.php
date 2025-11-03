<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ConfigurationService;
use App\Services\BiostarAttendanceService;

class ExportBiostarDevices extends Command
{
    protected $signature = 'biostar:export-devices {ville_id : Ville ID} {--output= : Output CSV path}';
    protected $description = 'Export Biostar devices (devid, devnm) for a given ville to CSV';

    public function handle(ConfigurationService $configService, BiostarAttendanceService $biostarService): int
    {
        $villeId = (int)$this->argument('ville_id');
        $output = $this->option('output') ?: base_path("devices_ville_{$villeId}.csv");

        $config = $configService->getConnectionConfigForVille($villeId);
        if (isset($config['error'])) {
            $this->error('Configuration not found for ville');
            return self::FAILURE;
        }

        try {
            $devices = $biostarService->getDevices($config);
        } catch (\Exception $e) {
            $this->error('Error fetching devices: ' . $e->getMessage());
            return self::FAILURE;
        }

        $fp = fopen($output, 'w');
        if (!$fp) {
            $this->error('Cannot open output file: ' . $output);
            return self::FAILURE;
        }
        fputcsv($fp, ['devid', 'devnm']);
        foreach ($devices as $d) {
            fputcsv($fp, [$d['devid'], $d['devnm']]);
        }
        fclose($fp);
        $this->info('Devices exported to ' . $output);
        return self::SUCCESS;
    }
}


