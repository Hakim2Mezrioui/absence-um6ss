import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
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
  selector: 'app-edit-etudiant',
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
  templateUrl: './edit-etudiant.component.html',
  styleUrl: './edit-etudiant.component.css'
})
export class EditEtudiantComponent implements OnInit, OnDestroy {
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
  studentId: number | null = null;
  currentStudent: Etudiant | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private etudiantsService: EtudiantsService,
    private router: Router,
    private route: ActivatedRoute,
    private location: Location,
    private snackBar: MatSnackBar
  ) {
    this.studentForm = this.fb.group({
      first_name: ['', [Validators.required]],
      last_name: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      matricule: [{value: '', disabled: true}], // Désactivé car non modifiable
      ville_id: ['', [Validators.required]],
      etablissement_id: ['', [Validators.required]],
      promotion_id: ['', [Validators.required]],
      group_id: ['', [Validators.required]],
      option_id: [''] // Optionnel - toutes les écoles n'utilisent pas les options
    });
  }

  ngOnInit(): void {
    // Récupérer l'ID de l'étudiant depuis l'URL
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.studentId = +params['id'];
      if (this.studentId) {
        this.loadStudentData();
      }
    });
    
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charger les données de l'étudiant à modifier
   */
  loadStudentData(): void {
    if (!this.studentId) return;

    this.loading = true;
    this.error = '';

    this.etudiantsService.getEtudiant(this.studentId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (student) => {
          this.currentStudent = student;
          this.populateForm(student);
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors du chargement de l\'étudiant:', err);
          
          if (err.status === 404) {
            this.error = 'Étudiant non trouvé.';
          } else {
            this.error = 'Erreur lors du chargement des données de l\'étudiant.';
          }
          
          this.loading = false;
        }
      });
  }

  /**
   * Remplir le formulaire avec les données de l'étudiant
   */
  populateForm(student: Etudiant): void {
    this.studentForm.patchValue({
      first_name: student.first_name,
      last_name: student.last_name,
      email: student.email,
      matricule: student.matricule,
      ville_id: student.ville_id,
      etablissement_id: student.etablissement_id,
      promotion_id: student.promotion_id,
      group_id: student.group_id,
      option_id: student.option_id || ''
    });
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
          this.error = 'Erreur lors du chargement des options de filtre';
        }
      });
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.studentForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    if (!this.studentId) {
      this.error = 'ID de l\'étudiant manquant.';
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    const studentData: Partial<Etudiant> = {
      first_name: this.studentForm.get('first_name')?.value,
      last_name: this.studentForm.get('last_name')?.value,
      email: this.studentForm.get('email')?.value,
      // matricule exclu car non modifiable
      ville_id: this.studentForm.get('ville_id')?.value,
      etablissement_id: this.studentForm.get('etablissement_id')?.value,
      promotion_id: this.studentForm.get('promotion_id')?.value,
      group_id: this.studentForm.get('group_id')?.value,
      option_id: this.studentForm.get('option_id')?.value || null
    };

    this.etudiantsService.updateEtudiant(this.studentId, studentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.success = 'Étudiant modifié avec succès!';
          this.snackBar.open('Étudiant modifié avec succès!', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          
          // Rediriger vers la liste des étudiants après 2 secondes
          setTimeout(() => {
            this.router.navigate(['/etudiants']);
          }, 2000);
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la modification:', err);
          
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
          } else if (err.status === 404) {
            this.error = 'Étudiant non trouvé.';
          } else if (err.status === 409) {
            this.error = 'Un étudiant avec ce matricule ou cet email existe déjà.';
          } else {
            this.error = 'Erreur lors de la modification de l\'étudiant. Veuillez réessayer.';
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
      // Ignorer le matricule car il est désactivé
      if (key !== 'matricule') {
        this.studentForm.get(key)?.markAsTouched();
      }
    });
  }

  /**
   * Vérifier si un champ est invalide
   */
  isFieldInvalid(fieldName: string): boolean {
    // Ignorer la validation du matricule car il est désactivé
    if (fieldName === 'matricule') {
      return false;
    }
    
    const field = this.studentForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * Obtenir le message d'erreur pour un champ
   */
  getErrorMessage(fieldName: string): string {
    const field = this.studentForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return 'Ce champ est obligatoire';
    }
    if (field.errors['email']) {
      return 'Format d\'email invalide';
    }
    if (field.errors['minlength']) {
      return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
    }
    if (field.errors['maxlength']) {
      return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
    }

    return 'Valeur invalide';
  }

  /**
   * Réinitialiser le formulaire
   */
  resetForm(): void {
    if (this.currentStudent) {
      this.populateForm(this.currentStudent);
    } else {
      this.studentForm.reset();
    }
    this.error = '';
    this.success = '';
  }

  /**
   * Retourner à la page précédente
   */
  goBack(): void {
    this.location.back();
  }

  /**
   * Gérer le changement de ville
   */
  onVilleChange(event: any): void {
    const villeId = event.target.value;
    // Réinitialiser les dépendances si nécessaire
    if (villeId !== this.studentForm.get('ville_id')?.value) {
      this.studentForm.patchValue({
        etablissement_id: '',
        promotion_id: '',
        group_id: '',
        option_id: ''
      });
    }
  }

  /**
   * Gérer le changement d'établissement
   */
  onEtablissementChange(event: any): void {
    const etablissementId = event.target.value;
    // Réinitialiser les dépendances si nécessaire
    if (etablissementId !== this.studentForm.get('etablissement_id')?.value) {
      this.studentForm.patchValue({
        promotion_id: '',
        group_id: '',
        option_id: ''
      });
    }
  }

  /**
   * Gérer le changement de promotion
   */
  onPromotionChange(event: any): void {
    const promotionId = event.target.value;
    // Réinitialiser les dépendances si nécessaire
    if (promotionId !== this.studentForm.get('promotion_id')?.value) {
      this.studentForm.patchValue({
        group_id: '',
        option_id: ''
      });
    }
  }

  /**
   * Obtenir le nom complet de l'étudiant
   */
  getFullName(): string {
    if (!this.currentStudent) return '';
    return `${this.currentStudent.first_name} ${this.currentStudent.last_name}`.trim();
  }
}