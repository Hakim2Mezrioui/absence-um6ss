import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interface pour une promotion
export interface Promotion {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  etablissement_id?: number;
  faculte_id?: number;
  
  // Relations
  etablissement?: {
    id: number;
    name: string;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  faculte?: {
    id: number;
    name: string;
    etablissement_id: number;
    created_at: string;
    updated_at: string;
  };
  etudiants_count?: number;
  groups_count?: number;
}

// Interface pour la réponse de la liste des promotions
export interface PromotionResponse {
  promotions: Promotion[];
  totalPages: number;
  total: number;
  status: number;
}

// Interface pour les filtres de recherche
export interface PromotionFilters {
  searchValue?: string;
  etablissement_id?: number;
  faculte_id?: number;
}

// Interface pour créer/modifier une promotion
export interface CreatePromotionRequest {
  name: string;
  etablissement_id?: number;
  faculte_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class PromotionsService {
  private baseUrl = 'http://127.0.0.1:8000/api/promotions';

  constructor(private http: HttpClient) { }

  /**
   * Récupérer toutes les promotions avec pagination et filtres
   */
  getPromotions(
    page: number = 1,
    size: number = 10,
    filters: PromotionFilters = {}
  ): Observable<PromotionResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters.searchValue) {
      params = params.set('searchValue', filters.searchValue);
    }

    return this.http.get<PromotionResponse>(this.baseUrl, { params });
  }

  /**
   * Récupérer toutes les promotions (sans pagination)
   */
  getAllPromotions(): Observable<{ promotions: Promotion[]; status: number }> {
    return this.http.get<{ promotions: Promotion[]; status: number }>(`${this.baseUrl}/all`);
  }

  /**
   * Récupérer une promotion par ID
   */
  getPromotionById(id: number): Observable<Promotion> {
    return this.http.get<Promotion>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer une nouvelle promotion
   */
  createPromotion(promotionData: CreatePromotionRequest): Observable<{ message: string; promotion: Promotion }> {
    return this.http.post<{ message: string; promotion: Promotion }>(this.baseUrl, promotionData);
  }

  /**
   * Mettre à jour une promotion
   */
  updatePromotion(id: number, promotionData: CreatePromotionRequest): Observable<{ message: string; promotion: Promotion }> {
    return this.http.put<{ message: string; promotion: Promotion }>(`${this.baseUrl}/${id}`, promotionData);
  }

  /**
   * Supprimer une promotion
   */
  deletePromotion(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${id}`);
  }

  /**
   * Rechercher des promotions
   */
  searchPromotions(searchTerm: string): Observable<{ promotions: Promotion[]; status: number }> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<{ promotions: Promotion[]; status: number }>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupérer les promotions par établissement
   */
  getPromotionsByEtablissement(etablissementId: number): Observable<{ promotions: Promotion[]; status: number }> {
    return this.http.get<{ promotions: Promotion[]; status: number }>(`${this.baseUrl}/etablissement/${etablissementId}`);
  }

  /**
   * Récupérer les promotions par faculté
   */
  getPromotionsByFaculte(faculteId: number): Observable<{ promotions: Promotion[]; status: number }> {
    return this.http.get<{ promotions: Promotion[]; status: number }>(`${this.baseUrl}/faculte/${faculteId}`);
  }
}
