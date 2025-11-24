import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class DisplayPublicGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(): boolean {
    // Vérifier si l'utilisateur est authentifié
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // Récupérer le rôle de l'utilisateur
    const userRole = this.authService.getUserRoleName();
    
    // Normaliser le nom du rôle (insensible à la casse, sans espaces et tirets)
    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s-]/g, '') : '';
    
    // Autoriser uniquement le rôle "Affichage Public" et les admins
    const allowedRoles = [
      'affichagepublic',
      'superadmin',
      'admin',
      'defilement',
      'défilement'
    ];

    if (allowedRoles.includes(normalizedRole)) {
      return true;
    }
    
    // Rediriger vers la page d'accueil si l'utilisateur n'a pas les permissions
    this.router.navigate(['/']);
    return false;
  }
}

