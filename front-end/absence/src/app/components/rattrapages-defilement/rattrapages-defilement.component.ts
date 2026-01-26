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
  etablissement_id?: number;
  ville?: { id: number; name: string };
  ville_id?: number;
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

  rattrapages: RattrapageWithDuration[] = []; // Rattrapages affichés (filtrés et paginés)
  allRattrapages: RattrapageWithDuration[] = []; // Tous les rattrapages chargés du serveur
  filteredRattrapages: RattrapageWithDuration[] = []; // Rattrapages après filtrage (avant pagination)
  loading = false;
  error = '';

  // Pagination côté client
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
  selectedEtablissement: number | string = '';

  // Options de filtre
  etablissements: any[] = [];
  
  // Établissement de l'utilisateur connecté (fixé automatiquement)
  userEtablissementId: number | null = null;
  userEtablissementName: string = '';

  ngOnInit(): void {
    // Récupérer l'établissement de l'utilisateur connecté
    this.userEtablissementId = this.authService.getUserEtablissementId();
    console.log('🏢 Établissement utilisateur connecté:', this.userEtablissementId);
    
    // Si l'utilisateur a un établissement, l'appliquer automatiquement
    if (this.userEtablissementId && this.userEtablissementId > 0) {
      this.selectedEtablissement = this.userEtablissementId;
    }
    
    // Charger les options de filtrage seulement si l'utilisateur n'a pas d'établissement fixe
    // (pour permettre la sélection manuelle)
    if (!this.hasFixedEtablissement()) {
      this.loadFilterOptions();
    } else {
      // Si l'utilisateur a un établissement fixe, charger juste le nom de son établissement
      this.loadFilterOptions();
    }
    
    this.loadRattrapages();
  }

  // Charger les options de filtrage
  private loadFilterOptions(): void {
    this.rattrapageService.getFilterOptions().subscribe({
      next: (response) => {
        if (response) {
          this.etablissements = response.etablissements || [];
          console.log('🏢 Établissements chargés:', this.etablissements.length);
          
          // Trouver le nom de l'établissement de l'utilisateur
          if (this.userEtablissementId) {
            const userEtablissement = this.etablissements.find(e => e.id === this.userEtablissementId);
            if (userEtablissement) {
              this.userEtablissementName = userEtablissement.name;
              console.log('🏢 Nom établissement utilisateur:', this.userEtablissementName);
            }
          }
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement des options de filtrage:', err);
        this.etablissements = [];
      }
    });
  }

  // Charger tous les rattrapages une seule fois au démarrage
  private loadRattrapages(): void {
    this.loading = true;
    this.error = '';

    // Construire les filtres pour le chargement initial (seulement établissement si fixe)
    const filters: any = {
      sort_by: 'created_at',
      sort_direction: 'desc',
      // Charger beaucoup de données (1000 par exemple) pour avoir tout en mémoire
      size: 1000,
      page: 1
    };
    
    // Toujours appliquer le filtre par établissement de l'utilisateur connecté
    if (this.userEtablissementId && this.userEtablissementId > 0) {
      filters.etablissement_id = this.userEtablissementId;
      console.log('🔒 Filtre établissement fixé automatiquement:', this.userEtablissementId);
    } else if (this.selectedEtablissement && this.selectedEtablissement !== '') {
      filters.etablissement_id = this.selectedEtablissement;
    }

    this.rattrapageService.getAllRattrapages(1, 1000, filters).subscribe({
      next: (response) => {
        if (response.success) {
          // Stocker tous les rattrapages avec leurs propriétés calculées
          this.allRattrapages = (response.data || []).map((r: any) => ({
            ...r,
            duration: this.calculateDuration(r.start_hour, r.end_hour),
            statut_temporel: this.calculateStatutTemporel(r.date, r.start_hour, r.end_hour),
            salles: r.salles || []
          }));
          
          console.log('📚 Rattrapages chargés:', this.allRattrapages.length);
          
          // Appliquer les filtres côté client
          this.applyAllFilters();
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

  // Appliquer tous les filtres côté client
  private applyAllFilters(): void {
    let filtered = [...this.allRattrapages];

    // Filtre par recherche (nom)
    if (this.searchValue.trim()) {
      const searchTerm = this.searchValue.trim().toLowerCase();
      filtered = filtered.filter(r => 
        r.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtre par date exacte
    if (this.filterDate) {
      filtered = filtered.filter(r => {
        if (!r.date) return false;
        const rattrapageDate = new Date(r.date).toISOString().split('T')[0];
        return rattrapageDate === this.filterDate;
      });
    }

    // Filtre par date de début
    if (this.filterDateFrom) {
      filtered = filtered.filter(r => {
        if (!r.date) return false;
        const rattrapageDate = new Date(r.date);
        const fromDate = new Date(this.filterDateFrom);
        fromDate.setHours(0, 0, 0, 0);
        rattrapageDate.setHours(0, 0, 0, 0);
        return rattrapageDate >= fromDate;
      });
    }

    // Filtre par date de fin
    if (this.filterDateTo) {
      filtered = filtered.filter(r => {
        if (!r.date) return false;
        const rattrapageDate = new Date(r.date);
        const toDate = new Date(this.filterDateTo);
        toDate.setHours(23, 59, 59, 999);
        rattrapageDate.setHours(0, 0, 0, 0);
        return rattrapageDate <= toDate;
      });
    }

    // Filtre par établissement (si l'utilisateur n'a pas d'établissement fixe)
    if (!this.hasFixedEtablissement() && this.selectedEtablissement && this.selectedEtablissement !== '') {
      const etablissementId = Number(this.selectedEtablissement);
      filtered = filtered.filter(r => {
        return r.etablissement_id === etablissementId || 
               (r.etablissement && r.etablissement.id === etablissementId);
      });
    }

    // Filtre par statut temporel
    if (this.selectedStatus) {
      filtered = filtered.filter(r => r.statut_temporel === this.selectedStatus);
    }

    // Trier par date de création (décroissant)
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });

    // Stocker les résultats filtrés
    this.filteredRattrapages = filtered;
    
    // Mettre à jour le total et les pages
    this.total = this.filteredRattrapages.length;
    this.totalPages = Math.ceil(this.total / this.perPage);
    
    // Si la page actuelle est supérieure au nombre de pages, revenir à la page 1
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = 1;
    }

    // Appliquer la pagination côté client
    this.applyPagination();
  }

  // Appliquer la pagination côté client
  private applyPagination(): void {
    const startIndex = (this.currentPage - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    this.rattrapages = this.filteredRattrapages.slice(startIndex, endIndex);
  }

  // Méthodes pour gérer les filtres (côté client uniquement)
  onSearchChange(): void {
    this.currentPage = 1;
    this.applyAllFilters();
  }

  onFilterChange(): void {
    // Si l'utilisateur a un établissement fixe, réinitialiser le filtre sélectionné
    if (this.userEtablissementId && this.userEtablissementId > 0) {
      this.selectedEtablissement = this.userEtablissementId;
    }
    this.currentPage = 1;
    this.applyAllFilters();
  }

  onStatusFilterChange(event: any): void {
    this.selectedStatus = event.target.value;
    this.currentPage = 1;
    this.applyAllFilters();
  }

  clearFilters(): void {
    this.searchValue = '';
    this.filterDate = '';
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.selectedStatus = '';
    // Ne pas réinitialiser selectedEtablissement si l'utilisateur a un établissement fixe
    if (!this.userEtablissementId || this.userEtablissementId === 0) {
      this.selectedEtablissement = '';
    } else {
      // Réinitialiser à l'établissement de l'utilisateur
      this.selectedEtablissement = this.userEtablissementId;
    }
    this.currentPage = 1;
    this.applyAllFilters();
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

  // Pagination côté client
  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages || page === this.currentPage) return;
    this.currentPage = page;
    this.applyPagination();
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

  // Vérifier si l'utilisateur a un établissement fixe
  hasFixedEtablissement(): boolean {
    return this.userEtablissementId !== null && this.userEtablissementId > 0;
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
      this.applyAllFilters();
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

