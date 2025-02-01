import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class RattrapageService {
  baseUrl: string = 'http://127.0.0.1:8000/api';

  constructor(private http: HttpClient) {}

  importer(file: FormData) {
    return this.http.post(`${this.baseUrl}/rattrapage-importation`, file);
  }

  suivi(data: { hour1: string; hour2: string; date: string }) {
    return this.http.get(
      `${this.baseUrl}/rattrapage?hour1=${data.hour1}&hour2=${data.hour2}&date=${this.formatDate(data.date)}`
    );
  }

  formatDate(date: string): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = ('0' + (d.getMonth() + 1)).slice(-2);
    const day = ('0' + d.getDate()).slice(-2);
    return `${year}-${month}-${day}`;
  }
}
