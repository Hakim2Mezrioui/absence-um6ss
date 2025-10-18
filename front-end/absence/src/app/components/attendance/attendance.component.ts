import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AttendanceService, AttendanceFilters, AttendanceResponse, StudentAttendance } from '../../services/attendance.service';
import { AbsenceAutoService, CreateAbsencesFromAttendanceRequest } from '../../services/absence-auto.service';
import { NotificationService } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './attendance.component.html',
  styleUrl: './attendance.component.css'
})
export class AttendanceComponent implements OnInit, OnDestroy {
  students: StudentAttendance[] = [];
  loading = false;
  error = '';
  
  // Statistiques
  totalStudents = 0;
  presents = 0;
  absents = 0;
  
  // Filtres
  filtersForm: FormGroup;
  
  
  // Informations de l'examen
  examDate = '';
  examPunchStartTime = '';
  examStartTime = '';
  examEndTime = '';
  examSalle = '';
  examTolerance = 15; // Tolérance par défaut en minutes
  examId: number | null = null;
  examData: any = null; // Données complètes de l'examen
  
  // Étudiant sélectionné pour les détails
  selectedStudent: StudentAttendance | null = null;
  
  // Tri
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Propriétés pour le regroupement alphabétique (supprimé - remplacé par filtrage)
  groupedStudents: { [key: string]: any[] } = {};
  alphabetGroups: string[] = [];
  showAlphabeticalGrouping: boolean = false;
  
  // Propriétés pour la recherche
  searchTerm: string = '';
  filteredStudents: any[] = [];
  isSearchActive: boolean = false;
  
  // Filtrage alphabétique
  alphabetFilter = {
    enabled: false,
    startLetter: 'A',
    endLetter: 'Z'
  };
  
  // Lettres de l'alphabet pour la sélection
  alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  // Propriétés pour l'export
  isExporting: boolean = false;
  exportFormat: 'csv' | 'excel' | null = null;
  
  // Propriétés pour la création automatique des absences
  isCreatingAbsences: boolean = false;
  showAbsenceCreationDialog: boolean = false;
  examenId: number | null = null;
  
  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
    private absenceAutoService: AbsenceAutoService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {
    this.filtersForm = this.fb.group({
      date: [''],
      hour1: [''],
      hour2: [''],
      promotion_id: [''],
      etablissement_id: [''],
      group_id: [''],
      option_id: [''],
      ville_id: ['']
    });
  }

