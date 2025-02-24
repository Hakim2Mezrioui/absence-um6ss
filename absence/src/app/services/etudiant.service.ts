import { Injectable } from '@angular/core';
import { Etudiant } from '../models/Etudiant';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, map, Observable, Subject, tap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EtudiantService {
  baseUrl: string = 'http://127.0.0.1:8000/api';
  etudiant: Etudiant[] = [];
  constructor(private http: HttpClient) {}

  ajouter(etudiant: Etudiant) {
    console.log(etudiant);
    return this.http.post(`${this.baseUrl}/add-etudiant`, {
      matricule: etudiant.matricule,
      name: etudiant.name,
      promotion: etudiant.promotion,
      faculte: etudiant.faculte,
      groupe: etudiant.groupe,
      option: etudiant.option
    });
  }

  importer() {}

  fetch(): Observable<Etudiant[]> {
    return this.http.get(`${this.baseUrl}/fetch-etudiants`).pipe(
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
