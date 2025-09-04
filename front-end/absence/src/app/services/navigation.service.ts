import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class NavigationService {
  private router = inject(Router);

  /**
   * Rediriger vers le dashboard après connexion réussie
   */
  navigateToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /**
   * Rediriger vers la page de connexion
   */
  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  /**
   * Rediriger vers la page d'accueil
   */
  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  /**
   * Rediriger vers une URL spécifique
   */
  navigateTo(url: string): void {
    this.router.navigate([url]);
  }

  /**
   * Rediriger vers une URL avec des paramètres
   */
  navigateToWithParams(url: string, params: any): void {
    this.router.navigate([url], { queryParams: params });
  }

  /**
   * Obtenir l'URL actuelle
   */
  getCurrentUrl(): string {
    return this.router.url;
  }

  /**
   * Vérifier si l'utilisateur est sur la page de connexion
   */
  isOnLoginPage(): boolean {
    return this.router.url === '/login';
  }

  /**
   * Vérifier si l'utilisateur est sur le dashboard
   */
  isOnDashboard(): boolean {
    return this.router.url === '/dashboard';
  }
}
