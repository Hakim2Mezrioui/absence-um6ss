import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CoursAttendanceData {
  cours: {
    id: number;
    name: string;
    date: string;
    pointage_start_hour: string;
    heure_debut: string;
    heure_fin: string;
    tolerance: string;
    annee_universitaire: string;
    etablissement_id: number;
    promotion_id: number;
    type_cours_id: number;
    salle_id: number;
    option_id?: number;
    statut_temporel?: 'passé' | 'en_cours' | 'futur';
    created_at: string;
    updated_at: string;
    etablissement?: { id: number; name: string };
    promotion?: { id: number; name: string };
    type_cours?: { id: number; name: string };
    salle?: { id: number; name: string };
    option?: { id: number; name: string };
  };
  students: StudentAttendance[];
  statistics: {
    total_students: number;
    presents: number;
    absents: number;
    lates: number;
    excused: number;
  };
}

export interface StudentAttendance {
  id: number;
  first_name: string;
  last_name: string;
  matricule: string;
  email: string;
  photo?: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  punch_time?: {
    time: string;
    device: string;
  };
  promotion?: { id: number; name: string };
  group?: { id: number; title: string };
  option?: { id: number; name: string };
  etablissement?: { id: number; name: string };
  ville?: { id: number; name: string };
}

export interface AttendanceFilters {
  cours_id?: number;
  status?: string;
  search?: string;
  page?: number;
  size?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CoursAttendanceService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  /**
   * Récupérer les données d'attendance pour un cours spécifique
   */
  getCoursAttendance(coursId: number, filters?: any): Observable<CoursAttendanceData> {
    let params = new HttpParams();
    
    if (filters) {
      if (filters.promotion_id) params = params.set('promotion_id', filters.promotion_id);
      if (filters.etablissement_id) params = params.set('etablissement_id', filters.etablissement_id);
      if (filters.ville_id) params = params.set('ville_id', filters.ville_id);
      if (filters.group_id) params = params.set('group_id', filters.group_id);
      if (filters.option_id) params = params.set('option_id', filters.option_id);
    }
    
    return this.http.get<CoursAttendanceData>(`${this.apiUrl}/cours/${coursId}/attendance`, { params });
  }

  /**
   * Récupérer la liste des étudiants avec leur statut d'attendance
   */
  getStudentsAttendance(filters: AttendanceFilters = {}): Observable<{
    data: StudentAttendance[];
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  }> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof AttendanceFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<{
      data: StudentAttendance[];
      current_page: number;
      last_page: number;
      total: number;
      per_page: number;
    }>(`${this.apiUrl}/students`, { params });
  }

  /**
   * Mettre à jour le statut d'attendance d'un étudiant
   */
  updateStudentAttendance(coursId: number, studentId: number, status: string): Observable<StudentAttendance> {
    return this.http.put<StudentAttendance>(`${this.apiUrl}/${coursId}/students/${studentId}`, {
      status: status
    });
  }

  /**
   * Marquer un étudiant comme présent
   */
  markPresent(coursId: number, studentId: number): Observable<StudentAttendance> {
    return this.updateStudentAttendance(coursId, studentId, 'present');
  }

  /**
   * Marquer un étudiant comme absent
   */
  markAbsent(coursId: number, studentId: number): Observable<StudentAttendance> {
    return this.updateStudentAttendance(coursId, studentId, 'absent');
  }

  /**
   * Marquer un étudiant comme en retard
   */
  markLate(coursId: number, studentId: number): Observable<StudentAttendance> {
    return this.updateStudentAttendance(coursId, studentId, 'late');
  }

  /**
   * Marquer un étudiant comme excusé
   */
  markExcused(coursId: number, studentId: number): Observable<StudentAttendance> {
    return this.updateStudentAttendance(coursId, studentId, 'excused');
  }

  /**
   * Exporter les données d'attendance en CSV
   */
  exportAttendanceCSV(coursId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${coursId}/export/csv`, {
      responseType: 'blob'
    });
  }

  /**
   * Exporter les données d'attendance en Excel
   */
  exportAttendanceExcel(coursId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${coursId}/export/excel`, {
      responseType: 'blob'
    });
  }

  /**
   * Récupérer les statistiques d'attendance pour un cours
   */
  getAttendanceStatistics(coursId: number): Observable<{
    total_students: number;
    presents: number;
    absents: number;
    lates: number;
    excused: number;
    attendance_rate: number;
  }> {
    return this.http.get<{
      total_students: number;
      presents: number;
      absents: number;
      lates: number;
      excused: number;
      attendance_rate: number;
    }>(`${this.apiUrl}/${coursId}/statistics`);
  }

  /**
   * Récupérer l'historique des présences d'un étudiant pour un cours
   */
  getStudentAttendanceHistory(studentId: number, coursId?: number): Observable<{
    student: StudentAttendance;
    attendance_history: Array<{
      cours_id: number;
      cours_name: string;
      date: string;
      status: string;
      punch_time?: string;
      device?: string;
    }>;
  }> {
    let params = new HttpParams();
    if (coursId) {
      params = params.set('cours_id', coursId.toString());
    }

    return this.http.get<{
      student: StudentAttendance;
      attendance_history: Array<{
        cours_id: number;
        cours_name: string;
        date: string;
        status: string;
        punch_time?: string;
        device?: string;
      }>;
    }>(`${this.apiUrl}/students/${studentId}/history`, { params });
  }
}
