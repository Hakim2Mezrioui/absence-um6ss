import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';
import { NotificationService } from '../../services/notification.service';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';
import { BiostarService, BiostarDevice, BiostarDeviceGroup } from '../../services/biostar.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-cours',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './add-cours.component.html',
  styleUrl: './add-cours.component.css'
})
export class AddCoursComponent implements OnInit, OnDestroy {
  cours: Partial<Cours> = {
    name: '',
    date: '',
    pointage_start_hour: '',
    heure_debut: '',
    heure_fin: '',
    tolerance: '00:15', // Valeur par défaut en format time
    attendance_mode: 'normal',
    exit_capture_window: 0,
    tracking_method: 'biostar',
    etablissement_id: 0,
    promotion_id: 0,
    type_cours_id: 0,
    salle_id: 0,
    option_id: undefined,
    ville_id: 0,
    enseignant_id: null,
    annee_universitaire: '' // Sera défini dans generateAnneesUniversitaires()
  };

  // Propriété pour gérer la tolérance en minutes dans le formulaire
  toleranceMinutes: number = 15;
  
  // Propriétés pour le mode bi-check
  isBiCheckMode: boolean = false;
  exitCaptureWindow: number = 15; // Valeur par défaut en minutes

  loading = false;
  error = '';
  success = '';

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  allSalles: any[] = []; // Garder une copie de toutes les salles
  filteredSalles: any[] = [];
  selectedSalles: any[] = [];
  multiSallesOpen: boolean = false;
  typesCours: any[] = [];
  options: any[] = [];
  filteredOptions: any[] = [];
  groups: any[] = [];
  filteredGroups: any[] = [];
  selectedGroups: number[] = [];
  groupsDropdownOpen = false;
  groupSearchTerm = '';
  allGroupsSelected = false;
  villes: any[] = [];
  enseignants: any[] = [];
  filteredEnseignants: any[] = [];
  enseignantDropdownOpen = false;
  enseignantSearchTerm = '';
  salleSearchTerm = '';

  // Années universitaires
  anneesUniversitaires: string[] = [];

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  salleDropdownOpen = false;
  
