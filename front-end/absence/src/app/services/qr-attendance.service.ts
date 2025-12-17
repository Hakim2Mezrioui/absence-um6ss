import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QrAttendanceStudent {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  status: 'présent' | 'absent';
  scan_time: string | null;
  scan_status: string | null;
  group?: { id: number; title: string };
  option?: { id: number; name: string };
  promotion?: { id: number; name: string };
  etablissement?: { id: number; name: string };
  ville?: { id: number; name: string };
}

export interface QrAttendanceExamen {
  id: number;
  title: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  heure_debut_poigntage?: string;
  tracking_method: string;
  promotion?: { id: number; name: string };
  group?: { id: number; title: string };
  option?: { id: number; name: string };
  salle?: { id: number; name: string };
  ville?: { id: number; name: string };
  etablissement?: { id: number; name: string };
  typeExamen?: { id: number; name: string };
}

export interface QrAttendanceResponse {
  success: boolean;
  data: {
    examen: QrAttendanceExamen;
    etudiants: QrAttendanceStudent[];
    total_etudiants: number;
    presents: number;
    absents: number;
    date: string;
    heure_debut: string;
    heure_fin: string;
    heure_debut_poigntage?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class QrAttendanceService {
  private readonly apiUrl = `${environment.apiUrl}/qr-attendance`;

  constructor(private http: HttpClient) {}

  /**
   * Récupère les données de présence QR pour un examen
   */
  getExamenAttendance(examenId: number): Observable<QrAttendanceResponse> {
    return this.http.get<QrAttendanceResponse>(`${this.apiUrl}/examens/${examenId}/attendance`);
  }

  /**
   * Récupère les données de présence QR pour un cours
   */
  getCoursAttendance(coursId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/cours/${coursId}`);
  }
}

