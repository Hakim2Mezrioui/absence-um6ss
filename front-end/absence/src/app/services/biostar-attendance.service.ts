import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BiostarPunchData {
  id: number;
  student_id: string;
  punch_time: string;
  device: string;
  device_name?: string;
  location?: string;
}

export interface BiostarAttendanceRequest {
  cours_id?: number;
  examen_id?: number;
  date: string;
  start_time?: string;
  end_time?: string;
  student_ids?: string[];
}

export interface BiostarAttendanceResponse {
  success: boolean;
  data: {
    punches: BiostarPunchData[];
    total_punches: number;
    students_with_punches: number;
    students_without_punches: number;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class BiostarAttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/biostar-attendance`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer les données de pointage depuis Biostar pour un cours
   */
  getCoursAttendanceFromBiostar(request: BiostarAttendanceRequest): Observable<BiostarAttendanceResponse> {
    let params = new HttpParams();
    
    if (request.cours_id) {
      params = params.set('cours_id', request.cours_id.toString());
    }
    if (request.date) {
      params = params.set('date', request.date);
    }
    if (request.start_time) {
      params = params.set('start_time', request.start_time);
    }
    if (request.end_time) {
      params = params.set('end_time', request.end_time);
    }
    if (request.student_ids && request.student_ids.length > 0) {
      params = params.set('student_ids', request.student_ids.join(','));
    }

    return this.http.get<BiostarAttendanceResponse>(`${this.apiUrl}/cours`, { params });
  }

  /**
   * Récupérer les données de pointage depuis Biostar pour un examen
   */
  getExamenAttendanceFromBiostar(request: BiostarAttendanceRequest): Observable<BiostarAttendanceResponse> {
    let params = new HttpParams();
    
    if (request.examen_id) {
      params = params.set('examen_id', request.examen_id.toString());
    }
    if (request.date) {
      params = params.set('date', request.date);
    }
    if (request.start_time) {
      params = params.set('start_time', request.start_time);
    }
    if (request.end_time) {
      params = params.set('end_time', request.end_time);
    }
    if (request.student_ids && request.student_ids.length > 0) {
      params = params.set('student_ids', request.student_ids.join(','));
    }

    return this.http.get<BiostarAttendanceResponse>(`${this.apiUrl}/examen`, { params });
  }

  /**
   * Récupérer les données de pointage depuis Biostar pour une ville spécifique
   */
  getAttendanceFromBiostarByVille(villeId: number, request: BiostarAttendanceRequest): Observable<BiostarAttendanceResponse> {
    let params = new HttpParams();
    
    params = params.set('ville_id', villeId.toString());
    if (request.date) {
      params = params.set('date', request.date);
    }
    if (request.start_time) {
      params = params.set('start_time', request.start_time);
    }
    if (request.end_time) {
      params = params.set('end_time', request.end_time);
    }
    if (request.student_ids && request.student_ids.length > 0) {
      params = params.set('student_ids', request.student_ids.join(','));
    }

    return this.http.get<BiostarAttendanceResponse>(`${this.apiUrl}/ville`, { params });
  }

  /**
   * Synchroniser les données de pointage avec les étudiants d'un cours
   */
  syncCoursAttendanceWithBiostar(coursId: number, date: string, startTime?: string, endTime?: string): Observable<BiostarAttendanceResponse> {
    const request: BiostarAttendanceRequest = {
      cours_id: coursId,
      date: date,
      start_time: startTime,
      end_time: endTime
    };

    return this.getCoursAttendanceFromBiostar(request);
  }

  /**
   * Synchroniser les données de pointage avec les étudiants d'un examen
   */
  syncExamenAttendanceWithBiostar(examenId: number, date: string, startTime?: string, endTime?: string): Observable<BiostarAttendanceResponse> {
    const request: BiostarAttendanceRequest = {
      examen_id: examenId,
      date: date,
      start_time: startTime,
      end_time: endTime
    };

    return this.getExamenAttendanceFromBiostar(request);
  }

  /**
   * Tester la connexion à la base de données Biostar
   */
  testBiostarConnection(): Observable<{ success: boolean; message: string; data?: any }> {
    return this.http.get<{ success: boolean; message: string; data?: any }>(`${this.apiUrl}/test-connection`);
  }

  /**
   * Obtenir les statistiques de pointage depuis Biostar
   */
  getBiostarStatistics(villeId: number, date: string): Observable<{
    success: boolean;
    data: {
      total_punches: number;
      unique_students: number;
      devices_used: string[];
      time_range: {
        first_punch: string;
        last_punch: string;
      };
    };
    message: string;
  }> {
    let params = new HttpParams();
    params = params.set('ville_id', villeId.toString());
    params = params.set('date', date);

    return this.http.get<{
      success: boolean;
      data: {
        total_punches: number;
        unique_students: number;
        devices_used: string[];
        time_range: {
          first_punch: string;
          last_punch: string;
        };
      };
      message: string;
    }>(`${this.apiUrl}/statistics`, { params });
  }
}
