import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';

@Component({
  selector: 'app-edit-examen',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './edit-examen.component.html',
  styleUrl: './edit-examen.component.css'
})
export class EditExamenComponent implements OnInit, OnDestroy {
  examen: Examen | null = null;
  
  examenForm: FormGroup;
  loading = false;
  error = '';
  
  // Options de formulaire
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  filteredSalles: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  villes: any[] = [];
  typesExamen: TypeExamen[] = [];
  anneesUniversitaires: string[] = [];
  salleSearchTerm = '';

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  salleDropdownOpen = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService,
    private route: ActivatedRoute,
    private router: Router,
    private sallesService: SallesService
  ) {
    this.examenForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      heure_debut_poigntage: [''],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required],
      tolerance: [15, [Validators.min(0), Validators.max(60)]],
      type_examen_id: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      promotion_id: ['', Validators.required],
      option_id: [''],
      salle_id: ['', Validators.required],
      group_id: ['', Validators.required],
      ville_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required],
      all_groups: [false]
    });

    this.newSalleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      batiment: [''],
      etage: [0],
      capacite: [null],
      description: [''],
      etablissement_id: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🎯 EditExamenComponent initialisé');
    
    this.generateAnneesUniversitaires();
    
    // Charger d'abord les options de filtre, puis l'examen
    this.loadFilterOptions();
    this.loadTypesExamen();
    
    // Récupérer l'examen depuis l'URL
    this.route.params.pipe(
      switchMap(params => {
        const id = +params['id'];
        console.log('🆔 ID de l\'examen à récupérer:', id);
        console.log('🔗 URL de l\'API:', `${this.examensService['apiUrl']}/${id}`);
        
        return this.examensService.getExamen(id);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Réponse reçue du backend:', response);
        
        // Extraire l'examen de la réponse
        if (response && response.examen) {
          this.examen = response.examen;
          console.log('✅ Examen extrait avec succès:', this.examen);
          
          // Attendre un peu pour s'assurer que les options sont chargées
          setTimeout(() => {
            this.populateForm();
          }, 500);
        } else if (response && response.id) {
          // Si la réponse est directement l'examen (fallback)
          this.examen = response;
          console.log('✅ Examen reçu directement:', this.examen);
          
          // Attendre un peu pour s'assurer que les options sont chargées
          setTimeout(() => {
            this.populateForm();
          }, 500);
        } else {
          console.error('❌ Structure de réponse inattendue:', response);
          this.error = 'Structure de réponse inattendue du serveur';
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement de l\'examen:', err);
        console.error('📊 Détails de l\'erreur:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url
        });
        
        this.error = `Erreur lors du chargement de l'examen (${err.status || 'Unknown'})`;
        
        // Rediriger vers la liste des examens après un délai
        setTimeout(() => {
          this.router.navigate(['/dashboard/examens']);
        }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  generateAnneesUniversitaires(): void {
    const currentYear = new Date().getFullYear();
    this.anneesUniversitaires = [];
    
    // Générer 5 années avant et 5 années après l'année actuelle
    for (let i = -5; i <= 5; i++) {
      const year = currentYear + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
  }

  populateForm(): void {
    console.log('📝 Tentative de remplissage du formulaire');
    console.log('📊 Examen à utiliser:', this.examen);
    console.log('📊 Options disponibles:', {
      etablissements: this.etablissements.length,
      promotions: this.promotions.length,
      salles: this.salles.length,
      typesExamen: this.typesExamen.length,
      anneesUniversitaires: this.anneesUniversitaires.length
    });
    
    if (this.examen) {
      console.log('✅ Examen trouvé, remplissage du formulaire...');
      
      // Formater les dates et heures pour le formulaire
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        // Extraire la date YYYY-MM-DD du format ISO
        return dateString.split('T')[0];
      };
      
      const formatTime = (timeString: string) => {
        if (!timeString) return '';
        // Si c'est déjà au format HH:MM:SS, extraire HH:MM
        if (timeString.includes(':')) {
          return timeString.substring(0, 5);
        }
        // Si c'est au format ISO, extraire l'heure HH:MM
        return timeString.split('T')[1].substring(0, 5);
      };
      
      const formValues = {
        title: this.examen.title || '',
        date: formatDate(this.examen.date),
        heure_debut_poigntage: this.examen.heure_debut_poigntage ? formatTime(this.examen.heure_debut_poigntage) : '',
        heure_debut: formatTime(this.examen.heure_debut),
        heure_fin: formatTime(this.examen.heure_fin),
        tolerance: this.examen.tolerance || 15,
        type_examen_id: this.examen.type_examen_id ? this.examen.type_examen_id.toString() : '',
        etablissement_id: this.examen.etablissement_id ? this.examen.etablissement_id.toString() : '',
        promotion_id: this.examen.promotion_id ? this.examen.promotion_id.toString() : '',
        option_id: this.examen.option_id ? this.examen.option_id.toString() : '',
        salle_id: this.examen.salle_id ? this.examen.salle_id.toString() : '',
        group_id: this.examen.group_id ? this.examen.group_id.toString() : '',
        ville_id: this.examen.ville_id ? this.examen.ville_id.toString() : '',
        annee_universitaire: this.examen.annee_universitaire || ''
      };
      
      console.log('📋 Valeurs brutes de l\'examen:', {
        date: this.examen.date,
        heure_debut: this.examen.heure_debut,
        heure_fin: this.examen.heure_fin,
        annee_universitaire: this.examen.annee_universitaire,
        type_examen_id: this.examen.type_examen_id,
        etablissement_id: this.examen.etablissement_id
      });
      
      console.log('📋 Valeurs formatées pour le formulaire:', formValues);
      
      this.examenForm.patchValue(formValues);
      
      console.log('✅ Formulaire rempli avec succès');
      console.log('📊 État du formulaire après remplissage:', this.examenForm.value);
      
      // Vérifier si les valeurs sont bien dans le formulaire
      console.log('🔍 Vérification des valeurs du formulaire:');
      console.log('- Title:', this.examenForm.get('title')?.value);
      console.log('- Date:', this.examenForm.get('date')?.value);
      console.log('- Année universitaire:', this.examenForm.get('annee_universitaire')?.value);
      console.log('- Type examen ID:', this.examenForm.get('type_examen_id')?.value);
      console.log('- Établissement ID:', this.examenForm.get('etablissement_id')?.value);
    } else {
      console.error('❌ Aucun examen disponible pour remplir le formulaire');
      this.error = 'Aucun examen à modifier';
    }
  }

  loadFilterOptions(): void {
    console.log('🔧 Chargement des options de filtre...');
    
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Options de filtre reçues:', response);
          
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.updateFilteredSalles();
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
          
          console.log('📊 Options chargées:', {
            etablissements: this.etablissements.length,
            promotions: this.promotions.length,
            salles: this.salles.length,
            options: this.options.length
          });
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des options de filtre:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  loadTypesExamen(): void {
    this.typesExamenService.getTypesExamenPaginated(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.typesExamen = response.data || [];
        },
        error: (err) => {
          console.error('Error loading types examen:', err);
          this.error = 'Erreur lors du chargement des types d\'examen';
        }
      });
  }

  onSubmit(): void {
    if (this.examenForm.valid && this.examen) {
      this.loading = true;
      this.error = '';

      const formData = { ...this.examenForm.value };
      if (formData.group_id === 'ALL') {
        formData.all_groups = true;
        formData.group_id = null;
      }
      
      // Validation de la date et heure
      if (formData.heure_fin <= formData.heure_debut) {
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        this.loading = false;
        return;
      }

      this.examensService.updateExamen(this.examen.id, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Succès', 'Examen modifié avec succès');
            this.loading = false;
            // Rediriger vers la liste des examens
            this.router.navigate(['/dashboard/examens']);
          },
          error: (err) => {
            this.error = 'Erreur lors de la modification de l\'examen';
            console.error('Error updating examen:', err);
            this.loading = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  onSalleSearch(term: string): void {
    this.salleSearchTerm = term || '';
    this.updateFilteredSalles();
  }

  updateFilteredSalles(): void {
    const term = this.salleSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredSalles = [...this.salles];
      return;
    }
    this.filteredSalles = (this.salles || []).filter((s: any) => {
      const name = (s?.name || '').toString().toLowerCase();
      const batiment = (s?.batiment || '').toString().toLowerCase();
      return name.includes(term) || batiment.includes(term);
    });
  }

  openAddSalleModal(): void {
    const etabId = this.examenForm.get('etablissement_id')?.value || null;
    this.newSalleForm.reset({
      name: '',
      batiment: '',
      etage: 0,
      capacite: null,
      description: '',
      etablissement_id: etabId
    });
    this.showAddSalleModal = true;
  }

  closeAddSalleModal(): void {
    this.showAddSalleModal = false;
  }

  toggleSalleDropdown(): void {
    this.salleDropdownOpen = !this.salleDropdownOpen;
  }

  closeSalleDropdown(): void {
    this.salleDropdownOpen = false;
  }

  selectSalle(salle: any): void {
    if (!salle) {
      this.examenForm.patchValue({ salle_id: '' });
    } else {
      this.examenForm.patchValue({ salle_id: salle.id });
    }
    this.closeSalleDropdown();
  }

  getSalleName(id: number | string): string {
    const numericId = Number(id);
    const found = (this.salles || []).find((s: any) => Number(s?.id) === numericId);
    return found?.name || 'Salle sélectionnée';
  }

  submitNewSalle(): void {
    if (this.newSalleForm.invalid) {
      Object.values(this.newSalleForm.controls).forEach(c => c.markAsTouched());
      return;
    }
    const payload: CreateSalleRequest = {
      name: this.newSalleForm.value.name,
      batiment: this.newSalleForm.value.batiment || '',
      etage: Number(this.newSalleForm.value.etage) || 0,
      etablissement_id: Number(this.newSalleForm.value.etablissement_id),
      capacite: this.newSalleForm.value.capacite ? Number(this.newSalleForm.value.capacite) : undefined,
      description: this.newSalleForm.value.description || undefined
    };

    this.loading = true;
    this.sallesService.createSalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const created: Salle = res.salle;
          this.salles = [created, ...this.salles];
          this.updateFilteredSalles();
          this.examenForm.patchValue({ salle_id: created.id });
          this.notificationService.success('Salle créée', 'La salle a été ajoutée et sélectionnée');
          this.closeAddSalleModal();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error creating salle:', err);
          this.notificationService.error('Erreur', 'Impossible de créer la salle');
          this.loading = false;
        }
      });
  }

  resetForm(): void {
    if (this.examen) {
      this.populateForm();
    } else {
      this.examenForm.reset();
    }
    this.error = '';
  }

  markFormGroupTouched(): void {
    Object.keys(this.examenForm.controls).forEach(key => {
      const control = this.examenForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.examenForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['min']) {
        return `La valeur doit être supérieure ou égale à ${control.errors['min'].min}`;
      }
      if (control.errors['max']) {
        return `La valeur doit être inférieure ou égale à ${control.errors['max'].max}`;
      }
    }
    return '';
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.examenForm.get(controlName);
    return !!(control?.invalid && control.touched);
  }
}
