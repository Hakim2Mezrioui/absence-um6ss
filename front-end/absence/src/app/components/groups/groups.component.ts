import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, Validators, FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Import du service et des interfaces
import { 
  GroupsService, 
  Group, 
  GroupFilters,
  GroupFormData,
  GroupCreateResponse
} from '../../services/groups.service';
import { EtablissementsService } from '../../services/etablissements.service';
import { PromotionsService } from '../../services/promotions.service';
import { VilleService } from '../../services/ville.service';

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

@Component({
  selector: 'app-groups',
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
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.css'
})
export class GroupsComponent implements OnInit, OnDestroy {
  // Données
  groups: Group[] = [];
  etablissements: any[] = [];
  promotions: any[] = [];
  villes: any[] = [];
  totalGroups = 0;
  uniqueEtablissements = 0;

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
  searchFocused = false;
  selectFocused = false;

  // États pour les modales
  titleFocused = false;
  etablissementFocused = false;
  promotionFocused = false;
  villeFocused = false;

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
    this.groupForm = new FormGroup({
      title: new FormControl('', [Validators.required, Validators.minLength(2)]),
      etablissement_id: new FormControl('', [Validators.required]),
      promotion_id: new FormControl('', [Validators.required]),
      ville_id: new FormControl('', [Validators.required])
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
        this.loadGroups();
      });
  }

  private loadInitialData(): void {
    this.loadGroups();
    this.loadCreateData();
  }

  // ===== CHARGEMENT DES DONNÉES =====

  loadGroups(): void {
    this.loading = true;
    this.error = '';

    const filters: GroupFilters = {
      searchValue: this.searchValue || undefined,
      etablissement_id: this.selectedEtablissement ? Number(this.selectedEtablissement) : undefined,
      promotion_id: this.selectedPromotion ? Number(this.selectedPromotion) : undefined,
      ville_id: this.selectedVille ? Number(this.selectedVille) : undefined
    };

    this.groupsService.getGroups(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Groups chargés:', response);
          
          this.groups = Array.isArray(response) ? response : [];
          this.totalGroups = this.groups.length;
          this.totalPages = Math.ceil(this.totalGroups / this.pageSize);
          this.searchResults = this.hasActiveFilters() ? this.totalGroups : null;
          
          this.calculateStatistics();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des groupes:', error);
          this.error = 'Erreur lors du chargement des groupes';
          this.loading = false;
          this.showErrorSnackBar('Erreur lors du chargement des groupes');
        }
      });
  }

  loadCreateData(): void {
    console.log('🔄 Chargement des données de création...');
    
    // Charger les établissements
    this.etablissementsService.getAllEtablissements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Établissements chargés:', response);
          this.etablissements = response.etablissements || [];
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des établissements:', error);
        }
      });

    // Charger les promotions
    this.promotionsService.getAllPromotions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Promotions chargées:', response);
          this.promotions = response.promotions || [];
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des promotions:', error);
        }
      });

    // Charger les villes
    this.villeService.getAllVilles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Villes chargées:', response);
          this.villes = response || [];
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des villes:', error);
        }
      });
  }

  private calculateStatistics(): void {
    // Calculer le nombre d'établissements uniques
    const etablissementsUniques = new Set(
      this.groups
        .filter(g => g.etablissement_id)
        .map(g => g.etablissement_id)
    );
    this.uniqueEtablissements = etablissementsUniques.size;
  }

  // ===== RECHERCHE ET FILTRES =====

  onSearchChange(event: any): void {
    this.searchValue = event.target.value;
    this.searchSubject$.next(this.searchValue);
  }

  clearFilters(): void {
    console.log('🧹 Réinitialisation de tous les filtres');
    this.searchValue = '';
    this.selectedEtablissement = '';
    this.selectedPromotion = '';
    this.selectedVille = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.loadGroups();
  }

  onEtablissementChange(): void {
    console.log('🏢 Filtre établissement changé:', this.selectedEtablissement);
    this.currentPage = 1;
    this.loadGroups();
  }

  onPromotionChange(): void {
    console.log('🎓 Filtre promotion changé:', this.selectedPromotion);
    this.currentPage = 1;
    this.loadGroups();
  }

  onVilleChange(): void {
    console.log('🏙️ Filtre ville changé:', this.selectedVille);
    this.currentPage = 1;
    this.loadGroups();
  }

  applyFilters(): void {
    console.log('🔍 Application des filtres');
    this.currentPage = 1;
    this.loadGroups();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.loadGroups();
  }

  clearEtablissementFilter(): void {
    this.selectedEtablissement = '';
    this.currentPage = 1;
    this.loadGroups();
  }

  clearPromotionFilter(): void {
    this.selectedPromotion = '';
    this.currentPage = 1;
    this.loadGroups();
  }

  clearVilleFilter(): void {
    this.selectedVille = '';
    this.currentPage = 1;
    this.loadGroups();
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

  getEtablissementPlaceholder(): string {
    if (this.etablissements.length === 0) return 'Aucun établissement disponible';
    return `Choisir parmi ${this.etablissements.length} établissement(s)`;
  }

  getPromotionPlaceholder(): string {
    if (this.promotions.length === 0) return 'Aucune promotion disponible';
    return `Choisir parmi ${this.promotions.length} promotion(s)`;
  }

  getVillePlaceholder(): string {
    if (this.villes.length === 0) return 'Aucune ville disponible';
    return `Choisir parmi ${this.villes.length} ville(s)`;
  }

  getSelectedEtablissementName(): string {
    if (!this.selectedEtablissement) return '';
    const etablissement = this.etablissements.find(e => e.id === Number(this.selectedEtablissement));
    return etablissement ? etablissement.name : '';
  }

  getSelectedPromotionName(): string {
    if (!this.selectedPromotion) return '';
    const promotion = this.promotions.find(p => p.id === Number(this.selectedPromotion));
    return promotion ? promotion.name : '';
  }

  getSelectedVilleName(): string {
    if (!this.selectedVille) return '';
    const ville = this.villes.find(v => v.id === Number(this.selectedVille));
    return ville ? ville.name : '';
  }

  getGroupsCountByEtablissement(etablissementId: number): number {
    return this.groups.filter(g => g.etablissement_id === etablissementId).length;
  }

  getGroupsCountByPromotion(promotionId: number): number {
    return this.groups.filter(g => g.promotion_id === promotionId).length;
  }

  getGroupsCountByVille(villeId: number): number {
    return this.groups.filter(g => g.ville_id === villeId).length;
  }

  trackByEtablissement(index: number, etablissement: any): number {
    return etablissement.id;
  }

  trackByPromotion(index: number, promotion: any): number {
    return promotion.id;
  }

  trackByVille(index: number, ville: any): number {
    return ville.id;
  }

  // ===== PAGINATION =====

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadGroups();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadGroups();
  }

  getQuickNavPages(): (number | string)[] {
    const pages: (number | string)[] = [];
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;

    if (totalPages <= 7) {
      // Si 7 pages ou moins, afficher toutes
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique complexe pour pagination intelligente
      if (currentPage <= 4) {
        // Début: 1, 2, 3, 4, 5, ..., last
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        // Fin: 1, ..., last-4, last-3, last-2, last-1, last
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Milieu: 1, ..., current-1, current, current+1, ..., last
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  }

  // ===== DIALOG MANAGEMENT =====

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
    this.dialogLoading = false;
    this.groupForm.reset();
    this.selectedGroup = null;
  }

  closeDialogOnOverlay(event: MouseEvent): void {
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
    this.deleteLoading = false;
    this.groupToDelete = null;
  }

  // ===== CRUD OPERATIONS =====

  saveGroup(): void {
    if (this.groupForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.dialogLoading = true;
    const formData: GroupFormData = {
      title: this.groupForm.value.title.trim(),
      etablissement_id: Number(this.groupForm.value.etablissement_id),
      promotion_id: Number(this.groupForm.value.promotion_id),
      ville_id: Number(this.groupForm.value.ville_id)
    };

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
          
          this.showSuccessSnackBar(message);
          this.closeDialog();
          this.loadGroups();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la sauvegarde:', error);
          this.dialogLoading = false;
          
          const message = this.isEditMode 
            ? 'Erreur lors de la modification du groupe' 
            : 'Erreur lors de la création du groupe';
          
          this.showErrorSnackBar(message);
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
          this.showSuccessSnackBar('Groupe supprimé avec succès');
          this.closeDeleteDialog();
          this.loadGroups();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.deleteLoading = false;
          this.showErrorSnackBar('Erreur lors de la suppression du groupe');
        }
      });
  }

  // ===== HELPERS =====

  trackByGroup(index: number, group: Group): number {
    return group.id;
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.groupForm.controls).forEach(key => {
      const control = this.groupForm.get(key);
      control?.markAsTouched();
    });
  }

  // ===== NOTIFICATIONS =====

  private showSuccessSnackBar(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['success-snackbar']
    });
  }

  private showErrorSnackBar(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['error-snackbar']
    });
  }
}
