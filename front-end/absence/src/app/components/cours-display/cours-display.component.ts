import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { CoursService, Cours } from '../../services/cours.service';
import { CoursAttendanceService, StudentAttendance } from '../../services/cours-attendance.service';

interface AbsentStudent extends StudentAttendance {
  status: 'absent' | 'late';
}

interface Segment {
  title: string;
  students: AbsentStudent[];
  type: 'group' | 'salle' | 'alphabet';
}

@Component({
  selector: 'app-cours-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cours-display.component.html',
  styleUrl: './cours-display.component.css'
})
export class CoursDisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  segments: Segment[] = [];
  currentSegmentIndex = 0;
  currentSegment: Segment | null = null;
  loading = true;
  error = '';
  
  // Configuration du défilement
  segmentDisplayDuration = 15000; // 15 secondes par page
  studentsPerPage = 20; // Nombre d'étudiants par page (sera calculé dynamiquement)
  currentPageIndex = 0; // Index de la page actuelle
  
  coursId: number | null = null;
  coursData: Cours | null = null;
  
  private destroy$ = new Subject<void>();
  private segmentInterval: any;
  private refreshInterval: any;
  private resizeListener?: () => void;
  private refreshDuration = 30000; // 30 secondes
  
  // Face ID notification
  previousAbsentStudents: AbsentStudent[] = [];
  showFaceIdNotification: boolean = false;
  faceIdStudentsQueue: AbsentStudent[] = [];
  currentFaceIdStudent: AbsentStudent | null = null;
  faceIdNotificationTimeout: any = null;
  isPaused: boolean = false;
  faceIdDisplayDuration = 5000; // 5 secondes par étudiant
  
  // Exposer Math pour le template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private coursService: CoursService,
    private coursAttendanceService: CoursAttendanceService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du cours depuis l'URL
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.coursId = +params['id'];
      if (this.coursId) {
        // Charger d'abord les données du cours, puis les absents
        this.loadCoursData();
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
    
    // Nettoyer le timeout de notification Face ID
    if (this.faceIdNotificationTimeout) {
      clearTimeout(this.faceIdNotificationTimeout);
      this.faceIdNotificationTimeout = null;
    }
    
    // Nettoyer le listener resize
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  /**
   * Charger les données du cours
   */
  loadCoursData(): void {
    if (!this.coursId) return;
    
    this.coursService.getCoursById(this.coursId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          // L'API retourne { cours: Cours, status: 200 } ou directement Cours
          this.coursData = response.cours || response;
          // Une fois le cours chargé, charger les absents
          if (this.coursData) {
            this.loadAbsentStudents();
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement du cours:', error);
          this.error = 'Erreur lors du chargement du cours';
          this.loading = false;
        }
      });
  }

  /**
   * Charger les étudiants absents
   * @param isRefresh - Si true, c'est un rafraîchissement automatique
   */
  loadAbsentStudents(isRefresh: boolean = false): void {
    if (!this.coursId || !this.coursData) {
      this.error = 'Données de cours manquantes';
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
    
    // Récupérer les données d'attendance pour ce cours
    this.coursAttendanceService.getCoursAttendance(this.coursId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Filtrer uniquement les absents
          const absentStudents = (response.students || []).filter((s: StudentAttendance) => 
            s.status === 'absent' || s.status === 'late'
          ) as AbsentStudent[];
          
          if (isRefresh) {
            console.log(`📊 Rafraîchissement: ${absentStudents.length} étudiant(s) absent(s) trouvé(s)`);
            
            // Détecter les étudiants qui ont fait le face ID
            if (this.previousAbsentStudents.length > 0) {
              const studentsWhoDidFaceId = this.previousAbsentStudents.filter(prevStudent => {
                return !absentStudents.some(newStudent => 
                  newStudent.id === prevStudent.id || 
                  newStudent.matricule === prevStudent.matricule
                );
              });
              
              if (studentsWhoDidFaceId.length > 0) {
                console.log(`✅ ${studentsWhoDidFaceId.length} étudiant(s) ont fait le face ID`);
                
                studentsWhoDidFaceId.forEach(student => {
                  const alreadyInQueue = this.faceIdStudentsQueue.some(q => 
                    q.id === student.id || q.matricule === student.matricule
                  );
                  if (!alreadyInQueue) {
                    this.faceIdStudentsQueue.push(student);
                  }
                });
                
                if (!this.showFaceIdNotification && this.faceIdStudentsQueue.length > 0) {
                  this.startFaceIdNotificationLoop();
                }
              }
            }
          }
          
          // Grouper par segments
          const newSegments = this.groupStudentsBySegments(absentStudents);
          
          if (newSegments.length > 0) {
            if (isRefresh) {
              const oldTotalPages = this.getTotalPages();
              const oldPageIndex = this.currentPageIndex;
              
              this.segments = newSegments.map(seg => ({
                ...seg,
                students: [...seg.students]
              }));
              
              if (this.segments.length > 0) {
                this.currentSegment = {
                  ...this.segments[0],
                  students: [...this.segments[0].students]
                };
              }
              
              this.calculateStudentsPerPage();
              
              const newTotalPages = this.getTotalPages();
              if (oldTotalPages > 0 && oldPageIndex >= newTotalPages) {
                this.currentPageIndex = Math.max(0, newTotalPages - 1);
              }
              
              if (newTotalPages > 0 && this.currentPageIndex >= newTotalPages) {
                this.currentPageIndex = newTotalPages - 1;
              }
              
              this.cdr.detectChanges();
            } else {
              // Premier chargement
              this.segments = newSegments;
              this.currentSegmentIndex = 0;
              this.currentSegment = this.segments[0];
              this.loading = false;
              
              this.previousAbsentStudents = [...absentStudents];
              
              setTimeout(() => {
                this.calculateStudentsPerPage();
                this.startDisplayLoop();
              }, 200);
            }
            
            if (isRefresh) {
              this.previousAbsentStudents = [...absentStudents];
            }
          } else {
            this.segments = [];
            this.currentSegment = null;
            if (!isRefresh) {
              this.error = 'Aucun étudiant absent pour ce cours';
              this.loading = false;
            } else {
              this.cdr.detectChanges();
            }
            
            this.previousAbsentStudents = [];
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
    const header = document.querySelector('.elegant-header');
    const banner = document.querySelector('.segment-banner');
    const nav = document.querySelector('.navigation-controls');
    
    const headerHeight = header ? header.getBoundingClientRect().height : 60;
    const bannerHeight = banner ? banner.getBoundingClientRect().height : 50;
    const navHeight = nav ? nav.getBoundingClientRect().height : 40;
    const padding = 32;
    const gaps = 16;
    
    const availableHeight = window.innerHeight - headerHeight - bannerHeight - navHeight - padding - gaps;
    
    const cardHeight = 74;
    
    const rows = Math.max(1, Math.floor(availableHeight / cardHeight));
    
    let cols = 8;
    if (window.innerWidth >= 1536) {
      cols = 12;
    } else if (window.innerWidth >= 1280) {
      cols = 10;
    } else if (window.innerWidth >= 1024) {
      cols = 9;
    } else if (window.innerWidth >= 768) {
      cols = 8;
    } else if (window.innerWidth >= 640) {
      cols = 8;
    } else {
      cols = 3;
    }
    
    const newStudentsPerPage = Math.max(1, rows * cols);
    
    if (this.studentsPerPage !== newStudentsPerPage && this.currentSegment) {
      this.currentPageIndex = 0;
    }
    
    this.studentsPerPage = newStudentsPerPage;
  }

  /**
   * Créer un seul segment avec tous les étudiants absents
   */
  groupStudentsBySegments(students: AbsentStudent[]): Segment[] {
    if (students.length === 0) {
      return [];
    }
    
    return [{
      title: `Étudiants Absents`,
      students: students.sort((a, b) => {
        const lastNameCompare = a.last_name.localeCompare(b.last_name, 'fr', { sensitivity: 'base' });
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }
        return a.first_name.localeCompare(b.first_name, 'fr', { sensitivity: 'base' });
      }),
      type: 'group'
    }];
  }

  /**
   * Démarrer la boucle d'affichage automatique
   */
  startDisplayLoop(): void {
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
    
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true);
      }, this.refreshDuration);
    }
    
    this.segmentInterval = setInterval(() => {
      if (!this.isPaused) {
        this.nextPage();
      }
    }, this.segmentDisplayDuration);
  }

  /**
   * Aller à la page suivante
   */
  nextPage(manual: boolean = false): void {
    if (this.isPaused || this.segments.length === 0 || !this.currentSegment) return;
    
    const totalPages = this.getTotalPages();
    
    if (this.currentPageIndex < totalPages - 1) {
      this.currentPageIndex++;
    } else {
      this.currentPageIndex = 0;
    }
    
    if (manual) {
      this.resetAutoPlayTimer();
    }
  }

  /**
   * Aller à la page précédente
   */
  previousPage(): void {
    if (this.segments.length === 0 || !this.currentSegment) return;
    
    const totalPages = this.getTotalPages();
    
    if (this.currentPageIndex > 0) {
      this.currentPageIndex--;
    } else {
      this.currentPageIndex = totalPages - 1;
    }
    
    this.resetAutoPlayTimer();
  }

  /**
   * Réinitialiser le timer
   */
  resetAutoPlayTimer(): void {
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
    }
    this.segmentInterval = setInterval(() => {
      if (!this.isPaused) {
        this.nextPage();
      }
    }, this.segmentDisplayDuration);
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true);
      }, this.refreshDuration);
    }
  }

  /**
   * Obtenir les étudiants de la page actuelle
   */
  getCurrentPageStudents(): AbsentStudent[] {
    if (!this.currentSegment || this.currentSegment.students.length === 0) {
      return [];
    }
    
    const startIndex = this.currentPageIndex * this.studentsPerPage;
    const endIndex = startIndex + this.studentsPerPage;
    return this.currentSegment.students.slice(startIndex, endIndex);
  }

  /**
   * Obtenir le nombre total de pages
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
   * Démarrer la boucle de notification Face ID
   */
  startFaceIdNotificationLoop(): void {
    if (this.faceIdStudentsQueue.length === 0) {
      return;
    }
    
    const student = this.faceIdStudentsQueue.shift();
    if (!student) {
      return;
    }
    
    this.currentFaceIdStudent = student;
    this.showFaceIdNotification = true;
    this.isPaused = true;
    
    this.pauseDisplayLoop();
    
    this.faceIdNotificationTimeout = setTimeout(() => {
      this.showNextFaceIdStudent();
    }, this.faceIdDisplayDuration);
    
    this.cdr.detectChanges();
  }

  /**
   * Afficher le prochain étudiant ou masquer la notification
   */
  showNextFaceIdStudent(): void {
    if (this.faceIdNotificationTimeout) {
      clearTimeout(this.faceIdNotificationTimeout);
      this.faceIdNotificationTimeout = null;
    }
    
    if (this.faceIdStudentsQueue.length > 0) {
      this.startFaceIdNotificationLoop();
    } else {
      this.hideFaceIdNotification();
    }
  }

  /**
   * Masquer la notification Face ID et reprendre le défilement
   */
  hideFaceIdNotification(): void {
    if (this.faceIdNotificationTimeout) {
      clearTimeout(this.faceIdNotificationTimeout);
      this.faceIdNotificationTimeout = null;
    }
    
    this.showFaceIdNotification = false;
    this.currentFaceIdStudent = null;
    this.isPaused = false;
    
    this.resumeDisplayLoop();
    
    this.cdr.detectChanges();
  }

  /**
   * Pauser le défilement automatique
   */
  pauseDisplayLoop(): void {
    this.isPaused = true;
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
  }

  /**
   * Reprendre le défilement automatique
   */
  resumeDisplayLoop(): void {
    this.isPaused = false;
    if (!this.segmentInterval) {
      this.segmentInterval = setInterval(() => {
        if (!this.isPaused) {
          this.nextPage();
        }
      }, this.segmentDisplayDuration);
    }
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true);
      }, this.refreshDuration);
    }
  }

  /**
   * Obtenir le statut formaté
   */
  getStatusLabel(status: string): string {
    return status === 'late' ? 'En Retard' : 'Absent';
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
}
