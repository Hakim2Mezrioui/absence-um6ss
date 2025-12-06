import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface QrScanRequest {
  token: string;
}

export interface QrScanResponse {
  success: boolean;
  status: 'present' | 'invalid' | 'duplicate';
  message: string;
  scan_id?: number;
}

@Injectable({
  providedIn: 'root'
})
export class QrScanService {
  private readonly apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) {}

  /**
   * Scanner un QR code et enregistrer la présence
   * Route: POST /api/etudiants/qr-scan
   */
  scanQrCode(token: string): Observable<QrScanResponse> {
    return this.http.post<QrScanResponse>(`${this.apiUrl}/etudiants/qr-scan`, {
      token: token
    });
  }
}

