import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { ExamensService, Examen, ExamenResponse, ExamenFilters } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

@Component({
  selector: 'app-examens-archived',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './examens-archived.component.html',
  styleUrl: './examens-archived.component.css'
})
export class ExamensArchivedComponent implements OnInit, OnDestroy {
  examens: Examen[] = [];
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
  options: any[] = [];
  
  // Permissions
  canUnarchive = false;
  
  // Propriétés pour verrouiller l'établissement pour le rôle defilement
  userEtablissementId: number | null = null;
  isEtablissementLocked = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.filtersForm = this.fb.group({
      etablissement_id: [''],
      promotion_id: [''],
      salle_id: [''],
      date: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 ExamensArchivedComponent initialisé');
    
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
    this.loadArchivedExamens();
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
        this.loadArchivedExamens();
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

  // Naviguer vers la page d'examens actifs
  goToActiveExamens(): void {
    this.router.navigate(['/examens']);
  }

  // Désarchiver un examen
  unarchiveExamen(examen: Examen): void {
    // Import dynamique pour compat SSR (évite document is not defined)
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Désarchiver cet examen ?',
        text: `"${examen.title}" sera restauré dans la liste des examens actifs.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, désarchiver',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.examensService.unarchiveExamen(examen.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                Swal.fire({
                  title: 'Désarchivé',
                  text: 'Examen désarchivé avec succès',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
                this.loadArchivedExamens();
              },
              error: (err) => {
                console.error('Error unarchiving examen:', err);
                Swal.fire({
                  title: 'Erreur',
                  text: 'Erreur lors du désarchivage de l\'examen',
                  icon: 'error'
                });
              }
            });
        }
      });
    });
  }

  // Charger les examens archivés
  loadArchivedExamens(): void {
    console.log('🔄 Chargement des examens archivés');
    this.loading = true;
    this.error = '';

    // Pour defilement, forcer l'établissement de l'utilisateur
    let formValue = { ...this.filtersForm.value };
    if (this.isDefilementRole() && this.userEtablissementId) {
      formValue.etablissement_id = this.userEtablissementId;
    }

    const filters: ExamenFilters = {
      size: this.perPage,
      page: this.currentPage,
      searchValue: this.searchValue,
      ...formValue
    };

    // Remove empty values
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ExamenFilters];
      if (value === '' || value === null || value === undefined) {
        delete filters[key as keyof ExamenFilters];
      }
    });

    console.log('📋 Filtres appliqués:', filters);

    this.examensService.getArchivedExamens(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ExamenResponse) => {
          console.log('✅ Examens archivés reçus:', response);
          this.examens = response.data;
          
          // S'assurer que le statut temporel est calculé pour chaque examen
          this.examens.forEach(examen => {
            if (!examen.statut_temporel) {
              examen.statut_temporel = this.calculateStatutTemporel(examen);
            }
          });
          this.currentPage = response.current_page;
          this.lastPage = response.last_page;
          this.perPage = response.per_page;
          this.total = response.total;
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des examens archivés:', err);
          this.error = 'Erreur lors du chargement des examens archivés';
          this.loading = false;
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.currentPage = 1;
    this.loadArchivedExamens();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadArchivedExamens();
  }

  onPerPageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.perPage = parseInt(target.value);
    this.currentPage = 1;
    this.loadArchivedExamens();
  }

  clearFilters(): void {
    // Pour defilement, ne pas réinitialiser l'établissement
    if (this.isDefilementRole() && this.userEtablissementId) {
      this.filtersForm.patchValue({
        etablissement_id: this.userEtablissementId,
        promotion_id: '',
        salle_id: '',
        date: ''
      });
    } else {
      this.filtersForm.reset();
    }
    this.searchValue = '';
    this.currentPage = 1;
    this.loadArchivedExamens();
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
    return new Date(dateString).toLocaleDateString('fr-FR');
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
    
    // Si c'est une date complète, essayer de la parser
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('fr-FR', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
      }
    } catch (e) {
      console.warn('Erreur lors du formatage de l\'heure:', timeString);
    }
    
    return timeString;
  }

  // Méthode pour accéder à Math.min dans le template
  getMathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Obtenir toutes les salles d'un examen (support pour salles multiples)
  getSalles(examen: Examen): { id: number; name: string }[] {
    // Priorité au tableau salles[] si disponible
    if (examen.salles && examen.salles.length > 0) {
      return examen.salles;
    }
    // Fallback sur salle unique pour compatibilité avec les anciens examens
    if (examen.salle) {
      return [examen.salle];
    }
    // Aucune salle trouvée
    return [];
  }

  // Libellé du groupe à afficher pour une card d'examen
  getGroupLabel(examen: Examen): string {
    // Certaines APIs renvoient group.title, d'autres group.name
    const group: any = (examen as any).group;
    const title = group?.title || group?.name;
    // Si pas de groupe associé (examen pour tous les groupes)
    return title ? title : 'Tous';
  }

  // Méthode pour calculer la durée de l'examen
  calculateDuration(heureDebut: string, heureFin: string): string {
    if (!heureDebut || !heureFin) return '';
    
    try {
      // Normaliser les formats d'heure
      const debutTime = this.normalizeTime(heureDebut);
      const finTime = this.normalizeTime(heureFin);
      
      if (!debutTime || !finTime) return '';
      
      const debut = new Date(`2000-01-01T${debutTime}`);
      const fin = new Date(`2000-01-01T${finTime}`);
      
      if (isNaN(debut.getTime()) || isNaN(fin.getTime())) return '';
      
      const diffMs = fin.getTime() - debut.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 0) return '';
      
      if (diffMinutes < 60) {
        return `${diffMinutes} min`;
      } else {
        const heures = Math.floor(diffMinutes / 60);
        const minutes = diffMinutes % 60;
        return minutes > 0 ? `${heures}h ${minutes}min` : `${heures}h`;
      }
    } catch (e) {
      console.warn('Erreur lors du calcul de la durée:', e);
      return '';
    }
  }
  
  // Méthode pour normaliser le format d'heure
  private normalizeTime(timeString: string): string {
    if (!timeString) return '';
    
    // Si c'est déjà au format HH:MM:SS, le retourner tel quel
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeString)) {
      return timeString;
    }
    
    // Si c'est au format HH:MM, ajouter les secondes
    if (/^\d{2}:\d{2}$/.test(timeString)) {
      return timeString + ':00';
    }
    
    // Si c'est un datetime complet, extraire l'heure
    if (timeString.includes('T')) {
      const timePart = timeString.split('T')[1];
      if (timePart) {
        return timePart.substring(0, 8); // HH:MM:SS
      }
    }
    
    // Si c'est une date complète, essayer de la parser
    try {
      const date = new Date(timeString);
      if (!isNaN(date.getTime())) {
        return date.toTimeString().substring(0, 8); // HH:MM:SS
      }
    } catch (e) {
      // Ignorer l'erreur
    }
    
    return '';
  }

  loadFilterOptions(): void {
    // Charger toutes les options de filtre en une seule requête
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.options = response.options || [];
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
        }
      });
  }

  // Calculer le statut temporel d'un examen (fallback côté frontend)
  private calculateStatutTemporel(examen: Examen): 'passé' | 'en_cours' | 'futur' {
    const now = new Date();
    const examenDate = new Date(examen.date);
    
    // Comparer seulement les dates (sans l'heure)
    const nowDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const examenDateOnly = examenDate.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // Si la date de l'examen est dans le passé
    if (examenDateOnly < nowDate) {
      return 'passé';
    }
    
    // Si c'est aujourd'hui, vérifier les heures
    if (examenDateOnly === nowDate) {
      // S'assurer que nous utilisons seulement la partie date
      const dateOnly = examenDate.toISOString().split('T')[0];
      const heureDebut = new Date(dateOnly + 'T' + examen.heure_debut);
      const heureFin = new Date(dateOnly + 'T' + examen.heure_fin);
      
      // Si l'heure actuelle est avant le début
      if (now < heureDebut) {
        return 'futur';
      }
      
      // Si l'heure actuelle est incluse entre le début et la fin (inclus)
      if (now >= heureDebut && now < heureFin) {
        return 'en_cours';
      }
      
      // Si l'heure actuelle est après la fin
      return 'passé';
    }
    
    // Si la date est dans le futur
    return 'futur';
  }
}