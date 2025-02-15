import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cours } from '../models/Cours';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CoursService {
  baseUrl: string = 'http://127.0.0.1:8000/api'; // Remplace par ton URL Laravel

  constructor(private http: HttpClient) {}

  getAllCours(): Observable<Cours[]> {
    return this.http.get<any[]>(this.baseUrl);
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
