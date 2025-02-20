import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Cours } from '../models/Cours';
import { BehaviorSubject, map, Observable, tap } from 'rxjs';
import { Etudiant } from '../models/Etudiant';

@Injectable({
  providedIn: 'root',
})
export class CoursService {
  baseUrl: string = 'http://127.0.0.1:8000/api'; // Remplace par ton URL Laravel
  cours: Cours[] = [];
  loading = new BehaviorSubject(false);

  totalPages = new BehaviorSubject(0);

  searchValue = new BehaviorSubject<String>('');

  // actualPage = new ReplaySubject();
  actualPage = new BehaviorSubject<number>(1);

  statutActual = new BehaviorSubject<String>('tous');
  faculteActual = new BehaviorSubject<String>('toutes');

  localStudents = new BehaviorSubject<Etudiant[]>([]);
  studiantsWithFaceId = new BehaviorSubject<String[]>([]);

  coursExploring = new BehaviorSubject<Cours>(
    new Cours('', new Date(), new Date(), new Date(), 10,'', '', 0)
  );

  constructor(private http: HttpClient) {}

  getAllCours(
    page: number = 1,
    faculte: String = 'toutes',
    value: String = ''
  ): Observable<Cours[]> {
    this.faculteActual.subscribe((value) => (faculte = value));
    this.actualPage.next(page);
    return this.http
      .get<any[]>(
        `${this.baseUrl}/cours?page=${page}&faculte=${faculte}&searchValue=${value}`
      )
      .pipe(
        map((response: any) => {
          this.totalPages.next(response.totalPages);
          return response.cours.map((item: any) => {
            return new Cours(
              item.title,
              item.date,
              item.hour_debut,
              item.hour_fin,
              item.tolerance,
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

  suivi(data: {
    hour1: string;
    hour2: string;
    date: string;
    faculte: String;
    promotion: String;
    groupe: number;
  }) {
    return this.http.get(
      `${this.baseUrl}/etudiants?hour1=${data.hour1}&hour2=${
        data.hour2
      }&date=${this.formatDate(data.date)}&faculte=${data.faculte}&promotion=${
        data.promotion
      }&groupe=${data.groupe}`
    );
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }

  getCoursById(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/cours/${id}`);
  }

  addCours(coursData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/cours`, coursData);
  }

  updateCours(id: number, coursData: any): Observable<any> {
    console.log(coursData)
    return this.http.put<any>(`${this.baseUrl}/cours/${id}`, coursData);
  }

  deleteCours(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/cours/${id}`);
  }

  importer(examens: FormData) {
    return this.http.post(`${this.baseUrl}/import-cours`, examens);
  }
}
