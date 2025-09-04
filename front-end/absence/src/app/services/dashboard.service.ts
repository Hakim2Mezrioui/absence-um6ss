import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface DashboardStatistics {
  success: boolean;
  message: string;
  data: {
    general: {
      total_villes: number;
      total_etudiants: number;
      total_groups: number;
      total_etablissements: number;
      total_promotions: number;
      total_options: number;
      total_cours: number;
      total_examens: number;
      total_absences: number;
      total_rattrapages: number;
    };
    villes: Ville[];
    etudiants: {
      total: number;
      par_ville: VilleCount[];
      par_etablissement: EtablissementCount[];
      par_promotion: PromotionCount[];
      par_option: OptionCount[];
    };
    groups: {
      total: number;
      par_ville: VilleCount[];
      par_etablissement: EtablissementCount[];
      par_promotion: PromotionCount[];
      taille_moyenne: number;
      repartition_taille: GroupDetail[];
    };
    etablissements: {
      total: number;
      par_ville: VilleCount[];
      capacite_detaille: EtablissementDetail[];
    };
    promotions: {
      total: number;
      etudiants_par_promotion: PromotionCount[];
    };
    options: {
      total: number;
      par_etablissement: EtablissementCount[];
      etudiants_par_option: OptionDetail[];
    };
    cours: {
      total: number;
      par_type: TypeCount[];
      par_promotion: PromotionCount[];
      par_etablissement: EtablissementCount[];
      par_annee_universitaire?: YearCount[];
      par_statut_temporel?: StatusCount[];
      par_statut_temporel_detaille?: {
        en_cours: number;
        en_passe: number;
        futur: number;
      };
    };
    examens: {
      total: number;
      par_type: TypeCount[];
      par_etablissement: EtablissementCount[];
      par_annee_universitaire?: YearCount[];
      par_statut_temporel?: StatusCount[];
      par_statut_temporel_detaille?: {
        en_cours: number;
        en_passe: number;
        futur: number;
      };
    };
    absences: {
      total: number;
      top_absences_etudiants: AbsenceStudent[];
    };
    rattrapages: {
      total: number;
      par_mois: RattrapageMois[];
    };
    repartition_geographique: {
      densite_par_ville: VilleDensite[];
      top_5_villes: VilleDensite[];
    };
    performance: {
      taux_presence_approximatif: number;
      total_absences: number;
      total_etudiants: number;
    };
    filtres_appliques?: {
      annee_universitaire?: string;
      date_debut?: string;
      date_fin?: string;
      statut_temporel?: string;
    };
  };
}

export interface Ville {
  ville_id: number;
  ville_name: string;
  nombre_etudiants: number;
  nombre_groups: number;
  nombre_etablissements: number;
  pourcentage_etudiants: number;
  pourcentage_groups: number;
}

export interface VilleCount {
  ville_name: string;
  count: number;
}

export interface EtablissementCount {
  etablissement_name: string;
  count: number;
}

export interface PromotionCount {
  promotion_name: string;
  count?: number;
  nombre_etudiants?: number;
}

export interface OptionCount {
  option_name: string;
  count: number;
}

export interface GroupDetail {
  group_title: string;
  student_count: number;
}

export interface EtablissementDetail {
  etablissement_name: string;
  ville_name: string;
  nombre_etudiants: number;
  nombre_groups: number;
}

export interface OptionDetail {
  option_name: string;
  etablissement_name: string;
  nombre_etudiants: number;
}

export interface TypeCount {
  type_name: string;
  count: number;
}

export interface AbsenceStudent {
  first_name: string;
  last_name: string;
  nombre_absences: number;
}

export interface RattrapageMois {
  mois: number;
  annee: number;
  nombre_rattrapages: number;
}

export interface VilleDensite {
  ville_name: string;
  nombre_etudiants: number;
  nombre_groups: number;
  nombre_etablissements: number;
}

export interface YearCount {
  annee_universitaire: string;
  count: number;
}

export interface StatusCount {
  statut_temporel: string;
  count: number;
}

export interface FilterOptions {
  annee_universitaire?: string;
  date_debut?: string;
  date_fin?: string;
  statut_temporel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private readonly API_URL = 'http://127.0.0.1:8000/api';
  private readonly STATISTICS_ENDPOINT = `${this.API_URL}/statistics`;

  constructor(private http: HttpClient) {}

  /**
   * Récupérer toutes les statistiques du tableau de bord
   */
  getStatistics(): Observable<DashboardStatistics> {
    return this.http.get<DashboardStatistics>(this.STATISTICS_ENDPOINT);
  }

  /**
   * Récupérer les statistiques filtrées par date et année universitaire
   */
  getFilteredStatistics(filters: FilterOptions): Observable<DashboardStatistics> {
    let params = new HttpParams();
    
    if (filters.annee_universitaire) {
      params = params.set('annee_universitaire', filters.annee_universitaire);
    }
    if (filters.date_debut) {
      params = params.set('date_debut', filters.date_debut);
    }
    if (filters.date_fin) {
      params = params.set('date_fin', filters.date_fin);
    }
    if (filters.statut_temporel) {
      params = params.set('statut_temporel', filters.statut_temporel);
    }
    
    return this.http.get<DashboardStatistics>(`${this.STATISTICS_ENDPOINT}/filtered`, { params });
  }

  /**
   * Formater le nom du mois
   */
  formatMonth(month: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[month - 1] || '';
  }

  /**
   * Calculer le pourcentage
   */
  calculatePercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Formater un grand nombre
   */
  formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
