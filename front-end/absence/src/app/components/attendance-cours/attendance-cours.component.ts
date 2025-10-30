import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';

import { CoursService, Cours } from '../../services/cours.service';
import { CoursAttendanceService, CoursAttendanceData } from '../../services/cours-attendance.service';
import { NotificationService } from '../../services/notification.service';
import { AttendanceStateService } from '../../services/attendance-state.service';
import { ConfigurationAutoService } from '../../services/configuration-auto.service';
import { BiostarAttendanceService } from '../../services/biostar-attendance.service';
import { AttendanceStateModalComponent } from '../attendance-state-modal/attendance-state-modal.component';


@Component({
  selector: 'app-attendance-cours',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, AttendanceStateModalComponent],
  templateUrl: './attendance-cours.component.html',
  styleUrl: './attendance-cours.component.css'
})
export class AttendanceCoursComponent implements OnInit, OnDestroy {
  // Données du cours
  coursData: CoursAttendanceData | null = null;
  students: any[] = [];
  filteredStudents: any[] = [];
  
  // Statistiques
  totalStudents = 0;
  presents = 0;
  absents = 0;
  lates = 0;
  excused = 0;
  
  // État de chargement
  loading = false;
  error = '';
  
  // Propriétés pour l'export
  isExporting = false;
  exportFormat: 'csv' | 'excel' | null = null;
  
  // ID du cours
  coursId: number | null = null;
  
  // Modal de détails
  selectedStudent: any = null;
  showDetailsModal = false;
  
  // Mode édition et modal de modification d'état
  editMode = false;
  attendanceStateModalOpen = false;
  selectedStudentForEdit: any = null;
  
  // Filtres de recherche
  searchFilters = {
    name: '',
    matricule: '',
    status: '',
    promotion: '',
    device: ''
  };
  
  // Filtrage alphabétique
  alphabetFilter = {
    enabled: false,
    startLetter: 'A',
    endLetter: 'Z'
  };
  
  // Lettres de l'alphabet pour la sélection
  alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  // Offset configurable appliqué aux heures de pointage Biostar (en minutes)
  biostarTimeOffsetMinutes: number = 60;
  
