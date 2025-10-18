import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { Subject, takeUntil } from 'rxjs';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';

@Component({
  selector: 'app-add-examen',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './add-examen.component.html',
  styleUrl: './add-examen.component.css'
})
export class AddExamenComponent implements OnInit, OnDestroy {
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
    private sallesService: SallesService,
    private authService: AuthService,
    private userContextService: UserContextService
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
      etablissement_id: [null, Validators.required],
      ville_id: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    this.initializeUserContext();
    this.generateAnneesUniversitaires();
    // Charger les options après l'initialisation du contexte utilisateur
    this.loadFilterOptions();
    this.loadTypesExamen();
    
    // Écouter les changements d'établissement pour re-filtrer les salles
    this.setupEtablissementChangeListener();
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
      
      // Pré-remplir les champs pour les utilisateurs non-super-admin
      if (this.isAdminEtablissement) {
        // Utiliser directement les données de l'utilisateur si le contexte n'est pas encore disponible
        const villeId = this.userContext?.ville_id || this.currentUser.ville_id;
        const etablissementId = this.userContext?.etablissement_id || this.currentUser.etablissement_id;
        
        if (villeId) {
          this.examenForm.patchValue({ ville_id: villeId });
        }
        if (etablissementId) {
          this.examenForm.patchValue({ etablissement_id: etablissementId });
        }
        
        // Désactiver programmatiquement les contrôles du formulaire
        this.disableFormControls();
      }
      
