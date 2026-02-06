import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subject, interval, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BiostarAttendanceService } from '../../services/biostar-attendance.service';
import { ConfigurationAutoService } from '../../services/configuration-auto.service';

interface StudentAttendance {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  photo: string | null;
  promotion: {
    id: number;
    name: string;
  };
  etablissement: {
    id: number;
    name: string;
  };
  ville: {
    id: number;
    name: string;
  };
  group: {
    id: number;
    title: string;
  };
  option: {
    id: number;
    name: string;
  };
  status: 'present' | 'absent' | 'late' | 'excused';
  punch_time?: {
    time: string;
    device: string;
  };
}

interface AbsentStudent extends StudentAttendance {
  status: 'absent' | 'late';
}

interface Segment {
  title: string;
  students: AbsentStudent[];
  type: 'group' | 'salle' | 'alphabet';
}

interface RattrapageInfo {
  id: number;
  name: string;
  pointage_start_hour: string;
  start_hour: string;
  end_hour: string;
  date: string;
  tolerance?: number;
  created_at: string;
  updated_at: string;
  ville?: {
    id: number;
    name: string;
  };
}

interface AttendanceResponse {
  success: boolean;
  message: string;
  rattrapage: RattrapageInfo;
  total_students: number;
  presents: number;
  absents: number;
  lates: number;
  excused: number;
  students: StudentAttendance[];
}

@Component({
  selector: 'app-rattrapage-display',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rattrapage-display.component.html',
  styleUrl: './rattrapage-display.component.css'
})
export class RattrapageDisplayComponent implements OnInit, AfterViewInit, OnDestroy {
  segments: Segment[] = [];
  currentSegmentIndex = 0;
  currentSegment: Segment | null = null;
  loading = true;
  error = '';
  successMessage = ''; // Message positif quand tous les étudiants sont présents
  
  // Configuration du défilement
  segmentDisplayDuration = 15000; // 15 secondes par page de 20 étudiants
  studentsPerPage = 20; // Afficher 20 étudiants à la fois
  currentPageIndex = 0; // Index de la page actuelle (groupe de 20)
  
  rattrapageId: number | null = null;
  rattrapageData: RattrapageInfo | null = null;
  
  private destroy$ = new Subject<void>();
  private segmentInterval: any;
  private refreshInterval: any;
  private resizeListener?: () => void;
  private refreshDuration = 10000; // 10 secondes (rafraîchissement plus fréquent)
  
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
  
  // Services pour Biostar
  private currentVilleId: number | null = null;
  private biostarTimeOffsetMinutes: number = 0;
  
