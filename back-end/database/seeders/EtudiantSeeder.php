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
        
        if (!file_exists($csvFile)) {
            $this->command->error("Le fichier CSV n'existe pas: " . $csvFile);
            return;
        }

        $csvData = fopen($csvFile, 'r');

        // Lire l'en-tête pour obtenir les noms de colonnes
        $headers = fgetcsv($csvData, 0, ';');
        if (!$headers) {
            $this->command->error("Impossible de lire l'en-tête du CSV");
            return;
        }

        $count = 0;
        while (($line = fgetcsv($csvData, 0, ';')) !== false) {
            if (count($line) >= count($headers)) {
                try {
                    // Créer un tableau associatif avec les noms de colonnes
                    $data = array_combine($headers, $line);
                    
                    // Créer l'étudiant avec la structure exacte du CSV
                    Etudiant::create([
                        'matricule' => $data['matricule'],
                        'first_name' => $data['first_name'],
                        'last_name' => $data['last_name'],
                        'email' => $data['email'],
                        'password' => bcrypt($data['password']),
                        'photo' => $data['photo'] ?: null,
                        'promotion_id' => (int)$data['promotion_id'],
                        'etablissement_id' => (int)$data['etablissement_id'],
                        'ville_id' => (int)$data['ville_id'],
                        'group_id' => $data['group_id'] ? (int)$data['group_id'] : null,
                        'option_id' => isset($data['option_id']) && !empty($data['option_id']) ? (int)$data['option_id'] : null, // Optionnel
                    ]);
                    $count++;
                } catch (\Exception $e) {
                    $this->command->warn("Erreur lors de la création de l'étudiant {$data['first_name']} {$data['last_name']}: " . $e->getMessage());
                }
            }
        }

        fclose($csvData);
        
        $this->command->info("✅ {$count} étudiants ont été créés avec succès !");
    }
}
