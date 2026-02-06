import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { BiostarAttendanceService } from '../../services/biostar-attendance.service';
import { ConfigurationAutoService } from '../../services/configuration-auto.service';
import { Subject, takeUntil, interval, Subscription } from 'rxjs';
import * as XLSX from 'xlsx';

// Angular Material imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

export interface RattrapageInfo {
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

export interface StudentAttendance {
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
  notes?: string;
}

export interface AttendanceResponse {
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
  selector: 'app-rattrapage-attendance',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, 
    FormsModule, 
    // Angular Material modules
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatToolbarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  templateUrl: './rattrapage-attendance.component.html',
  styleUrl: './rattrapage-attendance.component.css'
})
export class RattrapageAttendanceComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;
  private destroy$ = new Subject<void>();
  
  // Injected services
  private route: ActivatedRoute;
  private router: Router;
  private notificationService: NotificationService;
  private cdr: ChangeDetectorRef;
  private biostarAttendanceService: BiostarAttendanceService;
  private configurationAutoService: ConfigurationAutoService;
  
  // Data
  rattrapage: RattrapageInfo | null = null;
  students: StudentAttendance[] = [];
  filteredStudents: StudentAttendance[] = [];
  
  // Statistics
  totalStudents = 0;
  presents = 0;
  absents = 0;
  lates = 0;
  excused = 0;
  
  // UI state
  loading = false;
  error = '';
  rattrapageId: number | null = null;
  
  // Search and filters
  searchTerm = '';
  statusFilter = '';
  showSearchResults = false;
  
  // Sort
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Grouping
  groupedStudents: { [key: string]: StudentAttendance[] } = {};
  alphabetGroups: string[] = [];
  showAlphabeticalGrouping = false;
  
  // Export
  isExporting = false;
  exportFormat: 'csv' | 'excel' | null = null;
  
  // Propriétés pour l'actualisation automatique
  autoRefreshInterval = 30000; // 30 secondes en millisecondes
  lastRefreshTime: Date | null = null;
  private autoRefreshSub?: Subscription;
  private currentVilleId: number | null = null; // Stocker la ville ID pour éviter de la rechercher à chaque fois
  
  // Propriétés pour l'état de la configuration Biostar
  biostarConfigStatus: 'loading' | 'success' | 'error' | 'none' = 'loading';
  biostarConfigMessage: string = 'Initialisation de la configuration Biostar...';
  biostarConfigVille: string | null = null; // Nom de la ville pour laquelle la configuration est chargée
  
  // Offset configurable appliqué aux heures de pointage Biostar (en minutes)
  biostarTimeOffsetMinutes: number = 0;
  
  constructor() {
    this.route = inject(ActivatedRoute);
    this.router = inject(Router);
    this.notificationService = inject(NotificationService);
    this.cdr = inject(ChangeDetectorRef);
    this.biostarAttendanceService = inject(BiostarAttendanceService);
    this.configurationAutoService = inject(ConfigurationAutoService);
  }
  
  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.rattrapageId = +params['id'];
      if (this.rattrapageId) {
        this.loadRattrapageAttendance();
        // Démarrer l'actualisation automatique après le chargement initial
        this.startAutoRefresh();
      }
    });
  }
  
  ngOnDestroy() {
    this.autoRefreshSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  loadRattrapageAttendance() {
    if (!this.rattrapageId) return;
    
    this.loading = true;
    this.error = '';
    this.markForCheck();
    
    this.http.get<AttendanceResponse>(`${this.apiUrl}/rattrapages/${this.rattrapageId}/attendance`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.rattrapage = response.rattrapage;
            this.students = response.students;
            this.filteredStudents = [...this.students];
            this.totalStudents = response.total_students;
            this.presents = response.presents;
            this.absents = response.absents;
            this.lates = response.lates;
            this.excused = response.excused;
            
            // Déterminer la ville depuis le rattrapage ou le premier étudiant si disponible
            let villeId: number | null = null;
            let villeName: string = '';
            
            // Priorité: ville du rattrapage, sinon ville du premier étudiant
            if (this.rattrapage?.ville?.id) {
              villeId = this.rattrapage.ville.id;
              villeName = this.rattrapage.ville.name || '';
            } else if (this.students.length > 0 && this.students[0].ville) {
              villeId = this.students[0].ville.id;
              villeName = this.students[0].ville.name || '';
            }
            
            // Stocker la ville ID pour le rechargement automatique
            this.currentVilleId = villeId;
            
            // Toujours appliquer l'offset de +60 minutes car le serveur Biostar est toujours décalé de -60 minutes
            // (le serveur Biostar enregistre les heures avec un décalage de -60 min par rapport à l'heure locale)
            this.biostarTimeOffsetMinutes = 60;
            
            // Auto-sélectionner la configuration Biostar si disponible (seulement si pas déjà chargée)
            if (villeId && this.biostarConfigStatus !== 'success') {
              this.autoSelectConfigurationForRattrapage(villeId, villeName);
            } else if (villeId && this.biostarConfigStatus === 'success') {
              // Si la configuration est déjà chargée, recharger directement les données Biostar
              this.loadBiostarAttendanceData(villeId);
            } else {
              this.biostarConfigStatus = 'none';
              this.biostarConfigMessage = 'Aucune ville trouvée pour charger la configuration Biostar';
            }
            
            this.groupStudentsAlphabetically();
            this.loading = false;
            
            // Enregistrer l'heure de la dernière actualisation
            this.lastRefreshTime = new Date();
          } else {
            this.error = response.message || 'Erreur lors du chargement des données';
            this.loading = false;
          }
          this.markForCheck();
        },
        error: (err) => {
          console.error('Erreur lors du chargement de l\'attendance:', err);
          this.error = 'Erreur lors du chargement des données d\'attendance';
          this.loading = false;
          this.markForCheck();
        }
      });
  }

  /**
   * Auto-sélectionner la configuration pour le rattrapage actuel
   */
  autoSelectConfigurationForRattrapage(villeId: number, villeName: string): void {
    if (!this.rattrapageId || !villeId) return;

    console.log('🔄 Auto-sélection de la configuration pour le rattrapage ID:', this.rattrapageId, 'Ville:', villeName);
    
    // Mettre à jour l'état de chargement
    this.biostarConfigStatus = 'loading';
    this.biostarConfigMessage = 'Chargement de la configuration Biostar...';
    
    // Utiliser la méthode pour récupérer la configuration par ville
    this.configurationAutoService.getConfigurationForVille(villeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Configuration trouvée:', response);
          
          if (response.success && response.data) {
            // Mettre à jour l'état de succès
            this.biostarConfigStatus = 'success';
            this.biostarConfigVille = villeName;
            this.biostarConfigMessage = `Configuration Biostar chargée pour la ville: ${villeName}`;
            
            console.log('✅ Configuration Biostar chargée:', {
              ville_id: villeId,
              ville_name: villeName,
              config_data: response.data
            });
            
            // Toujours appliquer l'offset de +60 minutes car le serveur Biostar est toujours décalé de -60 minutes
            // (le serveur Biostar enregistre les heures avec un décalage de -60 min par rapport à l'heure locale)
            this.biostarTimeOffsetMinutes = 60;
            
            // Charger les données de pointage depuis Biostar
            this.loadBiostarAttendanceData(villeId);
          } else {
            this.biostarConfigStatus = 'error';
            this.biostarConfigVille = null;
            this.biostarConfigMessage = `Aucune configuration Biostar trouvée pour la ville: ${villeName}`;
          }
        },
        error: (error) => {
          console.warn('⚠️ Aucune configuration trouvée pour ce rattrapage:', error);
          
          // Mettre à jour l'état d'erreur
          this.biostarConfigStatus = 'error';
          this.biostarConfigVille = null;
          this.biostarConfigMessage = `Aucune configuration Biostar trouvée pour la ville: ${villeName}. Les données de pointage ne seront pas disponibles.`;
        }
      });
  }

  /**
   * Charger les données de pointage depuis Biostar pour un rattrapage
   */
  loadBiostarAttendanceData(villeId: number): void {
    if (!this.rattrapageId || !this.rattrapage || !villeId) {
      console.warn('⚠️ Aucune donnée de rattrapage ou ville disponible pour charger les données Biostar');
      return;
    }

    console.log('🔄 Chargement des données de pointage depuis Biostar pour le rattrapage:', this.rattrapageId, 'Ville ID:', villeId);
    
    // Calculer l'heure de fin basée sur start_hour + tolerance (cohérent avec la nouvelle logique)
    const tolerance = this.rattrapage.tolerance || 5;
    const rattrapageDate = new Date(this.rattrapage.date);
    const startTime = this.parseTimeString(this.rattrapage.start_hour);
    const startDateTime = new Date(rattrapageDate);
    startDateTime.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds(), 0);
    
    const toleranceDateTime = new Date(startDateTime);
    toleranceDateTime.setMinutes(toleranceDateTime.getMinutes() + tolerance);
    
    // Formater l'heure de fin au format HH:MM:SS
    const endTimeFormatted = `${String(toleranceDateTime.getHours()).padStart(2, '0')}:${String(toleranceDateTime.getMinutes()).padStart(2, '0')}:${String(toleranceDateTime.getSeconds()).padStart(2, '0')}`;
    
    console.log('📅 Paramètres de plage horaire:', {
      date: this.rattrapage.date,
      start_time: this.rattrapage.pointage_start_hour,
      end_time: endTimeFormatted, // Utiliser start_hour + tolerance au lieu de end_hour
      end_time_old: this.rattrapage.end_hour // Ancienne valeur pour référence
    });
    
    this.biostarAttendanceService.getAttendanceFromBiostarByVille(
      villeId,
      {
        date: this.rattrapage.date,
        start_time: this.rattrapage.pointage_start_hour,
        end_time: endTimeFormatted // Utiliser start_hour + tolerance
      }
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('✅ Données de pointage Biostar récupérées:', response);
        
        if (response.success && response.data) {
          // Intégrer les données de pointage avec les étudiants
          this.integrateBiostarDataWithStudents(response.data);
        }
      },
      error: (error) => {
        console.warn('⚠️ Erreur lors de la récupération des données Biostar:', error);
      }
    });
  }

  /**
   * Intégrer les données de pointage Biostar avec les étudiants
   */
  integrateBiostarDataWithStudents(biostarData: any): void {
    if (!biostarData.punches || !this.students) return;

    console.log('🔄 Intégration des données Biostar avec les étudiants');
    console.log('📊 Données Biostar reçues:', biostarData);
    console.log('👥 Étudiants locaux:', this.students.length);

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

    console.log('🗺️ Map des pointages créé:', punchMap.size, 'clés avec pointages');

    // Mettre à jour les étudiants avec leurs données de pointage
    let matchedStudents = 0;
    this.students.forEach(student => {
      const key = normalize(student.matricule);
      const studentPunches = punchMap.get(key);
      if (studentPunches && studentPunches.length > 0) {
        matchedStudents++;

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

        student.punch_time = {
          time: punchTimeDate.toISOString(),
          device: lastPunch.device_name || lastPunch.devnm || lastPunch.device || 'Inconnu'
        };
        
        // Recalculer le statut avec la date ajustée
        student.status = this.calculateStudentStatus(punchTimeDate);
        
        console.log(`✅ Étudiant ${student.matricule} (${student.last_name} ${student.first_name}) - Statut: ${student.status}`);
      } else {
        console.log(`❌ Aucun pointage trouvé pour l'étudiant ${student.matricule} (${student.last_name} ${student.first_name})`);
      }
    });

    // Recalculer les statistiques
    this.presents = this.students.filter(s => s.status === 'present').length;
    this.absents = this.students.filter(s => s.status === 'absent').length;
    this.lates = this.students.filter(s => s.status === 'late').length;
    this.excused = this.students.filter(s => s.status === 'excused').length;
    this.totalStudents = this.students.length;

    // Mettre à jour les étudiants filtrés
    this.filteredStudents = [...this.students];
    this.groupStudentsAlphabetically();
    
    console.log(`✅ Données Biostar intégrées avec succès - ${matchedStudents}/${this.students.length} étudiants correspondants`);
    console.log('📊 Statistiques finales:', {
      total: this.totalStudents,
      presents: this.presents,
      absents: this.absents,
      lates: this.lates,
      excused: this.excused
    });
    
    this.markForCheck();
  }

  /**
   * Parse l'heure de pointage d'un étudiant (gère le format français DD/MM/YYYY HH:MM:SS)
   */
  private parseStudentPunchTime(punchTimeString: string): Date {
    console.log('🎯 Parsing student punch time:', punchTimeString);
    
    // Si c'est un timestamp ISO complet
    if (punchTimeString.includes('T') && (punchTimeString.includes('Z') || punchTimeString.includes('+'))) {
      const date = new Date(punchTimeString);
      console.log('📅 Parsed ISO punch time (offset déjà appliqué):', date.toLocaleString());
      return date;
    }
    
    // Si c'est au format DD/MM/YYYY HH:MM:SS (format français)
    if (punchTimeString.includes('/') && punchTimeString.includes(' ')) {
      const [datePart, timePart] = punchTimeString.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      
      const date = new Date(year, month - 1, day, hours, minutes, seconds || 0, 0);
      console.log('📅 Parsed French date/time:', date.toLocaleString());
      return this.applyBiostarOffset(date);
    }
    
    // Si c'est au format YYYY-MM-DD HH:MM:SS.microseconds (format SQL Server)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+$/.test(punchTimeString)) {
      const [datePart, timePart] = punchTimeString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [timeOnly] = timePart.split('.');
      const [hours, minutes, seconds] = timeOnly.split(':').map(Number);
      
      const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
      console.log('📅 Parsed SQL Server date/time:', date.toLocaleString());
      return this.applyBiostarOffset(date);
    }

    // Si c'est au format YYYY-MM-DD HH:MM:SS (sans microsecondes)
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(punchTimeString)) {
      const [datePart, timePart] = punchTimeString.split(' ');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split(':').map(Number);
      const date = new Date(year, month - 1, day, hours, minutes, seconds, 0);
      return this.applyBiostarOffset(date);
    }
    
    // Si c'est juste une heure HH:MM ou HH:MM:SS
    if (punchTimeString.includes(':') && !punchTimeString.includes('/')) {
      const [hours, minutes, seconds] = punchTimeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, (seconds || 0), 0);
      console.log('⏰ Parsed time only:', date.toLocaleString());
      return this.applyBiostarOffset(date);
    }
    
    // Fallback: essayer de parser comme date générique
    const date = new Date(punchTimeString);
    if (!isNaN(date.getTime())) {
      console.log('📅 Parsed fallback punch time:', date.toLocaleString());
      return this.applyBiostarOffset(date);
    }
    
    console.error('❌ Impossible de parser l\'heure de pointage:', punchTimeString);
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
    if (!this.rattrapage) {
      console.log('❌ Pas de données de rattrapage pour calculer le statut');
      return 'absent';
    }

    // Vérifier si la date de pointage est valide
    if (isNaN(punchTime.getTime())) {
      console.log('❌ Date de pointage invalide:', punchTime);
      return 'absent';
    }

    const tolerance = this.rattrapage.tolerance || 5; // Tolérance par défaut de 5 minutes

    // Créer les dates de référence
    const rattrapageDate = new Date(this.rattrapage.date);
    const pointageStartTime = this.parseTimeString(this.rattrapage.pointage_start_hour);
    const startTime = this.parseTimeString(this.rattrapage.start_hour);

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
   * Démarre l'actualisation automatique toutes les 30 secondes
   */
  startAutoRefresh(): void {
    console.log('🔄 Démarrage de l\'actualisation automatique (toutes les 30s)');
    
    this.autoRefreshSub = interval(this.autoRefreshInterval)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        if (this.isRattrapageTermine()) {
          console.log('⏹️ Rattrapage terminé - arrêt du rafraîchissement automatique');
          this.autoRefreshSub?.unsubscribe();
          return;
        }
        console.log('⏰ Actualisation automatique déclenchée');
        // Recharger les données Biostar directement si la configuration est déjà chargée
        this.refreshBiostarDataOnly();
      });
  }
  
  /**
   * Recharge uniquement les données Biostar sans recharger toute la page
   * Plus efficace que de tout recharger
   */
  refreshBiostarDataOnly(): void {
    if (!this.currentVilleId) {
      // Si pas de ville stockée, recharger tout
      console.log('🔄 Rechargement complet (ville non disponible)');
      this.loadRattrapageAttendance();
      return;
    }
    
    // Si la configuration est déjà chargée, recharger directement les données Biostar
    if (this.biostarConfigStatus === 'success') {
      console.log('🔄 Rechargement des données Biostar uniquement (ville ID:', this.currentVilleId, ')');
      this.loadBiostarAttendanceData(this.currentVilleId);
    } else {
      // Sinon, recharger tout (y compris la configuration)
      console.log('🔄 Rechargement complet (configuration non chargée)');
      this.loadRattrapageAttendance();
    }
  }

  /**
   * Vérifie si le rattrapage est terminé (dans le passé)
   */
  private isRattrapageTermine(): boolean {
    if (!this.rattrapage?.date || !this.rattrapage?.end_hour) return false;
    
    const now = new Date();
    const rattrapageDate = new Date(this.rattrapage.date);
    const nowDate = now.toISOString().split('T')[0];
    const rattrapageDateOnly = rattrapageDate.toISOString().split('T')[0];
    
    // Si la date est dans le passé
    if (rattrapageDateOnly < nowDate) return true;
    
    // Si c'est aujourd'hui, vérifier l'heure de fin
    if (rattrapageDateOnly === nowDate) {
      const dateOnly = rattrapageDate.toISOString().split('T')[0];
      const heureFin = new Date(dateOnly + 'T' + this.rattrapage.end_hour);
      return now > heureFin;
    }
    
    return false;
  }

  /**
   * Obtient le texte formaté du temps écoulé depuis la dernière actualisation
   */
  getTimeSinceLastRefresh(): string {
    if (!this.lastRefreshTime) {
      return 'Jamais';
    }
    
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - this.lastRefreshTime.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `il y a ${diffInSeconds}s`;
    } else {
      const minutes = Math.floor(diffInSeconds / 60);
      return `il y a ${minutes}min`;
    }
  }

  /**
   * Actualiser manuellement les données
   */
  refreshAttendance(): void {
    this.loadRattrapageAttendance();
  }

  // Affichage des heures de pointage avec offset Biostar appliqué
  public formatPunchForDisplay(raw: string): string {
    if (!raw) return 'N/A';
    // Si c'est déjà un format ISO, utiliser tel quel (offset déjà appliqué)
    if (raw.includes('T') && (raw.includes('Z') || raw.includes('+'))) {
      const dt = new Date(raw);
      return dt.toLocaleString('fr-FR');
    }
    // Sinon, parser et appliquer l'offset (données brutes de Biostar)
    const dt = this.parseStudentPunchTime(raw);
    return dt.toLocaleString('fr-FR');
  }
  
  
  calculateStatistics() {
    this.presents = this.students.filter(s => s.status === 'present').length;
    this.absents = this.students.filter(s => s.status === 'absent').length;
    this.lates = this.students.filter(s => s.status === 'late').length;
    this.excused = this.students.filter(s => s.status === 'excused').length;
  }
  
  groupStudentsAlphabetically() {
    this.groupedStudents = {};
    this.alphabetGroups = [];
    
    this.filteredStudents.forEach(student => {
      const firstLetter = student.last_name.charAt(0).toUpperCase();
      if (!this.groupedStudents[firstLetter]) {
        this.groupedStudents[firstLetter] = [];
        this.alphabetGroups.push(firstLetter);
      }
      this.groupedStudents[firstLetter].push(student);
    });
    
    this.alphabetGroups.sort();
  }
  
  applyFilters() {
    let filtered = [...this.students];
    
    // Filtre par recherche (avec support de plusieurs matricules)
    if (this.searchTerm.trim()) {
      const searchValue = this.searchTerm.trim();
      
      // Vérifier si c'est une recherche par plusieurs matricules (nombres séparés par des espaces)
      const matricules = searchValue.split(/\s+/);
      
      // Si tous les éléments sont des nombres (matricules), rechercher par matricules exacts
      const allMatricules = matricules.every(mat => {
        const trimmed = mat.trim();
        return trimmed !== '' && /^\d+$/.test(trimmed);
      });
      
      if (allMatricules && matricules.length > 1) {
        // Recherche par plusieurs matricules exacts
        const matriculesList = matricules.map(m => m.trim().toLowerCase());
        filtered = filtered.filter(student => 
          matriculesList.includes(student.matricule.toLowerCase())
        );
      } else {
        // Recherche normale (nom, prénom, email, matricule avec LIKE)
        const searchLower = searchValue.toLowerCase();
        filtered = filtered.filter(student => 
          student.first_name.toLowerCase().includes(searchLower) ||
          student.last_name.toLowerCase().includes(searchLower) ||
          student.email?.toLowerCase().includes(searchLower) ||
          student.matricule.toLowerCase().includes(searchLower)
        );
      }
    }
    
    // Filtre par statut
    if (this.statusFilter) {
      filtered = filtered.filter(student => student.status === this.statusFilter);
    }
    
    this.filteredStudents = filtered;
    this.groupStudentsAlphabetically();
    this.markForCheck();
  }
  
  onSearchChange() {
    this.applyFilters();
  }
  
  onStatusFilterChange() {
    this.applyFilters();
  }
  
  clearFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.applyFilters();
  }
  
  toggleAlphabeticalGrouping() {
    this.showAlphabeticalGrouping = !this.showAlphabeticalGrouping;
    this.markForCheck();
  }
  
  
  getStatusClass(status: string): string {
    switch (status) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'excused': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'present': return 'check_circle';
      case 'absent': return 'cancel';
      case 'late': return 'schedule';
      case 'excused': return 'event_available';
      default: return 'help';
    }
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'late': return 'En retard';
      case 'excused': return 'Excusé';
      default: return 'Inconnu';
    }
  }
  
  formatPunchTime(timeString: string): string {
    if (!timeString) return 'Non pointé';
    
    try {
      // Utiliser formatPunchForDisplay pour gérer l'offset Biostar
      return this.formatPunchForDisplay(timeString);
    } catch (error) {
      console.error('Erreur lors du formatage de l\'heure:', error);
      return 'Heure invalide';
    }
  }
  
  /**
   * Ouvrir l'écran de défilement public pour ce rattrapage
   */
  openRattrapageDisplay(): void {
    if (!this.rattrapageId) {
      return;
    }
    this.router.navigate(['/rattrapage-display', this.rattrapageId]);
  }
  
  goBack() {
    this.router.navigate(['/rattrapages']);
  }
  
  private markForCheck(): void {
    this.cdr.markForCheck();
  }

  /**
   * Exporter les données d'attendance en CSV
   */
  exportAttendanceCSV(): void {
    if (this.students.length === 0) {
      this.notificationService.error('Aucune donnée à exporter', 'Aucun étudiant trouvé pour l\'exportation');
      return;
    }

    this.isExporting = true;
    this.exportFormat = 'csv';

    try {
      // Préparer les données pour l'export
      const exportData = this.prepareExportData();
      
      // Créer le contenu CSV
      const csvContent = this.createCSVContent(exportData);
      
      // Télécharger le fichier
      this.downloadCSV(csvContent, this.generateFileName('csv'));
      
      this.notificationService.success('Export réussi', 'Les données ont été exportées en CSV avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export CSV:', error);
      this.notificationService.error('Erreur d\'export', 'Une erreur est survenue lors de l\'exportation CSV');
    } finally {
      this.isExporting = false;
      this.exportFormat = null;
      this.markForCheck();
    }
  }

  /**
   * Exporter les données d'attendance en Excel
   */
  exportAttendanceExcel(): void {
    if (this.students.length === 0) {
      this.notificationService.error('Aucune donnée à exporter', 'Aucun étudiant trouvé pour l\'exportation');
      return;
    }

    this.isExporting = true;
    this.exportFormat = 'excel';

    try {
      // Préparer les données pour l'export
      const exportData = this.prepareExportData();
      
      // Créer le fichier Excel
      this.createExcelFile(exportData);
      
      this.notificationService.success('Export réussi', 'Les données ont été exportées en Excel avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export Excel:', error);
      this.notificationService.error('Erreur d\'export', 'Une erreur est survenue lors de l\'exportation Excel');
    } finally {
      this.isExporting = false;
      this.exportFormat = null;
      this.markForCheck();
    }
  }

  /**
   * Préparer les données pour l'export
   */
  private prepareExportData(): any[] {
    return this.students.map(student => ({
      nom: student.last_name,
      prenom: student.first_name,
      matricule: student.matricule,
      email: student.email,
      statut: this.getStatusText(student.status),
      heure_pointage: student.punch_time ? this.formatDateTime(student.punch_time.time) : 'N/A',
      appareil: student.punch_time ? student.punch_time.device : 'N/A',
      promotion: student.promotion?.name || 'N/A',
      groupe: student.group?.title || 'N/A',
      option: student.option?.name || 'N/A',
      etablissement: student.etablissement?.name || 'N/A',
      ville: student.ville?.name || 'N/A'
    }));
  }

  /**
   * Créer le contenu CSV
   */
  private createCSVContent(data: any[]): string {
    if (data.length === 0) return '';

    // En-têtes
    const headers = [
      'Nom',
      'Prénom',
      'Matricule',
      'Email',
      'Statut',
      'Heure de pointage',
      'Appareil',
      'Promotion',
      'Groupe',
      'Option',
      'Établissement',
      'Ville'
    ];

    // Informations du rattrapage
    const rattrapageInfo = this.rattrapage ? [
      `Rattrapage: ${this.rattrapage.name}`,
      `Date: ${this.formatDate(this.rattrapage.date)}`,
      `Heure de pointage: ${this.rattrapage.pointage_start_hour}`,
      `Heure de début: ${this.rattrapage.start_hour}`,
      `Heure de fin: ${this.rattrapage.end_hour}`,
      `Total étudiants: ${this.totalStudents}`,
      `Présents: ${this.presents}`,
      `En retard: ${this.lates}`,
      `Absents: ${this.absents}`
    ] : [];

    // Créer le contenu CSV
    let csvContent = '';
    
    // Ajouter les informations du rattrapage
    if (rattrapageInfo.length > 0) {
      csvContent += 'INFORMATIONS DU RATTRAPAGE\n';
      rattrapageInfo.forEach(info => {
        csvContent += `"${info}"\n`;
      });
      csvContent += '\n';
    }

    // Ajouter les en-têtes
    csvContent += headers.join(',') + '\n';

    // Ajouter les données
    data.forEach(row => {
      const values = [
        `"${row.nom}"`,
        `"${row.prenom}"`,
        `"${row.matricule}"`,
        `"${row.email}"`,
        `"${row.statut}"`,
        `"${row.heure_pointage}"`,
        `"${row.appareil}"`,
        `"${row.promotion}"`,
        `"${row.groupe}"`,
        `"${row.option}"`,
        `"${row.etablissement}"`,
        `"${row.ville}"`
      ];
      csvContent += values.join(',') + '\n';
    });

    return csvContent;
  }

  /**
   * Télécharger le fichier CSV
   */
  private downloadCSV(csvContent: string, fileName: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  /**
   * Créer un fichier Excel avec les données d'attendance
   */
  private createExcelFile(data: any[]): void {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();
    
    // Ajouter la feuille d'informations du rattrapage
    this.addRattrapageInfoSheet(wb);
    
    // Ajouter la feuille principale avec les données des étudiants
    this.addStudentsDataSheet(wb, data);
    
    // Ajouter la feuille de statistiques
    this.addStatisticsSheet(wb);
    
    // Télécharger le fichier Excel
    XLSX.writeFile(wb, this.generateFileName('excel'));
  }

  /**
   * Ajoute une feuille d'informations du rattrapage
   */
  private addRattrapageInfoSheet(wb: XLSX.WorkBook): void {
    if (!this.rattrapage) return;

    const rattrapageInfo = [
      ['INFORMATIONS DU RATTRAPAGE'],
      [''],
      ['Nom du rattrapage', this.rattrapage.name],
      ['Date', this.formatDate(this.rattrapage.date)],
      ['Heure de pointage', this.rattrapage.pointage_start_hour],
      ['Heure de début', this.rattrapage.start_hour],
      ['Heure de fin', this.rattrapage.end_hour],
      [''],
      ['STATISTIQUES'],
      ['Total étudiants', this.totalStudents],
      ['Présents', this.presents],
      ['En retard', this.lates],
      ['Absents', this.absents]
    ];

    const ws = XLSX.utils.aoa_to_sheet(rattrapageInfo);
    
    // Styliser la feuille
    ws['!cols'] = [
      { wch: 25 }, // Colonne 1
      { wch: 20 }  // Colonne 2
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Informations');
  }

  /**
   * Ajoute la feuille principale avec les données des étudiants
   */
  private addStudentsDataSheet(wb: XLSX.WorkBook, data: any[]): void {
    const headers = [
      'Nom', 'Prénom', 'Matricule', 'Email', 'Statut', 
      'Heure de pointage', 'Appareil', 'Promotion', 'Groupe', 
      'Option', 'Établissement', 'Ville'
    ];

    const sheetData = [headers, ...data.map(row => [
      row.nom, row.prenom, row.matricule, row.email, row.statut,
      row.heure_pointage, row.appareil, row.promotion, row.groupe,
      row.option, row.etablissement, row.ville
    ])];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Styliser la feuille
    ws['!cols'] = [
      { wch: 15 }, // Nom
      { wch: 15 }, // Prénom
      { wch: 12 }, // Matricule
      { wch: 25 }, // Email
      { wch: 12 }, // Statut
      { wch: 20 }, // Heure de pointage
      { wch: 15 }, // Appareil
      { wch: 15 }, // Promotion
      { wch: 15 }, // Groupe
      { wch: 20 }, // Option
      { wch: 20 }, // Établissement
      { wch: 15 }  // Ville
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Liste des étudiants');
  }

  /**
   * Ajoute une feuille de statistiques
   */
  private addStatisticsSheet(wb: XLSX.WorkBook): void {
    const statsData = [
      ['STATISTIQUES DÉTAILLÉES'],
      [''],
      ['Par statut'],
      ['Présents', this.presents],
      ['En retard', this.lates],
      ['Absents', this.absents],
      [''],
      ['Pourcentages'],
      ['Présents', `${((this.presents / this.totalStudents) * 100).toFixed(1)}%`],
      ['En retard', `${((this.lates / this.totalStudents) * 100).toFixed(1)}%`],
      ['Absents', `${((this.absents / this.totalStudents) * 100).toFixed(1)}%`],
      [''],
      ['Détails du rattrapage'],
      ['Nom', this.rattrapage?.name || 'N/A'],
      ['Date', this.rattrapage ? this.formatDate(this.rattrapage.date) : 'N/A'],
      ['Heure début', this.rattrapage?.start_hour || 'N/A'],
      ['Heure fin', this.rattrapage?.end_hour || 'N/A']
    ];

    const ws = XLSX.utils.aoa_to_sheet(statsData);
    
    // Styliser la feuille
    ws['!cols'] = [
      { wch: 25 }, // Colonne 1
      { wch: 20 }  // Colonne 2
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Statistiques');
  }

  /**
   * Formater une date et heure
   */
  private formatDateTime(dateTimeString: string): string {
    const date = new Date(dateTimeString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Formater une date
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Générer le nom du fichier
   */
  private generateFileName(format: 'csv' | 'excel'): string {
    if (!this.rattrapage) return `rattrapage_attendance.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    const date = this.formatDate(this.rattrapage.date).replace(/\//g, '-');
    const time = this.rattrapage.start_hour.replace(/:/g, '-');
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    
    return `rattrapage_attendance_${date}_${time}.${extension}`;
  }
}
