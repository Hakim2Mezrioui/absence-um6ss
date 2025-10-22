import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Group {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  etudiants?: {
    id: number;
    nom: string;
    prenom: string;
    matricule: string;
  }[];
}

export interface GroupResponse {
  data: Group[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface GroupFilters {
  size?: number;
  page?: number;
  etablissement_id?: number;
  promotion_id?: number;
  ville_id?: number;
  searchValue?: string;
}

export interface GroupFormData {
  title: string;
  promotion_id: number;
  etablissement_id: number;
  ville_id: number;
}

export interface GroupCreateResponse {
  etablissements: any[];
  promotions: any[];
  villes: any[];
}

@Injectable({
  providedIn: 'root'
})
export class GroupsService {
  private apiUrl = 'http://127.0.0.1:8000/api/groups';

  constructor(private http: HttpClient) { }

  /**
   * Récupérer tous les groupes (pour le filtrage frontend)
   */
  getAllGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(this.apiUrl);
  }

  getGroups(filters: GroupFilters = {}): Observable<Group[]> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof GroupFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    console.log('Requête API groups:', this.apiUrl, 'avec params:', params.toString());
    
    return this.http.get<Group[]>(this.apiUrl, { params });
  }

  getGroupById(id: number): Observable<Group> {
    return this.http.get<Group>(`${this.apiUrl}/${id}`);
  }

  createGroup(group: GroupFormData): Observable<any> {
    return this.http.post<any>(this.apiUrl, group);
  }

  updateGroup(id: number, group: GroupFormData): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, group);
  }

  deleteGroup(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }

  // Méthode pour récupérer les données nécessaires à la création/modification
  getCreateData(): Observable<GroupCreateResponse> {
    console.log('🔍 Appel API pour récupérer les données de création:', `${this.apiUrl}/create`);
    return this.http.get<GroupCreateResponse>(`${this.apiUrl}/create`);
  }

  // Méthode pour récupérer les données nécessaires à l'édition
  getEditData(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}/edit`);
  }

  // Méthode pour récupérer les étudiants d'un groupe
  getStudentsByGroup(id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${id}/students`);
  }

  // Méthode pour ajouter des étudiants à un groupe
  addStudentsToGroup(id: number, studentIds: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/students`, {
      student_ids: studentIds
    });
  }

  // Méthode pour retirer des étudiants d'un groupe
  removeStudentsFromGroup(id: number, studentIds: string[]): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}/students`, {
      body: { student_ids: studentIds }
    });
  }

  // Méthode pour récupérer les groupes par établissement
  getGroupsByEtablissement(etablissementId: number): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/by-etablissement/${etablissementId}`);
  }

  // Méthode pour récupérer les groupes par promotion
  getGroupsByPromotion(promotionId: number): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/by-promotion/${promotionId}`);
  }

  // Méthode pour récupérer les groupes par ville
  getGroupsByVille(villeId: number): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.apiUrl}/by-ville/${villeId}`);
  }
}
