import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-edit-cours',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-cours.component.html',
  styleUrl: './edit-cours.component.css'
})
export class EditCoursComponent implements OnInit, OnDestroy {
  cours: Partial<Cours> = {
    name: '',
    date: '',
    pointage_start_hour: '',
    heure_debut: '',
    heure_fin: '',
    tolerance: '',
    etablissement_id: 0,
    promotion_id: 0,
    type_cours_id: 0,
    salle_id: 0,
    option_id: undefined,
    ville_id: 0,
    annee_universitaire: ''
  };

  loading = false;
  loadingData = true;
  error = '';
  success = '';
  coursId: number = 0;

  // Dropdown salle state (aligné avec add-cours)
  salleDropdownOpen = false;
  salleSearchTerm = '';
  filteredSalles: any[] = [];

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  
  private destroy$ = new Subject<void>();

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  filteredGroups: any[] = [];
  selectedGroups: number[] = [];
  groupsDropdownOpen = false;
  groupSearchTerm = '';
  villes: any[] = [];

  // Années universitaires
  anneesUniversitaires: string[] = [];

  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;
  villeFieldDisabled = false;
  etablissementFieldDisabled = false;

  constructor(
    private coursService: CoursService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private sallesService: SallesService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {
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

  ngOnInit() {
    this.initializeUserContext();
    this.coursId = Number(this.route.snapshot.paramMap.get('id'));
    this.generateAnneesUniversitaires();
    this.loadFilterOptions();
    this.loadCours();
    // Fermer dropdown au clic extérieur
    document.addEventListener('click', this.handleDocumentClick, true);
    
    // Debug après un délai pour voir l'état final
    setTimeout(() => {
      this.debugGroupsState();
    }, 2000);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleDocumentClick, true);
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
      
      console.log('🔐 Contexte utilisateur initialisé (edit-cours):', {
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
   * Filtrer les salles selon le rôle de l'utilisateur, l'établissement et la ville sélectionnés
   */
  filterSallesByRoleAndEtablissement(): void {
    if (!this.salles || this.salles.length === 0) {
      return;
    }

    const etablissementId = this.cours.etablissement_id;
    const villeId = this.cours.ville_id;

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

  loadCours() {
    this.loadingData = true;
    this.coursService.getCoursById(this.coursId).subscribe({
      next: (cours) => {
        this.cours = {
          ...cours,
          date: cours.date ? cours.date.split('T')[0] : '', // Format pour input date
          option_id: cours.option_id || undefined
        };
        
        // Appliquer la logique de permissions pour les utilisateurs non-super-admin
        if (this.isAdminEtablissement && this.currentUser) {
          // Vérifier si l'utilisateur peut modifier ce cours
          const userVilleId = this.userContext?.ville_id || this.currentUser.ville_id;
          const userEtablissementId = this.userContext?.etablissement_id || this.currentUser.etablissement_id;
          
          // Si le cours n'appartient pas à l'établissement de l'utilisateur, forcer les valeurs
          if (this.cours.ville_id !== userVilleId || this.cours.etablissement_id !== userEtablissementId) {
            console.log('🔒 Cours modifié pour correspondre au contexte utilisateur:', {
              coursOriginal: { ville_id: this.cours.ville_id, etablissement_id: this.cours.etablissement_id },
              userContext: { ville_id: userVilleId, etablissement_id: userEtablissementId }
            });
            
            this.cours.ville_id = userVilleId;
            this.cours.etablissement_id = userEtablissementId;
          }
        }
        
        // Charger les groupes sélectionnés
        if (cours.groups && Array.isArray(cours.groups)) {
          this.selectedGroups = cours.groups.map((group: any) => Number(group.id));
          console.log('📊 Groupes sélectionnés chargés:', this.selectedGroups);
          console.log('📊 Détails des groupes du cours:', cours.groups);
          
          // Forcer la détection des changements pour mettre à jour l'interface
          this.cdr.detectChanges();
        }
        
        // Mettre à jour les groupes disponibles si ville et établissement sont définis
        // Mais ne pas filtrer les groupes sélectionnés lors du chargement initial
        if (this.cours.ville_id && this.cours.etablissement_id) {
          this.loadGroupsByLocationInitial(this.cours.ville_id, this.cours.etablissement_id);
        }
        
        // Mettre à jour les salles disponibles selon l'établissement
        this.updateFilteredSalles();
        
        this.loadingData = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement du cours';
        this.loadingData = false;
        console.error('Erreur:', error);
      }
    });
  }

  loadFilterOptions() {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        this.etablissements = options.etablissements || [];
        this.promotions = options.promotions || [];
        this.salles = options.salles || [];
        
        // Filtrer les salles selon le rôle et l'établissement
        this.filterSallesByRoleAndEtablissement();
        
        this.updateFilteredSalles();
        this.typesCours = options.types_cours || [];
        this.options = options.options || [];
        this.groups = options.groups || [];
        this.updateFilteredGroups();
        this.villes = options.villes || [];
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des options';
        console.error('Erreur:', error);
      }
    });
  }

  // Salle dropdown helpers (alignés avec add-cours)
  onSalleSearch(term: string): void {
    this.salleSearchTerm = term || '';
    this.updateFilteredSalles();
  }

  updateFilteredSalles(): void {
    const term = (this.salleSearchTerm || '').trim().toLowerCase();
    const etablissementId = this.cours?.etablissement_id;
    
    // Filtrer d'abord par établissement
    let filteredByEtablissement = [...(this.salles || [])];
    if (etablissementId) {
      filteredByEtablissement = (this.salles || []).filter((s: any) => {
        return s?.etablissement_id == etablissementId;
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

  trackBySalleId(index: number, salle: any): any {
    return salle?.id || index;
  }

  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.salle-dropdown');
    const button = target.closest('#salle-dropdown-button-edit');
    if (!dropdown && !button && this.salleDropdownOpen) {
      this.salleDropdownOpen = false;
    }
  }

  getSalleName(id: number | string): string {
    const numericId = Number(id);
    const found = (this.salles || []).find((s: any) => Number(s?.id) === numericId);
    return found?.name || 'Salle sélectionnée';
  }

  selectSalle(salle: any): void {
    if (salle) {
      this.cours.salle_id = salle.id;
    } else {
      this.cours.salle_id = undefined;
    }
    this.salleDropdownOpen = false;
  }

  toggleSalleDropdown(): void {
    this.salleDropdownOpen = !this.salleDropdownOpen;
  }

  closeSalleDropdown(): void {
    this.salleDropdownOpen = false;
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

  // Méthode pour le chargement initial des groupes (sans filtrer les groupes sélectionnés)
  loadGroupsByLocationInitial(villeId: number, etablissementId: number): void {
    console.log('🔍 Chargement initial des groupes pour ville:', villeId, 'établissement:', etablissementId);
    
    // Appel à l'API pour récupérer les groupes filtrés
    this.coursService.getGroupsByLocation(villeId, etablissementId).subscribe({
      next: (groups) => {
        console.log('📊 Groupes reçus de l\'API (chargement initial):', groups);
        
        // NE PAS filtrer les groupes sélectionnés lors du chargement initial
        // Les groupes sélectionnés restent tels quels
        
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
        
        console.log('📊 Groupes filtrés finaux (chargement initial):', this.filteredGroups);
        console.log('📊 Groupes sélectionnés conservés:', this.selectedGroups);
        
        // Forcer la détection des changements pour mettre à jour l'interface
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement initial des groupes:', error);
        this.filteredGroups = [];
      }
    });
  }

  // Nouvelle méthode pour charger les groupes par ville et établissement
  loadGroupsByLocation(villeId: number, etablissementId: number): void {
    console.log('🔍 Chargement des groupes pour ville:', villeId, 'établissement:', etablissementId);
    
    // Appel à l'API pour récupérer les groupes filtrés
    this.coursService.getGroupsByLocation(villeId, etablissementId).subscribe({
      next: (groups) => {
        console.log('📊 Groupes reçus de l\'API:', groups);
        
        // Filtrer les groupes sélectionnés pour ne garder que ceux qui sont valides
        const validGroupIds = groups.map((g: any) => g.id);
        this.selectedGroups = this.selectedGroups.filter(groupId => validGroupIds.includes(groupId));
        
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
        console.log('📊 Groupes sélectionnés après filtrage:', this.selectedGroups);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des groupes:', error);
        this.filteredGroups = [];
        // Réinitialiser les groupes sélectionnés en cas d'erreur
        this.selectedGroups = [];
      }
    });
  }

  toggleGroupsDropdown(): void {
    this.groupsDropdownOpen = !this.groupsDropdownOpen;
  }

  isGroupSelected(groupId: number): boolean {
    const numericGroupId = Number(groupId);
    const isSelected = this.selectedGroups.includes(numericGroupId);
    console.log(`🔍 Vérification sélection groupe ${numericGroupId}:`, {
      groupId: numericGroupId,
      selectedGroups: this.selectedGroups,
      isSelected: isSelected
    });
    return isSelected;
  }

  toggleGroupSelection(groupId: number): void {
    const numericGroupId = Number(groupId);
    const index = this.selectedGroups.indexOf(numericGroupId);
    if (index > -1) {
      this.selectedGroups.splice(index, 1);
      console.log(`❌ Groupe ${numericGroupId} désélectionné`);
    } else {
      this.selectedGroups.push(numericGroupId);
      console.log(`✅ Groupe ${numericGroupId} sélectionné`);
    }
    console.log('📊 Groupes sélectionnés après toggle:', this.selectedGroups);
  }

  getGroupName(groupId: number): string {
    // Chercher d'abord dans les groupes filtrés
    const filteredGroup = this.filteredGroups.find(g => g.id === groupId);
    if (filteredGroup) {
      return filteredGroup.name || filteredGroup.title || 'Groupe inconnu';
    }
    
    // Si pas trouvé, chercher dans tous les groupes
    const group = this.groups.find(g => g.id === groupId);
    if (group) {
      return group.name || group.title || 'Groupe inconnu';
    }
    
    // Si toujours pas trouvé, essayer de récupérer depuis les groupes du cours
    if (this.cours.groups && Array.isArray(this.cours.groups)) {
      const coursGroup = this.cours.groups.find((g: any) => g.id === groupId);
      if (coursGroup) {
        return coursGroup.name || coursGroup.title || 'Groupe inconnu';
      }
    }
    
    return 'Groupe inconnu';
  }

  /**
   * Vérifier si un groupe est valide selon les critères actuels
   */
  isGroupValid(groupId: number): boolean {
    // Si le groupe est dans la liste filtrée, il est valide
    if (this.filteredGroups.some(g => g.id === groupId)) {
      return true;
    }
    
    // Si c'est un groupe du cours original et qu'on est en cours de chargement initial,
    // considérer comme valide temporairement
    if (this.cours.groups && Array.isArray(this.cours.groups)) {
      const coursGroup = this.cours.groups.find((g: any) => g.id === groupId);
      if (coursGroup) {
        return true; // Temporairement valide pendant le chargement
      }
    }
    
    return false;
  }

  /**
   * Méthode de debug pour vérifier l'état des groupes
   */
  debugGroupsState(): void {
    console.log('🔍 État des groupes - Debug:');
    console.log('- Groupes sélectionnés:', this.selectedGroups);
    console.log('- Groupes filtrés:', this.filteredGroups);
    console.log('- Tous les groupes:', this.groups);
    console.log('- Groupes du cours:', this.cours.groups);
    
    if (this.filteredGroups.length > 0) {
      console.log('🔍 Vérification des checkboxes:');
      this.filteredGroups.forEach(group => {
        const isSelected = this.isGroupSelected(group.id);
        console.log(`  - Groupe ${group.id} (${group.name}): ${isSelected ? '✅ Sélectionné' : '❌ Non sélectionné'}`);
      });
    }
  }
  hasInvalidSelectedGroups(): boolean {
    return this.selectedGroups.some(id => !this.isGroupValid(id));
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
   * Gérer le changement de promotion
   */
  onPromotionChange() {
    // Réinitialiser les groupes sélectionnés
    this.selectedGroups = [];
    // Mettre à jour la liste des groupes disponibles
    this.updateFilteredGroups();
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
      ville_id: villeId
    });
    this.showAddSalleModal = true;
  }

  closeAddSalleModal(): void {
    this.showAddSalleModal = false;
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

  generateAnneesUniversitaires() {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      const year = currentYear - 2 + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Nettoyer les groupes sélectionnés pour ne garder que ceux qui sont valides
    const validGroupIds = this.filteredGroups.map(g => g.id);
    const cleanedSelectedGroups = this.selectedGroups.filter(groupId => validGroupIds.includes(groupId));
    
    if (this.selectedGroups.length !== cleanedSelectedGroups.length) {
      console.log('🧹 Groupes nettoyés:', {
        avant: this.selectedGroups,
        après: cleanedSelectedGroups,
        supprimés: this.selectedGroups.filter(id => !cleanedSelectedGroups.includes(id))
      });
      this.selectedGroups = cleanedSelectedGroups;
    }

    // Conversion des IDs en nombres
    const coursData = {
      ...this.cours,
      etablissement_id: Number(this.cours.etablissement_id),
      promotion_id: Number(this.cours.promotion_id),
      type_cours_id: Number(this.cours.type_cours_id),
      salle_id: Number(this.cours.salle_id),
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined,
      ville_id: Number(this.cours.ville_id),
      group_ids: this.selectedGroups // Envoyer les groupes sélectionnés nettoyés
    };

    console.log('📤 Données cours modifiées:', coursData);

    this.coursService.updateCours(this.coursId, coursData).subscribe({
      next: (response) => {
        this.success = 'Cours modifié avec succès';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/cours']);
        }, 1500);
      },
      error: (error) => {
        this.error = 'Erreur lors de la modification du cours';
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

    if (!this.cours.tolerance) {
      this.error = 'La tolérance est requise';
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

    // Le groupe est optionnel, pas de validation requise

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
    // Recharger les données du cours depuis le serveur
    this.loadCours();
    this.error = '';
    this.success = '';
  }
}
