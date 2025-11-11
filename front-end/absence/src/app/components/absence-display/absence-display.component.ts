import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, interval, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AttendanceService, StudentAttendance, AttendanceFilters } from '../../services/attendance.service';
import { ExamensService, Examen } from '../../services/examens.service';

interface AbsentStudent extends StudentAttendance {
  status: 'absent' | 'en retard';
}

interface Segment {
  title: string;
  students: AbsentStudent[];
  type: 'group' | 'salle' | 'alphabet';
}

@Component({
  selector: 'app-absence-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './absence-display.component.html',
  styleUrl: './absence-display.component.css'
})
export class AbsenceDisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  segments: Segment[] = [];
  currentSegmentIndex = 0;
  currentSegment: Segment | null = null;
  loading = true;
  error = '';
  
  // Configuration du défilement
  segmentDisplayDuration = 15000; // 15 secondes par page de 20 étudiants
  studentsPerPage = 20; // Afficher 20 étudiants à la fois
  currentPageIndex = 0; // Index de la page actuelle (groupe de 20)
  
  examenId: number | null = null;
  examenData: Examen | null = null;
  
  private destroy$ = new Subject<void>();
  private segmentInterval: any;
  private refreshInterval: any;
  private resizeListener?: () => void;
  private refreshDuration = 30000; // 30 secondes
  
  // Exposer Math pour le template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private attendanceService: AttendanceService,
    private examensService: ExamensService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID de l'examen depuis l'URL
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.examenId = +params['id'];
      if (this.examenId) {
        // Charger d'abord les données de l'examen, puis les absents
        this.loadExamenData();
      }
    });
  }

  ngAfterViewInit(): void {
    // Calculer le nombre d'étudiants par page après le rendu initial
    this.calculateStudentsPerPage();
    
    // Ajouter listener pour recalculer lors du redimensionnement
    this.resizeListener = () => this.calculateStudentsPerPage();
    window.addEventListener('resize', this.resizeListener);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearIntervals();
    
    // Nettoyer le listener resize
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Charger les données de l'examen
   */
  loadExamenData(): void {
    if (!this.examenId) return;
    
    this.examensService.getExamen(this.examenId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // L'API retourne { examen: Examen, status: 200 }
          this.examenData = response.examen || response;
          // Une fois l'examen chargé, charger les absents
          if (this.examenData) {
            this.loadAbsentStudents();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'examen:', error);
          this.error = 'Erreur lors du chargement de l\'examen';
          this.loading = false;
        }
      });
  }

  /**
   * Charger les étudiants absents
   * @param isRefresh - Si true, c'est un rafraîchissement automatique (pas de loading visible)
   */
  loadAbsentStudents(isRefresh: boolean = false): void {
    if (!this.examenId || !this.examenData) {
      this.error = 'Données d\'examen manquantes';
      this.loading = false;
      return;
    }
    
    if (isRefresh) {
      console.log('🔄 Rafraîchissement en cours...');
    }
    
    // Ne pas afficher le loading lors du rafraîchissement automatique
    if (!isRefresh) {
      this.loading = true;
    }
    this.error = '';
    
    // Construire les filtres pour l'API
    const filters: AttendanceFilters = {
      date: this.examenData.date,
      hour1: this.examenData.heure_debut,
      hour2: this.examenData.heure_fin,
      promotion_id: this.examenData.promotion_id,
      etablissement_id: this.examenData.etablissement_id,
      ville_id: this.examenData.ville_id
    };

    if (this.examenData.option_id) {
      filters.option_id = this.examenData.option_id;
    }
    if (this.examenData.group_id) {
      filters.group_id = this.examenData.group_id;
    }
    
    // Récupérer les données d'attendance
    this.attendanceService.getStudentAttendance(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filtrer uniquement les absents
          const absentStudents = (response.etudiants || []).filter((s: StudentAttendance) => 
            s.status === 'absent' || s.status === 'en retard'
          ) as AbsentStudent[];
          
          if (isRefresh) {
            console.log(`📊 Rafraîchissement: ${absentStudents.length} étudiant(s) absent(s) trouvé(s)`);
          }
          
          // Grouper par segments
          const newSegments = this.groupStudentsBySegments(absentStudents);
          
          if (newSegments.length > 0) {
            if (isRefresh) {
              // Rafraîchissement : conserver la page actuelle si possible
              const oldTotalPages = this.getTotalPages();
              const oldPageIndex = this.currentPageIndex;
              
              // Mettre à jour les segments (créer de nouveaux objets pour forcer la détection de changement)
              this.segments = newSegments.map(seg => ({
                ...seg,
                students: [...seg.students] // Nouveau tableau d'étudiants
              }));
              
              // Mettre à jour le segment actuel avec un nouvel objet
              if (this.segments.length > 0) {
                this.currentSegment = {
                  ...this.segments[0],
                  students: [...this.segments[0].students]
                };
              }
              
              // Recalculer le nombre d'étudiants par page
              this.calculateStudentsPerPage();
              
              // Ajuster la page si nécessaire
              const newTotalPages = this.getTotalPages();
              if (oldTotalPages > 0 && oldPageIndex >= newTotalPages) {
                this.currentPageIndex = Math.max(0, newTotalPages - 1);
              }
              
              // Si on était sur la dernière page et qu'il y a moins d'étudiants maintenant, aller à la dernière page
              if (newTotalPages > 0 && this.currentPageIndex >= newTotalPages) {
                this.currentPageIndex = newTotalPages - 1;
              }
              
              // Forcer la détection de changement
              this.cdr.detectChanges();
            } else {
              // Premier chargement
              this.segments = newSegments;
              this.currentSegmentIndex = 0;
              this.currentSegment = this.segments[0];
              this.loading = false;
              setTimeout(() => {
                this.calculateStudentsPerPage();
                this.startDisplayLoop();
              }, 200);
            }
          } else {
            // Plus d'étudiants absents
            this.segments = [];
            this.currentSegment = null;
            if (!isRefresh) {
              this.error = 'Aucun étudiant absent pour cet examen';
              this.loading = false;
            } else {
              // Forcer la détection de changement lors du rafraîchissement
              this.cdr.detectChanges();
            }
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des absents:', error);
          if (!isRefresh) {
            this.error = 'Erreur lors du chargement des données';
            this.loading = false;
          }
        }
      });
  }

  /**
   * Calculer automatiquement le nombre d'étudiants par page selon la taille de l'écran
   */
  calculateStudentsPerPage(): void {
    // Calculer les hauteurs réelles des éléments
    const header = document.querySelector('.elegant-header');
    const banner = document.querySelector('.segment-banner');
    const nav = document.querySelector('.navigation-controls');
    
    const headerHeight = header ? header.getBoundingClientRect().height : 100;
    const bannerHeight = banner ? banner.getBoundingClientRect().height : 80;
    const navHeight = nav ? nav.getBoundingClientRect().height : 55;
    const padding = 60; // padding réduit (1.5rem * 2)
    const gaps = 16; // gaps réduits (1rem)
    
    const availableHeight = window.innerHeight - headerHeight - bannerHeight - navHeight - padding - gaps;
    
    // Hauteur d'une card étudiant (card + gap vertical)
    // Card: ~145px (padding 1rem + avatar 3.5rem + info + badge)
    // Gap: 1rem = 16px
    const cardHeight = 161; // ~161px par card
    
    // Nombre de lignes possibles (arrondir vers le bas et soustraire 1 pour marge de sécurité)
    const rows = Math.max(1, Math.floor(availableHeight / cardHeight) - 1);
    
    // Nombre de colonnes selon la largeur
    let cols = 4;
    if (window.innerWidth < 768) {
      cols = 2;
    }
    if (window.innerWidth < 640) {
      cols = 1;
    }
    
    // Calculer le nombre total d'étudiants par page
    const newStudentsPerPage = Math.max(1, rows * cols);
    
    // Si le nombre change, réinitialiser à la page 0
    if (this.studentsPerPage !== newStudentsPerPage && this.currentSegment) {
      this.currentPageIndex = 0;
    }
    
    this.studentsPerPage = newStudentsPerPage;
  }

  /**
   * Créer un seul segment avec tous les étudiants absents (pas de groupement)
   */
  groupStudentsBySegments(students: AbsentStudent[]): Segment[] {
    if (students.length === 0) {
      return [];
    }
    
    // Un seul segment avec tous les étudiants, triés par nom
    return [{
      title: `Étudiants Absents`,
      students: students.sort((a, b) => a.last_name.localeCompare(b.last_name)),
      type: 'group'
    }];
  }

  /**
   * Démarrer la boucle d'affichage automatique
   */
  startDisplayLoop(): void {
    this.clearIntervals();
    this.currentPageIndex = 0;
    
    // Changer de page automatiquement toutes les 15 secondes
    this.segmentInterval = setInterval(() => {
      this.nextPage();
    }, this.segmentDisplayDuration);
    
    // Recharger les données toutes les 30 secondes
    this.refreshInterval = setInterval(() => {
      console.log('🔄 Rafraîchissement automatique des absents...');
      this.loadAbsentStudents(true); // true = rafraîchissement automatique
    }, this.refreshDuration);
  }

  /**
   * Aller à la page suivante (manuel ou automatique)
   */
  nextPage(manual: boolean = false): void {
    if (this.segments.length === 0 || !this.currentSegment) return;
    
    const totalPages = this.getTotalPages();
    
    if (this.currentPageIndex < totalPages - 1) {
      this.currentPageIndex++;
    } else {
      // Revenir à la première page (boucle infinie)
      this.currentPageIndex = 0;
    }
    
    // Si navigation manuelle, réinitialiser le timer
    if (manual) {
      this.resetAutoPlayTimer();
    }
  }

  /**
   * Aller à la page précédente (navigation manuelle)
   */
  previousPage(): void {
    if (this.segments.length === 0 || !this.currentSegment) return;
    
    const totalPages = this.getTotalPages();
    
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
    } else {
      // Aller à la dernière page
      this.currentPageIndex = totalPages - 1;
    }
    
    // Réinitialiser le timer pour éviter un changement automatique immédiat
    this.resetAutoPlayTimer();
  }
  
  /**
   * Réinitialiser le timer de lecture automatique
   */
  resetAutoPlayTimer(): void {
    this.clearIntervals();
    this.segmentInterval = setInterval(() => {
      this.nextPage();
    }, this.segmentDisplayDuration);
  }

  /**
   * Vérifier s'il y a une page suivante
   */
  hasNextPage(): boolean {
    const totalPages = this.getTotalPages();
    return this.currentPageIndex < totalPages - 1;
  }

  /**
   * Vérifier s'il y a une page précédente
   */
  hasPreviousPage(): boolean {
    return this.currentPageIndex > 0;
  }

  /**
   * Obtenir les étudiants de la page actuelle (20 par page)
   */
  getCurrentPageStudents(): AbsentStudent[] {
    if (!this.currentSegment || this.currentSegment.students.length === 0) {
      return [];
    }
    
    // Retourner 20 étudiants par page
    const startIndex = this.currentPageIndex * this.studentsPerPage;
    const endIndex = startIndex + this.studentsPerPage;
    return this.currentSegment.students.slice(startIndex, endIndex);
  }

  /**
   * Obtenir le nombre total de pages pour le segment actuel
   */
  getTotalPages(): number {
    if (!this.currentSegment) return 0;
    return Math.ceil(this.currentSegment.students.length / this.studentsPerPage);
  }

  /**
   * Nettoyer les intervalles
   */
  clearIntervals(): void {
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Obtenir le statut formaté
   */
  getStatusLabel(status: string): string {
    return status === 'en retard' ? 'En Retard' : 'Absent';
  }

  /**
   * Obtenir la classe CSS pour le statut
   */
  getStatusClass(status: string): string {
    return status === 'en retard' ? 'status-late' : 'status-absent';
  }

  /**
   * Formater une date
   */
  formatDate(date: string): string {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  /**
   * Formater une heure
   */
  formatTime(time: string): string {
    if (!time) return '';
    return time.substring(0, 5); // HH:MM
  }

  /**
   * Obtenir l'heure actuelle formatée
   */
  getCurrentTime(): string {
    return new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  }
}

