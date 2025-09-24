import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Cours {
  id: number;
  name: string;
  date: string;
  pointage_start_hour: string;
  heure_debut: string;
  heure_fin: string;
  tolerance: string;
  etablissement_id: number;
  promotion_id: number;
  type_cours_id: number;
  salle_id: number;
  option_id?: number;
  group_id?: number;
  ville_id?: number;
  annee_universitaire: string;
  statut_temporel?: 'passé' | 'en_cours' | 'futur'; // Calculé côté frontend
  created_at: string;
  updated_at: string;
  etablissement?: {
    id: number;
    name: string;
  };
  promotion?: {
    id: number;
    name: string;
  };
  type_cours?: {
    id: number;
    name: string;
  };
  salle?: {
    id: number;
    name: string;
  };
  option?: {
    id: number;
    name: string;
  };
  group?: {
    id: number;
    name: string;
    title?: string;
  };
  ville?: {
    id: number;
    name: string;
  };
}

export interface CoursResponse {
  data: Cours[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface CoursFilters {
  size?: number;
  page?: number;
  etablissement_id?: number;
  promotion_id?: number;
  salle_id?: number;
  type_cours_id?: number;
  group_id?: number;
  ville_id?: number;
  searchValue?: string;
  date?: string;
}

export interface TypeCours {
  id: number;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class CoursService {
  private apiUrl = 'http://127.0.0.1:8000/api/cours';
  private typesCoursUrl = 'http://127.0.0.1:8000/api/types-cours';

  constructor(private http: HttpClient) { }

  getCours(filters: CoursFilters = {}): Observable<CoursResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof CoursFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    console.log('Requête API cours:', this.apiUrl, 'avec params:', params.toString());
    
    return this.http.get<CoursResponse>(this.apiUrl, { params });
  }

  getCoursById(id: number): Observable<Cours> {
    return this.http.get<Cours>(`${this.apiUrl}/${id}`);
  }

  createCours(cours: Partial<Cours>): Observable<Cours> {
    return this.http.post<Cours>(this.apiUrl, cours);
  }

  updateCours(id: number, cours: Partial<Cours>): Observable<Cours> {
    return this.http.put<Cours>(`${this.apiUrl}/${id}`, cours);
  }

  deleteCours(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Méthode pour récupérer tous les types de cours
  getTypesCours(): Observable<TypeCours[]> {
    return this.http.get<TypeCours[]>(`${this.typesCoursUrl}/all`);
  }

  // Méthode pour récupérer les types de cours avec pagination
  getTypesCoursPaginated(page: number = 1, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<any>(this.typesCoursUrl, { params });
  }

  // Méthode unique pour récupérer toutes les options de filtre
  getFilterOptions(): Observable<any> {
    return this.http.get(`${this.apiUrl}/filter-options`);
  }

  /**
   * Calcule le statut temporel d'un cours basé sur la date et l'heure actuelles
   */
  calculateStatutTemporel(cours: Cours): 'passé' | 'en_cours' | 'futur' {
    const now = new Date();
    
    // Vérifier que les données nécessaires sont présentes
    if (!cours.date || !cours.heure_debut || !cours.heure_fin) {
      return 'futur';
    }
    
    // Extraire la date sans l'heure (format YYYY-MM-DD)
    const coursDate = cours.date.split('T')[0];
    
    // Vérifier que la date extraite est valide
    if (!coursDate || coursDate.length !== 10) {
      return 'futur';
    }
    
    // Créer la date du cours avec l'heure de début
    // Les heures peuvent être au format HH:MM ou HH:MM:SS
    const heureDebut = cours.heure_debut.includes(':') ? cours.heure_debut : `${cours.heure_debut}:00`;
    const heureFin = cours.heure_fin.includes(':') ? cours.heure_fin : `${cours.heure_fin}:00`;
    
    const coursDateTimeDebut = new Date(`${coursDate}T${heureDebut}`);
    const coursDateTimeFin = new Date(`${coursDate}T${heureFin}`);
    
    // Vérifier si les dates sont valides AVANT d'essayer de les utiliser
    if (isNaN(coursDateTimeDebut.getTime()) || isNaN(coursDateTimeFin.getTime())) {
      return 'futur';
    }
    
    // Comparer les dates et heures complètes
    if (now < coursDateTimeDebut) {
      return 'futur';
    } else if (now >= coursDateTimeDebut && now <= coursDateTimeFin) {
      return 'en_cours';
    } else {
      return 'passé';
    }
  }

  /**
   * Applique le statut temporel calculé à un cours
   */
  applyCalculatedStatutTemporel(cours: Cours): Cours {
    return {
      ...cours,
      statut_temporel: this.calculateStatutTemporel(cours)
    };
  }

  /**
   * Applique le statut temporel calculé à une liste de cours
   */
  applyCalculatedStatutTemporelToList(coursList: Cours[]): Cours[] {
    return coursList.map(cours => this.applyCalculatedStatutTemporel(cours));
  }

}
