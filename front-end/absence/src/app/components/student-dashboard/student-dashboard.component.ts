import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';
import { Cours } from '../../services/cours.service';
import { Examen } from '../../services/examens.service';
import { QrScannerComponent } from '../qr-scanner/qr-scanner.component';

interface MyCoursResponse {
  status: string;
  cours_en_cours: Cours[];
  cours_futurs: Cours[];
  total_en_cours: number;
  total_futurs: number;
}

interface MyExamensResponse {
  status: string;
  examens_en_cours: Examen[];
  examens_futurs: Examen[];
  total_en_cours: number;
  total_futurs: number;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, QrScannerComponent],
  templateUrl: './student-dashboard.component.html',
  styleUrl: './student-dashboard.component.css'
})
export class StudentDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  coursEnCours: Cours[] = [];
  coursFuturs: Cours[] = [];
  examensEnCours: Examen[] = [];
  examensFuturs: Examen[] = [];
  
  loadingCours = false;
  loadingExamens = false;
  errorCours: string | null = null;
  errorExamens: string | null = null;
  
  currentUser: any = null;

  // Drawer / navigation
  isDrawerOpen = false;
  activeSection: 'cours' | 'examens' | 'absences' = 'cours';
  
  // QR Scanner
  isQrScannerOpen = false;
  
  // Sub-tabs pour cours et examens
  activeCoursTab: 'en_cours' | 'a_venir' = 'en_cours';
  activeExamensTab: 'en_cours' | 'a_venir' = 'en_cours';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Vérifier que l'utilisateur est un étudiant
    if (!this.authService.isEtudiant()) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUser = this.authService.getCurrentUser();
    this.loadCours();
    this.loadExamens();
    
    // Écouter la fermeture du scanner QR
    window.addEventListener('qr-scanner-close', () => {
      this.isQrScannerOpen = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Drawer
  toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
  }

  closeDrawer(): void {
    this.isDrawerOpen = false;
  }

  navigateTo(section: 'cours' | 'examens' | 'absences'): void {
    this.activeSection = section;
    this.closeDrawer();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadCours(): void {
    this.loadingCours = true;
    this.errorCours = null;

    this.http.get<MyCoursResponse>(`${environment.apiUrl}/etudiants/me/cours`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.coursEnCours = response.cours_en_cours || [];
          this.coursFuturs = response.cours_futurs || [];
          this.loadingCours = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des cours:', error);
          this.errorCours = error?.error?.message || 'Erreur lors du chargement des cours';
          this.loadingCours = false;
        }
      });
  }

  loadExamens(): void {
    this.loadingExamens = true;
    this.errorExamens = null;

    this.http.get<MyExamensResponse>(`${environment.apiUrl}/etudiants/me/examens`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.examensEnCours = response.examens_en_cours || [];
          this.examensFuturs = response.examens_futurs || [];
          this.loadingExamens = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des examens:', error);
          this.errorExamens = error?.error?.message || 'Erreur lors du chargement des examens';
          this.loadingExamens = false;
        }
      });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  formatTime(timeString: string): string {
    if (!timeString) return '';
    return timeString.substring(0, 5);
  }

  getStatusBadgeClass(item: Cours | Examen): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === today.getTime()) {
      return 'bg-blue-100 text-blue-800';
    } else if (itemDate > today) {
      return 'bg-green-100 text-green-800';
    } else {
      return 'bg-gray-100 text-gray-800';
    }
  }

  getStatusText(item: Cours | Examen): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(item.date);
    itemDate.setHours(0, 0, 0, 0);

    if (itemDate.getTime() === today.getTime()) {
      return 'Aujourd\'hui';
    } else if (itemDate > today) {
      return 'À venir';
    } else {
      return 'Passé';
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 18) {
      return 'Bonjour';
    } else {
      return 'Bonsoir';
    }
  }

  openQrScanner(): void {
    this.isQrScannerOpen = true;
  }

  closeQrScanner(): void {
    this.isQrScannerOpen = false;
  }
}
