import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { EtudiantsService, Etudiant, EtudiantFilters, FilterOptions } from '../../services/etudiants.service';
import { AuthService } from '../../services/auth.service';

// Angular Material Imports
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSortModule, MatSort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatMenuModule } from '@angular/material/menu';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-etudiants',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    // Angular Material Modules
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,

    MatCheckboxModule,
    MatMenuModule,

    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  templateUrl: './etudiants.component.html',
  styleUrl: './etudiants.component.css'
})
export class EtudiantsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  // Données
  allEtudiants: Etudiant[] = []; // Tous les étudiants chargés
  filteredEtudiants: Etudiant[] = []; // Étudiants après filtrage
  etudiants: Etudiant[] = []; // Étudiants affichés (après pagination)
  filterOptions: FilterOptions = {
    promotions: [],
    groups: [],
    villes: [],
    etablissements: [],
    options: []
  };

  // Pagination côté front-end
  currentPage = 1;
  perPage = 10;
  total = 0;
  lastPage = 1;

  // Filtres
  filtersForm: FormGroup;
  globalFilterValue = '';

  // États
  loading = false;
  error = '';
  success = '';

  // Vue
  viewMode: 'cards' | 'table' = 'cards';

  // Sélection
  selectedEtudiants: Etudiant[] = [];
  selectedEtudiantIds: Set<number> = new Set(); // Garder trace des IDs sélectionnés
  selectAll = false;



  // Modal
  showAddModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showImportModal = false;
  showDetailsModal = false;
  showPhotoModal = false;
  selectedEtudiant: Etudiant | null = null;
  selectedPhotoUrl: string | null = null;
  selectedStudentForPhoto: Etudiant | null = null;

  // Table
  displayedColumns: string[] = [
    'select',
    'etudiant',
    'promotion',
    'actions'
  ];

  private destroy$ = new Subject<void>();
  private globalSearchSubject$ = new Subject<string>();

  constructor(
    private etudiantsService: EtudiantsService,
    private fb: FormBuilder,
    private router: Router,
    private cdr: ChangeDetectorRef,
    public authService: AuthService
  ) {
    this.filtersForm = this.fb.group({
      promotion_id: [''],
      group_id: [''],
      ville_id: [''],
      etablissement_id: [''],
      option_id: ['']
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
    this.loadAllEtudiants();
    this.setupFiltersListener();
    this.setupGlobalSearchListener();
    this.loadViewMode();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.globalSearchSubject$.complete();
  }

  ngAfterViewInit() {
    // Configurer le tri et la pagination après l'initialisation des vues
    setTimeout(() => {
      this.setupPagination();
    }, 0);
  }

  private setupPagination() {
    // Configurer le tri
    if (this.sort) {
      this.sort.sortChange.pipe(takeUntil(this.destroy$)).subscribe(() => {
        this.currentPage = 1;
        this.applySorting();
        this.applyFiltersAndPagination();
      });
    }

    // Configurer la pagination
    if (this.paginator) {
      // Initialiser le paginator
      this.paginator.pageSize = this.perPage;
      this.paginator.pageIndex = this.currentPage - 1;
      this.paginator.length = this.total;
      
      // Écouter les changements de pagination
      this.paginator.page.pipe(takeUntil(this.destroy$)).subscribe((event) => {
        this.currentPage = event.pageIndex + 1;
        this.perPage = event.pageSize;
        
        // Faire remonter la page en haut lors du changement
        this.scrollToTop();
        
        // Appliquer la pagination côté front-end
        this.applyPagination();
      });
    }
  }

  /**
   * Appliquer le tri côté front-end
   */
  private applySorting(): void {
    if (!this.sort || !this.sort.active) return;
    
    const sortField = this.sort.active;
    const sortDirection = this.sort.direction;
    
    this.filteredEtudiants.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      // Mapper les champs de tri
      switch (sortField) {
        case 'etudiant':
          valueA = `${a.first_name} ${a.last_name}`.toLowerCase();
          valueB = `${b.first_name} ${b.last_name}`.toLowerCase();
          break;
        case 'promotion':
          valueA = a.promotion?.name?.toLowerCase() || '';
          valueB = b.promotion?.name?.toLowerCase() || '';
          break;
        case 'etablissement':
          valueA = a.etablissement?.name?.toLowerCase() || '';
          valueB = b.etablissement?.name?.toLowerCase() || '';
          break;
        case 'ville':
          valueA = a.ville?.name?.toLowerCase() || '';
          valueB = b.ville?.name?.toLowerCase() || '';
          break;
        default:
          valueA = a[sortField as keyof Etudiant] || '';
          valueB = b[sortField as keyof Etudiant] || '';
      }
      
      if (valueA < valueB) {
        return sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  /**
   * Charger les options de filtre
   */
  loadFilterOptions(): void {
    this.etudiantsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.filterOptions = options;
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.error = 'Erreur lors du chargement des options de filtre';
        }
      });
  }

  /**
   * Charger tous les étudiants une seule fois
   */
  loadAllEtudiants(): void {
    this.loading = true;
    this.error = '';

    this.etudiantsService.getAllEtudiants()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (etudiants) => {
          this.allEtudiants = etudiants;
          this.loading = false;
          this.applyFiltersAndPagination();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des étudiants:', err);
          
          if (err.status === 0) {
            this.error = 'Impossible de se connecter à l\'API. Vérifiez que Laravel est démarré sur http://10.0.244.100:8000';
          } else if (err.status === 404) {
            this.error = 'Endpoint API non trouvé. Vérifiez la route /api/etudiants dans Laravel';
          } else if (err.status === 500) {
            this.error = 'Erreur serveur Laravel. Vérifiez les logs Laravel';
          } else {
            this.error = `Erreur ${err.status}: ${err.statusText || err.message}`;
          }
          
          this.loading = false;
        }
      });
  }

  /**
   * Appliquer les filtres et la pagination côté front-end
   */
  applyFiltersAndPagination(): void {
    // Appliquer les filtres
    this.filteredEtudiants = this.filterStudents(this.allEtudiants);
    
    // Mettre à jour les totaux
    this.total = this.filteredEtudiants.length;
    this.lastPage = Math.ceil(this.total / this.perPage);
    
    // S'assurer que la page actuelle est valide
    if (this.currentPage > this.lastPage && this.lastPage > 0) {
      this.currentPage = this.lastPage;
    }
    
    // Appliquer la pagination
    this.applyPagination();
    
    // Synchroniser la sélection
    this.syncSelectionAfterLoad();
    
    // Mettre à jour le paginator
    this.updatePaginator();
  }

  /**
   * Filtrer les étudiants selon les critères
   */
  private filterStudents(students: Etudiant[]): Etudiant[] {
    let filtered = [...students];
    
    // Filtre de recherche globale
    if (this.globalFilterValue.trim()) {
      const searchTerm = this.globalFilterValue.toLowerCase().trim();
      filtered = filtered.filter(student => 
        student.first_name.toLowerCase().includes(searchTerm) ||
        student.last_name.toLowerCase().includes(searchTerm) ||
        student.email.toLowerCase().includes(searchTerm) ||
        student.matricule.toLowerCase().includes(searchTerm) ||
        student.promotion?.name.toLowerCase().includes(searchTerm) ||
        student.etablissement?.name.toLowerCase().includes(searchTerm) ||
        student.ville?.name.toLowerCase().includes(searchTerm) ||
        student.group?.title.toLowerCase().includes(searchTerm) ||
        student.option?.name.toLowerCase().includes(searchTerm)
      );
    }
    
    // Filtres spécifiques (coercition en nombres pour éviter les mismatches string/number)
    const formValue = this.filtersForm.value as any;
    const promotionId = this.toNumberOrNull(formValue.promotion_id);
    const groupId = this.toNumberOrNull(formValue.group_id);
    const villeId = this.toNumberOrNull(formValue.ville_id);
    const etablissementId = this.toNumberOrNull(formValue.etablissement_id);
    const optionId = this.toNumberOrNull(formValue.option_id);

    if (promotionId !== null) {
      filtered = filtered.filter(student => Number(student.promotion_id) === promotionId);
    }
    
    if (groupId !== null) {
      filtered = filtered.filter(student => Number(student.group_id) === groupId);
    }
    
    if (villeId !== null) {
      filtered = filtered.filter(student => Number(student.ville_id) === villeId);
    }
    
    if (etablissementId !== null) {
      filtered = filtered.filter(student => Number(student.etablissement_id) === etablissementId);
    }
    
    if (optionId !== null) {
      filtered = filtered.filter(student => Number(student.option_id) === optionId);
    }
    
    return filtered;
  }

  private toNumberOrNull(value: any): number | null {
    if (value === undefined || value === null || value === '') return null;
    const n = Number(value);
    return Number.isNaN(n) ? null : n;
  }

  /**
   * Appliquer la pagination côté front-end
   */
  private applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    this.etudiants = this.filteredEtudiants.slice(startIndex, endIndex);
  }

  /**
   * Mettre à jour le paginator Material
   */
  private updatePaginator(): void {
    if (this.paginator) {
      // Éviter la boucle infinie en vérifiant si la valeur a changé
      if (this.paginator.length !== this.total) {
        this.paginator.length = this.total;
      }
      if (this.paginator.pageIndex !== this.currentPage - 1) {
        this.paginator.pageIndex = this.currentPage - 1;
      }
      if (this.paginator.pageSize !== this.perPage) {
        this.paginator.pageSize = this.perPage;
      }
    } else {
      // Essayer de configurer la pagination après un délai
      setTimeout(() => {
        this.setupPagination();
      }, 100);
    }
  }



  /**
   * Configurer l'écouteur des filtres
   */
  setupFiltersListener(): void {
    this.filtersForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.resetToFirstPage();
        this.applyFiltersAndPagination();
      });
  }

  /**
   * Configurer l'écouteur de recherche globale avec debounce
   */
  setupGlobalSearchListener(): void {
    this.globalSearchSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300), // Réduire le délai pour une meilleure réactivité
        distinctUntilChanged() // Éviter les doublons
      )
      .subscribe((searchValue: string) => {
        // Appliquer les filtres immédiatement côté front-end
        this.resetToFirstPage();
        this.applyFiltersAndPagination();
      });
  }



  /**
   * Gérer la recherche globale
   */
  onGlobalFilterChange(event: any): void {
    const searchValue = event.target.value;
    // Mettre à jour immédiatement la valeur affichée
    this.globalFilterValue = searchValue;
    // Envoyer la valeur au Subject qui gérera le debounce pour la recherche
    this.globalSearchSubject$.next(searchValue);
  }

  /**
   * Réinitialiser à la première page
   */
  private resetToFirstPage(): void {
    this.currentPage = 1;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
  }

  /**
   * Gérer la sélection
   */
  onSelectEtudiant(etudiant: Etudiant): void {
    if (this.selectedEtudiantIds.has(etudiant.id)) {
      // Désélectionner
      this.selectedEtudiantIds.delete(etudiant.id);
      this.selectedEtudiants = this.selectedEtudiants.filter(e => e.id !== etudiant.id);
    } else {
      // Sélectionner
      this.selectedEtudiantIds.add(etudiant.id);
      this.selectedEtudiants.push(etudiant);
    }
    this.updateSelectAllState();
  }

  /**
   * Sélectionner/désélectionner tous
   */
  onSelectAll(): void {
    console.log('onSelectAll called, current selectAll state:', this.selectAll);
    console.log('Current visible students:', this.etudiants.length);
    console.log('Current selected IDs:', Array.from(this.selectedEtudiantIds));
    
    // Vérifier si tous les étudiants visibles sont déjà sélectionnés
    const allVisibleSelected = this.etudiants.every(etudiant => this.selectedEtudiantIds.has(etudiant.id));
    
    if (allVisibleSelected) {
      // Désélectionner tous les étudiants visibles
      console.log('Désélectionner tous les étudiants visibles');
      this.etudiants.forEach(etudiant => {
        this.selectedEtudiantIds.delete(etudiant.id);
      });
      this.selectedEtudiants = this.selectedEtudiants.filter(e => 
        !this.etudiants.some(visible => visible.id === e.id)
      );
    } else {
      // Sélectionner tous les étudiants visibles
      console.log('Sélectionner tous les étudiants visibles');
      this.etudiants.forEach(etudiant => {
        if (!this.selectedEtudiantIds.has(etudiant.id)) {
          this.selectedEtudiantIds.add(etudiant.id);
          this.selectedEtudiants.push(etudiant);
        }
      });
    }
    
    console.log('After operation - selected IDs:', Array.from(this.selectedEtudiantIds));
    this.updateSelectAllState();
    this.cdr.detectChanges(); // Forcer la mise à jour de la vue
  }

  /**
   * Mettre à jour l'état de sélection globale
   */
  updateSelectAllState(): void {
    // Vérifier si tous les étudiants visibles sont sélectionnés
    const visibleSelectedCount = this.etudiants.filter(e => this.selectedEtudiantIds.has(e.id)).length;
    const wasSelectAll = this.selectAll;
    this.selectAll = visibleSelectedCount === this.etudiants.length && this.etudiants.length > 0;
    
    console.log('UpdateSelectAllState:', {
      visibleStudents: this.etudiants.length,
      visibleSelected: visibleSelectedCount,
      selectAll: this.selectAll,
      wasSelectAll: wasSelectAll
    });
  }

  /**
   * Réinitialiser la sélection
   */
  resetSelection(): void {
    this.selectedEtudiants = [];
    this.selectedEtudiantIds.clear();
    this.selectAll = false;
  }

  /**
   * Synchroniser la sélection après le chargement des données
   */
  private syncSelectionAfterLoad(): void {
    console.log('syncSelectionAfterLoad - before cleanup:', {
      selectedEtudiants: this.selectedEtudiants.length,
      selectedIds: Array.from(this.selectedEtudiantIds),
      visibleStudents: this.etudiants.length
    });
    
    // Nettoyer les étudiants sélectionnés qui ne sont plus dans la liste actuelle
    this.selectedEtudiants = this.selectedEtudiants.filter(etudiant => 
      this.etudiants.some(current => current.id === etudiant.id)
    );
    
    console.log('syncSelectionAfterLoad - after cleanup:', {
      selectedEtudiants: this.selectedEtudiants.length,
      selectedIds: Array.from(this.selectedEtudiantIds)
    });
    
    // Mettre à jour l'état de sélection globale
    this.updateSelectAllState();
  }

  /**
   * Naviguer vers la page d'ajout d'étudiant
   */
  navigateToAddStudent(): void {
    this.router.navigate(['/add-student']);
  }

  /**
   * Naviguer vers la page d'import simple d'étudiants
   */
  navigateToImport(): void {
    this.router.navigate(['/import-students-simple']);
  }

  /**
   * Ouvrir le modal d'ajout
   */
  openAddModal(): void {
    this.showAddModal = true;
  }

  /**
   * Ouvrir le modal d'édition
   */
  openEditModal(etudiant: Etudiant): void {
    this.selectedEtudiant = etudiant;
    this.showEditModal = true;
  }

  /**
   * Naviguer vers la page d'édition d'étudiant
   */
  navigateToEditStudent(etudiant: Etudiant): void {
    this.router.navigate(['/edit-etudiant', etudiant.id]);
  }

  /**
   * Ouvrir le modal de suppression
   */
  openDeleteModal(etudiant: Etudiant): void {
    this.selectedEtudiant = etudiant;
    this.showDeleteModal = true;
  }

  /**
   * Confirmer la suppression
   */
  confirmDelete(etudiant: Etudiant): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'étudiant ${etudiant.first_name} ${etudiant.last_name} ?`)) {
      this.deleteEtudiant();
    }
  }

  /**
   * Ouvrir le modal d'import
   */
  openImportModal(): void {
    this.showImportModal = true;
  }

  /**
   * Fermer les modals
   */
  closeModals(): void {
    this.showAddModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showImportModal = false;
    this.selectedEtudiant = null;
  }

  /**
   * Supprimer un étudiant
   */
  deleteEtudiant(): void {
    if (!this.selectedEtudiant) return;

    this.loading = true;
    this.etudiantsService.deleteEtudiant(this.selectedEtudiant.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.success = response.message;
          this.closeModals();
          this.loadAllEtudiants(); // Recharger tous les étudiants
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          this.error = 'Erreur lors de la suppression de l\'étudiant';
          this.loading = false;
        }
      });
  }

  /**
   * Supprimer plusieurs étudiants
   */
  deleteSelectedEtudiants(): void {
    if (this.selectedEtudiants.length === 0) return;

    if (confirm(`Êtes-vous sûr de vouloir supprimer ${this.selectedEtudiants.length} étudiant(s) ?`)) {
      this.loading = true;
      this.error = '';
      this.success = '';

      const ids = Array.from(this.selectedEtudiantIds);
      
      this.etudiantsService.deleteMultipleEtudiants(ids)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.success = `${response.deleted_count} étudiant(s) supprimé(s) avec succès`;
            this.resetSelection();
            this.loadAllEtudiants(); // Recharger tous les étudiants
            this.loading = false;
            
            // Afficher les erreurs s'il y en a
            if (response.errors && response.errors.length > 0) {
              console.warn('Erreurs lors de la suppression:', response.errors);
            }
          },
          error: (err) => {
            console.error('Erreur lors de la suppression multiple:', err);
            this.error = 'Erreur lors de la suppression des étudiants';
            this.loading = false;
          }
        });
    }
  }

  /**
   * Exporter les étudiants (utilise les données filtrées côté front-end)
   */
  exportEtudiants(): void {
    // Nettoyer les messages précédents
    this.error = '';
    this.success = '';
    
    // Afficher l'état de chargement
    this.loading = true;

    // Utiliser les étudiants filtrés côté front-end
    const studentsToExport = this.filteredEtudiants;
    
    if (studentsToExport.length === 0) {
      this.error = 'Aucun étudiant à exporter avec les filtres actuels';
      this.loading = false;
      return;
    }

    // Créer un fichier CSV côté front-end
    this.createCSVExport(studentsToExport);
  }

  /**
   * Créer et télécharger un fichier CSV côté front-end
   */
  private createCSVExport(students: Etudiant[]): void {
    try {
      // En-têtes CSV
      const headers = [
        'ID',
        'Matricule',
        'Prénom',
        'Nom',
        'Email',
        'Promotion',
        'Groupe',
        'Établissement',
        'Ville',
        'Option',
        'Date de création'
      ];

      // Données CSV
      const csvData = students.map(student => [
        student.id,
        student.matricule,
        student.first_name,
        student.last_name,
        student.email,
        student.promotion?.name || '',
        student.group?.title || '',
        student.etablissement?.name || '',
        student.ville?.name || '',
        student.option?.name || '',
        new Date(student.created_at).toLocaleDateString('fr-FR')
      ]);

      // Créer le contenu CSV
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      // Créer le blob
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // Nom du fichier
      const fileName = `Etudiants_UM6SS_${new Date().toISOString().split('T')[0]}.csv`;
      
      // Télécharger le fichier
      this.downloadFallback(blob, fileName);
      
      // Afficher un message de succès
      this.success = `Export CSV terminé avec succès ! ${students.length} étudiant(s) exporté(s).`;
      
      // Effacer le message après 5 secondes
      setTimeout(() => {
        this.success = '';
      }, 5000);
      
    } catch (error) {
      console.error('Erreur lors de la création du CSV:', error);
      this.error = 'Erreur lors de la création du fichier CSV';
    }
    
    this.loading = false;
  }

  /**
   * Formater une date
   */
  formatDate(date: string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('fr-FR');
  }

  /**
   * Formater un nom complet
   */
  getFullName(etudiant: Etudiant): string {
    return `${etudiant.first_name} ${etudiant.last_name}`.trim();
  }

  /**
   * Obtenir les initiales pour l'avatar
   */
  getInitials(etudiant: Etudiant): string {
    const firstName = etudiant.first_name ? etudiant.first_name.charAt(0) : '';
    const lastName = etudiant.last_name ? etudiant.last_name.charAt(0) : '';
    return (firstName + lastName).toUpperCase();
  }

  /**
   * Obtenir l'URL de la photo de l'étudiant
   */
  getPhotoUrl(etudiant: Etudiant): string | null {
    if (etudiant.photo) {
      let url: string;
      
      // Gérer différents formats de chemins possibles
      if (etudiant.photo.startsWith('http')) {
        // URL absolue déjà complète
        url = etudiant.photo;
      } else if (etudiant.photo.startsWith('/storage/') || etudiant.photo.startsWith('storage/')) {
        const path = etudiant.photo.startsWith('/') ? etudiant.photo : '/' + etudiant.photo;
        url = `http://10.0.244.100:8000${path}`;
      } else if (etudiant.photo.startsWith('photos/')) {
        url = `http://10.0.244.100:8000/storage/${etudiant.photo}`;
      } else if (etudiant.photo.startsWith('/images/') || etudiant.photo.startsWith('images/')) {
        const path = etudiant.photo.startsWith('/') ? etudiant.photo : '/' + etudiant.photo;
        url = `http://10.0.244.100:8000${path}`;
      } else {
        url = `http://10.0.244.100:8000/storage/${etudiant.photo}`;
      }
      
      return url;
    }
    return null;
  }
  /**
   * Vérifier si un étudiant est sélectionné
   */
  isSelected(etudiantId: number): boolean {
    return this.selectedEtudiantIds.has(etudiantId);
  }

  /**
   * Obtenir le nombre d'étudiants sélectionnés
   */
  getSelectedCount(): number {
    return this.selectedEtudiantIds.size;
  }

  /**
   * Obtenir le nombre d'étudiants sélectionnés visibles sur la page actuelle
   */
  getVisibleSelectedCount(): number {
    return this.etudiants.filter(e => this.selectedEtudiantIds.has(e.id)).length;
  }

  /**
   * Calculer l'index de début pour l'affichage
   */
  getStartIndex(): number {
    return (this.currentPage - 1) * this.perPage + 1;
  }

  /**
   * Calculer l'index de fin pour l'affichage
   */
  getEndIndex(): number {
    return Math.min(this.currentPage * this.perPage, this.total);
  }

  /**
   * Voir les détails d'un étudiant
   */
  viewEtudiantDetails(etudiant?: Etudiant): void {
    const studentToView = etudiant || this.selectedEtudiant;
    if (studentToView) {
      // Fermer d'abord le modal de photo si ouvert
      if (this.showPhotoModal) {
        this.showPhotoModal = false;
        this.selectedPhotoUrl = null;
      }
      
      this.selectedEtudiant = studentToView;
      this.showDetailsModal = true;
      console.log('Affichage des détails pour:', studentToView);
    }
  }

  /**
   * Fermer la modale des détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedEtudiant = null;
  }

  /**
   * Ouvrir le modal de photo agrandie
   */
  openPhotoModal(etudiant: Etudiant, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const photoUrl = this.getPhotoUrl(etudiant);
    
    if (!photoUrl) {
      console.log('Aucune photo disponible pour cet étudiant');
      return;
    }
    
    // Fermer tous les modals
    this.showDetailsModal = false;
    this.showDeleteModal = false;
    this.showAddModal = false;
    this.showEditModal = false;
    this.showImportModal = false;
    
    // Mettre les valeurs et ouvrir le modal
    this.selectedStudentForPhoto = etudiant;
    this.selectedPhotoUrl = photoUrl;
    this.showPhotoModal = true;
    
    console.log('Modal photo ouvert:', {
      showPhotoModal: this.showPhotoModal,
      photoUrl: this.selectedPhotoUrl,
      etudiant: etudiant.matricule
    });
    
    // Forcer la détection de changement
    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  /**
   * Fermer le modal de photo
   */
  closePhotoModal(): void {
    this.showPhotoModal = false;
    this.selectedPhotoUrl = null;
    this.selectedStudentForPhoto = null;
  }

  /**
   * Gérer la touche Escape pour fermer le modal
   */
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.showPhotoModal) {
      this.closePhotoModal();
    }
  }

  /**
   * Gérer l'erreur de chargement d'image
   */
  onImageError(url: string): void {
    console.error('Erreur de chargement de l\'image:', url);
  }

  /**
   * Vérifier si un étudiant a une photo
   */
  hasPhoto(etudiant: Etudiant): boolean {
    return !!this.getPhotoUrl(etudiant);
  }

  /**
   * Voir l'historique de l'étudiant
   */
  viewHistory(etudiant: Etudiant): void {
    this.selectedEtudiant = etudiant;
    // TODO: Implémenter la navigation vers l'historique
  }

  /**
   * Envoyer un email
   */
  sendEmail(etudiant?: Etudiant): void {
    const studentToEmail = etudiant || this.selectedEtudiant;
    if (studentToEmail) {
      const email = studentToEmail.email;
      window.open(`mailto:${email}`, '_blank');
    }
  }



  /**
   * Obtenir le nombre de filtres actifs
   */
  getActiveFiltersCount(): number {
    let count = 0;
    const formValue = this.filtersForm.value;

    if (formValue.promotion_id) count++;
    if (formValue.group_id) count++;
    if (formValue.ville_id) count++;
    if (formValue.etablissement_id) count++;
    if (formValue.option_id) count++;
    if (this.globalFilterValue.trim()) count++;

    return count;
  }

  /**
   * Appliquer les filtres
   */
  applyFilters(): void {
    // Déclencher la recherche avec les filtres actuels
    this.resetToFirstPage();
    this.applyFiltersAndPagination();

    // Afficher une notification de succès
    this.success = 'Filtres appliqués avec succès';
    setTimeout(() => {
      this.success = '';
    }, 3000);
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filtersForm.reset();
    this.globalFilterValue = '';
    this.resetToFirstPage();
    this.applyFiltersAndPagination();

    // Afficher une notification de succès
    this.success = 'Filtres réinitialisés avec succès';
    setTimeout(() => {
      this.success = '';
    }, 3000);
  }

  /**
   * Effacer tous les filtres
   */
  clearFilters(): void {
    this.resetFilters();
  }

  /**
   * Propriété Math pour les calculs dans le template
   */
  get Math() {
    return Math;
  }



  /**
   * Ajouter une option de téléchargement manuel si les méthodes automatiques échouent
   */
  private addManualDownloadOption(blob: Blob, fileName: string): void {
    console.log('Option de téléchargement manuel disponible');
    
    // Créer un bouton de téléchargement manuel (temporaire)
    const manualDownloadButton = document.createElement('button');
    manualDownloadButton.textContent = `📥 Télécharger ${fileName} manuellement`;
    manualDownloadButton.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 5px;
      cursor: pointer;
      z-index: 9999;
      font-weight: bold;
    `;
    
    manualDownloadButton.onclick = () => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
      document.body.removeChild(manualDownloadButton);
    };
    
    document.body.appendChild(manualDownloadButton);
    
    // Retirer automatiquement après 10 secondes
    setTimeout(() => {
      if (document.body.contains(manualDownloadButton)) {
        document.body.removeChild(manualDownloadButton);
      }
    }, 10000);
  }

  /**
   * Méthode de téléchargement fallback pour compatibilité navigateur
   */
  private downloadFallback(blob: Blob, fileName: string): void {
    try {
      // Créer l'URL du blob
      const url = window.URL.createObjectURL(blob);
      
      // Créer un lien de téléchargement
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      
      // Forcer les attributs pour assurer la compatibilité
      a.setAttribute('download', fileName);
      a.setAttribute('target', '_blank');
      
      // Ajouter au DOM, cliquer, puis retirer
      document.body.appendChild(a);
      
      // Petite pause pour s'assurer que l'élément est bien dans le DOM
      setTimeout(() => {
        a.click();
        
        // Nettoyer après un délai
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          console.log('Téléchargement fallback exécuté et nettoyé');
        }, 100);
      }, 10);
      
    } catch (error) {
      console.error('Erreur dans downloadFallback:', error);
      
      // Dernière méthode de secours : ouvrir dans un nouvel onglet
      const url = window.URL.createObjectURL(blob);
      const newWindow = window.open(url, '_blank');
      if (newWindow) {
        console.log('Fichier ouvert dans un nouvel onglet');
      } else {
        console.error('Impossible d\'ouvrir le fichier - bloqueur de pop-ups actif');
        this.error = 'Téléchargement bloqué. Veuillez autoriser les pop-ups ou télécharger manuellement.';
      }
    }
  }

  /**
   * Faire remonter la page en haut de manière fluide
   */
  private scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  /**
   * Basculer entre vue cartes et tableau
   */
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'cards' ? 'table' : 'cards';
    this.saveViewMode();
  }

  /**
   * Sauvegarder le mode de vue dans le localStorage
   */
  saveViewMode(): void {
    localStorage.setItem('etudiants-view-mode', this.viewMode);
  }

  /**
   * Charger le mode de vue depuis le localStorage
   */
  private loadViewMode(): void {
    const savedMode = localStorage.getItem('etudiants-view-mode');
    if (savedMode === 'cards' || savedMode === 'table') {
      this.viewMode = savedMode;
    }
  }
}

