import { Component, OnInit, inject, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RattrapageService, Etudiant, Rattrapage } from '../../services/rattrapage.service';
import { NotificationService } from '../../services/notification.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

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
  rattrapagesStartHour: string = '';
  rattrapagesEndHour: string = '';
  rattrapagesSortBy: string = 'date';
  rattrapagesSortDirection: string = 'desc';
  
  // UI state
  loading = false;
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
  
  constructor() {
    this.rattrapageForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      start_hour: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      end_hour: ['', [Validators.required, Validators.pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)]],
      date: ['', [Validators.required]]
    });
  }
  
  ngOnInit() {
    this.loadFilterData();
    this.loadEtudiants();
    this.setupSearchDebounce();
  }
  
  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
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
      this.loading = true;
      
      const filterOptions = await this.rattrapageService.getFilterOptions().toPromise();
      
      if (filterOptions) {
        this.promotions = filterOptions.promotions || [];
        this.etablissements = filterOptions.etablissements || [];
        this.options = filterOptions.options || [];
        this.groups = filterOptions.groups || [];
        this.villes = filterOptions.villes || [];
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données de filtrage:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Impossible de charger les données de filtrage.'
      );
    } finally {
      this.loading = false;
    }
  }
  
  async loadEtudiants(page: number = 1) {
    this.loading = true;
    this.markForCheck();
    
    await this.loadDataWithOptimization(
      async () => {
        const filters = this.getCurrentFilters();
        const response = await this.rattrapageService.getEtudiants(page, this.perPage, filters).toPromise();
        return response;
      },
      (response) => {
        if (response) {
          this.etudiants = (response.data || []).map((etudiant: Etudiant) => ({
            ...etudiant,
            selected: this.selectedEtudiantIds.has(etudiant.id) // Restaurer l'état de sélection
          }));
          
          // Mettre à jour les informations de pagination
          this.currentPage = response.current_page;
          this.totalPages = response.last_page;
          this.totalStudents = response.total;
          this.hasNextPage = response.has_next_page;
          this.hasPrevPage = response.has_prev_page;
          
          // Mettre à jour la liste des étudiants sélectionnés
          this.updateSelectedEtudiants();
        }
        this.loading = false;
      }
    );
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
    this.applyFilters();
  }
  
  onSearchChange(searchValue: string) {
    // Émettre la valeur dans le Subject pour déclencher le debounce
    this.searchSubject.next(searchValue);
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
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    this.rattrapageForm.patchValue({ date: today });
  }
  
  closeCreateModal() {
    this.showCreateModal = false;
    this.rattrapageForm.reset();
  }
  
  async createRattrapage() {
    if (this.rattrapageForm.invalid) {
      this.markFormGroupTouched(this.rattrapageForm);
      return;
    }
    
    // Validate hours
    const startHour = this.rattrapageForm.value.start_hour;
    const endHour = this.rattrapageForm.value.end_hour;
    const date = this.rattrapageForm.value.date;
    
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
      const rattrapageData = this.rattrapageForm.value;
      const rattrapageResponse = await this.rattrapageService.createRattrapage(rattrapageData).toPromise();
      
      if (!rattrapageResponse?.success) {
        throw new Error(rattrapageResponse?.message || 'Erreur lors de la création du rattrapage');
      }
      
      const rattrapageId = rattrapageResponse.data?.id;
      if (!rattrapageId) {
        throw new Error('ID du rattrapage non trouvé');
      }
      
      // 2. Assign students to rattrapage
      const assignmentPromises = this.selectedEtudiants.map(etudiant => 
        this.rattrapageService.assignStudentToRattrapage(etudiant.id, rattrapageId).toPromise()
      );
      
      await Promise.all(assignmentPromises);
      
      this.notificationService.success(
        'Rattrapage créé avec succès!',
        `${this.selectedEtudiants.length} étudiant(s) ont été affecté(s) au rattrapage "${rattrapageData.name}".`
      );
      
      // Reset form and selections
      this.closeCreateModal();
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
      this.router.navigate(['/dashboard/rattrapages', rattrapage.id, 'students']);
    }
  }

  async loadRattrapageStudents(page: number = 1) {
    if (!this.selectedRattrapage?.id) return;
    
    try {
      this.studentsLoading = true;
      this.studentsCurrentPage = page;
      
      const response = await this.rattrapageService.getStudentsByRattrapage(
        this.selectedRattrapage.id,
        page,
        this.studentsPerPage,
        this.studentsSearchTerm || undefined
      ).toPromise();
      
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
    this.loading = true;
    this.markForCheck();
    
    await this.loadDataWithOptimization(
      async () => {
        const filters = this.getRattrapagesFilters();
        const response = await this.rattrapageService.getAllRattrapages(page, this.rattrapagesPerPage, filters).toPromise();
        return response;
      },
      (response) => {
        if (response?.success) {
          this.rattrapages = (response.data || []).map(rattrapage => ({
            ...rattrapage,
            duration: this.calculateDuration(rattrapage.start_hour, rattrapage.end_hour)
          }));
          
          // Mettre à jour les informations de pagination
          this.rattrapagesCurrentPage = response.pagination.current_page;
          this.rattrapagesTotalPages = response.pagination.last_page;
          this.rattrapagesTotal = response.pagination.total;
          this.rattrapagesHasNextPage = response.pagination.has_next_page;
          this.rattrapagesHasPrevPage = response.pagination.has_prev_page;
        }
        this.loading = false;
      }
    );
  }
  
  getRattrapagesFilters() {
    const filters: any = {};
    
    if (this.rattrapagesSearchTerm.trim()) {
      filters.search = this.rattrapagesSearchTerm.trim();
    }
    
    if (this.rattrapagesDate) {
      filters.date = this.rattrapagesDate;
    }
    
    if (this.rattrapagesDateFrom) {
      filters.date_from = this.rattrapagesDateFrom;
    }
    
    if (this.rattrapagesDateTo) {
      filters.date_to = this.rattrapagesDateTo;
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
      this.markForCheck();
    } catch (error) {
      console.error('Erreur lors du chargement:', error);
      this.markForCheck();
    }
  }
}
