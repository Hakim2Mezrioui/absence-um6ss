import { StartupService } from './startup.service';
import { HttpClient } from '@angular/common/http';
import { Injectable, OnInit } from '@angular/core';
import { Examen } from '../models/Examen';
import { BehaviorSubject, map, Observable, ReplaySubject, tap } from 'rxjs';
import { Etudiant } from '../models/Etudiant';

@Injectable({
  providedIn: 'root',
})
export class ExamenService implements OnInit {
  baseUrl: string = 'http://127.0.0.1:8000/api';

  examens: Examen[] = [];

  totalPages = new BehaviorSubject(0);

  loading = new BehaviorSubject<boolean>(false);

  searchValue = new BehaviorSubject<String>('');

  // actualPage = new ReplaySubject();
  actualPage = new BehaviorSubject<number>(1);

  statutActual = new BehaviorSubject<String>('tous');
  faculteActual = new BehaviorSubject<String>('toutes');

  localStudents = new BehaviorSubject<Etudiant[]>([]);
  studiantsWithFaceId = new BehaviorSubject<String[]>([]);

  examenExploring = new BehaviorSubject<Examen>(
    new Examen(
      '',
      new Date(),
      new Date(),
      new Date(),
      new Date(),
      '',
      '',
      '',
      ''
    )
  );

  constructor(private http: HttpClient) {}
  ngOnInit(): void {}

  fetchExamens(
    page: number = 1,
    statut: String = 'tous',
    faculte: String = 'toutes',
    value: String = ''
  ): Observable<Examen[]> {
    this.loading.next(true);
    this.actualPage.next(page);
    this.faculteActual.subscribe((value) => (faculte = value));
    return this.http
      .get<{ examens: any[]; totalPages: number }>(
        `${this.baseUrl}/examens?page=${page}&statut=${statut}&faculte=${faculte}&searchValue=${value}`
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
              item.option ?? '',
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

  fetchExam(id: number) {
    return this.http.get(`${this.baseUrl}/examens/${id}`);
  }

  suivi(data: {
    hour1: string;
    hour2: string;
    date: string;
    faculte: String;
    promotion: String;
  }) {
    return this.http.get(
      `${this.baseUrl}/etudiants?hour1=${data.hour1}&hour2=${
        data.hour2
      }&date=${this.formatDate(data.date)}&faculte=${data.faculte}&promotion=${
        data.promotion
      }`
    );
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
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
      option: examen.option,
    });
  }

  importer(examens: FormData) {
    return this.http.post(`${this.baseUrl}/import-examens`, examens);
  }

  delete(id: number) {
    return this.http.delete(`${this.baseUrl}/examens/${id}`, {});
  }

  update(examen: Examen, id: number) {
    return this.http.put(`${this.baseUrl}/examens/${id}`, { ...examen });
  }

  search(value: String) {
    return this.http
      .get<{ examens: any[]; totalPages: number }>(`${this.baseUrl}/examens`)
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
}
