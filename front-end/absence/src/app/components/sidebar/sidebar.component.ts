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
  roles?: string[]; // Add roles property
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
  filteredSidebarItems: SidebarItem[] = [];

  // Données utilisateur
  userData: any = {
    name: 'Utilisateur',
    role: 'Utilisateur',
    email: '',
    avatar: 'person'
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
    
    // Filtrer immédiatement avec le rôle du localStorage si disponible
    setTimeout(() => {
      this.filterSidebarItems();
    }, 100);
    
    // Recharger les données utilisateur périodiquement pour s'assurer qu'elles sont à jour
    setInterval(() => {
      this.loadUserData();
    }, 30000); // Toutes les 30 secondes
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
      // Récupérer les données utilisateur depuis les cookies avec les bonnes clés
      const userDataString = this.cookieService.get('user_data');
      const token = this.cookieService.get('auth_token');
      
      if (userDataString) {
        const userData = JSON.parse(userDataString);
        console.log('Données utilisateur récupérées:', userData);
        
        this.userData = {
          name: this.formatUserName(userData),
          role: this.formatUserRole(userData),
          email: userData.email || '',
          avatar: this.getUserAvatar(userData.role_id || userData.role?.name || 'user')
        };
        
        // Synchroniser le stockage local avec le rôle réel
        this.synchronizeRoleStorage(userData);
        
        console.log('Données utilisateur formatées:', this.userData);
      } else if (token) {
        // Si pas de données utilisateur mais un token, essayer de décoder le JWT
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Payload JWT:', payload);
          
          this.userData = {
            name: this.formatUserName(payload),
            role: this.formatUserRole(payload),
            email: payload.email || '',
            avatar: this.getUserAvatar(payload.role || 'user')
          };
          
          // Synchroniser le stockage local avec le rôle réel
          this.synchronizeRoleStorage(payload);
        } catch (e) {
          console.warn('Impossible de décoder le token JWT:', e);
        }
      } else {
        console.warn('Aucune donnée utilisateur trouvée dans les cookies');
      }
      
      // Filtrer les éléments de sidebar après chargement des données utilisateur
      this.filterSidebarItems();
    } catch (error) {
      console.error('Erreur lors du chargement des données utilisateur:', error);
      // Garder les valeurs par défaut
    }
  }

  // Synchronise le rôle dans le localStorage pour un usage cohérent côté app/guards
  private synchronizeRoleStorage(source: any): void {
    try {
      // Extraire le role_id et le nom du rôle quand disponibles
      const roleId = source.role_id || source.role?.id || null;
      let roleName = source.role?.name || source.role_name || null;

      // Mapper role_id quand rôle absent (ex: 6 => enseignant, 8 => defilement)
      if (!roleName && roleId) {
        roleName = this.getRoleNameById(roleId);
        console.log('🔍 Rôle mappé depuis role_id:', roleId, '->', roleName);
      }

      // Normaliser en minuscule pour cohérence avec RoleGuard
      // Gérer les accents (défilement -> defilement)
      if (roleName) {
        let normalized = String(roleName).toLowerCase().trim();
        // Normaliser les accents
        normalized = normalized
          .replace(/é/g, 'e')
          .replace(/è/g, 'e')
          .replace(/ê/g, 'e')
          .replace(/à/g, 'a')
          .replace(/â/g, 'a')
          .replace(/ô/g, 'o')
          .replace(/ù/g, 'u')
          .replace(/û/g, 'u');
        localStorage.setItem('userRole', normalized);
        console.log('🔍 Rôle stocké dans localStorage:', normalized);
      }
      if (roleId) {
        localStorage.setItem('role_id', String(roleId));
        console.log('🔍 role_id stocké dans localStorage:', roleId);
      }
    } catch (e) {
      console.warn('Impossible de synchroniser le rôle dans le stockage local:', e);
    }
  }

  // Méthode pour filtrer les éléments de sidebar selon le rôle
  private filterSidebarItems(): void {
    const normalizedRole = this.getNormalizedRole();
    const rawUserRole = localStorage.getItem('userRole');
    const userDataRole = this.userData.role;
    
    console.log('🔍 Filtrage sidebar - Rôle brut localStorage:', rawUserRole);
    console.log('🔍 Filtrage sidebar - Rôle userData:', userDataRole);
    console.log('🔍 Filtrage sidebar - Rôle utilisateur normalisé:', normalizedRole);
    console.log('🔍 Sidebar items totaux:', this.sidebarItems.length);
    
    if (!normalizedRole) {
      console.warn('⚠️ Aucun rôle utilisateur trouvé');
      console.warn('⚠️ localStorage userRole:', localStorage.getItem('userRole'));
      console.warn('⚠️ userData.role:', this.userData.role);
      this.filteredSidebarItems = [];
      return;
    }

    this.filteredSidebarItems = this.sidebarItems.filter(item => {
      // Si l'élément n'a pas de rôles définis, l'afficher pour tous
      if (!item.roles || item.roles.length === 0) {
        return true;
      }
      
      // Normaliser les rôles de l'item pour comparaison (gérer les accents)
      const normalizedItemRoles = item.roles.map(r => {
        let normalized = r.toLowerCase().trim().replace(/\s+/g, '-');
        // Normaliser les accents pour la comparaison
        normalized = normalized
          .replace(/é/g, 'e')
          .replace(/è/g, 'e')
          .replace(/ê/g, 'e')
          .replace(/à/g, 'a')
          .replace(/â/g, 'a')
          .replace(/ô/g, 'o')
          .replace(/ù/g, 'u')
          .replace(/û/g, 'u');
        return normalized;
      });
      const hasAccess = normalizedItemRoles.includes(normalizedRole);
      
      // Log spécifique pour Rattrapages
      if (item.label === 'Rattrapages' && item.route === '/rattrapages-defilement') {
        console.log('🔍 [Rattrapages - Défilement] Rôles item:', normalizedItemRoles);
        console.log('🔍 [Rattrapages - Défilement] Rôle user:', normalizedRole);
        console.log('🔍 [Rattrapages - Défilement] Accès:', hasAccess);
        console.log('🔍 [Rattrapages - Défilement] Rôles bruts item:', item.roles);
      }
      
      // Log spécifique pour Traçabilité
      if (item.label === 'Traçabilité') {
        console.log('🔍 [Traçabilité] Rôles item:', normalizedItemRoles);
        console.log('🔍 [Traçabilité] Rôle user:', normalizedRole);
        console.log('🔍 [Traçabilité] Accès:', hasAccess);
      }
      
      // Vérifier si le rôle de l'utilisateur est dans la liste des rôles autorisés
      return hasAccess;
    });
    
    console.log('🔍 Items filtrés:', this.filteredSidebarItems.length);
    console.log('🔍 Labels des items filtrés:', this.filteredSidebarItems.map(i => i.label));
  }

  // Méthode pour formater le nom de l'utilisateur de manière professionnelle
  private formatUserName(userData: any): string {
    // Essayer différentes propriétés possibles pour le nom
    const firstName = userData.firstname || userData.first_name || userData.prenom || '';
    const lastName = userData.lastname || userData.last_name || userData.nom || userData.name || '';
    
    // Si on a prénom et nom, les combiner avec une mise en forme professionnelle
    if (firstName && lastName) {
      return `${this.formatNameProperly(firstName)} ${this.formatNameProperly(lastName)}`;
    }
    
    // Sinon, utiliser ce qui est disponible avec formatage approprié
    const name = firstName || lastName || userData.username || userData.login || 'Utilisateur';
    return this.formatNameProperly(name);
  }

  // Méthode pour formater un nom de manière professionnelle
  private formatNameProperly(name: string): string {
    if (!name) return name;
    
    // Supprimer les espaces en début/fin et normaliser les espaces multiples
    const cleanName = name.trim().replace(/\s+/g, ' ');
    
    // Diviser en mots et capitaliser chaque mot
    return cleanName
      .split(' ')
      .map(word => this.capitalizeFirstLetter(word))
      .join(' ');
  }

  // Méthode utilitaire pour capitaliser la première lettre
  private capitalizeFirstLetter(text: string): string {
    if (!text) return text;
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }

  // Méthode pour formater le rôle de l'utilisateur
  private formatUserRole(userData: any): string {
    // Essayer différentes propriétés pour le rôle
    let role = userData.role?.name || userData.role_name || userData.fonction || userData.position || '';
    
    // Si on a un role_id, mapper vers le nom de rôle
    if (!role && userData.role_id) {
      role = this.getRoleNameById(userData.role_id);
    }
    
    // Formater le rôle pour qu'il soit plus lisible
    if (role) {
      // Remplacer les tirets par des espaces et capitaliser
      return role.replace(/-/g, ' ')
                 .split(' ')
                 .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                 .join(' ');
    }
    
    return 'Utilisateur';
  }
  
  // Méthode pour obtenir le rôle normalisé (pour comparaison)
  private getNormalizedRole(): string | null {
    // Essayer d'abord depuis localStorage
    let userRole = localStorage.getItem('userRole');
    
    // Si pas trouvé, essayer depuis userData
    if (!userRole) {
      userRole = this.userData.role?.toLowerCase();
    }
    
    // Si toujours pas trouvé, essayer depuis role_id
    if (!userRole) {
      const roleId = localStorage.getItem('role_id');
      if (roleId) {
        const roleIdNum = parseInt(roleId, 10);
        if (!isNaN(roleIdNum)) {
          userRole = this.getRoleNameById(roleIdNum);
        }
      }
    }
    
    if (!userRole) {
      return null;
    }
    
    // Normaliser : enlever les espaces, mettre en minuscule, remplacer espaces par tirets
    // Gérer aussi les accents (défilement -> defilement)
    let normalized = userRole.toLowerCase().trim().replace(/\s+/g, '-');
    // Normaliser les accents pour la comparaison
    normalized = normalized
      .replace(/é/g, 'e')
      .replace(/è/g, 'e')
      .replace(/ê/g, 'e')
      .replace(/à/g, 'a')
      .replace(/â/g, 'a')
      .replace(/ô/g, 'o')
      .replace(/ù/g, 'u')
      .replace(/û/g, 'u');
    
    return normalized;
  }

  // Méthode pour mapper les IDs de rôles vers les noms avec icônes
  private getRoleNameById(roleId: number): string {
    const roleMapping: { [key: number]: string } = {
      1: 'super-admin',
      2: 'admin', 
      3: 'scolarite',   // ID 3: Scolarité
      4: 'doyen',       // ID 4: Doyen
      5: 'technicien',  // ID 5: Technicien SI
      6: 'enseignant',   // ID 6: Enseignant
      8: 'defilement'        // ID 8: Défilement
    };
    
    return roleMapping[roleId] || 'user';
  }

  // Méthode pour obtenir une description plus détaillée du rôle
  public getRoleDescription(roleId: number): string {
    const descriptions: { [key: number]: string } = {
      1: 'Accès complet au système',
      2: 'Gestion administrative',
      3: 'Gestion scolaire',        // Scolarité
      4: 'Gestion de la faculté',   // Doyen
      5: 'Accès aux fonctionnalités techniques',  // Technicien SI
      6: 'Accès enseignants',
      8: 'Compte dédié au défilement des écrans publics'
    };
    
    return descriptions[roleId] || 'Accès standard';
  }

  // Méthode pour déterminer l'icône selon le rôle
  private getUserAvatar(role: string | number): string {
    // Si c'est un nombre, mapper vers le nom de rôle
    if (typeof role === 'number') {
      role = this.getRoleNameById(role);
    }
    
    const roleLower = (role as string).toLowerCase();
    
    if (roleLower.includes('super') || roleLower.includes('super-admin')) {
      return 'supervisor_account';
    } else if (roleLower.includes('admin') || roleLower.includes('administrateur')) {
      return 'admin_panel_settings';
    } else if (roleLower.includes('scolarite') || roleLower.includes('scolarité')) {
      return 'school';
    } else if (roleLower.includes('doyen')) {
      return 'account_circle';
    } else if (roleLower.includes('technicien')) {
      return 'build';  // Icône pour Technicien SI
    } else if (roleLower.includes('prof') || roleLower.includes('enseignant') || roleLower.includes('teacher')) {
      return 'school';
    } else if (roleLower.includes('etudiant') || roleLower.includes('student') || roleLower.includes('élève')) {
      return 'person';
    } else if (roleLower.includes('affichage')) {
      return 'live_tv';
    } else if (roleLower.includes('defilement') || roleLower.includes('défilement')) {
      return 'slideshow';
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
      this.filteredSidebarItems.forEach(item => {
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
      tooltip: 'Vue d\'ensemble du système',
      roles: ['super-admin', 'admin', 'scolarite', 'enseignant', 'doyen']
    },
    {
      label: 'Examens',
      icon: 'quiz',
      route: '/examens',
      badge: '',
      tooltip: 'Gestion des examens',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen', 'technicien', 'defilement']
    },
    {
      label: 'Cours',
      icon: 'class',
      route: '/cours',
      tooltip: 'Gestion des cours',
      roles: ['super-admin', 'admin', 'scolarite', 'enseignant', 'doyen', 'technicien', 'defilement']
    },
    {
      label: 'Enseignants',
      icon: 'person_pin',
      route: '/enseignants',
      tooltip: 'Gestion des enseignants',
      roles: ['super-admin', 'admin']
    },
    {
      label: 'Étudiants',
      icon: 'people',
      route: '/etudiants',
      tooltip: 'Gestion des étudiants',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen', 'technicien']
    },
    {
      label: 'Groupes',
      icon: 'groups',
      route: '/groups',
      tooltip: 'Gestion des groupes d\'étudiants',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen']
    },
    {
      label: 'Absences',
      icon: 'event_busy',
      route: '/absences',
      tooltip: 'Suivi des absences',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen', 'technicien']
    },
    {
      label: 'Traquer Étudiant',
      icon: 'person_search',
      route: '/tracker',
      tooltip: 'Suivi détaillé de la présence d\'un étudiant',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen']
    },
    {
      label: 'Attendance Rapide',
      icon: 'speed',
      route: '/attendance-rapide',
      tooltip: 'Import rapide et récupération des présences',
      roles: ['super-admin', 'admin']
    },
    {
      label: 'Promotions',
      icon: 'school',
      route: '/promotions',
      tooltip: 'Gestion des promotions',
      roles: ['super-admin', 'admin', 'scolarite']
    },
    {
      label: 'Établissements',
      icon: 'business',
      route: '/etablissements',
      tooltip: 'Gestion des établissements',
      roles: ['super-admin', 'admin']
    },
    {
      label: 'Salles',
      icon: 'meeting_room',
      route: '/salles',
      tooltip: 'Gestion des salles',
      roles: ['super-admin', 'admin', 'doyen']
    },
    {
      label: 'Rattrapages',
      icon: 'event_note',
      route: '/rattrapages',
      tooltip: 'Gestion des rattrapages',
      roles: ['super-admin', 'admin', 'scolarite', 'doyen', 'technicien']
    },
    {
      label: 'Rattrapages',
      icon: 'slideshow',
      route: '/rattrapages-defilement',
      tooltip: 'Défilement des rattrapages (lecture seule)',
      roles: ['defilement', 'défilement']
    },
    {
      label: 'Gestion des utilisateurs',
      icon: 'admin_panel_settings',
      route: '/user-management',
      tooltip: 'Gestion complète des utilisateurs et rôles',
      roles: ['super-admin']
    },
    {
      label: 'Traçabilité',
      icon: 'history',
      route: '/activity-logs',
      tooltip: 'Journal des activités du système',
      roles: ['super-admin']
    },
    {
      label: 'Configuration',
      icon: 'settings',
      route: '/configuration',
      tooltip: 'Configuration de la base de données',
      roles: ['super-admin']
    },
    {
      label: 'Statistiques',
      icon: 'analytics',
      route: '/statistiques',
      tooltip: 'Tableaux de bord et rapports',
      roles: ['super-admin', 'admin']
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

  // Méthode pour naviguer vers le profil
  navigateToProfile(): void {
    if (this.isMobile && !this.isCollapsed) {
      // Fermer automatiquement le sidebar sur mobile après navigation
      setTimeout(() => {
        this.toggleSidebar();
      }, 150);
    }
    
    // Navigation vers le profil avec animation
    this.router.navigate(['/profile']).then(() => {
      this.updateActiveStates();
    });
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

  // Méthode publique pour recharger les données utilisateur
  public refreshUserData(): void {
    this.loadUserData();
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
