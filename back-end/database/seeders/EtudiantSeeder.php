<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Etudiant;

class EtudiantSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $csvFile = base_path("database/csv/etudiants.csv");
        $csvData = fopen($csvFile, 'r');

        // Skip the header row
        fgetcsv($csvData, 0, ';');

        while (($line = fgetcsv($csvData, 0, ';')) !== false) {
            Etudiant::create([
                'name' => $line[0],
                'faculte' => $line[1],
                'promotion' => $line[2],
            ]);
        }

        fclose($csvData);

        // $transRaw = true;
        // while($data = fgetcsv($csvData, 255, ',') !== false) {
        //     echo $data[0];
        //     if(!$transRaw) {
        //         Etudiant::create([
        //             "name" => $data[0],
        //             "faculte" => $data[1],
        //             "promotion" => $data[2],
        //         ]);
        //     }
        // }
    }
}
