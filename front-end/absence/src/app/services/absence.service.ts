import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interface pour un cours
export interface Cours {
  id: number;
  name: string; // Changé de 'nom' à 'name' pour correspondre à l'API
  date: string;
  heure_debut: string;
  heure_fin: string;
  etablissement_id: number;
  promotion_id: number;
  type_cours_id?: number;
  salle_id?: number;
  option_id?: number;
  annee_universitaire: string;
  statut_temporel: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  promotion?: {
    id: number;
    name: string;
  };
  option?: {
    id: number;
    name: string;
  };
  etablissement?: {
    id: number;
    name: string;
  };
  ville?: {
    id: number;
    name: string;
  };
}

// Interface pour un examen (importée ou redéfinie)
export interface Examen {
  id: number;
  title: string;
  date: string;
  heure_debut: string;
  heure_fin: string;
  option_id?: number;
  salle_id: number;
  promotion_id: number;
  type_examen_id: number;
  etablissement_id: number;
  group_id: number;
  ville_id: number;
  annee_universitaire: string;
  statut_temporel: 'passé' | 'en_cours' | 'futur';
  created_at: string;
  updated_at: string;
  
  // Relations
  option?: {
    id: number;
    name: string;
  };
  etablissement?: {
    id: number;
    name: string;
  };
  promotion?: {
    id: number;
    name: string;
  };
  salle?: {
    id: number;
    name: string;
  };
  type_examen?: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
  };
  ville?: {
    id: number;
    name: string;
  };
}

// Interface pour un étudiant (réutilisation de l'interface existante)
export interface Etudiant {
  id: number;
  matricule: string;
  first_name: string;
  last_name: string;
  email: string;
  photo?: string | null;
  promotion_id: number;
  etablissement_id: number;
  ville_id: number;
  group_id: number;
  option_id: number;
  created_at: string;
  updated_at: string;
  
  // Relations
  ville?: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
  group?: {
    id: number;
    title: string;
    promotion_id: number;
    etablissement_id: number;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  option?: {
    id: number;
    name: string;
    description: string;
    etablissement_id: number;
    created_at: string;
    updated_at: string;
  };
  etablissement?: {
    id: number;
    name: string;
    ville_id: number;
    created_at: string;
    updated_at: string;
  };
  promotion?: {
    id: number;
    name: string;
    created_at: string;
    updated_at: string;
  };
}

// Interface principale pour une absence
export interface Absence {
  id: number;
  type_absence: string;
  etudiant_id: number;
  cours_id?: number;
  examen_id?: number;
  date_absence: string;
  justifiee: boolean;
  motif?: string;
  justificatif?: string;
  created_at: string;
  updated_at: string;
  
  // Relations avec les détails complets
  etudiant?: Etudiant;
  cours?: Cours;
  examen?: Examen;
}

// Interface pour la réponse paginée des absences
export interface AbsenceResponse {
  absences: Absence[];
  totalPages: number;
  total: number;
  status: number;
}

// Interface pour les filtres d'absence
export interface AbsenceFilters {
  size?: number;
  page?: number;
  searchValue?: string;
  etudiant_id?: number;
  cours_id?: number;
  examen_id?: number;
  justifiee?: boolean | string;
  date_debut?: string;
  date_fin?: string;
}

// Interface pour créer/modifier une absence
export interface CreateAbsenceRequest {
  type_absence: string;
  etudiant_id: number;
  cours_id?: number;
  examen_id?: number;
  date_absence: string;
  justifiee?: boolean;
  motif?: string;
  justificatif?: string;
}

// Interface pour justifier une absence
export interface JustifierAbsenceRequest {
  justifiee: boolean;
  motif?: string;
  justificatif?: string;
}

// Interface pour les statistiques d'absence
export interface AbsenceStatistics {
  total_absences: number;
  absences_justifiees: number;
  absences_non_justifiees: number;
  pourcentage_justifiees: number;
  absences_par_type?: {
    [key: string]: number;
  };
  absences_par_mois?: {
    [key: string]: number;
  };
  top_etudiants_absents?: {
    etudiant: Etudiant;
    total_absences: number;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class AbsenceService {
  private readonly apiUrl = `${environment.apiUrl}/absences`;

  constructor(private http: HttpClient) { }

  /**
   * Tester la connectivité avec l'API
   */
  testConnection(): Observable<any> {
    console.log('🔗 Test de connexion vers:', this.apiUrl);
    return this.http.get(`${this.apiUrl}?size=1&page=1`);
  }

  /**
   * Récupérer toutes les absences avec pagination et filtres
   */
  getAbsences(filters: AbsenceFilters = {}): Observable<AbsenceResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof AbsenceFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<AbsenceResponse>(this.apiUrl, { params });
  }

  /**
   * Récupérer une absence spécifique par ID
   */
  getAbsence(id: number): Observable<Absence> {
    return this.http.get<Absence>(`${this.apiUrl}/${id}`);
  }

  /**
   * Créer une nouvelle absence
   */
  createAbsence(absence: CreateAbsenceRequest): Observable<{ message: string; absence: Absence }> {
    return this.http.post<{ message: string; absence: Absence }>(this.apiUrl, absence);
  }

  /**
   * Mettre à jour une absence existante
   */
  updateAbsence(id: number, absence: Partial<CreateAbsenceRequest>): Observable<{ message: string; absence: Absence }> {
    return this.http.put<{ message: string; absence: Absence }>(`${this.apiUrl}/${id}`, absence);
  }

  /**
   * Supprimer une absence
   */
  deleteAbsence(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupérer toutes les absences (sans pagination)
   */
  getAllAbsences(): Observable<{ absences: Absence[]; status: number }> {
    return this.http.get<{ absences: Absence[]; status: number }>(`${this.apiUrl}/all`);
  }

  /**
   * Rechercher des absences
   */
  searchAbsences(searchTerm: string): Observable<{ absences: Absence[]; status: number }> {
    const params = new HttpParams().set('search', searchTerm);
    return this.http.get<{ absences: Absence[]; status: number }>(`${this.apiUrl}/search`, { params });
  }

  /**
   * Récupérer les absences d'un étudiant spécifique
   */
  getAbsencesByEtudiant(etudiantId: number): Observable<{ absences: Absence[]; status: number }> {
    return this.http.get<{ absences: Absence[]; status: number }>(`${this.apiUrl}/etudiant/${etudiantId}`);
  }

  /**
   * Récupérer les absences d'un cours spécifique
   */
  getAbsencesByCours(coursId: number): Observable<{ absences: Absence[]; status: number }> {
    return this.http.get<{ absences: Absence[]; status: number }>(`${this.apiUrl}/cours/${coursId}`);
  }

  /**
   * Récupérer les absences d'un examen spécifique
   */
  getAbsencesByExamen(examenId: number): Observable<{ absences: Absence[]; status: number }> {
    return this.http.get<{ absences: Absence[]; status: number }>(`${this.apiUrl}/examen/${examenId}`);
  }

  /**
   * Justifier une absence
   */
  justifierAbsence(id: number, data: JustifierAbsenceRequest): Observable<{ message: string; absence: Absence }> {
    return this.http.put<{ message: string; absence: Absence }>(`${this.apiUrl}/${id}/justifier`, data);
  }

  /**
   * Récupérer les statistiques des absences
   */
  getStatistics(): Observable<{ statistics: AbsenceStatistics; status: number }> {
    return this.http.get<{ statistics: AbsenceStatistics; status: number }>(`${this.apiUrl}/statistics`);
  }
}
