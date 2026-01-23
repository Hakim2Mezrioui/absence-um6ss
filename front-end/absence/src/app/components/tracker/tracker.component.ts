import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StudentTrackingService, TrackingResult } from '../../services/student-tracking.service';
import { EtudiantsService } from '../../services/etudiants.service';
import { AuthService } from '../../services/auth.service';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tracker.component.html',
  styleUrl: './tracker.component.css'
})
export class TrackerComponent implements OnInit {
  students: any[] = [];
  filteredStudents: any[] = [];
  searchStudentText: string = '';
  showStudentDropdown: boolean = false;
  private studentDropdownCloseTimeout: any = null;
  selectedStudentId: number | null = null;
  fromDate: string = '';
  toDate: string = '';
  statusFilter: 'all' | 'present' | 'absent' = 'all';
  typeFilter: 'all' | 'cours' | 'examen' = 'all';
  
  loading = false;
  results: TrackingResult[] = [];
  summary: any = null;
  student: any = null;
  error: string | null = null;

  constructor(
    private trackingService: StudentTrackingService,
    private etudiantsService: EtudiantsService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Set default date range to current week
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sunday

    this.fromDate = this.formatDate(startOfWeek);
    this.toDate = this.formatDate(endOfWeek);

    this.loadStudents();
  }

  loadStudents(): void {
    // Utiliser getAllEtudiants() qui applique automatiquement le filtrage par établissement
    // Le backend filtre déjà les étudiants selon l'établissement de l'utilisateur
    // (sauf super-admin et ceux sans établissement)
    this.etudiantsService.getAllEtudiants().subscribe({
      next: (students: any[]) => {
        this.students = students || [];
        this.filteredStudents = this.students;
      },
      error: (error) => {
        console.error('Error loading students:', error);
      }
    });
  }

  filterStudents(): void {
    if (!this.searchStudentText.trim()) {
      this.filteredStudents = this.students;
      return;
    }

    const searchTerm = this.searchStudentText.toLowerCase().trim();
    this.filteredStudents = this.students.filter(student => {
      const fullName = `${student.first_name} ${student.last_name}`.toLowerCase();
      const matricule = (student.matricule || '').toLowerCase();
      const email = (student.email || '').toLowerCase();
      
      return fullName.includes(searchTerm) || 
             matricule.includes(searchTerm) || 
             email.includes(searchTerm);
    });
  }

  selectStudent(student: any): void {
    this.selectedStudentId = student.id;
    this.searchStudentText = `${student.first_name} ${student.last_name} (${student.matricule})`;
    this.showStudentDropdown = false;
    this.filteredStudents = this.students;
  }

  clearStudentSearch(): void {
    this.searchStudentText = '';
    this.filteredStudents = this.students;
    this.showStudentDropdown = false;
    if (this.studentDropdownCloseTimeout) {
      clearTimeout(this.studentDropdownCloseTimeout);
      this.studentDropdownCloseTimeout = null;
    }
  }

  getSelectedStudentName(): string {
    if (!this.selectedStudentId) return '';
    const student = this.students.find(s => s.id === this.selectedStudentId);
    if (student) {
      return `${student.first_name} ${student.last_name} (${student.matricule})`;
    }
    return '';
  }

  openStudentDropdown(): void {
    if (this.studentDropdownCloseTimeout) {
      clearTimeout(this.studentDropdownCloseTimeout);
      this.studentDropdownCloseTimeout = null;
    }
    this.showStudentDropdown = true;
  }

