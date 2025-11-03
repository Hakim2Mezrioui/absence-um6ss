import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BiostarDevice {
  devid: string | number;
  devnm: string;
}

@Injectable({ providedIn: 'root' })
export class BiostarService {
  private readonly baseUrl = `${environment.apiUrl}/biostar`;

  constructor(private http: HttpClient) {}

  getDevices(villeId: number): Observable<{ success: boolean; devices: BiostarDevice[] }> {
    const params = new HttpParams().set('ville_id', String(villeId));
    return this.http.get<{ success: boolean; devices: BiostarDevice[] }>(`${this.baseUrl}/devices`, { params });
  }
}


