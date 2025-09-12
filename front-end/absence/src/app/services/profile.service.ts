import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from './auth.service';

export interface UserProfile {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  post_id: number;
  etablissement_id: number;
  created_at: string;
  updated_at: string;
  role: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  post: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  etablissement: {
    id: number;
    name: string;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  // Champs optionnels pour l'interface
  avatar?: string;
  last_login?: string;
  status?: 'active' | 'inactive' | 'suspended';
  permissions?: string[];
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: boolean;
  };
}

export interface ApiResponse {
  status: string;
  user: UserProfile | null;
  debug?: {
    session_id: string;
    has_session: boolean;
    cookies_count: number;
  };
}

export interface UpdateResponse {
  status: string;
  message: string;
  user: UserProfile;
}

export interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  email?: string;
  avatar?: string;
  preferences?: {
    language?: string;
    theme?: string;
    notifications?: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly API_URL = 'http://127.0.0.1:8000/api';
  private readonly PROFILE_ENDPOINT = `${this.API_URL}/users`;
  
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupérer le profil de l'utilisateur connecté via token
   */
  getUserProfile(): Observable<UserProfile | null> {
    const token = this.authService.getToken();
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      this.currentUserSubject.next(null);
      return of(null);
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.get<ApiResponse>(`${this.API_URL}/profile`, { headers }).pipe(
      tap(response => {
        console.log('Réponse API /profile:', response);
        
        if (response.debug) {
          console.log('Debug info:', response.debug);
        }
        
        if (response.status === 'success' && response.user) {
          this.currentUserSubject.next(response.user);
        } else {
          console.warn('Utilisateur non authentifié ou données manquantes');
          console.warn('Status:', response.status);
          console.warn('User:', response.user);
          this.currentUserSubject.next(null);
        }
      }),
      map(response => response.user),
      catchError(error => {
        console.error('Erreur lors de la récupération du profil:', error);
        this.currentUserSubject.next(null);
        return of(null as any);
      })
    );
  }

  /**
   * Récupérer le profil d'un utilisateur spécifique par ID
   */
  getUserProfileById(userId: number): Observable<UserProfile | null> {
    return this.http.get<ApiResponse>(`${this.PROFILE_ENDPOINT}/${userId}`).pipe(
      tap(response => {
        if (response.status === 'success' && response.user) {
          this.currentUserSubject.next(response.user);
        }
      }),
      map(response => response.user),
      catchError(error => {
        console.error('Erreur lors de la récupération du profil:', error);
        return of(null as any);
      })
    );
  }

  /**
   * Mettre à jour un utilisateur par ID (pour les administrateurs)
   */
  updateUser(userId: number, userData: ProfileUpdateData): Observable<UserProfile> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<UpdateResponse>(`${this.API_URL}/users/${userId}`, userData, { headers }).pipe(
      tap(response => {
        console.log('Réponse de mise à jour utilisateur:', response);
        if (response.status === 'success' && response.user) {
          // Si c'est l'utilisateur actuel, mettre à jour le sujet
          const currentUser = this.currentUserSubject.value;
          if (currentUser && currentUser.id === userId) {
            this.currentUserSubject.next(response.user);
          }
        }
      }),
      map(response => response.user),
      catchError(error => {
        console.error('Erreur lors de la mise à jour de l\'utilisateur:', error);
        return of(null as any);
      })
    );
  }

  /**
   * Mettre à jour le profil de l'utilisateur connecté
   */
  updateUserProfile(profileData: ProfileUpdateData): Observable<UserProfile> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.put<UpdateResponse>(`${this.API_URL}/users/${this.authService.getCurrentUser()?.id}`, profileData, { headers }).pipe(
      tap(response => {
        console.log('Réponse de mise à jour:', response);
        if (response.status === 'success' && response.user) {
          this.currentUserSubject.next(response.user);
        }
      }),
      map(response => response.user),
      catchError(error => {
        console.error('Erreur lors de la mise à jour du profil:', error);
        return of(null as any);
      })
    );
  }

  /**
   * Changer le mot de passe de l'utilisateur connecté
   */
  changePassword(passwordData: { current_password: string; new_password: string; confirm_password: string }): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    });

    return this.http.post(`${this.API_URL}/profile/change-password`, passwordData, { headers }).pipe(
      catchError(error => {
        console.error('Erreur lors du changement de mot de passe:', error);
        return of(null);
      })
    );
  }

  /**
   * Uploader un avatar pour l'utilisateur connecté
   */
  uploadAvatar(file: File): Observable<any> {
    const token = this.authService.getToken();
    
    if (!token) {
      throw new Error('Aucun token d\'authentification trouvé');
    }

    const formData = new FormData();
    formData.append('avatar', file);
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    });
    
    return this.http.post(`${this.API_URL}/profile/avatar`, formData, { headers }).pipe(
      tap((response: any) => {
        // Mettre à jour le profil local avec la nouvelle URL de l'avatar
        const currentUser = this.currentUserSubject.value;
        if (currentUser && response.avatar_url) {
          currentUser.avatar = response.avatar_url;
          this.currentUserSubject.next(currentUser);
        }
      }),
      catchError(error => {
        console.error('Erreur lors de l\'upload de l\'avatar:', error);
        return of(null);
      })
    );
  }

  /**
   * Obtenir l'utilisateur actuel
   */
  getCurrentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  /**
   * Formater le nom complet
   */
  getFullName(profile: UserProfile): string {
    return `${profile.first_name} ${profile.last_name}`.trim();
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /**
   * Formater la date et l'heure
   */
  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtenir l'initiale du prénom
   */
  getInitials(profile: UserProfile): string {
    const firstInitial = profile.first_name ? profile.first_name.charAt(0).toUpperCase() : '';
    const lastInitial = profile.last_name ? profile.last_name.charAt(0).toUpperCase() : '';
    return firstInitial + lastInitial;
  }

  /**
   * Vérifier si l'utilisateur a une permission spécifique
   */
  hasPermission(permission: string): boolean {
    const user = this.getCurrentUser();
    return user?.permissions?.includes(permission) || false;
  }

  /**
   * Obtenir le statut de l'utilisateur avec une classe CSS
   */
  getStatusClass(status?: string): string {
    if (!status) return 'status-active'; // Par défaut actif
    
    switch (status) {
      case 'active':
        return 'status-active';
      case 'inactive':
        return 'status-inactive';
      case 'suspended':
        return 'status-suspended';
      default:
        return 'status-active';
    }
  }

  /**
   * Obtenir le texte du statut en français
   */
  getStatusText(status?: string): string {
    if (!status) return 'Actif'; // Par défaut actif
    
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'suspended':
        return 'Suspendu';
      default:
        return 'Actif';
    }
  }

  /**
   * Obtenir le nom du rôle
   */
  getRoleName(profile: UserProfile): string {
    return profile.role?.name || 'Utilisateur';
  }

  /**
   * Obtenir le nom du poste
   */
  getPostName(profile: UserProfile): string {
    return profile.post?.name || 'Non spécifié';
  }

  /**
   * Obtenir le nom de l'établissement
   */
  getEtablissementName(profile: UserProfile): string {
    return profile.etablissement?.name || 'Non spécifié';
  }
}
