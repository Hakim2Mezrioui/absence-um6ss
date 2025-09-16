import { Component, Input, OnInit, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SidebarItem {
  label: string;
  icon: string;
  route: string;
  badge?: string;
  children?: SidebarItem[];
  disabled?: boolean;
  tooltip?: string;
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
  @Output() sidebarToggled = new EventEmitter<boolean>();
  @ViewChild('sidebarRef', { static: false }) sidebarRef!: ElementRef;
  
  currentRoute: string = '';
  hoveredItem: string | null = null;
  isMobile = false;
  sidebarAnimation = 'slideIn';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkMobile();
    this.initializeRouteTracking();
    this.setupKeyboardNavigation();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 1024; // Utilise le breakpoint lg de Tailwind
  }

  private initializeRouteTracking(): void {
    // Écouter les changements de route
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
      this.updateActiveStates();
    });
    
    // Initialiser la route actuelle
    this.currentRoute = this.router.url;
    this.updateActiveStates();
  }

  private setupKeyboardNavigation(): void {
    // Navigation au clavier pour l'accessibilité
    document.addEventListener('keydown', (event) => {
      if (event.ctrlKey && event.key === 'b') {
        event.preventDefault();
        this.toggleSidebar();
      }
    });
  }

  private updateActiveStates(): void {
    // Mettre à jour les états actifs après un délai pour permettre l'animation
    setTimeout(() => {
      this.sidebarItems.forEach(item => {
        if (this.isActiveRoute(item.route)) {
          this.hoveredItem = item.route;
        }
      });
    }, 100);
  }

  sidebarItems: SidebarItem[] = [
    {
      label: 'Tableau de bord',
      icon: 'dashboard',
      route: '/dashboard',
      tooltip: 'Vue d\'ensemble du système'
    },
    {
      label: 'Examens',
      icon: 'quiz',
      route: '/dashboard/examens',
      badge: '',
      tooltip: 'Gestion des examens'
    },
    {
      label: 'Cours',
      icon: 'class',
      route: '/dashboard/cours',
      tooltip: 'Gestion des cours'
    },
    {
      label: 'Étudiants',
      icon: 'people',
      route: '/dashboard/etudiants',
      tooltip: 'Gestion des étudiants'
    },
    {
      label: 'Absences',
      icon: 'event_busy',
      route: '/dashboard/absences',
      tooltip: 'Suivi des absences'
    },
    {
      label: 'Promotions',
      icon: 'school',
      route: '/dashboard/promotions',
      tooltip: 'Gestion des promotions'
    },
    {
      label: 'Établissements',
      icon: 'business',
      route: '/dashboard/etablissements',
      tooltip: 'Gestion des établissements'
    },
    {
      label: 'Salles',
      icon: 'meeting_room',
      route: '/dashboard/salles',
      tooltip: 'Gestion des salles'
    },
    {
      label: 'Rattrapages',
      icon: 'event_note',
      route: '/dashboard/rattrapages',
      tooltip: 'Gestion des rattrapages'
    },
    {
      label: 'Statistiques',
      icon: 'analytics',
      route: '/dashboard/statistiques',
      tooltip: 'Tableaux de bord et rapports'
    },
    {
      label: 'Paramètres',
      icon: 'settings',
      route: '/dashboard/parametres',
      tooltip: 'Configuration du système'
    }
  ];

  toggleSidebar(): void {
    this.isCollapsed = !this.isCollapsed;
    this.sidebarToggled.emit(this.isCollapsed);
    
    // Animation de transition
    this.sidebarAnimation = this.isCollapsed ? 'slideOut' : 'slideIn';
    
    // Sauvegarder l'état dans le localStorage
    localStorage.setItem('sidebarCollapsed', this.isCollapsed.toString());
  }

  isActiveRoute(route: string): boolean {
    return this.currentRoute === route || this.currentRoute.startsWith(route + '/');
  }

  navigateTo(route: string): void {
    if (this.isMobile) {
      // Fermer automatiquement le sidebar sur mobile après navigation
      setTimeout(() => {
        this.toggleSidebar();
      }, 300);
    }
    
    // Navigation avec animation
    this.router.navigate([route]).then(() => {
      this.updateActiveStates();
    });
  }

  onItemHover(itemRoute: string): void {
    this.hoveredItem = itemRoute;
  }

  onItemLeave(): void {
    this.hoveredItem = null;
  }

  getItemClasses(item: SidebarItem): string {
    const baseClasses = 'nav-item group';
    const activeClasses = this.isActiveRoute(item.route) ? 'active' : '';
    const hoverClasses = this.hoveredItem === item.route ? 'hovered' : '';
    const disabledClasses = item.disabled ? 'disabled' : '';
    
    return `${baseClasses} ${activeClasses} ${hoverClasses} ${disabledClasses}`.trim();
  }

  getTooltipText(item: SidebarItem): string {
    if (this.isCollapsed && item.tooltip) {
      return item.tooltip;
    }
    return item.label;
  }

  // Méthodes utilitaires pour les animations
  getAnimationDelay(index: number): string {
    return `${index * 50}ms`;
  }

  // Gestion des événements tactiles pour mobile
  onTouchStart(event: TouchEvent): void {
    if (this.isMobile) {
      event.preventDefault();
    }
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.isMobile) {
      event.preventDefault();
    }
  }

  // Méthode pour fermer le sidebar sur mobile en cliquant à l'extérieur
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.isMobile && !this.isCollapsed) {
      const target = event.target as HTMLElement;
      if (this.sidebarRef && !this.sidebarRef.nativeElement.contains(target)) {
        this.toggleSidebar();
      }
    }
  }

  // Méthode pour gérer les raccourcis clavier
  @HostListener('keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        if (this.isMobile && !this.isCollapsed) {
          this.toggleSidebar();
        }
        break;
      case 'Enter':
      case ' ':
        if (event.target instanceof HTMLElement && event.target.classList.contains('nav-item')) {
          event.preventDefault();
          const route = event.target.getAttribute('data-route');
          if (route) {
            this.navigateTo(route);
          }
        }
        break;
    }
  }
}
