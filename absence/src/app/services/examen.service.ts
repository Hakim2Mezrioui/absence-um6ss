import { StartupService } from './startup.service';
import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Examen } from '../models/Examen';
import { BehaviorSubject, map, Observable, ReplaySubject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ExamenService implements OnInit {
  baseUrl: string = 'http://127.0.0.1:8000/api';

  examens: Examen[] = [];

  totalPages = new BehaviorSubject(0);

  loading = new BehaviorSubject<boolean>(false);

  // actualPage = new ReplaySubject();
  actualPage = new BehaviorSubject<number>(1);

  statutActual = new BehaviorSubject<String>('tous');

  constructor(private http: HttpClient) {}
  ngOnInit(): void {}

  fetchExamens(
    page: number = 1,
    statut: String = 'tous'
  ): Observable<Examen[]> {
    this.loading.next(true);
    this.actualPage.next(page);
    return this.http
      .get<{ examens: any[]; totalPages: number }>(
        `${this.baseUrl}/examens?page=${page}&statut=${statut}`
      )
      .pipe(
        map((response) => {
          this.totalPages.next(response.totalPages);
          return response.examens.map((item) => {
            return new Examen(
              item.title,
              item.date,
              item.hour_debut,
              item.hour_fin,
              item.hour_debut_pointage,
              item.faculte,
              item.promotion,
              item.statut,
              item.id
            );
          });
        }),
        tap((examens: Examen[]) => {
          this.examens = examens;
          this.loading.next(false);
        })
      );
  }

  archiver(examen: Examen) {
    return this.http.put(`${this.baseUrl}/examens/${examen.id}`, {
      ...examen,
      statut: 'archivé',
    });
  }

  activer(examen: Examen) {
    return this.http.put(`${this.baseUrl}/examens/${examen.id}`, {
      ...examen,
      statut: 'en cours',
    });
  }

  ajouter(examen: Examen) {
    return this.http.post(`${this.baseUrl}/examens`, {
      title: examen.title,
      date: examen.date,
      hour_debut: examen.hour_debut,
      hour_fin: examen.hour_fin,
      hour_debut_pointage: examen.hour_debut_pointage,
      faculte: examen.faculte,
      promotion: examen.promotion,
      statut: examen.statut,
    });
  }

  importer(examens: FormData) {
    return this.http.post(`${this.baseUrl}/import-examens`, examens);
  }
}
