import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-update-exame',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './update-exame.component.html',
  styleUrl: './update-exame.component.css'
})
export class UpdateExameComponent implements OnInit, OnDestroy {
  examenForm: FormGroup;
  loading = false;
  loadingData = true;
  error = '';
  success = '';
  examenId: number = 0;
  
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
  
  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;
  villeFieldDisabled = false;
  etablissementFieldDisabled = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService,
    private router: Router,
    private route: ActivatedRoute,
    private sallesService: SallesService,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {
    this.examenForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      date: ['', Validators.required],
      heure_debut_poigntage: ['', Validators.required],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required],
      tolerance: [15, [Validators.min(0), Validators.max(60)]],
      option_id: [null],
      salle_id: [null, Validators.required],
      promotion_id: [null, Validators.required],
      type_examen_id: [null, Validators.required],
      etablissement_id: [null, Validators.required],
      ville_id: [null, Validators.required],
      group_id: [null],
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
    this.initializeUserContext();
    this.examenId = Number(this.route.snapshot.paramMap.get('id'));
    this.generateAnneesUniversitaires();
    this.loadFilterOptions();
    this.loadTypesExamen();
    this.loadExamen();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialiser le contexte utilisateur et déterminer les permissions
   */
  initializeUserContext() {
    // Récupérer l'utilisateur actuel
    this.currentUser = this.authService.getCurrentUser();
    
    // Récupérer le contexte utilisateur
    this.userContext = this.userContextService.getCurrentUserContext();
    
    if (this.currentUser) {
      // Déterminer le rôle utilisateur
      this.isSuperAdmin = this.currentUser.role_id === 1; // Super Admin
      // Les rôles qui doivent avoir les champs pré-remplis et non modifiables
      // role_id 2 = Admin, role_id 3 = Scolarité, role_id 4 = Doyen, role_id 6 = Enseignant
      this.isAdminEtablissement = [2, 3, 4, 6].includes(this.currentUser.role_id);
      
      // Déterminer si les champs doivent être désactivés
      this.villeFieldDisabled = this.isAdminEtablissement;
      this.etablissementFieldDisabled = this.isAdminEtablissement;
      
      console.log('🔐 Contexte utilisateur initialisé (edit-examen):', {
        user: this.currentUser,
        context: this.userContext,
        isSuperAdmin: this.isSuperAdmin,
        isAdminEtablissement: this.isAdminEtablissement,
        villeFieldDisabled: this.villeFieldDisabled,
        etablissementFieldDisabled: this.etablissementFieldDisabled
      });
    }
  }

  /**
   * Obtenir le nom d'affichage du rôle utilisateur
   */
  getRoleDisplayName(): string {
    if (!this.currentUser) return '';
    const roleNames: { [key: number]: string } = {
      1: 'Super Admin', 2: 'Admin', 3: 'Scolarité', 4: 'Doyen', 5: 'Technicien SI', 6: 'Enseignant'
    };
    return roleNames[this.currentUser.role_id] || 'Utilisateur';
  }

  /**
   * Obtenir le nom de la ville sélectionnée
   */
  getSelectedVilleName(): string {
    const villeId = this.examenForm.value.ville_id;
    if (!villeId) return '';
    const ville = this.villes.find(v => v.id === villeId);
    return ville ? ville.name : '';
  }

  /**
   * Obtenir le nom de l'établissement sélectionné
   */
  getSelectedEtablissementName(): string {
    const etablissementId = this.examenForm.value.etablissement_id;
    if (!etablissementId) return '';
    const etablissement = this.etablissements.find(e => e.id === etablissementId);
    return etablissement ? etablissement.name : '';
  }

  /**
   * Charger l'examen à modifier
   */
  loadExamen() {
    this.loadingData = true;
    this.examensService.getExamenById(this.examenId).subscribe({
      next: (examen) => {
        // Appliquer la logique de permissions pour les utilisateurs non-super-admin
        if (this.isAdminEtablissement && this.currentUser) {
          // Vérifier si l'utilisateur peut modifier cet examen
          const userVilleId = this.userContext?.ville_id || this.currentUser.ville_id;
          const userEtablissementId = this.userContext?.etablissement_id || this.currentUser.etablissement_id;
          
          // Si l'examen n'appartient pas à l'établissement de l'utilisateur, forcer les valeurs
          if (examen.ville_id !== userVilleId || examen.etablissement_id !== userEtablissementId) {
            console.log('🔒 Examen modifié pour correspondre au contexte utilisateur:', {
              examenOriginal: { ville_id: examen.ville_id, etablissement_id: examen.etablissement_id },
              userContext: { ville_id: userVilleId, etablissement_id: userEtablissementId }
            });
            
            examen.ville_id = userVilleId;
            examen.etablissement_id = userEtablissementId;
          }
        }

        this.examenForm.patchValue({
          title: examen.title,
          date: examen.date ? examen.date.split('T')[0] : '',
          heure_debut_poigntage: examen.heure_debut_poigntage,
          heure_debut: examen.heure_debut,
          heure_fin: examen.heure_fin,
          tolerance: examen.tolerance || 15,
          option_id: examen.option_id,
          salle_id: examen.salle_id,
          promotion_id: examen.promotion_id,
          type_examen_id: examen.type_examen_id,
          etablissement_id: examen.etablissement_id,
          ville_id: examen.ville_id,
          group_id: examen.group_id,
          annee_universitaire: examen.annee_universitaire,
          all_groups: !examen.group_id
        });

        // S'assurer que les contrôles sont désactivés après le patchValue
        if (this.isAdminEtablissement) {
          this.disableFormControls();
        }

        this.loadingData = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement de l\'examen';
        this.loadingData = false;
        console.error('Erreur:', error);
      }
    });
  }

