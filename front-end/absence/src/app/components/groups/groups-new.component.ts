import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';

// Services et interfaces
import { GroupsService, Group } from '../../services/groups.service';
import { EtablissementsService } from '../../services/etablissements.service';
import { PromotionsService } from '../../services/promotions.service';
import { VilleService, Ville } from '../../services/ville.service';

@Component({
  selector: 'app-groups-new',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatChipsModule
  ],
  templateUrl: './groups-new.component.html',
  styleUrl: './groups-new.component.css'
})
export class GroupsNewComponent implements OnInit, OnDestroy {
  // Données
  allGroups: Group[] = []; // Tous les groupes
  groups: Group[] = []; // Groupes filtrés et paginés
  etablissements: any[] = [];
  promotions: any[] = [];
  villes: Ville[] = [];
  totalGroups = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Filtres et recherche
  searchValue = '';
  selectedEtablissement: number | string = '';
  selectedPromotion: number | string = '';
  selectedVille: number | string = '';
  searchResults: number | null = null;
  
  // États
  loading = false;
  error = '';

  // Dialog states
  showDialog = false;
  showDeleteDialog = false;
  isEditMode = false;
  dialogLoading = false;
  deleteLoading = false;
  selectedGroup: Group | null = null;
  groupToDelete: Group | null = null;

  // Form
  groupForm!: FormGroup;

  // Utilitaires
  Math = Math;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private groupsService: GroupsService,
    private etablissementsService: EtablissementsService,
    private promotionsService: PromotionsService,
    private villeService: VilleService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    console.log('👥 Composant Groups initialisé');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALISATION =====

