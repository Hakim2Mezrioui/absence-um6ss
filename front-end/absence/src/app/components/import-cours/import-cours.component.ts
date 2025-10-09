import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';
import { Subject, takeUntil } from 'rxjs';

interface FilePreviewItem {
  row: { [key: string]: string };
  lineNumber: number;
}

interface ImportResults {
  total: number;
  success: number;
  errors: number;
  details: string[];
}

@Component({
  selector: 'app-import-cours',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './import-cours.component.html',
  styleUrl: './import-cours.component.css'
})
export class ImportCoursComponent implements OnInit, OnDestroy {
  importForm: FormGroup;
  loading = false;
  error = '';
  success = '';
  loadingMessage = '';
  
  // Fichier sélectionné
  selectedFile: File | null = null;
  filePreview: FilePreviewItem[] = [];
  isDragOver = false;
  
  // Options de formulaire
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  villes: any[] = [];
  typesCours: any[] = [];
  anneesUniversitaires: string[] = [];
  
  // Résultats de l'import
  importResults: ImportResults = {
    total: 0,
    success: 0,
    errors: 0,
    details: []
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private coursService: CoursService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.importForm = this.fb.group({
      etablissement_id: ['', Validators.required],
      promotion_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required],
      type_cours_id: ['', Validators.required],
      option_id: [''],
      salle_id: ['', Validators.required],
      group_id: ['', Validators.required],
      ville_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.generateAnneesUniversitaires();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Charger les options de filtre
  loadFilterOptions(): void {
    this.coursService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
          this.typesCours = response.types_cours || [];
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  // Générer les années universitaires (5 ans avant et 5 ans après)
  generateAnneesUniversitaires(): void {
    const currentYear = new Date().getFullYear();
    this.anneesUniversitaires = [];
    
    // Générer 5 ans avant et 5 ans après l'année actuelle
    for (let i = -5; i <= 5; i++) {
      const year = currentYear + i;
      const nextYear = year + 1;
      this.anneesUniversitaires.push(`${year}-${nextYear}`);
    }
    
    // Définir l'année actuelle comme valeur par défaut
    
    const currentAcademicYear = `${currentYear}-${currentYear + 1}`;
    this.importForm.patchValue({
      annee_universitaire: currentAcademicYear
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

  // Gérer le drag over
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  // Gérer le drag leave
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  // Gérer le drop
  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (this.isValidFileType(file)) {
        this.selectedFile = file;
        this.previewFile(file);
        this.error = ''; // Clear any previous errors
      } else {
        this.error = 'Format de fichier non supporté. Utilisez CSV ou TXT';
        this.selectedFile = null;
      }
    }
  }

  // Vérifier si le type de fichier est valide
  private isValidFileType(file: File): boolean {
    const validTypes = ['text/csv', 'text/plain', 'application/csv'];
    const validExtensions = ['.csv', '.txt'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  // Prévisualiser le fichier
  previewFile(file: File): void {
    if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
      this.previewCSV(file);
    } else if (file.name.endsWith('.txt')) {
      this.previewCSV(file);
    } else {
      this.error = 'Format de fichier non supporté. Utilisez CSV ou TXT';
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

  // Importer les cours
  importFile(): void {
    if (!this.validateImport()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.importResults = { total: 0, success: 0, errors: 0, details: [] };

    const formData = this.importForm.value;
    const coursToImport: Partial<Cours>[] = [];

    // Préparer les données d'import
    this.filePreview.forEach((item: FilePreviewItem, index: number) => {
      try {
        const heureDebut = this.formatTime(item.row['hour_debut'] || item.row['heure_debut'] || '');
        const cours: Partial<Cours> = {
          name: item.row['title'] || item.row['name'] || item.row['nom'] || '',
          date: this.formatDate(item.row['date']),
          heure_debut: heureDebut,
          heure_fin: this.formatTime(item.row['hour_fin'] || item.row['heure_fin'] || ''),
          pointage_start_hour: this.formatTime(
            item.row['pointage_start_hour'] ||
            item.row['hour_debut'] ||
            item.row['heure_debut'] ||
            heureDebut
          ),
          tolerance: this.formatTime(item.row['tolerance'] || '00:15'),
          etablissement_id: formData.etablissement_id,
          promotion_id: formData.promotion_id,
          type_cours_id: formData.type_cours_id,
          option_id: formData.option_id || undefined,
          salle_id: formData.salle_id,
          ville_id: formData.ville_id,
          annee_universitaire: formData.annee_universitaire
        };

        // Validation des données
        if (this.validateCoursData(cours, index + 2)) {
          coursToImport.push(cours);
        }
      } catch (err) {
        this.importResults.errors++;
        this.importResults.details.push(`Ligne ${index + 2}: Erreur de formatage des données`);
      }
    });

    if (coursToImport.length === 0) {
      this.error = 'Aucun cours valide à importer';
      this.loading = false;
      return;
    }

    // Importer les cours un par un
    this.importResults.total = coursToImport.length;
    this.importCoursSequentially(coursToImport, 0);
  }

  // Importer les cours séquentiellement
  private importCoursSequentially(cours: Partial<Cours>[], index: number): void {
    if (index >= cours.length) {
      this.loading = false;
      this.showImportResults();
      return;
    }

    const coursItem = cours[index];
    
    // Créer le cours via le service
    this.coursService.createCours(coursItem)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.importResults.success++;
          this.importResults.details.push(`Ligne ${index + 2}: Importé avec succès`);
          // Importer le suivant
          this.importCoursSequentially(cours, index + 1);
        },
        error: (err) => {
          this.importResults.errors++;
          this.importResults.details.push(`Ligne ${index + 2}: ${err.error?.message || 'Erreur d\'import'}`);
          // Continuer avec le suivant
          this.importCoursSequentially(cours, index + 1);
        }
      });
  }

  // Valider les données d'un cours
  private validateCoursData(cours: Partial<Cours>, lineNumber: number): boolean {
    if (!cours.name || cours.name.length < 3) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Nom du cours invalide (minimum 3 caractères)`);
      return false;
    }

    if (!cours.date) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Date invalide`);
      return false;
    }

    if (!cours.heure_debut || !cours.heure_fin) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Heures invalides`);
      return false;
    }

    if (cours.heure_fin <= cours.heure_debut) {
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
      this.success = `${this.importResults.success} cours importé(s) avec succès`;
      
      // Rediriger vers la liste des cours après 3 secondes
      setTimeout(() => {
        this.router.navigate(['/dashboard/cours']);
      }, 3000);
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
    this.isDragOver = false;
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

  // Télécharger le modèle CSV
  downloadTemplate(): void {
    const csvContent = this.generateCSVTemplate();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modele_cours.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Générer le contenu du modèle CSV
  private generateCSVTemplate(): string {
    const headers = ['title', 'date', 'hour_debut', 'hour_fin', 'tolerance'];
    const sampleData = [
      ['Cours de Mathématiques', '15/01/2024', '08:00', '10:00', '00:15'],
      ['Cours de Physique', '16/01/2024', '10:00', '12:00', '00:15'],
      ['Cours de Chimie', '17/01/2024', '14:00', '16:00', '00:20']
    ];

    let csvContent = headers.join(',') + '\n';
    sampleData.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    return csvContent;
  }

  removeFile() {
    this.selectedFile = null;
    this.filePreview = [];
    this.error = '';
    this.success = '';
  }

  goBack() {
    this.router.navigate(['/dashboard/cours']);
  }
}