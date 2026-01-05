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
import { BiostarService, BiostarDevice, BiostarDeviceGroup } from '../../services/biostar.service';

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
  allSalles: any[] = []; // Garder une copie de toutes les salles
  filteredSalles: any[] = [];
  selectedSalles: any[] = [];
  options: any[] = [];
  filteredOptions: any[] = [];
  groups: any[] = [];
  villes: any[] = [];
  typesExamen: TypeExamen[] = [];
  anneesUniversitaires: string[] = [];
  salleSearchTerm = '';

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  salleDropdownOpen = false;
  multiSallesOpen: boolean = false;
  
  // Biostar device selection state
  allBiostarDevices: BiostarDevice[] = [];
  biostarDevices: BiostarDevice[] = [];
  filteredBiostarDevices: BiostarDevice[] = [];
  devicesLoading = false;
  devicesError: string | null = null;
  deviceSearch = '';
  
  deviceGroups: BiostarDeviceGroup[] = [];
  filteredDeviceGroups: BiostarDeviceGroup[] = [];
  groupsLoading = false;
  groupsError: string | null = null;
  selectedGroupIds: number[] = [];
  deviceGroupSearch = '';
  
  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;
  villeFieldDisabled = false;
  etablissementFieldDisabled = false;
  
  // Flag pour éviter les déclenchements pendant l'initialisation
  private isInitializing = true;
  private isSettingFormValues = false;
  private etablissementListener: any = null;
  private villeListener: any = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService,
    private router: Router,
    private sallesService: SallesService,
    private authService: AuthService,
    private userContextService: UserContextService,
    private biostarService: BiostarService
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
      salle_id: [''], // Déprécié, gardé pour compatibilité
      salles_ids: [[], Validators.required], // Au moins une salle requise
      group_id: [''], // Permet null pour "Tous"
      ville_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required],
      all_groups: [false],
      tracking_method: ['biostar', Validators.required]
    });

    this.newSalleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      batiment: [''],
      etage: [0],
      capacite: [null],
      description: [''],
      etablissement_id: [null, Validators.required],
      ville_id: [null, Validators.required],
      devices: [[], Validators.required]
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
      // Seuls les Admins (role_id = 2) avec un établissement attribué sont bloqués
      this.isAdminEtablissement = this.currentUser.role_id === 2 && !!this.currentUser.etablissement_id;
      
      // Déterminer si les champs doivent être désactivés
      this.villeFieldDisabled = this.isAdminEtablissement; // conserver le comportement existant si souhaité
      this.etablissementFieldDisabled = this.isAdminEtablissement;
      
      // Pré-remplir les champs pour les utilisateurs non-super-admin
      if (this.isAdminEtablissement) {
        // Marquer que nous sommes en train de configurer les valeurs
        this.isSettingFormValues = true;
        
        // Utiliser directement les données de l'utilisateur si le contexte n'est pas encore disponible
        const villeId = this.userContext?.ville_id || this.currentUser.ville_id;
        const etablissementId = this.userContext?.etablissement_id || this.currentUser.etablissement_id;
        
        if (villeId) {
          this.examenForm.patchValue({ ville_id: villeId });
        }
        if (etablissementId) {
          this.examenForm.patchValue({ etablissement_id: etablissementId });
        }
        
        // Réactiver les listeners après un délai plus long
        setTimeout(() => {
          this.isSettingFormValues = false;
          console.log('✅ Configuration initiale des valeurs terminée');
        }, 200);
        
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
      // Marquer que nous sommes en train de configurer les valeurs
      this.isSettingFormValues = true;
      
      // Vérifier si les champs ne sont pas encore définis
      if (!this.examenForm.value.ville_id && this.currentUser.ville_id) {
        this.examenForm.patchValue({ ville_id: this.currentUser.ville_id });
        console.log('🏙️ Ville pré-sélectionnée:', this.examenForm.value.ville_id);
      }
      
      if (!this.examenForm.value.etablissement_id && this.currentUser.etablissement_id) {
        this.examenForm.patchValue({ etablissement_id: this.currentUser.etablissement_id });
        console.log('🏢 Établissement pré-sélectionné:', this.examenForm.value.etablissement_id);
      }
      
      // Mettre à jour les options filtrées si un établissement est pré-sélectionné
      if (this.examenForm.value.etablissement_id) {
        this.updateFilteredOptions();
      }
      
      // Réactiver les listeners après un délai plus long
      setTimeout(() => {
        this.isSettingFormValues = false;
        console.log('✅ Configuration des valeurs terminée');
      }, 200);
      
      // Désactiver programmatiquement les contrôles après pré-sélection
      this.disableFormControls();
    }
  }

  /**
   * Désactiver temporairement les listeners
   */
  temporarilyDisableListeners(): void {
    if (this.etablissementListener) {
      this.etablissementListener.unsubscribe();
    }
    if (this.villeListener) {
      this.villeListener.unsubscribe();
    }
  }

  /**
   * Réactiver les listeners
   */
  temporarilyEnableListeners(): void {
    if (this.isSuperAdmin) {
      this.setupEtablissementChangeListener();
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
      this.etablissementListener = this.examenForm.get('etablissement_id')?.valueChanges
        .pipe(takeUntil(this.destroy$))
        .subscribe((etablissementId) => {
          console.log('🏢 Changement d\'établissement détecté:', etablissementId);
          this.onEtablissementOrVilleChange();
        });
      
      // Écouter les changements de ville
      this.villeListener = this.examenForm.get('ville_id')?.valueChanges
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
    // Ignorer les changements pendant l'initialisation ou la configuration des valeurs
    if (this.isInitializing || this.isSettingFormValues) {
      console.log('🔄 Changement ignoré pendant l\'initialisation ou la configuration');
      return;
    }

    const etablissementId = this.examenForm.get('etablissement_id')?.value;
    const villeId = this.examenForm.get('ville_id')?.value;
    
    console.log('🔄 Changement détecté:', { etablissementId, villeId });
    
    // Mettre à jour les options filtrées selon l'établissement sélectionné
    this.updateFilteredOptions();
    
    if (!etablissementId || !villeId) {
      console.log('⚠️ Établissement ou ville non sélectionné');
      // Pour les Super Admins, afficher toutes les salles si pas de sélection complète
      if (this.isSuperAdmin) {
        this.salles = [...this.allSalles];
        this.updateFilteredSalles();
      }
      return;
    }

    // Ajouter un délai pour s'assurer que les valeurs sont bien définies
    setTimeout(() => {
      this.reloadSallesForEtablissementAndVille(etablissementId, villeId);
    }, 100);
  }

  /**
   * Recharger les salles pour un établissement et une ville spécifiques
   */
  reloadSallesForEtablissementAndVille(etablissementId: number, villeId: number): void {
    // Pour les Super Admins, filtrer les salles existantes au lieu de recharger depuis le serveur
    if (this.isSuperAdmin) {
      console.log('🔄 Filtrage des salles pour Super Admin:', { etablissementId, villeId });
      
      if (!this.allSalles || this.allSalles.length === 0) {
        console.log('⚠️ Aucune salle disponible pour le filtrage');
        return;
      }
      
      console.log('📥 Salles disponibles pour filtrage:', this.allSalles.map(s => ({
        id: s.id,
        name: s.name,
        etablissement_id: s.etablissement_id,
        ville_id: s.ville_id
      })));
      
      // Filtrer les salles par établissement et ville
      this.salles = this.allSalles.filter((salle: any) => {
        const match = Number(salle.etablissement_id) === Number(etablissementId) && 
                     Number(salle.ville_id) === Number(villeId);
        
        if (match) {
          console.log('✅ Salle correspondante trouvée:', {
            salleId: salle.id,
            salleName: salle.name,
            salleEtablissementId: salle.etablissement_id,
            salleVilleId: salle.ville_id,
            formEtablissementId: etablissementId,
            formVilleId: villeId
          });
        }
        
        return match;
      });
      
      console.log('🔄 Salles filtrées:', {
        etablissementId,
        villeId,
        sallesDisponibles: this.salles.length,
          salles: this.salles.map(s => ({ id: s.id, name: s.name, ville_id: s.ville_id }))
      });
      
      // Mettre à jour les salles filtrées
      this.updateFilteredSalles();
      
      // Réinitialiser la sélection de salles si elles n'appartiennent pas au nouvel établissement/ville
      const currentSallesIds = this.examenForm.get('salles_ids')?.value || [];
      if (currentSallesIds.length > 0) {
        const validSalles = currentSallesIds.filter((id: any) => 
          this.salles.find(s => s.id === id)
        );
        if (validSalles.length !== currentSallesIds.length) {
          this.examenForm.patchValue({ salles_ids: validSalles });
          this.selectedSalles = this.salles.filter(s => validSalles.includes(s.id));
          console.log('🔄 Sélection de salles réinitialisée');
        }
      }
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
          console.log('📥 Données reçues du backend:', response);
          
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.allSalles = response.salles || []; // Garder toutes les salles
          this.salles = [...this.allSalles]; // Copie pour le filtrage
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
          
          console.log('📊 Données chargées:', {
            etablissements: this.etablissements.length,
            promotions: this.promotions.length,
            allSalles: this.allSalles.length,
            salles: this.salles.length,
            options: this.options.length,
            groups: this.groups.length,
            villes: this.villes.length
          });
          
          // Afficher quelques exemples de salles pour debug
          if (this.allSalles.length > 0) {
            console.log('🏢 Exemples de salles:', this.allSalles.slice(0, 3).map(s => ({
              id: s.id,
              name: s.name,
              etablissement_id: s.etablissement_id,
              ville_id: s.ville_id,
              etablissement_id_type: typeof s.etablissement_id,
              ville_id_type: typeof s.ville_id
            })));
          }
          
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
          
          // Mettre à jour les options filtrées selon l'établissement sélectionné
          this.updateFilteredOptions();
          
          // Définir les valeurs par défaut après le chargement des options
          this.setDefaultValues();
          
          // Marquer la fin de l'initialisation après un délai pour s'assurer que tout est configuré
          setTimeout(() => {
            this.isInitializing = false;
            console.log('✅ Initialisation complète terminée');
          }, 500);
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
          this.error = 'Erreur lors du chargement des options';
          this.isInitializing = false;
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
    if (!this.allSalles || this.allSalles.length === 0) {
      console.log('⚠️ Aucune salle disponible pour le filtrage');
      return;
    }

    console.log('🔍 Début du filtrage des salles:', {
      allSallesCount: this.allSalles.length,
      isSuperAdmin: this.isSuperAdmin,
      currentUser: this.currentUser ? {
        etablissement_id: this.currentUser.etablissement_id,
        ville_id: this.currentUser.ville_id
      } : null
    });

    // Super Admin voit toutes les salles, mais peut filtrer par établissement et ville sélectionnés
    if (this.isSuperAdmin) {
      const etablissementId = this.examenForm.get('etablissement_id')?.value;
      const villeId = this.examenForm.get('ville_id')?.value;
      
      console.log('🔓 Super Admin - Valeurs du formulaire:', {
        etablissementId,
        villeId,
        etablissementIdType: typeof etablissementId,
        villeIdType: typeof villeId
      });
      
      if (etablissementId && villeId) {
        this.salles = this.allSalles.filter((salle: any) => {
          const match = Number(salle.etablissement_id) === Number(etablissementId) && 
                       Number(salle.ville_id) === Number(villeId);
          
          if (match) {
            console.log('✅ Salle correspondante trouvée:', {
              salleId: salle.id,
              salleName: salle.name,
              salleVilleId: salle.ville_id,
              formEtablissementId: etablissementId,
              formVilleId: villeId
            });
          }
          
          return match;
        });
        
        console.log('🔓 Super Admin: Filtrage par établissement et ville:', {
          etablissementId,
          villeId,
          sallesOriginales: this.allSalles.length,
          sallesFiltrees: this.salles.length,
          sallesDetails: this.salles.map(s => ({ id: s.id, name: s.name, etablissement_id: s.etablissement_id, ville_id: s.ville_id }))
        });
      } else {
        this.salles = [...this.allSalles];
        console.log('🔓 Super Admin: Affichage de toutes les salles (aucun filtre)');
      }
      return;
    }

    // Les autres rôles voient seulement les salles de leur établissement et ville (pré-définis)
    if (this.currentUser && this.currentUser.etablissement_id && this.currentUser.ville_id) {
      console.log('🔒 Admin - Valeurs utilisateur:', {
        userEtablissementId: this.currentUser.etablissement_id,
        userVilleId: this.currentUser.ville_id,
        userEtablissementIdType: typeof this.currentUser.etablissement_id,
        userVilleIdType: typeof this.currentUser.ville_id
      });

      this.salles = this.allSalles.filter((salle: any) => {
        const match = Number(salle.ville_id) === Number(this.currentUser!.ville_id);
        
        if (match) {
          console.log('✅ Salle correspondante trouvée:', {
            salleId: salle.id,
            salleName: salle.name,
            salleEtablissementId: salle.etablissement_id,
            salleVilleId: salle.ville_id,
            userEtablissementId: this.currentUser!.etablissement_id,
            userVilleId: this.currentUser!.ville_id
          });
        }
        
        return match;
      });
      
      console.log('🔒 Filtrage des salles par établissement et ville (pré-définis):', {
        villeId: this.currentUser.ville_id,
        sallesOriginales: this.allSalles.length,
        sallesFiltrees: this.salles.length,
        sallesDetails: this.salles.map(s => ({ id: s.id, name: s.name, etablissement_id: s.etablissement_id, ville_id: s.ville_id }))
      });
    } else {
      this.salles = [...this.allSalles];
      console.log('⚠️ Utilisateur sans établissement ou ville défini pour le filtrage des salles');
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
      ville_id: villeId,
      devices: []
    });
    this.resetBiostarUi();
    this.showAddSalleModal = true;
    
    // Subscribe to ville_id changes to load devices
    this.newSalleForm.get('ville_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((villeId) => {
        this.onNewSalleVilleChange(villeId);
      });
    
    // Load devices if ville is already set
    if (villeId) {
      this.onNewSalleVilleChange(villeId);
    }
  }

  closeAddSalleModal(): void {
    this.showAddSalleModal = false;
    this.resetBiostarUi();
  }
  
  // Biostar device selection methods
  onNewSalleVilleChange(villeId: number | null): void {
    if (!villeId) {
      this.resetBiostarUi();
      return;
    }
    this.loadDeviceGroupsAndDevices(Number(villeId));
  }
  
  private resetBiostarUi(): void {
    this.allBiostarDevices = [];
    this.biostarDevices = [];
    this.filteredBiostarDevices = [];
    this.deviceSearch = '';
    this.devicesLoading = false;
    this.devicesError = null;
    
    this.deviceGroups = [];
    this.filteredDeviceGroups = [];
    this.groupsLoading = false;
    this.groupsError = null;
    this.selectedGroupIds = [];
    this.deviceGroupSearch = '';
    
    this.newSalleForm.get('devices')?.setValue([]);
  }
  
  private loadDeviceGroupsAndDevices(villeId: number): void {
    this.groupsLoading = true;
    this.groupsError = null;
    this.biostarService.getDeviceGroups(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.deviceGroups = res.groups || [];
          this.filterGroups();
          this.groupsLoading = false;
          this.loadAllDevices(villeId);
        },
        error: (err) => {
          console.error('Erreur lors du chargement des groupes de devices:', err);
          this.deviceGroups = [];
          this.filteredDeviceGroups = [];
          this.groupsLoading = false;
          this.groupsError = err.error?.message || 'Impossible de charger les groupes de devices.';
          this.loadAllDevices(villeId);
        }
      });
  }
  
  private loadAllDevices(villeId: number): void {
    this.devicesLoading = true;
    this.devicesError = null;
    this.biostarService.getDevices(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allBiostarDevices = res.devices || [];
          this.applyGroupFilter();
          this.filterDevices();
          this.devicesLoading = false;
          if ((res.devices || []).length === 0) {
            this.devicesError = 'Aucun device disponible pour cette ville.';
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des devices:', err);
          this.allBiostarDevices = [];
          this.biostarDevices = [];
          this.filteredBiostarDevices = [];
          this.devicesLoading = false;
          this.devicesError = err.error?.message || 'Impossible de charger les devices.';
        }
      });
  }
  
  onGroupSearchInput(value: string): void {
    this.deviceGroupSearch = value || '';
    this.filterGroups();
  }
  
  private filterGroups(): void {
    const term = (this.deviceGroupSearch || '').toLowerCase().trim();
    if (!term) {
      this.filteredDeviceGroups = [...this.deviceGroups];
    } else {
      this.filteredDeviceGroups = this.deviceGroups.filter(g => (g.name || '').toLowerCase().includes(term));
    }
  }
  
  onToggleGroup(groupId: number): void {
    const set = new Set(this.selectedGroupIds);
    if (set.has(groupId)) {
      set.delete(groupId);
    } else {
      set.add(groupId);
    }
    this.selectedGroupIds = Array.from(set);
    this.applyGroupFilter();
    this.filterDevices();
  }
  
  private applyGroupFilter(): void {
    if (!this.selectedGroupIds || this.selectedGroupIds.length === 0) {
      this.biostarDevices = [...this.allBiostarDevices];
      return;
    }
    const set = new Set(this.selectedGroupIds.map(id => Number(id)));
    this.biostarDevices = this.allBiostarDevices.filter(d => d.device_group_id != null && set.has(Number(d.device_group_id)));
  }
  
  onDeviceSearchInput(value: string): void {
    this.deviceSearch = value || '';
    this.filterDevices();
  }
  
  private filterDevices(): void {
    const term = (this.deviceSearch || '').toLowerCase().trim();
    if (!term) {
      this.filteredBiostarDevices = [...this.biostarDevices];
    } else {
      this.filteredBiostarDevices = this.biostarDevices.filter(d => {
        const nameMatch = (d.devnm || '').toLowerCase().includes(term);
        const idMatch = String(d.devid).toLowerCase().includes(term);
        return nameMatch || idMatch;
      });
    }
  }
  
  isDeviceSelected(device: BiostarDevice): boolean {
    const selected = this.newSalleForm.get('devices')?.value || [];
    return selected.some((d: BiostarDevice) => d.devid === device.devid);
  }
  
  toggleDevice(device: BiostarDevice): void {
    const control = this.newSalleForm.get('devices');
    const selected: BiostarDevice[] = [...(control?.value || [])];
    const index = selected.findIndex(d => d.devid === device.devid);
    
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(device);
    }
    
    control?.setValue(selected);
    control?.markAsTouched();
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

  toggleSalleSelection(salle: any): void {
    const index = this.selectedSalles.findIndex(s => s.id === salle.id);
    if (index >= 0) {
      // Désélectionner
      this.selectedSalles.splice(index, 1);
    } else {
      // Sélectionner
      this.selectedSalles.push(salle);
    }
    // Mettre à jour le formulaire
    const sallesIds = this.selectedSalles.map(s => s.id);
    this.examenForm.patchValue({ salles_ids: sallesIds });
    // Garder salle_id pour compatibilité (première salle)
    if (sallesIds.length > 0) {
      this.examenForm.patchValue({ salle_id: sallesIds[0] });
    }
  }

  isSalleSelected(salle: any): boolean {
    return this.selectedSalles.some(s => s.id === salle.id);
  }

  removeSalle(salle: any): void {
    this.selectedSalles = this.selectedSalles.filter(s => s.id !== salle.id);
    const sallesIds = this.selectedSalles.map(s => s.id);
    this.examenForm.patchValue({ salles_ids: sallesIds });
    if (sallesIds.length > 0) {
      this.examenForm.patchValue({ salle_id: sallesIds[0] });
    } else {
      this.examenForm.patchValue({ salle_id: '' });
    }
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
      ville_id: Number(this.newSalleForm.value.ville_id),
      capacite: this.newSalleForm.value.capacite ? Number(this.newSalleForm.value.capacite) : undefined,
      description: this.newSalleForm.value.description || undefined,
      devices: (this.newSalleForm.value.devices || []).map((d: BiostarDevice) => ({
        devid: d.devid,
        devnm: d.devnm
      }))
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
            (created.ville_id === currentVilleId);
          
          if (shouldAddSalle) {
            this.allSalles = [created, ...this.allSalles];
            this.salles = [created, ...this.salles];
            this.updateFilteredSalles();
            // Ajouter à la sélection multiple
            if (!this.isSalleSelected(created)) {
              this.selectedSalles.push(created);
            }
            const sallesIds = this.selectedSalles.map(s => s.id);
            this.examenForm.patchValue({ salles_ids: sallesIds });
            // Garder salle_id pour compatibilité
            if (sallesIds.length > 0) {
              this.examenForm.patchValue({ salle_id: sallesIds[0] });
            }
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
          // Définir les valeurs par défaut après le chargement des types d'examen
          this.setDefaultValues();
        },
        error: (err) => {
          console.error('Error loading types examen:', err);
          this.error = 'Erreur lors du chargement des types d\'examen';
        }
      });
  }

  /**
   * Mettre à jour les options filtrées selon l'établissement sélectionné
   */
  updateFilteredOptions(): void {
    // Toujours inclure "Général" dans les options filtrées
    const generalOption = this.options.find(o => 
      o.name?.toLowerCase().includes('général') || 
      o.name?.toLowerCase().includes('general') ||
      o.name?.toLowerCase().includes('generale')
    );
    
    const etablissementId = this.examenForm.get('etablissement_id')?.value;
    
    if (etablissementId) {
      // Si un établissement est sélectionné, afficher ses options + "Général"
      const etablissementIdNum = Number(etablissementId);
      const etablissementOptions = this.options.filter((o: any) => 
        Number(o.etablissement_id) === etablissementIdNum
      );
      
      // Combiner "Général" avec les options de l'établissement
      this.filteredOptions = [];
      if (generalOption) {
        this.filteredOptions.push(generalOption);
      }
      // Ajouter les options de l'établissement (en excluant "Général" s'il est déjà inclus)
      etablissementOptions.forEach((opt: any) => {
        if (opt.id !== generalOption?.id) {
          this.filteredOptions.push(opt);
        }
      });
    } else {
      // Si aucun établissement n'est sélectionné, afficher uniquement "Général"
      this.filteredOptions = generalOption ? [generalOption] : [];
    }
    
    console.log('📋 Options filtrées:', this.filteredOptions);
  }

  /**
   * Définir les valeurs par défaut pour option_id, group_id et type_examen_id
   */
  setDefaultValues(): void {
    // Définir option_id par défaut (Général) - utiliser filteredOptions
    const generalOption = this.filteredOptions.find(o => 
      o.name?.toLowerCase().includes('général') || 
      o.name?.toLowerCase().includes('general') ||
      o.name?.toLowerCase().includes('generale')
    );
    if (generalOption && !this.examenForm.get('option_id')?.value) {
      this.examenForm.patchValue({ option_id: generalOption.id });
      console.log('📋 Option par défaut définie:', generalOption.name);
    }
    
    // Définir group_id par défaut (Tous)
    if (!this.examenForm.get('group_id')?.value) {
      this.examenForm.patchValue({ group_id: 'ALL' });
      console.log('👥 Groupe par défaut défini: Tous');
    }
    
    // Définir type_examen_id par défaut (Contrôle continu)
    const controleContinu = this.typesExamen.find(t => 
      t.name?.toLowerCase().includes('contrôle continu') || 
      t.name?.toLowerCase().includes('controle continu') ||
      t.name?.toLowerCase().includes('cc')
    );
    if (controleContinu && !this.examenForm.get('type_examen_id')?.value) {
      this.examenForm.patchValue({ type_examen_id: controleContinu.id });
      console.log('📝 Type d\'examen par défaut défini:', controleContinu.name);
    }
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
      
      // Gérer les salles multiples
      if (formData.salles_ids && formData.salles_ids.length > 0) {
        // Conversion en nombres si nécessaire
        formData.salles_ids = formData.salles_ids.map((id: any) => parseInt(id));
      } else if (formData.salle_id) {
        // Fallback sur salle_id si salles_ids vide
        formData.salles_ids = [parseInt(formData.salle_id)];
      }
      
      if (formData.group_id === 'ALL' || formData.group_id === '' || formData.group_id === null) {
        formData.all_groups = true;
        formData.group_id = null;
      } else if (formData.group_id) {
        formData.group_id = parseInt(formData.group_id);
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
            this.notificationService.success('Succès', 'Examen créé avec succès');
            this.loading = false;
            // Rediriger vers la liste des examens
            this.router.navigate(['/examens']);
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
