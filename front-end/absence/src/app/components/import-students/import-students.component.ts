import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { EtudiantsService, FilterOptions, ValidationResults } from '../../services/etudiants.service';

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
    option_id?: number | null; // Optionnel - toutes les écoles n'utilisent pas les options
  };
}

export interface ImportResults {
  message: string;
  total?: number;
  created?: number;
  updated?: number;
  errors?: number;
  errorDetails?: Array<{
    line: number, 
    message: string, 
    suggestions?: {[key: string]: string}
  }>;
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

  // Mode d'importation
  importMode: 'complete' | 'preconfigured' = 'complete';

  // Données
  previewData: any[][] = [];
  previewHeaders: string[] = [];
  importResults: ImportResults | null = null;

  // Validation
  validationResults: ValidationResults | null = null;
  isValidating = false;
  validationCompleted = false;

  // Édition de fichier comme Excel
  showFileEditor = false;
  editableData: any[][] = [];
  editableHeaders: string[] = [];
  suggestions: {[key: string]: any} = {};
  editingCell: {row: number, col: number} | null = null;
  cellSuggestions: any[] = [];
  // Fichier corrigé en mémoire
  private correctedFileBlob: Blob | null = null;

  // Affichages optionnels
  showPreview = false;
  showGuide = false;

  private destroy$ = new Subject<void>();

