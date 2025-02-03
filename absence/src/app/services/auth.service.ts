import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private baseUrl = 'http://127.0.0.1:8000/api'; // Replace with your backend API URL

  constructor(private http: HttpClient) { }

  login(email: string, password: string): Observable<any> {
    const url = `${this.baseUrl}/login`;
    const body = { email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(url, body, { headers });
  }

  signup(name: String, email: string, password: string): Observable<any> {
    const url = `${this.baseUrl}/signup`;
    const body = { name, email, password };
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });

    return this.http.post(url, body, { headers });
  }

  // logout() {
  //   return this.http.post(`${this.baseUrl}/logout`);
  // }
}