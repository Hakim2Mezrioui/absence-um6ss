import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { User } from './auth.service';

export interface UserContext {
  ville_id: number | null;
  etablissement_id: number | null;
  user_id: number | null;
  user_role: number | null;
}

export interface Configuration {
  id: number;
  sqlsrv: string;
  database: string;
  trustServerCertificate: string;
  biostar_username: string;
  biostar_password: string;
  ville_id: number;
  ville?: {
    id: number;
    name: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserContextService {
  private userContextSubject = new BehaviorSubject<UserContext | null>(null);
  private configurationSubject = new BehaviorSubject<Configuration | null>(null);
  
  public userContext$ = this.userContextSubject.asObservable();
  public configuration$ = this.configurationSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Initialize user context from authenticated user
   */
  initializeUserContext(): Observable<UserContext> {
    return this.http.get<User>('/api/user').pipe(
      map(user => {
        const userContext: UserContext = {
          ville_id: user.ville_id || null,
          etablissement_id: user.etablissement_id || null,
          user_id: user.id || null,
          user_role: user.role_id || null
        };
        
        this.userContextSubject.next(userContext);
        return userContext;
      })
    );
  }

  /**
   * Get current user context
   */
  getCurrentUserContext(): UserContext | null {
    return this.userContextSubject.value;
  }

  /**
   * Check if user has ville context
   */
  hasVille(): boolean {
    const context = this.getCurrentUserContext();
    return context ? context.ville_id !== null : false;
  }

  /**
   * Check if user has etablissement context
   */
  hasEtablissement(): boolean {
    const context = this.getCurrentUserContext();
    return context ? context.etablissement_id !== null : false;
  }

  /**
   * Get user's ville ID
   */
  getUserVilleId(): number | null {
    const context = this.getCurrentUserContext();
    return context ? context.ville_id : null;
  }

  /**
   * Get user's etablissement ID
   */
  getUserEtablissementId(): number | null {
    const context = this.getCurrentUserContext();
    return context ? context.etablissement_id : null;
  }

  /**
   * Load configuration for user's ville
   */
  loadConfigurationForUserVille(): Observable<any> {
    return this.http.get<any>('/api/configuration/user-ville').pipe(
      tap(response => {
        if (response.success && response.data) {
          this.configurationSubject.next(response.data);
        }
      })
    );
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): Configuration | null {
    return this.configurationSubject.value;
  }

  /**
   * Clear user context (on logout)
   */
  clearUserContext(): void {
    this.userContextSubject.next(null);
    this.configurationSubject.next(null);
  }

  /**
   * Get filter parameters for API calls based on user context
   */
  getFilterParams(): { ville_id?: number; etablissement_id?: number } {
    const context = this.getCurrentUserContext();
    const params: { ville_id?: number; etablissement_id?: number } = {};
    
    if (context?.ville_id) {
      params.ville_id = context.ville_id;
    }
    if (context?.etablissement_id) {
      params.etablissement_id = context.etablissement_id;
    }
    
    return params;
  }

  /**
   * Get query string for API calls
   */
  getQueryString(): string {
    const params = this.getFilterParams();
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });
    
    return queryParams.toString();
  }
}
