import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Examen {
  id: number;
  title: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  option_id?: number;
  salle_id: number;
  promotion_id: number;
  type_examen_id: number;
  etablissement_id: number;
  group_id: number;
  ville_id: number;
  annee_universitaire: string;
  statut_temporel: 'passé' | 'en_cours' | 'futur';
  created_at: string;
  updated_at: string;
  option?: {
    id: number;
    name: string;
  };
  etablissement?: {
    id: number;
    name: string;
  };
  promotion?: {
    id: number;
    name: string;
  };
  salle?: {
    id: number;
    name: string;
  };
  type_examen?: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
  ville?: {
    id: number;
    name: string;
  };
}

export interface ExamenResponse {
  data: Examen[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ExamenFilters {
  size?: number;
  page?: number;
  etablissement_id?: number;
  promotion_id?: number;
  salle_id?: number;
  searchValue?: string;
  date?: string;
}

export interface TypeExamen {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class ExamensService {
  private apiUrl = 'http://127.0.0.1:8000/api/examens';
  private typesExamenUrl = 'http://127.0.0.1:8000/api/types-examen';

  constructor(private http: HttpClient) { }

  getExamens(filters: ExamenFilters = {}): Observable<ExamenResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof ExamenFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ExamenResponse>(this.apiUrl, { params });
  }

  getExamen(id: number): Observable<Examen> {
    return this.http.get<Examen>(`${this.apiUrl}/${id}`);
  }

  createExamen(examen: Partial<Examen>): Observable<Examen> {
    return this.http.post<Examen>(this.apiUrl, examen);
  }

  updateExamen(id: number, examen: Partial<Examen>): Observable<Examen> {
    return this.http.put<Examen>(`${this.apiUrl}/${id}`, examen);
  }

  deleteExamen(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Méthode pour récupérer tous les types d'examen
  getTypesExamen(): Observable<TypeExamen[]> {
    return this.http.get<TypeExamen[]>(`${this.typesExamenUrl}/all`);
  }

  // Méthode pour récupérer les types d'examen avec pagination
  getTypesExamenPaginated(page: number = 1, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(this.typesExamenUrl, { params });
  }

  // Méthode unique pour récupérer toutes les options de filtre
  getFilterOptions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/filter-options`);
  }
}
