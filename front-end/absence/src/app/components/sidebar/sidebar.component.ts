import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
  children?: SidebarItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  @Input() isCollapsed = false;
  currentRoute: string = '';

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Écouter les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });
    
    // Initialiser la route actuelle
    this.currentRoute = this.router.url;
  }

  sidebarItems: SidebarItem[] = [
    {
      label: 'Tableau de bord',
      icon: 'dashboard',
      route: '/dashboard'
    },
    {
      label: 'Examens',
      icon: 'quiz',
      route: '/dashboard/examens',
      badge: 'Nouveau'
    },
    {
      label: 'Étudiants',
      icon: 'people',
      route: '/dashboard/etudiants'
    },
    {
      label: 'Absences',
      icon: 'event_busy',
      route: '/dashboard/absences'
    },
    {
      label: 'Promotions',
      icon: 'school',
      route: '/dashboard/promotions'
    },
    {
      label: 'Établissements',
      icon: 'business',
      route: '/dashboard/etablissements'
    },
    {
      label: 'Salles',
      icon: 'meeting_room',
      route: '/dashboard/salles'
    },
    {
      label: 'Rattrapages',
      icon: 'event_note',
      route: '/dashboard/rattrapages'
    },
    {
      label: 'Statistiques',
      icon: 'analytics',
      route: '/dashboard/statistiques'
    },
    {
      label: 'Paramètres',
      icon: 'settings',
      route: '/dashboard/parametres'
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigateTo(route: string): void {
    // Navigation simple et directe
    this.router.navigate([route]);
  }


}
