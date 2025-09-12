import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { SallesService, Salle, CreateSalleRequest } from '../../services/salles.service';
import { SalleDialogComponent } from './salle-dialog/salle-dialog.component';

@Component({
  selector: 'app-salles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressBarModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './salles.component.html',
  styleUrl: './salles.component.css'
})
export class SallesComponent implements OnInit {
  // Données
  salles: Salle[] = [];
  filteredSalles: Salle[] = [];
  etablissements: any[] = [];
  
  // États
  loading = false;
  error: string | null = null;
  
  // Filtres
  searchTerm = '';
  selectedEtablissement = '';
  selectedBatiment = '';
  selectedEtage = '';
  
  // Disponibilité
  availabilityDate: Date | null = null;
  availabilityStartTime = '';
  availabilityEndTime = '';
  
  // Statistiques calculées
  get totalSalles(): number {
    return this.salles.length;
  }
  
  get uniqueEtablissements(): number {
    return new Set(this.salles.map(s => s.etablissement_id)).size;
  }
  
  get uniqueBatiments(): number {
    return new Set(this.salles.map(s => s.batiment)).size;
  }
  
  get uniqueEtages(): number {
    return new Set(this.salles.map(s => s.etage)).size;
  }
  
  get uniqueBatimentsList(): string[] {
    return Array.from(new Set(this.salles.map(s => s.batiment))).sort();
  }
  
  get uniqueEtagesList(): number[] {
    return Array.from(new Set(this.salles.map(s => s.etage))).sort((a, b) => a - b);
  }

  constructor(
    private sallesService: SallesService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadSalles();
    this.loadEtablissements();
  }

  /**
   * Charger toutes les salles
   */
  loadSalles(): void {
    this.loading = true;
    this.error = null;
    
    this.sallesService.getSalles().subscribe({
      next: (response) => {
        this.salles = response.salles || [];
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des salles:', error);
        this.error = 'Impossible de charger les salles. Vérifiez votre connexion.';
        this.loading = false;
      }
    });
  }

  /**
   * Charger les établissements
   */
  loadEtablissements(): void {
    this.sallesService.getEtablissements().subscribe({
      next: (response) => {
        this.etablissements = response.etablissements || [];
      },
      error: (error) => {
        console.error('Erreur lors du chargement des établissements:', error);
      }
    });
  }

  /**
   * Ouvrir le dialog d'ajout
   */
  openAddDialog(): void {
    const dialogRef = this.dialog.open(SalleDialogComponent, {
      width: '600px',
      data: {
        salle: null,
        etablissements: this.etablissements,
        mode: 'create'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.createSalle(result);
      }
    });
  }

  /**
   * Modifier une salle
   */
  editSalle(salle: Salle): void {
    const dialogRef = this.dialog.open(SalleDialogComponent, {
      width: '600px',
      data: {
        salle: { ...salle },
        etablissements: this.etablissements,
        mode: 'edit'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.updateSalle(salle.id, result);
      }
    });
  }

  /**
   * Supprimer une salle
   */
  deleteSalle(salle: Salle): void {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la salle "${salle.name}" ?`)) {
      this.sallesService.deleteSalle(salle.id).subscribe({
        next: () => {
          this.showSnackBar('Salle supprimée avec succès', 'success');
          this.loadSalles();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.showSnackBar('Erreur lors de la suppression de la salle', 'error');
        }
      });
    }
  }

  /**
   * Créer une nouvelle salle
   */
  private createSalle(salleData: CreateSalleRequest): void {
    this.sallesService.createSalle(salleData).subscribe({
      next: () => {
        this.showSnackBar('Salle créée avec succès', 'success');
        this.loadSalles();
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.showSnackBar('Erreur lors de la création de la salle', 'error');
      }
    });
  }

  /**
   * Mettre à jour une salle
   */
  private updateSalle(id: number, salleData: CreateSalleRequest): void {
    this.sallesService.updateSalle(id, salleData).subscribe({
      next: () => {
        this.showSnackBar('Salle mise à jour avec succès', 'success');
        this.loadSalles();
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        this.showSnackBar('Erreur lors de la mise à jour de la salle', 'error');
      }
    });
  }

  /**
   * Recherche et filtres
   */
  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedEtablissement = '';
    this.selectedBatiment = '';
    this.selectedEtage = '';
    this.applyFilters();
  }

  /**
   * Appliquer les filtres
   */
  private applyFilters(): void {
    let filtered = [...this.salles];

    // Filtre de recherche
    if (this.searchTerm.trim()) {
      const search = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(salle =>
        salle.name.toLowerCase().includes(search) ||
        salle.batiment.toLowerCase().includes(search) ||
        (salle.description && salle.description.toLowerCase().includes(search))
      );
    }

    // Filtre par établissement
    if (this.selectedEtablissement) {
      filtered = filtered.filter(salle => 
        salle.etablissement_id.toString() === this.selectedEtablissement
      );
    }

    // Filtre par bâtiment
    if (this.selectedBatiment) {
      filtered = filtered.filter(salle => salle.batiment === this.selectedBatiment);
    }

    // Filtre par étage
    if (this.selectedEtage) {
      filtered = filtered.filter(salle => 
        salle.etage.toString() === this.selectedEtage
      );
    }

    this.filteredSalles = filtered;
  }

  /**
   * Vérifier la disponibilité
   */
  checkAvailability(): void {
    if (!this.isAvailabilityFormValid()) return;

    const dateStr = this.formatDate(this.availabilityDate!);
    
    this.sallesService.getSallesDisponibles({
      date: dateStr,
      heure_debut: this.availabilityStartTime + ':00',
      heure_fin: this.availabilityEndTime + ':00'
    }).subscribe({
      next: (response) => {
        this.filteredSalles = response.salles || [];
        this.showSnackBar(`${this.filteredSalles.length} salle(s) disponible(s) trouvée(s)`, 'success');
      },
      error: (error) => {
        console.error('Erreur lors de la vérification:', error);
        this.showSnackBar('Erreur lors de la vérification de disponibilité', 'error');
      }
    });
  }

  /**
   * Valider le formulaire de disponibilité
   */
  isAvailabilityFormValid(): boolean {
    return !!(this.availabilityDate && 
             this.availabilityStartTime && 
             this.availabilityEndTime &&
             this.availabilityStartTime < this.availabilityEndTime);
  }

  /**
   * Vérifier s'il y a des filtres actifs
   */
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || 
             this.selectedEtablissement || 
             this.selectedBatiment || 
             this.selectedEtage);
  }

  /**
   * Compter le nombre de filtres actifs
   */
  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchTerm) count++;
    if (this.selectedEtablissement) count++;
    if (this.selectedBatiment) count++;
    if (this.selectedEtage) count++;
    return count;
  }

  /**
   * TrackBy pour optimiser le rendu
   */
  trackBySalle(index: number, salle: Salle): number {
    return salle.id;
  }

  /**
   * Formater une date pour l'API
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Obtenir le nom de l'établissement par son ID
   */
  getEtablissementName(etablissementId: string): string {
    const etablissement = this.etablissements.find(e => e.id.toString() === etablissementId);
    return etablissement ? etablissement.name : 'Établissement inconnu';
  }

  /**
   * Afficher un message
   */
  private showSnackBar(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: type === 'success' ? 'snack-success' : 'snack-error'
    });
  }
}
