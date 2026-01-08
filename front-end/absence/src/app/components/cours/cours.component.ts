import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoursService, Cours, CoursFilters, CoursResponse } from '../../services/cours.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-cours',
  imports: [CommonModule, FormsModule],
  templateUrl: './cours.component.html',
  styleUrl: './cours.component.css'
})
export class CoursComponent implements OnInit {
  cours: Cours[] = [];
  loading = false;
  error = '';
  showImportMenu = false;
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 12;

  // Filtres
  filters: CoursFilters = {
    size: 12,
    page: 1,
    searchValue: '',
    date: new Date().toISOString().split('T')[0] // Date d'aujourd'hui par défaut
  };

  // Options pour les filtres
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  groups: any[] = [];
  villes: any[] = [];

  // Propriétés pour verrouiller l'établissement pour le rôle defilement
  userEtablissementId: number | null = null;
  isEtablissementLocked = false;

  constructor(
    private coursService: CoursService,
    public router: Router,
    public authService: AuthService
  ) {}

  ngOnInit() {
    // Vérifier l'authentification avant de charger les données
    if (!this.authService.isLoggedIn()) {
      console.log('Utilisateur non authentifié, redirection vers la connexion');
      this.router.navigate(['/login']);
      return;
    }

    // Verrouiller l'établissement pour tous les utilisateurs qui ont un établissement_id
    // SAUF super-admin (role_id = 1) et ceux sans établissement
    const userRoleId = this.authService.getUserRole();
    const userEtablissementId = this.authService.getUserEtablissementId();
    const isSuperAdmin = userRoleId === 1;
    
    if (!isSuperAdmin && userEtablissementId > 0) {
      this.userEtablissementId = userEtablissementId;
      this.isEtablissementLocked = true;
      
      // Forcer la valeur de l'établissement dans les filtres
      this.filters.etablissement_id = this.userEtablissementId;
    }

    this.loadCours();
    this.loadFilterOptions();
    
    // Rafraîchir le statut temporel toutes les minutes
    setInterval(() => {
      if (this.cours.length > 0) {
        this.cours = this.coursService.applyCalculatedStatutTemporelToList(this.cours);
      }
    }, 60000); // 60 secondes
  }

  loadCours() {
    this.loading = true;
    this.error = '';

    // Synchroniser les filtres avec les paramètres de pagination
    this.filters.size = this.itemsPerPage;
    this.filters.page = this.currentPage;

    // Forcer l'établissement de l'utilisateur si verrouillé
    if (this.isEtablissementLocked && this.userEtablissementId) {
      this.filters.etablissement_id = this.userEtablissementId;
    }

    console.log('Chargement des cours avec les filtres:', this.filters);

    this.coursService.getCours(this.filters).subscribe({
      next: (response: CoursResponse) => {
        console.log('Réponse reçue:', response);
        // Appliquer le calcul automatique du statut temporel
        this.cours = this.coursService.applyCalculatedStatutTemporelToList(response.data);
        this.currentPage = response.current_page;
        this.totalPages = response.last_page;
        this.totalItems = response.total;
        this.loading = false;
        console.log('Cours chargés:', this.cours.length);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des cours:', error);
        
        if (error.status === 401) {
          this.error = 'Session expirée. Veuillez vous reconnecter.';
          this.authService.logout();
          this.router.navigate(['/login']);
        } else if (error.status === 403) {
          this.error = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        } else if (error.status === 0) {
          this.error = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
        } else {
          this.error = 'Erreur lors du chargement des cours: ' + (error.message || 'Erreur inconnue');
        }
        
        this.loading = false;
        this.cours = []; // S'assurer que la liste est vide en cas d'erreur
      }
    });
  }

