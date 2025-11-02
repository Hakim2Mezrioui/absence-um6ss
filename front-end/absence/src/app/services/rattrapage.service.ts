import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Etudiant {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  promotion_id: number;
  etablissement_id: number;
  ville_id: number;
  group_id: number;
  option_id: number;
  promotion?: { id: number; name: string };
  etablissement?: { id: number; name: string };
  ville?: { id: number; name: string };
  group?: { id: number; title: string };
  option?: { id: number; name: string };
}

export interface Rattrapage {
  id?: number;
  name: string;
  pointage_start_hour: string;
  start_hour: string;
  end_hour: string;
  date: string;
  tolerance?: number;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class RattrapageService {
  private http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  // Etudiants
  getEtudiants(page: number = 1, perPage: number = 20, filters?: any): Observable<{
    data: Etudiant[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_next_page: boolean;
    has_prev_page: boolean;
    status: number;
  }> {
    let params: any = {
      page: page.toString(),
      per_page: perPage.toString()
    };

    // Ajouter les filtres s'ils existent
    if (filters) {
      if (filters.searchValue) params.searchValue = filters.searchValue;
      if (filters.promotion_id) params.promotion_id = filters.promotion_id;
      if (filters.group_id) params.group_id = filters.group_id;
      if (filters.ville_id) params.ville_id = filters.ville_id;
      if (filters.etablissement_id) params.etablissement_id = filters.etablissement_id;
      if (filters.option_id) params.option_id = filters.option_id;
    }

    return this.http.get<{
      data: Etudiant[];
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
      has_next_page: boolean;
      has_prev_page: boolean;
      status: number;
    }>(`${this.apiUrl}/etudiants`, { params });
  }

  // Endpoint unique pour récupérer toutes les options de filtrage
  getFilterOptions(): Observable<{
    promotions: any[];
    groups: any[];
    villes: any[];
    etablissements: any[];
    options: any[];
  }> {
    return this.http.get<{
      promotions: any[];
      groups: any[];
      villes: any[];
      etablissements: any[];
      options: any[];
    }>(`${this.apiUrl}/etudiants/filter-options`);
  }

  // Rattrapages
  createRattrapage(rattrapage: Rattrapage): Observable<ApiResponse<Rattrapage>> {
    return this.http.post<ApiResponse<Rattrapage>>(`${this.apiUrl}/rattrapages`, rattrapage);
  }

  getAllRattrapages(page: number = 1, perPage: number = 10, filters?: any): Observable<{
    success: boolean;
    data: Rattrapage[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      has_next_page: boolean;
      has_prev_page: boolean;
    };
    filters_applied?: any;
  }> {
    let params: any = {
      page: page.toString(),
      size: perPage.toString()
    };

    // Ajouter les filtres s'ils existent
    if (filters) {
      if (filters.search) params.search = filters.search;
      if (filters.date) params.date = filters.date;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      if (filters.pointage_start_hour) params.pointage_start_hour = filters.pointage_start_hour;
      if (filters.start_hour) params.start_hour = filters.start_hour;
      if (filters.end_hour) params.end_hour = filters.end_hour;
      if (filters.sort_by) params.sort_by = filters.sort_by;
      if (filters.sort_direction) params.sort_direction = filters.sort_direction;
    }

    return this.http.get<{
      success: boolean;
      data: Rattrapage[];
      pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        has_next_page: boolean;
        has_prev_page: boolean;
      };
      filters_applied?: any;
    }>(`${this.apiUrl}/rattrapages`, { params });
  }

  getRattrapageById(id: number): Observable<ApiResponse<Rattrapage>> {
    return this.http.get<ApiResponse<Rattrapage>>(`${this.apiUrl}/rattrapages/${id}`);
  }

  updateRattrapage(id: number, rattrapage: Rattrapage): Observable<ApiResponse<Rattrapage>> {
    return this.http.put<ApiResponse<Rattrapage>>(`${this.apiUrl}/rattrapages/${id}`, rattrapage);
  }

  deleteRattrapage(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/rattrapages/${id}`);
  }



  // List Students (affectation des étudiants aux rattrapages)
  assignStudentToRattrapage(etudiantId: number, rattrapageId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/list-students`, {
      etudiant_id: etudiantId,
      rattrapage_id: rattrapageId
    });
  }

  getStudentsByRattrapage(rattrapageId: number, page: number = 1, perPage: number = 20, search?: string): Observable<{
    success: boolean;
    data: {
      id: number;
      etudiant_id: number;
      rattrapage_id: number;
      created_at: string;
      updated_at: string;
      etudiant: Etudiant;
    }[];
    count: number;
    pagination?: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
    };
  }> {
    let params: any = {
      page: page.toString(),
      per_page: perPage.toString()
    };

    if (search) {
      params.search = search;
      // Utiliser l'endpoint de recherche si on a un terme de recherche
      return this.http.get<{
        success: boolean;
        data: {
          id: number;
          etudiant_id: number;
          rattrapage_id: number;
          created_at: string;
          updated_at: string;
          etudiant: Etudiant;
        }[];
        count: number;
        pagination?: {
          current_page: number;
          last_page: number;
          per_page: number;
          total: number;
        };
      }>(`${this.apiUrl}/list-students/rattrapage/${rattrapageId}/search`, { params });
    }

    return this.http.get<{
      success: boolean;
      data: {
        id: number;
        etudiant_id: number;
        rattrapage_id: number;
        created_at: string;
        updated_at: string;
        etudiant: Etudiant;
      }[];
      count: number;
      pagination?: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
      };
    }>(`${this.apiUrl}/list-students/rattrapage/${rattrapageId}`, { params });
  }

  removeStudentFromRattrapage(etudiantId: number, rattrapageId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.apiUrl}/list-students/etudiant/${etudiantId}/rattrapage/${rattrapageId}`
    );
  }
}
