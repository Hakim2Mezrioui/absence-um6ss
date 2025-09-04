import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { CookieService } from './cookie.service';
import { isPlatformBrowser } from '@angular/common';

// Interfaces pour les types de données
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  status: string;
  user: User;
  authorisation: Authorisation;
}

export interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  post_id: number;
  etablissement_id: number;
  created_at: string;
  updated_at: string;
}

export interface Authorisation {
  token: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://127.0.0.1:8000/api';
  private readonly LOGIN_ENDPOINT = `${this.API_URL}/login`;
  private platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService
  ) {
    // Vérifier l'état d'authentification seulement dans le navigateur
    if (isPlatformBrowser(this.platformId)) {
      this.checkAuthStatus();
    }
  }

  /**
   * Vérifier si on est dans le navigateur
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<LoginResponse>(this.LOGIN_ENDPOINT, credentials, { headers })
      .pipe(
        tap(response => {
          if (response.status === 'success' && response.authorisation?.token) {
            // Store token in cookies
            this.cookieService.setAuthToken(
              response.authorisation.token,
              response.authorisation.type
            );

            // Store user data
            this.cookieService.setUserData(JSON.stringify(response.user));

            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
          }
        })
      );
  }

  logout(): void {
    this.cookieService.clearAuthCookies();
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private checkAuthStatus(): void {
    if (!this.isBrowser()) return;
    
    if (this.cookieService.isAuthenticated()) {
      const userData = this.cookieService.getUserData();
      if (userData) {
        try {
          const user = JSON.parse(userData);
          this.currentUserSubject.next(user);
          this.isAuthenticatedSubject.next(true);
        } catch (error) {
          console.error('Erreur lors du parsing des données utilisateur:', error);
          this.logout();
        }
      }
    }
  }

  getToken(): string | null {
    return this.cookieService.getFullToken();
  }

  getRawToken(): string | null {
    return this.cookieService.getAuthToken();
  }

  getTokenType(): string | null {
    return this.cookieService.getTokenType();
  }

  isLoggedIn(): boolean {
    if (!this.isBrowser()) return false;
    return this.cookieService.isAuthenticated();
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  getUserFullName(): string {
    const user = this.getCurrentUser();
    if (user) {
      return `${user.first_name} ${user.last_name}`;
    }
    return '';
  }

  getUserRole(): number {
    const user = this.getCurrentUser();
    return user ? user.role_id : 0;
  }

  hasRole(roleId: number): boolean {
    return this.getUserRole() === roleId;
  }

  getUserEtablissementId(): number {
    const user = this.getCurrentUser();
    return user ? user.etablissement_id : 0;
  }

  refreshToken(): Observable<any> {
    return new Observable();
  }
}
