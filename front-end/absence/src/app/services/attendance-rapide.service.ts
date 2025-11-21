import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AttendanceRapideImportRequest {
  file: File;
  etablissement_id: number;
  ville_id: number;
}

export interface AttendanceRapideLancerRequest {
  etablissement_id: number;
}

export interface AttendanceRapideStudent {
  matricule: string;
  nom?: string;
  prenom?: string;
  cne?: string;
  cin?: string;
  apogee?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  promotion_name?: string;
  etablissement_name?: string;
  ville_name?: string;
  group_title?: string;
  option_name?: string;
  status?: 'present' | 'absent';
  present?: boolean;
  punches?: any[];
}

export interface AttendanceRapideData {
  id: number;
  etablissement_id: number;
  date: string;
  heure_debut: string;
  heure_fin: string;
  ville_id: number;
  imported_data: AttendanceRapideStudent[];
  attendance_data: AttendanceRapideStudent[] | null;
  created_at: string;
  updated_at: string;
  etablissement?: {
    id: number;
    name: string;
  };
  ville?: {
    id: number;
    name: string;
  };
}

export interface AttendanceRapideLancerResponse {
  success: boolean;
  message?: string;
  data?: {
    students: AttendanceRapideStudent[];
    total_students: number;
    present_count: number;
    absent_count: number;
    etablissement_name?: string;
    ville_name?: string;
    date?: string;
    heure_debut?: string;
    heure_fin?: string;
  };
}

export interface AttendanceRapideValidationResponse {
  success: boolean;
  message: string;
  data?: {
    valid: boolean;
    total_rows: number;
    valid_rows: number;
    error_rows: number;
    warnings_count: number;
    missing_columns: string[];
    errors: Array<{
      line: number;
      message: string;
      data?: any;
    }>;
    error_rows_data?: Array<{
      line: number;
      data: any;
      errors: { [key: string]: string };
      suggestions: { [key: string]: string };
    }>;
    all_rows_data?: Array<{
      line: number;
      data: any;
      errors: { [key: string]: string };
      suggestions: { [key: string]: any };
      has_auto_applied?: boolean;
      is_valid?: boolean;
    }>;
    warnings: Array<{
      line: number;
      message: string;
    }>;
    headers: string[];
    sample_data: any[];
  };
}

export interface AttendanceRapideResponse {
  success: boolean;
  message: string;
  data?: AttendanceRapideData | AttendanceRapideLancerResponse;
}

export interface FieldSuggestion {
  label: string;
  id: number | null;
  score: number;
}

export interface AttendanceRapideFieldSuggestionResponse {
  success: boolean;
  message: string;
  data?: {
    field: string;
    valid: boolean;
    auto_applied: boolean;
    match?: string | null;
    suggestions: FieldSuggestion[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceRapideService {
  private readonly baseUrl = `${environment.apiUrl}/attendance-rapide`;

  constructor(private http: HttpClient) {}

  /**
   * Valider un fichier avant l'importation
   */
  validateFile(file: File): Observable<AttendanceRapideValidationResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<AttendanceRapideValidationResponse>(`${this.baseUrl}/validate`, formData);
  }

  /**
   * Importer une liste d'étudiants
   */
  importList(request: AttendanceRapideImportRequest): Observable<AttendanceRapideResponse> {
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('etablissement_id', request.etablissement_id.toString());
    formData.append('ville_id', request.ville_id.toString());

    return this.http.post<AttendanceRapideResponse>(`${this.baseUrl}/import`, formData);
  }

  /**
   * Lancer la récupération des données Biostar
   */
  lancerRecuperation(request: {
    etablissement_id: number;
    date: string;
    heure_debut: string;
    heure_fin: string;
    ville_id: number;
  }): Observable<AttendanceRapideResponse> {
    return this.http.post<AttendanceRapideResponse>(`${this.baseUrl}/lancer`, request);
  }

  /**
   * Récupérer les données d'attendance rapide pour un établissement
   */
  getAttendanceRapide(etablissementId: number): Observable<AttendanceRapideResponse> {
    return this.http.get<AttendanceRapideResponse>(`${this.baseUrl}/${etablissementId}`);
  }

  /**
   * Télécharger le modèle CSV/Excel
   */
  downloadTemplate(format: 'csv' | 'xlsx' = 'csv'): Observable<Blob> {
    const params = new HttpParams().set('format', format);
    return this.http.get(`${this.baseUrl}/template`, {
      params,
      responseType: 'blob'
    });
  }

  /**
   * Obtenir des suggestions pour un champ spécifique
   */
  suggestField(field: string, value: string): Observable<AttendanceRapideFieldSuggestionResponse> {
    return this.http.post<AttendanceRapideFieldSuggestionResponse>(`${this.baseUrl}/suggest`, {
      field,
      value: value ?? ''
    });
  }
}