  loadFilterOptions() {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        this.etablissements = options.etablissements || [];
        this.promotions = options.promotions || [];
        this.salles = options.salles || [];
        this.typesCours = options.types_cours || [];
        this.groups = options.groups || [];
        this.villes = options.villes || [];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des options de filtre:', error);
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  onSearch() {
    this.filters.page = 1;
    this.currentPage = 1; // Synchroniser la page courante
    this.loadCours();
  }

  onFilterChange() {
    // Forcer l'établissement de l'utilisateur si verrouillé
    if (this.isEtablissementLocked && this.userEtablissementId) {
      this.filters.etablissement_id = this.userEtablissementId;
    }
    
    this.filters.page = 1;
    this.currentPage = 1; // Synchroniser la page courante
    this.loadCours();
  }

  clearFilters() {
    // Obtenir la date d'aujourd'hui au format YYYY-MM-DD
    const today = new Date().toISOString().split('T')[0];
    
    // Si l'établissement est verrouillé, ne pas le réinitialiser
    if (this.isEtablissementLocked && this.userEtablissementId) {
      this.filters = {
        size: this.itemsPerPage,
        page: 1,
        searchValue: '',
        etablissement_id: this.userEtablissementId,
        date: today // Remettre la date d'aujourd'hui
      };
    } else {
      this.filters = {
        size: this.itemsPerPage,
        page: 1,
        searchValue: '',
        date: today // Remettre la date d'aujourd'hui
      };
    }
    this.currentPage = 1; // Réinitialiser la page courante
    this.loadCours();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.currentPage = page; // Synchroniser la page courante
    this.loadCours();
  }

  onItemsPerPageChange() {
    this.filters.size = this.itemsPerPage;
    this.filters.page = 1;
    this.currentPage = 1; // Synchroniser la page courante
    this.loadCours();
  }

  addCours() {
    this.router.navigate(['/add-cours']);
  }

  importCours() {
    this.router.navigate(['/import-cours']);
  }

  importCoursSimple() {
    this.router.navigate(['/import-cours-simple']);
  }

  editCours(cours: Cours) {
    this.router.navigate(['/edit-cours', cours.id]);
  }

  viewCoursAttendance(cours: Cours) {
    this.router.navigate(['/cours', cours.id, 'attendance']);
  }

  deleteCours(cours: Cours) {
    // Empêcher la suppression pour les comptes de défilement
    if (this.isDefilementRole()) {
      console.warn('Les comptes de défilement ne peuvent pas supprimer des cours');
      return;
    }
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer le cours "${cours.name}" ?`)) {
      this.coursService.deleteCours(cours.id).subscribe({
        next: () => {
          this.loadCours();
        },
        error: (error) => {
          if (error.status === 400) {
            this.error = error.error.message || 'Les cours passés ne peuvent pas être supprimés. Veuillez les archiver à la place.';
          } else {
            this.error = 'Erreur lors de la suppression du cours';
          }
          console.error('Erreur:', error);
        }
      });
    }
  }

  // Naviguer vers la page des cours archivés
  openArchivedCours(): void {
    this.router.navigate(['/cours-archived']);
  }

  // Archiver un cours
  archiveCours(cours: Cours): void {
    // Import dynamique pour compat SSR (évite document is not defined)
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Archiver le cours ?',
        text: `Voulez-vous archiver le cours "${cours.name}" ?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Oui, archiver',
        cancelButtonText: 'Annuler'
      }).then((result) => {
        if (result.isConfirmed) {
          this.loading = true;
          this.error = '';

          this.coursService.archiveCours(cours.id).subscribe({
            next: () => {
              Swal.fire({
                title: 'Cours archivé !',
                text: 'Le cours a été archivé avec succès.',
                icon: 'success',
                confirmButtonText: 'OK'
              });
              this.loading = false;
              this.loadCours();
            },
            error: (error) => {
              console.error('Erreur lors de l\'archivage:', error);
              Swal.fire({
                title: 'Erreur',
                text: error.error?.message || 'Erreur lors de l\'archivage du cours',
                icon: 'error',
                confirmButtonText: 'OK'
              });
              this.loading = false;
            }
          });
        }
      });
    });
  }


  getStatusText(statut: string): string {
    switch (statut) {
      case 'passé':
        return 'Passé';
      case 'en_cours':
        return 'En cours';
      case 'futur':
        return 'Futur';
      default:
        return statut;
    }
  }

  getStatusDetails(cours: any): string {
    const now = new Date();
    const coursDate = new Date(cours.date);
    const coursDateTimeDebut = new Date(`${cours.date}T${cours.heure_debut}`);
    const coursDateTimeFin = new Date(`${cours.date}T${cours.heure_fin}`);
    
    if (cours.statut_temporel === 'futur') {
      const diffMs = coursDateTimeDebut.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `Dans ${diffHours}h ${diffMinutes}min`;
      } else if (diffMinutes > 0) {
        return `Dans ${diffMinutes}min`;
      } else {
        return 'Bientôt';
      }
    } else if (cours.statut_temporel === 'en_cours') {
      const diffMs = coursDateTimeFin.getTime() - now.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `Finit dans ${diffHours}h ${diffMinutes}min`;
      } else if (diffMinutes > 0) {
        return `Finit dans ${diffMinutes}min`;
      } else {
        return 'Se termine bientôt';
      }
    } else if (cours.statut_temporel === 'passé') {
      const diffMs = now.getTime() - coursDateTimeFin.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      if (diffHours > 0) {
        return `Il y a ${diffHours}h ${diffMinutes}min`;
      } else if (diffMinutes > 0) {
        return `Il y a ${diffMinutes}min`;
      } else {
        return 'Récemment terminé';
      }
    }
    
    return '';
  }

  getMinValue(a: number, b: number): number {
    return Math.min(a, b);
  }

  calculateDuration(startTime: string, endTime: string): string {
    if (!startTime || !endTime) return 'N/A';
    
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}min`;
    } else {
      return `${diffMinutes}min`;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    const startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  /**
   * Obtient la liste des salles (pour l'affichage en tags)
   */
  getSalles(coursItem: Cours): { id: number; name: string }[] {
    if (!coursItem) {
      return [];
    }

    if (coursItem.salles && coursItem.salles.length > 0) {
      return coursItem.salles.map((s: any) => ({ id: s.id, name: s.name }));
    } else if (coursItem.salle?.name) {
      return [{ id: coursItem.salle.id, name: coursItem.salle.name }];
    }

    return [];
  }

  /**
   * Obtient la liste formatée des noms de salles (pour compatibilité)
   */
  getSallesNames(coursItem: Cours): string {
    const salles = this.getSalles(coursItem);
    if (salles.length === 0) {
      return 'N/A';
    }
    return salles.map(s => s.name).join(', ');
  }

  /**
   * Obtient la liste formatée des noms de groupes
   */
  getGroupsNames(coursItem: Cours): string {
    if (!coursItem) {
      return 'N/A';
    }

    if (coursItem.groups && coursItem.groups.length > 0) {
      return coursItem.groups.map((g: any) => g.title || g.name).join(', ');
    }

    return 'N/A';
  }

  /**
   * Ouvrir l'affichage public des absences pour un cours
   */
  openPublicDisplay(cours: Cours): void {
    if (!cours.id) {
      console.error('ID de cours manquant');
      return;
    }
    
    // Ouvrir dans une nouvelle fenêtre en plein écran
    const url = `/cours-display/${cours.id}`;
    window.open(url, '_blank', 'fullscreen=yes');
  }

  /**
   * Vérifie si l'utilisateur connecté est un compte Défilement
   */
  public isDefilementRole(): boolean {
    const userRole = this.authService.getUserRoleName();
    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s-]/g, '') : '';
    return normalizedRole === 'defilement' || normalizedRole === 'défilement';
  }

  /**
   * Vérifier si l'utilisateur peut accéder à l'affichage public
   */
  canAccessPublicDisplay(): boolean {
    const userRole = this.authService.getUserRoleName();
    const normalizedRole = userRole ? userRole.toLowerCase().replace(/[\s-]/g, '') : '';
    
    // Autoriser super-admin, admin et rôle dédié au défilement
    return normalizedRole === 'superadmin' 
      || normalizedRole === 'admin'
      || normalizedRole === 'defilement'
      || normalizedRole === 'défilement';
  }
}
