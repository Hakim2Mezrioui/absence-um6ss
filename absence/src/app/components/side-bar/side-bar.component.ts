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
    { title: 'Examens', icon: 'bi-ui-radios-grid', link: 'examens-list' },
    { title: 'Paramétrer', icon: 'bi-gear', link: 'parametrer-examen' },
    { title: 'Rattrapage', icon: 'bi-reply-all-fill', link: 'rattrapage' }
  ];
  
  coursMenuItems = [
    { title: 'Cours', icon: 'bi-journal-bookmark-fill', link: 'cours' },
    { title: 'Ajouter cours', icon: 'bi-journal-plus', link: 'add-cours' }
  ];
  
  adminMenuItems = [
    { title: 'Ajouter Etudiant', icon: 'bi-person-add', link: 'add-etudiant' },
    { title: 'Etudiants', icon: 'bi-people-fill', link: 'etudiants' },
    { title: 'Ajouter Utilisateur', icon: 'bi-person-plus-fill', link: 'add-user' },
    { title: 'Utilisateurs', icon: 'bi-people-fill', link: 'users' }
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
}
