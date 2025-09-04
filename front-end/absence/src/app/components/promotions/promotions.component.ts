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
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

// Services et interfaces
import { 
  PromotionsService, 
  Promotion, 
  PromotionFilters 
} from '../../services/promotions.service';

// Interfaces pour établissements et facultés (à adapter selon votre projet)
interface Etablissement {
  id: number;
  name: string;
}

interface Faculte {
  id: number;
  name: string;
}

@Component({
  selector: 'app-promotions',
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
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatTooltipModule,
    MatSnackBarModule
  ],
  templateUrl: './promotions.component.html',
  styleUrl: './promotions.component.css'
})
export class PromotionsComponent implements OnInit, OnDestroy {
  // Données
  promotions: Promotion[] = [];
  totalPromotions = 0;
  totalStudents = 0;
  etablissements: Etablissement[] = [];
  facultes: Faculte[] = [];

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Filtres et recherche
  searchValue = '';
  selectedEtablissement: number | string = '';
  selectedFaculte: number | string = '';

  // États
  loading = false;
  error = '';

  // Dialog states
  showDialog = false;
  showDetailsDialog = false;
  showDeleteDialog = false;
  isEditMode = false;
  dialogLoading = false;
  deleteLoading = false;
  selectedPromotion: Promotion | null = null;
  promotionToDelete: Promotion | null = null;

  // Form
  promotionForm!: FormGroup;

