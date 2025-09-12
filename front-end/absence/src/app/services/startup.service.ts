import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class StartupService {
  private roleSubject = new BehaviorSubject<string>('user');
  public role = this.roleSubject.asObservable();
  private platformId = inject(PLATFORM_ID);

  constructor() {
    this.initializeRole();
  }

  private initializeRole(): void {
    // Vérifier si on est dans le navigateur avant d'utiliser localStorage
    if (isPlatformBrowser(this.platformId)) {
      const userRole = localStorage.getItem('userRole') || 'user';
      this.roleSubject.next(userRole);
    } else {
      // Côté serveur, utiliser 'user' par défaut
      this.roleSubject.next('user');
    }
  }

  setRole(role: string): void {
    this.roleSubject.next(role);
    // Mettre à jour localStorage seulement côté navigateur
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('userRole', role);
    }
  }

  getCurrentRole(): string {
    return this.roleSubject.value;
  }
}
