import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoursService, Cours, CoursFilters, CoursResponse } from '../../services/cours.service';

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

  constructor(
    private coursService: CoursService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCours();
    this.loadFilterOptions();
  }

  loadCours() {
    this.loading = true;
    this.error = '';

    this.coursService.getCours(this.filters).subscribe({
      next: (response: CoursResponse) => {
        this.cours = response.data;
        this.currentPage = response.current_page;
        this.totalPages = response.last_page;
        this.totalItems = response.total;
        this.loading = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des cours';
        this.loading = false;
        console.error('Erreur:', error);
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
      },
      error: (error) => {
        console.error('Erreur lors du chargement des options de filtre:', error);
      }
    });
  }

  onSearch() {
    this.filters.page = 1;
    this.loadCours();
  }

  onFilterChange() {
    this.filters.page = 1;
    this.loadCours();
  }

  clearFilters() {
    this.filters = {
      size: 10,
      page: 1,
      searchValue: ''
    };
    this.loadCours();
  }

  onPageChange(page: number) {
    this.filters.page = page;
    this.loadCours();
  }

  onItemsPerPageChange() {
    this.filters.size = this.itemsPerPage;
    this.filters.page = 1;
    this.loadCours();
  }

  addCours() {
    this.router.navigate(['/dashboard/add-cours']);
  }

  editCours(cours: Cours) {
    this.router.navigate(['/dashboard/edit-cours', cours.id]);
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

  getStatusClass(statut: string): string {
    switch (statut) {
      case 'passé':
        return 'bg-gray-100 text-gray-800';
      case 'en_cours':
        return 'bg-green-100 text-green-800';
      case 'futur':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
