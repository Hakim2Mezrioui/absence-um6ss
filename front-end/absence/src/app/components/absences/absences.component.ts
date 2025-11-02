import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// Import du service et des interfaces
import { 
  AbsenceService, 
  Absence, 
  AbsenceStatistics,
  AbsenceFilters
} from '../../services/absence.service';
import { AuthService } from '../../services/auth.service';

// Angular Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';

// Angular Material Dialog imports
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteDialogComponent, ConfirmDeleteData } from './confirm-delete-dialog/confirm-delete-dialog.component';

// Interface pour les suggestions de recherche
interface SearchSuggestion {
  text: string;
  icon: string;
  count: number;
  value: string;
}

@Component({
  selector: 'app-absences',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule
  ],
  templateUrl: './absences.component.html',
  styleUrl: './absences.component.css'
})
export class AbsencesComponent implements OnInit, OnDestroy {
  
  // Données
  absences: Absence[] = [];
  statistics: AbsenceStatistics | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  // Filtres
  filtersForm!: FormGroup;
  searchValue = '';
  
  // Options de filtre
  justificationOptions = [
    { value: '', label: 'Toutes les absences' },
    { value: 'true', label: 'Justifiées seulement' },
    { value: 'false', label: 'Non justifiées seulement' }
  ];
  
  pageSizeOptions = [5, 10, 25, 50];
  
  // États
  loading = false;
  error = '';
  
  // États pour la recherche avancée
  showSearchSuggestions = false;
  searchSuggestions: SearchSuggestion[] = [];
  
  // Utilitaires pour le template
  Math = Math;
  
  private destroy$ = new Subject<void>();
  private searchSubject$ = new Subject<string>();

  constructor(
    private absenceService: AbsenceService,
    private fb: FormBuilder,
    private dialog: MatDialog,
    public authService: AuthService
  ) {
    this.initializeFilters();
  }
  
  ngOnInit(): void {
    this.setupSearchSubscription();
    this.testApiConnection();
    this.loadAbsences();
  }

