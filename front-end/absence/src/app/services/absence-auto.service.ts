import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CreateAbsencesForExamenRequest {
  examen_id: number;
}

export interface CreateAbsencesForDateRequest {
  date: string;
}

export interface CreateAbsencesFromAttendanceRequest {
  examen_id: number;
  etudiants_absents: {
    etudiant_id: number;
    status: 'absent' | 'en retard';
    punch_time?: string;
  }[];
}

export interface AbsenceStatisticsRequest {
  examen_id: number;
}

export interface AbsenceResponse {
  message: string;
  data: {
    examen: {
      id: number;
      title: string;
      date: string;
      heure_debut?: string;
      heure_fin?: string;
    };
    statistiques: {
      total_etudiants?: number;
      absences_creees: number;
      absences_existantes?: number;
      taux_absence?: number;
      absences_justifiees?: number;
      absences_non_justifiees?: number;
    };
    absences: {
      id: number;
      etudiant?: string;
      matricule?: string;
      etudiant_id?: number;
      type_absence: string;
      status?: string;
      date_absence: string;
    }[];
  };
  status: number;
}

export interface AbsenceStatisticsResponse {
  message: string;
  data: {
    examen: {
      id: number;
      title: string;
      date: string;
      heure_debut: string;
      heure_fin: string;
    };
    statistiques: {
      total_etudiants: number;
      total_absences: number;
      taux_absence: number;
      absences_justifiees: number;
      absences_non_justifiees: number;
      absences_par_type: { [key: string]: number };
    };
    absences: {
      id: number;
      etudiant: string;
      matricule: string;
      type_absence: string;
      justifiee: boolean;
      motif: string;
      date_absence: string;
    }[];
  };
  status: number;
}

@Injectable({
  providedIn: 'root'
})
export class AbsenceAutoService {
  private apiUrl = `${environment.apiUrl}/absences/auto`;

  constructor(private http: HttpClient) {}

  /**
   * Crée automatiquement les absences pour un examen spécifique
   */
  createAbsencesForExamen(request: CreateAbsencesForExamenRequest): Observable<AbsenceResponse> {
    return this.http.post<AbsenceResponse>(`${this.apiUrl}/create-for-examen`, request);
  }

  /**
   * Crée automatiquement les absences pour tous les examens d'une date donnée
   */
  createAbsencesForDate(request: CreateAbsencesForDateRequest): Observable<AbsenceResponse> {
    return this.http.post<AbsenceResponse>(`${this.apiUrl}/create-for-date`, request);
  }

  /**
   * Crée automatiquement les absences basées sur les données d'attendance
   */
  createAbsencesFromAttendance(request: CreateAbsencesFromAttendanceRequest): Observable<AbsenceResponse> {
    return this.http.post<AbsenceResponse>(`${this.apiUrl}/create-from-attendance`, request);
  }

  /**
   * Obtient les statistiques des absences pour un examen
   */
  getAbsenceStatistics(request: AbsenceStatisticsRequest): Observable<AbsenceStatisticsResponse> {
    let params = new HttpParams();
    params = params.set('examen_id', request.examen_id.toString());
    
    return this.http.get<AbsenceStatisticsResponse>(`${this.apiUrl}/statistics`, { params });
  }
}