  // Biostar device selection state
  allBiostarDevices: BiostarDevice[] = [];
  biostarDevices: BiostarDevice[] = [];
  filteredBiostarDevices: BiostarDevice[] = [];
  devicesLoading = false;
  devicesError: string | null = null;
  deviceSearch = '';
  
  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;
  villeFieldDisabled = false;
  etablissementFieldDisabled = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private coursService: CoursService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private sallesService: SallesService,
    private authService: AuthService,
    private userContextService: UserContextService,
    private biostarService: BiostarService
  ) {
    this.newSalleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      batiment: [''],
      etage: [0],
      capacite: [null],
      description: [''],
      ville_id: [null, Validators.required],
      devices: [[], Validators.required]
    });
    
    // Subscribe to ville_id changes to load devices
    this.newSalleForm.get('ville_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((villeId) => {
        if (villeId) {
          this.onNewSalleVilleChange(villeId);
        } else {
          this.resetBiostarUi();
        }
      });
  }

  ngOnInit() {
    this.initializeUserContext();
    this.generateAnneesUniversitaires();
    // Charger les options après l'initialisation du contexte utilisateur
    this.loadFilterOptions();
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
          this.cours.ville_id = villeId;
        }
        if (etablissementId) {
          this.cours.etablissement_id = etablissementId;
        }
        
        console.log('🔒 Champs pré-remplis et désactivés pour utilisateur non-super-admin');
      }
      
      console.log('🔐 Contexte utilisateur initialisé:', {
        user: this.currentUser,
        context: this.userContext,
        isSuperAdmin: this.isSuperAdmin,
        isAdminEtablissement: this.isAdminEtablissement,
        villeFieldDisabled: this.villeFieldDisabled,
        etablissementFieldDisabled: this.etablissementFieldDisabled,
        coursVilleId: this.cours.ville_id,
        coursEtablissementId: this.cours.etablissement_id
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
    if (!this.cours.ville_id) return '';
    const ville = this.villes.find(v => v.id === this.cours.ville_id);
    return ville ? ville.name : '';
  }

  /**
   * Obtenir le nom de l'établissement sélectionné
   */
  getSelectedEtablissementName(): string {
    if (!this.cours.etablissement_id) return '';
    const etablissement = this.etablissements.find(e => e.id === this.cours.etablissement_id);
    return etablissement ? etablissement.name : '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    
    // Fermer le dropdown des salles si on clique en dehors
    if (this.multiSallesOpen) {
      const salleDropdown = target.closest('.salle-dropdown');
      const salleButton = target.closest('.salle-dropdown-button');
      
      if (!salleDropdown && !salleButton) {
        this.multiSallesOpen = false;
      }
    }
    
    // Fermer le dropdown des enseignants si on clique en dehors
    if (this.enseignantDropdownOpen) {
      const enseignantDropdown = target.closest('.enseignant-dropdown');
      const enseignantButton = target.closest('#enseignant-dropdown-button');
      
      if (!enseignantDropdown && !enseignantButton) {
        this.closeEnseignantDropdown();
      }
    }
    
    // Fermer le dropdown des groupes si on clique en dehors
    if (this.groupsDropdownOpen) {
      const groupsDropdown = target.closest('.groups-dropdown');
      const groupsButton = target.closest('.groups-dropdown-button');
      
      if (!groupsDropdown && !groupsButton) {
        this.groupsDropdownOpen = false;
      }
    }
  }


  loadFilterOptions() {
    this.coursService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.etablissements = options.etablissements || [];
          this.promotions = options.promotions || [];
          this.salles = options.salles || [];
          this.allSalles = [...this.salles]; // Garder une copie de toutes les salles
          
          // Filtrer les salles selon le rôle et l'établissement
          this.filterSallesByRoleAndEtablissement();
          
          this.updateFilteredSalles();
          this.typesCours = options.types_cours || [];
          this.options = options.options || [];
          
          // Filtrer les options : au début, afficher uniquement "Général"
          this.updateFilteredOptions();
          
          this.groups = options.groups || [];
          this.filteredGroups = this.groups || []; // Charger tous les groupes par défaut
          this.villes = options.villes || [];
          this.enseignants = options.enseignants || [];
          this.filteredEnseignants = [...this.enseignants];
          
          // Après le chargement des options, s'assurer que les champs sont bien pré-sélectionnés
          this.ensureFieldsArePreSelected();
          
          // Définir les valeurs par défaut
          this.setDefaultValues();
        },
        error: (error) => {
          this.error = 'Erreur lors du chargement des options';
          console.error('Erreur:', error);
        }
      });
  }

  /**
   * S'assurer que les champs ville et établissement sont bien pré-sélectionnés
   */
  ensureFieldsArePreSelected() {
    if (this.isAdminEtablissement && this.currentUser) {
      // Vérifier si les champs ne sont pas encore définis
      if (!this.cours.ville_id && this.currentUser.ville_id) {
        this.cours.ville_id = this.currentUser.ville_id;
        console.log('🏙️ Ville pré-sélectionnée:', this.cours.ville_id);
      }
      
      if (!this.cours.etablissement_id && this.currentUser.etablissement_id) {
        this.cours.etablissement_id = this.currentUser.etablissement_id;
        console.log('🏢 Établissement pré-sélectionné:', this.cours.etablissement_id);
      }
      
      // Mettre à jour les options filtrées si un établissement est pré-sélectionné
      if (this.cours.etablissement_id) {
        this.updateFilteredOptions();
      }
      
      console.log('🔒 Champs pré-sélectionnés et désactivés pour utilisateur non-super-admin');
    }
  }

  /**
   * Définir les valeurs par défaut pour type_cours_id et option_id
   */
  setDefaultValues(): void {
    // Définir type_cours_id par défaut (Cours Magistral)
    const coursMagistral = this.typesCours.find(t => 
      t.name?.toLowerCase().includes('magistral') || 
      t.name?.toLowerCase().includes('cours magistral')
    );
    if (coursMagistral && !this.cours.type_cours_id) {
      this.cours.type_cours_id = coursMagistral.id;
      console.log('📚 Type de cours par défaut défini:', coursMagistral.name);
    }
    
    // Définir option_id par défaut (Général) - mais seulement si "Général" est dans filteredOptions
    const generalOption = this.filteredOptions.find(o => 
      o.name?.toLowerCase().includes('général') || 
      o.name?.toLowerCase().includes('general') ||
      o.name?.toLowerCase().includes('generale')
    );
    if (generalOption && !this.cours.option_id) {
      this.cours.option_id = generalOption.id;
      console.log('📋 Option par défaut définie:', generalOption.name);
    }
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
    
    if (this.cours.etablissement_id) {
      // Si un établissement est sélectionné, afficher ses options + "Général"
      const etablissementId = Number(this.cours.etablissement_id);
      const etablissementOptions = this.options.filter((o: any) => 
        Number(o.etablissement_id) === etablissementId
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
   * Filtrer les salles selon le rôle de l'utilisateur, l'établissement et la ville sélectionnés
   */
  filterSallesByRoleAndEtablissement(): void {
    // Afficher toutes les salles sans filtrage par établissement/faculté
    if (this.salles && this.salles.length > 0) {
      console.log('📋 Affichage de toutes les salles:', this.salles.length);
    } else {
      console.log('⚠️ Aucune salle disponible');
    }
  }

  generateAnneesUniversitaires() {
    const currentYear = new Date().getFullYear();
    
    // Générer 5 années avant et 5 années après l'année actuelle
    for (let i = -5; i <= 5; i++) {
      const year = currentYear + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
    
    // Trier les années par ordre décroissant (plus récentes en premier)
    this.anneesUniversitaires.sort((a, b) => {
      const yearA = parseInt(a.split('-')[0]);
      const yearB = parseInt(b.split('-')[0]);
      return yearB - yearA;
    });
    
    // Sélectionner l'année actuelle par défaut
    this.cours.annee_universitaire = `${currentYear}-${currentYear + 1}`;
  }

  onSubmit() {
    console.log('🚀 onSubmit() appelé');
    console.log('📋 État du formulaire:', this.cours);
    
    if (!this.validateForm()) {
      console.log('❌ Validation échouée, arrêt du processus');
      return;
    }

    console.log('✅ Validation réussie, démarrage de la soumission');
    this.loading = true;
    this.error = '';
    this.success = '';

    // Conversion des IDs en nombres et de la tolérance en format time
    const sallesIds = this.selectedSalles.map(s => s.id);
    
    const coursData: Partial<Cours> = {
      ...this.cours,
      etablissement_id: Number(this.cours.etablissement_id),
      promotion_id: Number(this.cours.promotion_id),
      type_cours_id: Number(this.cours.type_cours_id),
      salle_id: sallesIds.length > 0 ? Number(sallesIds[0]) : Number(this.cours.salle_id), // Garder pour compatibilité
      salles_ids: sallesIds.length > 0 ? sallesIds : (this.cours.salle_id ? [Number(this.cours.salle_id)] : []),
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined,
      ville_id: Number(this.cours.ville_id),
      enseignant_id: this.cours.enseignant_id ? Number(this.cours.enseignant_id) : null,
      tolerance: this.formatToleranceToTime(this.toleranceMinutes),
      attendance_mode: (this.isBiCheckMode ? 'bicheck' : 'normal') as 'normal' | 'bicheck',
      exit_capture_window: this.isBiCheckMode ? Number(this.exitCaptureWindow) : 0,
      group_ids: this.selectedGroups // Envoyer les groupes sélectionnés
    };

    console.log('📤 Données cours soumises:', coursData);
    console.log('🌐 Appel API en cours...');

    this.coursService.createCours(coursData).subscribe({
      next: (response) => {
        console.log('✅ Cours créé avec succès:', response);
        this.success = 'Cours créé avec succès';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/cours']);
        }, 1500);
      },
      error: (error) => {
        console.log('❌ Erreur lors de la création du cours:', error);
        this.error = 'Erreur lors de la création du cours';
        this.loading = false;
        console.error('Erreur:', error);
      }
    });
  }

  validateForm(): boolean {
    console.log('🔍 Début de la validation du formulaire');
    
    if (!this.cours.name?.trim()) {
      console.log('❌ Validation échouée: nom du cours manquant');
      this.error = 'Le nom du cours est requis';
      return false;
    }

    if (!this.cours.date) {
      console.log('❌ Validation échouée: date manquante');
      this.error = 'La date est requise';
      return false;
    }

    if (!this.cours.pointage_start_hour) {
      console.log('❌ Validation échouée: heure de début de pointage manquante');
      this.error = 'L\'heure de début de pointage est requise';
      return false;
    }

    if (!this.cours.heure_debut) {
      console.log('❌ Validation échouée: heure de début manquante');
      this.error = 'L\'heure de début est requise';
      return false;
    }

    if (!this.cours.heure_fin) {
      console.log('❌ Validation échouée: heure de fin manquante');
      this.error = 'L\'heure de fin est requise';
      return false;
    }

    if (!this.toleranceMinutes || this.toleranceMinutes <= 0) {
      console.log('❌ Validation échouée: tolérance invalide');
      this.error = 'La tolérance en minutes est requise (minimum 1 minute)';
      return false;
    }

    if (!this.cours.etablissement_id || this.cours.etablissement_id === 0) {
      console.log('❌ Validation échouée: établissement manquant');
      this.error = 'L\'établissement est requis';
      return false;
    }

    if (!this.cours.promotion_id || this.cours.promotion_id === 0) {
      console.log('❌ Validation échouée: promotion manquante');
      this.error = 'La promotion est requise';
      return false;
    }

    if (!this.cours.type_cours_id || this.cours.type_cours_id === 0) {
      console.log('❌ Validation échouée: type de cours manquant');
      this.error = 'Le type de cours est requis';
      return false;
    }

    if ((!this.selectedSalles || this.selectedSalles.length === 0) && (!this.cours.salle_id || this.cours.salle_id === 0)) {
      console.log('❌ Validation échouée: salle manquante');
      this.error = 'Au moins une salle est requise';
      return false;
    }

    if (!this.cours.ville_id || this.cours.ville_id === 0) {
      console.log('❌ Validation échouée: ville manquante');
      this.error = 'La ville est requise';
      return false;
    }

    if (!this.cours.annee_universitaire) {
      console.log('❌ Validation échouée: année universitaire manquante');
      this.error = 'L\'année universitaire est requise';
      return false;
    }

    // Validation des heures
    if (this.cours.heure_debut && this.cours.heure_fin) {
      if (this.cours.heure_debut >= this.cours.heure_fin) {
        console.log('❌ Validation échouée: heure de fin doit être postérieure à l\'heure de début');
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        return false;
      }
    }

    // Validation du mode bi-check
    if (this.isBiCheckMode) {
      if (!this.exitCaptureWindow || this.exitCaptureWindow <= 0 || this.exitCaptureWindow > 120) {
        console.log('❌ Validation échouée: fenêtre de capture sortie invalide');
        this.error = 'La fenêtre de capture sortie doit être entre 1 et 120 minutes';
        return false;
      }
    }

    console.log('✅ Toutes les validations sont passées');
    return true;
  }

  onBiCheckModeChange() {
    if (!this.isBiCheckMode) {
      this.exitCaptureWindow = 15; // Réinitialiser à la valeur par défaut
    }
  }

  onCancel() {
    this.router.navigate(['/cours']);
  }

  clearError() {
    this.error = '';
  }

  resetForm() {
    const currentYear = new Date().getFullYear();
    
    this.cours = {
      name: '',
      date: '',
      pointage_start_hour: '',
      heure_debut: '',
      heure_fin: '',
      tolerance: '00:15',
      attendance_mode: 'normal',
      exit_capture_window: 0,
      tracking_method: 'biostar',
      etablissement_id: 0,
      promotion_id: 0,
      type_cours_id: 0,
      salle_id: 0,
      salles_ids: [],
      option_id: undefined,
      ville_id: 0,
      enseignant_id: null,
      annee_universitaire: `${currentYear}-${currentYear + 1}`
    };
    this.toleranceMinutes = 15;
    this.isBiCheckMode = false;
    this.exitCaptureWindow = 15;
    this.selectedSalles = [];
    this.selectedGroups = [];
    this.error = '';
    this.success = '';
  }

  /**
   * Calculer l'heure limite de pointage (heure de début + tolérance)
   */
  calculatePointageEndTime(): string {
    if (!this.cours.heure_debut || !this.toleranceMinutes) {
      return '';
    }

    try {
      const [hours, minutes] = this.cours.heure_debut.split(':').map(Number);
      
      // Ajouter la tolérance en minutes
      const totalMinutes = hours * 60 + minutes + this.toleranceMinutes;
      
      // Calculer les nouvelles heures et minutes
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      // Formater l'heure
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Mettre à jour l'heure de pointage automatiquement
   */
  onHeureDebutChange() {
    // L'heure de pointage reste indépendante de l'heure de début
    // L'utilisateur peut la définir manuellement
  }

  /**
   * Mettre à jour l'heure de pointage quand la tolérance change
   */
  onToleranceChange() {
    // L'heure de pointage reste indépendante de la tolérance
    // L'utilisateur peut la définir manuellement
  }

  /**
   * Gérer le changement de ville
   */
  onVilleChange() {
    // Réinitialiser les groupes sélectionnés
    this.selectedGroups = [];
    // Mettre à jour la liste des groupes disponibles
    this.updateFilteredGroups();
    // Mettre à jour la liste des salles disponibles
    this.updateFilteredSalles();
  }

  /**
   * Gérer le changement d'établissement
   */
  onEtablissementChange() {
    // Réinitialiser les groupes sélectionnés
    this.selectedGroups = [];
    // Mettre à jour la liste des groupes disponibles
    this.updateFilteredGroups();
    // Mettre à jour la liste des salles disponibles
    this.updateFilteredSalles();
    // Mettre à jour les options filtrées selon l'établissement
    this.updateFilteredOptions();
  }

  /**
   * Convertir la tolérance en minutes vers le format time (HH:MM)
   */
  formatToleranceToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Méthodes pour la gestion des salles
  onSalleSearch(term: string): void {
    this.salleSearchTerm = term || '';
    this.updateFilteredSalles();
  }

  onEnseignantSearch(term: string): void {
    this.enseignantSearchTerm = term || '';
    this.updateFilteredEnseignants();
  }

  updateFilteredEnseignants(): void {
    const term = this.enseignantSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredEnseignants = this.enseignants;
      return;
    }
    
    this.filteredEnseignants = this.enseignants.filter((e: any) => {
      const name = (e?.name || '').toString().toLowerCase();
      const email = (e?.email || '').toString().toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }

  selectEnseignant(enseignant: any): void {
    this.cours.enseignant_id = enseignant.id;
    this.enseignantDropdownOpen = false;
    this.enseignantSearchTerm = '';
    this.updateFilteredEnseignants();
  }

  clearEnseignant(): void {
    this.cours.enseignant_id = null;
    this.enseignantDropdownOpen = false;
    this.enseignantSearchTerm = '';
    this.updateFilteredEnseignants();
  }

  getSelectedEnseignantName(): string {
    if (!this.cours.enseignant_id) return '';
    const enseignant = this.enseignants.find(e => e.id === this.cours.enseignant_id);
    return enseignant ? enseignant.name : '';
  }

  toggleEnseignantDropdown(): void {
    this.enseignantDropdownOpen = !this.enseignantDropdownOpen;
    if (this.enseignantDropdownOpen) {
      this.updateFilteredEnseignants();
    }
  }

  closeEnseignantDropdown(): void {
    this.enseignantDropdownOpen = false;
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
    // Mettre à jour le cours pour compatibilité
    if (this.selectedSalles.length > 0) {
      this.cours.salle_id = this.selectedSalles[0].id;
    } else {
      this.cours.salle_id = 0;
    }
  }

  isSalleSelected(salle: any): boolean {
    return this.selectedSalles.some(s => s.id === salle.id);
  }

  removeSalle(salle: any): void {
    this.selectedSalles = this.selectedSalles.filter(s => s.id !== salle.id);
    if (this.selectedSalles.length > 0) {
      this.cours.salle_id = this.selectedSalles[0].id;
    } else {
      this.cours.salle_id = 0;
    }
  }

  updateFilteredSalles(): void {
    const term = this.salleSearchTerm.trim().toLowerCase();
    const etablissementId = this.cours?.etablissement_id;
    const villeId = this.cours?.ville_id;
    
    // Filtrer d'abord par établissement et ville
    let filteredByLocation = [...this.allSalles];
    if (etablissementId && villeId) {
      filteredByLocation = (this.allSalles || []).filter((s: any) => {
        return s?.etablissement_id == etablissementId && s?.ville_id == villeId;
      });
      console.log('🏢 Salles filtrées par établissement et ville (add-cours):', {
        etablissementId: etablissementId,
        villeId: villeId,
        totalSalles: this.allSalles.length,
        sallesFiltrees: filteredByLocation.length
      });
    } else if (etablissementId) {
      // Si seulement l'établissement est sélectionné
      filteredByLocation = (this.allSalles || []).filter((s: any) => {
        return s?.etablissement_id == etablissementId;
      });
      console.log('🏢 Salles filtrées par établissement seulement (add-cours):', {
        etablissementId: etablissementId,
        totalSalles: this.allSalles.length,
        sallesFiltrees: filteredByLocation.length
      });
    }
    
    // Mettre à jour la liste des salles disponibles
    this.salles = filteredByLocation;
    
    // Ensuite filtrer par terme de recherche
    if (!term) {
      this.filteredSalles = filteredByLocation;
      return;
    }
    
    this.filteredSalles = filteredByLocation.filter((s: any) => {
      const name = (s?.name || '').toString().toLowerCase();
      const batiment = (s?.batiment || '').toString().toLowerCase();
      return name.includes(term) || batiment.includes(term);
    });
  }

  // Groups dropdown helpers
  onGroupSearch(term: string): void {
    this.groupSearchTerm = term || '';
    this.updateFilteredGroups();
  }

  updateFilteredGroups(): void {
    // Charger tous les groupes sans nécessiter ville/établissement
    let availableGroups = this.groups || [];
    
    // Appliquer le filtre de recherche si nécessaire
    const term = (this.groupSearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredGroups = availableGroups;
    } else {
      this.filteredGroups = availableGroups.filter((g: any) => {
        const name = (g?.name || '').toString().toLowerCase();
        return name.includes(term);
      });
    }
    
    // Mettre à jour l'état du checkbox "Tous"
    this.allGroupsSelected = this.areAllGroupsSelected();
    
    console.log('📊 Groupes filtrés finaux:', this.filteredGroups);
  }

  // Nouvelle méthode pour charger les groupes par ville et établissement
  loadGroupsByLocation(villeId: number, etablissementId: number): void {
    console.log('🔍 Chargement des groupes pour ville:', villeId, 'établissement:', etablissementId);
    
    // Appel à l'API pour récupérer les groupes filtrés
    this.coursService.getGroupsByLocation(villeId, etablissementId).subscribe({
      next: (groups) => {
        console.log('📊 Groupes reçus de l\'API:', groups);
        
        // Appliquer le filtre de recherche si nécessaire
        const term = (this.groupSearchTerm || '').trim().toLowerCase();
        if (!term) {
          this.filteredGroups = groups || [];
        } else {
          this.filteredGroups = (groups || []).filter((g: any) => {
            const name = (g?.name || '').toString().toLowerCase();
            return name.includes(term);
          });
        }
        
        console.log('📊 Groupes filtrés finaux:', this.filteredGroups);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des groupes:', error);
        this.filteredGroups = [];
      }
    });
  }

  toggleGroupsDropdown(): void {
    this.groupsDropdownOpen = !this.groupsDropdownOpen;
    if (this.groupsDropdownOpen) {
      // Mettre à jour les groupes filtrés quand on ouvre le dropdown
      this.updateFilteredGroups();
    }
  }

  isGroupSelected(groupId: number): boolean {
    return this.selectedGroups.includes(groupId);
  }

  toggleGroupSelection(groupId: number): void {
    const index = this.selectedGroups.indexOf(groupId);
    if (index > -1) {
      this.selectedGroups.splice(index, 1);
    } else {
      this.selectedGroups.push(groupId);
    }
    // Mettre à jour l'état du checkbox "Tous"
    this.allGroupsSelected = this.areAllGroupsSelected();
  }

  getGroupName(groupId: number): string {
    // Chercher d'abord dans les groupes filtrés, puis dans tous les groupes
    let group = this.filteredGroups.find(g => g.id === groupId);
    if (!group) {
      group = this.groups.find(g => g.id === groupId);
    }
    return group ? group.name : 'Groupe inconnu';
  }

  /**
   * Vérifier si tous les groupes filtrés sont sélectionnés
   */
  areAllGroupsSelected(): boolean {
    return this.filteredGroups.length > 0 && 
           this.filteredGroups.every(g => this.selectedGroups.includes(g.id));
  }

  /**
   * Sélectionner ou désélectionner tous les groupes filtrés
   */
  toggleAllGroups(): void {
    if (this.areAllGroupsSelected()) {
      // Désélectionner tous les groupes filtrés
      this.filteredGroups.forEach(g => {
        const index = this.selectedGroups.indexOf(g.id);
        if (index > -1) {
          this.selectedGroups.splice(index, 1);
        }
      });
    } else {
      // Sélectionner tous les groupes filtrés
      this.filteredGroups.forEach(g => {
        if (!this.selectedGroups.includes(g.id)) {
          this.selectedGroups.push(g.id);
        }
      });
    }
    this.allGroupsSelected = this.areAllGroupsSelected();
  }

  openAddSalleModal(): void {
    const etabId = this.cours.etablissement_id || null;
    const villeId = this.cours.ville_id || null;
    this.newSalleForm.reset({
      name: '',
      batiment: '',
      etage: 0,
      capacite: null,
      description: '',
      etablissement_id: etabId,
      ville_id: villeId,
      devices: []
    });
    this.showAddSalleModal = true;
    
    // Load devices if ville is already set
    if (villeId) {
      this.onNewSalleVilleChange(villeId);
    }
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
      this.cours.salle_id = undefined;
    } else {
      this.cours.salle_id = salle.id;
    }
    this.closeSalleDropdown();
  }

  getSalleName(id: number | string): string {
    const numericId = Number(id);
    const found = (this.salles || []).find((s: any) => Number(s?.id) === numericId);
    return found?.name || 'Salle sélectionnée';
  }

  trackBySalleId(index: number, salle: any): any {
    return salle?.id || index;
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
          this.allSalles = [created, ...this.allSalles];
          this.salles = [created, ...this.salles];
          this.updateFilteredSalles();
          
          // Ajouter à la sélection multiple
          if (!this.isSalleSelected(created)) {
            this.selectedSalles.push(created);
          }
          if (this.selectedSalles.length > 0) {
            this.cours.salle_id = this.selectedSalles[0].id;
          }
          
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
  
  // Biostar device selection methods
  onNewSalleVilleChange(villeId: number | null): void {
    if (!villeId) {
      this.resetBiostarUi();
      return;
    }
    this.loadAllDevices(Number(villeId));
  }
  
  private resetBiostarUi(): void {
    this.allBiostarDevices = [];
    this.biostarDevices = [];
    this.filteredBiostarDevices = [];
    this.deviceSearch = '';
    this.devicesLoading = false;
    this.devicesError = null;
    this.newSalleForm.get('devices')?.setValue([]);
  }
  
  private loadAllDevices(villeId: number): void {
    this.devicesLoading = true;
    this.devicesError = null;
    this.biostarService.getDevices(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.allBiostarDevices = res.devices || [];
          this.biostarDevices = [...this.allBiostarDevices];
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
}
