import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class SuperAdminAndAdminAndUserGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  canActivate(): boolean {
    // Vérifier d'abord si l'utilisateur est connecté
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const userRole = localStorage.getItem('userRole');
    
    // Si le rôle n'existe pas, rediriger vers login pour re-authentification
    if (!userRole) {
      this.router.navigate(['/login']);
      return false;
    }
    
    if (['user', 'admin', 'super-admin'].includes(userRole)) {
      return true;
    }
    
    this.router.navigate(['/login']);
    return false;
  }
}
