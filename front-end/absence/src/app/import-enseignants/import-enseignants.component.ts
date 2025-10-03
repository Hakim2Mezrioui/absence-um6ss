import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EnseignantService, Enseignant } from '../services/enseignant.service';
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
  selector: 'app-import-enseignants',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './import-enseignants.component.html',
  styleUrl: './import-enseignants.component.css'
})
export class ImportEnseignantsComponent implements OnInit, OnDestroy {
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
  villes: any[] = [];
  roles: any[] = [];
  posts: any[] = [];
  
  // Résultats de l'import
  importResults: ImportResults = {
    total: 0,
    success: 0,
    errors: 0,
    details: []
  };
  
  private destroy$ = new Subject<void>();

  constructor(
    private enseignantService: EnseignantService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.importForm = this.fb.group({
      ville_id: ['', Validators.required],
      role_id: ['', Validators.required],
      post_id: ['', Validators.required],
      default_password: ['password123', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Charger les options de filtre
  loadFilterOptions(): void {
    this.enseignantService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // L'API retourne les données dans response.data
          const data = response.data || response;
          this.villes = data.villes || [];
          this.roles = data.roles || [];
          this.posts = data.posts || [];
          console.log('Villes chargées:', this.villes);
          console.log('Rôles chargés:', this.roles);
          console.log('Posts chargés:', this.posts);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.error = 'Erreur lors du chargement des options';
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

  // Importer les enseignants
  importFile(): void {
    if (!this.validateImport()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';
    this.importResults = { total: 0, success: 0, errors: 0, details: [] };

    const formData = this.importForm.value;
    const enseignantsToImport: Partial<Enseignant>[] = [];

    // Préparer les données d'import
    this.filePreview.forEach((item: FilePreviewItem, index: number) => {
      try {
        const enseignant: Partial<Enseignant> = {
          first_name: item.row['first_name'] || item.row['prenom'] || '',
          last_name: item.row['last_name'] || item.row['nom'] || '',
          email: item.row['email'] || '',
          phone: item.row['phone'] || item.row['telephone'] || '',
          ville_id: formData.ville_id,
          role_id: formData.role_id
        };

        // Validation des données
        if (this.validateEnseignantData(enseignant, index + 2)) {
          enseignantsToImport.push(enseignant);
        }
      } catch (err) {
        this.importResults.errors++;
        this.importResults.details.push(`Ligne ${index + 2}: Erreur de formatage des données`);
      }
    });

    if (enseignantsToImport.length === 0) {
      this.error = 'Aucun enseignant valide à importer';
      this.loading = false;
      return;
    }

    // Importer les enseignants un par un
    this.importResults.total = enseignantsToImport.length;
    this.importEnseignantsSequentially(enseignantsToImport, 0, formData);
  }

  // Importer les enseignants séquentiellement
  private importEnseignantsSequentially(enseignants: Partial<Enseignant>[], index: number, formData: any): void {
    if (index >= enseignants.length) {
      this.loading = false;
      this.showImportResults();
      return;
    }

    const enseignantItem = enseignants[index];
    
    // Créer l'enseignant via le service
    const payload = {
      user: {
        first_name: enseignantItem.first_name || '',
        last_name: enseignantItem.last_name || '',
        email: enseignantItem.email || '',
        phone: enseignantItem.phone || '',
        password: formData.default_password,
        role_id: formData.role_id,
        post_id: formData.post_id,
        ville_id: formData.ville_id
      },
      enseignant: {
        ville_id: formData.ville_id
      }
    };

    this.enseignantService.createWithUser(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.importResults.success++;
          this.importResults.details.push(`Ligne ${index + 2}: Importé avec succès`);
          // Importer le suivant
          this.importEnseignantsSequentially(enseignants, index + 1, formData);
        },
        error: (err) => {
          this.importResults.errors++;
          this.importResults.details.push(`Ligne ${index + 2}: ${err.error?.message || 'Erreur d\'import'}`);
          // Continuer avec le suivant
          this.importEnseignantsSequentially(enseignants, index + 1, formData);
        }
      });
  }

  // Valider les données d'un enseignant
  private validateEnseignantData(enseignant: Partial<Enseignant>, lineNumber: number): boolean {
    if (!enseignant.first_name || enseignant.first_name.length < 2) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Prénom invalide (minimum 2 caractères)`);
      return false;
    }

    if (!enseignant.last_name || enseignant.last_name.length < 2) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Nom invalide (minimum 2 caractères)`);
      return false;
    }

    if (!enseignant.email || !this.isValidEmail(enseignant.email)) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Email invalide`);
      return false;
    }

    return true;
  }

  // Valider un email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Afficher les résultats de l'import
  private showImportResults(): void {
    if (this.importResults.success > 0) {
      this.success = `${this.importResults.success} enseignant(s) importé(s) avec succès`;
      
      // Rediriger vers la liste des enseignants après 3 secondes
      setTimeout(() => {
        this.router.navigate(['/dashboard/enseignants']);
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
      link.setAttribute('download', 'modele_enseignants.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // Générer le contenu du modèle CSV
  private generateCSVTemplate(): string {
    const headers = ['first_name', 'last_name', 'email', 'phone'];
    const sampleData = [
      ['Jean', 'Dupont', 'jean.dupont@email.com', '0123456789'],
      ['Marie', 'Martin', 'marie.martin@email.com', '0987654321'],
      ['Pierre', 'Durand', 'pierre.durand@email.com', '0555666777']
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
    this.router.navigate(['/dashboard/enseignants']);
  }
}
