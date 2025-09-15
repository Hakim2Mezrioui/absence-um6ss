import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { EtudiantsService, FilterOptions } from '../../services/etudiants.service';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';

export interface ImportOptions {
  hasHeaders: boolean;
  duplicateMode: 'skip' | 'update' | 'error';
  useDefaultValues: boolean;
  defaultValues: {
    promotion_id?: number;
    etablissement_id?: number;
    ville_id?: number;
    group_id?: number;
    option_id?: number;
  };
}

export interface ImportResults {
  message: string;
  total?: number;
  created?: number;
  updated?: number;
  errors?: number;
  errorDetails?: Array<{line: number, message: string}>;
}

@Component({
  selector: 'app-import-students',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatSelectModule
  ],
  templateUrl: './import-students.component.html',
  styleUrl: './import-students.component.css'
})
export class ImportStudentsComponent implements OnInit, OnDestroy {
  // États
  loading = false;
  error = '';
  success = '';
  loadingMessage = '';
  uploadProgress = 0;
  showConfiguration = true;
  configurationValid = true;

  // Fichier
  selectedFile: File | null = null;
  isDragOver = false;

  // Configuration
  configForm: FormGroup;
  filterOptions: FilterOptions = {
    promotions: [],
    groups: [],
    villes: [],
    etablissements: [],
    options: []
  };

  // Options d'import
  importOptions: ImportOptions = {
    hasHeaders: true,
    duplicateMode: 'update',
    useDefaultValues: false,
    defaultValues: {}
  };

