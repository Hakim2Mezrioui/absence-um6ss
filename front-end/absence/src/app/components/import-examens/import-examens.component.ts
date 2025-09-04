import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { Subject, takeUntil } from 'rxjs';

interface FilePreviewItem {
  row: { [key: string]: string };
  lineNumber: number;
}

@Component({
  selector: 'app-import-examens',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './import-examens.component.html',
  styleUrl: './import-examens.component.css'
})
export class ImportExamensComponent implements OnInit, OnDestroy {
  importForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  
  // Fichier sélectionné
  selectedFile: File | null = null;
  filePreview: FilePreviewItem[] = [];
  
  // Options de formulaire
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  villes: any[] = [];
  typesExamen: TypeExamen[] = [];
  
  // Résultats de l'import
  importResults: {
    total: number;
    success: number;
    errors: number;
    details: string[];
  } = {
    total: 0,
    success: 0,
    errors: 0,
    details: []
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService
  ) {
    this.importForm = this.fb.group({
      etablissement_id: ['', Validators.required],
      promotion_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required],
      type_examen_id: ['', Validators.required],
      option_id: [''],
      salle_id: ['', Validators.required],
      group_id: ['', Validators.required],
      ville_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadTypesExamen();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Charger les options de filtre
  loadFilterOptions(): void {
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  // Charger les types d'examen
  loadTypesExamen(): void {
    this.typesExamenService.getTypesExamenPaginated(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.typesExamen = response.data || [];
        },
        error: (err) => {
          console.error('Erreur lors du chargement des types d\'examen:', err);
          this.error = 'Erreur lors du chargement des types d\'examen';
        }
      });
  }

  // Gérer la sélection de fichier
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.previewFile(file);
    }
  }

  // Prévisualiser le fichier
  previewFile(file: File): void {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      this.previewCSV(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
               file.name.endsWith('.xlsx')) {
      this.previewExcel(file);
    } else {
      this.error = 'Format de fichier non supporté. Utilisez CSV ou Excel (.xlsx)';
      this.selectedFile = null;
    }
  }

    // Prévisualiser un fichier CSV
  previewCSV(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map((h: string) => h.trim());
      
      this.filePreview = lines.slice(1, 6).map((line: string, index: number) => {
        const values = line.split(',').map((v: string) => v.trim());
        const row: { [key: string]: string } = {};
        headers.forEach((header: string, i: number) => {
          row[header] = values[i] || '';
        });
        return { row, lineNumber: index + 2 };
      }).filter((item: FilePreviewItem) => Object.values(item.row).some(val => val !== ''));
      
      this.importResults.total = this.filePreview.length;
    };
    reader.readAsText(file);
  }

  // Prévisualiser un fichier Excel (simulation)
  previewExcel(file: File): void {
    // Pour l'instant, on simule la lecture Excel
    // En production, vous pourriez utiliser une librairie comme xlsx
    this.filePreview = [
      { row: { title: 'Exemple Excel', date: '2025-01-15', heure_debut: '09:00' }, lineNumber: 2 },
      { row: { title: 'Exemple Excel 2', date: '2025-01-16', heure_debut: '10:00' }, lineNumber: 3 }
    ];
    this.importResults.total = this.filePreview.length;
  }

  // Valider le formulaire et le fichier
  validateImport(): boolean {
    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier';
      return false;
    }

    if (this.importForm.invalid) {
      this.error = 'Veuillez remplir tous les champs obligatoires';
      this.markFormGroupTouched();
      return false;
    }

    if (this.filePreview.length === 0) {
      this.error = 'Le fichier ne contient pas de données valides';
      return false;
    }

    return true;
  }

  // Importer les examens
  importExamens(): void {
    if (!this.validateImport()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.importResults = { total: 0, success: 0, errors: 0, details: [] };

    const formData = this.importForm.value;
    const examensToImport: Partial<Examen>[] = [];

    // Préparer les données d'import
    this.filePreview.forEach((item: FilePreviewItem, index: number) => {
      try {
        const examen: Partial<Examen> = {
          title: item.row['title'] || item.row['nom'] || item.row['nom_examen'] || '',
          date: this.formatDate(item.row['date']),
          heure_debut: this.formatTime(item.row['heure_debut'] || item.row['heure'] || ''),
          heure_fin: this.formatTime(item.row['heure_fin'] || item.row['heure_fin'] || ''),
          type_examen_id: formData.type_examen_id,
          etablissement_id: formData.etablissement_id,
          promotion_id: formData.promotion_id,
          option_id: formData.option_id || undefined,
          salle_id: formData.salle_id,
          group_id: formData.group_id,
          ville_id: formData.ville_id,
          annee_universitaire: formData.annee_universitaire
        };

        // Validation des données
        if (this.validateExamenData(examen, index + 2)) {
          examensToImport.push(examen);
        }
      } catch (err) {
        this.importResults.errors++;
        this.importResults.details.push(`Ligne ${index + 2}: Erreur de formatage des données`);
      }
    });

    if (examensToImport.length === 0) {
      this.error = 'Aucun examen valide à importer';
      this.loading = false;
      return;
    }

    // Importer les examens un par un
    this.importResults.total = examensToImport.length;
    this.importExamensSequentially(examensToImport, 0);
  }

  // Importer les examens séquentiellement
  private importExamensSequentially(examens: Partial<Examen>[], index: number): void {
    if (index >= examens.length) {
      this.loading = false;
      this.showImportResults();
      return;
    }

    const examen = examens[index];
    
    // Créer l'examen via le service
    this.examensService.createExamen(examen)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.importResults.success++;
          this.importResults.details.push(`Ligne ${index + 2}: Importé avec succès`);
          // Importer le suivant
          this.importExamensSequentially(examens, index + 1);
        },
        error: (err) => {
          this.importResults.errors++;
          this.importResults.details.push(`Ligne ${index + 2}: ${err.error?.message || 'Erreur d\'import'}`);
          // Continuer avec le suivant
          this.importExamensSequentially(examens, index + 1);
        }
      });
  }

  // Valider les données d'un examen
  private validateExamenData(examen: Partial<Examen>, lineNumber: number): boolean {
    if (!examen.title || examen.title.length < 3) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Titre invalide (minimum 3 caractères)`);
      return false;
    }

    if (!examen.date) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Date invalide`);
      return false;
    }

    if (!examen.heure_debut || !examen.heure_fin) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Heures invalides`);
      return false;
    }

    if (examen.heure_fin <= examen.heure_debut) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: L'heure de fin doit être postérieure à l'heure de début`);
      return false;
    }

    return true;
  }

  // Formater une date
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    // Essayer différents formats de date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Format français DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateString;
    }
    
    return date.toISOString().split('T')[0];
  }

  // Formater une heure
  private formatTime(timeString: string): string {
    if (!timeString) return '';
    
    // Supprimer les espaces et normaliser
    const time = timeString.trim().replace(/\s/g, '');
    
    // Format HH:MM
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      return time;
    }
    
    // Format HHhMM
    if (/^\d{1,2}h\d{2}$/.test(time)) {
      return time.replace('h', ':');
    }
    
    // Format HH.MM
    if (/^\d{1,2}\.\d{2}$/.test(time)) {
      return time.replace('.', ':');
    }
    
    return timeString;
  }

  // Afficher les résultats de l'import
  private showImportResults(): void {
    if (this.importResults.success > 0) {
      this.success = `${this.importResults.success} examen(s) importé(s) avec succès`;
      this.notificationService.success('Import réussi', this.success);
    }
    
    if (this.importResults.errors > 0) {
      this.error = `${this.importResults.errors} erreur(s) lors de l'import`;
    }
  }

  // Réinitialiser le formulaire
  resetForm(): void {
    this.importForm.reset();
    this.selectedFile = null;
    this.filePreview = [];
    this.importResults = { total: 0, success: 0, errors: 0, details: [] };
    this.error = '';
    this.success = '';
  }

  // Marquer tous les champs comme touchés
  private markFormGroupTouched(): void {
    Object.keys(this.importForm.controls).forEach(key => {
      const control = this.importForm.get(key);
      control?.markAsTouched();
    });
  }

  // Vérifier si un champ est invalide
  isFieldInvalid(controlName: string): boolean {
    const control = this.importForm.get(controlName);
    return !!(control?.invalid && control.touched);
  }

  // Obtenir le message d'erreur d'un champ
  getErrorMessage(controlName: string): string {
    const control = this.importForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
    }
    return '';
  }

  // Obtenir les en-têtes du fichier pour l'affichage
  getHeaders(): string[] {
    if (this.filePreview.length === 0) return [];
    return Object.keys(this.filePreview[0].row);
  }
}
