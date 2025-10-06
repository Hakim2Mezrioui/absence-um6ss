import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RattrapageService, Etudiant, Rattrapage } from '../../services/rattrapage.service';
import { NotificationService } from '../../services/notification.service';
import { Subject } from 'rxjs';

interface ListStudentResponse {
  id: number;
  etudiant_id: number;
  rattrapage_id: number;
  created_at: string;
  updated_at: string;
  etudiant: Etudiant;
}

@Component({
  selector: 'app-rattrapage-students',
  imports: [CommonModule, FormsModule],
  templateUrl: './rattrapage-students.component.html',
  styleUrl: './rattrapage-students.component.css'
})
export class RattrapageStudentsComponent implements OnInit, OnDestroy {
  private rattrapageService = inject(RattrapageService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private notificationService = inject(NotificationService);

  // Data
  rattrapage: Rattrapage | null = null;
  students: Etudiant[] = [];
  
  // Pagination
  currentPage = 1;
  perPage = 20;
  totalPages = 1;
  totalCount = 0;
  
  // Search
  searchTerm = '';
  
  // UI State
  loading = false;
  searchLoading = false;
  
  // View modes
  viewMode: 'cards' | 'list' = 'cards';
  
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.route.params.subscribe(params => {
      const rattrapageId = params['id'];
      if (rattrapageId) {
        this.loadRattrapage(rattrapageId);
        this.loadStudents(rattrapageId);
      }
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async loadRattrapage(id: number) {
    try {
      const response = await this.rattrapageService.getRattrapageById(id).toPromise();
      if (response?.success) {
        this.rattrapage = response.data || null;
      }
    } catch (error) {
      console.error('Erreur lors du chargement du rattrapage:', error);
      this.notificationService.error(
        'Erreur',
        'Impossible de charger les informations du rattrapage'
      );
    }
  }

  async loadStudents(rattrapageId: number, page: number = 1) {
    try {
      this.loading = true;
      this.currentPage = page;
      
      const response = await this.rattrapageService.getStudentsByRattrapage(
        rattrapageId,
        page,
        this.perPage,
        this.searchTerm || undefined
      ).toPromise();
      
      if (response?.success) {
        // Extraire les données d'étudiants de la structure imbriquée
        this.students = (response.data || []).map((item: any) => item.etudiant);
        
        // Utiliser le count pour le total si pas de pagination
        this.totalCount = response.count || response.data?.length || 0;
        
        if (response.pagination) {
          this.currentPage = response.pagination.current_page;
          this.totalPages = response.pagination.last_page;
          this.totalCount = response.pagination.total;
        } else {
          // Pas de pagination, une seule page
          this.currentPage = 1;
          this.totalPages = 1;
        }
      } else {
        this.notificationService.error(
          'Erreur',
          'Impossible de charger les étudiants de ce rattrapage'
        );
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des étudiants:', error);
      this.notificationService.error(
        'Erreur de chargement',
        'Une erreur est survenue lors du chargement des étudiants'
      );
    } finally {
      this.loading = false;
      this.searchLoading = false;
    }
  }

  async onSearchChange() {
    this.searchLoading = true;
    this.currentPage = 1;
    if (this.rattrapage?.id) {
      await this.loadStudents(this.rattrapage.id, 1);
    }
  }

  async goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && this.rattrapage?.id) {
      await this.loadStudents(this.rattrapage.id, page);
    }
  }

  async nextPage() {
    if (this.currentPage < this.totalPages) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  async prevPage() {
    if (this.currentPage > 1) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  getVisiblePages(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  toggleViewMode() {
    this.viewMode = this.viewMode === 'cards' ? 'list' : 'cards';
  }

  goBack() {
    this.router.navigate(['/dashboard/rattrapages']);
  }

  calculateDuration(startHour: string, endHour: string): string {
    const start = new Date(`2000-01-01T${startHour}`);
    const end = new Date(`2000-01-01T${endHour}`);
    const diffMs = end.getTime() - start.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? ` ${minutes}min` : ''}`;
    }
    return `${minutes}min`;
  }

  exportToCSV() {
    if (!this.students.length) return;

    const csvHeaders = [
      'Matricule',
      'Prénom',
      'Nom',
      'Email',
      'Promotion',
      'Option',
      'Groupe',
      'Établissement',
      'Ville'
    ];

    const csvData = this.students.map(student => [
      student.matricule,
      student.first_name,
      student.last_name,
      student.email,
      student.promotion?.name || 'N/A',
      student.option?.name || 'N/A',
      student.group?.title || 'N/A',
      student.etablissement?.name || 'N/A',
      student.ville?.name || 'N/A'
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `etudiants_${this.rattrapage?.name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    this.notificationService.success(
      'Export réussi',
      'La liste des étudiants a été exportée avec succès'
    );
  }
}


























