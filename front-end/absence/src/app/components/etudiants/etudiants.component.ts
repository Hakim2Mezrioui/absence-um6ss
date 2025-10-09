import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { Router } from '@angular/router';
import { EtudiantsService, Etudiant, EtudiantFilters, FilterOptions } from '../../services/etudiants.service';

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
  etudiants: Etudiant[] = [];
  filterOptions: FilterOptions = {
    promotions: [],
    groups: [],
    villes: [],
    etablissements: [],
    options: []
  };

  // Pagination
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
  selectedEtudiant: Etudiant | null = null;

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
    private cdr: ChangeDetectorRef
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
    this.loadEtudiants();
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
        this.loadEtudiants();
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
        
        this.loadEtudiants();
      });
    }
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
   * Charger les étudiants
   */
  loadEtudiants(): void {
    this.loading = true;
    this.error = '';

    const filters: EtudiantFilters = {
      searchValue: this.globalFilterValue,
      ...this.filtersForm.value
    };

    // Nettoyer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof EtudiantFilters]) {
        delete filters[key as keyof EtudiantFilters];
      }
    });
    this.etudiantsService.getEtudiants(this.currentPage, this.perPage, filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.etudiants = response.data || [];
          this.currentPage = response.current_page || 1;
          this.perPage = response.per_page || 10;
          this.total = response.total || 0;
          this.lastPage = response.last_page || 1;
          this.loading = false;
          this.syncSelectionAfterLoad();
          
          // Mettre à jour le paginator seulement si nécessaire
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
        },
        error: (err) => {
          console.error('Erreur lors du chargement des étudiants:', err);
          
          if (err.status === 0) {
            this.error = 'Impossible de se connecter à l\'API. Vérifiez que Laravel est démarré sur http://127.0.0.1:8000';
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
      });
  }

  /**
   * Configurer l'écouteur de recherche globale avec debounce
   */
  setupGlobalSearchListener(): void {
    this.globalSearchSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500), // Attendre 500ms après la dernière saisie
        distinctUntilChanged() // Éviter les doublons
      )
      .subscribe((searchValue: string) => {
        // Déclencher la recherche uniquement après le délai
        this.resetToFirstPage();
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
   * Réinitialiser à la première page et recharger
   */
  private resetToFirstPage(): void {
    this.currentPage = 1;
    if (this.paginator) {
      this.paginator.pageIndex = 0;
    }
    this.loadEtudiants();
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
    this.router.navigate(['/dashboard/edit-etudiant', etudiant.id]);
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
          this.loadEtudiants();
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
            this.loadEtudiants(); // Recharger la liste
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
   * Exporter les étudiants
   */
  exportEtudiants(): void {
    // Nettoyer les messages précédents
    this.error = '';
    this.success = '';
    
    // Afficher l'état de chargement
    this.loading = true;

    const filters: EtudiantFilters = {
      searchValue: this.globalFilterValue,
      ...this.filtersForm.value
    };

    // Nettoyer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (!filters[key as keyof EtudiantFilters]) {
        delete filters[key as keyof EtudiantFilters];
      }
    });

    this.etudiantsService.exportEtudiants(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: async (blob) => {
          try {
            console.log('Blob reçu:', blob);
            console.log('Taille du blob:', blob.size);
            console.log('Type du blob:', blob.type);
            
            // Vérifier si le blob est vide
            if (blob.size === 0) {
              console.error('Le blob reçu est vide');
              this.error = 'Le fichier téléchargé est vide. Veuillez réessayer.';
              this.loading = false;
              return;
            }
            
            // Méthode de téléchargement robuste
            const fileName = `Etudiants_UM6SS_${new Date().toISOString().split('T')[0]}.csv`;
            
            // Méthode 1: Téléchargement moderne
            if ('showSaveFilePicker' in window) {
              try {
                const fileHandle = await (window as any).showSaveFilePicker({
                  suggestedName: fileName,
                  types: [{
                    description: 'Fichiers CSV',
                    accept: { 'text/csv': ['.csv'] }
                  }]
                });
                const writable = await fileHandle.createWritable();
                await writable.write(blob);
                await writable.close();
                console.log('Fichier sauvegardé avec showSaveFilePicker');
              } catch (e) {
                console.log('showSaveFilePicker annulé ou échoué, utilisation de la méthode fallback');
                this.downloadFallback(blob, fileName);
              }
            } else {
              // Méthode 2: Fallback classique amélioré
              this.downloadFallback(blob, fileName);
            }
            
            // Afficher un message de succès
            this.success = `Export CSV terminé avec succès ! Fichier de ${(blob.size / 1024).toFixed(1)} KB téléchargé.`;
            
            // Effacer le message après 5 secondes
            setTimeout(() => {
              this.success = '';
            }, 5000);
            
          } catch (downloadError) {
            console.error('Erreur lors du téléchargement:', downloadError);
            this.error = 'Erreur lors du téléchargement du fichier CSV';
          }
          
          this.loading = false;
        },
        error: (err) => {
          console.error('Erreur lors de l\'export:', err);
          
          // Gestion d'erreurs plus détaillée
          if (err.status === 0) {
            this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
          } else if (err.status === 404) {
            this.error = 'Service d\'exportation non trouvé. Contactez l\'administrateur.';
          } else if (err.status === 500) {
            this.error = 'Erreur serveur lors de l\'exportation. Veuillez réessayer.';
          } else if (err.error && err.error.message) {
            this.error = `Erreur: ${err.error.message}`;
          } else {
            this.error = 'Erreur lors de l\'export des étudiants. Veuillez réessayer.';
          }
          
          this.loading = false;
        }
      });
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