  // Table configuration
  displayedColumns: string[] = ['name', 'dates', 'actions'];

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private promotionsService: PromotionsService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    this.initializeForm();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    console.log('🎓 Composant Promotions initialisé');
    this.loadPromotions();
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialisation du formulaire
   */
  private initializeForm(): void {
    this.promotionForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      etablissement_id: [''],
      faculte_id: ['']
    });
  }

  /**
   * Configuration du debounce pour la recherche
   */
  private setupSearchDebounce(): void {
    this.searchSubject$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadPromotions();
      });
  }

  /**
   * Charger les promotions
   */
  loadPromotions(): void {
    this.loading = true;
    this.error = '';

    const filters: PromotionFilters = {};
    if (this.searchValue.trim()) {
      filters.searchValue = this.searchValue.trim();
    }
    if (this.selectedEtablissement) {
      filters.etablissement_id = Number(this.selectedEtablissement);
    }
    if (this.selectedFaculte) {
      filters.faculte_id = Number(this.selectedFaculte);
    }

    this.promotionsService.getPromotions(this.currentPage, this.pageSize, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Promotions chargées:', response);
          this.promotions = response.promotions;
          this.totalPromotions = response.total;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des promotions:', error);
          this.error = 'Erreur lors du chargement des promotions';
          this.loading = false;
          this.showError('Erreur lors du chargement des promotions');
        }
      });
  }

  /**
   * Charger les options de filtres (établissements, facultés)
   */
  private loadFilterOptions(): void {
    // TODO: Implémenter le chargement des établissements et facultés
    // selon les services disponibles dans votre projet
  }

  /**
   * Gestionnaire de changement de recherche
   */
  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.searchSubject$.next(this.searchValue);
  }

  /**
   * Changement d'établissement
   */
  onEtablissementChange(): void {
    this.currentPage = 1;
    this.loadPromotions();
  }

  /**
   * Changement de faculté
   */
  onFaculteChange(): void {
    this.currentPage = 1;
    this.loadPromotions();
  }

  /**
   * Effacer les filtres
   */
  clearFilters(): void {
    this.searchValue = '';
    this.selectedEtablissement = '';
    this.selectedFaculte = '';
    this.currentPage = 1;
    this.loadPromotions();
  }

  /**
   * Changement de taille de page
   */
  onPageSizeChange(): void {
    this.currentPage = 1;
    this.loadPromotions();
  }

  /**
   * Changement de page
   */
  onPageChange(event: PageEvent): void {
    this.currentPage = event.pageIndex + 1;
    this.pageSize = event.pageSize;
    this.loadPromotions();
  }

  /**
   * Définir la taille de page
   */
  setPageSize(size: number): void {
    if (this.pageSize !== size) {
      this.pageSize = size;
      this.currentPage = 1;
      this.loadPromotions();
    }
  }

  /**
   * Aller à une page spécifique
   */
  goToPage(page: number): void {
    if (page !== this.currentPage && page >= 1 && page <= Math.ceil(this.totalPromotions / this.pageSize)) {
      this.currentPage = page;
      this.loadPromotions();
    }
  }

  /**
   * Saut rapide vers une page
   */
  jumpToPage(event: any): void {
    const page = parseInt(event.target.value, 10);
    if (page && page >= 1 && page <= Math.ceil(this.totalPromotions / this.pageSize)) {
      this.goToPage(page);
    }
  }

  /**
   * Obtenir les pages visibles pour la pagination
   */
  getVisiblePages(): number[] {
    const totalPages = Math.ceil(this.totalPromotions / this.pageSize);
    const delta = 2; // Nombre de pages à afficher de chaque côté de la page courante
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, this.currentPage - delta); 
         i <= Math.min(totalPages - 1, this.currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (this.currentPage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 représente les points de suspension
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (this.currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-1, totalPages);
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter(page => page > 0); // Filtrer les points de suspension pour l'instant
  }

  /**
   * Propriété helper pour Math dans le template
   */
  Math = Math;

  /**
   * Ouvrir le dialog d'ajout
   */
  openAddDialog(): void {
    this.isEditMode = false;
    this.selectedPromotion = null;
    this.promotionForm.reset();
    this.showDialog = true;
  }

  /**
   * Ouvrir le dialog de modification
   */
  openEditDialog(promotion: Promotion): void {
    this.isEditMode = true;
    this.selectedPromotion = promotion;
    this.promotionForm.patchValue({
      name: promotion.name,
      etablissement_id: promotion.etablissement_id || '',
      faculte_id: promotion.faculte_id || ''
    });
    this.showDialog = true;
    this.showDetailsDialog = false;
  }

  /**
   * Ouvrir le dialog de détails
   */
  openDetailsDialog(promotion: Promotion): void {
    this.selectedPromotion = promotion;
    this.showDetailsDialog = true;
  }

  /**
   * Fermer le dialog principal
   */
  closeDialog(): void {
    this.showDialog = false;
    this.selectedPromotion = null;
    this.promotionForm.reset();
    this.dialogLoading = false;
  }

  /**
   * Fermer le dialog de détails
   */
  closeDetailsDialog(): void {
    this.showDetailsDialog = false;
    this.selectedPromotion = null;
  }

  /**
   * Soumettre le formulaire
   */
  onSubmit(): void {
    if (this.promotionForm.valid) {
      this.dialogLoading = true;
      const formData = this.promotionForm.value;

      // Nettoyer les valeurs vides
      if (!formData.etablissement_id) {
        delete formData.etablissement_id;
      }
      if (!formData.faculte_id) {
        delete formData.faculte_id;
      }

      const request = this.isEditMode && this.selectedPromotion
        ? this.promotionsService.updatePromotion(this.selectedPromotion.id, formData)
        : this.promotionsService.createPromotion(formData);

      request.pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Promotion sauvegardée:', response);
            this.showSuccess(response.message);
            this.closeDialog();
            this.loadPromotions();
          },
          error: (error) => {
            console.error('❌ Erreur lors de la sauvegarde:', error);
            this.dialogLoading = false;
            this.showError('Erreur lors de la sauvegarde de la promotion');
          }
        });
    }
  }

  /**
   * Ouvrir le dialogue de confirmation de suppression
   */
  confirmDelete(promotion: Promotion): void {
    this.promotionToDelete = promotion;
    this.showDeleteDialog = true;
  }

  /**
   * Fermer le dialogue de confirmation de suppression
   */
  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.promotionToDelete = null;
    this.deleteLoading = false;
  }

  /**
   * Confirmer la suppression définitive
   */
  confirmDeletePromotion(): void {
    if (this.promotionToDelete) {
      this.deletePromotion(this.promotionToDelete);
    }
  }

  /**
   * Supprimer une promotion
   */
  private deletePromotion(promotion: Promotion): void {
    this.deleteLoading = true;
    
    this.promotionsService.deletePromotion(promotion.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Promotion supprimée:', response);
          this.showSuccess(response.message);
          this.closeDeleteDialog();
          this.loadPromotions();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.deleteLoading = false;
          this.showError('Erreur lors de la suppression de la promotion');
        }
      });
  }

  /**
   * Formater une date
   */
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

  /**
   * Formater une date et heure
   */
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

  /**
   * Afficher un message de succès
   */
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  /**
   * Afficher un message d'erreur
   */
  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }
}