  /**
   * Initialiser les filtres
   */
  private initializeFilters(): void {
    this.filtersForm = this.fb.group({
      justifiee: [''],
      searchValue: ['']
    });

    // Surveiller les changements de filtres
    this.filtersForm.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.currentPage = 1; // Reset à la première page
        this.loadAbsences();
      });
  }

  /**
   * Configurer l'abonnement à la recherche
   */
  private setupSearchSubscription(): void {
    this.searchSubject$
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(searchTerm => {
        this.filtersForm.patchValue({ searchValue: searchTerm }, { emitEvent: false });
        this.currentPage = 1;
        this.loadAbsences();
      });
  }

  /**
   * Tester la connexion à l'API
   */
  testApiConnection(): void {
    this.absenceService.testConnection()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Connexion réussie
        },
        error: (error) => {
          this.error = 'Impossible de se connecter au serveur. Vérifiez que le backend Laravel est démarré.';
        }
      });
  }

  /**
   * Charger les absences avec filtres et pagination
   */
  loadAbsences(): void {
    this.loading = true;
    this.error = '';
    
    const formValue = this.filtersForm.value;
    
    const filters: AbsenceFilters = {
      size: this.pageSize,
      page: this.currentPage,
      searchValue: formValue.searchValue || '',
      justifiee: formValue.justifiee !== '' ? formValue.justifiee === 'true' : undefined
    };
    
    // Nettoyer les valeurs vides
    Object.keys(filters).forEach(key => {
      if (filters[key as keyof AbsenceFilters] === '' || filters[key as keyof AbsenceFilters] === undefined) {
        delete filters[key as keyof AbsenceFilters];
      }
    });
    
    this.absenceService.getAbsences(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.absences = response.absences;
          this.totalItems = response.total;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          this.error = `Erreur lors du chargement: ${error.message || 'Erreur inconnue'}`;
          this.loading = false;
        }
      });
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Gestion de la recherche
   */
  onSearchChange(event: any): void {
    this.searchValue = event.target.value;
    this.searchSubject$.next(this.searchValue);
  }

  /**
   * Changer de page
   */
  onPageChange(page: number): void {
    this.currentPage = page;
    this.loadAbsences();
  }

  /**
   * Changer la taille de page
   */
  onPageSizeChange(size: number): void {
    this.pageSize = size;
    this.currentPage = 1;
    this.loadAbsences();
  }

  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filtersForm.reset();
    this.searchValue = '';
    this.currentPage = 1;
    this.loadAbsences();
  }

  /**
   * Obtenir le nom complet de l'étudiant
   */
  getStudentFullName(absence: Absence): string {
    if (absence.etudiant) {
      return `${absence.etudiant.first_name} ${absence.etudiant.last_name}`;
    }
    return 'Étudiant inconnu';
  }

  /**
   * Obtenir le matricule de l'étudiant
   */
  getStudentMatricule(absence: Absence): string {
    return absence.etudiant?.matricule || 'N/A';
  }

  /**
   * Obtenir les initiales de l'étudiant pour l'avatar
   */
  getStudentInitials(absence: Absence): string {
    if (absence.etudiant) {
      const firstName = absence.etudiant.first_name?.charAt(0) || '';
      const lastName = absence.etudiant.last_name?.charAt(0) || '';
      return `${firstName}${lastName}`.toUpperCase();
    }
    return '??';
  }

  /**
   * Formater la date
   */
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  /**
   * Formater l'heure
   */
  formatTime(dateString: string): string {
    return new Date(dateString).toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  /**
   * Obtenir toutes les salles d'un examen (support pour salles multiples)
   */
  getExamSalles(examen: any): { id: number; name: string }[] {
    // Priorité au tableau salles[] si disponible
    if (examen?.salles && examen.salles.length > 0) {
      return examen.salles;
    }
    // Fallback sur salle unique pour compatibilité avec les anciens examens
    if (examen?.salle) {
      return [examen.salle];
    }
    // Aucune salle trouvée
    return [];
  }

  /**
   * Formater la date et l'heure
   */
  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Obtenir le badge de couleur pour le statut de justification
   */
  getJustificationBadgeClass(justified: boolean): string {
    return justified 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  }

  /**
   * Obtenir l'icône pour le statut de justification
   */
  getJustificationIcon(justified: boolean): string {
    return justified ? 'check_circle' : 'cancel';
  }

  /**
   * Obtenir le nombre d'absences justifiées
   */
  getJustifiedCount(): number {
    return this.absences.filter(absence => absence.justifiee).length;
  }

  /**
   * Obtenir le nombre d'absences non justifiées
   */
  getUnjustifiedCount(): number {
    return this.absences.filter(absence => !absence.justifiee).length;
  }

  /**
   * Obtenir le pourcentage d'absences justifiées
   */
  getJustificationPercentage(): number {
    if (this.absences.length === 0) return 0;
    return Math.round((this.getJustifiedCount() / this.absences.length) * 100);
  }

  /**
   * Obtenir le label du filtre actif
   */
  getActiveFilterLabel(): string {
    const justifieeValue = this.filtersForm.get('justifiee')?.value;
    const option = this.justificationOptions.find(opt => opt.value === justifieeValue);
    return option ? option.label : '';
  }

  /**
   * TrackBy function pour optimiser le rendu de la liste
   */
  trackByAbsenceId(index: number, absence: Absence): number {
    return absence.id;
  }



  /**
   * Confirmer la suppression d'une absence avec Angular Material Dialog
   */
  confirmDelete(absence: Absence): void {
    const dialogData: ConfirmDeleteData = {
      title: '🗑️ Supprimer l\'absence',
      message: this.buildDeleteMessage(absence),
      studentName: this.getStudentFullName(absence),
      matricule: this.getStudentMatricule(absence),
      date: this.formatDate(absence.date_absence)
    };

    const dialogRef = this.dialog.open(ConfirmDeleteDialogComponent, {
      width: '500px',
      data: dialogData,
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true) {
        this.deleteAbsence(absence.id);
      }
    });
  }

  /**
   * Construire le message de confirmation avec les détails de l'absence
   */
  private buildDeleteMessage(absence: Absence): string {
    const studentName = this.getStudentFullName(absence);
    const matricule = this.getStudentMatricule(absence);
    const date = this.formatDate(absence.date_absence);
    const status = absence.justifiee ? 'Justifiée' : 'Non justifiée';
    
    return `
      <div class="mb-4">
        <p class="mb-3">Êtes-vous sûr de vouloir supprimer cette absence ?</p>
        <div class="p-3 border-round surface-100">
          <div class="mb-2"><strong>Étudiant:</strong> ${studentName}</div>
          <div class="mb-2"><strong>Matricule:</strong> ${matricule}</div>
          <div class="mb-2"><strong>Date:</strong> ${date}</div>
          <div class="mb-2"><strong>Statut:</strong> ${status}</div>
          ${absence.type_absence ? `<div class="mb-2"><strong>Type:</strong> ${absence.type_absence}</div>` : ''}
          ${absence.motif ? `<div><strong>Motif:</strong> ${absence.motif}</div>` : ''}
        </div>
        <p class="mt-3 text-red-500"><i class="pi pi-exclamation-triangle mr-2"></i>Cette action est irréversible.</p>
      </div>
    `;
  }

  /**
   * Supprimer l'absence
   */
  private deleteAbsence(absenceId: number): void {
    this.loading = true;
    
    this.absenceService.deleteAbsence(absenceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          
          // Recharger la liste des absences
          this.loadAbsences();
          
          // Afficher un message de succès
          this.showSuccessMessage(response.message || 'Absence supprimée avec succès');
        },
        error: (error) => {
          this.loading = false;
          
          // Afficher un message d'erreur
          this.showErrorMessage(
            error.error?.message || 
            'Erreur lors de la suppression de l\'absence'
          );
        }
      });
  }

  /**
   * Afficher un message de succès
   */
  private showSuccessMessage(message: string): void {
    // TODO: Implémenter avec MatSnackBar si nécessaire
  }

  /**
   * Afficher un message d'erreur
   */
  private showErrorMessage(message: string): void {
    this.error = message;
  }


  /**
   * Gestion du focus sur le champ de recherche
   */
  onSearchFocus(): void {
    this.generateSearchSuggestions();
    this.showSearchSuggestions = true;
  }

  /**
   * Gestion de la perte de focus sur le champ de recherche
   */
  onSearchBlur(): void {
    // Délai pour permettre le clic sur les suggestions
    setTimeout(() => {
      this.showSearchSuggestions = false;
    }, 200);
  }

  /**
   * Générer des suggestions de recherche intelligentes
   */
  private generateSearchSuggestions(): void {
    if (this.absences.length === 0) {
      this.searchSuggestions = [];
      return;
    }

    const suggestions: SearchSuggestion[] = [];
    
    // Suggestions basées sur les étudiants les plus fréquents
    const studentFreq = this.absences.reduce((acc, absence) => {
      const name = this.getStudentFullName(absence);
      if (name !== 'Étudiant inconnu') {
        acc[name] = (acc[name] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    // Top 3 étudiants avec le plus d'absences
    Object.entries(studentFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .forEach(([name, count]) => {
        suggestions.push({
          text: name,
          icon: 'person',
          count,
          value: name
        });
      });

    // Suggestions par statut
    const justifiedCount = this.getJustifiedCount();
    const unjustifiedCount = this.getUnjustifiedCount();
    
    if (unjustifiedCount > 0) {
      suggestions.push({
        text: 'Absences non justifiées',
        icon: 'error_outline',
        count: unjustifiedCount,
        value: 'non justifiée'
      });
    }

    if (justifiedCount > 0) {
      suggestions.push({
        text: 'Absences justifiées',
        icon: 'check_circle',
        count: justifiedCount,
        value: 'justifiée'
      });
    }

    // Suggestions par cours/examens
    const courseNames = this.absences
      .map(a => a.cours?.name)
      .filter(Boolean)
      .reduce((acc, name) => {
        if (name) acc[name] = (acc[name] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    Object.entries(courseNames)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2)
      .forEach(([name, count]) => {
        suggestions.push({
          text: name,
          icon: 'school',
          count,
          value: name
        });
      });

    this.searchSuggestions = suggestions.slice(0, 6); // Limiter à 6 suggestions
  }

  /**
   * Sélectionner une suggestion de recherche
   */
  selectSearchSuggestion(suggestion: SearchSuggestion): void {
    this.searchValue = suggestion.value;
    this.onSearchChange({ target: { value: suggestion.value } } as any);
    this.showSearchSuggestions = false;
  }

  /**
   * Effacer la recherche
   */
  clearSearch(): void {
    this.searchValue = '';
    this.onSearchChange({ target: { value: '' } } as any);
    this.showSearchSuggestions = false;
  }

  /**
   * Gestion du changement de statut de justification
   */
  onJustificationChange(event: any): void {
    const value = event.target.value;
    this.filtersForm.patchValue({ justifiee: value });
  }
}
