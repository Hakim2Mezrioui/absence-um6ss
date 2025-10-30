import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface pour un établissement
export interface Etablissement {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  ville?: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  etudiants_count?: number;
  promotions_count?: number;
  groups_count?: number;
}

// Interface pour une ville (utilisée dans les selects)
export interface Ville {
  id: number;
  name: string;
}

// Interface pour la réponse de la liste des établissements
export interface EtablissementResponse {
  etablissements: Etablissement[];
  totalPages: number;
  total: number;
  status: number;
}

// Interface pour les filtres de recherche
export interface EtablissementFilters {
  searchValue?: string;
}

// Interface pour créer/modifier un établissement
export interface CreateEtablissementRequest {
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class EtablissementsService {
  private baseUrl = 'http://10.0.244.100:8000/api/etablissements';
  private villesUrl = 'http://10.0.244.100:8000/api/villes';

  constructor(private http: HttpClient) { }

  /**
   * Récupérer tous les établissements avec pagination et filtres
   */
  getEtablissements(
    page: number = 1,
    size: number = 10,
    filters: EtablissementFilters = {}
  ): Observable<EtablissementResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters.searchValue) {
      params = params.set('searchValue', filters.searchValue);
    }

    return this.http.get<EtablissementResponse>(this.baseUrl, { params });
  }

  /**
   * Récupérer tous les établissements (sans pagination)
   */
  getAllEtablissements(): Observable<{ etablissements: Etablissement[]; status: number }> {
    return this.http.get<{ etablissements: Etablissement[]; status: number }>(this.baseUrl);
  }

  /**
   * Récupérer un établissement par ID
   */
  getEtablissementById(id: number): Observable<{ etablissement: Etablissement; status: number }> {
    return this.http.get<{ etablissement: Etablissement; status: number }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer un nouvel établissement
   */
  createEtablissement(etablissementData: CreateEtablissementRequest): Observable<Etablissement> {
    return this.http.post<Etablissement>(this.baseUrl, etablissementData);
  }

  /**
   * Mettre à jour un établissement
   */
  updateEtablissement(id: number, etablissementData: CreateEtablissementRequest): Observable<Etablissement> {
    return this.http.put<Etablissement>(`${this.baseUrl}/${id}`, etablissementData);
  }

  /**
   * Supprimer un établissement
   */
  deleteEtablissement(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Récupérer toutes les villes pour les selects
   */
  getAllVilles(): Observable<{ villes: Ville[]; status: number }> {
    return this.http.get<{ villes: Ville[]; status: number }>(this.villesUrl);
  }

  /**
   * Rechercher des établissements (pour l'autocomplétion)
   */
  searchEtablissements(searchTerm: string): Observable<{ etablissements: Etablissement[]; status: number }> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<{ etablissements: Etablissement[]; status: number }>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupérer les établissements par ville
   */
  // Removed: filter by ville on etablissements is no longer supported

  /**
   * Tester la connectivité avec l'API
   */
  testConnection(): Observable<any> {
    console.log('🔗 Test de connexion vers:', this.baseUrl);
    return this.http.get(`${this.baseUrl}?size=1&page=1`);
  }
}
