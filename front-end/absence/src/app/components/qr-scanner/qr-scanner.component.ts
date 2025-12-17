import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Html5Qrcode } from 'html5-qrcode';
import { QrScanService, QrScanResponse } from '../../services/qr-scan.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './qr-scanner.component.html',
  styleUrl: './qr-scanner.component.css'
})
export class QrScannerComponent implements OnInit, OnDestroy {
  @ViewChild('scanner', { static: false }) scannerElement!: ElementRef<HTMLDivElement>;
  
  private destroy$ = new Subject<void>();
  private html5QrCode: Html5Qrcode | null = null;
  
  isScanning = false;
  isProcessing = false;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  scanResult: QrScanResponse | null = null;

  constructor(private qrScanService: QrScanService) {}

  ngOnInit(): void {
    // Le scanner sera démarré manuellement via le bouton "Démarrer le scan"
  }

  ngOnDestroy(): void {
    this.stopScanning();
    this.destroy$.next();
    this.destroy$.complete();
  }

  async startScanning(): Promise<void> {
    if (this.isScanning) {
      return;
    }

    try {
      this.isScanning = true;
      this.errorMessage = null;
      this.successMessage = null;
      this.scanResult = null;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        supportedScanTypes: []
      };

      this.html5QrCode = new Html5Qrcode('qr-reader');
      
      await this.html5QrCode.start(
        { facingMode: 'environment' }, // Utiliser la caméra arrière
        config,
        (decodedText: string, decodedResult: unknown) => {
          this.onScanSuccess(decodedText);
        },
        (errorMessage: string) => {
          // Ignorer les erreurs de scan continu
        }
      );
    } catch (err: unknown) {
      console.error('Erreur lors du démarrage du scanner:', err);
      this.errorMessage = 'Impossible d\'accéder à la caméra. Vérifiez les permissions.';
      this.isScanning = false;
    }
  }

  stopScanning(): void {
    if (this.html5QrCode && this.isScanning) {
      this.html5QrCode.stop().then(() => {
        this.html5QrCode?.clear();
        this.html5QrCode = null;
        this.isScanning = false;
      }).catch((err) => {
        console.error('Erreur lors de l\'arrêt du scanner:', err);
        this.isScanning = false;
      });
    }
  }

  private async onScanSuccess(token: string): Promise<void> {
    // Arrêter le scanner immédiatement après avoir scanné
    this.stopScanning();
    
    if (this.isProcessing) {
      return; // Éviter les scans multiples
    }

    this.isProcessing = true;
    this.errorMessage = null;
    this.successMessage = null;

    try {
      this.qrScanService.scanQrCode(token)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: QrScanResponse) => {
            this.scanResult = response;
            
            if (response.success) {
              this.successMessage = response.message || 'Présence enregistrée avec succès !';
              
              // Fermer automatiquement après 2 secondes
              setTimeout(() => {
                this.close();
              }, 2000);
            } else {
              this.errorMessage = response.message || 'Erreur lors de l\'enregistrement de la présence.';
              
              // Réactiver le scanner après 3 secondes en cas d'erreur
              setTimeout(() => {
                this.isProcessing = false;
                this.startScanning();
              }, 3000);
            }
          },
          error: (error) => {
            console.error('Erreur API:', error);
            this.errorMessage = error?.error?.message || 'Erreur lors de la communication avec le serveur.';
            
            // Réactiver le scanner après 3 secondes
            setTimeout(() => {
              this.isProcessing = false;
              this.startScanning();
            }, 3000);
          }
        });
    } catch (error) {
      console.error('Erreur lors du traitement du scan:', error);
      this.errorMessage = 'Erreur lors du traitement du QR code.';
      this.isProcessing = false;
    }
  }

  close(): void {
    this.stopScanning();
    this.errorMessage = null;
    this.successMessage = null;
    this.scanResult = null;
    this.isProcessing = false;
    
    // Émettre un événement pour fermer le modal (sera géré par le parent)
    const event = new CustomEvent('qr-scanner-close');
    window.dispatchEvent(event);
  }

  retry(): void {
    this.errorMessage = null;
    this.successMessage = null;
    this.scanResult = null;
    this.isProcessing = false;
    this.startScanning();
  }
}

