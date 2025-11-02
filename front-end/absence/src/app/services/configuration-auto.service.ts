import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Configuration {
  id?: number;
  sqlsrv: string;
  database: string;
  trustServerCertificate: string;
  biostar_username: string;
  biostar_password: string;
  ville_id: number;
  ville?: {
    id: number;
    name: string;
  };
}

export interface ConnectionConfig {
  dsn: string;
  username: string;
  password: string;
  ville_id: number;
}

@Injectable({
  providedIn: 'root'
})
export class ConfigurationAutoService {
  private readonly apiUrl = `${environment.apiUrl}/configuration`;
  private currentConfigurationSubject = new BehaviorSubject<Configuration | null>(null);
  private currentConnectionConfigSubject = new BehaviorSubject<ConnectionConfig | null>(null);

  public currentConfiguration$ = this.currentConfigurationSubject.asObservable();
  public currentConnectionConfig$ = this.currentConnectionConfigSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Get configuration for a specific ville
   */
  getConfigurationForVille(villeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/for-ville/${villeId}`);
  }

  /**
   * Get configuration for a cours (based on cours ville)
   */
  getConfigurationForCours(coursId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/for-cours/${coursId}`);
  }

  /**
   * Get configuration for an examen (based on examen ville)
   */
  getConfigurationForExamen(examenId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/for-examen/${examenId}`);
  }

  /**
   * Get connection configuration for a specific ville
   */
  getConnectionConfigForVille(villeId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/connection/for-ville/${villeId}`);
  }

  /**
   * Get connection configuration for a cours
   */
  getConnectionConfigForCours(coursId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/connection/for-cours/${coursId}`);
  }

  /**
   * Get connection configuration for an examen
   */
  getConnectionConfigForExamen(examenId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/connection/for-examen/${examenId}`);
  }

  /**
   * Auto-select configuration for a cours and update current configuration
   */
  autoSelectConfigurationForCours(coursId: number): Observable<any> {
    return new Observable(observer => {
      this.getConfigurationForCours(coursId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentConfigurationSubject.next(response.data);
            observer.next(response);
            observer.complete();
          } else {
            observer.error(response.message || 'Configuration not found for cours');
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Auto-select configuration for an examen and update current configuration
   */
  autoSelectConfigurationForExamen(examenId: number): Observable<any> {
    return new Observable(observer => {
      this.getConfigurationForExamen(examenId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentConfigurationSubject.next(response.data);
            observer.next(response);
            observer.complete();
          } else {
            observer.error(response.message || 'Configuration not found for examen');
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Auto-select connection configuration for a cours and update current connection config
   */
  autoSelectConnectionConfigForCours(coursId: number): Observable<any> {
    return new Observable(observer => {
      this.getConnectionConfigForCours(coursId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentConnectionConfigSubject.next(response.data);
            observer.next(response);
            observer.complete();
          } else {
            observer.error(response.message || 'Connection configuration not found for cours');
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Auto-select connection configuration for an examen and update current connection config
   */
  autoSelectConnectionConfigForExamen(examenId: number): Observable<any> {
    return new Observable(observer => {
      this.getConnectionConfigForExamen(examenId).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.currentConnectionConfigSubject.next(response.data);
            observer.next(response);
            observer.complete();
          } else {
            observer.error(response.message || 'Connection configuration not found for examen');
          }
        },
        error: (error) => {
          observer.error(error);
        }
      });
    });
  }

  /**
   * Get current configuration
   */
  getCurrentConfiguration(): Configuration | null {
    return this.currentConfigurationSubject.value;
  }

  /**
   * Get current connection configuration
   */
  getCurrentConnectionConfig(): ConnectionConfig | null {
    return this.currentConnectionConfigSubject.value;
  }

  /**
   * Clear current configuration
   */
  clearCurrentConfiguration(): void {
    this.currentConfigurationSubject.next(null);
    this.currentConnectionConfigSubject.next(null);
  }

  /**
   * Check if configuration is available for a cours
   */
  isConfigurationAvailableForCours(coursId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getConfigurationForCours(coursId).subscribe({
        next: (response) => {
          observer.next(response.success && response.data);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Check if configuration is available for an examen
   */
  isConfigurationAvailableForExamen(examenId: number): Observable<boolean> {
    return new Observable(observer => {
      this.getConfigurationForExamen(examenId).subscribe({
        next: (response) => {
          observer.next(response.success && response.data);
          observer.complete();
        },
        error: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }
}
