import { Component, Input, OnInit, Output, EventEmitter, HostListener, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

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

  // Données utilisateur
  userData: any = {
    name: 'Administrateur',
    role: 'Admin System',
    email: '',
    avatar: 'admin_panel_settings'
  };

  constructor(
    private router: Router,
    private cookieService: CookieService
  ) {}

  ngOnInit(): void {
    this.checkMobile();
    this.initializeRouteTracking();
    this.setupKeyboardNavigation();
    this.loadUserData();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.checkMobile();
  }

  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768; // Utilise le breakpoint md de Tailwind
  }

  // Méthode pour charger les données utilisateur depuis les cookies
  private loadUserData(): void {
    try {
      // Récupérer les données utilisateur depuis les cookies
      const userCookie = this.cookieService.get('user');
      const tokenCookie = this.cookieService.get('token');
      
      if (userCookie) {
        const userData = JSON.parse(userCookie);
        this.userData = {
          name: userData.name || userData.nom || userData.firstname || 'Utilisateur',
          role: userData.role || userData.role_name || userData.fonction || 'Utilisateur',
          email: userData.email || userData.email_address || '',
          avatar: this.getUserAvatar(userData.role || userData.role_name || 'user')
        };
      } else if (tokenCookie) {
        // Si pas de données utilisateur mais un token, essayer de décoder le JWT
        try {
          const payload = JSON.parse(atob(tokenCookie.split('.')[1]));
          this.userData = {
            name: payload.name || payload.nom || payload.sub || 'Utilisateur',
            role: payload.role || payload.role_name || 'Utilisateur',
            email: payload.email || '',
            avatar: this.getUserAvatar(payload.role || 'user')
          };
        } catch (e) {
          console.warn('Impossible de décoder le token JWT');
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      // Garder les valeurs par défaut
    }
  }

  // Méthode pour déterminer l'icône selon le rôle
  private getUserAvatar(role: string): string {
    const roleLower = role.toLowerCase();
    
    if (roleLower.includes('admin') || roleLower.includes('administrateur')) {
      return 'admin_panel_settings';
    } else if (roleLower.includes('prof') || roleLower.includes('enseignant') || roleLower.includes('teacher')) {
      return 'school';
    } else if (roleLower.includes('etudiant') || roleLower.includes('student') || roleLower.includes('élève')) {
      return 'person';
    } else if (roleLower.includes('secretaire') || roleLower.includes('secretary')) {
      return 'admin_panel_settings';
    } else if (roleLower.includes('directeur') || roleLower.includes('director')) {
      return 'supervisor_account';
    } else {
      return 'person';
    }
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
    }, 50);
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
      label: 'Configuration',
      icon: 'settings',
      route: '/dashboard/configuration',
      tooltip: 'Configuration de la base de données'
    },
    {
      label: 'Statistiques',
      icon: 'analytics',
      route: '/dashboard/statistiques',
      tooltip: 'Tableaux de bord et rapports'
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
    if (this.isMobile && !this.isCollapsed) {
      // Fermer automatiquement le sidebar sur mobile après navigation
      setTimeout(() => {
        this.toggleSidebar();
      }, 150);
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
    return `${index * 30}ms`;
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
    if (this.isMobile && !this.isCollapsed && this.sidebarRef) {
      const target = event.target as HTMLElement;
      if (!this.sidebarRef.nativeElement.contains(target)) {
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

  // Méthode de déconnexion
  logout(): void {
    // Confirmation avant déconnexion
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      // Supprimer tous les tokens et données utilisateur du localStorage
      this.clearLocalStorage();
      
      // Supprimer tous les tokens et données utilisateur du sessionStorage
      this.clearSessionStorage();
      
      // Supprimer tous les cookies liés à l'authentification
      this.clearAuthCookies();
      
      // Rediriger vers la page de connexion
      window.location.href = '/login';
    }
  }

  // Méthode pour nettoyer le localStorage
  private clearLocalStorage(): void {
    const keysToRemove = [
      'token',
      'access_token',
      'refresh_token',
      'auth_token',
      'user',
      'user_data',
      'user_info',
      'current_user',
      'auth_user',
      'profile',
      'permissions',
      'roles',
      'sidebarCollapsed',
      'theme',
      'language'
    ];

    keysToRemove.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });

    // Supprimer tous les éléments qui commencent par 'auth_' ou 'user_'
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('auth_') || key.startsWith('user_') || key.startsWith('token_'))) {
        localStorage.removeItem(key);
      }
    }
  }

  // Méthode pour nettoyer le sessionStorage
  private clearSessionStorage(): void {
    const keysToRemove = [
      'token',
      'access_token',
      'refresh_token',
      'auth_token',
      'user',
      'user_data',
      'user_info',
      'current_user',
      'auth_user',
      'profile',
      'permissions',
      'roles'
    ];

    keysToRemove.forEach(key => {
      if (sessionStorage.getItem(key)) {
        sessionStorage.removeItem(key);
      }
    });

    // Supprimer tous les éléments qui commencent par 'auth_' ou 'user_'
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('auth_') || key.startsWith('user_') || key.startsWith('token_'))) {
        sessionStorage.removeItem(key);
      }
    }
  }

  // Méthode pour nettoyer les cookies d'authentification
  private clearAuthCookies(): void {
    const cookiesToRemove = [
      'token',
      'access_token',
      'refresh_token',
      'auth_token',
      'jwt',
      'session_id',
      'user_id',
      'auth_session',
      'remember_token',
      'csrf_token'
    ];

    // Supprimer les cookies pour le domaine actuel
    cookiesToRemove.forEach(cookieName => {
      this.deleteCookie(cookieName);
      this.deleteCookie(cookieName, '/');
      this.deleteCookie(cookieName, '/', window.location.hostname);
      this.deleteCookie(cookieName, '/', '.' + window.location.hostname);
    });

    // Supprimer tous les cookies qui commencent par 'auth_' ou 'user_'
    document.cookie.split(';').forEach(cookie => {
      const cookieName = cookie.split('=')[0].trim();
      if (cookieName.startsWith('auth_') || cookieName.startsWith('user_') || cookieName.startsWith('token_')) {
        this.deleteCookie(cookieName);
        this.deleteCookie(cookieName, '/');
        this.deleteCookie(cookieName, '/', window.location.hostname);
        this.deleteCookie(cookieName, '/', '.' + window.location.hostname);
      }
    });
  }

  // Méthode utilitaire pour supprimer un cookie
  private deleteCookie(name: string, path: string = '/', domain?: string): void {
    let cookieString = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=${path}`;
    
    if (domain) {
      cookieString += `; domain=${domain}`;
    }
    
    // Supprimer avec et sans le point
    document.cookie = cookieString;
    document.cookie = cookieString + '; secure';
    document.cookie = cookieString + '; samesite=strict';
  }
}
