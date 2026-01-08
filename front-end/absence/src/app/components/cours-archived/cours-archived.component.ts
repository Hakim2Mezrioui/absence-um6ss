import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { CoursService, Cours, CoursResponse, CoursFilters } from '../../services/cours.service';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-cours-archived',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './cours-archived.component.html',
  styleUrl: './cours-archived.component.css'
})
export class CoursArchivedComponent implements OnInit, OnDestroy {
  cours: Cours[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  lastPage = 1;
  perPage = 12;
  total = 0;
  
  // Filters
  filtersForm: FormGroup;
  
  // Search
  searchValue = '';
  
  // Options de filtre
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  groups: any[] = [];
  villes: any[] = [];
  
  // Permissions
  canUnarchive = false;
  
  // Propriétés pour verrouiller l'établissement pour le rôle defilement
  userEtablissementId: number | null = null;
  isEtablissementLocked = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private coursService: CoursService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filtersForm = this.fb.group({
      etablissement_id: [''],
      promotion_id: [''],
      salle_id: [''],
      type_cours_id: [''],
      group_id: [''],
      ville_id: [''],
      date: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 CoursArchivedComponent initialisé');
    
    // Vérifier si l'utilisateur est defilement et verrouiller l'établissement
    if (this.isDefilementRole()) {
      this.userEtablissementId = this.authService.getUserEtablissementId();
      this.isEtablissementLocked = true;
      
      // Forcer la valeur de l'établissement dans le formulaire
      if (this.userEtablissementId) {
        this.filtersForm.patchValue({
          etablissement_id: this.userEtablissementId
        });
        // Désactiver le champ
        this.filtersForm.get('etablissement_id')?.disable();
      }
    }
    
    this.checkPermissions();
    this.loadArchivedCours();
    this.loadFilterOptions();
    
    // Setup search debounce
    this.filtersForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadArchivedCours();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Vérifier les permissions de l'utilisateur
  checkPermissions(): void {
    // Récupérer le rôle utilisateur depuis le localStorage (comme dans les guards)
    const userRole = localStorage.getItem('userRole');
    
    if (userRole) {
      // Vérifier si l'utilisateur est super-admin ou admin
      this.canUnarchive = userRole === 'super-admin' || userRole === 'admin';
    } else {
      this.canUnarchive = false;
    }
  }

  // Naviguer vers la page des cours actifs
  goToActiveCours(): void {
    this.router.navigate(['/cours']);
  }

  // Désarchiver un cours
  unarchiveCours(cours: Cours): void {
    // Import dynamique pour compat SSR (évite document is not defined)
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Désarchiver ce cours ?',
        text: `"${cours.name}" sera restauré dans la liste des cours actifs.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, désarchiver',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.loading = true;
          this.coursService.unarchiveCours(cours.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                Swal.fire({
                  title: 'Désarchivé',
                  text: 'Cours désarchivé avec succès',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
                this.loadArchivedCours();
                this.loading = false;
              },
              error: (err) => {
                console.error('Error unarchiving cours:', err);
                Swal.fire({
                  title: 'Erreur',
                  text: err.error?.message || 'Erreur lors du désarchivage du cours',
                  icon: 'error'
                });
                this.loading = false;
              }
            });
        }
      });
    });
  }

  // Charger les cours archivés
  loadArchivedCours(): void {
    console.log('🔄 Chargement des cours archivés');
    this.loading = true;
    this.error = '';

    // Pour defilement, forcer l'établissement de l'utilisateur
    let formValue = { ...this.filtersForm.value };
    if (this.isDefilementRole() && this.userEtablissementId) {
      formValue.etablissement_id = this.userEtablissementId;
    }

    const filters: CoursFilters = {
      size: this.perPage,
      page: this.currentPage,
      searchValue: this.searchValue,
      ...formValue
    };

    // Remove empty values
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof CoursFilters];
      if (value === '' || value === null || value === undefined) {
        delete filters[key as keyof CoursFilters];
      }
    });

    console.log('📋 Filtres appliqués:', filters);

    this.coursService.getArchivedCours(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: CoursResponse) => {
          console.log('✅ Cours archivés reçus:', response);
          this.cours = this.coursService.applyCalculatedStatutTemporelToList(response.data);
          this.currentPage = response.current_page;
          this.lastPage = response.last_page;
          this.perPage = response.per_page;
          this.total = response.total;
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des cours archivés:', err);
          this.error = 'Erreur lors du chargement des cours archivés';
          this.loading = false;
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.currentPage = 1;
    this.loadArchivedCours();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadArchivedCours();
  }

  onPerPageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.perPage = parseInt(target.value);
    this.currentPage = 1;
    this.loadArchivedCours();
  }

  clearFilters(): void {
    // Pour defilement, ne pas réinitialiser l'établissement
    if (this.isDefilementRole() && this.userEtablissementId) {
      this.filtersForm.patchValue({
        etablissement_id: this.userEtablissementId,
        promotion_id: '',
        salle_id: '',
        type_cours_id: '',
        group_id: '',
        ville_id: '',
        date: ''
      });
    } else {
      this.filtersForm.reset();
    }
    this.searchValue = '';
    this.currentPage = 1;
    this.loadArchivedCours();
  }

  /**
   * Vérifie si l'utilisateur connecté est un compte Défilement
   */
  public isDefilementRole(): boolean {
    const userRole = this.authService.getUserRoleName();
    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s-]/g, '') : '';
    return normalizedRole === 'defilement' || normalizedRole === 'défilement';
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.lastPage, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('fr-FR');
    } catch (e) {
      return dateString;
    }
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    
    // Si c'est déjà au format HH:MM:SS, prendre les 5 premiers caractères
    if (timeString.includes(':') && timeString.length >= 5) {
      return timeString.substring(0, 5);
    }
    
    // Si c'est un datetime complet, extraire seulement l'heure
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      return timePart ? timePart.substring(0, 5) : '';
    }
    
    return timeString;
  }

  // Méthode pour accéder à Math.min dans le template
  getMathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Méthode pour obtenir les noms des groupes
  getGroupsNames(groups: any[] | undefined): string {
    if (!groups || groups.length === 0) {
      return 'N/A';
    }
    return groups.map(group => group.name || group.title).join(', ');
  }

  // Méthode pour calculer la durée du cours
  calculateDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return 'N/A';
    
    try {
      const start = new Date(`2000-01-01T${startTime}`);
      const end = new Date(`2000-01-01T${endTime}`);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return 'N/A';
      
      const diffMs = end.getTime() - start.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `${diffHours}h ${diffMinutes}min`;
      } else {
        return `${diffMinutes}min`;
      }
    } catch (e) {
      return 'N/A';
    }
  }

  getStatusText(statut: string): string {
    switch (statut) {
      case 'passé':
        return 'Passé';
      case 'en_cours':
        return 'En cours';
      case 'futur':
        return 'Futur';
      default:
        return statut;
    }
  }

  loadFilterOptions(): void {
    // Charger toutes les options de filtre en une seule requête
    this.coursService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.typesCours = response.types_cours || [];
          this.groups = response.groups || [];
          this.villes = response.villes || [];
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
        }
      });
  }
}

