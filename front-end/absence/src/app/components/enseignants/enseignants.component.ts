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
  items: any[] = [];
  pagination: any = { current_page: 1, last_page: 1, total: 0 };
  perPage = 10;
  search = '';
  sortBy: string = 'created_at';
  sortDir: 'asc' | 'desc' = 'desc';
  villeId?: number;
  roleId?: number;
  total = 0;
  displayedColumns: string[] = ['teacher', 'ville', 'actions'];

  villes: any[] = [];
  roles: any[] = [];
  isLoading = false;
  isDeleting = false;
  deletingId: number | null = null;
  private apiBase = environment.apiUrl;

  constructor(private service: EnseignantService, private http: HttpClient) {}

  ngOnInit(): void { 
    this.load(); 
    this.loadFilterOptions();
  }

  load(page: number = 1): void {
    this.isLoading = true;
    this.pagination.current_page = page;
    this.service.list(page, this.perPage, this.search, this.sortBy, this.sortDir, { ville_id: this.villeId, role_id: this.roleId }).subscribe({
      next: (r) => {
        const res = r.data ? r : { data: r };
        this.items = res.data.data ?? res.data;
        if (res.data && res.data.current_page !== undefined) {
          this.pagination = { current_page: res.data.current_page, last_page: res.data.last_page, total: res.data.total };
          this.total = res.data.total;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des enseignants:', error);
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
          this.load();
          this.isDeleting = false;
          this.deletingId = null;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
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
    this.load(1);
  }

  onPageChange(event: any) {
    this.perPage = event.pageSize;
    const newPage = event.pageIndex + 1;
    this.load(newPage);
  }

  onSortChange(event: any) {
    this.sortBy = event.active === 'teacher' ? 'name' : event.active;
    this.sortDir = event.direction || 'asc';
    this.load(1);
  }

  applyFilters() {
    this.load(1);
  }

  resetFilters() {
    this.search = '';
    this.villeId = undefined;
    this.roleId = undefined;
    this.perPage = 10;
    this.sortBy = 'created_at';
    this.sortDir = 'desc';
    this.load(1);
  }

  private loadFilterOptions() {
    this.http.get<any>(`${this.apiBase}/enseignants/filter-options`).subscribe({
      next: (res) => {
        const data = res.data || res;
        this.villes = data.villes || [];
        this.roles = data.roles || [];
      },
      error: () => { /* silencieux */ }
    });
  }
}


