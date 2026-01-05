import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interface pour la salle
export interface Salle {
  id: number;
  name: string;
  etage: number;
  batiment: string;
  ville_id: number;
  capacite?: number;
  description?: string;
  devices?: { devid: string | number; devnm: string }[];
  created_at?: string;
  updated_at?: string;
  ville?: {
    id: number;
    name: string;
  };
}

// Interface pour la réponse des salles
export interface SalleResponse {
  salles: Salle[];
  status: string;
  message?: string;
}

// Interface pour créer/modifier une salle
export interface CreateSalleRequest {
  name: string;
  etage: number;
  batiment: string;
  ville_id: number;
  capacite?: number;
  description?: string;
  devices?: { devid: string | number; devnm: string }[];
}

// Interface pour les filtres de recherche
export interface SalleFilters {
  search?: string;
  etablissement_id?: number;
  batiment?: string;
  etage?: number;
  capacite_min?: number;
  capacite_max?: number;
}

// Interface pour vérifier la disponibilité
export interface DisponibiliteRequest {
  date: string;
  heure_debut: string;
  heure_fin: string;
}

@Injectable({
  providedIn: 'root'
})
export class SallesService {
  private readonly baseUrl = `${environment.apiUrl}/salles`;

  constructor(private http: HttpClient) { }

  /**
   * Récupérer toutes les salles
   */
  getSalles(): Observable<SalleResponse> {
    return this.http.get<SalleResponse>(this.baseUrl);
  }

  /**
   * Récupérer une salle par ID
   */
  getSalle(id: number): Observable<{salle: Salle; status: string}> {
    return this.http.get<{salle: Salle; status: string}>(`${this.baseUrl}/${id}`);
  }

  /**
   * Créer une nouvelle salle
   */
  createSalle(salle: CreateSalleRequest): Observable<{message: string; salle: Salle; status: string}> {
    return this.http.post<{message: string; salle: Salle; status: string}>(this.baseUrl, salle);
  }

  /**
   * Mettre à jour une salle
   */
  updateSalle(id: number, salle: CreateSalleRequest): Observable<{message: string; salle: Salle; status: string}> {
    return this.http.put<{message: string; salle: Salle; status: string}>(`${this.baseUrl}/${id}`, salle);
  }

  /**
   * Supprimer une salle
   */
  deleteSalle(id: number): Observable<{message: string; status: string}> {
    return this.http.delete<{message: string; status: string}>(`${this.baseUrl}/${id}`);
  }

  /**
   * Rechercher des salles
   */
  searchSalles(query: string): Observable<SalleResponse> {
    const params = new HttpParams().set('q', query);
    return this.http.get<SalleResponse>(`${this.baseUrl}/search`, { params });
  }

  /**
   * Récupérer les salles par établissement
   */
  getSallesByEtablissement(etablissementId: number): Observable<SalleResponse> {
    return this.http.get<SalleResponse>(`${this.baseUrl}/etablissement/${etablissementId}`);
  }

  /**
   * Récupérer les salles par bâtiment
   */
  getSallesByBuilding(batiment: string): Observable<SalleResponse> {
    return this.http.get<SalleResponse>(`${this.baseUrl}/building/${batiment}`);
  }

  /**
   * Récupérer les salles par étage
   */
  getSallesByFloor(etage: number): Observable<SalleResponse> {
    return this.http.get<SalleResponse>(`${this.baseUrl}/floor/${etage}`);
  }

  /**
   * Récupérer les salles disponibles pour un créneau donné
   */
  getSallesDisponibles(disponibilite: DisponibiliteRequest): Observable<SalleResponse> {
    return this.http.post<SalleResponse>(`${this.baseUrl}/available`, disponibilite);
  }

  /**
   * Récupérer tous les établissements pour les formulaires (optionnel, pour filtres)
   */
  getEtablissements(): Observable<{etablissements: any[]; status: string}> {
    return this.http.get<{etablissements: any[]; status: string}>(`${environment.apiUrl}/etablissements`);
  }
}
