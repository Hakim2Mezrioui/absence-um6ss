import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, tap } from 'rxjs';
import { Faculte } from '../models/Facultes';

@Injectable({
  providedIn: 'root',
})

export class StartupService {
  constructor(private http: HttpClient) {}

  baseUrl: string = 'http://127.0.0.1:8000/api';
  facultes: Faculte[] = [];
  isLogin: boolean = false;

  async fetchFacultes() {
    this.http
      .get<any[]>(`${this.baseUrl}/facultes`)
      .pipe(
        map((data) => {
          return data.map((data) => {
            return new Faculte(data.name, data.id);
          });
        }),
        tap((facultes: Faculte[]) => {
          this.facultes = facultes;
          return facultes;
        })
      )
      .subscribe(() => {
        console.log(this.facultes);
      });
  }

  isLoginPage(value: boolean) {
    this.isLogin = value;
  }
}
