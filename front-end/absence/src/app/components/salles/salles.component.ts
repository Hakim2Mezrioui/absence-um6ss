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
import { SallesService, Salle, CreateSalleRequest } from '../../services/salles.service';
import { BiostarService, BiostarDevice } from '../../services/biostar.service';
import { VilleService, Ville } from '../../services/ville.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-salles',
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
  templateUrl: './salles.component.html',
  styleUrl: './salles.component.css'
})
export class SallesComponent implements OnInit, OnDestroy {
  // Données
  allSalles: Salle[] = []; // Toutes les salles
  salles: Salle[] = []; // Salles filtrées et paginées
  etablissements: any[] = [];
  villes: Ville[] = [];
  totalSalles = 0;

  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalPages = 0;

  // Filtres et recherche
  searchValue = '';
  selectedEtablissement: number | string = '';
  selectedBatiment = '';
  selectedEtage: number | string = '';
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
  selectedSalle: Salle | null = null;
  salleToDelete: Salle | null = null;

  // Form
  salleForm!: FormGroup;
  biostarDevices: BiostarDevice[] = [];
  filteredBiostarDevices: BiostarDevice[] = [];
  devicesLoading = false;
  devicesError: string | null = null;
  deviceSearch = '';

  // Utilitaires
  Math = Math;

  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private sallesService: SallesService,
    private villeService: VilleService,
    private fb: FormBuilder,
    private snackBar: MatSnackBar,
    public authService: AuthService,
    private biostarService: BiostarService
  ) {
    this.initializeForm();
    this.setupSearchDebounce();
  }

  ngOnInit(): void {
    console.log('🏢 Composant Salles initialisé');
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===== INITIALISATION =====

  private initializeForm(): void {
    this.salleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      etablissement_id: ['', [Validators.required]],
      ville_id: ['', [Validators.required]],
      batiment: ['', [Validators.required]],
      etage: ['', [Validators.required]],
      capacite: [''],
      description: [''],
      devices: [[], [Validators.required]]
    });

    // Charger devices quand la ville change
    this.salleForm.get('ville_id')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((villeId) => {
        if (villeId) {
          this.loadBiostarDevices(Number(villeId));
        } else {
          this.biostarDevices = [];
          this.filteredBiostarDevices = [];
          this.deviceSearch = '';
          this.salleForm.get('devices')?.setValue([]);
          this.devicesError = null;
          this.devicesLoading = false;
        }
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
    this.loadSalles();
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

  loadSalles(): void {
    this.loading = true;
    this.error = '';
    
    this.sallesService.getSalles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
          console.log('✅ Toutes les salles chargées:', response);
          
          this.allSalles = response.salles || [];
          this.applyFiltersAndPagination();
        this.loading = false;
      },
      error: (error) => {
          console.error('❌ Erreur lors du chargement des salles:', error);
          this.error = 'Erreur lors du chargement des salles';
        this.loading = false;
          this.showError('Erreur lors du chargement des salles');
      }
    });
  }

  /**
   * Applique les filtres et la pagination côté frontend
   */
  private applyFiltersAndPagination(): void {
    // Filtrer les salles
    let filtered = [...this.allSalles];

    // Filtre par recherche (nom)
    if (this.searchValue && this.searchValue.trim() !== '') {
      const searchLower = this.searchValue.toLowerCase().trim();
      filtered = filtered.filter(salle => 
        salle.name.toLowerCase().includes(searchLower) ||
        salle.batiment.toLowerCase().includes(searchLower) ||
        (salle.description && salle.description.toLowerCase().includes(searchLower))
      );
    }

    // Filtre par établissement
    if (this.selectedEtablissement && this.selectedEtablissement !== '') {
      const etablissementId = Number(this.selectedEtablissement);
      filtered = filtered.filter(salle => salle.etablissement_id === etablissementId);
    }

    // Filtre par bâtiment
    if (this.selectedBatiment && this.selectedBatiment !== '') {
      filtered = filtered.filter(salle => salle.batiment === this.selectedBatiment);
    }

    // Filtre par étage
    if (this.selectedEtage && this.selectedEtage !== '') {
      const etage = Number(this.selectedEtage);
      filtered = filtered.filter(salle => salle.etage === etage);
    }

    // Calculer les totaux
    this.totalSalles = filtered.length;
    this.totalPages = Math.ceil(this.totalSalles / this.pageSize);
    this.searchResults = this.hasActiveFilters() ? this.totalSalles : null;

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
    this.salles = filtered.slice(startIndex, endIndex);
  }

  loadEtablissements(): void {
    this.sallesService.getEtablissements()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
          console.log('✅ Établissements chargés:', response);
        this.etablissements = response.etablissements || [];
      },
      error: (error) => {
          console.error('❌ Erreur lors du chargement des établissements:', error);
          this.showError('Erreur lors du chargement des établissements');
      }
    });
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
    this.selectedEtablissement = '';
    this.selectedBatiment = '';
    this.selectedEtage = '';
    this.searchResults = null;
    this.currentPage = 1;
    this.applyFiltersAndPagination();
  }

  hasActiveFilters(): boolean {
    return this.searchValue.trim() !== '' || 
           this.selectedEtablissement !== '' || 
           this.selectedBatiment !== '' || 
           this.selectedEtage !== '';
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchValue.trim() !== '') count++;
    if (this.selectedEtablissement !== '') count++;
    if (this.selectedBatiment !== '') count++;
    if (this.selectedEtage !== '') count++;
    return count;
  }

  // Helpers pour les listes de filtres
  get uniqueBatimentsList(): string[] {
    return Array.from(new Set(this.allSalles.map(s => s.batiment))).sort();
  }

  get uniqueEtagesList(): number[] {
    return Array.from(new Set(this.allSalles.map(s => s.etage))).sort((a, b) => a - b);
  }

  getEtablissementName(id: number | string): string {
    const etablissement = this.etablissements.find(e => e.id === Number(id));
    return etablissement ? etablissement.name : 'Inconnu';
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
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
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
    this.selectedSalle = null;
    this.salleForm.reset();
    this.showDialog = true;
  }

  openEditDialog(salle: Salle): void {
    this.isEditMode = true;
    this.selectedSalle = salle;
    this.salleForm.patchValue({
      name: salle.name,
      etablissement_id: salle.etablissement_id,
      ville_id: salle.ville_id,
      batiment: salle.batiment,
      etage: salle.etage,
      capacite: salle.capacite || '',
      description: salle.description || '',
      devices: salle.devices || []
    });
    this.showDialog = true;
    // Charger les devices si une ville est déjà définie en mode édition
    const villeId = this.salleForm.get('ville_id')?.value;
    if (villeId) {
      this.loadBiostarDevices(Number(villeId));
    }
  }

  closeDialog(): void {
    this.showDialog = false;
    this.dialogLoading = false;
    this.salleForm.reset();
    this.selectedSalle = null;
  }

  closeDialogOnOverlay(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog();
    }
  }

  openDeleteDialog(salle: Salle): void {
    this.salleToDelete = salle;
    this.showDeleteDialog = true;
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog = false;
    this.deleteLoading = false;
    this.salleToDelete = null;
  }

  // ===== CRUD OPERATIONS =====

  saveSalle(): void {
    if (this.salleForm.invalid) {
      this.markFormGroupTouched();
      return;
    }

    this.dialogLoading = true;
    const formData: CreateSalleRequest = {
      name: this.salleForm.value.name.trim(),
      etablissement_id: Number(this.salleForm.value.etablissement_id),
      ville_id: Number(this.salleForm.value.ville_id),
      batiment: this.salleForm.value.batiment.trim(),
      etage: Number(this.salleForm.value.etage),
      capacite: this.salleForm.value.capacite ? Number(this.salleForm.value.capacite) : undefined,
      description: this.salleForm.value.description ? this.salleForm.value.description.trim() : undefined,
      devices: (this.salleForm.value.devices || [])
    };

    const operation = this.isEditMode
      ? this.sallesService.updateSalle(this.selectedSalle!.id, formData)
      : this.sallesService.createSalle(formData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
          console.log('✅ Salle sauvegardée:', response);
          
          const message = this.isEditMode 
            ? 'Salle modifiée avec succès' 
            : 'Salle créée avec succès';
          
          this.showSuccess(message);
          this.closeDialog();
          this.loadSalles();
      },
      error: (error) => {
          console.error('❌ Erreur lors de la sauvegarde:', error);
          this.dialogLoading = false;
          
          const message = this.isEditMode 
            ? 'Erreur lors de la modification de la salle' 
            : 'Erreur lors de la création de la salle';
          
          this.showError(message);
      }
    });
  }

  confirmDelete(): void {
    if (!this.salleToDelete) return;

    this.deleteLoading = true;

    this.sallesService.deleteSalle(this.salleToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Salle supprimée:', response);
          this.showSuccess('Salle supprimée avec succès');
          this.closeDeleteDialog();
          this.loadSalles();
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.deleteLoading = false;
          this.showError('Erreur lors de la suppression de la salle');
        }
      });
  }

  // ===== HELPERS =====

  trackBySalle(index: number, salle: Salle): number {
    return salle.id;
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

  private markFormGroupTouched(): void {
    Object.keys(this.salleForm.controls).forEach(key => {
      const control = this.salleForm.get(key);
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

  private loadBiostarDevices(villeId: number): void {
    this.devicesLoading = true;
    this.devicesError = null;
    this.biostarService.getDevices(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.biostarDevices = res.devices || [];
          this.filterDevices(); // Initialiser la liste filtrée
          this.devicesLoading = false;
          if (res.devices && res.devices.length === 0) {
            this.devicesError = 'Aucun device disponible pour cette ville.';
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des devices:', err);
          this.biostarDevices = [];
          this.filteredBiostarDevices = [];
          this.devicesLoading = false;
          this.devicesError = err.error?.message || 'Impossible de charger les devices pour cette ville. Vérifiez la configuration Biostar.';
        }
      });
  }

  onSearchInput(value: string): void {
    this.deviceSearch = value || '';
    this.filterDevices(); // Filtrer à chaque changement
  }

  filterDevices(): void {
    const term = (this.deviceSearch || '').toLowerCase().trim();
    if (!term) {
      this.filteredBiostarDevices = [...this.biostarDevices];
    } else {
      this.filteredBiostarDevices = this.biostarDevices.filter(d => {
        const nameMatch = (d.devnm || '').toLowerCase().includes(term);
        const idMatch = String(d.devid).toLowerCase().includes(term);
        return nameMatch || idMatch;
      });
    }
  }

  isDeviceSelected(device: BiostarDevice): boolean {
    const selected = this.salleForm.get('devices')?.value || [];
    return selected.some((d: BiostarDevice) => d.devid === device.devid);
  }

  toggleDevice(device: BiostarDevice): void {
    const selected = [...(this.salleForm.get('devices')?.value || [])];
    const index = selected.findIndex((d: BiostarDevice) => d.devid === device.devid);
    
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(device);
    }
    
    this.salleForm.get('devices')?.setValue(selected);
    this.salleForm.get('devices')?.markAsTouched();
  }
}
