import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError } from 'rxjs';
import { of } from 'rxjs';
import { CookieService } from './cookie.service';
import { isPlatformBrowser } from '@angular/common';
import { StartupService } from './startup.service';
import { UserContextService } from './user-context.service';
import { environment } from '../../environments/environment';

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
  ville_id: number;
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
  private readonly API_URL = environment.apiUrl;
  private readonly LOGIN_ENDPOINT = `${this.API_URL}/login`;
  private platformId = inject(PLATFORM_ID);

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private startupService: StartupService,
    private userContextService: UserContextService
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

            // Store user role and token
            if (this.isBrowser()) {
              const roleName = this.getRoleNameById(response.user.role_id);
              localStorage.setItem('token', response.authorisation.token);
              this.startupService.setRole(roleName);
            }

            this.currentUserSubject.next(response.user);
            this.isAuthenticatedSubject.next(true);
            
            // Initialize user context and load configuration
            this.userContextService.initializeUserContext().subscribe(() => {
              this.userContextService.loadConfigurationForUserVille().subscribe();
            });
          }
        })
      );
  }

  logout(): Observable<any> {
    const token = this.getToken();
    
    if (token) {
      const headers = new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      });

      return this.http.post(`${this.API_URL}/logout`, {}, { headers }).pipe(
        tap(() => {
          // Nettoyer les données locales après déconnexion réussie
          this.cookieService.clearAuthCookies();
          if (this.isBrowser()) {
            localStorage.removeItem('token');
            this.startupService.setRole('user');
          }
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          
          // Clear user context
          this.userContextService.clearUserContext();
        }),
        catchError(error => {
          console.error('Erreur lors de la déconnexion:', error);
          // Nettoyer les données locales même en cas d'erreur
          this.cookieService.clearAuthCookies();
          if (this.isBrowser()) {
            localStorage.removeItem('userRole');
            localStorage.removeItem('token');
            this.startupService.setRole('user');
          }
          this.currentUserSubject.next(null);
          this.isAuthenticatedSubject.next(false);
          return of(null);
        })
      );
    } else {
      // Pas de token, nettoyer localement
      this.cookieService.clearAuthCookies();
      if (this.isBrowser()) {
        localStorage.removeItem('userRole');
        localStorage.removeItem('token');
        this.startupService.setRole('user');
      }
      this.currentUserSubject.next(null);
      this.isAuthenticatedSubject.next(false);
      return of(null);
    }
  }

  private checkAuthStatus(): void {
    if (!this.isBrowser()) return;
    
    if (this.cookieService.isAuthenticated()) {
      const userData = this.cookieService.getUserData();
      if (userData) {
        try {
          const user = JSON.parse(userData);
          
          // Restaurer le rôle
          const roleName = this.getRoleNameById(user.role_id);
          this.startupService.setRole(roleName);
          
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

  /**
   * Vérifier si l'utilisateur peut ajouter/modifier/supprimer
   * Le technicien (ID 5) ne peut que consulter
   */
  canEdit(): boolean {
    if (!this.isBrowser()) return false;
    const userRole = localStorage.getItem('userRole');
    // Le technicien ne peut que consulter (lecture seule)
    return userRole !== 'technicien';
  }

  /**
   * Obtenir le nom du rôle de l'utilisateur
   */
  getUserRoleName(): string {
    const user = this.getCurrentUser();
    if (user) {
      return this.getRoleNameById(user.role_id);
    }
    return 'user';
  }

  private getRoleNameById(roleId: number): string {
    // Mapping des IDs de rôles vers les noms de rôles
    // Note: Ce mapping doit correspondre à la structure réelle de la table roles
    const roleMapping: { [key: number]: string } = {
      1: 'super-admin',
      2: 'admin',
      3: 'scolarite',    // ID 3: Scolarité
      4: 'doyen',       // ID 4: Doyen
      5: 'technicien',  // ID 5: Technicien SI
      6: 'enseignant',   // ID 6: Enseignant
      7: 'affichage-public'  // ID 7: Affichage Public
    };
    
    return roleMapping[roleId] || 'user';
  }

  refreshToken(): Observable<any> {
    return new Observable();
  }
}
