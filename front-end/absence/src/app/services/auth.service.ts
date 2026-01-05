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
  user: User | Etudiant;
  etudiant?: Etudiant; // Optionnel, présent seulement si user_type === 'etudiant'
  user_type?: 'user' | 'etudiant'; // Type d'utilisateur
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

export interface Etudiant {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  photo?: string;
  promotion_id: number;
  etablissement_id: number;
  ville_id: number;
  group_id?: number;
  option_id: number;
  created_at: string;
  updated_at: string;
  promotion?: any;
  etablissement?: any;
  ville?: any;
  group?: any;
  option?: any;
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
            // DEBUG: Vérifier le token reçu
            console.log('🔍 Token reçu du backend:', response.authorisation.token.substring(0, 20) + '...');
            
            // Store token in cookies
            this.cookieService.setAuthToken(
              response.authorisation.token,
              response.authorisation.type
            );
            
            // DEBUG: Vérifier que le token est bien stocké
            const storedToken = this.cookieService.getAuthToken();
            console.log('🔍 Token stocké dans cookie:', storedToken ? storedToken.substring(0, 20) + '...' : 'NON');
            console.log('🔍 Tokens identiques:', storedToken === response.authorisation.token);

            // Store user data
            this.cookieService.setUserData(JSON.stringify(response.user));

            // Store user type and role
            if (this.isBrowser()) {
              localStorage.setItem('token', response.authorisation.token);
              
              // Gérer le rôle selon le type d'utilisateur
              if (response.user_type === 'etudiant') {
                // Pour les étudiants, utiliser un rôle spécial
                localStorage.setItem('userType', 'etudiant');
                this.startupService.setRole('etudiant');
              } else {
                // Pour les utilisateurs normaux, utiliser le role_id
                const user = response.user as User;
                const roleName = this.getRoleNameById(user.role_id);
                localStorage.setItem('userType', 'user');
                this.startupService.setRole(roleName);
              }
            }

            this.currentUserSubject.next(response.user as any);
            this.isAuthenticatedSubject.next(true);
            
            // Initialize user context and load configuration (seulement pour les users, pas les étudiants)
            if (response.user_type !== 'etudiant') {
              this.userContextService.initializeUserContext().subscribe(() => {
                this.userContextService.loadConfigurationForUserVille().subscribe();
              });
            }
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
          
          // Vérifier le type d'utilisateur depuis localStorage
          const userType = localStorage.getItem('userType');
          
          // Gérer différemment les étudiants et les utilisateurs normaux
          if (userType === 'etudiant') {
            // Pour les étudiants, utiliser le rôle 'etudiant'
            this.startupService.setRole('etudiant');
          } else {
            // Pour les utilisateurs normaux, restaurer le rôle depuis role_id
            const roleName = this.getRoleNameById(user.role_id);
            this.startupService.setRole(roleName);
          }
          
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
    if (!user) return 0;
    
    // Si c'est un étudiant, retourner 0 (pas de role_id)
    if (this.isEtudiant()) {
      return 0;
    }
    
    return (user as User).role_id || 0;
  }

  hasRole(roleId: number): boolean {
    return this.getUserRole() === roleId;
  }

  getUserEtablissementId(): number {
    const user = this.getCurrentUser();
    if (!user) return 0;
    
    // Les étudiants et les users ont tous les deux etablissement_id
    return user.etablissement_id || 0;
  }

  /**
   * Vérifier si l'utilisateur connecté est un étudiant
   */
  isEtudiant(): boolean {
    if (!this.isBrowser()) return false;
    return localStorage.getItem('userType') === 'etudiant';
  }

  /**
   * Obtenir l'étudiant connecté (si c'est un étudiant)
   */
  getEtudiant(): Etudiant | null {
    const user = this.getCurrentUser();
    if (this.isEtudiant() && user) {
      // Conversion sûre via unknown pour éviter l'erreur TypeScript
      return user as unknown as Etudiant;
    }
    return null;
  }

  /**
   * Vérifier si l'utilisateur peut ajouter/modifier/supprimer
   * Le technicien (ID 5) et defilement (ID 8) ne peuvent que consulter
   */
  canEdit(): boolean {
    if (!this.isBrowser()) return false;
    const userRole = localStorage.getItem('userRole');
    // Le technicien et defilement ne peuvent que consulter (lecture seule)
    return userRole !== 'technicien' && userRole !== 'defilement' && userRole !== 'défilement';
  }

  /**
   * Obtenir le nom du rôle de l'utilisateur
   */
  getUserRoleName(): string {
    // Vérifier d'abord si c'est un étudiant
    const userType = localStorage.getItem('userType');
    if (userType === 'etudiant') {
      return 'etudiant';
    }
    
    const user = this.getCurrentUser();
    if (user && (user as any).role_id) {
      return this.getRoleNameById((user as any).role_id);
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
      8: 'defilement'        // ID 8: Défilement
    };
    
    return roleMapping[roleId] || 'user';
  }

  refreshToken(): Observable<any> {
    return new Observable();
  }
}
