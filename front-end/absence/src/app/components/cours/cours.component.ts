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
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;

  // Filtres
  filters: CoursFilters = {
    size: 10,
    page: 1,
    searchValue: ''
  };

  // Options pour les filtres
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  groups: any[] = [];
  villes: any[] = [];

  constructor(
    private coursService: CoursService,
    public router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    // Vérifier l'authentification avant de charger les données
    if (!this.authService.isLoggedIn()) {
      console.log('Utilisateur non authentifié, redirection vers la connexion');
      this.router.navigate(['/login']);
      return;
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
    this.filters.page = 1;
    this.currentPage = 1; // Synchroniser la page courante
    this.loadCours();
  }

  clearFilters() {
    this.filters = {
      size: this.itemsPerPage,
      page: 1,
      searchValue: ''
    };
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
    this.router.navigate(['/dashboard/add-cours']);
  }

  editCours(cours: Cours) {
    this.router.navigate(['/dashboard/edit-cours', cours.id]);
  }

  viewCoursAttendance(cours: Cours) {
    this.router.navigate(['/dashboard/cours', cours.id, 'attendance']);
  }

  deleteCours(cours: Cours) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le cours "${cours.name}" ?`)) {
      this.coursService.deleteCours(cours.id).subscribe({
        next: () => {
          this.loadCours();
        },
        error: (error) => {
          this.error = 'Erreur lors de la suppression du cours';
          console.error('Erreur:', error);
        }
      });
    }
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
}
