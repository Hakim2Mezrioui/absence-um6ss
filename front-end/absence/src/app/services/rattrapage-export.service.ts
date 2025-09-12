import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface RattrapageAttendanceData {
  rattrapage: {
    id: number;
    name: string;
    date: string;
    pointage_start_hour: string;
    start_hour: string;
    end_hour: string;
    tolerance?: number;
  };
  students: Array<{
    id: number;
    matricule: string;
    first_name: string;
    last_name: string;
    email: string;
    photo: string | null;
    promotion: {
      id: number;
      name: string;
    };
    etablissement: {
      id: number;
      name: string;
    };
    ville: {
      id: number;
      name: string;
    };
    group: {
      id: number;
      title: string;
    };
    option: {
      id: number;
      name: string;
    };
    status: string;
    punch_time?: {
      time: string;
      device: string;
    };
    notes?: string;
  }>;
  statistics: {
    total_students: number;
    presents: number;
    absents: number;
    lates: number;
    excused: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class RattrapageExportService {
  private apiUrl = `${environment.apiUrl}/rattrapages`;

  constructor(private http: HttpClient) {}

  /**
   * Exporter les données d'attendance d'un rattrapage en CSV
   */
  exportAttendanceCSV(rattrapageId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${rattrapageId}/export/csv`, {
      responseType: 'blob'
    });
  }

  /**
   * Exporter les données d'attendance d'un rattrapage en Excel
   */
  exportAttendanceExcel(rattrapageId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${rattrapageId}/export/excel`, {
      responseType: 'blob'
    });
  }

  /**
   * Récupérer les données d'attendance d'un rattrapage
   */
  getAttendanceData(rattrapageId: number): Observable<RattrapageAttendanceData> {
    return this.http.get<RattrapageAttendanceData>(`${this.apiUrl}/${rattrapageId}/attendance`);
  }
}