  // Exposer Math pour le template
  Math = Math;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private biostarAttendanceService: BiostarAttendanceService,
    private configurationAutoService: ConfigurationAutoService
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du rattrapage depuis l'URL
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.rattrapageId = +params['id'];
      if (this.rattrapageId) {
        // Charger d'abord les données du rattrapage, puis les absents
        this.loadRattrapageData();
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
   * Charger les données du rattrapage
   */
  loadRattrapageData(): void {
    if (!this.rattrapageId) return;
    
    this.http.get<AttendanceResponse>(`${environment.apiUrl}/rattrapages/${this.rattrapageId}/attendance`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.rattrapageData = response.rattrapage;
            // Une fois le rattrapage chargé, charger les absents
            if (this.rattrapageData) {
              // Déterminer la ville pour Biostar
              let villeId: number | null = null;
              let villeName: string = '';
              
              if (this.rattrapageData.ville?.id) {
                villeId = this.rattrapageData.ville.id;
                villeName = this.rattrapageData.ville.name || '';
              } else if (response.students.length > 0 && response.students[0].ville) {
                villeId = response.students[0].ville.id;
                villeName = response.students[0].ville.name || '';
              }
              
              this.currentVilleId = villeId;
              
              // Toujours appliquer l'offset de +60 minutes car le serveur Biostar est toujours décalé de -60 minutes
              // (le serveur Biostar enregistre les heures avec un décalage de -60 min par rapport à l'heure locale)
              this.biostarTimeOffsetMinutes = 60;
              
              // Charger d'abord les étudiants depuis l'API, puis intégrer les données Biostar
              this.loadAbsentStudents(false, () => {
                // Une fois les étudiants chargés, charger les données Biostar si disponible
                if (villeId) {
                  this.autoSelectConfigurationForRattrapage(villeId, villeName);
                } else {
                  // Pas de ville, afficher directement les étudiants
                  this.finalizeDisplay();
                }
              });
            }
          } else {
            this.error = response.message || 'Erreur lors du chargement du rattrapage';
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement du rattrapage:', error);
          this.error = 'Erreur lors du chargement du rattrapage';
          this.loading = false;
        }
      });
  }

  /**
   * Auto-sélectionner la configuration pour le rattrapage actuel
   */
  autoSelectConfigurationForRattrapage(villeId: number, villeName: string): void {
    if (!this.rattrapageId || !villeId) {
      // Pas de ville, afficher directement
      this.finalizeDisplay();
      return;
    }

    console.log('🔄 Auto-sélection de la configuration pour le rattrapage ID:', this.rattrapageId, 'Ville:', villeName);
    
    // Utiliser la méthode pour récupérer la configuration par ville
    this.configurationAutoService.getConfigurationForVille(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Configuration trouvée:', response);
          
          if (response.success && response.data) {
            // Toujours appliquer l'offset de +60 minutes car le serveur Biostar est toujours décalé de -60 minutes
            // (le serveur Biostar enregistre les heures avec un décalage de -60 min par rapport à l'heure locale)
            this.biostarTimeOffsetMinutes = 60;
            
            // Charger les données de pointage depuis Biostar
            this.loadBiostarAttendanceData(villeId);
          } else {
            // Pas de configuration, afficher directement
            this.finalizeDisplay();
          }
        },
        error: (error) => {
          console.warn('⚠️ Aucune configuration trouvée pour ce rattrapage:', error);
          // Pas de configuration, afficher directement
          this.finalizeDisplay();
        }
      });
  }

  /**
   * Charger les données de pointage depuis Biostar pour un rattrapage
   */
  loadBiostarAttendanceData(villeId: number): void {
    if (!this.rattrapageId || !this.rattrapageData || !villeId) {
      console.warn('⚠️ Aucune donnée de rattrapage ou ville disponible pour charger les données Biostar');
      this.finalizeDisplay();
      return;
    }

    console.log('🔄 Chargement des données de pointage depuis Biostar pour le rattrapage:', this.rattrapageId, 'Ville ID:', villeId);
    
    // Calculer l'heure de fin basée sur start_hour + tolerance (cohérent avec la nouvelle logique)
    const tolerance = this.rattrapageData.tolerance || 5;
    const rattrapageDate = new Date(this.rattrapageData.date);
    const startTime = this.parseTimeString(this.rattrapageData.start_hour);
    const startDateTime = new Date(rattrapageDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);
    
    const toleranceDateTime = new Date(startDateTime);
    toleranceDateTime.setMinutes(toleranceDateTime.getMinutes() + tolerance);
    
    // Formater l'heure de fin au format HH:MM:SS
    const endTimeFormatted = `${String(toleranceDateTime.getHours()).padStart(2, '0')}:${String(toleranceDateTime.getMinutes()).padStart(2, '0')}:${String(toleranceDateTime.getSeconds()).padStart(2, '0')}`;
    
    console.log('📅 Paramètres de plage horaire:', {
      date: this.rattrapageData.date,
      start_time: this.rattrapageData.pointage_start_hour,
      end_time: endTimeFormatted, // Utiliser start_hour + tolerance au lieu de end_hour
      end_time_old: this.rattrapageData.end_hour // Ancienne valeur pour référence
    });
    
    this.biostarAttendanceService.getAttendanceFromBiostarByVille(
      villeId,
      {
        date: this.rattrapageData.date,
        start_time: this.rattrapageData.pointage_start_hour,
        end_time: endTimeFormatted // Utiliser start_hour + tolerance
      }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('✅ Données de pointage Biostar récupérées:', response);
        
        if (response.success && response.data) {
          // Intégrer les données de pointage avec les étudiants
          this.integrateBiostarDataWithStudents(response.data);
        } else {
          // Pas de données Biostar, afficher directement
          this.finalizeDisplay();
        }
      },
      error: (error) => {
        console.warn('⚠️ Erreur lors de la récupération des données Biostar:', error);
        // Erreur, afficher quand même les étudiants
        this.finalizeDisplay();
      }
    });
  }

  /**
   * Intégrer les données de pointage Biostar avec les étudiants
   */
  integrateBiostarDataWithStudents(biostarData: any): void {
    if (!this.allStudents || this.allStudents.length === 0) {
      console.warn('⚠️ Aucun étudiant à traiter');
      this.finalizeDisplay();
      return;
    }

    console.log('🔄 Intégration des données Biostar avec les étudiants');
    console.log(`📊 Avant intégration: ${this.allStudents.length} étudiant(s)`);

    // Si pas de données Biostar, on garde les étudiants tels quels mais on filtre quand même
    if (!biostarData || !biostarData.punches || biostarData.punches.length === 0) {
      console.log('⚠️ Aucune donnée Biostar disponible, affichage des étudiants sans pointage');
      this.finalizeDisplay();
      return;
    }

    // Normalisation simple (trim + uppercase)
    const normalize = (v: any) => (v === null || v === undefined) ? '' : String(v).trim().toUpperCase();

    // Créer un map des pointages par clés possibles (user_id, bsevtc, user_name)
    const punchMap = new Map<string, any[]>();
    biostarData.punches.forEach((punch: any) => {
      const candidateKeys = [
        normalize(punch.student_id ?? punch.user_id),
        normalize(punch.bsevtc),
        normalize(punch.user_name)
      ].filter(k => !!k);

      for (const key of candidateKeys) {
        if (!punchMap.has(key)) punchMap.set(key, []);
        punchMap.get(key)!.push(punch);
      }
    });

    // Mettre à jour les étudiants avec leurs données de pointage
    const studentsToRemove: number[] = [];
    
    this.allStudents.forEach(student => {
      const key = normalize(student.matricule);
      const studentPunches = punchMap.get(key);
      if (studentPunches && studentPunches.length > 0) {
        // Trier par date et prendre le plus récent (dernier)
        studentPunches.sort((a: any, b: any) => {
          const at = new Date(a.bsevtdt || a.punch_time).getTime();
          const bt = new Date(b.bsevtdt || b.punch_time).getTime();
          return at - bt;
        });
        const lastPunch = studentPunches[studentPunches.length - 1];

        // Parser + appliquer offset
        const rawTime: string = lastPunch.punch_time || lastPunch.bsevtdt;
        const punchTimeDate = this.parseStudentPunchTime(rawTime);

        // Recalculer le statut avec la date ajustée
        const newStatus = this.calculateStudentStatus(punchTimeDate);
        
        // Si l'étudiant devient présent, on le marque pour suppression
        if (newStatus === 'present' || newStatus === 'excused') {
          studentsToRemove.push(student.id);
          return; // Ne pas mettre à jour cet étudiant
        }
        
        // Mettre à jour le statut et les données de pointage
        student.punch_time = {
          time: punchTimeDate.toISOString(),
          device: lastPunch.device_name || lastPunch.devnm || lastPunch.device || 'Inconnu'
        };
        
        // Le statut ne peut être que 'absent' ou 'late' maintenant
        student.status = newStatus as 'absent' | 'late';
      }
    });

    // Retirer les étudiants qui sont maintenant présents
    if (studentsToRemove.length > 0) {
      console.log(`🗑️ Retrait de ${studentsToRemove.length} étudiant(s) présent(s)`);
      this.allStudents = this.allStudents.filter(
        student => !studentsToRemove.includes(student.id)
      ) as AbsentStudent[];
    }

    console.log(`✅ Après intégration: ${this.allStudents.length} étudiant(s) restant(s)`);

    // Recalculer les segments avec les nouvelles données et finaliser l'affichage
    this.finalizeDisplay();
  }

  /**
   * Parse l'heure de pointage d'un étudiant
   */
  private parseStudentPunchTime(punchTimeString: string): Date {
    // Si c'est un timestamp ISO complet
    if (punchTimeString.includes('T') && (punchTimeString.includes('Z') || punchTimeString.includes('+'))) {
      const date = new Date(punchTimeString);
      return date;
    }
    
    // Si c'est au format DD/MM/YYYY HH:MM:SS (format français)
    if (punchTimeString.includes('/') && punchTimeString.includes(' ')) {
      const [datePart, timePart] = punchTimeString.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      
      const date = new Date(year, month - 1, day, hours, minutes, seconds || 0, 0);
      return this.applyBiostarOffset(date);
    }
    
    // Si c'est au format YYYY-MM-DD HH:MM:SS
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/.test(punchTimeString)) {
      const [datePart, timePart] = punchTimeString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hours, minutes, seconds || 0, 0);
      return this.applyBiostarOffset(date);
    }
    
    // Fallback: essayer de parser comme date générique
    const date = new Date(punchTimeString);
    if (!isNaN(date.getTime())) {
      return this.applyBiostarOffset(date);
    }
    
    return this.applyBiostarOffset(new Date());
  }

  private applyBiostarOffset(date: Date): Date {
    if (!date || isNaN(date.getTime())) return date;
    const adjusted = new Date(date);
    const offset = Number(this.biostarTimeOffsetMinutes) || 0;
    adjusted.setMinutes(adjusted.getMinutes() + offset);
    return adjusted;
  }

  /**
   * Calcule le statut de l'étudiant basé sur l'heure de pointage et la tolérance
   * RÈGLES:
   * - Présent : entre pointage_start_hour et start_hour
   * - En retard : entre start_hour et start_hour + tolerance
   * - Absent : avant pointage_start_hour ou après start_hour + tolerance
   */
  calculateStudentStatus(punchTime: Date): 'present' | 'absent' | 'late' | 'excused' {
    if (!this.rattrapageData) {
      return 'absent';
    }

    if (isNaN(punchTime.getTime())) {
      return 'absent';
    }

    const tolerance = this.rattrapageData.tolerance || 5; // Tolérance par défaut de 5 minutes

    // Créer les dates de référence
    const rattrapageDate = new Date(this.rattrapageData.date);
    const pointageStartTime = this.parseTimeString(this.rattrapageData.pointage_start_hour);
    const startTime = this.parseTimeString(this.rattrapageData.start_hour);

    // Créer les dates complètes
    const pointageStartDateTime = new Date(rattrapageDate);
    pointageStartDateTime.setHours(pointageStartTime.getHours(), pointageStartTime.getMinutes(), pointageStartTime.getSeconds(), 0);

    const startDateTime = new Date(rattrapageDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);

    const toleranceDateTime = new Date(startDateTime);
    toleranceDateTime.setMinutes(toleranceDateTime.getMinutes() + tolerance);

    // NOUVELLE LOGIQUE:
    // 1. Présent : entre pointage_start_hour et start_hour
    if (punchTime >= pointageStartDateTime && punchTime < startDateTime) {
      return 'present';
    } 
    // 2. En retard : entre start_hour et start_hour + tolerance
    else if (punchTime >= startDateTime && punchTime <= toleranceDateTime) {
      return 'late';
    } 
    // 3. Absent : avant pointage_start_hour ou après start_hour + tolerance
    else {
      return 'absent';
    }
  }

  /**
   * Parse une chaîne de temps (HH:MM:SS) en objet Date
   */
  private parseTimeString(timeString: string): Date {
    const [hours, minutes, seconds] = timeString.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, seconds || 0, 0);
    return date;
  }

  /**
   * Finaliser l'affichage après chargement des données
   * Cette méthode est appelée APRÈS que tous les filtrages soient terminés
   */
  private finalizeDisplay(): void {
    console.log('🎯 Finalisation de l\'affichage...');
    console.log(`📊 Étudiants avant filtrage final: ${this.allStudents.length}`);
    
    // S'assurer qu'on n'affiche que les VRAIS absents (ceux sans face ID détecté)
    // Même si le statut a été recalculé, on ne garde que "absent"
    const validStudents = this.allStudents.filter(s => 
      s.status === 'absent'
    );
    
    if (validStudents.length === 0) {
      console.log('✅ Tous les étudiants sont présents !');
      this.segments = [];
      this.currentSegment = null;
      this.error = '';
    this.successMessage = ''; // Réinitialiser le message de succès // Pas d'erreur
      this.successMessage = 'Excellent ! Tous les étudiants sont présents';
      this.loading = false;
      return;
    }
    
    // Appliquer le filtre d'affichage (all = absents + en retard, absent-only = seulement absents)
    const filteredStudents = this.displayFilter === 'absent-only'
      ? validStudents.filter(s => s.status === 'absent')
      : [...validStudents];
    
    console.log(`📊 Étudiants après filtrage d'affichage: ${filteredStudents.length}`);
    
    // Grouper par segments (tri alphabétique)
    const newSegments = this.groupStudentsBySegments(filteredStudents);
    
    if (newSegments.length > 0) {
      console.log(`✅ Affichage de ${filteredStudents.length} étudiant(s) dans ${newSegments.length} segment(s)`);
      
      this.segments = newSegments;
      this.currentSegmentIndex = 0;
      this.currentSegment = this.segments[0];
      this.successMessage = ''; // Réinitialiser le message de succès s'il y a des absents
      this.loading = false; // ← C'est ici qu'on arrête le loading et qu'on affiche
      
      // Initialiser la liste précédente pour le premier chargement
      this.previousAbsentStudents = [...this.allStudents];
      
      setTimeout(() => {
        this.calculateStudentsPerPage();
        this.startDisplayLoop();
      }, 200);
    } else {
      console.log('✅ Tous les étudiants sont présents !');
      this.segments = [];
      this.currentSegment = null;
      this.error = '';
    this.successMessage = ''; // Réinitialiser le message de succès // Pas d'erreur
      this.successMessage = 'Excellent ! Tous les étudiants sont présents';
      this.loading = false;
    }
  }

  /**
   * Charger les étudiants absents
   * @param isRefresh - Si true, c'est un rafraîchissement automatique (pas de loading visible)
   * @param callback - Callback à appeler après le chargement des étudiants
   */
  loadAbsentStudents(isRefresh: boolean = false, callback?: () => void): void {
    if (!this.rattrapageId || !this.rattrapageData) {
      this.error = 'Données de rattrapage manquantes';
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
    this.successMessage = ''; // Réinitialiser le message de succès
    
    // Récupérer les données d'attendance
    this.http.get<AttendanceResponse>(`${environment.apiUrl}/rattrapages/${this.rattrapageId}/attendance`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Toujours repartir de la liste brute fournie par l'API
            this.allStudents = (response.students || []) as AbsentStudent[];

            // Pour le premier chargement, on déclenche déjà le pipeline complet (Biostar + filtres)
            // via le callback fourni par loadRattrapageData (autoSelectConfigurationForRattrapage → loadBiostarAttendanceData)
            if (!isRefresh && callback) {
              callback();
              return;
            }

            // Pour les rafraîchissements automatiques, on réapplique aussi Biostar si on connaît la ville
            if (isRefresh && this.currentVilleId) {
              // Le résultat de Biostar réappliquera les filtres et mettra à jour l'affichage
              this.loadBiostarAttendanceData(this.currentVilleId);
            } else {
              // Pas de Biostar configuré : on finalise directement l'affichage avec les données API
              this.finalizeDisplay();
            }
          } else {
            this.error = response.message || 'Erreur lors du chargement des données';
            this.loading = false;
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
   * Aller à la page suivante (manuel ou automatique)
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
   * Aller à la page précédente (navigation manuelle)
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
   * Réinitialiser le timer de lecture automatique
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
  }

  /**
   * Obtenir le nombre d'étudiants absents
   */
  getAbsentCount(): number {
    return this.allStudents.filter(s => s.status === 'absent').length;
  }

  /**
   * Obtenir le nombre d'étudiants en retard
   */
  getLateCount(): number {
    return this.allStudents.filter(s => s.status === 'late').length;
  }

  /**
   * Obtenir le nombre total d'absences
   */
  getTotalAbsencesCount(): number {
    return this.allStudents.length;
  }

  /**
   * Obtenir le statut formaté
   */
  getStatusLabel(status: string): string {
    return status === 'late' ? 'En Retard' : 'Absent';
  }

  /**
   * Obtenir la classe CSS pour le statut
   */
  getStatusClass(status: string): string {
    return status === 'late' ? 'status-late' : 'status-absent';
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
   * Changer le filtre d'affichage
   */
  changeDisplayFilter(filter: 'all' | 'absent-only'): void {
    this.displayFilter = filter;
    
    if (this.allStudents.length === 0) {
      this.currentPageIndex = 0;
      this.loadAbsentStudents();
      return;
    }
    
    this.applyCurrentFilter();
  }

  /**
   * Appliquer le filtre actuel aux données déjà chargées
   */
  private applyCurrentFilter(): void {
    if (this.allStudents.length === 0) {
      return;
    }
    
    let filteredStudents: AbsentStudent[];
    
    if (this.displayFilter === 'absent-only') {
      filteredStudents = this.allStudents.filter((s: AbsentStudent) => 
        s.status === 'absent'
      );
    } else {
      filteredStudents = [...this.allStudents];
    }
    
    const newSegments = this.groupStudentsBySegments(filteredStudents);
    
    if (newSegments.length > 0) {
      const oldTotalPages = this.getTotalPages();
      const oldPageIndex = this.currentPageIndex;
      
      this.segments = newSegments;
      this.currentSegmentIndex = 0;
      this.currentSegment = this.segments[0];
      
      this.calculateStudentsPerPage();
      
      const newTotalPages = this.getTotalPages();
      if (oldTotalPages > 0 && oldPageIndex >= newTotalPages) {
        this.currentPageIndex = Math.max(0, newTotalPages - 1);
      } else {
        this.currentPageIndex = Math.min(oldPageIndex, newTotalPages - 1);
      }
      
      this.cdr.detectChanges();
    } else {
      this.segments = [];
      this.currentSegment = null;
      this.currentPageIndex = 0;
      this.cdr.detectChanges();
    }
  }
}

