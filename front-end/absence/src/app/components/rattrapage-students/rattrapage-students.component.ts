import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RattrapageService, Etudiant, Rattrapage } from '../../services/rattrapage.service';
import { NotificationService } from '../../services/notification.service';
import { Subject } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { firstValueFrom } from 'rxjs';

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
  public authService = inject(AuthService);

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
  addMatricule = '';
  
  // UI State
  loading = false;
  searchLoading = false;
  adding = false;
  
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

  /**
   * Ajouter un étudiant au rattrapage par matricule
   * (réservé aux rôles autorisés à éditer)
   */
  async addStudentByMatricule() {
    if (!this.rattrapage?.id) {
      this.notificationService.error('Erreur', 'Rattrapage introuvable');
      return;
    }

    const matricule = (this.addMatricule || '').trim();
    if (!matricule) {
      return;
    }

    if (!this.authService.canEdit()) {
      this.notificationService.warning(
        'Action non autorisée',
        'Votre rôle ne permet pas d\'ajouter des étudiants à un rattrapage.'
      );
      return;
    }

    try {
      this.adding = true;

      // Rechercher l'étudiant par matricule via l'API des étudiants
      const filters: any = { searchValue: matricule };
      const etudiantsResponse = await firstValueFrom(
        this.rattrapageService.getEtudiants(1, 1, filters)
      );

      const etudiants = etudiantsResponse?.data || [];
      if (!etudiants.length) {
        this.notificationService.warning(
          'Aucun étudiant trouvé',
          `Aucun étudiant avec le matricule "${matricule}" n'a été trouvé.`
        );
        return;
      }

      const etudiant = etudiants[0];

      // Vérifier si l'étudiant est déjà dans la liste locale
      if (this.students.some(s => s.id === etudiant.id)) {
        this.notificationService.info(
          'Déjà affecté',
          `Cet étudiant est déjà affecté à ce rattrapage.`
        );
        return;
      }

      // Assigner l'étudiant au rattrapage
      const assignResponse = await firstValueFrom(
        this.rattrapageService.assignStudentToRattrapage(etudiant.id, this.rattrapage.id)
      );

      if (!assignResponse?.success) {
        throw new Error(assignResponse?.message || 'Erreur lors de l\'affectation de l\'étudiant');
      }

      this.notificationService.success(
        'Étudiant ajouté',
        `L'étudiant ${etudiant.first_name} ${etudiant.last_name} a été ajouté au rattrapage.`
      );

      // Réinitialiser le champ et recharger la liste
      this.addMatricule = '';
      await this.loadStudents(this.rattrapage.id, this.currentPage);
    } catch (error: any) {
      console.error('Erreur lors de l\'ajout de l\'étudiant au rattrapage:', error);
      this.notificationService.error(
        'Erreur',
        error.message || 'Impossible d\'ajouter l\'étudiant à ce rattrapage.'
      );
    } finally {
      this.adding = false;
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

  /**
   * Supprimer un étudiant du rattrapage
   */
  removeStudent(student: Etudiant) {
    if (!this.rattrapage?.id) {
      this.notificationService.error('Erreur', 'Rattrapage introuvable');
      return;
    }

    if (!this.authService.canEdit()) {
      this.notificationService.warning(
        'Action non autorisée',
        'Votre rôle ne permet pas de supprimer des étudiants de ce rattrapage.'
      );
      return;
    }

    // Confirmation avec SweetAlert2
    import('sweetalert2').then(({ default: Swal }) => {
      Swal.fire({
        title: 'Retirer cet étudiant ?',
        text: `L'étudiant ${student.first_name} ${student.last_name} sera retiré de ce rattrapage.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Oui, retirer',
        cancelButtonText: 'Annuler',
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#6b7280',
        reverseButtons: true
      }).then(async (result) => {
        if (result.isConfirmed) {
          try {
            const response = await firstValueFrom(
              this.rattrapageService.removeStudentFromRattrapage(student.id, this.rattrapage!.id!)
            );

            if (response?.success === false) {
              throw new Error(response?.message || 'Erreur lors de la suppression de l\'étudiant');
            }

            Swal.fire({
              title: 'Retiré',
              text: 'Étudiant retiré du rattrapage avec succès',
              icon: 'success',
              timer: 1500,
              showConfirmButton: false
            });

            // Recharger la liste
            await this.loadStudents(this.rattrapage!.id!, this.currentPage);
          } catch (error) {
            console.error('Erreur lors de la suppression de l\'étudiant du rattrapage:', error);
            Swal.fire({
              title: 'Erreur',
              text: 'Une erreur est survenue lors de la suppression de l\'étudiant',
              icon: 'error'
            });
          }
        }
      });
    });
  }

  goBack() {
    // Revenir à la liste principale des rattrapages
    this.router.navigate(['/rattrapages']);
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


























































