  ngOnInit(): void {
    console.log('🎯 AttendanceComponent initialisé');
    
    // Récupérer les paramètres de l'URL
    this.route.queryParams.subscribe(params => {
      if (params['date']) this.filtersForm.patchValue({ date: params['date'] });
      if (params['hour1']) this.filtersForm.patchValue({ hour1: params['hour1'] });
      if (params['hour2']) this.filtersForm.patchValue({ hour2: params['hour2'] });
      if (params['promotion_id']) this.filtersForm.patchValue({ promotion_id: params['promotion_id'] });
      if (params['etablissement_id']) this.filtersForm.patchValue({ etablissement_id: params['etablissement_id'] });
      if (params['group_id']) this.filtersForm.patchValue({ group_id: params['group_id'] });
      if (params['option_id']) this.filtersForm.patchValue({ option_id: params['option_id'] });
      if (params['ville_id']) this.filtersForm.patchValue({ ville_id: params['ville_id'] });
      
      // Charger les données d'attendance
      this.loadAttendance();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAttendance(): void {
    console.log('🔄 Chargement des données d\'attendance');
    this.loading = true;
    this.error = '';

    const filters: AttendanceFilters = this.filtersForm.value;
    
    // Supprimer les valeurs vides
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof AttendanceFilters];
      if (value === '' || value === null || value === undefined) {
        delete filters[key as keyof AttendanceFilters];
      }
    });

    console.log('📋 Filtres appliqués:', filters);

    this.attendanceService.getStudentAttendance(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AttendanceResponse) => {
          console.log('✅ Données d\'attendance reçues:', response);
          this.students = response.etudiants;
          this.totalStudents = response.total_etudiants;
          this.presents = response.presents;
          this.absents = response.absents;
          this.examDate = response.date;
          this.examPunchStartTime = response.heure_debut_poigntage || '';
          this.examStartTime = response.heure_debut;
          this.examEndTime = response.heure_fin;
          this.examSalle = response.salle || 'N/A';
          this.examTolerance = response.tolerance || 15;
          this.examId = response.examen_id || null;
          this.examData = response.examen || null;
          
          // Debug: Vérifier les données de l'examen
          console.log('🔍 Données de l\'examen:', this.examData);
          console.log('🔍 Option de l\'examen:', this.examData?.option);
          
          // Appliquer la logique de tolérance aux étudiants
          this.applyToleranceLogic();
          
          // Initialiser le filtrage
          this.filterStudents();
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement de l\'attendance:', err);
          
          // Vérifier si c'est le cas "aucun étudiant trouvé" (status 404)
          if (err.status === 404 && err.error && err.error.message) {
            // Cas spécial : aucun étudiant trouvé - ce n'est pas une vraie erreur
            this.error = '';
            this.students = [];
            this.totalStudents = 0;
            this.presents = 0;
            this.absents = 0;
            
            // Extraire les informations de l'examen si disponibles
            if (err.error.examen) {
              this.examData = err.error.examen;
              this.examDate = err.error.examen.date || '';
              this.examPunchStartTime = err.error.examen.heure_debut_poigntage || '';
              this.examStartTime = err.error.examen.heure_debut || '';
              this.examEndTime = err.error.examen.heure_fin || '';
              this.examSalle = err.error.examen.salle?.name || 'N/A';
              this.examTolerance = err.error.examen.tolerance || 15;
              this.examId = err.error.examen.id || null;
            }
            
            // Initialiser le filtrage avec une liste vide
            this.filterStudents();
            this.loading = false;
            
            // Afficher le message spécifique de l'API
            this.notificationService.info('Information', err.error.message);
          } else {
            // Vraie erreur de chargement
            this.error = 'Erreur lors du chargement des données d\'attendance';
            this.loading = false;
          }
        }
      });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'présent':
        return 'bg-green-100 text-green-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  formatTime(timeString: string): string {
    if (!timeString) return 'N/A';
    return timeString.substring(0, 5);
  }

  formatDateTime(dateTimeString: string): string {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleString('fr-FR');
  }

  refreshAttendance(): void {
    this.loadAttendance();
  }

  showStudentDetails(student: StudentAttendance): void {
    this.selectedStudent = student;
  }

  closeStudentDetails(): void {
    this.selectedStudent = null;
  }

  // Méthodes de tri
  sortStudents(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    
    this.filteredStudents.sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      switch (column) {
        case 'name':
          valueA = `${a.last_name} ${a.first_name}`.toLowerCase();
          valueB = `${b.last_name} ${b.first_name}`.toLowerCase();
          break;
        case 'matricule':
          valueA = a.matricule.toLowerCase();
          valueB = b.matricule.toLowerCase();
          break;
        case 'status':
          valueA = a.status.toLowerCase();
          valueB = b.status.toLowerCase();
          break;
        case 'punch_time':
          valueA = a.punch_time ? new Date(a.punch_time.time).getTime() : 0;
          valueB = b.punch_time ? new Date(b.punch_time.time).getTime() : 0;
          break;
        case 'device':
          valueA = a.punch_time ? a.punch_time.device.toLowerCase() : '';
          valueB = b.punch_time ? b.punch_time.device.toLowerCase() : '';
          break;
        default:
          return 0;
      }
      
      if (valueA < valueB) {
        return this.sortDirection === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortDirection === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) {
      return 'sort'; // Icône neutre
    }
    return this.sortDirection === 'asc' ? 'sort-up' : 'sort-down';
  }

  getSortClass(column: string): string {
    if (this.sortColumn !== column) {
      return 'text-gray-400';
    }
    return this.sortDirection === 'asc' ? 'text-blue-600' : 'text-blue-600';
  }


  /**
   * Libellé à afficher pour le groupe
   * - Si l'examen concerne tous les groupes, afficher "Tous"
   * - Sinon afficher le nom du groupe
   */
  getGroupDisplayName(): string {
    // 1) Afficher le titre du groupe renvoyé avec l'examen si disponible
    const examGroupTitle = this.examData?.group?.title;
    if (examGroupTitle) {
      return examGroupTitle;
    }

    // 2) Si tous les étudiants appartiennent au même groupe, afficher ce groupe
    const singleGroupTitle = this.getSingleGroupTitleFromStudents();
    if (singleGroupTitle) {
      return singleGroupTitle;
    }

    // 3) Sinon, si un group_id explicite est présent dans les filtres (sans titre), on ne peut pas résoudre le nom ici
    //    donc on affiche Tous (l'API d'attendance ne renvoie pas la méta du groupe)
    const groupIdFromFilters = this.filtersForm.get('group_id')?.value;
    if (groupIdFromFilters !== '' && groupIdFromFilters !== null && groupIdFromFilters !== undefined) {
      return 'Tous';
    }

    // 4) Par défaut, Tous (examens tous groupes ou données mixtes)
    return 'Tous';
  }

  /**
   * Indique si plusieurs groupes différents existent dans la liste
   */
  private hasMultipleGroups(): boolean {
    if (!this.students || this.students.length === 0) return false;
    const titles = new Set(
      this.students
        .map(s => (s && s.group ? s.group.title : undefined))
        .filter((t): t is string => !!t)
    );
    return titles.size > 1;
  }

  /**
   * Retourne le titre unique du groupe si tous les étudiants partagent le même groupe,
   * sinon retourne une chaîne vide.
   */
  private getSingleGroupTitleFromStudents(): string {
    if (!this.students || this.students.length === 0) return '';
    const titles = new Set(
      this.students
        .map(s => (s && s.group ? s.group.title : undefined))
        .filter((t): t is string => !!t)
    );
    if (titles.size === 1) {
      return Array.from(titles)[0];
    }
    return '';
  }


  // Méthodes pour la recherche
  onSearchChange(): void {
    this.isSearchActive = this.searchTerm.trim().length > 0;
    this.filterStudents();
  }

  filterStudents(): void {
    // Commencer avec tous les étudiants
    let filtered = [...this.students];
    
    // Appliquer la recherche textuelle
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(student => {
        const fullName = `${student.last_name} ${student.first_name}`.toLowerCase();
        const email = student.email?.toLowerCase() || '';
        const matricule = student.matricule?.toLowerCase() || '';
        
        return fullName.includes(searchLower) || 
               email.includes(searchLower) || 
               matricule.includes(searchLower);
      });
      this.isSearchActive = true;
    } else {
      this.isSearchActive = false;
    }
    
    // Appliquer le filtrage alphabétique
    if (this.alphabetFilter.enabled) {
      filtered = filtered.filter(student => this.matchesAlphabetFilter(student));
    }
    
    this.filteredStudents = filtered;
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.isSearchActive = false;
    this.filterStudents();
  }

  getStudentsToDisplay(): any[] {
    return this.filteredStudents;
  }

  getSearchResultsCount(): number {
    return this.filteredStudents.length;
  }

  /**
   * Applique la logique de tolérance aux étudiants
   */
  applyToleranceLogic(): void {
    this.students.forEach(student => {
      if (student.punch_time) {
        const punchTime = new Date(student.punch_time.time);
        const newStatus = this.calculateStudentStatus(punchTime);
        student.status = newStatus;
      } else {
        student.status = 'absent';
      }
    });

    // Recalculer les statistiques
    this.presents = this.students.filter(s => s.status === 'présent').length;
    this.absents = this.students.filter(s => s.status === 'absent').length;
    this.totalStudents = this.students.length;
    
    // Mettre à jour les étudiants filtrés
    this.filteredStudents = [...this.students];
  }

  /**
   * Calcule le statut de l'étudiant basé sur l'heure de pointage et la tolérance
   */
  calculateStudentStatus(punchTime: Date): string {
    if (!this.examDate || !this.examStartTime) {
      return 'absent';
    }

    // Créer les dates de référence
    const examDate = new Date(this.examDate);
    const examStartTime = this.parseTimeString(this.examStartTime);
    const examPunchStartTime = this.examPunchStartTime ? this.parseTimeString(this.examPunchStartTime) : null;

    // Date de début de l'examen
    const examStartDateTime = new Date(examDate);
    examStartDateTime.setHours(examStartTime.getHours(), examStartTime.getMinutes(), examStartTime.getSeconds());

    // Date de début de pointage (si disponible)
    const examPunchStartDateTime = examPunchStartTime ? new Date(examDate) : null;
    if (examPunchStartDateTime && examPunchStartTime) {
      examPunchStartDateTime.setHours(examPunchStartTime.getHours(), examPunchStartTime.getMinutes(), examPunchStartTime.getSeconds());
    }

    // Date limite avec tolérance (heure début + tolérance)
    const toleranceDateTime = new Date(examStartDateTime);
    toleranceDateTime.setMinutes(toleranceDateTime.getMinutes() + this.examTolerance);

    console.log('🕐 Calcul du statut:', {
      punchTime: punchTime.toLocaleString(),
      examStart: examStartDateTime.toLocaleString(),
      toleranceLimit: toleranceDateTime.toLocaleString(),
      tolerance: this.examTolerance + ' minutes'
    });

    // Logique de statut
    if (examPunchStartDateTime && punchTime >= examPunchStartDateTime && punchTime < examStartDateTime) {
      // Entre heure début pointage et heure début = Présent
      return 'présent';
    } else if (punchTime >= examStartDateTime && punchTime <= toleranceDateTime) {
      // Entre heure début et limite de tolérance = En retard
      return 'en retard';
    } else if (punchTime > toleranceDateTime) {
      // Après la limite de tolérance = Absent
      return 'absent';
    } else {
      // Avant l'heure de début de pointage ou pas de pointage = Absent
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
   * Obtient la classe CSS pour le statut avec tolérance
   */
  getStatusClassWithTolerance(status: string): string {
    switch (status.toLowerCase()) {
      case 'présent':
        return 'bg-green-100 text-green-800';
      case 'en retard':
        return 'bg-yellow-100 text-yellow-800';
      case 'absent':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Obtient l'icône pour le statut avec tolérance
   */
  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'présent':
        return 'check_circle';
      case 'en retard':
        return 'schedule';
      case 'absent':
        return 'cancel';
      default:
        return 'help';
    }
  }

  /**
   * Obtient le nombre d'étudiants en retard
   */
  getLateStudentsCount(): number {
    return this.students.filter(s => s.status === 'en retard').length;
  }

  /**
   * Calcule l'heure de fin de tolérance
   */
  getToleranceEndTime(): string {
    if (!this.examStartTime) return 'N/A';
    
    const startTime = this.parseTimeString(this.examStartTime);
    const toleranceTime = new Date(startTime);
    toleranceTime.setMinutes(toleranceTime.getMinutes() + this.examTolerance);
    
    return toleranceTime.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Exporte la liste de suivi des présences en CSV ou Excel
   */
  exportAttendanceList(format: 'csv' | 'excel'): void {
    if (this.students.length === 0) {
      this.notificationService.error('Aucune donnée à exporter', 'Aucun étudiant trouvé pour l\'exportation');
      return;
    }

    this.isExporting = true;
    this.exportFormat = format;

    try {
      // S'assurer que la logique de tolérance est appliquée
      this.applyToleranceLogic();
      
      // Préparer les données pour l'export
      const exportData = this.prepareExportData();
      
      if (format === 'csv') {
        // Créer le contenu CSV
        const csvContent = this.createCSVContent(exportData);
        this.downloadCSV(csvContent, this.generateFileName('csv'));
      } else if (format === 'excel') {
        // Créer le fichier Excel
        this.createExcelFile(exportData);
      }
      
      this.notificationService.success('Export réussi', `La liste de suivi a été exportée en ${format.toUpperCase()} avec succès`);
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      this.notificationService.error('Erreur d\'export', 'Une erreur est survenue lors de l\'exportation');
    } finally {
      this.isExporting = false;
      this.exportFormat = null;
    }
  }

  /**
   * Prépare les données pour l'export
   */
  private prepareExportData(): any[] {
    const exportData = this.students.map(student => ({
      nom: student.last_name,
      prenom: student.first_name,
      matricule: student.matricule,
      email: student.email,
      statut: student.status,
      heure_pointage: student.punch_time ? this.formatDateTime(student.punch_time.time) : 'N/A',
      appareil: student.punch_time ? student.punch_time.device : 'N/A',
      promotion: student.promotion?.name || 'N/A',
      groupe: student.group?.title || 'N/A',
      option: student.option?.name || 'N/A',
      etablissement: student.etablissement?.name || 'N/A',
      ville: student.ville?.name || 'N/A'
    }));

    // Debug: Vérifier que les statuts sont présents
    console.log('🔍 Données d\'export préparées:', exportData.slice(0, 3));
    console.log('📊 Statuts des étudiants:', exportData.map(s => ({ nom: s.nom, statut: s.statut })));

    return exportData;
  }

  /**
   * Crée le contenu CSV
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

    // Informations de l'examen
    const examInfo = [
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      ''
    ];

    const examDetails = [
      `Examen du ${this.formatDate(this.examDate)}`,
      `Heure début: ${this.formatTime(this.examStartTime)}`,
      `Heure fin: ${this.formatTime(this.examEndTime)}`,
      `Tolérance: ${this.examTolerance} minutes`,
      `Salle: ${this.examSalle}`,
      `Total étudiants: ${this.totalStudents}`,
      `Présents: ${this.presents}`,
      `En retard: ${this.getLateStudentsCount()}`,
      `Absents: ${this.absents}`,
      '',
      '',
      ''
    ];

    // Créer le contenu CSV
    let csvContent = '';
    
    // Ajouter les informations de l'examen
    csvContent += 'INFORMATIONS DE L\'EXAMEN\n';
    examDetails.forEach((detail, index) => {
      if (detail) {
        csvContent += `"${detail}"`;
        if (index < examDetails.length - 1) csvContent += ',';
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
   * Télécharge le fichier CSV
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
   * Génère le nom du fichier
   */
  private generateFileName(format: 'csv' | 'excel'): string {
    const date = this.formatDate(this.examDate).replace(/\//g, '-');
    const time = this.formatTime(this.examStartTime).replace(/:/g, '-');
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    return `suivi_presences_${date}_${time}.${extension}`;
  }

  /**
   * Crée un fichier Excel avec les données d'attendance
   */
  private createExcelFile(data: any[]): void {
    // Créer un nouveau workbook
    const wb = XLSX.utils.book_new();
    
    // Ajouter la feuille d'informations de l'examen
    this.addExamInfoSheet(wb);
    
    // Ajouter la feuille principale avec les données des étudiants
    this.addStudentsDataSheet(wb, data);
    
    // Ajouter la feuille de statistiques
    this.addStatisticsSheet(wb);
    
    // Télécharger le fichier Excel
    XLSX.writeFile(wb, this.generateFileName('excel'));
  }

  /**
   * Ajoute une feuille d'informations de l'examen
   */
  private addExamInfoSheet(wb: XLSX.WorkBook): void {
    const examInfo = [
      ['INFORMATIONS DE L\'EXAMEN'],
      [''],
      ['Date de l\'examen', this.formatDate(this.examDate)],
      ['Heure de début', this.formatTime(this.examStartTime)],
      ['Heure de fin', this.formatTime(this.examEndTime)],
      ['Tolérance', `${this.examTolerance} minutes`],
      ['Salle', this.examSalle],
      [''],
      ['STATISTIQUES'],
      ['Total étudiants', this.totalStudents],
      ['Présents', this.presents],
      ['En retard', this.getLateStudentsCount()],
      ['Absents', this.absents]
    ];

    const ws = XLSX.utils.aoa_to_sheet(examInfo);
    
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

    // Debug: Vérifier les données avant création de la feuille
    console.log('📋 Données pour la feuille Excel:', data.slice(0, 3));
    console.log('📊 Statuts dans les données:', data.map(d => ({ nom: d.nom, statut: d.statut })));

    const sheetData = [headers, ...data.map(row => [
      row.nom, row.prenom, row.matricule, row.email, row.statut,
      row.heure_pointage, row.appareil, row.promotion, row.groupe,
      row.option, row.etablissement, row.ville
    ])];

    // Debug: Vérifier les données de la feuille
    console.log('📄 Données de la feuille Excel:', sheetData.slice(0, 3));

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
      ['En retard', this.getLateStudentsCount()],
      ['Absents', this.absents],
      [''],
      ['Pourcentages'],
      ['Présents', `${((this.presents / this.totalStudents) * 100).toFixed(1)}%`],
      ['En retard', `${((this.getLateStudentsCount() / this.totalStudents) * 100).toFixed(1)}%`],
      ['Absents', `${((this.absents / this.totalStudents) * 100).toFixed(1)}%`],
      [''],
      ['Détails de l\'examen'],
      ['Date', this.formatDate(this.examDate)],
      ['Heure début', this.formatTime(this.examStartTime)],
      ['Heure fin', this.formatTime(this.examEndTime)],
      ['Tolérance', `${this.examTolerance} minutes`],
      ['Salle', this.examSalle]
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
   * Ouvre le dialogue de création d'absences
   */
  openAbsenceCreationDialog(): void {
    if (this.students.length === 0) {
      this.notificationService.warning('Aucune donnée', 'Aucun étudiant trouvé pour créer les absences');
      return;
    }

    // Récupérer l'ID de l'examen depuis les paramètres de route ou les filtres
    this.examenId = this.getExamenIdFromFilters();
    
    if (!this.examenId) {
      this.notificationService.error('Erreur', 'Impossible de déterminer l\'ID de l\'examen');
      return;
    }

    this.showAbsenceCreationDialog = true;
  }

  /**
   * Ferme le dialogue de création d'absences
   */
  closeAbsenceCreationDialog(): void {
    this.showAbsenceCreationDialog = false;
    this.examenId = null;
  }

  /**
   * Crée automatiquement les absences pour les étudiants absents
   */
  createAbsencesForAbsentStudents(): void {
    if (!this.examenId) {
      this.notificationService.error('Erreur', 'ID de l\'examen manquant');
      return;
    }

    // Filtrer les étudiants absents et en retard
    const etudiantsAbsents = this.students
      .filter(student => student.status === 'absent' || student.status === 'en retard')
      .map(student => ({
        etudiant_id: student.id,
        status: student.status as 'absent' | 'en retard',
        punch_time: student.punch_time ? student.punch_time.time : undefined
      }));

    if (etudiantsAbsents.length === 0) {
      this.notificationService.info('Information', 'Aucun étudiant absent ou en retard trouvé');
      return;
    }

    this.isCreatingAbsences = true;

    const request: CreateAbsencesFromAttendanceRequest = {
      examen_id: this.examenId,
      etudiants_absents: etudiantsAbsents
    };

    this.absenceAutoService.createAbsencesFromAttendance(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Absences créées avec succès:', response);
          
          this.notificationService.success(
            'Absences créées', 
            `${response.data.statistiques.absences_creees} absence(s) créée(s) avec succès`
          );

          // Fermer le dialogue
          this.closeAbsenceCreationDialog();
          
          // Optionnel: recharger les données d'attendance
          // this.loadAttendance();
        },
        error: (err) => {
          console.error('❌ Erreur lors de la création des absences:', err);
          this.notificationService.error(
            'Erreur de création', 
            'Une erreur est survenue lors de la création des absences'
          );
        },
        complete: () => {
          this.isCreatingAbsences = false;
        }
      });
  }

  /**
   * Récupère l'ID de l'examen depuis les filtres ou les paramètres de route
   */
  private getExamenIdFromFilters(): number | null {
    // Utiliser l'ID de l'examen récupéré depuis la réponse d'attendance
    if (this.examId) {
      return this.examId;
    }

    // Essayer de récupérer depuis les paramètres de route
    const routeParams = this.route.snapshot.queryParams;
    
    // Si vous avez un paramètre examen_id dans l'URL
    if (routeParams['examen_id']) {
      return parseInt(routeParams['examen_id']);
    }

    // Sinon, essayer de déterminer l'ID de l'examen basé sur les filtres
    const filters = this.filtersForm.value;
    
    // Logique pour déterminer l'ID de l'examen basé sur les filtres
    // Vous pouvez adapter cette logique selon votre structure
    if (filters.date && filters.hour1 && filters.hour2) {
      // Ici, vous pourriez faire un appel API pour récupérer l'ID de l'examen
      // basé sur la date et les heures
      console.log('Recherche de l\'ID de l\'examen basé sur les filtres:', filters);
    }

    // Pour l'instant, retourner null si on ne peut pas déterminer l'ID
    return null;
  }


  /**
   * Obtient le nombre d'étudiants absents et en retard
   */
  getAbsentAndLateStudentsCount(): number {
    return this.students.filter(s => s.status === 'absent' || s.status === 'en retard').length;
  }

  /**
   * Obtient la liste des étudiants absents et en retard
   */
  getAbsentAndLateStudents(): StudentAttendance[] {
    return this.students.filter(s => s.status === 'absent' || s.status === 'en retard');
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
    this.filterStudents();
  }

  /**
   * Mettre à jour la plage alphabétique
   */
  updateAlphabetRange(): void {
    if (this.alphabetFilter.enabled) {
      this.filterStudents();
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

}
