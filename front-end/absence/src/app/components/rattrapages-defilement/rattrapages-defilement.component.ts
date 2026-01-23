import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { RattrapageService, Rattrapage } from '../../services/rattrapage.service';
import { AuthService } from '../../services/auth.service';

interface RattrapageWithDuration extends Rattrapage {
  duration?: string;
  statut_temporel?: 'passé' | 'en_cours' | 'futur';
  salles?: Array<{ id: number; name: string }>;
  etablissement?: { id: number; name: string };
  ville?: { id: number; name: string };
}

@Component({
  selector: 'app-rattrapages-defilement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rattrapages-defilement.component.html',
  styleUrls: ['./rattrapages-defilement.component.css']
})
export class RattrapagesDefilementComponent implements OnInit {

  private rattrapageService = inject(RattrapageService);
  private router = inject(Router);
  private authService = inject(AuthService);

  rattrapages: RattrapageWithDuration[] = [];
  allRattrapages: RattrapageWithDuration[] = []; // Tous les rattrapages pour le filtrage côté client
  loading = false;
  error = '';

  // Pagination
  currentPage = 1;
  totalPages = 1;
  total = 0;
  perPage = 12;

  // Filtres
  searchValue = '';
  filterDate = '';
  filterDateFrom = '';
  filterDateTo = '';
  selectedStatus = '';

  ngOnInit(): void {
    this.loadRattrapages();
  }

  private loadRattrapages(page: number = 1): void {
    this.loading = true;
    this.error = '';

    // Construire les filtres
    const filters: any = {
      sort_by: 'created_at', // Trier par date de création
      sort_direction: 'desc' // Ordre décroissant (du plus récent au plus ancien)
    };
    if (this.searchValue.trim()) {
      filters.search = this.searchValue.trim();
    }
    if (this.filterDate) {
      filters.date = this.filterDate;
    }
    if (this.filterDateFrom) {
      filters.date_from = this.filterDateFrom;
    }
    if (this.filterDateTo) {
      filters.date_to = this.filterDateTo;
    }

    this.rattrapageService.getAllRattrapages(page, this.perPage, filters).subscribe({
      next: (response) => {
        if (response.success) {
          this.allRattrapages = (response.data || []).map((r: any) => ({
            ...r,
            duration: this.calculateDuration(r.start_hour, r.end_hour),
            statut_temporel: this.calculateStatutTemporel(r.date, r.start_hour, r.end_hour),
            salles: r.salles || []
          }));
          
          // Appliquer le filtre de statut côté client
          this.applyStatusFilter();
          
          this.currentPage = response.pagination?.current_page || 1;
          this.totalPages = response.pagination?.last_page || 1;
          this.total = response.pagination?.total || this.allRattrapages.length;
        } else {
          this.error = 'Erreur lors du chargement des rattrapages';
        }
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur chargement rattrapages (défilement):', err);
        this.error = 'Erreur lors du chargement des rattrapages';
        this.loading = false;
      }
    });
  }

  // Appliquer le filtre de statut côté client
  private applyStatusFilter(): void {
    if (!this.selectedStatus) {
      this.rattrapages = [...this.allRattrapages];
      this.total = this.allRattrapages.length;
      // Recalculer le nombre de pages
      this.totalPages = Math.ceil(this.total / this.perPage);
      return;
    }

    this.rattrapages = this.allRattrapages.filter(r => {
      return r.statut_temporel === this.selectedStatus;
    });
    
    // Mettre à jour le total et les pages
    this.total = this.rattrapages.length;
    this.totalPages = Math.ceil(this.total / this.perPage);
    
    // Si la page actuelle est supérieure au nombre de pages, revenir à la page 1
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }
  }

  // Méthodes pour gérer les filtres
  onSearchChange(): void {
    this.currentPage = 1;
    this.loadRattrapages(1);
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadRattrapages(1);
  }

  onStatusFilterChange(event: any): void {
    this.selectedStatus = event.target.value;
    this.applyStatusFilter();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.filterDate = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.selectedStatus = '';
    this.currentPage = 1;
    this.loadRattrapages(1);
  }

  calculateDuration(start: string, end: string): string {
    if (!start || !end) return '-';
    try {
      const [sh, sm] = start.split(':').map(Number);
      const [eh, em] = end.split(':').map(Number);
      const startMinutes = sh * 60 + sm;
      const endMinutes = eh * 60 + em;
      const diff = endMinutes - startMinutes;
      if (diff <= 0) return '-';
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      if (h > 0 && m > 0) return `${h}h${m.toString().padStart(2, '0')}`;
      if (h > 0) return `${h}h`;
      return `${m} min`;
    } catch {
      return '-';
    }
  }

  // Navigation vers l'interface d'attendance
  openAttendance(rattrapage: RattrapageWithDuration): void {
    if (rattrapage.id) {
      this.router.navigate(['/rattrapages', rattrapage.id, 'attendance']);
    }
  }

  // Navigation vers l'écran de défilement (plein écran)
  openDefilement(rattrapage: RattrapageWithDuration): void {
    if (rattrapage.id) {
      this.router.navigate(['/rattrapage-display', rattrapage.id]);
    }
  }

  // Pagination
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.loadRattrapages(page);
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  hasPrevPage(): boolean {
    return this.currentPage > 1;
  }

  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  // Optionnel : sécurité côté composant
  isDefilementRole(): boolean {
    const userRole = this.authService.getUserRoleName();
    if (!userRole) return false;
    const normalized = userRole.toLowerCase().replace(/[\s-]/g, '');
    return normalized === 'defilement' || normalized === 'défilement';
  }

  // Calculer le statut temporel
  calculateStatutTemporel(date: string, startHour: string, endHour: string): 'passé' | 'en_cours' | 'futur' {
    if (!date || !startHour || !endHour) return 'futur';
    
    const now = new Date();
    const rattrapageDate = new Date(date);
    const [startH, startM] = startHour.split(':').map(Number);
    const [endH, endM] = endHour.split(':').map(Number);
    
    const startDateTime = new Date(rattrapageDate);
    startDateTime.setHours(startH, startM, 0, 0);
    
    const endDateTime = new Date(rattrapageDate);
    endDateTime.setHours(endH, endM, 0, 0);
    
    if (now > endDateTime) return 'passé';
    if (now >= startDateTime && now <= endDateTime) return 'en_cours';
    return 'futur';
  }

  // Formater la date
  formatDate(dateString: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return dateString;
    }
  }

  // Formater l'heure
  formatTime(timeString: string): string {
    if (!timeString) return '-';
    return timeString;
  }

  // Obtenir les salles
  getSalles(rattrapage: RattrapageWithDuration): Array<{ id: number; name: string }> {
    return rattrapage.salles || [];
  }

  // Obtenir le texte du statut
  getStatusText(statut: string): string {
    const statusMap: { [key: string]: string } = {
      'passé': 'Passé',
      'en_cours': 'En cours',
      'futur': 'À venir'
    };
    return statusMap[statut] || 'Non défini';
  }

  // Calculer le min entre deux valeurs
  getMathMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // Changer le nombre d'éléments par page
  onPerPageChange(event: any): void {
    const newPerPage = parseInt(event.target.value, 10);
    if (newPerPage !== this.perPage) {
      this.perPage = newPerPage;
      this.currentPage = 1;
      this.loadRattrapages(1);
    }
  }

  // Obtenir les numéros de page pour la pagination
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5; // Nombre maximum de pages à afficher
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }
}

