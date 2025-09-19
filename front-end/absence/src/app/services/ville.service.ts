import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

export interface Ville {
  id: number;
  name: string;
  code_postal?: string;
  pays?: string;
  created_at: string;
  updated_at: string;
}

export interface VilleResponse {
  villes: Ville[];
  status: string;
}

@Injectable({
  providedIn: 'root'
})
export class VilleService {
  private readonly API_URL = 'http://127.0.0.1:8000/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupérer toutes les villes
   */
  getAllVilles(): Observable<Ville[]> {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.get<VilleResponse>(`${this.API_URL}/villes`, { headers }).pipe(
      map(response => {
        if (response.status === 'success' && response.villes) {
          return response.villes;
        }
        return [];
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des villes:', error);
        return of([]);
      })
    );
  }

  /**
   * Rechercher des villes par nom
   */
  searchVilles(query: string): Observable<Ville[]> {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.get<VilleResponse>(`${this.API_URL}/villes/search?q=${encodeURIComponent(query)}`, { headers }).pipe(
      map(response => {
        if (response.status === 'success' && response.villes) {
          return response.villes;
        }
        return [];
      }),
      catchError(error => {
        console.error('Erreur lors de la recherche des villes:', error);
        return of([]);
      })
    );
  }

  /**
   * Récupérer les villes par établissement
   */
  getVillesByEtablissement(etablissementId: number): Observable<Ville[]> {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return of([]);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.get<VilleResponse>(`${this.API_URL}/villes/etablissement/${etablissementId}`, { headers }).pipe(
      map(response => {
        if (response.status === 'success' && response.villes) {
          return response.villes;
        }
        return [];
      }),
      catchError(error => {
        console.error('Erreur lors de la récupération des villes par établissement:', error);
        return of([]);
      })
    );
  }
}
