import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AttendanceFilters {
  date?: string;
  hour1?: string;
  hour2?: string;
  promotion_id?: number;
  etablissement_id?: number;
  group_id?: number;
  option_id?: number;
  ville_id?: number;
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
    created_at: string;
    updated_at: string;
  };
  etablissement: {
    id: number;
    name: string;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  ville: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  group: {
    id: number;
    title: string;
    promotion_id: number;
    etablissement_id: number;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  option: {
    id: number;
    name: string;
    description: string;
    etablissement_id: number;
    created_at: string;
    updated_at: string;
  };
  status: string;
  punch_time?: {
    time: string;
    device: string;
  };
}

export interface AttendanceResponse {
  message: string;
  date: string;
  heure_debut_poigntage?: string;
  heure_debut: string;
  heure_fin: string;
  tolerance?: number;
  salle?: string;
  examen_id?: number;
  examen?: {
    id: number;
    date: string;
    heure_debut: string;
    heure_fin: string;
    heure_debut_poigntage?: string;
    tolerance: number;
    salle?: {
      id: number;
      name: string;
    };
    promotion?: {
      id: number;
      name: string;
    };
    etablissement?: {
      id: number;
      name: string;
    };
    ville?: {
      id: number;
      name: string;
    };
    type_examen?: {
      id: number;
      name: string;
    };
    option?: {
      id: number;
      name: string;
    };
    created_at: string;
    updated_at: string;
  };
  total_etudiants: number;
  presents: number;
  absents: number;
  etudiants: StudentAttendance[];
  status: number;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/etudiants/attendance`;

  constructor(private http: HttpClient) {}

  getStudentAttendance(filters: AttendanceFilters): Observable<AttendanceResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof AttendanceFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<AttendanceResponse>(this.apiUrl, { params });
  }
}
