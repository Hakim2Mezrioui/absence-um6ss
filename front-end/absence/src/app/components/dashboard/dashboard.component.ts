import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DashboardService, DashboardStatistics } from '../../services/dashboard.service';
import { AuthService } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  statistics: DashboardStatistics | null = null;
  loading: boolean = false;
  error: string | null = null;
  currentUser: any = null;

  // Filtres
  selectedVille: string = 'Toutes';
  selectedEtablissement: string = 'Tous';
  selectedPromotion: string = 'Toutes';
  selectedAnneeUniversitaire: string = 'Toutes';
  customDate: string = '';

  constructor(
    private dashboardService: DashboardService,
    private authService: AuthService,
    private navigationService: NavigationService
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.loadStatistics();
  }

  loadStatistics(): void {
    this.loading = true;
    this.error = null;

    this.dashboardService.getStatistics().subscribe({
      next: (data) => {
        this.statistics = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques:', error);
        this.error = 'Erreur lors du chargement des données';
        this.loading = false;
      }
    });
  }

  loadFilteredStatistics(): void {
    if (this.selectedAnneeUniversitaire === 'Toutes' && !this.customDate) {
      this.loadStatistics();
      return;
    }

    this.loading = true;
    this.error = null;

    const filters: any = {};
    
    if (this.selectedAnneeUniversitaire !== 'Toutes') {
      filters.annee_universitaire = this.selectedAnneeUniversitaire;
    }
    
    if (this.customDate) {
      filters.date_debut = this.customDate;
      filters.date_fin = this.customDate;
    }

    this.dashboardService.getFilteredStatistics(filters).subscribe({
      next: (data) => {
        this.statistics = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des statistiques filtrées:', error);
        this.error = 'Erreur lors du chargement des données filtrées';
        this.loading = false;
      }
    });
  }

  // Méthodes de filtrage
  getVilles(): string[] {
    if (!this.statistics) return [];
    return ['Toutes', ...this.statistics.data.villes.map(v => v.ville_name)];
  }

  getEtablissements(): string[] {
    if (!this.statistics) return [];
    return ['Tous', ...this.statistics.data.etablissements.capacite_detaille.map(e => e.etablissement_name)];
  }

  getPromotions(): string[] {
    if (!this.statistics) return [];
    return ['Toutes', ...this.statistics.data.promotions.etudiants_par_promotion.map(p => p.promotion_name)];
  }

  getAnneesUniversitaires(): string[] {
    const currentYear = new Date().getFullYear();
    const annees = ['Toutes'];
    
    // Générer 5 ans en avant depuis l'année actuelle
    for (let i = 0; i <= 5; i++) {
      const year = currentYear + i;
      annees.push(`${year}-${year + 1}`);
    }
    
    return annees;
  }

  // Méthodes de filtrage des données
  getFilteredVilles() {
    if (!this.statistics) return [];
    return this.statistics.data.villes.filter(v => 
      this.selectedVille === 'Toutes' || v.ville_name === this.selectedVille
    );
  }

  getFilteredEtablissements() {
    if (!this.statistics) return [];
    return this.statistics.data.etablissements.capacite_detaille.filter(e => 
      this.selectedEtablissement === 'Tous' || e.etablissement_name === this.selectedEtablissement
    );
  }

  getFilteredPromotions() {
    if (!this.statistics) return [];
    return this.statistics.data.promotions.etudiants_par_promotion.filter(p => 
      this.selectedPromotion === 'Toutes' || p.promotion_name === this.selectedPromotion
    ).map(p => ({
      ...p,
      nombre_etudiants: p.nombre_etudiants ?? p.count ?? 0,
      promotion_name: p.promotion_name ?? 'Promotion inconnue'
    }));
  }

  getFilteredTotalEtudiants(): number {
    if (!this.statistics) return 0;
    let total = 0;
    
    if (this.selectedVille !== 'Toutes') {
      total = this.statistics.data.villes.find(v => v.ville_name === this.selectedVille)?.nombre_etudiants || 0;
    } else if (this.selectedEtablissement !== 'Tous') {
      total = this.statistics.data.etablissements.capacite_detaille.find(e => e.etablissement_name === this.selectedEtablissement)?.nombre_etudiants || 0;
    } else if (this.selectedPromotion !== 'Toutes') {
      const promotion = this.statistics.data.promotions.etudiants_par_promotion.find(p => p.promotion_name === this.selectedPromotion);
      total = promotion?.nombre_etudiants ?? promotion?.count ?? 0;
    } else {
      total = this.statistics.data.general.total_etudiants;
    }
    
    return total;
  }

  getFilteredTotalGroups(): number {
    if (!this.statistics) return 0;
    let total = 0;
    
    if (this.selectedVille !== 'Toutes') {
      total = this.statistics.data.villes.find(v => v.ville_name === this.selectedVille)?.nombre_groups || 0;
    } else if (this.selectedEtablissement !== 'Tous') {
      total = this.statistics.data.etablissements.capacite_detaille.find(e => e.etablissement_name === this.selectedEtablissement)?.nombre_groups || 0;
    } else {
      total = this.statistics.data.general.total_groups;
    }
    
    return total;
  }

  // Calculs
  getTauxPresence(): number {
    if (!this.statistics?.data?.performance?.taux_presence_approximatif) return 0;
    return this.statistics.data.performance.taux_presence_approximatif;
  }

  getTauxAbsence(): number {
    if (!this.statistics?.data?.performance?.taux_presence_approximatif) return 0;
    return 100 - this.getTauxPresence();
  }

  // Utilitaires
  formatNumber(value: number): string {
    return value.toLocaleString('fr-FR');
  }

  getColorByValue(value: number, max: number): string {
    const percentage = (value / max) * 100;
    if (percentage > 80) return 'bg-blue-500';
    if (percentage > 60) return 'bg-green-500';
    if (percentage > 40) return 'bg-yellow-500';
    if (percentage > 20) return 'bg-orange-500';
    return 'bg-red-500';
  }

  getPresenceColor(taux: number): string {
    if (taux >= 90) return 'text-green-600';
    if (taux >= 80) return 'text-yellow-600';
    if (taux >= 70) return 'text-orange-600';
    return 'text-red-600';
  }

  // Actions
  onFilterChange(): void {
    // Les filtres se mettent à jour automatiquement grâce aux getters
  }

  onAnneeUniversitaireChange(): void {
    console.log('Année universitaire changée:', this.selectedAnneeUniversitaire);
    this.customDate = ''; // Réinitialiser la date personnalisée
    this.loadFilteredStatistics();
  }

  onCustomDateChange(): void {
    console.log('Date personnalisée changée:', this.customDate);
    this.selectedAnneeUniversitaire = 'Toutes'; // Réinitialiser l'année universitaire
    this.loadFilteredStatistics();
  }

  resetFilters(): void {
    this.selectedVille = 'Toutes';
    this.selectedEtablissement = 'Tous';
    this.selectedPromotion = 'Toutes';
    this.selectedAnneeUniversitaire = 'Toutes';
    this.customDate = '';
    this.loadStatistics();
  }

  refreshData(): void {
    this.loadStatistics();
  }

  logout(): void {
    this.authService.logout();
    this.navigationService.navigateToLogin();
  }

  // Méthodes pour les graphiques
  getCoursParType() {
    if (!this.statistics) return [];
    return this.statistics.data.cours.par_type;
  }

  getExamensParType() {
    if (!this.statistics) return [];
    return this.statistics.data.examens.par_type;
  }

  getRattrapagesParMois() {
    if (!this.statistics) return [];
    return this.statistics.data.rattrapages.par_mois;
  }

  getTopAbsences() {
    if (!this.statistics) return [];
    return this.statistics.data.absences.top_absences_etudiants;
  }

  getRepartitionGeographique() {
    if (!this.statistics) return [];
    return this.statistics.data.repartition_geographique.top_5_villes;
  }

  getOptionsParEtablissement() {
    if (!this.statistics) return [];
    return this.statistics.data.options.par_etablissement;
  }

  getGroupsRepartition() {
    if (!this.statistics) return [];
    return this.statistics.data.groups.repartition_taille;
  }

  // Méthodes pour le statut temporel
  getCoursStatutTemporel() {
    if (!this.statistics?.data?.cours?.par_statut_temporel_detaille) return null;
    return this.statistics.data.cours.par_statut_temporel_detaille;
  }

  getExamenStatutTemporel() {
    if (!this.statistics?.data?.examens?.par_statut_temporel_detaille) return null;
    return this.statistics.data.examens.par_statut_temporel_detaille;
  }

  // Méthodes pour les statistiques par année universitaire (si disponibles)
  getCoursParAnneeUniversitaire() {
    if (!this.statistics?.data?.cours?.par_annee_universitaire) return [];
    return this.statistics.data.cours.par_annee_universitaire;
  }

  getExamensParAnneeUniversitaire() {
    if (!this.statistics?.data?.examens?.par_annee_universitaire) return [];
    return this.statistics.data.examens.par_annee_universitaire;
  }

  // Méthodes pour les statistiques par statut temporel (si disponibles)
  getCoursParStatutTemporel() {
    if (!this.statistics?.data?.cours?.par_statut_temporel) return [];
    return this.statistics.data.cours.par_statut_temporel;
  }

  getExamensParStatutTemporel() {
    if (!this.statistics?.data?.examens?.par_statut_temporel) return [];
    return this.statistics.data.examens.par_statut_temporel;
  }

  // Méthode utilitaire pour formater les labels des statuts temporels
  getStatutTemporelLabel(statut: string | undefined): string {
    if (!statut) return 'Inconnu';
    
    switch (statut) {
      case 'en_cours':
        return 'En cours';
      case 'passé':
        return 'Terminés';
      case 'futur':
        return 'À venir';
      default:
        return statut;
    }
  }
}