      console.log('🔐 Contexte utilisateur initialisé:', {
        user: this.currentUser,
        context: this.userContext,
        isSuperAdmin: this.isSuperAdmin,
        isAdminEtablissement: this.isAdminEtablissement,
        villeFieldDisabled: this.villeFieldDisabled,
        etablissementFieldDisabled: this.etablissementFieldDisabled,
        examenVilleId: this.examenForm.value.ville_id,
        examenEtablissementId: this.examenForm.value.etablissement_id
      });
    }
  }

  /**
   * Obtenir le nom d'affichage du rôle utilisateur
   */
  getRoleDisplayName(): string {
    if (!this.currentUser) return '';
    
    const roleNames: { [key: number]: string } = {
      1: 'Super Admin',
      2: 'Admin',
      3: 'Scolarité',
      4: 'Doyen',
      5: 'Technicien SI',
      6: 'Enseignant'
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
   * Configurer l'écoute des changements d'établissement et ville pour re-filtrer les salles
   */
  setupEtablissementChangeListener(): void {
    // Seulement pour les Super Admins car ils peuvent changer d'établissement et ville
    if (this.isSuperAdmin) {
      // Écouter les changements d'établissement
      this.examenForm.get('etablissement_id')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((etablissementId) => {
          console.log('🏢 Changement d\'établissement détecté:', etablissementId);
          this.onEtablissementOrVilleChange();
        });
      
      // Écouter les changements de ville
      this.examenForm.get('ville_id')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((villeId) => {
          console.log('🏙️ Changement de ville détecté:', villeId);
          this.onEtablissementOrVilleChange();
        });
    }
  }

  /**
   * Gérer le changement d'établissement ou de ville
   */
  onEtablissementOrVilleChange(): void {
    const etablissementId = this.examenForm.get('etablissement_id')?.value;
    const villeId = this.examenForm.get('ville_id')?.value;
    
    if (!etablissementId || !villeId) {
      console.log('⚠️ Établissement ou ville non sélectionné');
      return;
    }

    // Recharger les salles filtrées par le nouvel établissement et ville
    this.reloadSallesForEtablissementAndVille(etablissementId, villeId);
  }

  /**
   * Recharger les salles pour un établissement et une ville spécifiques
   */
  reloadSallesForEtablissementAndVille(etablissementId: number, villeId: number): void {
    // Pour les Super Admins, on peut recharger toutes les salles et les filtrer
    if (this.isSuperAdmin) {
      this.examensService.getFilterOptions()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            const allSalles = response.salles || [];
            
            // Filtrer les salles par établissement et ville
            this.salles = allSalles.filter((salle: any) => {
              return salle.etablissement_id === etablissementId && salle.ville_id === villeId;
            });
            
            console.log('🔄 Salles rechargées pour l\'établissement et ville:', {
              etablissementId,
              villeId,
              sallesDisponibles: this.salles.length,
              salles: this.salles.map(s => ({ id: s.id, name: s.name, etablissement_id: s.etablissement_id, ville_id: s.ville_id }))
            });
            
            // Mettre à jour les salles filtrées
            this.updateFilteredSalles();
            
            // Réinitialiser la sélection de salle si elle n'appartient pas au nouvel établissement/ville
            const currentSalleId = this.examenForm.get('salle_id')?.value;
            if (currentSalleId && !this.salles.find(s => s.id === currentSalleId)) {
              this.examenForm.patchValue({ salle_id: '' });
              console.log('🔄 Sélection de salle réinitialisée');
            }
          },
          error: (err) => {
            console.error('Erreur lors du rechargement des salles:', err);
          }
        });
    }
  }

  generateAnneesUniversitaires(): void {
    const currentYear = new Date().getFullYear();
    this.anneesUniversitaires = [];
    
    // Générer 5 années avant et 5 années après l'année actuelle
    for (let i = -5; i <= 5; i++) {
      const year = currentYear + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
    
    // Définir l'année actuelle comme valeur par défaut
    const currentAcademicYear = `${currentYear}-${currentYear + 1}`;
    this.examenForm.patchValue({
      annee_universitaire: currentAcademicYear
    });
  }

  loadFilterOptions(): void {
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
          
          // Filtrer les salles selon le rôle et l'établissement
          this.filterSallesByRoleAndEtablissement();
          
          // Après le chargement des options, s'assurer que les champs sont bien pré-sélectionnés
          this.ensureFieldsArePreSelected();
          
          // S'assurer que les contrôles sont désactivés après le chargement
          if (this.isAdminEtablissement) {
            this.disableFormControls();
          }
          
          // Mettre à jour les salles filtrées après le filtrage initial
          this.updateFilteredSalles();
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  onSalleSearch(term: string): void {
    this.salleSearchTerm = term || '';
    this.updateFilteredSalles();
  }

  /**
   * Filtrer les salles selon le rôle de l'utilisateur, l'établissement et la ville sélectionnés
   */
  filterSallesByRoleAndEtablissement(): void {
    if (!this.salles || this.salles.length === 0) {
      return;
    }

    const etablissementId = this.examenForm.get('etablissement_id')?.value;
    const villeId = this.examenForm.get('ville_id')?.value;

    // Super Admin voit toutes les salles, mais peut filtrer par établissement et ville sélectionnés
    if (this.isSuperAdmin) {
      if (etablissementId && villeId) {
        const originalSalles = [...this.salles];
        this.salles = this.salles.filter((salle: any) => {
          return salle.etablissement_id === etablissementId && salle.ville_id === villeId;
        });
        
        console.log('🔓 Super Admin: Filtrage par établissement et ville:', {
          etablissementId,
          villeId,
          sallesOriginales: originalSalles.length,
          sallesFiltrees: this.salles.length,
          sallesDetails: this.salles.map(s => ({ id: s.id, name: s.name, etablissement_id: s.etablissement_id, ville_id: s.ville_id }))
        });
      } else {
        console.log('🔓 Super Admin: Affichage de toutes les salles (aucun filtre)');
      }
      return;
    }

    // Les autres rôles voient seulement les salles de leur établissement et ville
    if (etablissementId && villeId) {
      const originalSalles = [...this.salles];
      this.salles = this.salles.filter((salle: any) => {
        return salle.etablissement_id === etablissementId && salle.ville_id === villeId;
      });
      
      console.log('🔒 Filtrage des salles par établissement et ville:', {
        etablissementId,
        villeId,
        sallesOriginales: originalSalles.length,
        sallesFiltrees: this.salles.length,
        sallesDetails: this.salles.map(s => ({ id: s.id, name: s.name, etablissement_id: s.etablissement_id, ville_id: s.ville_id }))
      });
    } else {
      console.log('⚠️ Établissement ou ville non sélectionné pour le filtrage des salles');
    }
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
    const villeId = this.examenForm.get('ville_id')?.value || null;
    this.newSalleForm.reset({
      name: '',
      batiment: '',
      etage: 0,
      capacite: null,
      description: '',
      etablissement_id: etabId,
      ville_id: villeId
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
      ville_id: Number(this.newSalleForm.value.ville_id),
      capacite: this.newSalleForm.value.capacite ? Number(this.newSalleForm.value.capacite) : undefined,
      description: this.newSalleForm.value.description || undefined
    };

    this.loading = true;
    this.sallesService.createSalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const created: Salle = res.salle;
          
          // Vérifier si la nouvelle salle appartient à l'établissement et ville actuels
          const currentEtablissementId = this.examenForm.get('etablissement_id')?.value;
          const currentVilleId = this.examenForm.get('ville_id')?.value;
          const shouldAddSalle = this.isSuperAdmin || 
            (created.etablissement_id === currentEtablissementId && created.ville_id === currentVilleId);
          
          if (shouldAddSalle) {
            this.salles = [created, ...this.salles];
            this.updateFilteredSalles();
            this.examenForm.patchValue({ salle_id: created.id });
            this.notificationService.success('Salle créée', 'La salle a été ajoutée et sélectionnée');
          } else {
            this.notificationService.success('Salle créée', 'La salle a été créée mais n\'est pas visible pour cet établissement');
          }
          
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
    if (this.examenForm.valid) {
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

      console.log('📤 Données soumises:', formData);

      this.examensService.createExamen(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Examen ajouté avec succès', 'L\'examen a été créé avec succès');
            this.loading = false;
            // Rediriger vers la liste des examens
            this.router.navigate(['/dashboard/examens']);
          },
          error: (err) => {
            this.error = 'Erreur lors de l\'ajout de l\'examen';
            console.error('Error creating examen:', err);
            this.loading = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm(): void {
    this.examenForm.reset();
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
