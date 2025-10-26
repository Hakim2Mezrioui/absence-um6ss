import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private router: Router, private authService: AuthService) {}

  private mapRoleIdToName(roleId: string | number | null): string | null {
    if (roleId === null || roleId === undefined) return null;
    const idNum = typeof roleId === 'string' ? parseInt(roleId, 10) : roleId;
    switch (idNum) {
      case 1: return 'super-admin';
      case 2: return 'admin';
      case 3: return 'scolarite';
      case 4: return 'doyen';
      case 6: return 'enseignant';
      default: return null;
    }
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    // Must be logged in first
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    const allowedRoles: string[] = route.data && route.data['roles'] ? route.data['roles'] : [];

    // If no specific roles provided, allow any authenticated user
    if (!allowedRoles || allowedRoles.length === 0) {
      return true;
    }

    // Resolve user role name
    let userRole = localStorage.getItem('userRole');
    if (!userRole) {
      const roleId = localStorage.getItem('role_id') || localStorage.getItem('roleId');
      const mapped = this.mapRoleIdToName(roleId);
      if (mapped) userRole = mapped;
    }

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Not authorized: redirect; could also navigate to a 403 page if exists
    this.router.navigate(['/login']);
    return false;
  }
}
