import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { Location } from '@angular/common';
import { EtudiantsService, Etudiant, FilterOptions } from '../../services/etudiants.service';

// Angular Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-add-student',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './add-student.component.html',
  styleUrl: './add-student.component.css'
})
export class AddStudentComponent implements OnInit, OnDestroy {
  studentForm: FormGroup;
  filterOptions: FilterOptions = {
    promotions: [],
    groups: [],
    villes: [],
    etablissements: [],
    options: []
  };

  // États
  loading = false;
  error = '';
  success = '';

  // Photo upload
  selectedPhoto: File | null = null;
  photoPreview: string | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private etudiantsService: EtudiantsService,
    private router: Router,
    private location: Location,
    private snackBar: MatSnackBar
  ) {
    this.studentForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      matricule: ['', [Validators.required]],
      ville_id: ['', [Validators.required]],
      etablissement_id: ['', [Validators.required]],
      promotion_id: ['', [Validators.required]],
      group_id: ['', [Validators.required]],
      option_id: [''] // Optionnel - toutes les écoles n'utilisent pas les options
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les options de filtre
   */
  loadFilterOptions(): void {
    this.loading = true;
    this.etudiantsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.filterOptions = options;
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          // Conserver les valeurs par défaut en cas d'erreur
          this.error = 'Erreur lors du chargement des options de filtre';
          this.loading = false;
        }
      });
  }

  /**
   * Gérer la sélection de photo
   */
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validation de la taille (2MB max)
      const maxSize = 2 * 1024 * 1024; // 2MB en bytes
      if (file.size > maxSize) {
        this.error = 'La photo est trop volumineuse. Taille maximale : 2MB.';
        input.value = '';
        return;
      }
      
      // Validation du format
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        this.error = 'Format de fichier non supporté. Utilisez JPG, PNG ou WEBP.';
        input.value = '';
        return;
      }
      
      this.selectedPhoto = file;
      
      // Créer une preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
      
      this.error = '';
    }
  }

  /**
   * Supprimer la photo sélectionnée
   */
  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.studentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Créer FormData pour gérer l'upload de la photo
    const formData = new FormData();
    
    // Ajouter les données du formulaire
    formData.append('first_name', this.studentForm.get('first_name')?.value);
    formData.append('last_name', this.studentForm.get('last_name')?.value);
    formData.append('email', this.studentForm.get('email')?.value);
    formData.append('matricule', this.studentForm.get('matricule')?.value);
    formData.append('password', 'defaultPassword123'); // Générer un mot de passe par défaut
    formData.append('ville_id', this.studentForm.get('ville_id')?.value);
    formData.append('etablissement_id', this.studentForm.get('etablissement_id')?.value);
    formData.append('promotion_id', this.studentForm.get('promotion_id')?.value);
    formData.append('group_id', this.studentForm.get('group_id')?.value);
    
    const optionId = this.studentForm.get('option_id')?.value;
    if (optionId) {
      formData.append('option_id', optionId);
    }
    
    // Ajouter la photo si sélectionnée
    if (this.selectedPhoto) {
      formData.append('photo', this.selectedPhoto);
    }

    this.etudiantsService.createEtudiant(formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.success = 'Étudiant créé avec succès!';
          this.snackBar.open('Étudiant créé avec succès!', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Rediriger vers la liste des étudiants après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/dashboard/etudiants']);
          }, 2000);
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la création:', err);
          
          if (err.status === 422) {
            // Erreurs de validation
            this.error = 'Données invalides. Vérifiez les informations saisies.';
            if (err.error && err.error.errors) {
              const errors = err.error.errors;
              let errorMessage = 'Erreurs de validation:\n';
              Object.keys(errors).forEach(key => {
                errorMessage += `• ${errors[key].join(', ')}\n`;
              });
              this.error = errorMessage;
            }
          } else if (err.status === 409) {
            this.error = 'Un étudiant avec ce matricule ou cet email existe déjà.';
          } else {
            this.error = 'Erreur lors de la création de l\'étudiant. Veuillez réessayer.';
          }
          
          this.loading = false;
        }
      });
  }

  /**
   * Marquer tous les champs comme touchés pour afficher les erreurs
   */
  private markFormGroupTouched(): void {
    Object.keys(this.studentForm.controls).forEach(key => {
      const control = this.studentForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Réinitialiser le formulaire
   */
  resetForm(): void {
    this.studentForm.reset();
    this.error = '';
    this.success = '';
    this.selectedPhoto = null;
    this.photoPreview = null;
  }

  /**
   * Retourner à la page précédente
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Gestionnaire de changement de ville
   */
  onVilleChange(event: Event): void {
    const villeId = (event.target as HTMLSelectElement).value;
    // Optionnel: filtrer les établissements par ville
    console.log('Ville sélectionnée:', villeId);
  }

  /**
   * Gestionnaire de changement d'établissement
   */
  onEtablissementChange(event: Event): void {
    const etablissementId = (event.target as HTMLSelectElement).value;
    // Optionnel: filtrer les options par établissement
    console.log('Établissement sélectionné:', etablissementId);
  }

  /**
   * Gestionnaire de changement de promotion
   */
  onPromotionChange(event: Event): void {
    const promotionId = (event.target as HTMLSelectElement).value;
    // Optionnel: filtrer les groupes par promotion
    console.log('Promotion sélectionnée:', promotionId);
  }

  /**
   * Vérifier si un champ est invalide
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.studentForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtenir le message d'erreur pour un champ
   */
  getErrorMessage(fieldName: string): string {
    const field = this.studentForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['email']) {
        return 'Format d\'email invalide';
      }
    }
    return '';
  }

  /**
   * Obtenir le label d'un champ
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      'first_name': 'Le prénom',
      'last_name': 'Le nom de famille',
      'email': 'L\'email',
      'matricule': 'Le matricule',
      'ville_id': 'La ville',
      'etablissement_id': 'L\'établissement',
      'promotion_id': 'La promotion',
      'group_id': 'Le groupe',
      'option_id': 'L\'option (optionnel)'
    };
    return labels[fieldName] || 'Ce champ';
  }
}
