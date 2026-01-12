import { Component, OnInit, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RattrapageService, Etudiant, Rattrapage } from '../../services/rattrapage.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { SallesService, Salle } from '../../services/salles.service';
import { Subject, debounceTime, distinctUntilChanged, firstValueFrom } from 'rxjs';

// Angular Material imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

interface EtudiantWithSelection extends Etudiant {
  selected?: boolean;
}

interface RattrapageWithDuration extends Rattrapage {
  duration?: string;
}

interface Promotion {
  id: number;
  name: string;
}

interface Etablissement {
  id: number;
  name: string;
}

interface Option {
  id: number;
  name: string;
}

interface Group {
  id: number;
  title: string;
}

interface Ville {
  id: number;
  name: string;
}

interface ListStudentResponse {
  id: number;
  etudiant_id: number;
  rattrapage_id: number;
  created_at: string;
  updated_at: string;
  etudiant: Etudiant;
}



@Component({
  selector: 'app-rattrapage',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    // Angular Material modules
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatToolbarModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './rattrapage.component.html',
  styleUrl: './rattrapage.component.css'
})
export class RattrapageComponent implements OnInit, OnDestroy {
  private rattrapageService = inject(RattrapageService);
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  public authService = inject(AuthService);
  private sallesService = inject(SallesService);
  
  // Data
  etudiants: EtudiantWithSelection[] = [];
  selectedEtudiants: EtudiantWithSelection[] = [];
  selectedEtudiantIds: Set<number> = new Set(); // Garder les IDs sélectionnés globalement
  rattrapages: RattrapageWithDuration[] = [];
  
  // Pagination pour étudiants
  currentPage = 1;
  perPage = 20;
  totalPages = 1;
  totalStudents = 0;
  hasNextPage = false;
  hasPrevPage = false;
  
  // Pagination pour rattrapages
  rattrapagesCurrentPage = 1;
  rattrapagesPerPage = 10;
  rattrapagesTotalPages = 1;
  rattrapagesTotal = 0;
  rattrapagesHasNextPage = false;
  rattrapagesHasPrevPage = false;
  
  // Filter options
  promotions: Promotion[] = [];
  etablissements: Etablissement[] = [];
  options: Option[] = [];
  groups: Group[] = [];
  villes: Ville[] = [];
  salles: Salle[] = [];
  filteredSalles: Salle[] = [];
  selectedVilleForRattrapage: number | null = null;
  salleSearchTerm: string = '';
  
  // Filter values pour étudiants
  selectedPromotion: number | null = null;
  selectedEtablissement: number | null = null;
  selectedOption: number | null = null;
  selectedGroup: number | null = null;
  selectedVille: number | null = null;
  searchTerm: string = '';
  
  // Filter values pour rattrapages
  rattrapagesSearchTerm: string = '';
  rattrapagesDate: string = '';
  rattrapagesDateFrom: string = '';
  rattrapagesDateTo: string = '';
  rattrapagesPointageStartHour: string = '';
  rattrapagesStartHour: string = '';
  rattrapagesEndHour: string = '';
  rattrapagesSortBy: string = 'date';
  rattrapagesSortDirection: string = 'desc';
  
  // UI state
  loading = false;
  initializing = true; // État de chargement initial
  showCreateModal = false;
  showStudentsModal = false;
  activeTab = 'affectation'; // 'affectation' | 'rattrapages'
  activeTabIndex = 0; // For Material tabs
  isSearching = false;
  isRattrapagesFiltering = false;
  selectedRattrapage: RattrapageWithDuration | null = null;
  rattrapageStudents: Etudiant[] = [];
  
  // Pagination et recherche pour les étudiants du modal
  studentsCurrentPage = 1;
  studentsPerPage = 20;
  studentsTotalPages = 1;
  studentsTotalCount = 0;
  studentsSearchTerm = '';
  studentsLoading = false;
  
  // Forms
  rattrapageForm: FormGroup;
  
  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private formCacheSubscription: any = null;
  
