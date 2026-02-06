import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ActivityLog {
  id: number;
  log_name: string;
  description: string;
  subject_type: string | null;
  subject_id: number | null;
  causer_type: string | null;
  causer_id: number | null;
  properties: any;
  created_at: string;
  updated_at: string;
  causer?: {
    id: number;
    first_name?: string;
    last_name?: string;
    name?: string;
    email?: string;
  };
  subject?: any;
}

export interface ActivityLogFilters {
  causer_type?: string;
  causer_id?: number;
  subject_type?: string;
  subject_id?: number;
  description?: string;
  date_from?: string;
  date_to?: string;
  per_page?: number;
  page?: number;
}

export interface ActivityLogResponse {
  data: ActivityLog[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ActivityLogStatistics {
  total: number;
  today: number;
  this_week: number;
  this_month: number;
  by_action: Array<{
    description: string;
    count: number;
  }>;
  by_user: Array<{
    causer_type: string;
    causer_id: number;
    count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class ActivityLogService {
  private apiUrl = `${environment.apiUrl}/activity-logs`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer les logs avec filtres et pagination
   */
  getLogs(filters: ActivityLogFilters = {}): Observable<ActivityLogResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ActivityLogFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ActivityLogResponse>(this.apiUrl, { params });
  }

  /**
   * Récupérer un log spécifique
   */
  getLog(id: number): Observable<ActivityLog> {
    return this.http.get<ActivityLog>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer les statistiques
   */
  getStatistics(): Observable<ActivityLogStatistics> {
    return this.http.get<ActivityLogStatistics>(`${this.apiUrl}/statistics`);
  }
}











