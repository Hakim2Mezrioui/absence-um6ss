import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { AttendanceService, AttendanceFilters, AttendanceResponse, StudentAttendance } from '../../services/attendance.service';
import { NotificationService } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

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
  examStartTime = '';
  examEndTime = '';
  
  private destroy$ = new Subject<void>();

  constructor(
    private attendanceService: AttendanceService,
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
          this.examStartTime = response.heure_debut;
          this.examEndTime = response.heure_fin;
          this.loading = false;
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement de l\'attendance:', err);
          this.error = 'Erreur lors du chargement des données d\'attendance';
          this.loading = false;
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
}