  constructor() {
    this.rattrapageForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      pointage_start_hour: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      start_hour: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      end_hour: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      date: ['', [Validators.required]],
      tolerance: [5, [Validators.required, Validators.min(0), Validators.max(60)]],
      ville_id: [null, [Validators.required]],
      salle_ids: [[], [Validators.required, this.atLeastOneSalleValidator]]
    });
  }
  
  // Validator personnalisé pour vérifier qu'au moins une salle est sélectionnée
  private atLeastOneSalleValidator(control: any) {
    const value = control.value;
    if (!value || !Array.isArray(value) || value.length === 0) {
      return { required: true };
    }
    return null;
  }
  
  async ngOnInit() {
    console.log('🚀 Initialisation du composant Rattrapage');
    this.initializing = true;
    this.markForCheck();
    this.setupSearchDebounce();
    this.setupFormCacheListener();
    
    // Timeout de sécurité pour éviter que l'écran reste bloqué
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn('⏰ Timeout de chargement atteint (30s)');
        resolve(null);
      }, 30000); // 30 secondes
    });
    
    try {
    // Charger toutes les données en parallèle
    console.log('📋 Chargement des données de filtrage...');
    const filterDataPromise = this.loadFilterData();
    
    console.log('👥 Chargement des étudiants...');
    const etudiantsPromise = this.loadEtudiants(1, false); // Pas d'état de chargement lors de l'init
    
    console.log('📚 Chargement des rattrapages...');
    const rattrapagesPromise = this.loadRattrapages();
    
    console.log('🏢 Chargement des salles...');
    const sallesPromise = this.loadSalles();
    
    // Attendre que toutes les données soient chargées ou le timeout
    await Promise.race([
      Promise.all([filterDataPromise, etudiantsPromise, rattrapagesPromise, sallesPromise]),
      timeoutPromise
    ]);
      
      console.log('✅ Toutes les données chargées avec succès');
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger certaines données. Veuillez recharger la page.'
      );
    } finally {
      // Toujours mettre à jour l'état, même en cas d'erreur ou de timeout
      this.initializing = false;
      this.markForCheck();
      console.log('✅ Initialisation terminée - initializing:', this.initializing);
    }
  }
  
  // Configurer le listener pour sauvegarder automatiquement dans le cache
  private setupFormCacheListener() {
    // Nettoyer l'ancienne souscription si elle existe
    if (this.formCacheSubscription) {
      this.formCacheSubscription.unsubscribe();
    }
    
    // Sauvegarder dans le cache à chaque changement du formulaire (avec debounce)
    this.formCacheSubscription = this.rattrapageForm.valueChanges
      .pipe(
        debounceTime(500), // Attendre 500ms après le dernier changement
        distinctUntilChanged()
      )
      .subscribe(() => {
        if (this.showCreateModal) {
          this.saveFormToCache();
        }
      });
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    
    // Nettoyer la souscription du cache
    if (this.formCacheSubscription) {
      this.formCacheSubscription.unsubscribe();
    }
  }
  
  private setupSearchDebounce() {
    this.searchSubject.pipe(
      debounceTime(300), // Réduit à 300ms pour une meilleure réactivité
      distinctUntilChanged() // Ne déclencher que si la valeur a changé
    ).subscribe(searchValue => {
      this.searchTerm = searchValue;
      this.isSearching = true;
      this.markForCheck();
      this.applyFilters().finally(() => {
        this.isSearching = false;
        this.markForCheck();
      });
    });
  }
  
  
  async loadFilterData() {
    try {
      console.log('📋 Chargement des données de filtrage...');
      
      const filterOptions = await firstValueFrom(this.rattrapageService.getFilterOptions());
      
      if (filterOptions) {
        this.promotions = filterOptions.promotions || [];
        this.etablissements = filterOptions.etablissements || [];
        this.options = filterOptions.options || [];
        this.groups = filterOptions.groups || [];
        this.villes = filterOptions.villes || [];
        
        console.log('✅ Données de filtrage chargées:', {
          promotions: this.promotions.length,
          etablissements: this.etablissements.length,
          options: this.options.length,
          groups: this.groups.length,
          villes: this.villes.length
        });
      }
      
    } catch (error) {
      console.error('❌ Erreur lors du chargement des données de filtrage:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger les données de filtrage.'
      );
    } finally {
      this.markForCheck();
    }
  }

  async loadSalles() {
    try {
      console.log('🏢 Chargement des salles...');
      const response = await firstValueFrom(this.sallesService.getSalles());
      
      if (response && response.salles) {
        this.salles = response.salles;
        this.filteredSalles = [...this.salles];
        console.log('✅ Salles chargées:', this.salles.length);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des salles:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger les salles.'
      );
    } finally {
      this.markForCheck();
    }
  }

  onVilleChangeForRattrapage() {
    const villeId = this.rattrapageForm.get('ville_id')?.value;
    this.selectedVilleForRattrapage = villeId;
    
    console.log('🏙️ Ville sélectionnée pour rattrapage:', villeId);
    console.log('📋 Total salles disponibles:', this.salles.length);
    
    // Réinitialiser les salles sélectionnées si la ville change
    this.rattrapageForm.patchValue({ salle_ids: [] });
    
    // Filtrer les salles par ville
    this.filterSalles();
    
    // Sauvegarder dans le cache
    this.saveFormToCache();
    
    this.markForCheck();
  }

  filterSalles() {
    const villeId = this.rattrapageForm.get('ville_id')?.value;
    
    console.log('🔍 Filtrage des salles - Ville ID:', villeId);
    console.log('📊 Salles avant filtrage:', this.salles.length);
    console.log('📋 Exemple de salle:', this.salles[0] ? {
      id: this.salles[0].id,
      name: this.salles[0].name,
      ville_id: this.salles[0].ville_id,
      ville_id_type: typeof this.salles[0].ville_id
    } : 'Aucune salle');
    
    let filtered = [...this.salles];
    
    // Filtrer par ville (conversion en nombre pour la comparaison)
    if (villeId) {
      const villeIdNum = Number(villeId);
      filtered = filtered.filter(salle => {
        const salleVilleId = Number(salle.ville_id);
        const match = salleVilleId === villeIdNum;
        if (!match) {
          console.log(`❌ Salle ${salle.name} (ville_id: ${salle.ville_id}, type: ${typeof salle.ville_id}) ne correspond pas à ${villeIdNum}`);
        }
        return match;
      });
      console.log('✅ Salles après filtrage par ville:', filtered.length);
    }
    
    // Filtrer par terme de recherche
    if (this.salleSearchTerm.trim()) {
      const searchLower = this.salleSearchTerm.trim().toLowerCase();
      filtered = filtered.filter(salle => {
        const nameMatch = salle.name?.toLowerCase().includes(searchLower) || false;
        const batimentMatch = salle.batiment?.toLowerCase().includes(searchLower) || false;
        const etageMatch = salle.etage?.toString().includes(searchLower) || false;
        const descriptionMatch = salle.description?.toLowerCase().includes(searchLower) || false;
        return nameMatch || batimentMatch || etageMatch || descriptionMatch;
      });
      console.log('✅ Salles après filtrage par recherche:', filtered.length);
    }
    
    this.filteredSalles = filtered;
    console.log('📋 Salles filtrées finales:', this.filteredSalles.length);
    
    // Vérifier que les salles sélectionnées sont toujours valides (dans la liste complète de la ville)
    // Mais ne pas les retirer si elles ne sont plus visibles dans les résultats filtrés par recherche
    const currentSalleIds = this.rattrapageForm.get('salle_ids')?.value || [];
    
    // Obtenir la liste complète des salles de la ville (sans filtre de recherche)
    let sallesByVille = [...this.salles];
    if (villeId) {
      const villeIdNum = Number(villeId);
      sallesByVille = sallesByVille.filter(salle => {
        const salleVilleId = Number(salle.ville_id);
        return salleVilleId === villeIdNum;
      });
    }
    
    // Ne retirer que les salles qui ne sont plus dans la liste complète de la ville
    // (par exemple, si la ville a changé), mais garder celles qui sont juste masquées par la recherche
    const validSalleIds = currentSalleIds.filter((id: number) => 
      sallesByVille.find(s => s.id === id)
    );
    
    // Seulement mettre à jour si des salles ont été retirées (changement de ville)
    if (validSalleIds.length !== currentSalleIds.length) {
      this.rattrapageForm.patchValue({ salle_ids: validSalleIds });
      console.log('⚠️ Salles retirées de la sélection (changement de ville):', currentSalleIds.length - validSalleIds.length);
    }
  }

  onSalleSearchInput(value: string) {
    this.salleSearchTerm = value;
    this.filterSalles();
    // Sauvegarder le terme de recherche dans le cache
    this.saveFormToCache();
    // Forcer la détection de changement avec OnPush
    this.markForCheck();
  }
  
  clearSalleSearch() {
    this.salleSearchTerm = '';
    this.filterSalles();
    this.saveFormToCache();
    this.markForCheck();
  }
  
  async loadEtudiants(page: number = 1, showLoading: boolean = true) {
    try {
      console.log('🔄 Chargement des étudiants - Page:', page);
      
      if (showLoading) {
        this.loading = true;
        this.markForCheck();
      }
      
      const filters = this.getCurrentFilters();
      console.log('🔍 Filtres appliqués:', filters);
      const response = await firstValueFrom(this.rattrapageService.getEtudiants(page, this.perPage, filters));
      
      console.log('📊 Réponse API:', response);
      
      if (response) {
        this.etudiants = (response.data || []).map((etudiant: Etudiant) => ({
          ...etudiant,
          selected: this.selectedEtudiantIds.has(etudiant.id) // Restaurer l'état de sélection
        }));
        
        console.log('👥 Étudiants chargés:', this.etudiants.length);
        
        // Mettre à jour les informations de pagination
        this.currentPage = response.current_page;
        this.totalPages = response.last_page;
        this.totalStudents = response.total;
        this.hasNextPage = response.has_next_page;
        this.hasPrevPage = response.has_prev_page;
        
        // Mettre à jour la liste des étudiants sélectionnés
        this.updateSelectedEtudiants();
        
        console.log('✅ Données mises à jour - Étudiants:', this.etudiants.length, 'Total:', this.totalStudents);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des étudiants:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger les étudiants.'
      );
    } finally {
      if (showLoading) {
        this.loading = false;
      }
      this.markForCheck();
      console.log('🏁 Chargement terminé - Loading:', this.loading);
    }
  }
  
  getCurrentFilters() {
    const filters: any = {};
    
    if (this.searchTerm.trim()) {
      filters.searchValue = this.searchTerm.trim();
    }
    
    if (this.selectedPromotion) {
      filters.promotion_id = this.selectedPromotion;
    }
    
    if (this.selectedEtablissement) {
      filters.etablissement_id = this.selectedEtablissement;
    }
    
    if (this.selectedOption) {
      filters.option_id = this.selectedOption;
    }
    
    if (this.selectedGroup) {
      filters.group_id = this.selectedGroup;
    }
    
    if (this.selectedVille) {
      filters.ville_id = this.selectedVille;
    }
    
    return filters;
  }
  
  async applyFilters() {
    this.currentPage = 1; // Reset to first page when applying filters
    await this.loadEtudiants(1);
  }
  
  onFilterChange() {
    // Ne fait rien automatiquement, l'utilisateur doit cliquer sur "Rechercher"
  }
  
  onSearchChange(searchValue: string) {
    // Ne fait rien automatiquement, l'utilisateur doit cliquer sur "Rechercher"
    this.searchTerm = searchValue;
  }
  
  // Méthodes de pagination
  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      await this.loadEtudiants(page);
    }
  }
  
  async nextPage() {
    if (this.hasNextPage) {
      await this.loadEtudiants(this.currentPage + 1);
    }
  }
  
  async prevPage() {
    if (this.hasPrevPage) {
      await this.loadEtudiants(this.currentPage - 1);
    }
  }
  
  async firstPage() {
    await this.loadEtudiants(1);
  }
  
  async lastPage() {
    await this.loadEtudiants(this.totalPages);
  }
  
  getVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, this.currentPage - half);
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  toggleEtudiantSelection(etudiant: EtudiantWithSelection) {
    etudiant.selected = !etudiant.selected;
    
    if (etudiant.selected) {
      this.selectedEtudiantIds.add(etudiant.id);
    } else {
      this.selectedEtudiantIds.delete(etudiant.id);
    }
    
    this.updateSelectedEtudiants();
  }
  
  toggleAllEtudiants(selectAll: boolean) {
    this.etudiants.forEach(etudiant => {
      etudiant.selected = selectAll;
      
      if (selectAll) {
        this.selectedEtudiantIds.add(etudiant.id);
      } else {
        this.selectedEtudiantIds.delete(etudiant.id);
      }
    });
    
    this.updateSelectedEtudiants();
  }
  
  updateSelectedEtudiants() {
    // Pour l'affichage, on garde les étudiants sélectionnés de la page actuelle
    // Plus les étudiants sélectionnés des autres pages
    const currentPageSelected = this.etudiants.filter(e => e.selected);
    
    // Ajouter les étudiants sélectionnés qui ne sont pas sur la page actuelle
    const otherPagesSelected = this.selectedEtudiants.filter(e => 
      this.selectedEtudiantIds.has(e.id) && !this.etudiants.find(current => current.id === e.id)
    );
    
    this.selectedEtudiants = [...currentPageSelected, ...otherPagesSelected];
  }
  
  openCreateModal() {
    if (this.selectedEtudiants.length === 0) {
      alert('Veuillez sélectionner au moins un étudiant');
      return;
    }
    
    this.showCreateModal = true;
    
    // Restaurer les données du cache si disponibles
    this.loadFormFromCache();
    
    // Si pas de date dans le cache, utiliser la date d'aujourd'hui par défaut
    if (!this.rattrapageForm.get('date')?.value) {
      const today = new Date().toISOString().split('T')[0];
      this.rattrapageForm.patchValue({ date: today });
    }
    
    // Si une ville était sauvegardée, filtrer les salles
    const savedVilleId = this.rattrapageForm.get('ville_id')?.value;
    if (savedVilleId) {
      this.selectedVilleForRattrapage = savedVilleId;
    }
    
    // Appliquer le filtrage des salles (par ville et terme de recherche)
    this.filterSalles();
    
    this.markForCheck();
  }
  
  closeCreateModal() {
    // Sauvegarder les données dans le cache avant de fermer
    this.saveFormToCache();
    
    this.showCreateModal = false;
    // Ne pas réinitialiser le formulaire, on garde les données en cache
    // this.rattrapageForm.reset();
    // this.selectedVilleForRattrapage = null;
    this.salleSearchTerm = '';
    // Garder le filtre des salles si une ville était sélectionnée
    if (!this.selectedVilleForRattrapage) {
      this.filteredSalles = [...this.salles];
    }
  }
  
  // Méthode pour sauvegarder le formulaire dans le cache
  private saveFormToCache() {
    try {
      const formValue = this.rattrapageForm.value;
      localStorage.setItem('rattrapage_form_cache', JSON.stringify(formValue));
      localStorage.setItem('rattrapage_ville_cache', JSON.stringify(this.selectedVilleForRattrapage));
      localStorage.setItem('rattrapage_salle_search_cache', this.salleSearchTerm);
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du cache:', error);
    }
  }
  
  // Méthode pour charger le formulaire depuis le cache
  private loadFormFromCache() {
    try {
      const cachedForm = localStorage.getItem('rattrapage_form_cache');
      const cachedVille = localStorage.getItem('rattrapage_ville_cache');
      const cachedSearch = localStorage.getItem('rattrapage_salle_search_cache');
      
      if (cachedForm) {
        const formValue = JSON.parse(cachedForm);
        // S'assurer que salle_ids est un tableau
        if (formValue.salle_ids && !Array.isArray(formValue.salle_ids)) {
          formValue.salle_ids = formValue.salle_id ? [formValue.salle_id] : [];
        } else if (!formValue.salle_ids) {
          formValue.salle_ids = formValue.salle_id ? [formValue.salle_id] : [];
        }
        // Supprimer l'ancien salle_id si présent
        delete formValue.salle_id;
        
        this.rattrapageForm.patchValue(formValue);
      }
      
      if (cachedVille) {
        this.selectedVilleForRattrapage = JSON.parse(cachedVille);
      }
      
      if (cachedSearch) {
        this.salleSearchTerm = cachedSearch;
      }
    } catch (error) {
      console.error('Erreur lors du chargement du cache:', error);
    }
  }
  
  // Méthode pour nettoyer le cache
  private clearFormCache() {
    try {
      localStorage.removeItem('rattrapage_form_cache');
      localStorage.removeItem('rattrapage_ville_cache');
      localStorage.removeItem('rattrapage_salle_search_cache');
    } catch (error) {
      console.error('Erreur lors du nettoyage du cache:', error);
    }
  }
  
  // Méthode pour gérer la sélection/désélection d'une salle
  toggleSalleSelection(salleId: number) {
    const currentSalleIds = this.rattrapageForm.get('salle_ids')?.value || [];
    const index = currentSalleIds.indexOf(salleId);
    
    if (index > -1) {
      // Désélectionner
      currentSalleIds.splice(index, 1);
    } else {
      // Sélectionner
      currentSalleIds.push(salleId);
    }
    
    this.rattrapageForm.patchValue({ salle_ids: currentSalleIds });
    this.rattrapageForm.get('salle_ids')?.markAsTouched();
    
    // Sauvegarder dans le cache
    this.saveFormToCache();
    
    this.markForCheck();
  }
  
  // Vérifier si une salle est sélectionnée
  isSalleSelected(salleId: number): boolean {
    const currentSalleIds = this.rattrapageForm.get('salle_ids')?.value || [];
    return currentSalleIds.includes(salleId);
  }
  
  // Obtenir le nom d'une salle par son ID
  getSalleName(salleId: number): string {
    const salle = this.salles.find(s => s.id === salleId);
    if (salle) {
      let name = salle.name;
      if (salle.batiment) {
        name += ` - ${salle.batiment}`;
      }
      if (salle.etage) {
        name += ` - Étage ${salle.etage}`;
      }
      return name;
    }
    return `Salle #${salleId}`;
  }
  
  async createRattrapage() {
    if (this.rattrapageForm.invalid) {
      this.markFormGroupTouched(this.rattrapageForm);
      return;
    }
    
    // Validate hours
    const pointageStartHour = this.rattrapageForm.value.pointage_start_hour;
    const startHour = this.rattrapageForm.value.start_hour;
    const endHour = this.rattrapageForm.value.end_hour;
    const date = this.rattrapageForm.value.date;
    
    if (pointageStartHour >= startHour) {
      alert('L\'heure de pointage doit être antérieure à l\'heure de début');
      return;
    }
    
    if (startHour >= endHour) {
      alert('L\'heure de fin doit être supérieure à l\'heure de début');
      return;
    }
    
    // Validate date is not in the past
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      alert('La date ne peut pas être dans le passé');
      return;
    }
    

    
    try {
      this.loading = true;
      
      // 1. Create rattrapage
      const rattrapageData = { ...this.rattrapageForm.value };
      
      // S'assurer que salle_ids est un tableau et convertir en salles_ids pour le backend
      if (rattrapageData.salle_ids && Array.isArray(rattrapageData.salle_ids) && rattrapageData.salle_ids.length > 0) {
        rattrapageData.salles_ids = rattrapageData.salle_ids;
        // Garder salle_id pour compatibilité (première salle)
        rattrapageData.salle_id = rattrapageData.salle_ids[0];
      } else {
        throw new Error('Au moins une salle doit être sélectionnée');
      }
      
      // Supprimer salle_ids du payload (on utilise salles_ids)
      delete rattrapageData.salle_ids;
      
      const rattrapageResponse = await firstValueFrom(this.rattrapageService.createRattrapage(rattrapageData));
      
      if (!rattrapageResponse?.success) {
        throw new Error(rattrapageResponse?.message || 'Erreur lors de la création du rattrapage');
      }
      
      const rattrapageId = rattrapageResponse.data?.id;
      if (!rattrapageId) {
        throw new Error('ID du rattrapage non trouvé');
      }
      
      // 2. Assign students to rattrapage
      const assignmentPromises = this.selectedEtudiants.map(async (etudiant) => {
        try {
          const response = await firstValueFrom(
            this.rattrapageService.assignStudentToRattrapage(etudiant.id, rattrapageId)
          );
          if (!response?.success) {
            console.error(`Erreur lors de l'assignation de l'étudiant ${etudiant.id}:`, response?.message);
            throw new Error(response?.message || `Impossible d'assigner l'étudiant ${etudiant.first_name} ${etudiant.last_name}`);
          }
          return response;
        } catch (error: any) {
          console.error(`Erreur lors de l'assignation de l'étudiant ${etudiant.id}:`, error);
          throw error;
        }
      });
      
      await Promise.all(assignmentPromises);
      
      this.notificationService.success(
        'Rattrapage créé avec succès!',
        `${this.selectedEtudiants.length} étudiant(s) ont été affecté(s) au rattrapage "${rattrapageData.name}".`
      );
      
      // Nettoyer le cache après création réussie
      this.clearFormCache();
      
      // Reset form and selections
      this.showCreateModal = false;
      this.rattrapageForm.reset();
      this.selectedVilleForRattrapage = null;
      this.salleSearchTerm = '';
      this.filteredSalles = [...this.salles];
      this.clearAllSelections();
      
      // Recharger la liste des rattrapages
      this.loadRattrapages();
      
    } catch (error: any) {
      console.error('Erreur lors de la création du rattrapage:', error);
      this.notificationService.error(
        'Erreur lors de la création du rattrapage',
        error.message || 'Une erreur inattendue s\'est produite.'
      );
    } finally {
      this.loading = false;
    }
  }
  
  clearAllSelections() {
    // Nettoyer toutes les sélections
    this.selectedEtudiantIds.clear();
    this.etudiants.forEach(e => e.selected = false);
    this.selectedEtudiants = [];
  }

  viewRattrapageStudents(rattrapage: RattrapageWithDuration) {
    if (rattrapage.id) {
      this.router.navigate(['/rattrapages', rattrapage.id, 'students']);
    }
  }

  viewRattrapageAttendance(rattrapage: RattrapageWithDuration) {
    if (rattrapage.id) {
      this.router.navigate(['/rattrapages', rattrapage.id, 'attendance']);
    }
  }

  async loadRattrapageStudents(page: number = 1) {
    if (!this.selectedRattrapage?.id) return;
    
    try {
      this.studentsLoading = true;
      this.studentsCurrentPage = page;
      
      const response = await firstValueFrom(this.rattrapageService.getStudentsByRattrapage(
        this.selectedRattrapage.id,
        page,
        this.studentsPerPage,
        this.studentsSearchTerm || undefined
      ));
      
             if (response?.success) {
         // Extraire les données d'étudiants de la structure imbriquée
         this.rattrapageStudents = (response.data || []).map((item: any) => item.etudiant);
         
         // Utiliser le count pour le total si pas de pagination
         this.studentsTotalCount = response.count || response.data?.length || 0;
         
         if (response.pagination) {
           this.studentsCurrentPage = response.pagination.current_page;
           this.studentsTotalPages = response.pagination.last_page;
           this.studentsTotalCount = response.pagination.total;
         } else {
           // Pas de pagination, une seule page
           this.studentsCurrentPage = 1;
           this.studentsTotalPages = 1;
         }
       } else {
        this.notificationService.error(
          'Erreur',
          'Impossible de charger les étudiants de ce rattrapage'
        );
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants du rattrapage:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Une erreur est survenue lors du chargement des étudiants'
      );
    } finally {
      this.studentsLoading = false;
    }
  }

  closeStudentsModal() {
    this.showStudentsModal = false;
    this.selectedRattrapage = null;
    this.rattrapageStudents = [];
    this.studentsCurrentPage = 1;
    this.studentsSearchTerm = '';
    this.studentsTotalCount = 0;
  }

  // Navigation pagination pour les étudiants
  async goToStudentsPage(page: number) {
    if (page >= 1 && page <= this.studentsTotalPages) {
      await this.loadRattrapageStudents(page);
    }
  }

  async nextStudentsPage() {
    if (this.studentsCurrentPage < this.studentsTotalPages) {
      await this.loadRattrapageStudents(this.studentsCurrentPage + 1);
    }
  }

  async prevStudentsPage() {
    if (this.studentsCurrentPage > 1) {
      await this.loadRattrapageStudents(this.studentsCurrentPage - 1);
    }
  }

  // Recherche dans les étudiants
  async onStudentsSearchChange(searchTerm: string) {
    this.studentsSearchTerm = searchTerm;
    this.studentsCurrentPage = 1;
    await this.loadRattrapageStudents(1);
  }

  getStudentsVisiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.studentsCurrentPage - 2);
    const end = Math.min(this.studentsTotalPages, this.studentsCurrentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  clearFilters() {
    this.selectedPromotion = null;
    this.selectedEtablissement = null;
    this.selectedOption = null;
    this.selectedGroup = null;
    this.selectedVille = null;
    this.searchTerm = '';
    this.applyFilters();
  }
  
  // Méthode pour lancer la recherche manuellement
  async searchStudents() {
    console.log('🔍 Lancement de la recherche avec les filtres:', this.getCurrentFilters());
    this.currentPage = 1; // Reset to first page when applying filters
    await this.loadEtudiants(1);
  }
  
  get allCurrentPageSelected(): boolean {
    return this.etudiants.length > 0 && this.etudiants.every(e => e.selected);
  }
  
  get someCurrentPageSelected(): boolean {
    return this.etudiants.some(e => e.selected) && !this.allCurrentPageSelected;
  }
  
  // Garder les anciens noms pour la compatibilité
  get allFilteredSelected(): boolean {
    return this.allCurrentPageSelected;
  }
  
  get someFilteredSelected(): boolean {
    return this.someCurrentPageSelected;
  }
  
  private markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }
  
  async loadRattrapages(page: number = 1) {
    try {
      console.log('📚 Chargement des rattrapages - Page:', page);
      
      const filters = this.getRattrapagesFilters();
      console.log('🔍 Filtres rattrapages:', filters);
      const response = await firstValueFrom(this.rattrapageService.getAllRattrapages(page, this.rattrapagesPerPage, filters));
      
      console.log('📊 Réponse API rattrapages:', response);
      
      if (response?.success) {
        this.rattrapages = (response.data || []).map(rattrapage => ({
          ...rattrapage,
          duration: this.calculateDuration(rattrapage.start_hour, rattrapage.end_hour)
        }));
        
        console.log('📚 Rattrapages chargés:', this.rattrapages.length);
        
        // Mettre à jour les informations de pagination
        this.rattrapagesCurrentPage = response.pagination.current_page;
        this.rattrapagesTotalPages = response.pagination.last_page;
        this.rattrapagesTotal = response.pagination.total;
        this.rattrapagesHasNextPage = response.pagination.has_next_page;
        this.rattrapagesHasPrevPage = response.pagination.has_prev_page;
        
        console.log('✅ Rattrapages mis à jour - Total:', this.rattrapagesTotal);
      }
    } catch (error) {
      console.error('❌ Erreur lors du chargement des rattrapages:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger les rattrapages.'
      );
    } finally {
      this.markForCheck();
    }
  }
  
  getRattrapagesFilters() {
    const filters: any = {};
    
    if (this.rattrapagesSearchTerm.trim()) {
      filters.search = this.rattrapagesSearchTerm.trim();
    }
    
    if (this.rattrapagesDate) {
      filters.date = this.formatDateForAPI(this.rattrapagesDate);
      console.log('🔍 Date exacte:', this.rattrapagesDate, '→', filters.date);
    }
    
    if (this.rattrapagesDateFrom) {
      filters.date_from = this.formatDateForAPI(this.rattrapagesDateFrom);
      console.log('🔍 Date de début:', this.rattrapagesDateFrom, '→', filters.date_from);
    }
    
    if (this.rattrapagesDateTo) {
      filters.date_to = this.formatDateForAPI(this.rattrapagesDateTo);
      console.log('🔍 Date de fin:', this.rattrapagesDateTo, '→', filters.date_to);
    }
    
    if (this.rattrapagesPointageStartHour) {
      filters.pointage_start_hour = this.rattrapagesPointageStartHour;
    }
    
    if (this.rattrapagesStartHour) {
      filters.start_hour = this.rattrapagesStartHour;
    }
    
    if (this.rattrapagesEndHour) {
      filters.end_hour = this.rattrapagesEndHour;
    }
    
    // Toujours inclure les valeurs de tri (même par défaut)
    filters.sort_by = this.rattrapagesSortBy || 'date';
    filters.sort_direction = this.rattrapagesSortDirection || 'desc';
    
    console.log('🔍 Filtres finaux:', filters);
    return filters;
  }
  
  switchTab(tab: string) {
    this.activeTab = tab;
    if (tab === 'rattrapages') {
      // S'assurer que les valeurs de tri par défaut sont définies
      if (!this.rattrapagesSortBy) {
        this.rattrapagesSortBy = 'date';
      }
      if (!this.rattrapagesSortDirection) {
        this.rattrapagesSortDirection = 'desc';
      }
      this.loadRattrapages();
    }
  }

  onTabChange(event: any) {
    this.activeTabIndex = event.index;
    if (event.index === 0) {
      this.activeTab = 'affectation';
    } else if (event.index === 1) {
      this.activeTab = 'rattrapages';
      // S'assurer que les valeurs de tri par défaut sont définies
      if (!this.rattrapagesSortBy) {
        this.rattrapagesSortBy = 'date';
      }
      if (!this.rattrapagesSortDirection) {
        this.rattrapagesSortDirection = 'desc';
      }
      this.loadRattrapages();
    }
  }
  
  // Méthodes de pagination pour rattrapages
  async goToRattrapagesPage(page: number) {
    if (page >= 1 && page <= this.rattrapagesTotalPages) {
      await this.loadRattrapages(page);
    }
  }
  
  async nextRattrapagesPage() {
    if (this.rattrapagesHasNextPage) {
      await this.loadRattrapages(this.rattrapagesCurrentPage + 1);
    }
  }
  
  async prevRattrapagesPage() {
    if (this.rattrapagesHasPrevPage) {
      await this.loadRattrapages(this.rattrapagesCurrentPage - 1);
    }
  }
  
  async firstRattrapagesPage() {
    await this.loadRattrapages(1);
  }
  
  async lastRattrapagesPage() {
    await this.loadRattrapages(this.rattrapagesTotalPages);
  }
  
  getRattrapagesVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const half = Math.floor(maxVisible / 2);
    
    let start = Math.max(1, this.rattrapagesCurrentPage - half);
    let end = Math.min(this.rattrapagesTotalPages, start + maxVisible - 1);
    
    // Adjust start if we're near the end
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }
  
  // Méthodes de filtrage pour rattrapages
  async applyRattrapagesFilters() {
    this.rattrapagesCurrentPage = 1; // Reset to first page when applying filters
    await this.loadRattrapages(1);
  }
  
  onRattrapagesFilterChange() {
    // Ne fait rien automatiquement, l'utilisateur doit cliquer sur "Rechercher"
  }
  
  onRattrapagesSearchChange(searchValue: string) {
    // Ne fait rien automatiquement, l'utilisateur doit cliquer sur "Rechercher"
  }
  
  // Méthode pour lancer la recherche manuellement
  async searchRattrapages() {
    this.isRattrapagesFiltering = true;
    await this.applyRattrapagesFilters();
    this.isRattrapagesFiltering = false;
  }

  // Méthodes pour gérer l'exclusivité entre date exacte et plage de dates
  onDateExactChange() {
    // Si une date exacte est sélectionnée, effacer la plage de dates
    if (this.rattrapagesDate) {
      this.rattrapagesDateFrom = '';
      this.rattrapagesDateTo = '';
    }
  }

  onDateRangeChange() {
    // Si une plage de dates est sélectionnée, effacer la date exacte
    if (this.rattrapagesDateFrom || this.rattrapagesDateTo) {
      this.rattrapagesDate = '';
    }
  }
  
  clearRattrapagesFilters() {
    this.rattrapagesSearchTerm = '';
    this.rattrapagesDate = '';
    this.rattrapagesDateFrom = '';
    this.rattrapagesDateTo = '';
    this.rattrapagesPointageStartHour = '';
    this.rattrapagesStartHour = '';
    this.rattrapagesEndHour = '';
    this.rattrapagesSortBy = 'date';
    this.rattrapagesSortDirection = 'desc';
    this.applyRattrapagesFilters();
  }
  
  public calculateDuration(startHour: string, endHour: string): string {
    const start = new Date(`2000-01-01T${startHour}`);
    const end = new Date(`2000-01-01T${endHour}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  }

  /**
   * Formate une date pour l'API (format Y-m-d)
   */
  private formatDateForAPI(date: any): string {
    if (!date) return '';
    
    // Si c'est déjà une string au format Y-m-d, la retourner
    if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return date;
    }
    
    // Si c'est un objet Date ou une string de date, la convertir
    const dateObj = new Date(date);
    
    // Vérifier que la date est valide
    if (isNaN(dateObj.getTime())) {
      console.warn('Date invalide:', date);
      return '';
    }
    
    // Formater en Y-m-d
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  // TrackBy functions pour optimiser les performances
  trackByEtudiantId(index: number, etudiant: EtudiantWithSelection): number {
    return etudiant.id;
  }

  trackByRattrapageId(index: number, rattrapage: RattrapageWithDuration): number {
    return rattrapage.id || index;
  }

  trackByPromotionId(index: number, promotion: Promotion): number {
    return promotion.id;
  }

  trackByEtablissementId(index: number, etablissement: Etablissement): number {
    return etablissement.id;
  }

  trackByOptionId(index: number, option: Option): number {
    return option.id;
  }

  trackByGroupId(index: number, group: Group): number {
    return group.id;
  }

  trackByVilleId(index: number, ville: Ville): number {
    return ville.id;
  }

  // Méthodes optimisées pour la détection de changement
  private markForCheck(): void {
    this.cdr.markForCheck();
  }

  // Optimisation des méthodes de chargement
  private async loadDataWithOptimization<T>(
    loadFn: () => Promise<T>,
    updateFn: (data: T) => void
  ): Promise<void> {
    try {
      const data = await loadFn();
      updateFn(data);
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.cdr.markForCheck();
    }
  }
}