  private initializeForm(): void {
    this.groupForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(2)]],
      etablissement_id: ['', [Validators.required]],
      promotion_id: ['', [Validators.required]],
      ville_id: ['', [Validators.required]]
    });
  }

  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.applyFiltersAndPagination();
      });
  }

  private loadInitialData(): void {
    this.loadVilles();
    this.loadEtablissements();
    this.loadPromotions();
    this.loadGroups();
  }

  // ===== CHARGEMENT DES DONNÉES =====

  loadVilles(): void {
    this.villeService.getAllVilles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (villes) => {
          console.log('✅ Villes chargées:', villes);
          this.villes = villes;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des villes:', error);
          this.showError('Erreur lors du chargement des villes');
        }
      });
  }

  loadGroups(): void {
    this.loading = true;
    this.error = '';
    
    this.groupsService.getAllGroups()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (groups) => {
          console.log('✅ Tous les groupes chargés:', groups);
          this.allGroups = groups;
          this.applyFiltersAndPagination();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des groupes:', error);
          this.error = 'Erreur lors du chargement des groupes';
          this.loading = false;
        }
      });
  }

  loadEtablissements(): void {
    this.etablissementsService.getAllEtablissements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (etablissements) => {
          console.log('✅ Établissements chargés:', etablissements);
          this.etablissements = etablissements;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des établissements:', error);
          this.showError('Erreur lors du chargement des établissements');
        }
      });
  }

  loadPromotions(): void {
    this.promotionsService.getAllPromotions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (promotions) => {
          console.log('✅ Promotions chargées:', promotions);
          this.promotions = promotions;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des promotions:', error);
          this.showError('Erreur lors du chargement des promotions');
        }
      });
  }

  // ===== FILTRAGE ET PAGINATION =====

  applyFiltersAndPagination(): void {
    let filteredGroups = [...this.allGroups];

    // Filtrage par recherche
    if (this.searchValue.trim()) {
      const searchTerm = this.searchValue.toLowerCase();
      filteredGroups = filteredGroups.filter(group =>
        group.title.toLowerCase().includes(searchTerm) ||
        group.promotion?.name.toLowerCase().includes(searchTerm) ||
        group.etablissement?.name.toLowerCase().includes(searchTerm) ||
        group.ville?.name.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrage par établissement
    if (this.selectedEtablissement) {
      filteredGroups = filteredGroups.filter(group => 
        group.etablissement_id === Number(this.selectedEtablissement)
      );
    }

    // Filtrage par promotion
    if (this.selectedPromotion) {
      filteredGroups = filteredGroups.filter(group => 
        group.promotion_id === Number(this.selectedPromotion)
      );
    }

    // Filtrage par ville
    if (this.selectedVille) {
      filteredGroups = filteredGroups.filter(group => 
        group.ville_id === Number(this.selectedVille)
      );
    }

    // Calcul des statistiques
    this.totalGroups = filteredGroups.length;
    this.totalPages = Math.ceil(this.totalGroups / this.pageSize);
    this.searchResults = this.hasActiveFilters() ? this.totalGroups : null;

    // Pagination
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.groups = filteredGroups.slice(startIndex, endIndex);

    console.log(`📊 Groupes filtrés: ${this.totalGroups} total, page ${this.currentPage}/${this.totalPages}`);
  }

  // ===== GESTION DES FILTRES =====

  onSearchChange(): void {
    this.searchSubject$.next(this.searchValue);
  }

  applyFilters(): void {
    console.log('🔍 Application des filtres');
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearFilters(): void {
    console.log('🧹 Réinitialisation de tous les filtres');
    this.searchValue = '';
    this.selectedEtablissement = '';
    this.selectedPromotion = '';
    this.selectedVille = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearEtablissementFilter(): void {
    this.selectedEtablissement = '';
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearPromotionFilter(): void {
    this.selectedPromotion = '';
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearVilleFilter(): void {
    this.selectedVille = '';
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  hasActiveFilters(): boolean {
    return this.searchValue.trim() !== '' || 
           this.selectedEtablissement !== '' || 
           this.selectedPromotion !== '' || 
           this.selectedVille !== '';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchValue.trim() !== '') count++;
    if (this.selectedEtablissement !== '') count++;
    if (this.selectedPromotion !== '') count++;
    if (this.selectedVille !== '') count++;
    return count;
  }

  // ===== PAGINATION =====

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.applyFiltersAndPagination();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  // ===== DIALOGS =====

  openAddDialog(): void {
    this.isEditMode = false;
    this.selectedGroup = null;
    this.groupForm.reset();
    this.showDialog = true;
  }

  openEditDialog(group: Group): void {
    this.isEditMode = true;
    this.selectedGroup = group;
    this.groupForm.patchValue({
      title: group.title,
      etablissement_id: group.etablissement_id,
      promotion_id: group.promotion_id,
      ville_id: group.ville_id
    });
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.selectedGroup = null;
    this.groupForm.reset();
    this.dialogLoading = false;
  }

  closeDialogOnOverlay(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeDialog();
    }
  }

  openDeleteDialog(group: Group): void {
    this.groupToDelete = group;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.groupToDelete = null;
    this.deleteLoading = false;
  }

  // ===== CRUD OPERATIONS =====

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.dialogLoading = true;
    const formData = this.groupForm.value;

    const operation = this.isEditMode
      ? this.groupsService.updateGroup(this.selectedGroup!.id, formData)
      : this.groupsService.createGroup(formData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Groupe sauvegardé:', response);
          
          const message = this.isEditMode 
            ? 'Groupe modifié avec succès' 
            : 'Groupe créé avec succès';
          
          this.showSuccess(message);
          this.closeDialog();
          this.loadGroups();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la sauvegarde:', error);
          this.dialogLoading = false;
          
          const message = this.isEditMode 
            ? 'Erreur lors de la modification du groupe' 
            : 'Erreur lors de la création du groupe';
          
          this.showError(message);
        }
      });
  }

  confirmDelete(): void {
    if (!this.groupToDelete) return;

    this.deleteLoading = true;

    this.groupsService.deleteGroup(this.groupToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Groupe supprimé:', response);
          this.showSuccess('Groupe supprimé avec succès');
          this.closeDeleteDialog();
          this.loadGroups();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.deleteLoading = false;
          this.showError('Erreur lors de la suppression du groupe');
        }
      });
  }

  // ===== UTILITAIRES =====

  trackByGroup(index: number, group: Group): number {
    return group.id;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR');
  }

  showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
