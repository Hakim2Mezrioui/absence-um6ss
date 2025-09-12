import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { NotificationService } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';
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
  created_at: string;
  updated_at: string;
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
  
  constructor() {
    this.route = inject(ActivatedRoute);
    this.router = inject(Router);
    this.notificationService = inject(NotificationService);
    this.cdr = inject(ChangeDetectorRef);
  }
  
  ngOnInit() {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.rattrapageId = +params['id'];
      if (this.rattrapageId) {
        this.loadRattrapageAttendance();
      }
    });
  }
  
  ngOnDestroy() {
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
            
            this.groupStudentsAlphabetically();
            this.loading = false;
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
    
    // Filtre par recherche
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(student => 
        student.first_name.toLowerCase().includes(searchLower) ||
        student.last_name.toLowerCase().includes(searchLower) ||
        student.matricule.toLowerCase().includes(searchLower)
      );
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
      case 'présent': return 'bg-green-100 text-green-800';
      case 'absent': return 'bg-red-100 text-red-800';
      case 'en retard': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }
  
  getStatusIcon(status: string): string {
    switch (status) {
      case 'present': return 'check_circle';
      case 'absent': return 'cancel';
      case 'late': return 'schedule';
      case 'présent': return 'check_circle';
      case 'absent': return 'cancel';
      case 'en retard': return 'schedule';
      default: return 'help';
    }
  }
  
  getStatusText(status: string): string {
    switch (status) {
      case 'present': return 'Présent';
      case 'absent': return 'Absent';
      case 'late': return 'En retard';
      case 'présent': return 'Présent';
      case 'absent': return 'Absent';
      case 'en retard': return 'En retard';
      default: return 'Inconnu';
    }
  }
  
  formatPunchTime(timeString: string): string {
    if (!timeString) return 'Non pointé';
    
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.error('Erreur lors du formatage de l\'heure:', error);
      return 'Heure invalide';
    }
  }
  
  goBack() {
    this.router.navigate(['/dashboard/rattrapages']);
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
