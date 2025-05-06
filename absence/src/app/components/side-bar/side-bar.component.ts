import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CookieService } from 'ngx-cookie-service';
import { AuthService } from 'src/app/services/auth.service';
import { StartupService } from 'src/app/services/startup.service';

@Component({
  selector: 'app-side-bar',
  templateUrl: './side-bar.component.html',
  styleUrls: ['./side-bar.component.css'],
})
export class SideBarComponent implements OnInit {
  isMinimized = false;
  role: String = 'user';
  constructor(
    private authService: AuthService,
    private cookieService: CookieService,
    private router: Router,
    private startupService: StartupService
  ) {}

  examensMenuItems = [
    { 
      title: 'Examens', 
      icon: 'bi-ui-radios-grid', 
      link: 'examens-list',
      guard: ['super-admin', 'admin', 'user'] // Accessible à tous (tableau vide)
    },
    { 
      title: 'Paramétrer', 
      icon: 'bi-gear', 
      link: 'parametrer-examen',
      guard: ['super-admin', 'admin'] // Super Admin + Admin
    },
    { 
      title: 'Rattrapage', 
      icon: 'bi-reply-all-fill', 
      link: 'rattrapage',
      guard: ['super-admin', 'admin', 'user'] // Accessible à tous
    }
  ];
  
  coursMenuItems = [
    { 
      title: 'Cours', 
      icon: 'bi-journal-bookmark-fill', 
      link: 'cours',
      guard: ['super-admin', 'scolarite'] // Super Admin + Scolarité
    },
    { 
      title: 'Ajouter cours', 
      icon: 'bi-journal-plus', 
      link: 'add-cours',
      guard: ['super-admin', 'scolarite'] // Super Admin + Scolarité
    }
  ];
  
  adminMenuItems = [
    { 
      title: 'Ajouter Etudiant', 
      icon: 'bi-person-add', 
      link: 'add-etudiant',
      guard: ['super-admin', 'admin'] // Super Admin + Admin
    },
    { 
      title: 'Etudiants', 
      icon: 'bi-people-fill', 
      link: 'etudiants',
      guard: ['super-admin', 'admin'] // Super Admin + Admin
    },
    { 
      title: 'Ajouter Utilisateur', 
      icon: 'bi-person-plus-fill', 
      link: 'add-user',
      guard: ['super-admin'] // Super Admin seulement
    },
    { 
      title: 'Utilisateurs', 
      icon: 'bi-people-fill', 
      link: 'users',
      guard: ['super-admin'] // Super Admin + Admin
    }
  ];
  ngOnInit(): void {
    this.startupService.role.subscribe((value) => (this.role = value));
  }

  toggleSidebar() {
    this.isMinimized = !this.isMinimized;
  }

  logout() {
    this.authService.logout();
    this.cookieService.delete('token');
    this.router.navigate(['login']);
  }

  hassAcess(guards: string[]): boolean {
    // Vérifie si le rôle de l'utilisateur est présent dans les gardes
    return guards.includes(this.role.toLocaleLowerCase());
  }
}
