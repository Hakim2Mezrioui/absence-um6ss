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
  
  // Face ID notification
  previousAbsentStudents: AbsentStudent[] = [];
  showFaceIdNotification: boolean = false;
  faceIdStudentsQueue: AbsentStudent[] = [];
  currentFaceIdStudent: AbsentStudent | null = null;
  faceIdNotificationTimeout: any = null;
  isPaused: boolean = false;
  faceIdDisplayDuration = 5000; // 5 secondes par étudiant
  
  // Filtre d'affichage
  displayFilter: 'all' | 'absent-only' = 'all'; // 'all' = absents + en retard, 'absent-only' = seulement absents
  
  // Stocker toutes les données originales (non filtrées) pour les statistiques
  allStudents: AbsentStudent[] = []; // Tous les étudiants (absents + en retard)
  
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
          // Stocker TOUS les étudiants (absents + en retard) pour les statistiques
          this.allStudents = (response.etudiants || []).filter((s: StudentAttendance) => 
            s.status === 'absent' || s.status === 'en retard'
          ) as AbsentStudent[];
          
          if (isRefresh) {
            console.log(`📊 Rafraîchissement: ${this.allStudents.length} étudiant(s) trouvé(s)`);
            
            // Détecter les étudiants qui ont fait le face ID
            // Utiliser allStudents pour la comparaison (toutes les données, pas seulement filtrées)
            if (this.previousAbsentStudents.length > 0) {
              const studentsWhoDidFaceId = this.previousAbsentStudents.filter(prevStudent => {
                // Vérifier si l'étudiant n'est plus dans la nouvelle liste
                return !this.allStudents.some(newStudent => 
                  newStudent.id === prevStudent.id || 
                  newStudent.matricule === prevStudent.matricule
                );
              });
              
              if (studentsWhoDidFaceId.length > 0) {
                console.log(`✅ ${studentsWhoDidFaceId.length} étudiant(s) ont fait le face ID`);
                
                // Ajouter à la file d'attente (éviter les doublons)
                studentsWhoDidFaceId.forEach(student => {
                  const alreadyInQueue = this.faceIdStudentsQueue.some(q => 
                    q.id === student.id || q.matricule === student.matricule
                  );
                  if (!alreadyInQueue) {
                    this.faceIdStudentsQueue.push(student);
                  }
                });
                
                // Démarrer la boucle si elle n'est pas déjà en cours
                if (!this.showFaceIdNotification && this.faceIdStudentsQueue.length > 0) {
                  this.startFaceIdNotificationLoop();
                }
              }
            }
          }
          
          // Appliquer le filtre actuel aux données (fonctionne pour chargement initial ET rafraîchissement)
          // Cette méthode gère la création des segments et la mise à jour de l'affichage
          const filteredStudents = this.displayFilter === 'absent-only'
            ? this.allStudents.filter(s => s.status === 'absent')
            : [...this.allStudents];
          
          // Grouper par segments
          const newSegments = this.groupStudentsBySegments(filteredStudents);
          
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
              
              // Initialiser la liste précédente pour le premier chargement
              this.previousAbsentStudents = [...this.allStudents];
              
              setTimeout(() => {
                this.calculateStudentsPerPage();
                this.startDisplayLoop();
              }, 200);
            }
            
            // Mettre à jour la liste précédente lors du rafraîchissement
            if (isRefresh) {
              this.previousAbsentStudents = [...this.allStudents];
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
            
            // Mettre à jour la liste précédente
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
    // Calculer les hauteurs réelles des éléments
    const header = document.querySelector('.elegant-header');
    const banner = document.querySelector('.segment-banner');
    const nav = document.querySelector('.navigation-controls');
    
    const headerHeight = header ? header.getBoundingClientRect().height : 60;
    const bannerHeight = banner ? banner.getBoundingClientRect().height : 50;
    const navHeight = nav ? nav.getBoundingClientRect().height : 40;
    const padding = 32; // padding réduit (0.75rem * 2 + 1rem * 2)
    const gaps = 16; // gaps réduits (0.5rem + 0.5rem)
    
    const availableHeight = window.innerHeight - headerHeight - bannerHeight - navHeight - padding - gaps;
    
    // Hauteur d'une card étudiant (card + gap vertical)
    // Card compacte: ~70px (padding 0.1875rem + nom + matricule + badge)
    // Gap: 0.25rem = 4px
    const cardHeight = 74; // ~74px par card compacte
    
    // Nombre de lignes possibles (utiliser tout l'espace disponible)
    const rows = Math.max(1, Math.floor(availableHeight / cardHeight));
    
    // Nombre de colonnes selon la largeur (optimisé pour plus de colonnes)
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
    
    // Un seul segment avec tous les étudiants, triés par nom de famille (alphabétique)
    return [{
      title: `Étudiants Absents`,
      students: students.sort((a, b) => {
        // Trier par nom de famille (last_name) en premier
        const lastNameCompare = a.last_name.localeCompare(b.last_name, 'fr', { sensitivity: 'base' });
        if (lastNameCompare !== 0) {
          return lastNameCompare;
        }
        // Si les noms sont identiques, trier par prénom
        return a.first_name.localeCompare(b.first_name, 'fr', { sensitivity: 'base' });
      }),
      type: 'group'
    }];
  }

  /**
   * Démarrer la boucle d'affichage automatique
   */
  startDisplayLoop(): void {
    // Ne pas vérifier isPaused ici, démarrer les intervalles même si en pause
    // Le rafraîchissement doit toujours fonctionner pour détecter les nouveaux face ID
    
    // Nettoyer seulement le segmentInterval, garder refreshInterval s'il existe
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
    
    // Si refreshInterval n'existe pas encore, le créer
    if (!this.refreshInterval) {
      // Recharger les données toutes les 30 secondes
      // IMPORTANT: Ne pas vérifier isPaused, le rafraîchissement doit toujours s'exécuter
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true); // true = rafraîchissement automatique
      }, this.refreshDuration);
    }
    
    // Changer de page automatiquement toutes les 15 secondes (seulement si pas en pause)
    this.segmentInterval = setInterval(() => {
      if (!this.isPaused) {
        this.nextPage();
      }
    }, this.segmentDisplayDuration);
    
    // Réinitialiser l'index de page seulement si on démarre pour la première fois
    if (this.currentPageIndex === 0 && this.segments.length > 0) {
      // Ne pas réinitialiser si on reprend après une pause
    }
  }

  /**
   * Aller à la page suivante (manuel ou automatique)
   */
  nextPage(manual: boolean = false): void {
    if (this.isPaused || this.segments.length === 0 || !this.currentSegment) return;
    
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
   * Réinitialiser le timer de lecture automatique (seulement le défilement)
   */
  resetAutoPlayTimer(): void {
    // Nettoyer seulement le segmentInterval, garder refreshInterval
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
    }
    this.segmentInterval = setInterval(() => {
      if (!this.isPaused) {
        this.nextPage();
      }
    }, this.segmentDisplayDuration);
    // S'assurer que refreshInterval existe toujours
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true);
      }, this.refreshDuration);
    }
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
   * Nettoyer seulement le défilement de pages (garder le rafraîchissement)
   */
  clearSegmentInterval(): void {
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
  }

  /**
   * Démarrer la boucle de notification Face ID
   */
  startFaceIdNotificationLoop(): void {
    if (this.faceIdStudentsQueue.length === 0) {
      return;
    }
    
    // Prendre le premier étudiant de la queue
    const student = this.faceIdStudentsQueue.shift();
    if (!student) {
      return;
    }
    
    // Définir l'étudiant actuel
    this.currentFaceIdStudent = student;
    this.showFaceIdNotification = true;
    this.isPaused = true;
    
    // Pauser le défilement
    this.pauseDisplayLoop();
    
    // Démarrer le timeout pour afficher le suivant ou masquer
    this.faceIdNotificationTimeout = setTimeout(() => {
      this.showNextFaceIdStudent();
    }, this.faceIdDisplayDuration);
    
    // Forcer la détection de changement
    this.cdr.detectChanges();
  }

  /**
   * Afficher le prochain étudiant ou masquer la notification
   */
  showNextFaceIdStudent(): void {
    // Nettoyer le timeout précédent
    if (this.faceIdNotificationTimeout) {
      clearTimeout(this.faceIdNotificationTimeout);
      this.faceIdNotificationTimeout = null;
    }
    
    // Vérifier s'il y a encore des étudiants dans la queue
    if (this.faceIdStudentsQueue.length > 0) {
      // Afficher le suivant
      this.startFaceIdNotificationLoop();
    } else {
      // Masquer la notification et reprendre le défilement
      this.hideFaceIdNotification();
    }
  }

  /**
   * Masquer la notification Face ID et reprendre le défilement
   */
  hideFaceIdNotification(): void {
    // Nettoyer le timeout
    if (this.faceIdNotificationTimeout) {
      clearTimeout(this.faceIdNotificationTimeout);
      this.faceIdNotificationTimeout = null;
    }
    
    // Masquer le popup
    this.showFaceIdNotification = false;
    this.currentFaceIdStudent = null;
    this.isPaused = false;
    
    // Reprendre le défilement
    this.resumeDisplayLoop();
    
    // Forcer la détection de changement
    this.cdr.detectChanges();
  }

  /**
   * Pauser le défilement automatique (mais garder le rafraîchissement actif)
   */
  pauseDisplayLoop(): void {
    this.isPaused = true;
    // Nettoyer seulement le segmentInterval (défilement de pages)
    // Garder refreshInterval actif pour continuer à détecter les nouveaux face ID
    if (this.segmentInterval) {
      clearInterval(this.segmentInterval);
      this.segmentInterval = null;
    }
    // Ne PAS nettoyer refreshInterval ici
  }

  /**
   * Reprendre le défilement automatique
   */
  resumeDisplayLoop(): void {
    this.isPaused = false;
    // Redémarrer seulement le défilement de pages
    // Le refreshInterval continue déjà de tourner
    if (!this.segmentInterval) {
      this.segmentInterval = setInterval(() => {
        if (!this.isPaused) {
          this.nextPage();
        }
      }, this.segmentDisplayDuration);
    }
    // S'assurer que refreshInterval existe (au cas où)
    if (!this.refreshInterval) {
      this.refreshInterval = setInterval(() => {
        console.log('🔄 Rafraîchissement automatique des absents...');
        this.loadAbsentStudents(true);
      }, this.refreshDuration);
    }
  }

  /**
   * Obtenir le nombre d'étudiants absents (sans les en retard)
   * Utiliser les données originales, pas les données filtrées
   */
  getAbsentCount(): number {
    return this.allStudents.filter(s => s.status === 'absent').length;
  }

  /**
   * Obtenir le nombre d'étudiants en retard
   * Utiliser les données originales, pas les données filtrées
   */
  getLateCount(): number {
    return this.allStudents.filter(s => s.status === 'en retard').length;
  }

  /**
   * Obtenir le nombre total d'absences (absents + en retard)
   * Utiliser les données originales, pas les données filtrées
   */
  getTotalAbsencesCount(): number {
    return this.allStudents.length;
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

  /**
   * Changer le filtre d'affichage
   * Filtre uniquement côté frontend sans refaire de requête HTTP
   * Ne touche PAS à l'actualisation automatique (refreshInterval)
   */
  changeDisplayFilter(filter: 'all' | 'absent-only'): void {
    this.displayFilter = filter;
    
    // Si les données ne sont pas encore chargées, charger d'abord
    if (this.allStudents.length === 0) {
      this.currentPageIndex = 0;
      this.loadAbsentStudents();
      return;
    }
    
    // Filtrer les données déjà chargées côté frontend
    // Ne PAS toucher à refreshInterval - il continue de tourner
    this.applyCurrentFilter();
  }

  /**
   * Appliquer le filtre actuel aux données déjà chargées
   * Méthode helper pour éviter la duplication de code
   */
  private applyCurrentFilter(): void {
    if (this.allStudents.length === 0) {
      return;
    }
    
    // Filtrer selon le filtre sélectionné
    let filteredStudents: AbsentStudent[];
    
    if (this.displayFilter === 'absent-only') {
      // Afficher uniquement les absents dans la liste
      filteredStudents = this.allStudents.filter((s: AbsentStudent) => 
        s.status === 'absent'
      );
    } else {
      // Afficher absents + en retard dans la liste
      filteredStudents = [...this.allStudents];
    }
    
    // Grouper par segments avec les données filtrées
    const newSegments = this.groupStudentsBySegments(filteredStudents);
    
    if (newSegments.length > 0) {
      // Conserver l'index de page actuel si possible
      const oldTotalPages = this.getTotalPages();
      const oldPageIndex = this.currentPageIndex;
      
      this.segments = newSegments;
      this.currentSegmentIndex = 0;
      this.currentSegment = this.segments[0];
      
      // Recalculer le nombre d'étudiants par page
      this.calculateStudentsPerPage();
      
      // Ajuster la page si nécessaire (si on était sur une page qui n'existe plus)
      const newTotalPages = this.getTotalPages();
      if (oldTotalPages > 0 && oldPageIndex >= newTotalPages) {
        this.currentPageIndex = Math.max(0, newTotalPages - 1);
      } else {
        // Garder la page actuelle si elle existe toujours
        this.currentPageIndex = Math.min(oldPageIndex, newTotalPages - 1);
      }
      
      // Forcer la détection de changement
      this.cdr.detectChanges();
    } else {
      // Aucun étudiant après filtrage
      this.segments = [];
      this.currentSegment = null;
      this.currentPageIndex = 0;
      this.cdr.detectChanges();
    }
  }
}

