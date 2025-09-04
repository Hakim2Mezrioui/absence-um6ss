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
      option_id: ['', [Validators.required]]
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
          this.error = 'Erreur lors du chargement des options de filtre';
          this.loading = false;
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

    this.loading = true;
    this.error = '';
    this.success = '';

    const studentData: Partial<Etudiant> = {
      ...this.studentForm.value,
      // Générer un mot de passe par défaut ou laisser l'API le gérer
      password: 'defaultPassword123' // Peut être modifié côté backend
    };

    this.etudiantsService.createEtudiant(studentData)
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
  onVilleChange(villeId: number): void {
    // Optionnel: filtrer les établissements par ville
    console.log('Ville sélectionnée:', villeId);
  }

  /**
   * Gestionnaire de changement d'établissement
   */
  onEtablissementChange(etablissementId: number): void {
    // Optionnel: filtrer les options par établissement
    console.log('Établissement sélectionné:', etablissementId);
  }

  /**
   * Gestionnaire de changement de promotion
   */
  onPromotionChange(promotionId: number): void {
    // Optionnel: filtrer les groupes par promotion
    console.log('Promotion sélectionnée:', promotionId);
  }
}
