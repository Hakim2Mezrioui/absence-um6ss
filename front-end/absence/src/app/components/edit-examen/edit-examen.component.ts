import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';

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
  selectedSalles: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  filteredGroups: any[] = [];
  selectedGroups: number[] = [];
  groupsDropdownOpen = false;
  groupSearchTerm = '';
  allGroupsSelected = false;
  villes: any[] = [];
  typesExamen: TypeExamen[] = [];
  anneesUniversitaires: string[] = [];
  salleSearchTerm = '';

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  salleDropdownOpen = false;
  multiSallesOpen: boolean = false;
  
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
    private route: ActivatedRoute,
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
      salle_id: [''], // Déprécié, gardé pour compatibilité
      salles_ids: [[], Validators.required], // Au moins une salle requise
      group_id: [''], // Déprécié, gardé pour compatibilité
      group_ids: [[]], // Pour la sélection multiple de groupes
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
      ville_id: [null, Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🎯 EditExamenComponent initialisé');
    
    this.initializeUserContext();
    this.generateAnneesUniversitaires();
    
    // Charger d'abord les options de filtre, puis l'examen
    this.loadFilterOptions();
    this.loadTypesExamen();
    
    // Écouter les changements d'établissement et ville pour re-filtrer les salles
    this.setupEtablissementChangeListener();
    
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
          this.router.navigate(['/examens']);
        }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
    
    // Fermer le dropdown des groupes si on clique en dehors
    if (this.groupsDropdownOpen) {
      const groupsDropdown = target.closest('.groups-dropdown');
      const groupsButton = target.closest('.groups-dropdown-button');
      
      if (!groupsDropdown && !groupsButton) {
        this.groupsDropdownOpen = false;
      }
    }
  }

  initializeUserContext() {
    this.currentUser = this.authService.getCurrentUser();
    this.userContext = this.userContextService.getCurrentUserContext();
    
    if (this.currentUser) {
      this.isSuperAdmin = this.currentUser.role_id === 1;
      this.isAdminEtablissement = [2, 3, 4, 6].includes(this.currentUser.role_id);
      
      this.villeFieldDisabled = this.isAdminEtablissement;
      this.etablissementFieldDisabled = this.isAdminEtablissement;
      
      console.log('🔐 Contexte utilisateur initialisé (edit-examen):', {
        user: this.currentUser.email,
        role_id: this.currentUser.role_id,
        isSuperAdmin: this.isSuperAdmin,
        isAdminEtablissement: this.isAdminEtablissement,
        villeFieldDisabled: this.villeFieldDisabled,
        etablissementFieldDisabled: this.etablissementFieldDisabled,
        ville_id: this.currentUser.ville_id,
        etablissement_id: this.currentUser.etablissement_id
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
        salles_ids: this.examen.salles && this.examen.salles.length > 0 
          ? this.examen.salles.map(s => s.id) 
          : (this.examen.salle_id ? [this.examen.salle_id] : []),
        group_id: this.examen.group_id ? this.examen.group_id.toString() : (this.examen.group ? 'ALL' : ''),
        ville_id: this.examen.ville_id ? this.examen.ville_id.toString() : '',
        annee_universitaire: this.examen.annee_universitaire || '',
        tracking_method: this.examen.tracking_method || 'biostar'
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
      
      // Appliquer la logique de permissions avant le patchValue
      if (this.isAdminEtablissement && this.currentUser) {
        const userVilleId = this.userContext?.ville_id || this.currentUser.ville_id;
        const userEtablissementId = this.userContext?.etablissement_id || this.currentUser.etablissement_id;
        
        // Si l'examen n'appartient pas à l'établissement de l'utilisateur, forcer les valeurs
        if (this.examen.ville_id !== userVilleId || this.examen.etablissement_id !== userEtablissementId) {
          console.log('🔒 Examen modifié pour correspondre au contexte utilisateur:', {
            examenOriginal: { ville_id: this.examen.ville_id, etablissement_id: this.examen.etablissement_id },
            userContext: { ville_id: userVilleId, etablissement_id: userEtablissementId }
          });
          
          this.examen.ville_id = userVilleId;
          this.examen.etablissement_id = userEtablissementId;
          
          // Mettre à jour les valeurs du formulaire
          formValues.ville_id = userVilleId ? userVilleId.toString() : '';
          formValues.etablissement_id = userEtablissementId ? userEtablissementId.toString() : '';
        }
      }

      this.examenForm.patchValue(formValues);
      
      // Initialiser les salles sélectionnées
      if (formValues.salles_ids && formValues.salles_ids.length > 0) {
        this.selectedSalles = this.salles.filter(s => formValues.salles_ids.includes(s.id));
      } else if (formValues.salle_id) {
        const salle = this.salles.find(s => s.id == formValues.salle_id);
        if (salle) {
          this.selectedSalles = [salle];
          this.examenForm.patchValue({ salles_ids: [salle.id] });
        }
      }
      
      // Initialiser les groupes sélectionnés depuis la relation many-to-many
      if (this.examen.groups && this.examen.groups.length > 0) {
        this.selectedGroups = this.examen.groups.map((g: any) => g.id);
        this.examenForm.patchValue({ group_ids: this.selectedGroups });
      } else if (this.examen.group_id) {
        // Fallback sur group_id si groups n'est pas chargé
        this.selectedGroups = [this.examen.group_id];
        this.examenForm.patchValue({ group_ids: this.selectedGroups });
      } else {
        // Si aucun groupe, cela signifie "Tous"
        this.selectedGroups = [];
        this.examenForm.patchValue({ group_ids: [], all_groups: true });
      }
      
      // S'assurer que les contrôles sont désactivés après le patchValue
      if (this.isAdminEtablissement) {
        this.disableFormControls();
      }
      
      // Re-filtrer les salles après le remplissage du formulaire
      this.refilterSallesAfterFormPopulation();
      
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
          this.options = response.options || [];
          this.groups = response.groups || [];
          this.filteredGroups = [...this.groups];
          this.villes = response.villes || [];
          
          // Filtrer les salles selon le rôle et l'établissement
          this.filterSallesByRoleAndEtablissement();
          
          // S'assurer que les champs sont bien pré-sélectionnés
          this.ensureFieldsArePreSelected();
          
          // S'assurer que les contrôles sont désactivés après le chargement
          if (this.isAdminEtablissement) {
            this.disableFormControls();
          }
          
          // Mettre à jour les salles filtrées après le filtrage initial
          this.updateFilteredSalles();
          
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
   * Re-filtrer les salles après le remplissage du formulaire
   */
  refilterSallesAfterFormPopulation(): void {
    console.log('🔄 Re-filtrage des salles après remplissage du formulaire');
    
    // Recharger toutes les salles depuis l'API
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const allSalles = response.salles || [];
          console.log('📊 Toutes les salles rechargées:', allSalles.length);
          
          // Appliquer le filtrage selon le rôle et les valeurs du formulaire
          this.salles = [...allSalles]; // Réinitialiser avec toutes les salles
          this.filterSallesByRoleAndEtablissement();
          
          // Mettre à jour les salles filtrées
          this.updateFilteredSalles();
          
          console.log('✅ Salles re-filtrées avec succès:', {
            sallesDisponibles: this.salles.length,
            sallesFiltrees: this.filteredSalles.length,
            etablissementId: this.examenForm.get('etablissement_id')?.value,
            villeId: this.examenForm.get('ville_id')?.value
          });
        },
        error: (err) => {
          console.error('❌ Erreur lors du rechargement des salles:', err);
        }
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
            
            // Afficher toutes les salles sans filtrage
            this.salles = allSalles;
            
            console.log('🔄 Toutes les salles rechargées:', {
              sallesDisponibles: this.salles.length
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

  onSubmit(): void {
    if (this.examenForm.valid && this.examen) {
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
      
      // Gérer les groupes multiples
      if (this.selectedGroups.length > 0) {
        formData.group_ids = this.selectedGroups;
        formData.group_id = null; // Ne plus utiliser group_id
        formData.all_groups = false;
      } else {
        // Si aucun groupe sélectionné, considérer "Tous"
        formData.group_ids = [];
        formData.group_id = null;
        formData.all_groups = true;
      }
      
      // Validation de la date et heure
      if (formData.heure_fin <= formData.heure_debut) {
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        this.loading = false;
        return;
      }

      console.log('📤 Données soumises pour modification:', formData);

      this.examensService.updateExamen(this.examen.id, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Succès', 'Examen modifié avec succès');
            this.loading = false;
            // Rediriger vers la liste des examens
            this.router.navigate(['/examens']);
          },
          error: (err) => {
            console.error('Error updating examen:', err);
            
            // Vérifier si l'erreur est due à une tentative de modification d'un examen passé
            if (err.status === 403 && err.error?.error === 'PAST_EXAMEN_MODIFICATION_FORBIDDEN') {
              this.error = 'Impossible de modifier un examen passé';
              this.notificationService.error('Accès refusé', 'Impossible de modifier un examen passé');
              // Rediriger vers la liste des examens après un court délai
              setTimeout(() => {
                this.router.navigate(['/examens']);
              }, 2000);
            } else {
              this.error = err.error?.message || 'Erreur lors de la modification de l\'examen';
              this.notificationService.error('Erreur', this.error);
            }
            
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

  // Groupes multiples helpers
  onGroupSearch(term: string): void {
    this.groupSearchTerm = term || '';
    this.updateFilteredGroups();
  }

  updateFilteredGroups(): void {
    const term = this.groupSearchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredGroups = this.groups;
      return;
    }
    
    this.filteredGroups = this.groups.filter((g: any) => {
      const name = (g?.name || g?.title || '').toString().toLowerCase();
      return name.includes(term);
    });
  }

  toggleGroupsDropdown(): void {
    this.groupsDropdownOpen = !this.groupsDropdownOpen;
    if (this.groupsDropdownOpen) {
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
    this.allGroupsSelected = this.areAllGroupsSelected();
  }

  areAllGroupsSelected(): boolean {
    return this.filteredGroups.length > 0 && 
           this.filteredGroups.every(g => this.selectedGroups.includes(g.id));
  }

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
    const etabId = this.examenForm.get('etablissement_id')?.value || null;
    const villeId = this.examenForm.get('ville_id')?.value || null;
    this.newSalleForm.reset({
      name: '',
      batiment: '',
      etage: 0,
      capacite: null,
      description: '',
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
      devices: [] // Devices requis mais non gérés dans ce formulaire rapide
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

  /**
   * Obtenir le nom d'affichage du rôle
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
    const villeId = this.examenForm.get('ville_id')?.value;
    if (!villeId) return '';
    
    const ville = this.villes.find(v => v.id == villeId);
    return ville ? ville.name : '';
  }

  /**
   * Obtenir le nom de l'établissement sélectionné
   */
  getSelectedEtablissementName(): string {
    const etablissementId = this.examenForm.get('etablissement_id')?.value;
    if (!etablissementId) return '';
    
    const etablissement = this.etablissements.find(e => e.id == etablissementId);
    return etablissement ? etablissement.name : '';
  }
}
