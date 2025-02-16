import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cours } from '../models/Cours';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CoursService {
  baseUrl: string = 'http://127.0.0.1:8000/api'; // Remplace par ton URL Laravel
  cours: Cours[] = [];
  loading = new BehaviorSubject(false);

  constructor(private http: HttpClient) {}

  getAllCours(): Observable<Cours[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cours`).pipe(
      map((response) => {
        return response.map((item) => {
          return new Cours(
            item.title,
            item.date,
            item.hour_debut,
            item.hour_fin,
            item.faculte,
            item.promotion,
            item.groupe,
            item.option ?? '',
            item.id
          );
        });
      }),
      tap((examens: Cours[]) => {
        this.cours = examens;
        this.loading.next(false);
      })
    );
  }

  getCoursById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`);
  }

  addCours(coursData: Cours): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cours`, coursData);
  }

  updateCours(id: number, coursData: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, coursData);
  }

  deleteCours(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`);
  }
}
