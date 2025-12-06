import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { QRCodeComponent } from 'angularx-qrcode';

@Component({
  selector: 'app-qr-display',
  standalone: true,
  imports: [CommonModule, QRCodeComponent],
  templateUrl: './qr-display.component.html',
  styleUrl: './qr-display.component.css'
})
export class QrDisplayComponent implements OnInit, OnDestroy {
  coursId: number | null = null;
  examenId: number | null = null;
  type: 'cours' | 'examen' = 'cours';
  token: string | null = null;
  expiresAt: string | null = null;
  loading = false;
  error = '';

  private refreshSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Détecter le type (cours ou examen) depuis l'URL
    const url = this.route.snapshot.url.join('/');
    const idParam = this.route.snapshot.paramMap.get('id');
    const id = idParam ? Number(idParam) : 0;

    if (url.includes('examen')) {
      this.type = 'examen';
      this.examenId = id;
    } else {
      this.type = 'cours';
      this.coursId = id;
    }

    if (!this.coursId && !this.examenId) {
      this.error = this.type === 'examen' 
        ? 'ID d\'examen manquant dans l\'URL.' 
        : 'ID de cours manquant dans l\'URL.';
      return;
    }

    this.loadQr();

    // Rafraîchir automatiquement toutes les ~20 secondes
    this.refreshSub = interval(20000).subscribe(() => {
      this.loadQr();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  loadQr(): void {
    this.loading = true;
    this.error = '';

    const url = this.type === 'examen'
      ? `${environment.apiUrl}/qr-attendance/examens/${this.examenId}/generate`
      : `${environment.apiUrl}/qr-attendance/cours/${this.coursId}/generate`;

    // Récupérer le token manuellement pour s'assurer qu'il est disponible
    const token = this.authService.getRawToken();

    // Créer les headers avec le token
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    this.http.post<any>(url, {}, { headers })
      .subscribe({
        next: (res) => {
          this.loading = false;
          if (res?.success && res.data) {
            this.token = res.data.token;
            this.expiresAt = res.data.expires_at;
          } else {
            this.error = res?.message || 'Erreur lors de la génération du QR code.';
          }
        },
        error: (err) => {
          console.error('Erreur génération QR:', err);
          this.loading = false;
          // Afficher l'erreur détaillée du backend si disponible
          const errorMessage = err?.error?.message || err?.message || 'Erreur réseau lors de la génération du QR code.';
          this.error = errorMessage;
        }
      });
  }
}


