import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Etudiant {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  photo?: string | null;
  promotion_id: number;
  etablissement_id: number;
  ville_id: number;
  group_id: number;
  option_id?: number | null; // Optionnel - toutes les écoles n'utilisent pas les options
  created_at: string;
  updated_at: string;
  
  // Relations
  ville?: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  group?: {
    id: number;
    title: string;
    promotion_id: number;
    etablissement_id: number;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  option?: {
    id: number;
    name: string;
    description: string;
    etablissement_id: number;
    created_at: string;
    updated_at: string;
  };
  etablissement?: {
    id: number;
    name: string;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  promotion?: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
}

export interface EtudiantFilters {
  searchValue?: string;
  promotion_id?: number;
  group_id?: number;
  ville_id?: number;
  etablissement_id?: number;
  option_id?: number | null; // Optionnel - toutes les écoles n'utilisent pas les options
}

export interface EtudiantResponse {
  data: Etudiant[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  has_next_page: boolean;
  has_prev_page: boolean;
}

export interface FilterOptions {
  promotions: { id: number; name: string; }[];
  groups: { id: number; title: string; }[];
  villes: { id: number; name: string; }[];
  etablissements: { id: number; name: string; }[];
  options: { id: number; name: string; }[];
}

@Injectable({
  providedIn: 'root'
})
export class EtudiantsService {
  private baseUrl = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) { }

  /**
   * Récupérer tous les étudiants avec pagination et filtres
   */
  getEtudiants(
    page: number = 1,
    size: number = 10,
    filters: EtudiantFilters = {}
  ): Observable<EtudiantResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', size.toString());

    // Ajouter les filtres
    if (filters.searchValue) {
      params = params.set('searchValue', filters.searchValue);
    }
    if (filters.promotion_id) {
      params = params.set('promotion_id', filters.promotion_id.toString());
    }
    if (filters.group_id) {
      params = params.set('group_id', filters.group_id.toString());
    }
    if (filters.ville_id) {
      params = params.set('ville_id', filters.ville_id.toString());
    }
    if (filters.etablissement_id) {
      params = params.set('etablissement_id', filters.etablissement_id.toString());
    }
    if (filters.option_id) {
      params = params.set('option_id', filters.option_id.toString());
    }

    return this.http.get<EtudiantResponse>(`${this.baseUrl}/etudiants`, { params });
  }

  /**
   * Récupérer un étudiant par ID
   */
  getEtudiant(id: number): Observable<Etudiant> {
    return this.http.get<Etudiant>(`${this.baseUrl}/etudiants/${id}`);
  }

  /**
   * Créer un nouvel étudiant
   */
  createEtudiant(etudiant: Partial<Etudiant>): Observable<{ response: Etudiant }> {
    return this.http.post<{ response: Etudiant }>(`${this.baseUrl}/etudiants`, etudiant);
  }

  /**
   * Mettre à jour un étudiant
   */
  updateEtudiant(id: number, etudiant: Partial<Etudiant>): Observable<Etudiant> {
    return this.http.put<Etudiant>(`${this.baseUrl}/etudiants/${id}`, etudiant);
  }

  /**
   * Supprimer un étudiant
   */
  deleteEtudiant(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/etudiants/${id}`);
  }

  /**
   * Supprimer plusieurs étudiants
   */
  deleteMultipleEtudiants(ids: number[]): Observable<{ message: string; deleted_count: number; total_requested: number; errors?: string[] }> {
    return this.http.delete<{ message: string; deleted_count: number; total_requested: number; errors?: string[] }>(`${this.baseUrl}/etudiants/delete-multiple`, {
      body: { ids }
    });
  }

  /**
   * Récupérer les options de filtre
   */
  getFilterOptions(): Observable<FilterOptions> {
    return this.http.get<FilterOptions>(`${this.baseUrl}/etudiants/filter-options`);
  }

  /**
   * Importer des étudiants depuis un fichier
   */
  importEtudiants(formData: FormData): Observable<any> {
    return this.http.post(`${this.baseUrl}/import-students-modern`, formData);
  }

  /**
   * Exporter les étudiants
   */
  exportEtudiants(filters: EtudiantFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    // Ajouter les filtres pour l'export
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof EtudiantFilters]) {
        params = params.set(key, filters[key as keyof EtudiantFilters]!.toString());
      }
    });

    // Export avec authentification
    console.log('Tentative d\'export avec filtres:', filters);
    
    return this.http.get(`${this.baseUrl}/export-etudiants`, { 
      params, 
      responseType: 'blob',
      headers: {
        'Accept': 'text/csv, application/csv, */*'
      },
      observe: 'body'
    });
  }

  /**
   * Rechercher des étudiants
   */
  searchEtudiants(query: string): Observable<Etudiant[]> {
    return this.http.get<Etudiant[]>(`${this.baseUrl}/etudiants/search?q=${query}`);
  }

  /**
   * Récupérer les statistiques des étudiants
   */
  getEtudiantsStats(): Observable<any> {
    return this.http.get(`${this.baseUrl}/etudiants/stats`);
  }
}
