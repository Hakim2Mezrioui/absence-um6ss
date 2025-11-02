import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { ExamensService, Examen, ExamenResponse, ExamenFilters } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';

@Component({
  selector: 'app-examens',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './examens.component.html',
  styleUrl: './examens.component.css'
})

export class ExamensComponent implements OnInit, OnDestroy {
  examens: Examen[] = [];
  loading = false;
  error = '';
  
  // Pagination
  currentPage = 1;
  lastPage = 1;
  perPage = 10;
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
  typesExamen: TypeExamen[] = [];
  

  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService,
    private router: Router,
    public authService: AuthService
  ) {
    this.filtersForm = this.fb.group({
      etablissement_id: [''],
      promotion_id: [''],
      salle_id: [''],
      date: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 ExamensComponent initialisé');
    
    // Test de navigation - charger des données de test d'abord
    this.loadTestData();
    
    // Puis essayer de charger les vraies données
    this.loadExamens();
    this.loadFilterOptions();
    this.loadTypesExamen();
    
    // Setup search debounce
    this.filtersForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(500),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadExamens();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Naviguer vers la page d'ajout d'examen
  openAddModal(): void {
    this.router.navigate(['/add-examen']);
  }

  // Naviguer vers la page de modification d'examen
  openEditModal(examen: Examen): void {
    this.router.navigate(['/edit-examen', examen.id]);
  }

  // Naviguer vers la page de suivi des présences
  openAttendanceModal(examen: Examen): void {
    console.log('🎯 openAttendanceModal appelé pour l\'examen:', examen);
    
    // Construire les paramètres de requête pour l'API d'attendance
    const queryParams: any = {
      date: examen.date,
      hour1: examen.heure_debut,
      hour2: examen.heure_fin
    };

    // Ajouter les autres paramètres si disponibles
    if (examen.promotion_id) queryParams.promotion_id = examen.promotion_id;
    if (examen.etablissement_id) queryParams.etablissement_id = examen.etablissement_id;
    if (examen.option?.id) queryParams.option_id = examen.option.id;
    if (examen.group_id) queryParams.group_id = examen.group_id;
    if (examen.ville_id) queryParams.ville_id = examen.ville_id;
    
    console.log('📋 Paramètres de navigation:', queryParams);
    console.log('🔄 Navigation vers /attendance avec ID:', examen.id);
    
    // Naviguer vers la page d'attendance avec l'ID de l'examen et les paramètres
    this.router.navigate(['/attendance', examen.id], { queryParams });
  }

  openImportModal(): void {
    this.router.navigate(['/import-examens-simple']);
  }

  // Naviguer vers la page des examens archivés
  openArchivedExamens(): void {
    this.router.navigate(['/examens-archived']);
  }

  // Charger des données de test pour vérifier la navigation
  loadTestData(): void {
    console.log('📊 Chargement des données de test');
    this.examens = [
      {
        id: 1,
        title: 'Examen de Test - Mathématiques',
        date: '2024-01-15',
        heure_debut: '09:00:00',
        heure_fin: '11:00:00',
        heure_debut_poigntage: '08:30:00',
        tolerance: 15,
        salle_id: 1,
        promotion_id: 1,
        type_examen_id: 1,
        etablissement_id: 1,
        group_id: 1,
        ville_id: 1,
        annee_universitaire: '2023-2024',
        statut_temporel: 'futur',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
        etablissement: { id: 1, name: 'Université Test' },
        promotion: { id: 1, name: 'L1' },
        type_examen: { id: 1, name: 'Contrôle' },
        salle: { id: 1, name: 'Salle A1' },
        option: { id: 1, name: 'Informatique' },
        group: { id: 1, name: 'Groupe 1' },
        ville: { id: 1, name: 'Rabat' }
      }
    ];
    this.total = 1;
    this.currentPage = 1;
    this.lastPage = 1;
    console.log('✅ Données de test chargées:', this.examens);
  }

  // Supprimer un examen
  deleteExamen(examen: Examen): void {
    // Import dynamique pour compat SSR (évite document is not defined)
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Supprimer cet examen ?',
        text: `"${examen.title}" sera définitivement supprimé.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, supprimer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.examensService.deleteExamen(examen.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                Swal.fire({
                  title: 'Supprimé',
                  text: 'Examen supprimé avec succès',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
                this.loadExamens();
              },
              error: (err) => {
                console.error('Error deleting examen:', err);
                Swal.fire({
                  title: 'Erreur',
                  text: 'Erreur lors de la suppression de l\'examen',
                  icon: 'error'
                });
              }
            });
        }
      });
    });
  }

  // Archiver un examen
  archiveExamen(examen: Examen): void {
    // Import dynamique pour compat SSR (évite document is not defined)
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Archiver cet examen ?',
        text: `"${examen.title}" sera archivé et ne sera plus visible dans la liste principale.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Oui, archiver',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#f59e0b',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then((result) => {
        if (result.isConfirmed) {
          this.examensService.archiveExamen(examen.id)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                Swal.fire({
                  title: 'Archivé',
                  text: 'Examen archivé avec succès',
                  icon: 'success',
                  timer: 1500,
                  showConfirmButton: false
                });
                this.loadExamens();
              },
              error: (err) => {
                console.error('Error archiving examen:', err);
                Swal.fire({
                  title: 'Erreur',
                  text: 'Erreur lors de l\'archivage de l\'examen',
                  icon: 'error'
                });
              }
            });
        }
      });
    });
  }

  loadExamens(): void {
    console.log('🔄 Tentative de chargement des examens depuis l\'API');
    this.loading = true;
    this.error = '';

    const filters: ExamenFilters = {
      size: this.perPage,
      page: this.currentPage,
      searchValue: this.searchValue,
      ...this.filtersForm.value
    };

    // Remove empty values
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ExamenFilters];
      if (value === '' || value === null || value === undefined) {
        delete filters[key as keyof ExamenFilters];
      }
    });

    console.log('📋 Filtres appliqués:', filters);

    this.examensService.getExamens(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ExamenResponse) => {
          console.log('✅ Données reçues de l\'API:', response);
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
          console.error('❌ Erreur lors du chargement des examens:', err);
          this.error = 'Erreur lors du chargement des examens';
          this.loading = false;
          
          // En cas d'erreur, garder les données de test
          console.log('🔄 Utilisation des données de test en cas d\'erreur API');
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchValue = target.value;
    this.currentPage = 1;
    this.loadExamens();
  }

  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadExamens();
  }

  onPerPageChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.perPage = parseInt(target.value);
    this.currentPage = 1;
    this.loadExamens();
  }

  clearFilters(): void {
    this.filtersForm.reset();
    this.searchValue = '';
    this.currentPage = 1;
    this.loadExamens();
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

  // Libellé du groupe à afficher pour une card d'examen
  getGroupLabel(examen: Examen): string {
    // Certaines APIs renvoient group.title, d'autres group.name
    const group: any = (examen as any).group;
    const title = group?.title || group?.name;
    // Si pas de groupe associé (examen pour tous les groupes)
    return title ? title : 'Tous';
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
          this.typesExamen = response.typesExamen || [];
        },
        error: (err) => {
          console.error('Error loading filter options:', err);
        }
      });
  }

  // Méthode pour charger les types d'examen
  loadTypesExamen(): void {
    console.log('🔍 loadTypesExamen() - Démarrage du chargement');
    // Utiliser getTypesExamenPaginated qui fonctionne au lieu de getAllTypesExamen
    this.typesExamenService.getTypesExamenPaginated(1, 100) // Charger jusqu'à 100 types
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Types d\'examen chargés avec succès (paginated):', response);
          this.typesExamen = response.data || [];
          console.log('🔍 typesExamen mis à jour:', this.typesExamen);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des types d\'examen:', err);
          this.typesExamen = [];
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
