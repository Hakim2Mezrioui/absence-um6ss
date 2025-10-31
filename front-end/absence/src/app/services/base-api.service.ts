import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { UserContextService } from './user-context.service';

@Injectable({
  providedIn: 'root'
})
export class BaseApiService {
  protected readonly API_URL = 'http://10.0.244.100:8000/api';

  constructor(
    protected http: HttpClient,
    protected userContextService: UserContextService
  ) {}

  /**
   * Add user context filters to HTTP params
   */
  protected addUserContextFilters(params: HttpParams = new HttpParams()): HttpParams {
    const context = this.userContextService.getCurrentUserContext();
    
    if (context?.ville_id) {
      params = params.set('ville_id', context.ville_id.toString());
    }
    if (context?.etablissement_id) {
      params = params.set('etablissement_id', context.etablissement_id.toString());
    }
    
    return params;
  }

  /**
   * Get filtered data with user context
   */
  protected getFiltered<T>(endpoint: string, additionalParams?: any): Observable<T> {
    let params = this.addUserContextFilters();
    
    if (additionalParams) {
      Object.keys(additionalParams).forEach(key => {
        if (additionalParams[key] !== null && additionalParams[key] !== undefined) {
          params = params.set(key, additionalParams[key].toString());
        }
      });
    }
    
    return this.http.get<T>(`${this.API_URL}/${endpoint}`, { params });
  }

  /**
   * Post data with user context
   */
  protected postWithContext<T>(endpoint: string, data: any): Observable<T> {
    const context = this.userContextService.getCurrentUserContext();
    
    // Automatically add user context to data
    if (context?.ville_id) {
      data.ville_id = context.ville_id;
    }
    if (context?.etablissement_id) {
      data.etablissement_id = context.etablissement_id;
    }
    
    return this.http.post<T>(`${this.API_URL}/${endpoint}`, data);
  }

  /**
   * Put data with user context
   */
  protected putWithContext<T>(endpoint: string, data: any): Observable<T> {
    const context = this.userContextService.getCurrentUserContext();
    
    // Automatically add user context to data
    if (context?.ville_id) {
      data.ville_id = context.ville_id;
    }
    if (context?.etablissement_id) {
      data.etablissement_id = context.etablissement_id;
    }
    
    return this.http.put<T>(`${this.API_URL}/${endpoint}`, data);
  }
}
