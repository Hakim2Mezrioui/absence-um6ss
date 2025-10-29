import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Import du service et des interfaces
import { 
  EtablissementsService, 
  Etablissement, 
  Ville,
  EtablissementFilters,
  CreateEtablissementRequest
} from '../../services/etablissements.service';

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
  selector: 'app-etablissements',
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
  templateUrl: './etablissements.component.html',
  styleUrl: './etablissements.component.css'
})
export class EtablissementsComponent implements OnInit, OnDestroy {
  // Données
  allEtablissements: Etablissement[] = []; // Tous les établissements
  etablissements: Etablissement[] = []; // Établissements filtrés et paginés
  villes: Ville[] = [];
  totalEtablissements = 0;
  uniqueVilles = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Filtres et recherche
  searchValue = '';
  // Removed: selectedVille filtering on etablissements
  searchResults: number | null = null;
  searchFocused = false;
  selectFocused = false;

  // États pour les modales
  nameFocused = false;
  // Removed: villeFocused

  // États
  loading = false;
  error = '';

  // Dialog states
  showDialog = false;
  showDeleteDialog = false;
  isEditMode = false;
  dialogLoading = false;
  deleteLoading = false;
  selectedEtablissement: Etablissement | null = null;
  etablissementToDelete: Etablissement | null = null;

  // Form
  etablissementForm!: FormGroup;

  // Utilitaires
  Math = Math;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private etablissementsService: EtablissementsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    console.log('🏢 Composant Établissements initialisé');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALISATION =====

  private initializeForm(): void {
    this.etablissementForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]]
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
    this.loadEtablissements();
  }

  // ===== CHARGEMENT DES DONNÉES =====

  loadEtablissements(): void {
    this.loading = true;
    this.error = '';

    this.etablissementsService.getAllEtablissements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Tous les établissements chargés:', response);
          
          this.allEtablissements = response.etablissements || [];
          this.applyFiltersAndPagination();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des établissements:', error);
          this.error = 'Erreur lors du chargement des établissements';
          this.loading = false;
          this.showErrorSnackBar('Erreur lors du chargement des établissements');
        }
      });
  }

  /**
   * Applique les filtres et la pagination côté frontend
   */
  private applyFiltersAndPagination(): void {
    // Filtrer les établissements
    let filtered = [...this.allEtablissements];

    // Filtre par recherche (nom)
    if (this.searchValue && this.searchValue.trim() !== '') {
      const searchLower = this.searchValue.toLowerCase().trim();
      filtered = filtered.filter(etab => 
        etab.name.toLowerCase().includes(searchLower)
      );
    }

    // Removed: filtre par ville (etablissements no longer carry ville_id)

    // Calculer les totaux
    this.totalEtablissements = filtered.length;
    this.totalPages = Math.ceil(this.totalEtablissements / this.pageSize);
    this.searchResults = this.hasActiveFilters() ? this.totalEtablissements : null;

    // Ajuster la page actuelle si nécessaire
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    if (this.currentPage < 1 && this.totalPages > 0) {
      this.currentPage = 1;
    }

    // Paginer
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.etablissements = filtered.slice(startIndex, endIndex);

    // Calculer les statistiques
    this.calculateStatistics();
  }

  loadVilles(): void {
    this.etablissementsService.getAllVilles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Villes chargées:', response);
    this.villes = response.villes || [];
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des villes:', error);
          this.showErrorSnackBar('Erreur lors du chargement des villes');
        }
      });
  }

  private calculateStatistics(): void {
    // Calculer le nombre de villes uniques depuis tous les établissements
    this.uniqueVilles = 0;
  }

  // ===== RECHERCHE ET FILTRES =====

  onSearchChange(event: any): void {
    this.searchValue = event.target.value;
    this.searchSubject$.next(this.searchValue);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  clearFilters(): void {
    this.searchValue = '';
    // Removed: selectedVille reset
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

  clearVilleFilter(): void {
    // Removed: selectedVille reset
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  hasActiveFilters(): boolean {
    return this.searchValue.trim() !== '';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchValue.trim() !== '') count++;
    return count;
  }

  getVillePlaceholder(): string {
    if (this.villes.length === 0) return 'Aucune ville disponible';
    return `Choisir parmi ${this.villes.length} ville(s)`;
  }

  getSelectedVilleName(): string {
    return '';
  }

  getEtablissementsCountByVille(villeId: number): number {
    return 0;
  }

  trackByVille(index: number, ville: Ville): number {
    return ville.id;
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
    this.selectedEtablissement = null;
    this.etablissementForm.reset();
    this.showDialog = true;
  }

  openEditDialog(etablissement: Etablissement): void {
    this.isEditMode = true;
    this.selectedEtablissement = etablissement;
    this.etablissementForm.patchValue({
      name: etablissement.name
    });
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
    this.dialogLoading = false;
    this.etablissementForm.reset();
    this.selectedEtablissement = null;
  }

  closeDialogOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog();
    }
  }

  openDeleteDialog(etablissement: Etablissement): void {
    this.etablissementToDelete = etablissement;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.deleteLoading = false;
    this.etablissementToDelete = null;
  }

  // ===== CRUD OPERATIONS =====

  saveEtablissement(): void {
    if (this.etablissementForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.dialogLoading = true;
    const formData: CreateEtablissementRequest = {
      name: this.etablissementForm.value.name.trim()
    };

    const operation = this.isEditMode
      ? this.etablissementsService.updateEtablissement(this.selectedEtablissement!.id, formData)
      : this.etablissementsService.createEtablissement(formData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Établissement sauvegardé:', response);
          
          const message = this.isEditMode 
            ? 'Établissement modifié avec succès' 
            : 'Établissement créé avec succès';
          
          this.showSuccessSnackBar(message);
          this.closeDialog();
          
          // Recharger tous les établissements
          this.loadEtablissements();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la sauvegarde:', error);
          this.dialogLoading = false;
          
          const message = this.isEditMode 
            ? 'Erreur lors de la modification de l\'établissement' 
            : 'Erreur lors de la création de l\'établissement';
          
          this.showErrorSnackBar(message);
        }
      });
  }

  confirmDelete(): void {
    if (!this.etablissementToDelete) return;

    this.deleteLoading = true;

    this.etablissementsService.deleteEtablissement(this.etablissementToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Établissement supprimé:', response);
          this.showSuccessSnackBar('Établissement supprimé avec succès');
          this.closeDeleteDialog();
          
          // Recharger tous les établissements
          this.loadEtablissements();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.deleteLoading = false;
          this.showErrorSnackBar('Erreur lors de la suppression de l\'établissement');
        }
      });
  }

  // ===== HELPERS =====

  trackByEtablissement(index: number, etablissement: Etablissement): number {
    return etablissement.id;
  }

  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return 'Date invalide';
    }
  }

  formatDateTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.etablissementForm.controls).forEach(key => {
      const control = this.etablissementForm.get(key);
      control?.markAsTouched();
    });
  }

  // ===== NOTIFICATIONS =====

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  private showSuccessSnackBar(message: string): void {
    this.showSuccess(message);
  }

  private showErrorSnackBar(message: string): void {
    this.showError(message);
  }
}