  // Options pour les filtres
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'present', label: 'Présent' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'En retard' },
    { value: 'excused', label: 'Excusé' }
  ];
  
  promotionOptions: { value: string, label: string }[] = [];
  deviceOptions: { value: string, label: string }[] = [];
  
  // Tri
  sortConfig = {
    column: '',
    direction: 'asc' as 'asc' | 'desc'
  };
  
  // Colonnes triables
  sortableColumns = [
    { key: 'name', label: 'Nom', type: 'string' },
    { key: 'matricule', label: 'Matricule', type: 'string' },
    { key: 'email', label: 'Email', type: 'string' },
    { key: 'status', label: 'Statut', type: 'string' },
    { key: 'punch_time', label: 'Heure de pointage', type: 'datetime' },
    { key: 'device', label: 'Appareil', type: 'string' },
    { key: 'promotion', label: 'Promotion', type: 'string' },
    { key: 'group', label: 'Groupe', type: 'string' }
  ];
  
  private destroy$ = new Subject<void>();

  constructor(
    private coursService: CoursService,
    private coursAttendanceService: CoursAttendanceService,
    private notificationService: NotificationService,
    private attendanceStateService: AttendanceStateService,
    private configurationAutoService: ConfigurationAutoService,
    private biostarAttendanceService: BiostarAttendanceService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du cours depuis les paramètres de route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.coursId = +params['id'];
      if (this.coursId && !isNaN(this.coursId) && this.coursId > 0) {
        // Auto-sélectionner la configuration pour ce cours
        this.autoSelectConfigurationForCours();
        
        // Charger les données d'attendance
        this.loadAttendanceData();
      } else {
        this.error = 'ID du cours invalide ou manquant';
        this.notificationService.error('Erreur', 'ID du cours invalide ou manquant');
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Auto-sélectionner la configuration pour le cours actuel
   */
  autoSelectConfigurationForCours(): void {
    if (!this.coursId) return;

    console.log('🔄 Auto-sélection de la configuration pour le cours ID:', this.coursId);
    
    this.configurationAutoService.autoSelectConfigurationForCours(this.coursId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Configuration auto-sélectionnée avec succès:', response);
          this.notificationService.success(
            'Configuration chargée', 
            `Configuration Biostar chargée pour la ville: ${response.data.ville?.name || 'Inconnue'}`
          );
          
          // Récupérer les données de pointage depuis Biostar
          this.loadBiostarAttendanceData();
        },
        error: (error) => {
          console.warn('⚠️ Aucune configuration trouvée pour ce cours:', error);
          this.notificationService.warning(
            'Configuration manquante', 
            'Aucune configuration Biostar trouvée pour la ville de ce cours. Les données de pointage ne seront pas disponibles.'
          );
        }
      });
  }

  /**
   * Charger les données de pointage depuis Biostar
   */
  loadBiostarAttendanceData(): void {
    if (!this.coursId || !this.coursData?.cours) return;

    console.log('🔄 Chargement des données de pointage depuis Biostar pour le cours:', this.coursId);
    
    const request = {
      cours_id: this.coursId,
      date: this.coursData.cours.date,
      start_time: this.coursData.cours.pointage_start_hour,
      end_time: this.coursData.cours.heure_fin
    };

    this.biostarAttendanceService.syncCoursAttendanceWithBiostar(
      this.coursId,
      this.coursData.cours.date,
      this.coursData.cours.pointage_start_hour,
      this.coursData.cours.heure_fin
    ).pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('✅ Données de pointage Biostar récupérées:', response);
        
        if (response.success && response.data) {
          // Intégrer les données de pointage avec les étudiants
          this.integrateBiostarDataWithStudents(response.data);
          
          this.notificationService.success(
            'Données de pointage chargées', 
            `${response.data.total_punches} pointage(s) récupéré(s) depuis Biostar`
          );
        }
      },
      error: (error) => {
        console.warn('⚠️ Erreur lors de la récupération des données Biostar:', error);
        this.notificationService.warning(
          'Données de pointage indisponibles', 
          'Impossible de récupérer les données de pointage depuis Biostar. Vérifiez la configuration.'
        );
      }
    });
  }

  /**
   * Intégrer les données de pointage Biostar avec les étudiants
   */
  integrateBiostarDataWithStudents(biostarData: any): void {
    if (!biostarData.punches || !this.students) return;

    console.log('🔄 Intégration des données Biostar avec les étudiants');

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
    this.students.forEach(student => {
      const key = normalize(student.matricule);
      const studentPunches = punchMap.get(key);
      if (studentPunches && studentPunches.length > 0) {
        // Trier par date et prendre le plus tôt
        studentPunches.sort((a: any, b: any) => {
          const at = new Date(a.bsevtdt || a.punch_time).getTime();
          const bt = new Date(b.bsevtdt || b.punch_time).getTime();
          return at - bt;
        });
        const firstPunch = studentPunches[0];

        const rawTime: string = firstPunch.punch_time || firstPunch.bsevtdt;
        const punchTimeDate = this.parseStudentPunchTime(rawTime);

        student.punch_time = {
          time: punchTimeDate.toISOString(),
          device: firstPunch.device || firstPunch.device_name || 'Inconnu'
        };
        
        // Recalculer le statut avec la date ajustée
        student.status = this.calculateStudentStatus(punchTimeDate);
      }
    });

    // Recalculer les statistiques
    this.updateStatistics({
      total_students: this.students.length,
      presents: this.students.filter(s => s.status === 'présent').length,
      absents: this.students.filter(s => s.status === 'absent').length,
      lates: this.students.filter(s => s.status === 'en retard').length,
      excused: this.students.filter(s => s.status === 'excusé').length
    });

    // Mettre à jour les étudiants filtrés
    this.filteredStudents = [...this.students];
    
    console.log('✅ Données Biostar intégrées avec succès');
  }

  /**
   * Charger les données d'attendance du cours
   */
  loadAttendanceData(): void {
    if (!this.coursId) return;

    console.log('Chargement des données d\'attendance pour le cours ID:', this.coursId);
    this.loading = true;
    this.error = '';

    this.coursAttendanceService.getCoursAttendance(this.coursId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('📥 Données reçues de l\'API:', data);
          console.log('📊 Statistiques reçues:', data.statistics);
          console.log('👥 Nombre d\'étudiants:', data.students?.length || 0);
          
          // Appliquer le calcul automatique du statut temporel
          if (data.cours) {
            data.cours.statut_temporel = this.coursService.calculateStatutTemporel(data.cours);
          }
          this.coursData = data;
          this.students = data.students || [];
          
          // Appliquer la logique de calcul automatique des statuts côté frontend
          this.applyToleranceLogic();
          
          this.filteredStudents = [...this.students];
          // Ne pas appeler updateStatistics ici car applyToleranceLogic() recalcule déjà les stats
          this.updatePromotionOptions();
          this.loading = false;
          
          // Debug temporaire pour la tolérance
          if (data.cours?.tolerance) {
            console.log('Tolérance reçue de l\'API:', data.cours.tolerance);
            console.log('Type de tolérance:', typeof data.cours.tolerance);
            console.log('Tolérance formatée:', this.formatTolerance());
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données:', error);
          
          if (error.status === 401) {
            this.error = 'Authentification requise. Veuillez vous reconnecter.';
            this.notificationService.error('Authentification', this.error);
          } else {
            this.error = 'Erreur lors du chargement des données d\'attendance';
            this.notificationService.error('Erreur', this.error);
          }
          
          this.loading = false;
          
          // Fallback vers la simulation si l'API n'est pas disponible
          this.simulateAttendanceData();
        }
      });
  }

  /**
   * Simuler les données d'attendance (à remplacer par un vrai appel API)
   */
  private simulateAttendanceData(): void {
    setTimeout(() => {
      // Simulation de données avec le format de l'API
      this.coursData = {
        cours: {
          id: this.coursId!,
          name: 'Mathématiques - Analyse 1',
          date: '2024-01-15T00:00:00.000000Z',
          pointage_start_hour: '2024-01-15T08:00:00.000000Z',
          heure_debut: '2024-01-15T08:30:00.000000Z',
          heure_fin: '2024-01-15T10:30:00.000000Z',
          tolerance: '2024-01-15T00:15:00.000000Z',
          annee_universitaire: '2023-2024',
          etablissement_id: 1,
          promotion_id: 1,
          type_cours_id: 1,
          salle_id: 1,
          option_id: 1,
          statut_temporel: 'futur' as 'passé' | 'en_cours' | 'futur',
          created_at: '2024-01-01T00:00:00.000000Z',
          updated_at: '2024-01-01T00:00:00.000000Z',
          etablissement: { id: 1, name: 'Université UM6P' },
          promotion: { id: 1, name: 'L1 Informatique' },
          type_cours: { id: 1, name: 'Cours Magistral' },
          salle: { id: 1, name: 'Salle A101' },
          option: { id: 1, name: 'Informatique' }
        },
        students: [
          {
            id: 1,
            first_name: 'Ahmed',
            last_name: 'Benali',
            matricule: 'MAT001',
            email: 'ahmed.benali@um6p.ma',
            photo: undefined,
            status: 'present',
            punch_time: {
              time: '2024-01-15T08:25:00Z',
              device: 'Mobile App'
            },
            promotion: { id: 1, name: 'L1 Informatique' },
            group: { id: 1, title: 'Groupe A' }
          },
          {
            id: 2,
            first_name: 'Fatima',
            last_name: 'Alami',
            matricule: 'MAT002',
            email: 'fatima.alami@um6p.ma',
            photo: undefined,
            status: 'late',
            punch_time: {
              time: '2024-01-15T08:50:00Z',
              device: 'Web Portal'
            },
            promotion: { id: 1, name: 'L1 Informatique' },
            group: { id: 1, title: 'Groupe A' }
          },
          {
            id: 3,
            first_name: 'Omar',
            last_name: 'Hassani',
            matricule: 'MAT003',
            email: 'omar.hassani@um6p.ma',
            photo: undefined,
            status: 'absent',
            punch_time: undefined,
            promotion: { id: 1, name: 'L1 Informatique' },
            group: { id: 1, title: 'Groupe B' }
          }
        ],
        statistics: {
          total_students: 3,
          presents: 1,
          absents: 1,
          lates: 1,
          excused: 0
        }
      };

      this.students = this.coursData.students;
      
      // Appliquer la logique de tolérance même pour les données simulées
      this.applyToleranceLogic();
      
      this.filteredStudents = [...this.students];
      this.updatePromotionOptions();
      this.loading = false;
    }, 1000);
  }

  /**
   * Mettre à jour les statistiques
   */
  private updateStatistics(stats: any): void {
    this.totalStudents = stats.total_students;
    this.presents = stats.presents;
    this.absents = stats.absents;
    this.lates = stats.lates;
    this.excused = stats.excused;
  }

  /**
   * Applique la logique de tolérance aux étudiants
   */
  private applyToleranceLogic(): void {
    if (!this.coursData?.cours) {
      console.log('❌ Pas de données de cours pour appliquer la logique de tolérance');
      return;
    }

    console.log('🔄 Application de la logique de tolérance pour', this.students.length, 'étudiants');

    let presentCount = 0;
    let lateCount = 0;
    let absentCount = 0;
    let studentsWithPunchTime = 0;

    this.students.forEach((student, index) => {
      // Vérifier si l'étudiant a un statut manuellement défini
      if (student.manual_override) {
        console.log(`👤 ${student.first_name} ${student.last_name}: Statut manuel préservé (${student.status})`);
        
        // Compter selon le statut manuel
        if (student.status === 'present') presentCount++;
        else if (student.status === 'late') lateCount++;
        else if (student.status === 'absent') absentCount++;
        else if (student.status === 'excused') absentCount++; // Les excusés sont comptés comme absents pour les stats
        
        return; // Ne pas recalculer le statut
      }
      
      if (student.punch_time && student.punch_time.time) {
        studentsWithPunchTime++;
        const punchTime = this.parseStudentPunchTime(student.punch_time.time);
        
        if (isNaN(punchTime.getTime())) {
          console.log(`❌ Étudiant ${index + 1}: Date invalide - ${student.punch_time.time}`);
          student.status = 'absent';
          absentCount++;
        } else {
          const oldStatus = student.status;
          const newStatus = this.calculateStudentStatus(punchTime);
          
          console.log(`👤 ${student.first_name} ${student.last_name}: ${oldStatus} → ${newStatus}`);
          console.log(`   📅 Pointage: ${student.punch_time.time} → ${punchTime.toLocaleString()}`);
          
          student.status = newStatus;
          
          if (newStatus === 'present') presentCount++;
          else if (newStatus === 'late') lateCount++;
          else absentCount++;
        }
      } else {
        student.status = 'absent';
        absentCount++;
      }
    });

    // Recalculer les statistiques
    this.presents = this.students.filter(s => s.status === 'present').length;
    this.absents = this.students.filter(s => s.status === 'absent').length;
    this.lates = this.students.filter(s => s.status === 'late').length;
    this.excused = this.students.filter(s => s.status === 'excused').length;
    this.totalStudents = this.students.length;
    
    console.log(`\n📊 RÉSULTAT FINAL:`);
    console.log(`   Étudiants avec pointage: ${studentsWithPunchTime}/${this.students.length}`);
    console.log(`   Présents: ${this.presents}`);
    console.log(`   En retard: ${this.lates}`);
    console.log(`   Absents: ${this.absents}`);
    console.log(`   Total étudiants: ${this.totalStudents}`);
    
    // Vérifier que les statistiques sont cohérentes
    const actualPresents = this.students.filter(s => s.status === 'present').length;
    const actualLates = this.students.filter(s => s.status === 'late').length;
    const actualAbsents = this.students.filter(s => s.status === 'absent').length;
    const actualExcused = this.students.filter(s => s.status === 'excused').length;
    
    console.log(`\n🔍 VÉRIFICATION DES STATISTIQUES:`);
    console.log(`   Présents calculés: ${actualPresents} (attendu: ${this.presents})`);
    console.log(`   En retard calculés: ${actualLates} (attendu: ${this.lates})`);
    console.log(`   Absents calculés: ${actualAbsents} (attendu: ${this.absents})`);
    console.log(`   Excusés calculés: ${actualExcused} (attendu: ${this.excused})`);
    
    // Mettre à jour les étudiants filtrés
    this.filteredStudents = [...this.students];
  }

  /**
   * Parse l'heure de pointage d'un étudiant (gère le format français DD/MM/YYYY HH:MM:SS)
   */
  private parseStudentPunchTime(punchTimeString: string): Date {
    console.log('🎯 Parsing student punch time:', punchTimeString);
    
    // Si c'est un timestamp ISO complet
    if (punchTimeString.includes('T') && (punchTimeString.includes('Z') || punchTimeString.includes('+'))) {
      const date = new Date(punchTimeString);
      console.log('📅 Parsed ISO punch time:', date.toLocaleString());
      return this.applyBiostarOffset(date);
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
   * RÈGLE IMPORTANTE: Si un étudiant a pointé (face ID), il ne peut PAS être "absent"
   * Il sera soit "present" soit "late" selon l'heure
   */
  private calculateStudentStatus(punchTime: Date): string {
    if (!this.coursData?.cours) {
      console.log('❌ Pas de données de cours pour calculer le statut');
      return 'absent';
    }

    const cours = this.coursData.cours;
    
    // Vérifier si la date de pointage est valide
    if (isNaN(punchTime.getTime())) {
      console.log('❌ Date de pointage invalide:', punchTime);
      return 'absent';
    }

    console.log('🔍 DÉTAILS DU CALCUL:');
    console.log('   📅 Date du cours:', cours.date);
    console.log('   ⏰ Heure de début:', cours.heure_debut);
    console.log('   🎯 Heure de pointage:', cours.pointage_start_hour);
    console.log('   ⏱️ Tolérance:', cours.tolerance);
    console.log('   📍 Pointage étudiant:', punchTime.toLocaleString());

    // Créer les dates de référence - utiliser la même date que le cours
    const coursDate = new Date(cours.date);
    console.log('   📆 Date cours parsée:', coursDate.toLocaleString());
    
    // Parser les heures simplement
    const heureDebut = this.parseTimeStringSimple(cours.heure_debut);
    const heurePointage = cours.pointage_start_hour ? this.parseTimeStringSimple(cours.pointage_start_hour) : null;
    const toleranceMinutes = this.parseToleranceToMinutes(cours.tolerance);

    console.log('   🕐 Heure début parsée:', heureDebut.toLocaleString());
    console.log('   🎯 Heure pointage parsée:', heurePointage?.toLocaleString() || 'N/A');
    console.log('   ⏱️ Tolérance en minutes:', toleranceMinutes);

    // Créer les dates complètes
    const coursStartDateTime = new Date(coursDate);
    coursStartDateTime.setHours(heureDebut.getHours(), heureDebut.getMinutes(), heureDebut.getSeconds(), 0);

    const coursPunchStartDateTime = heurePointage ? new Date(coursDate) : null;
    if (coursPunchStartDateTime && heurePointage) {
      coursPunchStartDateTime.setHours(heurePointage.getHours(), heurePointage.getMinutes(), heurePointage.getSeconds(), 0);
    }

    const toleranceDateTime = new Date(coursStartDateTime);
    toleranceDateTime.setMinutes(toleranceDateTime.getMinutes() + toleranceMinutes);

    console.log('🕐 CALCUL FINAL:');
    console.log('   📍 Pointage étudiant:', punchTime.toLocaleString());
    console.log('   🎯 Début pointage:', coursPunchStartDateTime?.toLocaleString() || 'N/A');
    console.log('   ⏰ Début cours:', coursStartDateTime.toLocaleString());
    console.log('   ⏱️ Limite tolérance:', toleranceDateTime.toLocaleString());

    // LOGIQUE CORRIGÉE: Si l'étudiant a pointé, il ne peut pas être "absent"
    // Il est soit "present" (avant le début du cours) soit "late" (après le début du cours)
    
    if (coursPunchStartDateTime && punchTime >= coursPunchStartDateTime && punchTime < coursStartDateTime) {
      // Pointage entre l'heure de début de pointage et l'heure de début du cours
      console.log('✅ Présent (pointage avant début du cours)');
      return 'present';
    } else if (punchTime >= coursStartDateTime) {
      // Pointage après le début du cours = toujours en retard (peu importe la tolérance)
      // La tolérance peut être utilisée pour des rapports, mais le statut reste "late"
      if (punchTime <= toleranceDateTime) {
        console.log('⏰ En retard (dans la période de tolérance)');
      } else {
        console.log('⏰ En retard (au-delà de la tolérance)');
      }
      return 'late';
    } else {
      // Pointage avant l'heure de début de pointage = considéré comme présent
      console.log('✅ Présent (pointage anticipé)');
      return 'present';
    }
  }

  /**
   * Parse une chaîne de temps de manière simple (comme les examens)
   */
  private parseTimeStringSimple(timeString: string): Date {
    // Si c'est un timestamp ISO, l'utiliser directement
    if (timeString.includes('T') && timeString.includes('Z')) {
      return new Date(timeString);
    }
    
    // Si c'est juste HH:MM ou HH:MM:SS
    const parts = timeString.split(':');
    const hours = parseInt(parts[0]) || 0;
    const minutes = parseInt(parts[1]) || 0;
    const seconds = parseInt(parts[2]) || 0;
    
    const date = new Date();
    date.setHours(hours, minutes, seconds, 0);
    return date;
  }

  /**
   * Parse la tolérance en minutes
   */
  private parseToleranceToMinutes(tolerance: string): number {
    try {
      const toleranceStr = tolerance.toString().trim();
      
      // Si c'est un timestamp ISO (contient 'T' et 'Z')
      if (toleranceStr.includes('T') && toleranceStr.includes('Z')) {
        const toleranceDate = new Date(toleranceStr);
        const hours = toleranceDate.getUTCHours();
        const minutes = toleranceDate.getUTCMinutes();
        return hours * 60 + minutes;
      }
      
      // Si c'est juste un nombre, le retourner tel quel
      if (/^\d+$/.test(toleranceStr)) {
        return parseInt(toleranceStr);
      }
      
      // Si c'est au format HH:MM ou HH:MM:SS
      if (toleranceStr.includes(':')) {
        const parts = toleranceStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        return hours * 60 + minutes;
      }
      
      // Si c'est au format "XX minutes" ou "XXmin"
      const match = toleranceStr.match(/(\d+)\s*(?:minutes?|min)/i);
      if (match) {
        return parseInt(match[1]);
      }
      
      // Par défaut, essayer de parser comme nombre
      const parsed = parseInt(toleranceStr);
      return isNaN(parsed) ? 15 : parsed;
    } catch (error) {
      console.error('Erreur lors du parsing de la tolérance:', error);
      return 15; // Tolérance par défaut
    }
  }

  /**
   * Exporter les données d'attendance en CSV
   */
  exportAttendanceCSV(): void {
    if (this.filteredStudents.length === 0) {
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
    }
  }

  /**
   * Exporter les données d'attendance en Excel
   */
  exportAttendanceExcel(): void {
    if (this.filteredStudents.length === 0) {
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
    }
  }

  /**
   * Préparer les données pour l'export
   */
  private prepareExportData(): any[] {
    return this.filteredStudents.map(student => ({
      nom: student.last_name,
      prenom: student.first_name,
      matricule: student.matricule,
      email: student.email,
      statut: this.getStatusLabel(student.status),
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

    // Informations du cours
    const coursInfo = this.coursData ? [
      `Cours: ${this.coursData.cours.name}`,
      `Date: ${this.formatDate(this.coursData.cours.date)}`,
      `Heure de pointage: ${this.coursData.cours.pointage_start_hour}`,
      `Heure de début: ${this.coursData.cours.heure_debut}`,
      `Heure de fin: ${this.coursData.cours.heure_fin}`,
      `Tolérance: ${this.coursData.cours.tolerance || 5} minutes`,
      `Total étudiants: ${this.totalStudents}`,
      `Présents: ${this.presents}`,
      `En retard: ${this.lates}`,
      `Absents: ${this.absents}`,
      `Excusés: ${this.excused}`
    ] : [];

    // Créer le contenu CSV
    let csvContent = '';
    
    // Ajouter les informations du cours
    if (coursInfo.length > 0) {
      csvContent += 'INFORMATIONS DU COURS\n';
      coursInfo.forEach(info => {
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
    
    // Ajouter la feuille d'informations du cours
    this.addCoursInfoSheet(wb);
    
    // Ajouter la feuille principale avec les données des étudiants
    this.addStudentsDataSheet(wb, data);
    
    // Ajouter la feuille de statistiques
    this.addStatisticsSheet(wb);
    
    // Télécharger le fichier Excel
    XLSX.writeFile(wb, this.generateFileName('excel'));
  }

  /**
   * Ajoute une feuille d'informations du cours
   */
  private addCoursInfoSheet(wb: XLSX.WorkBook): void {
    if (!this.coursData) return;

    const coursInfo = [
      ['INFORMATIONS DU COURS'],
      [''],
      ['Nom du cours', this.coursData.cours.name],
      ['Date', this.formatDate(this.coursData.cours.date)],
      ['Heure de pointage', this.coursData.cours.pointage_start_hour],
      ['Heure de début', this.coursData.cours.heure_debut],
      ['Heure de fin', this.coursData.cours.heure_fin],
      ['Tolérance', `${this.coursData.cours.tolerance || 5} minutes`],
      ['Type de cours', this.coursData.cours.type_cours?.name || 'N/A'],
      ['Promotion', this.coursData.cours.promotion?.name || 'N/A'],
      ['Salle', this.coursData.cours.salle?.name || 'N/A'],
      [''],
      ['STATISTIQUES'],
      ['Total étudiants', this.totalStudents],
      ['Présents', this.presents],
      ['En retard', this.lates],
      ['Absents', this.absents],
      ['Excusés', this.excused]
    ];

    const ws = XLSX.utils.aoa_to_sheet(coursInfo);
    
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
      ['Excusés', this.excused],
      [''],
      ['Pourcentages'],
      ['Présents', `${((this.presents / this.totalStudents) * 100).toFixed(1)}%`],
      ['En retard', `${((this.lates / this.totalStudents) * 100).toFixed(1)}%`],
      ['Absents', `${((this.absents / this.totalStudents) * 100).toFixed(1)}%`],
      ['Excusés', `${((this.excused / this.totalStudents) * 100).toFixed(1)}%`],
      [''],
      ['Détails du cours'],
      ['Nom', this.coursData?.cours.name || 'N/A'],
      ['Date', this.coursData ? this.formatDate(this.coursData.cours.date) : 'N/A'],
      ['Heure début', this.coursData?.cours.heure_debut || 'N/A'],
      ['Heure fin', this.coursData?.cours.heure_fin || 'N/A'],
      ['Tolérance', this.coursData ? `${this.coursData.cours.tolerance || 5} minutes` : 'N/A']
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
    // Utiliser l'heure UTC pour éviter le décalage dû au fuseau horaire local
    const yyyy = date.getUTCFullYear();
    const mm = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const dd = date.getUTCDate().toString().padStart(2, '0');
    const HH = date.getUTCHours().toString().padStart(2, '0');
    const MM = date.getUTCMinutes().toString().padStart(2, '0');
    const SS = date.getUTCSeconds().toString().padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${HH}:${MM}:${SS}`;
  }

  // Affichage des heures de pointage avec offset Biostar appliqué
  public formatPunchForDisplay(raw: string): string {
    if (!raw) return 'N/A';
    const dt = this.parseStudentPunchTime(raw);
    return dt.toLocaleString('fr-FR');
  }

  /**
   * Générer le nom du fichier
   */
  private generateFileName(format: 'csv' | 'excel'): string {
    if (!this.coursData) return `cours_attendance.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    const date = this.formatDate(this.coursData.cours.date);
    const time = this.formatTimeForFileName(this.coursData.cours.heure_debut);
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    
    return `cours_attendance_${date}_${time}.${extension}`;
  }

  /**
   * Formater une date
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR').replace(/\//g, '-');
    } catch (error) {
      console.error('Erreur lors du formatage de la date:', error);
      return 'N/A';
    }
  }

  /**
   * Formater une heure pour les noms de fichiers
   */
  private formatTimeForFileName(timeString: string): string {
    return timeString.replace(/:/g, '-');
  }

  /**
   * Actualiser les données
   */
  refreshData(): void {
    console.log('🔄 Actualisation des données...');
    this.loadAttendanceData();
  }


  /**
   * Obtenir le statut traduit
   */
  getStatusLabel(status: string): string {
    const statusLabels: { [key: string]: string } = {
      'present': 'Présent',
      'absent': 'Absent',
      'late': 'En retard',
      'excused': 'Excusé'
    };
    return statusLabels[status] || status;
  }

  /**
   * Obtenir la classe CSS pour le statut
   */
  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'present': 'text-green-600 bg-green-100',
      'absent': 'text-red-600 bg-red-100',
      'late': 'text-yellow-600 bg-yellow-100',
      'excused': 'text-blue-600 bg-blue-100'
    };
    return statusClasses[status] || 'text-gray-600 bg-gray-100';
  }

  /**
   * Formater une heure au format HH:MM
   */
  public formatTime(timeString: string): string {
    if (!timeString) return 'N/A';
    
    try {
      // Si c'est déjà au format HH:MM, le retourner tel quel
      if (timeString.match(/^\d{2}:\d{2}$/)) {
        return timeString;
      }
      
      // Si c'est une date ISO (timestamp), extraire l'heure en UTC
      if (timeString.includes('T') && timeString.includes('Z')) {
        const date = new Date(timeString);
        const hours = date.getUTCHours().toString().padStart(2, '0');
        const minutes = date.getUTCMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
      }
      
      // Si c'est au format HH:MM:SS, enlever les secondes
      if (timeString.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return timeString.substring(0, 5);
      }
      
      return timeString;
    } catch (error) {
      console.error('Erreur lors du formatage de l\'heure:', error);
      return 'N/A';
    }
  }

  /**
   * Calculer l'heure de fin de pointage (heure de début + tolérance)
   */
  public calculatePointageEndTime(): string {
    if (!this.coursData?.cours.heure_debut || !this.coursData?.cours.tolerance) {
      return 'N/A';
    }

    try {
      let startHours: number, startMinutes: number;
      let toleranceMinutes: number;

      // Gérer l'heure de début (peut être un timestamp ou HH:MM)
      if (this.coursData.cours.heure_debut.includes('T') && this.coursData.cours.heure_debut.includes('Z')) {
        const startDate = new Date(this.coursData.cours.heure_debut);
        startHours = startDate.getUTCHours();
        startMinutes = startDate.getUTCMinutes();
      } else {
        const [h, m] = this.coursData.cours.heure_debut.split(':').map(Number);
        startHours = h;
        startMinutes = m;
      }

      // Gérer la tolérance (peut être un timestamp ou HH:MM)
      if (this.coursData.cours.tolerance.includes('T') && this.coursData.cours.tolerance.includes('Z')) {
        const toleranceDate = new Date(this.coursData.cours.tolerance);
        const toleranceHours = toleranceDate.getUTCHours();
        const toleranceMins = toleranceDate.getUTCMinutes();
        toleranceMinutes = toleranceHours * 60 + toleranceMins;
      } else {
        const [toleranceH, toleranceM] = this.coursData.cours.tolerance.split(':').map(Number);
        toleranceMinutes = toleranceH * 60 + toleranceM;
      }
      
      // Ajouter la tolérance à l'heure de début
      const totalMinutes = startHours * 60 + startMinutes + toleranceMinutes;
      
      // Calculer les nouvelles heures et minutes
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      // Formater l'heure
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Erreur lors du calcul de l\'heure de fin de pointage:', error);
      return 'N/A';
    }
  }

  /**
   * Calculer la durée de la période de pointage
   */
  public calculatePointageDuration(): string {
    if (!this.coursData?.cours.pointage_start_hour || !this.coursData?.cours.tolerance) {
      return 'N/A';
    }

    try {
      let toleranceMinutes: number;

      // Gérer la tolérance (peut être un timestamp ou HH:MM)
      if (this.coursData.cours.tolerance.includes('T') && this.coursData.cours.tolerance.includes('Z')) {
        const toleranceDate = new Date(this.coursData.cours.tolerance);
        const toleranceHours = toleranceDate.getUTCHours();
        const toleranceMins = toleranceDate.getUTCMinutes();
        toleranceMinutes = toleranceHours * 60 + toleranceMins;
      } else {
        const [toleranceH, toleranceM] = this.coursData.cours.tolerance.split(':').map(Number);
        toleranceMinutes = toleranceH * 60 + toleranceM;
      }
      
      const hours = Math.floor(toleranceMinutes / 60);
      const minutes = toleranceMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      } else {
        return `${minutes}min`;
      }
    } catch (error) {
      console.error('Erreur lors du calcul de la durée de pointage:', error);
      return 'N/A';
    }
  }

  /**
   * Calculer la durée du cours
   */
  public calculateCoursDuration(): string {
    if (!this.coursData?.cours.heure_debut || !this.coursData?.cours.heure_fin) {
      return 'N/A';
    }

    try {
      let startHours: number, startMinutes: number;
      let endHours: number, endMinutes: number;

      // Gérer l'heure de début (peut être un timestamp ou HH:MM)
      if (this.coursData.cours.heure_debut.includes('T') && this.coursData.cours.heure_debut.includes('Z')) {
        const startDate = new Date(this.coursData.cours.heure_debut);
        startHours = startDate.getUTCHours();
        startMinutes = startDate.getUTCMinutes();
      } else {
        const [h, m] = this.coursData.cours.heure_debut.split(':').map(Number);
        startHours = h;
        startMinutes = m;
      }

      // Gérer l'heure de fin (peut être un timestamp ou HH:MM)
      if (this.coursData.cours.heure_fin.includes('T') && this.coursData.cours.heure_fin.includes('Z')) {
        const endDate = new Date(this.coursData.cours.heure_fin);
        endHours = endDate.getUTCHours();
        endMinutes = endDate.getUTCMinutes();
      } else {
        const [h, m] = this.coursData.cours.heure_fin.split(':').map(Number);
        endHours = h;
        endMinutes = m;
      }
      
      const startTotalMinutes = startHours * 60 + startMinutes;
      const endTotalMinutes = endHours * 60 + endMinutes;
      
      const durationMinutes = endTotalMinutes - startTotalMinutes;
      
      if (durationMinutes < 0) {
        return 'N/A';
      }
      
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      
      if (hours > 0) {
        return `${hours}h ${minutes}min`;
      } else {
        return `${minutes}min`;
      }
    } catch (error) {
      console.error('Erreur lors du calcul de la durée du cours:', error);
      return 'N/A';
    }
  }

  /**
   * Formater la tolérance en minutes
   */
  public formatTolerance(): string {
    if (!this.coursData?.cours.tolerance) {
      return '15';
    }

    try {
      const toleranceStr = this.coursData.cours.tolerance.toString().trim();
      
      // Si c'est un timestamp ISO (contient 'T' et 'Z')
      if (toleranceStr.includes('T') && toleranceStr.includes('Z')) {
        const toleranceDate = new Date(toleranceStr);
        const hours = toleranceDate.getUTCHours();
        const minutes = toleranceDate.getUTCMinutes();
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes.toString();
      }
      
      // Si c'est juste un nombre, le retourner tel quel
      if (/^\d+$/.test(toleranceStr)) {
        return toleranceStr;
      }
      
      // Si c'est au format HH:MM ou HH:MM:SS
      if (toleranceStr.includes(':')) {
        const parts = toleranceStr.split(':');
        const hours = parseInt(parts[0]) || 0;
        const minutes = parseInt(parts[1]) || 0;
        const totalMinutes = hours * 60 + minutes;
        return totalMinutes.toString();
      }
      
      // Si c'est au format "XX minutes" ou "XXmin"
      const match = toleranceStr.match(/(\d+)\s*(?:minutes?|min)/i);
      if (match) {
        return match[1];
      }
      
      // Par défaut, essayer de parser comme nombre
      const parsed = parseInt(toleranceStr);
      return isNaN(parsed) ? '15' : parsed.toString();
    } catch (error) {
      console.error('Erreur lors du formatage de la tolérance:', error);
      return '15';
    }
  }

  /**
   * Formater la tolérance avec le texte "minutes"
   */
  public formatToleranceWithUnit(): string {
    const minutes = this.formatTolerance();
    return `${minutes} minute${parseInt(minutes) > 1 ? 's' : ''}`;
  }

  /**
   * Mettre à jour les options de promotion et device pour les filtres
   */
  private updatePromotionOptions(): void {
    const promotions = new Set<string>();
    const devices = new Set<string>();
    
    this.students.forEach(student => {
      if (student.promotion?.name) {
        promotions.add(student.promotion.name);
      }
      if (student.punch_time?.device) {
        devices.add(student.punch_time.device);
      }
    });
    
    this.promotionOptions = [
      { value: '', label: 'Toutes les promotions' },
      ...Array.from(promotions).map(promo => ({ value: promo, label: promo }))
    ];
    
    this.deviceOptions = [
      { value: '', label: 'Tous les appareils' },
      ...Array.from(devices).map(device => ({ value: device, label: device }))
    ];
  }

  /**
   * Appliquer les filtres de recherche
   */
  applyFilters(): void {
    this.filteredStudents = this.students.filter(student => {
      const nameMatch = !this.searchFilters.name || 
        `${student.last_name} ${student.first_name}`.toLowerCase().includes(this.searchFilters.name.toLowerCase());
      
      const matriculeMatch = !this.searchFilters.matricule || 
        student.matricule?.toLowerCase().includes(this.searchFilters.matricule.toLowerCase());
      
      const statusMatch = !this.searchFilters.status || 
        student.status === this.searchFilters.status;
      
      const promotionMatch = !this.searchFilters.promotion || 
        student.promotion?.name === this.searchFilters.promotion;
      
      const deviceMatch = !this.searchFilters.device || 
        student.punch_time?.device === this.searchFilters.device;
      
      // Filtrage alphabétique
      const alphabetMatch = !this.alphabetFilter.enabled || this.matchesAlphabetFilter(student);
      
      return nameMatch && matriculeMatch && statusMatch && promotionMatch && deviceMatch && alphabetMatch;
    });
    
    // Appliquer le tri après le filtrage
    this.applySorting();
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.searchFilters = {
      name: '',
      matricule: '',
      status: '',
      promotion: '',
      device: ''
    };
    this.alphabetFilter = {
      enabled: false,
      startLetter: 'A',
      endLetter: 'Z'
    };
    this.sortConfig = {
      column: '',
      direction: 'asc'
    };
    this.filteredStudents = [...this.students];
  }

  /**
   * Obtenir le nombre d'étudiants filtrés
   */
  getFilteredCount(): number {
    return this.filteredStudents.length;
  }

  /**
   * Trier par colonne
   */
  sortBy(column: string): void {
    if (this.sortConfig.column === column) {
      // Inverser la direction si c'est la même colonne
      this.sortConfig.direction = this.sortConfig.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // Nouvelle colonne, commencer par ascendant
      this.sortConfig.column = column;
      this.sortConfig.direction = 'asc';
    }
    
    this.applySorting();
  }

  /**
   * Appliquer le tri aux étudiants filtrés
   */
  private applySorting(): void {
    if (!this.sortConfig.column) {
      return;
    }

    this.filteredStudents.sort((a, b) => {
      let valueA: any;
      let valueB: any;

      // Extraire la valeur selon la colonne
      switch (this.sortConfig.column) {
        case 'name':
          valueA = `${a.last_name} ${a.first_name}`.toLowerCase();
          valueB = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'matricule':
          valueA = a.matricule?.toLowerCase() || '';
          valueB = b.matricule?.toLowerCase() || '';
          break;
        case 'email':
          valueA = a.email?.toLowerCase() || '';
          valueB = b.email?.toLowerCase() || '';
          break;
        case 'status':
          valueA = this.getStatusLabel(a.status).toLowerCase();
          valueB = this.getStatusLabel(b.status).toLowerCase();
          break;
        case 'punch_time':
          valueA = a.punch_time?.time ? new Date(a.punch_time.time).getTime() : 0;
          valueB = b.punch_time?.time ? new Date(b.punch_time.time).getTime() : 0;
          break;
        case 'device':
          valueA = a.punch_time?.device?.toLowerCase() || '';
          valueB = b.punch_time?.device?.toLowerCase() || '';
          break;
        case 'promotion':
          valueA = a.promotion?.name?.toLowerCase() || '';
          valueB = b.promotion?.name?.toLowerCase() || '';
          break;
        case 'group':
          valueA = a.group?.title?.toLowerCase() || '';
          valueB = b.group?.title?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      // Comparer les valeurs
      let comparison = 0;
      if (valueA < valueB) {
        comparison = -1;
      } else if (valueA > valueB) {
        comparison = 1;
      }

      // Inverser si direction descendante
      return this.sortConfig.direction === 'desc' ? -comparison : comparison;
    });
  }

  /**
   * Obtenir la classe CSS pour l'indicateur de tri
   */
  getSortClass(column: string): string {
    if (this.sortConfig.column !== column) {
      return 'text-gray-400';
    }
    return this.sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-blue-600';
  }

  /**
   * Obtenir l'icône de tri
   */
  getSortIcon(column: string): string {
    if (this.sortConfig.column !== column) {
      return 'unfold_more';
    }
    return this.sortConfig.direction === 'asc' ? 'keyboard_arrow_up' : 'keyboard_arrow_down';
  }

  /**
   * Vérifier si une colonne est triable
   */
  isSortable(column: string): boolean {
    return this.sortableColumns.some(col => col.key === column);
  }

  /**
   * Vérifier si un étudiant correspond au filtre alphabétique
   */
  private matchesAlphabetFilter(student: any): boolean {
    if (!this.alphabetFilter.enabled) {
      return true;
    }

    const fullName = `${student.last_name} ${student.first_name}`.toUpperCase();
    const firstLetter = fullName.charAt(0);
    
    const startIndex = this.alphabetLetters.indexOf(this.alphabetFilter.startLetter);
    const endIndex = this.alphabetLetters.indexOf(this.alphabetFilter.endLetter);
    const letterIndex = this.alphabetLetters.indexOf(firstLetter);
    
    // Vérifier si la première lettre est dans la plage sélectionnée
    return letterIndex >= startIndex && letterIndex <= endIndex;
  }

  /**
   * Activer/désactiver le filtre alphabétique
   */
  toggleAlphabetFilter(): void {
    this.alphabetFilter.enabled = !this.alphabetFilter.enabled;
    this.applyFilters();
  }

  /**
   * Mettre à jour la plage alphabétique
   */
  updateAlphabetRange(): void {
    if (this.alphabetFilter.enabled) {
      this.applyFilters();
    }
  }

  /**
   * Obtenir la plage alphabétique formatée
   */
  getAlphabetRangeText(): string {
    if (!this.alphabetFilter.enabled) {
      return 'Toutes les lettres';
    }
    
    if (this.alphabetFilter.startLetter === this.alphabetFilter.endLetter) {
      return `Lettre ${this.alphabetFilter.startLetter}`;
    }
    
    return `${this.alphabetFilter.startLetter} - ${this.alphabetFilter.endLetter}`;
  }

  /**
   * Obtenir les lettres disponibles dans la plage sélectionnée
   */
  getAvailableLettersInRange(): string[] {
    const startIndex = this.alphabetLetters.indexOf(this.alphabetFilter.startLetter);
    const endIndex = this.alphabetLetters.indexOf(this.alphabetFilter.endLetter);
    
    return this.alphabetLetters.slice(startIndex, endIndex + 1);
  }

  /**
   * Afficher les détails d'un étudiant
   */
  showStudentDetails(student: any): void {
    this.selectedStudent = student;
    this.showDetailsModal = true;
  }

  /**
   * Fermer la modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedStudent = null;
  }

  /**
   * Obtenir le statut avec icône
   */
  getStatusWithIcon(status: string): { label: string, icon: string, color: string } {
    const statusConfig: { [key: string]: { label: string, icon: string, color: string } } = {
      'present': { label: 'Présent', icon: 'check_circle', color: 'text-green-600' },
      'absent': { label: 'Absent', icon: 'cancel', color: 'text-red-600' },
      'late': { label: 'En retard', icon: 'schedule', color: 'text-yellow-600' },
      'excused': { label: 'Excusé', icon: 'info', color: 'text-blue-600' }
    };
    return statusConfig[status] || { label: status, icon: 'help', color: 'text-gray-600' };
  }

  /**
   * Basculer le mode édition
   */
  toggleEditMode() {
    this.editMode = !this.editMode;
    if (!this.editMode) {
      this.closeAttendanceStateModal();
    }
  }

  /**
   * Ouvrir le modal de modification d'état de présence
   */
  openAttendanceStateModal(student: any) {
    this.selectedStudentForEdit = student;
    this.attendanceStateModalOpen = true;
  }

  /**
   * Fermer le modal de modification d'état de présence
   */
  closeAttendanceStateModal() {
    this.attendanceStateModalOpen = false;
    this.selectedStudentForEdit = null;
  }

  /**
   * Mettre à jour le statut d'un étudiant via le menu déroulant
   */
  updateStudentStatus(student: any, event: any) {
    const newStatus = event.target.value as 'present' | 'absent' | 'late' | 'excused';
    
    // Mettre à jour l'étudiant dans la liste principale
    const studentIndex = this.students.findIndex(s => s.id === student.id);
    if (studentIndex !== -1) {
      this.students[studentIndex].status = newStatus;
      this.students[studentIndex].manual_override = true;
    }

    // Mettre à jour la liste filtrée
    const filteredIndex = this.filteredStudents.findIndex(s => s.id === student.id);
    if (filteredIndex !== -1) {
      this.filteredStudents[filteredIndex].status = newStatus;
      this.filteredStudents[filteredIndex].manual_override = true;
    }

    // Recalculer les statistiques
    this.updateStatistics({
      total_students: this.students.length,
      presents: this.students.filter(s => s.status === 'present').length,
      absents: this.students.filter(s => s.status === 'absent').length,
      lates: this.students.filter(s => s.status === 'late').length,
      excused: this.students.filter(s => s.status === 'excused').length
    });

    // Afficher une notification de succès
    this.notificationService.success('Succès', `Statut mis à jour pour ${student.first_name} ${student.last_name}: ${this.getStatusLabel(newStatus)}`);

    // Sauvegarder en base de données via l'API
    this.saveStatusToDatabase(student, newStatus);
  }

  /**
   * Sauvegarder le statut en base de données
   */
  private saveStatusToDatabase(student: any, newStatus: string) {
    if (!this.coursId) {
      console.error('ID du cours non disponible');
      return;
    }

    // Préparer les données pour l'API
    const updateData = {
      cours_id: this.coursId,
      etudiant_id: student.id,
      status: (newStatus === 'excused' ? 'left_early' : newStatus) as 'present' | 'absent' | 'late' | 'left_early',
      motif: undefined,
      justificatif: undefined
    };

    // Appeler l'API pour sauvegarder
    this.attendanceStateService.updateCoursAttendanceState(updateData).subscribe({
      next: (response) => {
        this.notificationService.success('Succès', `Statut sauvegardé pour ${student.first_name} ${student.last_name}`);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la sauvegarde:', error);
        this.notificationService.error('Erreur', `Impossible de sauvegarder le statut: ${error.message || 'Erreur inconnue'}`);
        
        // Revenir au statut précédent en cas d'erreur
        this.revertStudentStatus(student);
      }
    });
  }

  /**
   * Revenir au statut précédent en cas d'erreur de sauvegarde
   */
  private revertStudentStatus(student: any) {
    // Recharger les données pour revenir au statut original
    this.loadAttendanceData();
  }

  /**
   * Gérer la mise à jour de l'état de présence (pour le modal - gardé pour compatibilité)
   */
  onAttendanceStateUpdated(event: any) {
    const { student, newStatus, absence } = event;
    
    // Mettre à jour l'étudiant dans la liste
    const studentIndex = this.students.findIndex(s => s.id === student.id);
    if (studentIndex !== -1) {
      this.students[studentIndex].status = newStatus;
      this.students[studentIndex].manual_override = true;
      this.students[studentIndex].absence = absence;
    }

    // Mettre à jour la liste filtrée
    const filteredIndex = this.filteredStudents.findIndex(s => s.id === student.id);
    if (filteredIndex !== -1) {
      this.filteredStudents[filteredIndex].status = newStatus;
      this.filteredStudents[filteredIndex].manual_override = true;
      this.filteredStudents[filteredIndex].absence = absence;
    }

    // Recalculer les statistiques
    this.updateStatistics({
      total_students: this.students.length,
      presents: this.students.filter(s => s.status === 'present').length,
      absents: this.students.filter(s => s.status === 'absent').length,
      lates: this.students.filter(s => s.status === 'late').length,
      excused: this.students.filter(s => s.status === 'excused').length
    });

    // Afficher une notification de succès
    this.notificationService.success('Succès', `État de présence mis à jour pour ${student.first_name} ${student.last_name}`);

    // Fermer le modal
    this.closeAttendanceStateModal();
  }

  /**
   * Obtient la liste des étudiants absents et en retard
   */
  getAbsentAndLateStudents(): any[] {
    return this.filteredStudents.filter(s => s.status === 'absent' || s.status === 'late');
  }

  /**
   * Obtient le nombre d'étudiants absents et en retard
   */
  getAbsentAndLateStudentsCount(): number {
    return this.getAbsentAndLateStudents().length;
  }

  /**
   * Exporte uniquement les absences (étudiants absents et en retard) en CSV ou Excel
   */
  exportAbsences(format: 'csv' | 'excel'): void {
    const absentStudents = this.getAbsentAndLateStudents();
    
    if (absentStudents.length === 0) {
      this.notificationService.warning('Aucune absence', 'Aucun étudiant absent ou en retard trouvé pour l\'exportation');
      return;
    }

    this.isExporting = true;
    this.exportFormat = format;

    try {
      // Préparer les données pour l'export des absences
      const exportData = this.prepareAbsencesExportData(absentStudents);
      
      if (format === 'csv') {
        // Créer le contenu CSV
        const csvContent = this.createAbsencesCSVContent(exportData);
        this.downloadCSV(csvContent, this.generateAbsencesFileName('csv'));
      } else if (format === 'excel') {
        // Créer le fichier Excel
        this.createAbsencesExcelFile(exportData);
      }
      
      this.notificationService.success('Export des absences réussi', `La liste des absences a été exportée en ${format.toUpperCase()} avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export des absences:', error);
      this.notificationService.error('Erreur d\'export', 'Une erreur est survenue lors de l\'exportation des absences');
    } finally {
      this.isExporting = false;
      this.exportFormat = null;
    }
  }

  /**
   * Prépare les données pour l'export des absences
   */
  private prepareAbsencesExportData(absentStudents: any[]): any[] {
    return absentStudents.map(student => ({
      nom: student.last_name,
      prenom: student.first_name,
      matricule: student.matricule,
      email: student.email,
      statut: this.getStatusLabel(student.status),
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
   * Crée le contenu CSV pour les absences
   */
  private createAbsencesCSVContent(data: any[]): string {
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

    // Informations du cours
    const coursDetails = [
      `Cours du ${this.formatDate(this.coursData?.cours.date || '')}`,
      `Nom du cours: ${this.coursData?.cours.name || 'N/A'}`,
      `Type: ${this.coursData?.cours.type_cours?.name || 'N/A'}`,
      `Heure début: ${this.formatTime(this.coursData?.cours.heure_debut || '')}`,
      `Heure fin: ${this.formatTime(this.coursData?.cours.heure_fin || '')}`,
      `Salle: ${this.coursData?.cours.salle?.name || 'N/A'}`,
      `Total étudiants: ${this.totalStudents}`,
      `Présents: ${this.presents}`,
      `En retard: ${this.lates}`,
      `Absents: ${this.absents}`,
      `Absences exportées: ${data.length}`,
      ''
    ];

    // Créer le contenu CSV
    let csvContent = '';
    
    // Ajouter les informations du cours
    csvContent += 'LISTE DES ABSENCES - INFORMATIONS DU COURS\n';
    coursDetails.forEach((detail, index) => {
      if (detail) {
        csvContent += `"${detail}"`;
        if (index < coursDetails.length - 1) csvContent += ',';
      } else {
        csvContent += ',';
      }
    });
    csvContent += '\n\n';

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
   * Génère le nom du fichier pour les absences
   */
  private generateAbsencesFileName(format: 'csv' | 'excel'): string {
    const date = this.formatDate(this.coursData?.cours.date || '').replace(/\//g, '-');
    const time = this.formatTimeForFileName(this.coursData?.cours.heure_debut || '');
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    return `absences_cours_${date}_${time}.${extension}`;
  }

  /**
   * Crée un fichier Excel avec les données des absences
   */
  private createAbsencesExcelFile(data: any[]): void {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();
    
    // Ajouter la feuille d'informations du cours
    this.addCoursInfoSheet(wb);
    
    // Ajouter la feuille principale avec les données des absences
    this.addAbsencesDataSheet(wb, data);
    
    // Ajouter la feuille de statistiques des absences
    this.addAbsencesStatisticsSheet(wb);
    
    // Télécharger le fichier Excel
    XLSX.writeFile(wb, this.generateAbsencesFileName('excel'));
  }

  /**
   * Ajoute la feuille principale avec les données des absences
   */
  private addAbsencesDataSheet(wb: XLSX.WorkBook, data: any[]): void {
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
    
    XLSX.utils.book_append_sheet(wb, ws, 'Liste des absences');
  }

  /**
   * Ajoute une feuille de statistiques des absences
   */
  private addAbsencesStatisticsSheet(wb: XLSX.WorkBook): void {
    const absentStudents = this.getAbsentAndLateStudents();
    const lateStudents = absentStudents.filter(s => s.status === 'late');
    const absentStudentsOnly = absentStudents.filter(s => s.status === 'absent');
    
    const statsData = [
      ['STATISTIQUES DES ABSENCES'],
      [''],
      ['Par statut'],
      ['Absents', absentStudentsOnly.length],
      ['En retard', lateStudents.length],
      ['Total absences', absentStudents.length],
      [''],
      ['Pourcentages'],
      ['Absents', `${((absentStudentsOnly.length / this.totalStudents) * 100).toFixed(1)}%`],
      ['En retard', `${((lateStudents.length / this.totalStudents) * 100).toFixed(1)}%`],
      ['Total absences', `${((absentStudents.length / this.totalStudents) * 100).toFixed(1)}%`],
      [''],
      ['Détails du cours'],
      ['Date', this.formatDate(this.coursData?.cours.date || '')],
      ['Nom du cours', this.coursData?.cours.name || 'N/A'],
      ['Heure début', this.formatTime(this.coursData?.cours.heure_debut || '')],
      ['Heure fin', this.formatTime(this.coursData?.cours.heure_fin || '')],
      ['Salle', this.coursData?.cours.salle?.name || 'N/A']
    ];

    const ws = XLSX.utils.aoa_to_sheet(statsData);
    
    // Styliser la feuille
    ws['!cols'] = [
      { wch: 25 }, // Colonne 1
      { wch: 20 }  // Colonne 2
    ];
    
    XLSX.utils.book_append_sheet(wb, ws, 'Statistiques des absences');
  }
}
