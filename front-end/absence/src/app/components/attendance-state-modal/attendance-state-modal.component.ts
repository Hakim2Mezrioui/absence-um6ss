import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AttendanceStateService, AttendanceState } from '../../services/attendance-state.service';

@Component({
  selector: 'app-attendance-state-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance-state-modal.component.html',
  styleUrl: './attendance-state-modal.component.css'
})
export class AttendanceStateModalComponent implements OnInit {
  @Input() isOpen = false;
  @Input() student: any = null;
  @Input() coursId: number | null = null;
  @Input() examenId: number | null = null;
  @Input() currentStatus: string = 'absent';
  @Output() close = new EventEmitter<void>();
  @Output() stateUpdated = new EventEmitter<any>();

  selectedStatus: string = 'absent';
  motif: string = '';
  justificatif: string = '';
  loading = false;
  error = '';

  statusOptions = [
    { value: 'present', label: 'Présent', color: 'text-green-600' },
    { value: 'late', label: 'En retard', color: 'text-yellow-600' },
    { value: 'absent', label: 'Absent', color: 'text-red-600' },
    { value: 'left_early', label: 'Parti tôt', color: 'text-orange-600' }
  ];

  constructor(private attendanceStateService: AttendanceStateService) {}

  ngOnInit() {
    if (this.student) {
      this.selectedStatus = this.currentStatus;
      this.loadCurrentState();
    }
  }

  loadCurrentState() {
    if (!this.student) return;

    const observable = this.coursId 
      ? this.attendanceStateService.getCoursAttendanceState(this.coursId, this.student.id)
      : this.attendanceStateService.getExamenAttendanceState(this.examenId!, this.student.id);

    observable.subscribe({
      next: (response) => {
        this.selectedStatus = response.status;
        if (response.absence) {
          this.motif = response.absence.motif || '';
          this.justificatif = response.absence.justificatif || '';
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'état actuel:', error);
      }
    });
  }

  onStatusChange() {
    // Réinitialiser les champs si on passe à "present"
    if (this.selectedStatus === 'present') {
      this.motif = '';
      this.justificatif = '';
    }
  }

  onSubmit() {
    if (!this.student || (!this.coursId && !this.examenId)) {
      this.error = 'Données manquantes';
      return;
    }

    this.loading = true;
    this.error = '';

    const data = {
      etudiant_id: this.student.id,
      status: this.selectedStatus as 'present' | 'late' | 'absent' | 'left_early',
      motif: this.motif || undefined,
      justificatif: this.justificatif || undefined
    };

    const observable = this.coursId 
      ? this.attendanceStateService.updateCoursAttendanceState({ cours_id: this.coursId, ...data })
      : this.attendanceStateService.updateExamenAttendanceState({ examen_id: this.examenId!, ...data });

    observable.subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          this.stateUpdated.emit({
            student: this.student,
            newStatus: this.selectedStatus,
            absence: response.absence
          });
          this.closeModal();
        } else {
          this.error = response.message;
        }
      },
      error: (error) => {
        this.loading = false;
        this.error = 'Erreur lors de la mise à jour: ' + (error.message || 'Erreur inconnue');
        console.error('Erreur:', error);
      }
    });
  }

  closeModal() {
    this.isOpen = false;
    this.selectedStatus = 'absent';
    this.motif = '';
    this.justificatif = '';
    this.error = '';
    this.close.emit();
  }

  getStatusDisplayInfo(status: string) {
    return this.attendanceStateService.getStatusDisplayInfo(status);
  }

  isJustificationRequired(): boolean {
    return ['late', 'absent', 'left_early'].includes(this.selectedStatus);
  }

  canSubmit(): boolean {
    if (this.selectedStatus === 'present') {
      return true;
    }
    
    if (this.isJustificationRequired()) {
      return this.motif.trim().length > 0;
    }
    
    return true;
  }
}
