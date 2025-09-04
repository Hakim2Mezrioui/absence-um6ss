import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class CookieService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly TOKEN_TYPE_KEY = 'token_type';
  private readonly USER_DATA_KEY = 'user_data';
  private platformId = inject(PLATFORM_ID);

  constructor() {}

  /**
   * Vérifier si on est dans le navigateur
   */
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  /**
   * Définir un cookie avec options de sécurité
   */
  setCookie(name: string, value: string, days: number = 7): void {
    if (!this.isBrowser()) return;
    
    const expires = new Date();
    expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
    
    const cookieValue = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Strict`;
    document.cookie = cookieValue;
  }

  /**
   * Récupérer un cookie
   */
  getCookie(name: string): string | null {
    if (!this.isBrowser()) return null;
    
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') c = c.substring(1, c.length);
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  /**
   * Supprimer un cookie
   */
  deleteCookie(name: string): void {
    if (!this.isBrowser()) return;
    
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }

  /**
   * Stocker le token d'authentification
   */
  setAuthToken(token: string, type: string = 'bearer'): void {
    this.setCookie(this.TOKEN_KEY, token, 7);
    this.setCookie(this.TOKEN_TYPE_KEY, type, 7);
  }

  /**
   * Récupérer le token d'authentification
   */
  getAuthToken(): string | null {
    return this.getCookie(this.TOKEN_KEY);
  }

  /**
   * Récupérer le type de token
   */
  getTokenType(): string | null {
    return this.getCookie(this.TOKEN_TYPE_KEY);
  }

  /**
   * Stocker les données utilisateur
   */
  setUserData(userData: string): void {
    this.setCookie(this.USER_DATA_KEY, userData, 7);
  }

  /**
   * Récupérer les données utilisateur
   */
  getUserData(): string | null {
    return this.getCookie(this.USER_DATA_KEY);
  }

  /**
   * Vérifier si l'utilisateur est connecté
   */
  isAuthenticated(): boolean {
    return this.getAuthToken() !== null;
  }

  /**
   * Nettoyer tous les cookies d'authentification
   */
  clearAuthCookies(): void {
    this.deleteCookie(this.TOKEN_KEY);
    this.deleteCookie(this.TOKEN_TYPE_KEY);
    this.deleteCookie(this.USER_DATA_KEY);
  }

  /**
   * Obtenir le token complet avec le type Bearer
   */
  getFullToken(): string | null {
    const token = this.getAuthToken();
    const type = this.getTokenType();
    
    if (token && type) {
      return `${type} ${token}`;
    }
    return null;
  }
}
