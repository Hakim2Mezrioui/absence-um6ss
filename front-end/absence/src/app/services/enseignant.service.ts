import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface Enseignant {
  id?: number;
  user_id?: number;
  ville_id: number;
  role_id?: number;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
}

@Injectable({ providedIn: 'root' })
export class EnseignantService {
  private readonly baseUrl = `${environment.apiUrl}/enseignants`;

  constructor(
    private http: HttpClient,
    private auth: AuthService
  ) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = this.auth.getToken();
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });
    return { headers };
  }

  list(page: number = 1, size: number = 10, search: string = '', sortBy: string = 'created_at', sortDir: 'asc' | 'desc' = 'desc', filters?: { ville_id?: number; role_id?: number }): Observable<any> {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('size', String(size));
    if (search) params.set('search', search);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortDir) params.set('sortDir', sortDir);
    if (filters?.ville_id) params.set('ville_id', String(filters.ville_id));
    if (filters?.role_id) params.set('role_id', String(filters.role_id));
    return this.http.get(`${this.baseUrl}?${params.toString()}`, this.getAuthHeaders());
  }
  get(id: number): Observable<any> { return this.http.get(`${this.baseUrl}/${id}`, this.getAuthHeaders()); }
  create(payload: Enseignant): Observable<any> { return this.http.post(this.baseUrl, payload, this.getAuthHeaders()); }
  update(id: number, payload: Partial<Enseignant>): Observable<any> { return this.http.put(`${this.baseUrl}/${id}`, payload, this.getAuthHeaders()); }
  delete(id: number): Observable<any> { return this.http.delete(`${this.baseUrl}/${id}`, this.getAuthHeaders()); }
  assignCours(id: number, cours_ids: number[]): Observable<any> { return this.http.post(`${this.baseUrl}/${id}/assign-cours`, { cours_ids }, this.getAuthHeaders()); }
  createWithUser(payload: { user: any; enseignant: { ville_id: number } }): Observable<any> {
    return this.http.post(`${environment.apiUrl}/enseignants-with-user`, payload, this.getAuthHeaders());
  }

  updateWithUser(id: number, payload: { user: any; enseignant: { ville_id: number } }): Observable<any> {
    return this.http.put(`${environment.apiUrl}/enseignants-with-user/${id}`, payload, this.getAuthHeaders());
  }

  getFilterOptions(): Observable<any> {
    return this.http.get(`${this.baseUrl}/filter-options`, this.getAuthHeaders());
  }
}


