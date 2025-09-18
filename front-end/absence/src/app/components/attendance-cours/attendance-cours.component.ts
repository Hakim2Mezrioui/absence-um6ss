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


@Component({
  selector: 'app-attendance-cours',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
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
  
  // Filtres de recherche
  searchFilters = {
    name: '',
    matricule: '',
    status: '',
    promotion: ''
  };
  
  // Filtrage alphabétique
  alphabetFilter = {
    enabled: false,
    startLetter: 'A',
    endLetter: 'Z'
  };
  
  // Lettres de l'alphabet pour la sélection
  alphabetLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  
  // Options pour les filtres
  statusOptions = [
    { value: '', label: 'Tous les statuts' },
    { value: 'present', label: 'Présent' },
    { value: 'absent', label: 'Absent' },
    { value: 'late', label: 'En retard' },
    { value: 'excused', label: 'Excusé' }
  ];
  
  promotionOptions: { value: string, label: string }[] = [];
  
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
    private fb: FormBuilder,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    // Récupérer l'ID du cours depuis les paramètres de route
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.coursId = +params['id'];
      if (this.coursId) {
        this.loadAttendanceData();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
          // Appliquer le calcul automatique du statut temporel
          if (data.cours) {
            data.cours.statut_temporel = this.coursService.calculateStatutTemporel(data.cours);
          }
          this.coursData = data;
          this.students = data.students || [];
          this.filteredStudents = [...this.students];
          this.updateStatistics(data.statistics);
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
      this.filteredStudents = [...this.students];
      this.updateStatistics(this.coursData.statistics);
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
   * Mettre à jour les options de promotion pour les filtres
   */
  private updatePromotionOptions(): void {
    const promotions = new Set<string>();
    this.students.forEach(student => {
      if (student.promotion?.name) {
        promotions.add(student.promotion.name);
      }
    });
    
    this.promotionOptions = [
      { value: '', label: 'Toutes les promotions' },
      ...Array.from(promotions).map(promo => ({ value: promo, label: promo }))
    ];
  }

  /**
   * Appliquer les filtres de recherche
   */
  applyFilters(): void {
    this.filteredStudents = this.students.filter(student => {
      const nameMatch = !this.searchFilters.name || 
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(this.searchFilters.name.toLowerCase());
      
      const matriculeMatch = !this.searchFilters.matricule || 
        student.matricule?.toLowerCase().includes(this.searchFilters.matricule.toLowerCase());
      
      const statusMatch = !this.searchFilters.status || 
        student.status === this.searchFilters.status;
      
      const promotionMatch = !this.searchFilters.promotion || 
        student.promotion?.name === this.searchFilters.promotion;
      
      // Filtrage alphabétique
      const alphabetMatch = !this.alphabetFilter.enabled || this.matchesAlphabetFilter(student);
      
      return nameMatch && matriculeMatch && statusMatch && promotionMatch && alphabetMatch;
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
      promotion: ''
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
          valueA = `${a.first_name} ${a.last_name}`.toLowerCase();
          valueB = `${b.first_name} ${b.last_name}`.toLowerCase();
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

    const fullName = `${student.first_name} ${student.last_name}`.toUpperCase();
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
}
