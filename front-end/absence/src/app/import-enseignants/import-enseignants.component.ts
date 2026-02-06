import { Component, EventEmitter, Output, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { EnseignantService, Enseignant } from '../services/enseignant.service';
import { Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';

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
  allFileRows: any[] = []; // Toutes les lignes du fichier Excel pour l'import
  isDragOver = false;
  
  // Options de formulaire
  roles: any[] = [];
  
  // Cache des enseignants existants (email -> enseignant_id)
  private existingEnseignantsMap: Map<string, number> = new Map();
  
  // Résultats de l'import
  importResults: ImportResults = {
    total: 0,
    success: 0,
    errors: 0,
    details: []
  };
  
  private destroy$ = new Subject<void>();
  private readonly DEFAULT_PASSWORD = 'UM6SS@2025';

  constructor(
    private enseignantService: EnseignantService,
    private fb: FormBuilder,
    private router: Router
  ) {
    // Le formulaire n'est plus configuré par l'utilisateur, il sert uniquement
    // à porter des valeurs par défaut déterminées automatiquement.
    this.importForm = this.fb.group({
      role_id: ['']
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
          this.roles = data.roles || [];

          // Choisir automatiquement des valeurs par défaut cohérentes
          const defaultRole = this.roles.find((r: any) => (r.name || '').toLowerCase().includes('enseignant')) || this.roles[0];

          this.importForm.patchValue({
            role_id: defaultRole?.id || ''
          });
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
        this.error = 'Format de fichier non supporté. Utilisez un fichier Excel (.xlsx ou .xls)';
        this.selectedFile = null;
      }
    }
  }

  // Vérifier si le type de fichier est valide
  private isValidFileType(file: File): boolean {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    const validExtensions = ['.xlsx', '.xls'];
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
  }

  // Prévisualiser le fichier
  previewFile(file: File): void {
    if (!this.isValidFileType(file)) {
      this.error = 'Format de fichier non supporté. Utilisez un fichier Excel (.xlsx ou .xls)';
      this.selectedFile = null;
      this.filePreview = [];
      return;
    }

    this.previewExcel(file);
  }

  // Prévisualiser un fichier Excel
  previewExcel(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      if (!worksheet) {
        this.error = 'Le fichier Excel ne contient aucune feuille valide';
        this.filePreview = [];
        return;
      }

      const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      // Stocker toutes les lignes pour l'import
      this.allFileRows = rows.filter((row: any) =>
        Object.values(row).some(val => (val ?? '').toString().trim() !== '')
      );

      // Prévisualiser les 5 premières lignes de données
      this.filePreview = this.allFileRows.slice(0, 5).map((row: any, index: number) => ({
        row,
        // Les données commencent généralement à la ligne 2 (après les en-têtes)
        lineNumber: index + 2
      }));

      this.importResults.total = this.allFileRows.length;
    };
    reader.readAsArrayBuffer(file);
  }

  // Valider le formulaire et le fichier
  validateImport(): boolean {
    if (!this.selectedFile) {
      this.error = 'Veuillez sélectionner un fichier';
      return false;
    }

    const formData = this.importForm.value;
    if (!formData.role_id) {
      this.error = 'Impossible de déterminer le rôle par défaut pour les enseignants';
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
    const enseignantsToImport: any[] = [];

    // Préparer les données d'import depuis toutes les lignes
    this.allFileRows.forEach((row: any, index: number) => {
      try {
        const fullName = (row["Nom et prénom de l'enseignant"] || row['nom_prenom'] || '').toString().trim();
        let firstName = '';
        let lastName = '';

        if (fullName) {
          const parts = fullName.split(/\s+/);
          if (parts.length === 1) {
            lastName = parts[0];
          } else {
            lastName = parts[0];
            firstName = parts.slice(1).join(' ');
          }
        }

        // Normaliser le statut (vacataire/permanent)
        const statutRaw = (row["Statut (vacataire / permanent)"] || row['statut'] || '').toString().trim().toLowerCase();
        let statut: 'vacataire' | 'permanent' | null = null;
        if (statutRaw === 'vacataire' || statutRaw === 'permanent') {
          statut = statutRaw as 'vacataire' | 'permanent';
        }

        const enseignant: any = {
          first_name: firstName || row['first_name'] || row['prenom'] || '',
          last_name: lastName || row['last_name'] || row['nom'] || '',
          email: row['Email'] || row['email'] || '',
          phone: row['Téléphone'] || row['telephone'] || row['phone'] || '',
          statut: statut
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

    // Charger les enseignants existants pour détecter les doublons
    this.loadExistingEnseignants().then(() => {
      // Importer les enseignants un par un
      this.importResults.total = enseignantsToImport.length;
      this.importEnseignantsSequentially(enseignantsToImport, 0, formData);
    }).catch((error) => {
      console.error('Erreur lors du chargement des enseignants existants:', error);
      this.error = 'Erreur lors du chargement des enseignants existants';
      this.loading = false;
    });
  }

  // Charger tous les enseignants existants pour créer un map email -> ID
  private loadExistingEnseignants(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.enseignantService.list(1, 10000, '', 'created_at', 'desc')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.existingEnseignantsMap.clear();
            
            const enseignants = response.data || response || [];
            enseignants.forEach((enseignant: any) => {
              if (enseignant.user?.email) {
                this.existingEnseignantsMap.set(
                  enseignant.user.email.toLowerCase().trim(),
                  enseignant.id
                );
              }
            });
            
            console.log(`Chargé ${this.existingEnseignantsMap.size} enseignants existants`);
            resolve();
          },
          error: (error) => {
            console.error('Erreur lors du chargement des enseignants:', error);
            reject(error);
          }
        });
    });
  }

  // Importer les enseignants séquentiellement
  private importEnseignantsSequentially(enseignants: Partial<Enseignant>[], index: number, formData: any): void {
    if (index >= enseignants.length) {
      this.loading = false;
      this.showImportResults();
      return;
    }

    const enseignantItem = enseignants[index];
    const email = (enseignantItem.email || '').toLowerCase().trim();
    
    // S'assurer que first_name et last_name ne sont pas vides
    const safeFirstName = (enseignantItem.first_name && enseignantItem.first_name.trim().length > 0)
      ? enseignantItem.first_name
      : (enseignantItem.last_name || '');
    const safeLastName = (enseignantItem.last_name && enseignantItem.last_name.trim().length > 0)
      ? enseignantItem.last_name
      : (enseignantItem.first_name || '');
    
    // Vérifier si l'enseignant existe déjà (par email)
    const existingEnseignantId = this.existingEnseignantsMap.get(email);
    
    if (existingEnseignantId) {
      // Mise à jour de l'enseignant existant (sans mot de passe)
      const updatePayload = {
        user: {
          first_name: safeFirstName,
          last_name: safeLastName,
          email: enseignantItem.email || '',
          phone: enseignantItem.phone || '',
          role_id: formData.role_id
          // Pas de password lors de la mise à jour
        },
        enseignant: {
          statut: enseignantItem.statut || null
        }
      };
      
      this.enseignantService.updateWithUser(existingEnseignantId, updatePayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.importResults.success++;
            this.importResults.details.push(`Ligne ${index + 2}: Mis à jour avec succès (email existant: ${enseignantItem.email})`);
            // Importer le suivant
            this.importEnseignantsSequentially(enseignants, index + 1, formData);
          },
          error: (err) => {
            this.importResults.errors++;
            this.importResults.details.push(`Ligne ${index + 2}: Erreur de mise à jour - ${err.error?.message || 'Erreur inconnue'}`);
            // Continuer avec le suivant
            this.importEnseignantsSequentially(enseignants, index + 1, formData);
          }
        });
    } else {
      // Création d'un nouvel enseignant (avec mot de passe)
      const createPayload = {
        user: {
          first_name: safeFirstName,
          last_name: safeLastName,
          email: enseignantItem.email || '',
          phone: enseignantItem.phone || '',
          password: this.DEFAULT_PASSWORD,
          role_id: formData.role_id
        },
        enseignant: {
          statut: enseignantItem.statut || null
        }
      };
      
      this.enseignantService.createWithUser(createPayload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.importResults.success++;
            this.importResults.details.push(`Ligne ${index + 2}: Créé avec succès`);
            
            // Ajouter le nouvel enseignant au map pour éviter les doublons dans le même import
            if (response.data?.id && email) {
              this.existingEnseignantsMap.set(email, response.data.id);
            }
            
            // Importer le suivant
            this.importEnseignantsSequentially(enseignants, index + 1, formData);
          },
          error: (err) => {
            this.importResults.errors++;
            this.importResults.details.push(`Ligne ${index + 2}: Erreur de création - ${err.error?.message || 'Erreur inconnue'}`);
            // Continuer avec le suivant
            this.importEnseignantsSequentially(enseignants, index + 1, formData);
          }
        });
    }
  }

  // Valider les données d'un enseignant
  private validateEnseignantData(enseignant: Partial<Enseignant>, lineNumber: number): boolean {
    const firstName = (enseignant.first_name || '').trim();
    const lastName = (enseignant.last_name || '').trim();

    // On accepte si au moins un des deux (nom ou prénom) a 2 caractères ou plus
    if (firstName.length < 2 && lastName.length < 2) {
      this.importResults.errors++;
      this.importResults.details.push(`Ligne ${lineNumber}: Nom/prénom invalides (au moins un des deux doit avoir 2 caractères ou plus)`);
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
    this.allFileRows = [];
    this.importResults = { total: 0, success: 0, errors: 0, details: [] };
    this.error = '';
    this.success = '';
    this.isDragOver = false;
  }

  // Obtenir les en-têtes du fichier pour l'affichage
  getHeaders(): string[] {
    if (this.filePreview.length === 0) return [];
    return Object.keys(this.filePreview[0].row);
  }

  // Télécharger le modèle CSV
  downloadTemplate(): void {
    const headers = [[
      "Nom et prénom de l'enseignant",
      "Module enseigné",
      "Statut (vacataire / permanent)",
      "Téléphone",
      "Email"
    ]];

    const worksheet = XLSX.utils.aoa_to_sheet(headers);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enseignants');

    XLSX.writeFile(workbook, 'modele_enseignants.xlsx');
  }

  removeFile() {
    this.selectedFile = null;
    this.filePreview = [];
    this.allFileRows = [];
    this.error = '';
    this.success = '';
  }

  goBack() {
    this.router.navigate(['/dashboard/enseignants']);
  }
}
