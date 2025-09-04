import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, Router } from '@angular/router';
import { ExamensService, Examen, ExamenResponse, ExamenFilters } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';

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
    private router: Router
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
    this.router.navigate(['/dashboard/add-examen']);
  }

  // Naviguer vers la page de modification d'examen
  openEditModal(examen: Examen): void {
    this.router.navigate(['/dashboard/edit-examen', examen.id]);
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
    
    console.log('📋 Paramètres de navigation:', queryParams);
    console.log('🔄 Navigation vers /dashboard/attendance');
    
    // Naviguer vers la page d'attendance avec les paramètres
    this.router.navigate(['/dashboard/attendance'], { queryParams });
  }

  openImportModal(): void {
    this.router.navigate(['/dashboard/import-examens']);
  }

  // Charger des données de test pour vérifier la navigation
  loadTestData(): void {
    console.log('📊 Chargement des données de test');
    this.examens = [
      {
        id: 1,
        title: 'Examen de Test - Mathématiques',
        date: '2024-01-15',
        heure_debut: '09:00',
        heure_fin: '11:00',
        salle_id: 1,
        promotion_id: 1,
        type_examen_id: 1,
        etablissement_id: 1,
        group_id: 1,
        ville_id: 1,
        annee_universitaire: '2023-2024',
        statut_temporel: 'futur',
        created_at: '2024-01-01',
        updated_at: '2024-01-01'
      }
    ];
    this.total = 1;
    this.currentPage = 1;
    this.lastPage = 1;
    console.log('✅ Données de test chargées:', this.examens);
  }

  // Supprimer un examen
  deleteExamen(examen: Examen): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer l'examen "${examen.title}" ?`)) {
      this.examensService.deleteExamen(examen.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loadExamens();
            this.notificationService.success('Succès', 'Examen supprimé avec succès');
          },
          error: (err) => {
            this.notificationService.error('Erreur', 'Erreur lors de la suppression de l\'examen');
            console.error('Error deleting examen:', err);
          }
        });
    }
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
    return timeString.substring(0, 5);
  }

  // Méthode pour accéder à Math.min dans le template
  getMathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Méthode pour calculer la durée de l'examen
  calculateDuration(heureDebut: string, heureFin: string): string {
    const debut = new Date(`2000-01-01T${heureDebut}`);
    const fin = new Date(`2000-01-01T${heureFin}`);
    const diffMs = fin.getTime() - debut.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 60) {
      return `${diffMinutes} min`;
    } else {
      const heures = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      return minutes > 0 ? `${heures}h ${minutes}min` : `${heures}h`;
    }
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
}