  scheduleCloseStudentDropdown(): void {
    if (this.studentDropdownCloseTimeout) {
      clearTimeout(this.studentDropdownCloseTimeout);
    }
    this.studentDropdownCloseTimeout = setTimeout(() => {
      this.showStudentDropdown = false;
      this.studentDropdownCloseTimeout = null;
    }, 200);
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  track(): void {
    if (!this.selectedStudentId) {
      this.error = 'Veuillez sélectionner un étudiant';
      return;
    }

    if (!this.fromDate || !this.toDate) {
      this.error = 'Veuillez sélectionner une plage de dates';
      return;
    }

    this.loading = true;
    this.error = null;
    this.results = [];
    this.summary = null;
    this.student = null;

    this.trackingService.trackStudent(
      this.selectedStudentId,
      this.fromDate,
      this.toDate,
      this.statusFilter
    ).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.results = response.results || [];
          this.summary = response.summary;
          this.student = response.student;
        } else {
          this.error = response.message || 'Erreur lors du suivi';
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = error.error?.message || 'Erreur lors de la récupération des données';
        console.error('Error tracking student:', error);
      }
    });
  }

  // Getter pour filtrer les résultats selon le typeFilter
  get filteredResults(): TrackingResult[] {
    if (!this.results || this.results.length === 0) {
      return [];
    }

    let filtered = this.results;

    // Filtrer par type (cours/examen)
    if (this.typeFilter !== 'all') {
      filtered = filtered.filter(result => result.type === this.typeFilter);
    }

    return filtered;
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'present': 'Présent',
      'absent': 'Absent',
      'late': 'En retard',
      'left_early': 'Parti tôt',
      'pending_exit': 'Sortie à valider',
      'pending_entry': 'Entrée à valider'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const classes: { [key: string]: string } = {
      'present': 'bg-green-100 text-green-800',
      'absent': 'bg-red-100 text-red-800',
      'late': 'bg-yellow-100 text-yellow-800',
      'left_early': 'bg-orange-100 text-orange-800',
      'pending_exit': 'bg-orange-100 text-orange-800',
      'pending_entry': 'bg-orange-100 text-orange-800'
    };
    return classes[status] || 'bg-gray-100 text-gray-800';
  }

  formatDateOnly(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      // Handle ISO date string (e.g., "2025-11-25T00:00:00.000000Z")
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '-';
    }
  }

  formatTime(timeStr: string): string {
    if (!timeStr) return '-';
    try {
      // Check if it's a full ISO datetime string (e.g., "2025-11-28T16:22:00.000000Z")
      if (timeStr.includes('T') || timeStr.includes('Z')) {
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return '-';
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        });
      }
      // Otherwise, it's just a time string (e.g., "10:38:00" or "16:22:00")
      // Extract HH:MM from HH:MM:SS format
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
      }
      return timeStr.substring(0, 5); // Fallback: take first 5 chars
    } catch (e) {
      return '-';
    }
  }

  formatDateTime(dateStr: string, timeStr?: string): string {
    if (!dateStr) return '-';
    try {
      // If timeStr is provided and is a full datetime, use it
      if (timeStr && (timeStr.includes('T') || timeStr.includes('Z'))) {
        const date = new Date(timeStr);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      }
      
      // Otherwise, parse the date and combine with time if provided
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      
      if (timeStr && !timeStr.includes('T') && !timeStr.includes('Z')) {
        // timeStr is just time (HH:MM:SS), combine with date
        const timeParts = timeStr.split(':');
        if (timeParts.length >= 2) {
          date.setHours(parseInt(timeParts[0], 10));
          date.setMinutes(parseInt(timeParts[1], 10));
        }
      }
      
      return date.toLocaleString('fr-FR', {  
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch (e) {
      return '-';
    }
  }

  formatPunchTime(punchTime: string | null | undefined, dateStr: string): string {
    if (!punchTime) return '-';
    try {
      // If punchTime is a full ISO datetime, use it directly
      if (punchTime.includes('T') || punchTime.includes('Z')) {
        const date = new Date(punchTime);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        }
      }
      
      // Check if punchTime is in "Y-m-d H:i:s" format (from backend)
      // Example: "2025-11-28 16:43:06"
      if (punchTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        // Parse manually to avoid timezone interpretation issues
        // Split the date and time parts
        const [datePart, timePart] = punchTime.split(' ');
        const [year, month, day] = datePart.split('-').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);
        
        // Create date using constructor (this creates a LOCAL date, not UTC)
        // The backend already sends the time in local timezone (after +60min conversion)
        const date = new Date(year, month - 1, day, hour, minute, second || 0);
        
        // Verify the date was created correctly
        if (!isNaN(date.getTime()) && 
            date.getFullYear() === year && 
            date.getMonth() === month - 1 && 
            date.getDate() === day) {
          return date.toLocaleString('fr-FR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
          });
        } else {
          // If date creation failed, log for debugging
          console.error('Date parsing failed:', { punchTime, year, month, day, hour, minute, second, created: date });
        }
      }
      
      // Otherwise, combine with the date (fallback for simple time strings)
      return this.formatDateTime(dateStr, punchTime);
    } catch (e) {
      return '-';
    }
  }

  // Fonction simple pour formater la date/heure sans utiliser Date (évite les problèmes de timezone)
  formatPunchTimeSimple(punchTime: string | null | undefined): string {
    if (!punchTime) return '-';
    
    // Format attendu du backend: "2025-11-28 16:43:06"
    if (punchTime.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
      const [datePart, timePart] = punchTime.split(' ');
      const [year, month, day] = datePart.split('-');
      const [hour, minute] = timePart.split(':');
      
      // Format français: "28/11/2025 16:43" (sans les secondes)
      return `${day}/${month}/${year} ${hour}:${minute}`;
    }
    
    // Si le format ne correspond pas, retourner tel quel (pas de modification des données)
    return punchTime;
  }

  // Exporter les résultats en PDF
  exportToPDF(): void {
    if (!this.filteredResults || this.filteredResults.length === 0) {
      alert('Aucun résultat à exporter');
      return;
    }

    if (!this.student) {
      alert('Aucune information d\'étudiant disponible');
      return;
    }

    const doc = new jsPDF('l', 'mm', 'a4'); // Orientation paysage
    
    // Couleurs élégantes
    const primaryColor: [number, number, number] = [30, 64, 175]; // Bleu UM6SS
    const headerColor: [number, number, number] = [52, 73, 94]; // Gris foncé
    const presentColor: [number, number, number] = [34, 197, 94]; // Vert moderne
    const absentColor: [number, number, number] = [239, 68, 68]; // Rouge moderne
    const lateColor: [number, number, number] = [234, 179, 8]; // Jaune moderne
    const lightGray: [number, number, number] = [243, 244, 246]; // Gris clair
    const borderColor: [number, number, number] = [229, 231, 235]; // Bordure grise
    
    let currentY = 10;
    
    // ===== EN-TÊTE ÉLÉGANT AVEC LOGO =====
    // Note: Le logo sera ajouté de manière synchrone si possible
    // Pour éviter les problèmes de typage TypeScript, on utilise (doc as any)
    try {
      const logoPath = 'assets/logo_um6ss.png';
      const logoWidth = 25;
      const logoHeight = 25;
      const logoX = 14;
      const logoY = currentY;
      
      // Ajouter le logo (si disponible) - utiliser 'as any' pour contourner le typage TypeScript
      (doc as any).addImage(logoPath, 'PNG', logoX, logoY, logoWidth, logoHeight);
    } catch (e) {
      console.warn('Logo non trouvé, continuation sans logo:', e);
    }
    
    // Titre principal à côté du logo
    doc.setFontSize(18);
    (doc as any).setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('RAPPORT DE TRAÇAGE ÉTUDIANT', 45, currentY + 10);
    
    // Sous-titre
    doc.setFontSize(10);
    (doc as any).setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Université Mohammed VI des Sciences de la Santé', 45, currentY + 16);
    
    // Ligne de séparation élégante
    (doc as any).setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
    (doc as any).setLineWidth(0.5);
    (doc as any).line(14, currentY + 22, 277, currentY + 22);
    
    currentY = currentY + 30;
    
    // ===== INFORMATIONS DE L'ÉTUDIANT (Style Card) =====
    (doc as any).setFillColor(lightGray[0], lightGray[1], lightGray[2]);
    (doc as any).rect(14, currentY, 263, 20, 'F');
    
    doc.setFontSize(11);
    (doc as any).setFont('helvetica', 'bold');
    doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
    doc.text('INFORMATIONS ÉTUDIANT', 18, currentY + 7);
    
    doc.setFontSize(9);
    (doc as any).setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    const studentInfo = [
      `Nom complet: ${this.student.first_name} ${this.student.last_name}`,
      `Matricule: ${this.student.matricule}`,
      `Email: ${this.student.email || 'N/A'}`,
      `Période: ${this.formatDateOnly(this.fromDate)} - ${this.formatDateOnly(this.toDate)}`
    ];
    
    let infoX = 18;
    let infoY = currentY + 12;
    studentInfo.forEach((info, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      doc.text(info, infoX + (col * 130), infoY + (row * 5));
    });
    
    currentY = currentY + 25;
    
    // ===== STATISTIQUES (Style Card) =====
    if (this.summary) {
      (doc as any).setFillColor(lightGray[0], lightGray[1], lightGray[2]);
      (doc as any).rect(14, currentY, 263, 18, 'F');
      
      doc.setFontSize(11);
      (doc as any).setFont('helvetica', 'bold');
      doc.setTextColor(headerColor[0], headerColor[1], headerColor[2]);
      doc.text('STATISTIQUES', 18, currentY + 7);
      
      doc.setFontSize(9);
      (doc as any).setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      
      // Statistiques avec badges colorés
      const stats = [
        { label: 'Total', value: this.summary.total, color: primaryColor },
        { label: 'Présents', value: this.summary.presents, color: presentColor },
        { label: 'Absents', value: this.summary.absents, color: absentColor },
        { label: 'En retard', value: this.summary.lates, color: lateColor }
      ];
      
      const statWidth = 60;
      const statStartX = 18;
      stats.forEach((stat, index) => {
        const x = statStartX + (index * statWidth);
        
        // Badge coloré
        (doc as any).setFillColor(stat.color[0], stat.color[1], stat.color[2]);
        (doc as any).rect(x, currentY + 10, 55, 6, 'F');
        
        // Texte blanc sur badge
        doc.setTextColor(255, 255, 255);
        (doc as any).setFont('helvetica', 'bold');
        doc.text(`${stat.label}: ${stat.value}`, x + 2, currentY + 14);
      });
      
      currentY = currentY + 23;
    }
    
    // ===== TABLEAU DES RÉSULTATS =====
    // Préparer les données pour le tableau
    const tableData = this.filteredResults.map(result => {
      const statusLabel = this.getStatusLabel(result.status);
      
      // Ajouter le nom du professeur uniquement pour les cours
      const enseignantName = result.type === 'cours' ? (result.enseignant_name || '') : '';
      
      return [
        this.formatDateOnly(result.date),
        result.type === 'cours' ? 'Cours' : 'Examen',
        result.name || '-',
        this.formatTime(result.heure_debut),
        this.formatTime(result.heure_fin),
        statusLabel,
        enseignantName, // Colonne professeur
        this.formatPunchTimeSimple(result.punch_time || null),
        result.device || '-',
        result.salle || '-'
      ];
    });
    
    // Créer le tableau avec autoTable
    autoTable(doc, {
      head: [['Date', 'Type', 'Nom', 'Heure début', 'Heure fin', 'Statut', 'Professeur', 'Heure pointage', 'Device', 'Salle']],
      body: tableData,
      startY: currentY,
      styles: { 
        fontSize: 7.5, 
        cellPadding: 2.5,
        textColor: [0, 0, 0],
        lineColor: [borderColor[0], borderColor[1], borderColor[2]],
        lineWidth: 0.3
      },
      headStyles: { 
        fillColor: [headerColor[0], headerColor[1], headerColor[2]] as [number, number, number],
        textColor: [255, 255, 255] as [number, number, number],
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 3
      },
      alternateRowStyles: {
        fillColor: [lightGray[0], lightGray[1], lightGray[2]] as [number, number, number]
      },
      columnStyles: {
        0: { cellWidth: 24, halign: 'center' }, // Date
        1: { cellWidth: 18, halign: 'center' }, // Type
        2: { cellWidth: 38, halign: 'left' }, // Nom
        3: { cellWidth: 18, halign: 'center' }, // Heure début
        4: { cellWidth: 18, halign: 'center' }, // Heure fin
        5: { cellWidth: 22, halign: 'center' }, // Statut
        6: { cellWidth: 28, halign: 'left' }, // Professeur
        7: { cellWidth: 28, halign: 'center' }, // Heure pointage
        8: { cellWidth: 28, halign: 'left' }, // Device
        9: { cellWidth: 20, halign: 'left' }  // Salle
      },
      margin: { top: currentY, right: 14, bottom: 20, left: 14 },
      didParseCell: (data: any) => {
        // Vérifier que c'est une ligne de données (pas l'en-tête)
        // autoTable utilise data.section pour distinguer 'head' et 'body'
        const isDataRow = data.section === 'body' || (data.section !== 'head' && data.row.index > 0);
        
        if (!isDataRow) {
          return; // C'est l'en-tête, ne rien faire
        }
        
        // Calculer l'index dans filteredResults
        // Si data.section === 'body', alors data.row.index commence à 0 pour la première ligne de données
        // Si data.section n'est pas défini, alors data.row.index commence à 1 (0 étant l'en-tête)
        let dataIndex: number;
        if (data.section === 'body') {
          dataIndex = data.row.index; // Pour 'body', l'index commence à 0
        } else {
          dataIndex = data.row.index - 1; // Sinon, soustraire 1 car l'index 0 est l'en-tête
        }
        
        // Vérifier que l'index est valide
        if (dataIndex < 0 || dataIndex >= this.filteredResults.length) {
          return;
        }
        
        const result = this.filteredResults[dataIndex];
        if (!result) {
          return;
        }
        
        // Colorer les cellules de statut (colonne index 5)
        if (data.column.index === 5) {
          if (result.status === 'present') {
            data.cell.styles.fillColor = presentColor as [number, number, number];
            data.cell.styles.textColor = [255, 255, 255] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          } else if (result.status === 'absent' || result.status === 'pending_exit' || result.status === 'pending_entry') {
            data.cell.styles.fillColor = absentColor as [number, number, number];
            data.cell.styles.textColor = [255, 255, 255] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          } else if (result.status === 'late') {
            data.cell.styles.fillColor = lateColor as [number, number, number];
            data.cell.styles.textColor = [0, 0, 0] as [number, number, number];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        
        // Style pour la colonne Type (cours/examen) - colonne index 1
        if (data.column.index === 1) {
          if (result.type === 'cours') {
            data.cell.styles.fillColor = [219, 234, 254] as [number, number, number]; // Bleu clair
            data.cell.styles.textColor = [30, 64, 175] as [number, number, number]; // Bleu foncé
          } else if (result.type === 'examen') {
            data.cell.styles.fillColor = [243, 232, 255] as [number, number, number]; // Violet clair
            data.cell.styles.textColor = [147, 51, 234] as [number, number, number]; // Violet foncé
          }
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fontSize = 7;
        }
      },
      didDrawPage: (data: any) => {
        // Ajouter le numéro de page en bas
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Page ${data.pageNumber} sur ${pageCount}`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
        
        // Ajouter un footer avec le logo UM6SS (petit)
        try {
          const footerLogoSize = 8;
          (doc as any).addImage(
            'assets/logo_um6ss.png',
            'PNG',
            doc.internal.pageSize.getWidth() - 30,
            doc.internal.pageSize.getHeight() - 12,
            footerLogoSize,
            footerLogoSize
          );
        } catch (e) {
          // Logo non disponible, continuer sans
        }
      }
    });
    
    // ===== PIED DE PAGE =====
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      // Ligne de séparation en bas
      (doc as any).setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
      (doc as any).setLineWidth(0.5);
      (doc as any).line(14, doc.internal.pageSize.getHeight() - 15, 277, doc.internal.pageSize.getHeight() - 15);
      
      // Texte de copyright
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      (doc as any).setFont('helvetica', 'italic');
      doc.text(
        '© UM6SS - Système de Gestion des Absences - Document généré le ' + new Date().toLocaleDateString('fr-FR'),
        14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'left' }
      );
    }
    
    // Nom du fichier
    const fileName = `rapport_traçage_${this.student.matricule}_${this.fromDate}_${this.toDate}.pdf`;
    
    // Sauvegarder le PDF
    doc.save(fileName);
  }
}