  constructor(
    private etudiantsService: EtudiantsService,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {
    this.configForm = this.fb.group({
      promotion_id: [''],
      etablissement_id: [''],
      ville_id: [''],
      group_id: [''],
      option_id: [''], // Optionnel - toutes les écoles n'utilisent pas les options
      useAsDefault: [false]
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
   * Télécharger le modèle CSV adapté au mode d'importation
   */
  downloadTemplate(): void {
    let csvContent = '';
    let fileName = '';
    
    if (this.importMode === 'complete') {
      // Modèle complet avec toutes les colonnes
      csvContent = 'matricule,first_name,last_name,email,password,promotion_id,etablissement_id,ville_id,group_id,option_id\n' +
                   'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123,1ere annee,Faculte de Medecine,Casablanca,Groupe A,Pharmacie\n' +
                   'ETU2024002,Marie,Martin,marie.martin@email.com,password123,2eme annee,Hopital Universitaire,Rabat,Groupe B,Medecine\n' +
                   'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123,3eme annee,Institut Superieur,Fes,Groupe C,Chirurgie\n' +
                   'ETU2024004,Sophie,Bernard,sophie.bernard@email.com,password123,4eme annee,Ecole de Sante,Marrakech,Groupe D,\n' +
                   'ETU2024005,Lucas,Moreau,lucas.moreau@email.com,password123,5eme annee,Centre Medical,Tanger,Groupe E,Biologie';
      fileName = 'modele_etudiants_complet.csv';
    } else {
      // Modèle minimal pour mode pré-configuré
      csvContent = 'matricule,first_name,last_name,email,password\n' +
                   'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123\n' +
                   'ETU2024002,Marie,Martin,marie.martin@email.com,password123\n' +
                   'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123\n' +
                   'ETU2024004,Sophie,Bernard,sophie.bernard@email.com,password123\n' +
                   'ETU2024005,Lucas,Moreau,lucas.moreau@email.com,password123';
      fileName = 'modele_etudiants_minimal.csv';
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    const modeText = this.importMode === 'complete' ? 'complet' : 'minimal';
    this.snackBar.open(`Modèle CSV ${modeText} téléchargé!`, 'Fermer', {
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
    const allowedExtensions = ['.csv', '.txt', '.xlsx', '.xls'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(fileExtension)) {
      this.error = 'Veuillez sélectionner un fichier CSV, TXT, XLSX ou XLS.';
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
    // Lancer une validation rapide automatiquement
    setTimeout(() => this.validateFile(), 0);
  }

  /**
   * Prévisualiser le contenu du fichier
   */
  private previewFile(file: File): void {
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (fileExtension === '.xlsx' || fileExtension === '.xls') {
      this.previewExcelFile(file);
    } else {
      this.previewCsvFile(file);
    }
  }

  /**
   * Prévisualiser un fichier CSV/TXT
   */
  private previewCsvFile(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const csv = e.target?.result as string;
      const lines = csv.split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        this.error = 'Le fichier est vide.';
        return;
      }

      this.parseAndPreviewData(lines);
    };

    reader.onerror = () => {
      this.error = 'Erreur lors de la lecture du fichier.';
    };

    reader.readAsText(file);
  }

  /**
   * Prévisualiser un fichier Excel
   */
  private previewExcelFile(file: File): void {
    // Utiliser une approche simple pour lire les fichiers Excel
    this.convertExcelToCsv(file).then(csvData => {
      if (csvData) {
        const lines = csvData.split('\n').filter(line => line.trim());
        this.parseAndPreviewData(lines);
        this.success = 'Fichier Excel converti avec succès.';
      } else {
        this.error = 'Impossible de lire le fichier Excel. Veuillez utiliser un fichier CSV.';
      }
    }).catch(error => {
      console.error('Erreur lors de la conversion Excel:', error);
      this.error = 'Erreur lors de la lecture du fichier Excel. Veuillez utiliser un fichier CSV.';
    });
  }

  /**
   * Convertir un fichier Excel en CSV (méthode simplifiée)
   */
  private async convertExcelToCsv(file: File): Promise<string | null> {
    try {
      // Pour l'instant, retourner null et suggérer l'utilisation de CSV
      // Dans une implémentation complète, vous pourriez utiliser :
      // - SheetJS (xlsx) : https://github.com/SheetJS/sheetjs
      // - ExcelJS : https://github.com/exceljs/exceljs
      // - Ou une autre bibliothèque JavaScript
      
      console.log('Conversion Excel non implémentée pour le moment');
      return null;
      
    } catch (error) {
      console.error('Erreur lors de la conversion Excel:', error);
      return null;
    }
  }

  /**
   * Parser et prévisualiser les données
   */
  private parseAndPreviewData(lines: string[]): void {
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
   * Valider le fichier avant l'importation
   */
  validateFile(): void {
    if (!this.selectedFile) {
      this.error = 'Aucun fichier sélectionné.';
      return;
    }

    this.isValidating = true;
    this.error = '';
    this.success = '';
    this.validationResults = null;
    this.validationCompleted = false;

    // Créer FormData pour la validation
    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('import_options', JSON.stringify(this.importOptions));

    console.log('🔍 Début de la validation du fichier...');

    this.etudiantsService.validateFile(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.validationResults = results;
          this.validationCompleted = true;
          this.isValidating = false;

          // Toujours ouvrir l'éditeur pour permettre les corrections avant import
          this.openFileEditor(results);

          if (results.valid) {
            this.success = `✅ Fichier validé: ${results.validRows}/${results.totalRows}`;
            if (results.warnings > 0) this.success += ` (${results.warnings} avertissements)`;
          } else {
            this.error = `❌ ${results.errorRows} erreur(s) à corriger sur ${results.totalRows}`;
          }

          console.log('✅ Validation terminée:', results);
        },
        error: (err) => {
          this.isValidating = false;
          this.validationCompleted = false;
          
          console.error('❌ Erreur de validation:', err);
          
          if (err.status === 422) {
            this.error = 'Format de fichier invalide.';
          } else if (err.status === 413) {
            this.error = 'Fichier trop volumineux.';
          } else {
            this.error = err.error?.message || 'Erreur lors de la validation du fichier.';
          }
        }
      });
  }

  /**
   * Lancer l'importation
   */
  startImport(): void {
    if (!this.selectedFile) {
      this.error = 'Aucun fichier sélectionné.';
      return;
    }

    // Vérifier si le fichier a été validé
    if (!this.validationCompleted || !this.validationResults) {
      this.error = 'Veuillez d\'abord valider le fichier avant de lancer l\'importation.';
      return;
    }

    // Vérifier si le fichier est valide
    if (!this.validationResults.valid) {
      this.error = 'Le fichier contient des erreurs. Veuillez les corriger avant l\'importation.';
      return;
    }

    // Validation selon le mode
    if (this.importMode === 'preconfigured') {
      // Mode pré-configuré - vérifier la configuration
      const formValue = this.configForm.value;
      if (!formValue.promotion_id || !formValue.etablissement_id || !formValue.ville_id || !formValue.group_id) {
        this.error = 'Veuillez configurer tous les champs obligatoires avant l\'importation.';
        return;
      }
    }

    this.loading = true;
    this.loadingMessage = this.importMode === 'complete' ? 'Importation complète en cours...' : 'Importation pré-configurée en cours...';
    this.error = '';
    this.success = '';
    this.uploadProgress = 0;

    // Créer FormData pour l'upload (utiliser le fichier corrigé s'il existe)
    const formData = new FormData();
    if (this.correctedFileBlob) {
      formData.append('file', this.correctedFileBlob, this.selectedFile?.name || 'corrected.csv');
    } else {
      formData.append('file', this.selectedFile);
    }
    
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
    this.validationResults = null;
    this.validationCompleted = false;
    this.isValidating = false;
    this.showFileEditor = false;
    this.editableData = [];
    this.editableHeaders = [];
    this.suggestions = {};
    this.editingCell = null;
    this.cellSuggestions = [];
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

  /**
   * Copier l'exemple CSV dans le presse-papiers
   */
  copyCSVExample(): void {
    const csvContent = 'matricule,first_name,last_name,email,password,promotion_id,etablissement_id,ville_id,group_id,option_id\n' +
                       'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123,1,1,1,1,1\n' +
                       'ETU2024002,Marie,Martin,marie.martin@email.com,password123,1,1,1,1,2\n' +
                       'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123,2,1,1,2,1';
    
    navigator.clipboard.writeText(csvContent).then(() => {
      this.snackBar.open('Exemple CSV complet copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.snackBar.open('Exemple CSV complet copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    });
  }

  /**
   * Copier l'exemple CSV avec noms dans le presse-papiers
   */
  copyCSVExampleWithNames(): void {
    const csvContent = 'matricule,first_name,last_name,email,password,promotion_id,etablissement_id,ville_id,group_id,option_id\n' +
                       'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123,1ere annee,Faculte de Medecine,Casablanca,Groupe A,Pharmacie\n' +
                       'ETU2024002,Marie,Martin,marie.martin@email.com,password123,2eme annee,Hopital Universitaire,Rabat,Groupe B,Medecine\n' +
                       'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123,3eme annee,Institut Superieur,Fes,Groupe C,Chirurgie';
    
    navigator.clipboard.writeText(csvContent).then(() => {
      this.snackBar.open('Exemple CSV avec noms copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.snackBar.open('Exemple CSV avec noms copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    });
  }

  /**
   * Copier l'exemple CSV avec IDs dans le presse-papiers
   */
  copyCSVExampleWithIds(): void {
    const csvContent = 'matricule,first_name,last_name,email,password,promotion_id,etablissement_id,ville_id,group_id,option_id\n' +
                       'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123,1,1,1,1,1\n' +
                       'ETU2024002,Marie,Martin,marie.martin@email.com,password123,2,1,1,1,2\n' +
                       'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123,3,1,1,2,1';
    
    navigator.clipboard.writeText(csvContent).then(() => {
      this.snackBar.open('Exemple CSV avec IDs copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }).catch(() => {
      // Fallback pour les navigateurs qui ne supportent pas l'API Clipboard
      const textArea = document.createElement('textarea');
      textArea.value = csvContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      this.snackBar.open('Exemple CSV avec IDs copié dans le presse-papiers!', 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    });
  }

  /**
   * Obtenir les clés d'un objet (pour le template)
   */
  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  /**
   * Vérifier si un objet a des propriétés (pour le template)
   */
  hasObjectKeys(obj: any): boolean {
    return obj && Object.keys(obj).length > 0;
  }

  /**
   * Changer le mode d'importation
   */
  changeImportMode(mode: 'complete' | 'preconfigured'): void {
    this.importMode = mode;
    this.importOptions.useDefaultValues = mode === 'preconfigured';
    
    if (mode === 'complete') {
      // Mode importation complète - pas besoin de pré-configuration
      this.showConfiguration = false;
    } else {
      // Mode pré-configuré - afficher la configuration
      this.showConfiguration = true;
    }
  }

  /**
   * Basculer entre les modes d'importation
   */
  toggleImportMode(): void {
    this.changeImportMode(this.importMode === 'complete' ? 'preconfigured' : 'complete');
  }

  /**
   * Ouvrir l'éditeur de fichier pour corriger les erreurs
   */
  openFileEditor(validationResults: ValidationResults): void {
    this.showFileEditor = true;
    
    // Préparer les données éditables
    this.editableHeaders = validationResults.summary.columns;
    this.editableData = validationResults.summary.sampleData.map(row => [...row]);
    
    // Charger les suggestions pour chaque colonne
    this.loadSuggestions();
    
    console.log('📝 Éditeur de fichier ouvert avec', this.editableData.length, 'lignes');
  }

  /**
   * Revalider les données éditées sans télécharger un nouveau fichier
   */
  revalidateEditedData(): void {
    if (!this.showFileEditor || this.editableHeaders.length === 0) return;

    // Construire un CSV à partir des données éditées
    const csvContent = this.convertToCSV(this.editableHeaders, this.editableData);
    this.correctedFileBlob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    const formData = new FormData();
    formData.append('file', this.correctedFileBlob, this.selectedFile?.name || 'corrected.csv');
    formData.append('import_options', JSON.stringify(this.importOptions));

    this.isValidating = true;
    this.error = '';
    this.success = '';

    this.etudiantsService.validateFile(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          this.validationResults = results;
          this.validationCompleted = true;
          this.isValidating = false;
          if (results.valid) {
            this.success = `✅ Corrections valides: ${results.validRows}/${results.totalRows}`;
          } else {
            this.error = `❌ Encore ${results.errorRows} erreur(s) à corriger`;
          }
        },
        error: (err) => {
          this.isValidating = false;
          this.validationCompleted = false;
          this.error = err.error?.message || 'Erreur lors de la revalidation.';
        }
      });
  }

  /**
   * Fermer l'éditeur de fichier
   */
  closeFileEditor(): void {
    this.showFileEditor = false;
    this.editableData = [];
    this.editableHeaders = [];
    this.suggestions = {};
    this.editingCell = null;
    this.cellSuggestions = [];
  }

  /**
   * Charger les suggestions pour chaque colonne
   */
  loadSuggestions(): void {
    this.suggestions = {
      promotion_id: this.filterOptions.promotions,
      etablissement_id: this.filterOptions.etablissements,
      ville_id: this.filterOptions.villes,
      group_id: this.filterOptions.groups,
      option_id: this.filterOptions.options
    };
  }

  /**
   * Commencer l'édition d'une cellule
   */
  startEditingCell(row: number, col: number): void {
    this.editingCell = { row, col };
    const columnName = this.editableHeaders[col];
    
    // Charger les suggestions pour cette colonne
    if (this.suggestions[columnName]) {
      this.cellSuggestions = this.suggestions[columnName];
    } else {
      this.cellSuggestions = [];
    }
  }

  /**
   * Terminer l'édition d'une cellule
   */
  finishEditingCell(): void {
    this.editingCell = null;
    this.cellSuggestions = [];
  }

  /**
   * Mettre à jour la valeur d'une cellule
   */
  updateCellValue(row: number, col: number, value: any): void {
    if (this.editableData[row] && this.editableData[row][col] !== undefined) {
      this.editableData[row][col] = value;
    }
  }

  /**
   * Mise à jour en tapant + suggestions dynamiques
   */
  onEditInput(row: number, col: number, value: string): void {
    this.updateCellValue(row, col, value);
    const columnName = this.editableHeaders[col];
    if (this.suggestions[columnName]) {
      this.cellSuggestions = this.searchSuggestions(columnName, value);
    }
  }

  /**
   * Appliquer une suggestion à une cellule
   */
  applySuggestion(row: number, col: number, suggestion: any): void {
    const columnName = this.editableHeaders[col];
    
    if (columnName.includes('_id')) {
      // Pour les colonnes ID, utiliser l'ID
      this.updateCellValue(row, col, suggestion.id);
    } else {
      // Pour les autres colonnes, utiliser le nom
      this.updateCellValue(row, col, suggestion.name || suggestion.title);
    }
    
    this.finishEditingCell();
  }

  /**
   * Rechercher des suggestions pour une valeur
   */
  searchSuggestions(columnName: string, searchTerm: string): any[] {
    if (!this.suggestions[columnName]) return [];
    
    const suggestions = this.suggestions[columnName];
    const term = searchTerm.toLowerCase();
    
    return suggestions.filter((item: any) => 
      (item.name && item.name.toLowerCase().includes(term)) ||
      (item.title && item.title.toLowerCase().includes(term)) ||
      (item.id && item.id.toString().includes(term))
    );
  }

  trackSuggestion = (_: number, item: any) => item.id;

  /**
   * Valider une cellule spécifique
   */
  validateCell(row: number, col: number): {valid: boolean, message: string, suggestions: any[]} {
    const columnName = this.editableHeaders[col];
    const value = this.editableData[row][col];
    
    // Validation des champs obligatoires
    if (['matricule', 'first_name', 'last_name', 'email', 'password'].includes(columnName)) {
      if (!value || value.toString().trim() === '') {
        return {
          valid: false,
          message: `${columnName} est obligatoire`,
          suggestions: []
        };
      }
    }
    
    // Validation des relations (vérifier contre les données de la base chargées côté client)
    if (columnName.includes('_id')) {
      const suggestions = this.suggestions[columnName] || [];
      const found = suggestions.find((item: any) => 
        item.id.toString() === value.toString() ||
        (item.name && item.name.toLowerCase() === value.toString().toLowerCase()) ||
        (item.title && item.title.toLowerCase() === value.toString().toLowerCase())
      );
      
      if (!found) {
        return {
          valid: false,
          message: `${columnName} introuvable`,
          // Suggestions intelligentes (proches dans la base)
          suggestions: this.getSuggestionCandidates(columnName, value?.toString() || '')
        };
      }
    }
    
    return { valid: true, message: '', suggestions: [] };
  }

  private normalize(input: string): string {
    return (input || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  }

  private levenshteinDistance(a: string, b: string): number {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix: number[][] = Array.from({ length: bn + 1 }, () => new Array(an + 1).fill(0));
    for (let i = 0; i <= bn; i++) matrix[i][0] = i;
    for (let j = 0; j <= an; j++) matrix[0][j] = j;
    for (let i = 1; i <= bn; i++) {
      for (let j = 1; j <= an; j++) {
        const cost = a[j - 1] === b[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    return matrix[bn][an];
  }

  private getSuggestionCandidates(columnName: string, rawValue: string): any[] {
    const list = this.suggestions[columnName] || [];
    const value = this.normalize(rawValue);
    if (!value) return list.slice(0, 5);

    const scored = list.map((item: any) => {
      const candidate = this.normalize(item.name || item.title || item.id?.toString() || '');
      let score = 0;
      if (candidate.includes(value)) score += 50;
      const dist = this.levenshteinDistance(candidate, value);
      score += Math.max(0, 40 - dist);
      if (candidate.startsWith(value)) score += 20;
      return { item, score };
    });

    return scored
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5)
      .map((s: any) => s.item);
  }

  /**
   * Sauvegarder le fichier corrigé
   */
  saveCorrectedFile(): void {
    // Convertir les données en CSV
    const csvContent = this.convertToCSV(this.editableHeaders, this.editableData);
    
    // Créer un nouveau fichier
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const fileName = this.selectedFile?.name.replace('.csv', '_corrected.csv') || 'fichier_corrige.csv';
    
    // Télécharger le fichier corrigé
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.snackBar.open('Fichier corrigé sauvegardé!', 'Fermer', {
      duration: 3000
    });
    
    // Fermer l'éditeur
    this.closeFileEditor();
  }

  /**
   * Obtenir la classe CSS pour une cellule
   */
  getCellClass(row: number, col: number): string {
    const validation = this.validateCell(row, col);
    const isEditing = this.editingCell?.row === row && this.editingCell?.col === col;
    
    let classes = 'relative border';
    
    if (isEditing) {
      classes += ' ring-1 ring-blue-300 border-gray-300';
    } else if (!validation.valid) {
      classes += ' border-red-400';
    } else {
      classes += ' border-gray-200';
    }
    
    return classes;
  }

  /**
   * Convertir les données en format CSV
   */
  convertToCSV(headers: string[], data: any[][]): string {
    const csvRows = [];
    
    // Ajouter les en-têtes
    csvRows.push(headers.join(','));
    
    // Ajouter les données
    data.forEach(row => {
      const escapedRow = row.map(cell => {
        const cellStr = cell ? cell.toString() : '';
        // Échapper les guillemets et les virgules
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      });
      csvRows.push(escapedRow.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Télécharger le modèle avec IDs numériques
   */
  downloadTemplateWithIds(): void {
    const csvContent = 'matricule,first_name,last_name,email,password,promotion_id,etablissement_id,ville_id,group_id,option_id\n' +
                       'ETU2024001,Jean,Dupont,jean.dupont@email.com,password123,1,1,1,1,1\n' +
                       'ETU2024002,Marie,Martin,marie.martin@email.com,password123,2,1,1,1,2\n' +
                       'ETU2024003,Pierre,Durand,pierre.durand@email.com,password123,3,1,1,2,1\n' +
                       'ETU2024004,Sophie,Bernard,sophie.bernard@email.com,password123,4,1,1,2,2\n' +
                       'ETU2024005,Lucas,Moreau,lucas.moreau@email.com,password123,5,1,1,3,1\n' +
                       'ETU2024006,Emma,Petit,emma.petit@email.com,password123,1,1,1,1,1\n' +
                       'ETU2024007,Thomas,Rousseau,thomas.rousseau@email.com,password123,2,1,1,1,2\n' +
                       'ETU2024008,Laura,Moreau,laura.moreau@email.com,password123,3,1,1,2,1\n' +
                       'ETU2024009,Alexandre,Simon,alexandre.simon@email.com,password123,4,1,1,2,2\n' +
                       'ETU2024010,Camille,Laurent,camille.laurent@email.com,password123,5,1,1,3,1';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'modele_etudiants_ids.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    this.snackBar.open('Modèle CSV avec IDs numériques téléchargé!', 'Fermer', {
      duration: 3000
    });
  }
}
