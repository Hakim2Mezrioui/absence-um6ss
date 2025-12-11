import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BaseApiService } from './base-api.service';
import { UserContextService } from './user-context.service';

export interface TrackingResult {
  type: 'cours' | 'examen';
  id: number;
  name: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  status: 'present' | 'absent' | 'late' | 'left_early' | 'pending_exit' | 'pending_entry';
  punch_time?: string | null | undefined;
  device?: string | null | undefined;
  salle?: string | null | undefined;
  type_cours?: string | null | undefined;
  type_examen?: string | null | undefined;
  absence?: any;
  // Bi-check mode specific fields
  attendance_mode?: 'normal' | 'bicheck';
  punch_in?: string | null | undefined;
  punch_out?: string | null | undefined;
}

export interface TrackingResponse {
  success: boolean;
  student?: any;
  results?: TrackingResult[];
  summary?: {
    total: number;
    presents: number;
    absents: number;
    lates: number;
    pending_exit?: number;
    pending_entry?: number;
  };
  date_range?: {
    from: string;
    to: string;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class StudentTrackingService extends BaseApiService {
  constructor(
    protected override http: HttpClient,
    protected override userContextService: UserContextService
  ) {
    super(http, userContextService);
  }

  trackStudent(
    studentId: number,
    from: string,
    to: string,
    statusFilter: 'all' | 'present' | 'absent' = 'all'
  ): Observable<TrackingResponse> {
    let params = new HttpParams()
      .set('student_id', studentId.toString())
      .set('from', from)
      .set('to', to)
      .set('status_filter', statusFilter);

    return this.http.get<TrackingResponse>(`${this.API_URL}/student-tracking/track`, { params });
  }
}

