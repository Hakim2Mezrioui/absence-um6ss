import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

// Services
import { EtudiantsService, Etudiant, FilterOptions } from '../../services/etudiants.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-edit-etudiant',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './edit-etudiant.component.html',
  styleUrl: './edit-etudiant.component.css'
})
export class EditEtudiantComponent implements OnInit, OnDestroy {
  // Form
  etudiantForm!: FormGroup;
  
  // Data
  etudiant: Etudiant | null = null;
  etudiantId: number | null = null;
  
  // Filter options
  promotions: any[] = [];
  etablissements: any[] = [];
  villes: any[] = [];
  groups: any[] = [];
  options: any[] = [];
  
  // States
  loading = false;
  submitting = false;
  error = '';
  
  // Photo
  currentPhoto: string | null = null;
  selectedPhoto: File | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private etudiantsService: EtudiantsService,
    private notificationService: NotificationService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.etudiantId = this.route.snapshot.params['id'];
    if (this.etudiantId) {
      // Charger d'abord les options de filtre, puis les données de l'étudiant
      this.loadFilterOptions();
    } else {
      this.error = 'ID étudiant manquant';
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialiser le formulaire
   */
  private initializeForm(): void {
    this.etudiantForm = this.fb.group({
      first_name: ['', [Validators.required, Validators.minLength(2)]],
      last_name: ['', [Validators.required, Validators.minLength(2)]],
      matricule: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      promotion_id: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      ville_id: ['', Validators.required],
      group_id: ['', Validators.required],
      option_id: ['', Validators.required]
    });
  }

  /**
   * Charger les données de l'étudiant
   */
  private loadEtudiant(): void {
    if (!this.etudiantId) return;
    
    this.loading = true;
    this.error = '';
    
    this.etudiantsService.getEtudiant(this.etudiantId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (etudiant) => {
          console.log('Données reçues de l\'API:', etudiant);
          this.etudiant = etudiant;
          this.populateForm();
          this.currentPhoto = this.etudiant?.photo || null;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'étudiant:', error);
          this.error = 'Erreur lors du chargement des données de l\'étudiant';
          this.loading = false;
        }
      });
  }

  /**
   * Remplir le formulaire avec les données de l'étudiant
   */
  private populateForm(): void {
    if (!this.etudiant) {
      console.log('Aucune donnée d\'étudiant à afficher');
      return;
    }
    
    console.log('Données de l\'étudiant à afficher:', this.etudiant);
    console.log('Options disponibles:', {
      promotions: this.promotions.length,
      etablissements: this.etablissements.length,
      villes: this.villes.length,
      groups: this.groups.length,
      options: this.options.length
    });
    
    const formData = {
      first_name: this.etudiant.first_name,
      last_name: this.etudiant.last_name,
      matricule: this.etudiant.matricule,
      email: this.etudiant.email,
      promotion_id: this.etudiant.promotion_id,
      etablissement_id: this.etudiant.etablissement_id,
      ville_id: this.etudiant.ville_id,
      group_id: this.etudiant.group_id,
      option_id: this.etudiant.option_id
    };
    
    console.log('Données du formulaire à appliquer:', formData);
    
    this.etudiantForm.patchValue(formData);
    
    // Vérifier que les valeurs ont été appliquées
    console.log('Valeurs du formulaire après patchValue:', this.etudiantForm.value);
  }

  /**
   * Charger les options de filtre
   */
  private loadFilterOptions(): void {
    this.etudiantsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options: FilterOptions) => {
          this.promotions = options.promotions || [];
          this.etablissements = options.etablissements || [];
          this.villes = options.villes || [];
          this.groups = options.groups || [];
          this.options = options.options || [];
          
          // Une fois les options chargées, charger les données de l'étudiant
          // Petit délai pour s'assurer que les options sont bien disponibles
          setTimeout(() => {
            this.loadEtudiant();
          }, 100);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des options:', error);
          this.error = 'Erreur lors du chargement des options de filtre';
        }
      });
  }

  /**
   * Gestionnaire de changement de photo
   */
  onPhotoChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    
    if (file) {
      // Vérifier la taille du fichier (2MB max)
      if (file.size > 2 * 1024 * 1024) {
        this.notificationService.error('Erreur', 'La taille du fichier ne doit pas dépasser 2MB');
        return;
      }
      
      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        this.notificationService.error('Erreur', 'Veuillez sélectionner un fichier image valide');
        return;
      }
      
      this.selectedPhoto = file;
      
      // Afficher un aperçu
      const reader = new FileReader();
      reader.onload = (e) => {
        this.currentPhoto = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.etudiantForm.valid && this.etudiantId) {
      this.submitting = true;
      
      const formData = this.prepareFormData();
      
      this.etudiantsService.updateEtudiant(this.etudiantId, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('Étudiant modifié avec succès:', response);
            this.notificationService.success('Succès', 'Étudiant modifié avec succès');
            this.goBack();
          },
          error: (error) => {
            console.error('Erreur lors de la modification:', error);
            this.notificationService.error('Erreur', 'Erreur lors de la modification de l\'étudiant');
            this.submitting = false;
          }
        });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      this.etudiantForm.markAllAsTouched();
    }
  }

  /**
   * Préparer les données du formulaire
   */
  private prepareFormData(): any {
    const formValue = this.etudiantForm.value;
    
    // Si une nouvelle photo est sélectionnée, l'ajouter
    if (this.selectedPhoto) {
      const formData = new FormData();
      
      // Ajouter tous les champs du formulaire
      Object.keys(formValue).forEach(key => {
        if (formValue[key] !== null && formValue[key] !== undefined && formValue[key] !== '') {
          formData.append(key, formValue[key]);
        }
      });
      
      // Ajouter la photo
      formData.append('photo', this.selectedPhoto);
      
      return formData;
    }
    
    return formValue;
  }

  /**
   * Retourner à la liste des étudiants
   */
  goBack(): void {
    this.router.navigate(['/dashboard/etudiants']);
  }

  /**
   * Obtenir le message d'erreur pour un champ
   */
  getFieldError(fieldName: string): string {
    const field = this.etudiantForm.get(fieldName);
    if (field?.errors && field.touched) {
      if (field.errors['required']) {
        return `${this.getFieldLabel(fieldName)} est requis`;
      }
      if (field.errors['minlength']) {
        return `${this.getFieldLabel(fieldName)} doit contenir au moins ${field.errors['minlength'].requiredLength} caractères`;
      }
      if (field.errors['email']) {
        return 'Veuillez entrer un email valide';
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
      'last_name': 'Le nom',
      'matricule': 'Le matricule',
      'email': 'L\'email',
      'promotion_id': 'La promotion',
      'etablissement_id': 'L\'établissement',
      'ville_id': 'La ville',
      'group_id': 'Le groupe',
      'option_id': 'L\'option'
    };
    return labels[fieldName] || fieldName;
  }
}
