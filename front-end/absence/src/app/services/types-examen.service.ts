import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TypeExamen {
  id: number;
  name: string;
}

export interface TypeExamenResponse {
  data: TypeExamen[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class TypesExamenService {
  private apiUrl = 'http://127.0.0.1:8000/api/types-examen';

  constructor(private http: HttpClient) { }

  // Récupérer tous les types d'examen
  getAllTypesExamen(): Observable<TypeExamen[]> {
    return this.http.get<TypeExamen[]>(`${this.apiUrl}/all`);
  }

  // Récupérer les types d'examen avec pagination
  getTypesExamenPaginated(page: number = 1, size: number = 10): Observable<TypeExamenResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<TypeExamenResponse>(this.apiUrl, { params });
  }

  // Récupérer un type d'examen par ID
  getTypeExamenById(id: number): Observable<TypeExamen> {
    return this.http.get<TypeExamen>(`${this.apiUrl}/${id}`);
  }

  // Créer un nouveau type d'examen
  createTypeExamen(typeExamen: Partial<TypeExamen>): Observable<TypeExamen> {
    return this.http.post<TypeExamen>(this.apiUrl, typeExamen);
  }

  // Mettre à jour un type d'examen
  updateTypeExamen(id: number, typeExamen: Partial<TypeExamen>): Observable<TypeExamen> {
    return this.http.put<TypeExamen>(`${this.apiUrl}/${id}`, typeExamen);
  }

  // Supprimer un type d'examen
  deleteTypeExamen(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Rechercher des types d'examen
  searchTypesExamen(searchValue: string, page: number = 1, size: number = 10): Observable<TypeExamenResponse> {
    const params = new HttpParams()
      .set('search', searchValue)
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<TypeExamenResponse>(`${this.apiUrl}/search`, { params });
  }

  // Récupérer les types d'examen par catégorie
  getTypesExamenByCategory(category: string): Observable<TypeExamen[]> {
    const params = new HttpParams().set('category', category);
    return this.http.get<TypeExamen[]>(`${this.apiUrl}/category`, { params });
  }

  // Récupérer les types d'examen par niveau de difficulté
  getTypesExamenByDifficulty(difficulty: string): Observable<TypeExamen[]> {
    const params = new HttpParams().set('difficulty', difficulty);
    return this.http.get<TypeExamen[]>(`${this.apiUrl}/difficulty`, { params });
  }

  // Récupérer les types d'examen par semestre
  getTypesExamenBySemester(semester: string): Observable<TypeExamen[]> {
    const params = new HttpParams().set('semester', semester);
    return this.http.get<TypeExamen[]>(`${this.apiUrl}/semester`, { params });
  }

  // Récupérer les types d'examen avec le nombre d'examens associés
  getTypesExamenWithExamensCount(): Observable<TypeExamen[]> {
    return this.http.get<TypeExamen[]>(`${this.apiUrl}/with-examens-count`);
  }

  // Récupérer les statistiques des types d'examen
  getTypesExamenStatistics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/statistics`);
  }
}
