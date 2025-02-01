import { Injectable } from '@angular/core';
import { Etudiant } from '../models/Etudiant';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EtudiantService {
  baseUrl: string = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  ajouter(etudiant: Etudiant) {
    return this.http.post(`${this.baseUrl}/add-etudiant`, {
      matricule: etudiant.matricule,
      name: etudiant.name,
      promotion: etudiant.promotion,
      faculte: etudiant.faculte,
    });
  }
}
