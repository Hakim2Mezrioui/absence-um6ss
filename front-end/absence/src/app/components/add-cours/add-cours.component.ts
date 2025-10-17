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
    etablissement_id: 0,
    promotion_id: 0,
    type_cours_id: 0,
    salle_id: 0,
    option_id: undefined,
    ville_id: 0,
    annee_universitaire: '' // Sera défini dans generateAnneesUniversitaires()
  };

  // Propriété pour gérer la tolérance en minutes dans le formulaire
  toleranceMinutes: number = 15;

  loading = false;
  error = '';
  success = '';

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  filteredSalles: any[] = [];
  typesCours: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  filteredGroups: any[] = [];
  selectedGroups: number[] = [];
  groupsDropdownOpen = false;
  groupSearchTerm = '';
  villes: any[] = [];
  salleSearchTerm = '';

  // Années universitaires
  anneesUniversitaires: string[] = [];

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
    private coursService: CoursService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private sallesService: SallesService,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {
    this.newSalleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      batiment: [''],
      etage: [0],
      capacite: [null],
      description: [''],
      etablissement_id: [null, Validators.required]
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
    // Fermer le dropdown des salles si on clique en dehors
    if (this.salleDropdownOpen) {
      const target = event.target as HTMLElement;
      const salleDropdown = target.closest('.salle-dropdown');
      const salleButton = target.closest('#salle-dropdown-button');
      
      if (!salleDropdown && !salleButton) {
        this.closeSalleDropdown();
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
          this.updateFilteredSalles();
          this.typesCours = options.types_cours || [];
          this.options = options.options || [];
          this.groups = options.groups || [];
          this.filteredGroups = []; // Initialiser comme vide jusqu'à sélection ville/établissement
          this.villes = options.villes || [];
          
          // Après le chargement des options, s'assurer que les champs sont bien pré-sélectionnés
          this.ensureFieldsArePreSelected();
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
      
      // Mettre à jour les groupes disponibles si ville et établissement sont définis
      if (this.cours.ville_id && this.cours.etablissement_id) {
        this.updateFilteredGroups();
      }
      
      console.log('🔒 Champs pré-sélectionnés et désactivés pour utilisateur non-super-admin');
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
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Conversion des IDs en nombres et de la tolérance en format time
    const coursData = {
      ...this.cours,
      etablissement_id: Number(this.cours.etablissement_id),
      promotion_id: Number(this.cours.promotion_id),
      type_cours_id: Number(this.cours.type_cours_id),
      salle_id: Number(this.cours.salle_id),
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined,
      ville_id: Number(this.cours.ville_id),
      tolerance: this.formatToleranceToTime(this.toleranceMinutes),
      group_ids: this.selectedGroups // Envoyer les groupes sélectionnés
    };

    console.log('📤 Données cours soumises:', coursData);

    this.coursService.createCours(coursData).subscribe({
      next: (response) => {
        this.success = 'Cours créé avec succès';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/cours']);
        }, 1500);
      },
      error: (error) => {
        this.error = 'Erreur lors de la création du cours';
        this.loading = false;
        console.error('Erreur:', error);
      }
    });
  }

  validateForm(): boolean {
    if (!this.cours.name?.trim()) {
      this.error = 'Le nom du cours est requis';
      return false;
    }

    if (!this.cours.date) {
      this.error = 'La date est requise';
      return false;
    }

    if (!this.cours.pointage_start_hour) {
      this.error = 'L\'heure de début de pointage est requise';
      return false;
    }

    if (!this.cours.heure_debut) {
      this.error = 'L\'heure de début est requise';
      return false;
    }

    if (!this.cours.heure_fin) {
      this.error = 'L\'heure de fin est requise';
      return false;
    }

    if (!this.toleranceMinutes || this.toleranceMinutes <= 0) {
      this.error = 'La tolérance en minutes est requise (minimum 1 minute)';
      return false;
    }

    if (!this.cours.etablissement_id || this.cours.etablissement_id === 0) {
      this.error = 'L\'établissement est requis';
      return false;
    }

    if (!this.cours.promotion_id || this.cours.promotion_id === 0) {
      this.error = 'La promotion est requise';
      return false;
    }

    if (!this.cours.type_cours_id || this.cours.type_cours_id === 0) {
      this.error = 'Le type de cours est requis';
      return false;
    }

    if (!this.cours.salle_id || this.cours.salle_id === 0) {
      this.error = 'La salle est requise';
      return false;
    }

    if (!this.cours.ville_id || this.cours.ville_id === 0) {
      this.error = 'La ville est requise';
      return false;
    }

    if (!this.cours.annee_universitaire) {
      this.error = 'L\'année universitaire est requise';
      return false;
    }

    // Validation des heures
    if (this.cours.heure_debut && this.cours.heure_fin) {
      if (this.cours.heure_debut >= this.cours.heure_fin) {
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        return false;
      }
    }

    return true;
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
      etablissement_id: 0,
      promotion_id: 0,
      type_cours_id: 0,
      salle_id: 0,
      option_id: undefined,
      ville_id: 0,
      annee_universitaire: `${currentYear}-${currentYear + 1}`
    };
    this.toleranceMinutes = 15;
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

  updateFilteredSalles(): void {
    const term = this.salleSearchTerm.trim().toLowerCase();
    const etablissementId = this.cours?.etablissement_id;
    
    // Filtrer d'abord par établissement
    let filteredByEtablissement = [...this.salles];
    if (etablissementId) {
      filteredByEtablissement = (this.salles || []).filter((s: any) => {
        return s?.etablissement_id == etablissementId;
      });
      console.log('🏢 Salles filtrées par établissement (add-cours):', {
        etablissementId: etablissementId,
        totalSalles: this.salles.length,
        sallesFiltrees: filteredByEtablissement.length
      });
    }
    
    // Ensuite filtrer par terme de recherche
    if (!term) {
      this.filteredSalles = filteredByEtablissement;
      return;
    }
    
    this.filteredSalles = filteredByEtablissement.filter((s: any) => {
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
    // Filtrer d'abord par ville et établissement
    let availableGroups = this.groups || [];
    
    if (this.cours.ville_id && this.cours.etablissement_id) {
      // Charger les groupes filtrés par ville et établissement
      this.loadGroupsByLocation(this.cours.ville_id, this.cours.etablissement_id);
      return;
    } else {
      // Si ville ou établissement non sélectionnés, vider la liste
      this.filteredGroups = [];
      return;
    }
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
  }

  getGroupName(groupId: number): string {
    // Chercher d'abord dans les groupes filtrés, puis dans tous les groupes
    let group = this.filteredGroups.find(g => g.id === groupId);
    if (!group) {
      group = this.groups.find(g => g.id === groupId);
    }
    return group ? group.name : 'Groupe inconnu';
  }

  openAddSalleModal(): void {
    const etabId = this.cours.etablissement_id || null;
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
          this.cours.salle_id = created.id;
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
