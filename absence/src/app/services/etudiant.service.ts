import { Injectable, OnInit } from '@angular/core';
import { Etudiant } from '../models/Etudiant';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, Subject, tap } from 'rxjs';
import { StartupService } from './startup.service';

@Injectable({
  providedIn: 'root',
})
export class EtudiantService implements OnInit {
  baseUrl: string = 'http://127.0.0.1:8000/api';
  etudiant: Etudiant[] = [];
  role!: String;
  constructor(private http: HttpClient, private startupService: StartupService) {}

  ajouter(etudiant: FormData) {
    // return this.http.post(`${this.baseUrl}/add-etudiant`, {
    //   matricule: etudiant.matricule,
    //   name: etudiant.name,
    //   promotion: etudiant.promotion,
    //   faculte: etudiant.faculte,
    //   groupe: etudiant.groupe,
    //   option: etudiant.option
    // });
    return this.http.post(`${this.baseUrl}/add-etudiant`, etudiant);
  }

  ngOnInit(): void {
    this.startupService.role.subscribe((role) => {
      this.role = role;
    });
  }

  importer() {}

  fetch(): Observable<Etudiant[]> {
    return this.http
      .get(`${this.baseUrl}/fetch-etudiants`)
      .pipe(
        map((response: any) => {
          return response.etudiants.map((item: any) => {
            return new Etudiant(
              item.matricule,
              item.name,
              item.promotion,
              item.faculte,
              item.groupe,
              undefined,
              item.option
            );
          });
        }),
        tap((etudiants: Etudiant[]) => {
          this.etudiant = etudiants;
        })
      );
  }

    fetchByFaculte(faculte: string) {
      return this.http.get(`${this.baseUrl}/fetchEtudiantByFaculte`, {
        params: { faculte: faculte }
      }).pipe(
        map((response: any) => {
          return response.etudiants.map((item: any) => {
            return new Etudiant(
              item.matricule,
              item.name,
              item.promotion,
              item.faculte,
              item.groupe,
              undefined,
              item.option
            );
          });
        }),
        tap((etudiants: Etudiant[]) => {
          this.etudiant = etudiants;
        })
      );
    }

  delete(id: number) {
    return this.http.delete(`${this.baseUrl}/delete-etudiants/${id}`, {});
  }
}
