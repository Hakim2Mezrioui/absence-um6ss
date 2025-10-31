import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ScolariteGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): boolean {
    const userRole = localStorage.getItem('userRole');
    
    if (userRole === 'scolarite' || userRole === 'super-admin') {
      return true;
    }
    
    this.router.navigate(['/login']);
    return false;
  }
}

















































