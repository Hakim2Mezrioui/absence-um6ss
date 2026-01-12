import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';

import { 
  ActivityLogService, 
  ActivityLog, 
  ActivityLogFilters,
  ActivityLogStatistics
} from '../../services/activity-log.service';

// Pas de Material - Design personnalisé uniquement

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  templateUrl: './activity-logs.component.html',
  styleUrl: './activity-logs.component.css'
})
export class ActivityLogsComponent implements OnInit, OnDestroy {
  logs: ActivityLog[] = [];
  statistics: ActivityLogStatistics | null = null;
  
  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalItems = 0;
  totalPages = 0;
  
  // Filtres
  filtersForm!: FormGroup;
  
  // États
  loading = false;
  error = '';
  
  // Modal de détails
  selectedLog: ActivityLog | null = null;
  showDetailsModal = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private activityLogService: ActivityLogService,
    private fb: FormBuilder
  ) {}
  
  ngOnInit(): void {
    this.initializeFilters();
    this.loadStatistics();
    this.loadLogs();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  /**
   * Initialiser les filtres
   */
  private initializeFilters(): void {
    this.filtersForm = this.fb.group({
      description: [''],
      causer_type: [''],
      subject_type: [''],
      date_from: [''],
      date_to: ['']
    });
    
    // Surveiller les changements de filtres
    this.filtersForm.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage = 1;
        this.loadLogs();
      });
  }
  
  /**
   * Charger les logs
   */
  loadLogs(): void {
    this.loading = true;
    this.error = '';
    
    const filters: ActivityLogFilters = {
      ...this.filtersForm.value,
      per_page: this.pageSize,
      page: this.currentPage
    };
    
    // Convertir les dates en format string si présentes
    if (filters.date_from) {
      filters.date_from = this.formatDateForApi(filters.date_from);
    }
    if (filters.date_to) {
      filters.date_to = this.formatDateForApi(filters.date_to);
    }
    
    this.activityLogService.getLogs(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.logs = response.data || [];
          this.currentPage = response.current_page || 1;
          this.totalPages = response.last_page || 1;
          this.totalItems = response.total || 0;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des logs:', error);
          this.error = 'Erreur lors du chargement des logs d\'activité';
          this.loading = false;
        }
      });
  }
  
  /**
   * Charger les statistiques
   */
  loadStatistics(): void {
    this.activityLogService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (stats) => {
          this.statistics = stats;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
        }
      });
  }
  
  /**
   * Page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadLogs();
    }
  }
  
  /**
   * Page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadLogs();
    }
  }
  
  /**
   * Réinitialiser les filtres
   */
  resetFilters(): void {
    this.filtersForm.reset({
      description: '',
      causer_type: '',
      subject_type: '',
      date_from: '',
      date_to: ''
    });
    this.currentPage = 1;
  }
  
  /**
   * Formater une date pour l'API
   */
  private formatDateForApi(date: any): string {
    if (!date) return '';
    if (typeof date === 'string') return date;
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }
  
  /**
   * Formater une date pour l'affichage
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  /**
   * Obtenir le nom de l'utilisateur
   */
  getUserName(log: ActivityLog): string {
    if (!log.causer) return 'Système';
    if (log.causer.first_name && log.causer.last_name) {
      return `${log.causer.first_name} ${log.causer.last_name}`;
    }
    if (log.causer.name) {
      return log.causer.name;
    }
    if (log.causer.email) {
      return log.causer.email;
    }
    return 'Utilisateur inconnu';
  }
  
  /**
   * Obtenir le type de modèle formaté
   */
  getModelType(log: ActivityLog): string {
    if (!log.subject_type) return 'N/A';
    return log.subject_type.split('\\').pop() || log.subject_type;
  }
  
  /**
   * Obtenir l'icône selon le type d'action
   */
  getActionIcon(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('créé') || desc.includes('create')) return 'add_circle';
    if (desc.includes('modifié') || desc.includes('update')) return 'edit';
    if (desc.includes('supprimé') || desc.includes('delete')) return 'delete';
    if (desc.includes('connexion') || desc.includes('login')) return 'login';
    if (desc.includes('déconnexion') || desc.includes('logout')) return 'logout';
    return 'history';
  }
  
  /**
   * Obtenir la couleur selon le type d'action
   */
  getActionColor(description: string): string {
    const desc = description.toLowerCase();
    if (desc.includes('créé') || desc.includes('create')) return 'primary';
    if (desc.includes('modifié') || desc.includes('update')) return 'accent';
    if (desc.includes('supprimé') || desc.includes('delete')) return 'warn';
    return '';
  }
  
  /**
   * Voir les détails d'un log
   */
  viewDetails(log: ActivityLog): void {
    this.selectedLog = log;
    this.showDetailsModal = true;
  }
  
  /**
   * Fermer la modal de détails
   */
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLog = null;
  }
  
  /**
   * Formater les propriétés pour l'affichage
   */
  formatProperties(properties: any): string {
    if (!properties) return 'Aucune propriété';
    try {
      return JSON.stringify(properties, null, 2);
    } catch {
      return String(properties);
    }
  }
  
  /**
   * Obtenir les propriétés formatées pour l'affichage
   */
  getPropertiesDisplay(log: ActivityLog): any {
    if (!log.properties) return null;
    
    // Si properties contient 'old' et 'attributes', c'est une modification
    if (log.properties.old && log.properties.attributes) {
      return {
        type: 'modification',
        anciennes_valeurs: log.properties.old,
        nouvelles_valeurs: log.properties.attributes
      };
    }
    
    // Sinon, retourner les propriétés telles quelles
    return log.properties;
  }
  
  /**
   * Track by function pour optimiser le rendu
   */
  trackByLogId(index: number, log: ActivityLog): number {
    return log.id;
  }
  
  // Exposer Math pour le template
  Math = Math;
}

