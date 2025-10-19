import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ViewChild } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { EnseignantService, Enseignant } from '../../services/enseignant.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-enseignants',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HttpClientModule, MatTableModule, MatPaginatorModule, MatSortModule, MatButtonModule, MatIconModule],
  templateUrl: './enseignants.component.html',
  styleUrls: ['./enseignants.component.css']
})
export class EnseignantsComponent implements OnInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sortRef!: MatSort;
  
  // Données complètes et filtrées
  allItems: any[] = []; // Tous les enseignants chargés
  filteredItems: any[] = []; // Enseignants après filtrage
  items: any[] = []; // Enseignants affichés (après pagination)
  
  // Pagination côté frontend
  pagination: any = { current_page: 1, last_page: 1, total: 0 };
  perPage = 10;
  total = 0;
  
  // Filtres
  search = '';
  sortBy: string = 'created_at';
  sortDir: 'asc' | 'desc' = 'desc';
  villeId?: number;
  roleId?: number;
  
  displayedColumns: string[] = ['teacher', 'ville', 'actions'];

  // Options de filtre
  villes: any[] = [];
  roles: any[] = [];
  
  // États
  isLoading = false;
  isDeleting = false;
  deletingId: number | null = null;
  private apiBase = environment.apiUrl;

  constructor(private service: EnseignantService, private http: HttpClient, private toastr: ToastrService) {}

  ngOnInit(): void { 
    this.loadAllEnseignants(); 
    this.loadFilterOptions();
  }

  loadAllEnseignants(): void {
    this.isLoading = true;
    
    // Charger tous les enseignants sans pagination
    this.service.list(1, 1000, '', 'created_at', 'desc').subscribe({
      next: (response) => {
        console.log('All enseignants response:', response);
        
        if (response.success && response.data) {
          this.allItems = response.data || [];
        } else {
          this.allItems = response.data || response || [];
        }
        
        // Appliquer les filtres initiaux
        this.applyFilters();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des enseignants:', error);
        this.toastr.error('Erreur lors du chargement des enseignants', 'Erreur');
        this.allItems = [];
        this.filteredItems = [];
        this.items = [];
        this.total = 0;
        this.isLoading = false;
      }
    });
  }

  remove(id: number): void { 
    if (confirm('Êtes-vous sûr de vouloir supprimer cet enseignant ?')) {
      this.isDeleting = true;
      this.deletingId = id;
      this.service.delete(id).subscribe({
        next: () => {
          this.toastr.success('Enseignant supprimé avec succès', 'Succès');
          // Recharger tous les enseignants après suppression
          this.loadAllEnseignants();
          this.isDeleting = false;
          this.deletingId = null;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.toastr.error('Erreur lors de la suppression de l\'enseignant', 'Erreur');
          this.isDeleting = false;
          this.deletingId = null;
        }
      });
    }
  }

  toggleSort(column: string): void {
    if (this.sortBy === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDir = 'asc';
    }
    this.pagination.current_page = 1; // Retourner à la première page
    this.applyFilters();
  }

  onPageChange(event: any) {
    this.perPage = event.pageSize;
    this.pagination.current_page = event.pageIndex + 1;
    this.applyPagination();
  }

  onSortChange(event: any) {
    this.sortBy = event.active === 'teacher' ? 'name' : event.active;
    this.sortDir = event.direction || 'asc';
    this.pagination.current_page = 1; // Retourner à la première page
    this.applyFilters();
  }

  applyFilters() {
    // Appliquer les filtres sur allItems
    this.filteredItems = [...this.allItems];
    
    // Filtre par recherche (nom, prénom, email)
    if (this.search.trim()) {
      const searchTerm = this.search.toLowerCase().trim();
      this.filteredItems = this.filteredItems.filter(enseignant => {
        const firstName = enseignant.user?.first_name?.toLowerCase() || '';
        const lastName = enseignant.user?.last_name?.toLowerCase() || '';
        const email = enseignant.user?.email?.toLowerCase() || '';
        
        return firstName.includes(searchTerm) || 
               lastName.includes(searchTerm) || 
               email.includes(searchTerm) ||
               `${firstName} ${lastName}`.includes(searchTerm);
      });
    }
    
    // Filtre par ville
    if (this.villeId) {
      this.filteredItems = this.filteredItems.filter(enseignant => 
        enseignant.ville_id === this.villeId
      );
    }
    
    // Filtre par rôle
    if (this.roleId) {
      this.filteredItems = this.filteredItems.filter(enseignant => 
        enseignant.user?.role_id === this.roleId
      );
    }
    
    // Appliquer le tri
    this.applySorting();
    
    // Appliquer la pagination
    this.applyPagination();
  }

  applySorting() {
    this.filteredItems.sort((a, b) => {
      let aValue: any;
      let bValue: any;
      
      switch (this.sortBy) {
        case 'name':
          aValue = `${a.user?.last_name || ''} ${a.user?.first_name || ''}`.toLowerCase();
          bValue = `${b.user?.last_name || ''} ${b.user?.first_name || ''}`.toLowerCase();
          break;
        case 'email':
          aValue = a.user?.email?.toLowerCase() || '';
          bValue = b.user?.email?.toLowerCase() || '';
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
      }
      
      if (this.sortDir === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }

  applyPagination() {
    this.total = this.filteredItems.length;
    this.pagination.total = this.total;
    this.pagination.last_page = Math.ceil(this.total / this.perPage);
    
    const startIndex = (this.pagination.current_page - 1) * this.perPage;
    const endIndex = startIndex + this.perPage;
    
    this.items = this.filteredItems.slice(startIndex, endIndex);
  }

  resetFilters() {
    this.search = '';
    this.villeId = undefined;
    this.roleId = undefined;
    this.perPage = 10;
    this.sortBy = 'created_at';
    this.sortDir = 'desc';
    this.pagination.current_page = 1;
    this.applyFilters();
  }

  private loadFilterOptions() {
    this.http.get<any>(`${this.apiBase}/enseignants/filter-options`).subscribe({
      next: (response) => {
        console.log('Filter options response:', response); // Debug log
        
        // La réponse Laravel a cette structure : { success: true, message: "...", data: { ... } }
        if (response.success && response.data) {
          this.villes = response.data.villes || [];
          this.roles = response.data.roles || [];
        } else {
          // Fallback si la structure est différente
          this.villes = response.villes || [];
          this.roles = response.roles || [];
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des options de filtre:', error);
        this.toastr.warning('Erreur lors du chargement des options de filtre', 'Attention');
        this.villes = [];
        this.roles = [];
      }
    });
  }
}