  // Données
  previewData: any[][] = [];
  previewHeaders: string[] = [];
  importResults: ImportResults | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private etudiantsService: EtudiantsService,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.configForm = this.fb.group({
      promotion_id: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      ville_id: ['', Validators.required],
      group_id: ['', Validators.required],
      option_id: ['', Validators.required],
      useAsDefault: [true]
    });
  }

  ngOnInit(): void {
    console.log('🚀 ImportStudentsComponent initialisé');
    this.loadFilterOptions();
    this.setupAutoConfiguration();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Retourner à la page précédente
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Charger les options de filtre
   */
  loadFilterOptions(): void {
    this.etudiantsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.filterOptions = options;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.error = 'Erreur lors du chargement des options de configuration';
        }
      });
  }

  /**
   * Configurer la configuration automatique
   */
  setupAutoConfiguration(): void {
    // Mise à jour automatique de la configuration quand les valeurs changent
    this.configForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formValue) => {
        this.importOptions.useDefaultValues = formValue.useAsDefault;
        this.importOptions.defaultValues = {
          promotion_id: formValue.promotion_id,
          etablissement_id: formValue.etablissement_id,
          ville_id: formValue.ville_id,
          group_id: formValue.group_id,
          option_id: formValue.option_id
        };
      });
  }

  /**
   * Valider la configuration (supprimé - configuration automatique)
   */
  validateConfiguration(): void {
    // Configuration automatique - pas de validation nécessaire
    const formValue = this.configForm.value;
    this.importOptions.useDefaultValues = formValue.useAsDefault;
    this.importOptions.defaultValues = {
      promotion_id: formValue.promotion_id,
      etablissement_id: formValue.etablissement_id,
      ville_id: formValue.ville_id,
      group_id: formValue.group_id,
      option_id: formValue.option_id
    };
    
    this.showConfiguration = false;
  }

  /**
   * Modifier la configuration
   */
  editConfiguration(): void {
    this.showConfiguration = true;
  }

  /**
   * Télécharger le modèle CSV
   */
  downloadTemplate(): void {
    // Modèle unique avec les colonnes de base
    const csvContent = 'id,matricule,first_name,last_name,email,password\n' +
                       '1,ETU2024001,Jean,Dupont,jean.dupont@email.com,password123\n' +
                       '2,ETU2024002,Marie,Martin,marie.martin@email.com,password123\n' +
                       '3,ETU2024003,Pierre,Durand,pierre.durand@email.com,password123';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modele_etudiants.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    this.snackBar.open('Modèle CSV téléchargé!', 'Fermer', {
      duration: 3000
    });
  }

  /**
   * Gestionnaire de drag over
   */
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  /**
   * Gestionnaire de drag leave
   */
  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  /**
   * Gestionnaire de drop
   */
  onFileDropped(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Sélection de fichier
   */
  onFileSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    
    if (files && files.length > 0) {
      this.handleFile(files[0]);
    }
  }

  /**
   * Traiter le fichier sélectionné
   */
  private handleFile(file: File): void {
    // Vérifications
    if (!file.name.toLowerCase().endsWith('.csv')) {
      this.error = 'Veuillez sélectionner un fichier CSV.';
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB
      this.error = 'Le fichier est trop volumineux (max 10MB).';
      return;
    }

    this.selectedFile = file;
    this.error = '';
    this.success = '';
    this.importResults = null;

    console.log('📁 Fichier sélectionné:', file.name, this.formatFileSize(file.size));
    
    // Prévisualiser le fichier
    this.previewFile(file);
  }

  /**
   * Prévisualiser le contenu du fichier
   */
  private previewFile(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        this.error = 'Le fichier CSV est vide.';
        return;
      }

      // Parser les premières lignes pour l'aperçu
      this.previewData = [];
      this.previewHeaders = [];

      const maxPreviewLines = Math.min(6, lines.length);
      
      for (let i = 0; i < maxPreviewLines; i++) {
        const cells = this.parseCSVLine(lines[i]);
        
        if (i === 0 && this.importOptions.hasHeaders) {
          this.previewHeaders = cells;
        } else {
          this.previewData.push(cells);
        }
      }

      // Si pas d'en-têtes, utiliser des noms génériques
      if (!this.importOptions.hasHeaders) {
        this.previewHeaders = this.previewData[0]?.map((_, index) => `Colonne ${index + 1}`) || [];
      }

      console.log('👀 Aperçu généré:', this.previewData.length, 'lignes');
    };

    reader.onerror = () => {
      this.error = 'Erreur lors de la lecture du fichier.';
    };

    reader.readAsText(file);
  }

  /**
   * Parser une ligne CSV simple
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  /**
   * Supprimer le fichier sélectionné
   */
  removeSelectedFile(): void {
    this.selectedFile = null;
    this.previewData = [];
    this.previewHeaders = [];
    this.error = '';
    this.success = '';
    this.importResults = null;
  }

  /**
   * Lancer l'importation
   */
  startImport(): void {
    if (!this.selectedFile) {
      this.error = 'Aucun fichier sélectionné.';
      return;
    }

    // Configuration automatique - pas de validation nécessaire

    this.loading = true;
    this.loadingMessage = 'Préparation de l\'import...';
    this.error = '';
    this.success = '';
    this.uploadProgress = 0;

    // Créer FormData pour l'upload
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    
    // Ajouter les options d'importation
    formData.append('import_options', JSON.stringify(this.importOptions));

    console.log('🚀 Début de l\'importation avec configuration:', this.importOptions);

    // Simuler progression
    const progressInterval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 10;
        this.loadingMessage = `Traitement en cours... ${this.uploadProgress}%`;
      }
    }, 200);

    // Appel à l'API
    this.etudiantsService.importEtudiants(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          clearInterval(progressInterval);
          this.uploadProgress = 100;
          this.loadingMessage = 'Import terminé!';
          
          this.importResults = {
            message: response.message || 'Importation réussie!',
            total: response.summary?.total_processed,
            created: response.summary?.created,
            updated: response.summary?.updated,
            errors: response.summary?.errors,
            errorDetails: response.error_details
          };
          
          this.success = 'Importation terminée avec succès!';
          this.loading = false;
          
          this.snackBar.open('Étudiants importés avec succès!', 'Fermer', {
            duration: 5000,
            panelClass: ['success-snackbar']
          });

          console.log('✅ Importation réussie:', response);
        },
        error: (err) => {
          clearInterval(progressInterval);
          this.uploadProgress = 0;
          this.loading = false;
          
          console.error('❌ Erreur d\'importation:', err);
          
          if (err.status === 422) {
            this.error = 'Données invalides dans le fichier CSV.';
          } else if (err.status === 413) {
            this.error = 'Fichier trop volumineux.';
          } else {
            this.error = err.error?.message || 'Erreur lors de l\'importation.';
          }
        }
      });
  }

  /**
   * Réinitialiser l'import
   */
  resetImport(): void {
    this.selectedFile = null;
    this.previewData = [];
    this.previewHeaders = [];
    this.importResults = null;
    this.error = '';
    this.success = '';
    this.uploadProgress = 0;
    this.loadingMessage = '';
    this.showConfiguration = true;
    this.configurationValid = false;
    
    // Reset forms
    this.configForm.reset();
    this.importOptions = {
      hasHeaders: true,
      duplicateMode: 'update',
      useDefaultValues: false,
      defaultValues: {}
    };
    
    // Reset file input
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Obtenir le nom de l'option par ID
   */
  getOptionName(type: string, id: number): string {
    switch (type) {
      case 'promotion':
        return this.filterOptions.promotions.find(p => p.id === id)?.name || `ID: ${id}`;
      case 'etablissement':
        return this.filterOptions.etablissements.find(e => e.id === id)?.name || `ID: ${id}`;
      case 'ville':
        return this.filterOptions.villes.find(v => v.id === id)?.name || `ID: ${id}`;
      case 'group':
        return this.filterOptions.groups.find(g => g.id === id)?.title || `ID: ${id}`;
      case 'option':
        return this.filterOptions.options.find(o => o.id === id)?.name || `ID: ${id}`;
      default:
        return `ID: ${id}`;
    }
  }

  /**
   * Formater la taille de fichier
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}