  /**
   * Charger les options de filtre
   */
  loadFilterOptions(): void {
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.updateFilteredSalles();
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
          
          // Après le chargement des options, s'assurer que les champs sont bien pré-sélectionnés
          this.ensureFieldsArePreSelected();
          
          // S'assurer que les contrôles sont désactivés après le chargement
          if (this.isAdminEtablissement) {
            this.disableFormControls();
          }
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  /**
   * S'assurer que les champs ville et établissement sont bien pré-sélectionnés
   */
  ensureFieldsArePreSelected() {
    if (this.isAdminEtablissement && this.currentUser) {
      // Vérifier si les champs ne sont pas encore définis
      if (!this.examenForm.value.ville_id && this.currentUser.ville_id) {
        this.examenForm.patchValue({ ville_id: this.currentUser.ville_id });
        console.log('🏙️ Ville pré-sélectionnée:', this.examenForm.value.ville_id);
      }
      
      if (!this.examenForm.value.etablissement_id && this.currentUser.etablissement_id) {
        this.examenForm.patchValue({ etablissement_id: this.currentUser.etablissement_id });
        console.log('🏢 Établissement pré-sélectionné:', this.examenForm.value.etablissement_id);
      }
      
      // Désactiver programmatiquement les contrôles après pré-sélection
      this.disableFormControls();
    }
  }

  /**
   * Désactiver programmatiquement les contrôles du formulaire
   */
  disableFormControls() {
    if (this.villeFieldDisabled) {
      this.examenForm.get('ville_id')?.disable();
      console.log('🔒 Contrôle ville_id désactivé programmatiquement');
    }
    
    if (this.etablissementFieldDisabled) {
      this.examenForm.get('etablissement_id')?.disable();
      console.log('🔒 Contrôle etablissement_id désactivé programmatiquement');
    }
    
    // Vérifier que les contrôles sont bien désactivés
    console.log('🔍 État des contrôles:', {
      ville_id_disabled: this.examenForm.get('ville_id')?.disabled,
      etablissement_id_disabled: this.examenForm.get('etablissement_id')?.disabled,
      villeFieldDisabled: this.villeFieldDisabled,
      etablissementFieldDisabled: this.etablissementFieldDisabled
    });
  }

  /**
   * Charger les types d'examen
   */
  loadTypesExamen(): void {
    this.typesExamenService.getTypesExamenPaginated(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.typesExamen = response.data || [];
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des types d\'examen:', err);
          this.typesExamen = [];
        }
      });
  }

  /**
   * Générer les années universitaires
   */
  generateAnneesUniversitaires(): void {
    const currentYear = new Date().getFullYear();
    this.anneesUniversitaires = [];
    for (let i = 0; i < 5; i++) {
      const year = currentYear - 2 + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
  }

  /**
   * Mettre à jour les salles filtrées
   */
  updateFilteredSalles(): void {
    const term = (this.salleSearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredSalles = [...(this.salles || [])];
      return;
    }
    this.filteredSalles = (this.salles || []).filter((s: any) => {
      const name = (s?.name || '').toString().toLowerCase();
      const batiment = (s?.batiment || '').toString().toLowerCase();
      return name.includes(term) || batiment.includes(term);
    });
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.examenForm.invalid) {
      Object.values(this.examenForm.controls).forEach(c => c.markAsTouched());
      return;
    }

    this.loading = true;
    this.error = '';

    const formData = { ...this.examenForm.value };
    
    // S'assurer que les champs désactivés sont inclus dans les données soumises
    if (this.villeFieldDisabled && this.examenForm.get('ville_id')?.disabled) {
      formData.ville_id = this.examenForm.get('ville_id')?.value;
      console.log('🔒 Ville ID inclus depuis le champ désactivé:', formData.ville_id);
    }
    
    if (this.etablissementFieldDisabled && this.examenForm.get('etablissement_id')?.disabled) {
      formData.etablissement_id = this.examenForm.get('etablissement_id')?.value;
      console.log('🔒 Établissement ID inclus depuis le champ désactivé:', formData.etablissement_id);
    }
    
    // Si tous les groupes sont sélectionnés, mettre group_id à null
    if (formData.all_groups) {
      formData.group_id = null;
    }

    console.log('📤 Données soumises pour modification:', formData);

    this.examensService.updateExamen(this.examenId, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.success = 'Examen modifié avec succès';
          this.loading = false;
          setTimeout(() => {
            this.router.navigate(['/examens']);
          }, 1500);
        },
        error: (err) => {
          console.error('Error updating examen:', err);
          this.error = 'Erreur lors de la modification de l\'examen';
          this.loading = false;
        }
      });
  }

  /**
   * Annuler et retourner à la liste
   */
  onCancel(): void {
    this.router.navigate(['/examens']);
  }

  /**
   * Vérifier si un champ est invalide
   */
  isFieldInvalid(fieldName: string): boolean {
    const field = this.examenForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Obtenir le message d'erreur pour un champ
   */
  getErrorMessage(fieldName: string): string {
    const field = this.examenForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['maxlength']) return `Maximum ${field.errors['maxlength'].requiredLength} caractères`;
      if (field.errors['min']) return `Minimum ${field.errors['min'].min}`;
      if (field.errors['max']) return `Maximum ${field.errors['max'].max}`;
    }
    return '';
  }

  /**
   * Ouvrir le modal d'ajout de salle
   */
  openAddSalleModal(): void {
    const etabId = this.examenForm.value.etablissement_id || null;
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

  /**
   * Fermer le modal d'ajout de salle
   */
  closeAddSalleModal(): void {
    this.showAddSalleModal = false;
  }

  /**
   * Soumettre la nouvelle salle
   */
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
}































