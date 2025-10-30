import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AttendanceState {
  etudiant_id: number;
  status: 'present' | 'late' | 'absent' | 'left_early';
  motif?: string;
  justificatif?: string;
}

export interface AttendanceStateResponse {
  success: boolean;
  message: string;
  etudiant?: any;
  cours?: any;
  examen?: any;
  status?: string;
  absence?: any;
}

export interface BulkAttendanceStateResponse {
  success: boolean;
  message: string;
  results: AttendanceStateResponse[];
  errors: any[];
  total_processed: number;
  successful: number;
  failed: number;
}

export interface AttendanceStateInfo {
  status: string;
  absence: any;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceStateService {
  private apiUrl = 'http://10.0.244.100:8000/api/attendance-states';

  constructor(private http: HttpClient) { }

  /**
   * Modifier l'état de présence d'un étudiant pour un cours
   */
  updateCoursAttendanceState(data: {
    cours_id: number;
    etudiant_id: number;
    status: 'present' | 'late' | 'absent' | 'left_early';
    motif?: string;
    justificatif?: string;
  }): Observable<AttendanceStateResponse> {
    return this.http.post<AttendanceStateResponse>(`${this.apiUrl}/cours/update`, data);
  }

  /**
   * Modifier l'état de présence d'un étudiant pour un examen
   */
  updateExamenAttendanceState(data: {
    examen_id: number;
    etudiant_id: number;
    status: 'present' | 'late' | 'absent' | 'left_early';
    motif?: string;
    justificatif?: string;
  }): Observable<AttendanceStateResponse> {
    return this.http.post<AttendanceStateResponse>(`${this.apiUrl}/examen/update`, data);
  }

  /**
   * Obtenir l'état actuel d'un étudiant pour un cours
   */
  getCoursAttendanceState(coursId: number, etudiantId: number): Observable<AttendanceStateInfo> {
    const params = new HttpParams()
      .set('cours_id', coursId.toString())
      .set('etudiant_id', etudiantId.toString());
    
    return this.http.get<AttendanceStateInfo>(`${this.apiUrl}/cours/get`, { params });
  }

  /**
   * Obtenir l'état actuel d'un étudiant pour un examen
   */
  getExamenAttendanceState(examenId: number, etudiantId: number): Observable<AttendanceStateInfo> {
    const params = new HttpParams()
      .set('examen_id', examenId.toString())
      .set('etudiant_id', etudiantId.toString());
    
    return this.http.get<AttendanceStateInfo>(`${this.apiUrl}/examen/get`, { params });
  }

  /**
   * Justifier une absence
   */
  justifyAbsence(data: {
    absence_id: number;
    motif: string;
    justificatif: string;
  }): Observable<AttendanceStateResponse> {
    return this.http.post<AttendanceStateResponse>(`${this.apiUrl}/justify`, data);
  }

  /**
   * Obtenir tous les états possibles
   */
  getAvailableStatuses(): Observable<{statuses: {[key: string]: string}}> {
    return this.http.get<{statuses: {[key: string]: string}}>(`${this.apiUrl}/available-statuses`);
  }

  /**
   * Modifier l'état de présence en masse pour un cours
   */
  updateCoursAttendanceStatesBulk(data: {
    cours_id: number;
    attendance_states: AttendanceState[];
  }): Observable<BulkAttendanceStateResponse> {
    return this.http.post<BulkAttendanceStateResponse>(`${this.apiUrl}/cours/bulk-update`, data);
  }

  /**
   * Modifier l'état de présence en masse pour un examen
   */
  updateExamenAttendanceStatesBulk(data: {
    examen_id: number;
    attendance_states: AttendanceState[];
  }): Observable<BulkAttendanceStateResponse> {
    return this.http.post<BulkAttendanceStateResponse>(`${this.apiUrl}/examen/bulk-update`, data);
  }

  /**
   * Obtenir les couleurs et icônes pour les statuts
   */
  getStatusDisplayInfo(status: string): {color: string, icon: string, label: string} {
    switch (status) {
      case 'present':
        return {
          color: 'text-green-600 bg-green-100',
          icon: 'check_circle',
          label: 'Présent'
        };
      case 'late':
        return {
          color: 'text-yellow-600 bg-yellow-100',
          icon: 'schedule',
          label: 'En retard'
        };
      case 'absent':
        return {
          color: 'text-red-600 bg-red-100',
          icon: 'cancel',
          label: 'Absent'
        };
      case 'left_early':
        return {
          color: 'text-orange-600 bg-orange-100',
          icon: 'exit_to_app',
          label: 'Parti tôt'
        };
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: 'help',
          label: 'Inconnu'
        };
    }
  }

  /**
   * Obtenir les options de statut pour les formulaires
   */
  getStatusOptions(): Array<{value: string, label: string, color: string}> {
    return [
      { value: 'present', label: 'Présent', color: 'text-green-600' },
      { value: 'late', label: 'En retard', color: 'text-yellow-600' },
      { value: 'absent', label: 'Absent', color: 'text-red-600' },
      { value: 'left_early', label: 'Parti tôt', color: 'text-orange-600' }
    ];
  }
}
