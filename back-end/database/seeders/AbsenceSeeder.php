<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\Examen;

class AbsenceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Récupérer les IDs d'examens existants
        $examens = Examen::pluck('id')->toArray();
        
        // Si aucun examen n'existe, créer des absences sans référence d'examen
        if (empty($examens)) {
            $this->command->warn('⚠️  Aucun examen trouvé. Les absences seront créées sans référence d\'examen.');
        }

        $absences = [
            [
                'type_absence' => 'Maladie',
                'etudiant_id' => 1,
                'cours_id' => 1,
                'examen_id' => null,
                'date_absence' => '2025-01-20',
                'justifiee' => true,
                'motif' => 'Grippe avec certificat médical',
                'justificatif' => 'certificat_medical_001.pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type_absence' => 'Retard',
                'etudiant_id' => 2,
                'cours_id' => 1,
                'examen_id' => null,
                'date_absence' => '2025-01-20',
                'justifiee' => false,
                'motif' => 'Problème de transport',
                'justificatif' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type_absence' => 'Absence non justifiée',
                'etudiant_id' => 3,
                'cours_id' => 2,
                'examen_id' => null,
                'date_absence' => '2025-01-21',
                'justifiee' => false,
                'motif' => null,
                'justificatif' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type_absence' => 'Motif familial',
                'etudiant_id' => 1,
                'cours_id' => 3,
                'examen_id' => null,
                'date_absence' => '2025-01-22',
                'justifiee' => true,
                'motif' => 'Décès dans la famille',
                'justificatif' => 'justificatif_familial_001.pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type_absence' => 'Rendez-vous médical',
                'etudiant_id' => 4,
                'cours_id' => 2,
                'examen_id' => null,
                'date_absence' => '2025-01-23',
                'justifiee' => true,
                'motif' => 'Consultation médicale obligatoire',
                'justificatif' => 'rdv_medical_001.pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'type_absence' => 'Transport',
                'etudiant_id' => 5,
                'cours_id' => 1,
                'examen_id' => null,
                'date_absence' => '2025-01-24',
                'justifiee' => false,
                'motif' => 'Panne de bus',
                'justificatif' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ];

        // Ajouter des absences liées aux examens seulement si des examens existent
        if (!empty($examens)) {
            $absences[] = [
                'type_absence' => 'Absence à un examen',
                'etudiant_id' => 2,
                'cours_id' => null,
                'examen_id' => $examens[0], // Utiliser le premier examen disponible
                'date_absence' => '2025-01-25',
                'justifiee' => true,
                'motif' => 'Certificat médical',
                'justificatif' => 'certificat_examen_001.pdf',
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $absences[] = [
                'type_absence' => 'Retard à un examen',
                'etudiant_id' => 3,
                'cours_id' => null,
                'examen_id' => $examens[0], // Utiliser le premier examen disponible
                'date_absence' => '2025-01-25',
                'justifiee' => false,
                'motif' => 'Arrivée après le début de l\'examen',
                'justificatif' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }

        $absences[] = [
            'type_absence' => 'Maladie',
            'etudiant_id' => 6,
            'cours_id' => 3,
            'examen_id' => null,
            'date_absence' => '2025-01-26',
            'justifiee' => true,
            'motif' => 'Angine avec certificat',
            'justificatif' => 'certificat_angine_001.pdf',
            'created_at' => now(),
            'updated_at' => now(),
        ];

        $absences[] = [
            'type_absence' => 'Absence non justifiée',
            'etudiant_id' => 7,
            'cours_id' => 4,
            'examen_id' => null,
            'date_absence' => '2025-01-27',
            'justifiee' => false,
            'motif' => null,
            'justificatif' => null,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        DB::table('absences')->insert($absences);
        
        $this->command->info('✅ AbsenceSeeder exécuté avec succès. ' . count($absences) . ' absences créées.');
    }
} 