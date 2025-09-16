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
          this.students = data.students;
          this.updateStatistics(data.statistics);
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des données:', error);
          this.error = 'Erreur lors du chargement des données d\'attendance';
          this.loading = false;
          this.notificationService.error('Erreur', this.error);
          
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
      // Simulation de données
      this.coursData = {
        cours: {
          id: this.coursId!,
          name: 'Mathématiques - Analyse 1',
          date: '2024-01-15',
          pointage_start_hour: '08:00',
          heure_debut: '08:30',
          heure_fin: '10:30',
          tolerance: '00:15',
          annee_universitaire: '2023-2024',
          etablissement_id: 1,
          promotion_id: 1,
          type_cours_id: 1,
          salle_id: 1,
          option_id: 1,
          statut_temporel: 'futur' as 'passé' | 'en_cours' | 'futur',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
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
      this.updateStatistics(this.coursData.statistics);
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
   * Générer le nom du fichier
   */
  private generateFileName(format: 'csv' | 'excel'): string {
    if (!this.coursData) return `cours_attendance.${format === 'excel' ? 'xlsx' : 'csv'}`;
    
    const date = this.formatDate(this.coursData.cours.date);
    const time = this.formatTime(this.coursData.cours.heure_debut);
    const extension = format === 'excel' ? 'xlsx' : 'csv';
    
    return `cours_attendance_${date}_${time}.${extension}`;
  }

  /**
   * Formater une date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR').replace(/\//g, '-');
  }

  /**
   * Formater une heure
   */
  private formatTime(timeString: string): string {
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
   * Calculer l'heure de fin de pointage (heure de début + tolérance)
   */
  calculatePointageEndTime(): string {
    if (!this.coursData?.cours.heure_debut || !this.coursData?.cours.tolerance) {
      return 'N/A';
    }

    try {
      const [hours, minutes] = this.coursData.cours.heure_debut.split(':').map(Number);
      const [toleranceHours, toleranceMinutes] = this.coursData.cours.tolerance.split(':').map(Number);
      
      // Convertir la tolérance en minutes totales
      const totalToleranceMinutes = toleranceHours * 60 + toleranceMinutes;
      
      // Ajouter la tolérance à l'heure de début
      const totalMinutes = hours * 60 + minutes + totalToleranceMinutes;
      
      // Calculer les nouvelles heures et minutes
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      // Formater l'heure
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return 'N/A';
    }
  }
}
