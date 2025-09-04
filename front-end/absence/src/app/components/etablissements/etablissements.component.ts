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
  etablissements: Etablissement[] = [];
  villes: Ville[] = [];
  totalEtablissements = 0;
  uniqueVilles = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Filtres et recherche
  searchValue = '';
  selectedVille: number | string = '';
  searchResults: number | null = null;
  searchFocused = false;
  selectFocused = false;

  // États pour les modales
  nameFocused = false;
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
      name: ['', [Validators.required, Validators.minLength(2)]],
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
        this.loadEtablissements();
      });
  }

  private loadInitialData(): void {
    this.loadVilles();
    this.loadEtablissements();
  }

  // ===== CHARGEMENT DES DONNÉES =====

  loadEtablissements(): void {
    this.loading = true;
    this.error = '';

    const filters: EtablissementFilters = {
      searchValue: this.searchValue || undefined,
      ville_id: this.selectedVille ? Number(this.selectedVille) : undefined
    };

    this.etablissementsService.getEtablissements(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Établissements chargés:', response);
          
          this.etablissements = response.etablissements || [];
          this.totalEtablissements = response.total || 0;
          this.totalPages = Math.ceil(this.totalEtablissements / this.pageSize);
          this.searchResults = this.hasActiveFilters() ? this.totalEtablissements : null;
          
          this.calculateStatistics();
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
    // Calculer le nombre de villes uniques
    const villesUniques = new Set(
      this.etablissements
        .filter(e => e.ville_id)
        .map(e => e.ville_id)
    );
    this.uniqueVilles = villesUniques.size;
  }

  // ===== RECHERCHE ET FILTRES =====

  onSearchChange(event: any): void {
    this.searchValue = event.target.value;
    this.searchSubject$.next(this.searchValue);
  }

  applyFilters(): void {
    this.currentPage = 1;
    this.loadEtablissements();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.selectedVille = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.loadEtablissements();
  }

  clearSearch(): void {
    this.searchValue = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.loadEtablissements();
  }

  clearVilleFilter(): void {
    this.selectedVille = '';
    this.currentPage = 1;
    this.loadEtablissements();
  }

  hasActiveFilters(): boolean {
    return this.searchValue.trim() !== '' || this.selectedVille !== '';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchValue.trim() !== '') count++;
    if (this.selectedVille !== '') count++;
    return count;
  }

  getVillePlaceholder(): string {
    if (this.villes.length === 0) return 'Aucune ville disponible';
    return `Choisir parmi ${this.villes.length} ville(s)`;
  }

  getSelectedVilleName(): string {
    if (!this.selectedVille) return '';
    const ville = this.villes.find(v => v.id === Number(this.selectedVille));
    return ville ? ville.name : '';
  }

  getEtablissementsCountByVille(villeId: number): number {
    return this.etablissements.filter(e => e.ville_id === villeId).length;
  }

  trackByVille(index: number, ville: Ville): number {
    return ville.id;
  }

  // ===== PAGINATION =====

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadEtablissements();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadEtablissements();
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
      name: etablissement.name,
      ville_id: etablissement.ville_id
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
      name: this.etablissementForm.value.name.trim(),
      ville_id: Number(this.etablissementForm.value.ville_id)
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
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  private markFormGroupTouched(): void {
    Object.keys(this.etablissementForm.controls).forEach(key => {
      const control = this.etablissementForm.get(key);
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
