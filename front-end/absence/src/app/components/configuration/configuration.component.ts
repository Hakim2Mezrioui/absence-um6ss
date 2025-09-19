import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Configuration {
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

interface Ville {
  id: number;
  name: string;
}

@Component({
  selector: 'app-configuration',
  imports: [CommonModule, FormsModule],
  templateUrl: './configuration.component.html',
  styleUrl: './configuration.component.css'
})
export class ConfigurationComponent implements OnInit {
  configurations: Configuration[] = [];
  currentConfiguration: Configuration = {
    sqlsrv: '',
    database: '',
    trustServerCertificate: 'true',
    biostar_username: '',
    biostar_password: '',
    ville_id: 0
  };

  villes: Ville[] = [];
  isLoading = false;
  isSaving = false;
  isTestingConnection = false;
  message = '';
  messageType = '';
  activeTab = 'list'; // 'list' or 'add'
  editingId: number | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadConfigurations();
    this.loadVilles();
  }

  loadConfigurations(): void {
    this.isLoading = true;
    this.http.get<any>(`${environment.apiUrl}/configuration`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.configurations = response.data;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading configurations:', error);
        this.showMessage('Erreur lors du chargement des configurations', 'error');
        this.isLoading = false;
      }
    });
  }

  loadVilles(): void {
    this.http.get<any>(`${environment.apiUrl}/configuration/villes`).subscribe({
      next: (response) => {
        if (response.success) {
          this.villes = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading villes:', error);
      }
    });
  }

  saveConfiguration(): void {
    this.isSaving = true;
    const url = this.editingId 
      ? `${environment.apiUrl}/configuration/${this.editingId}`
      : `${environment.apiUrl}/configuration`;
    const method = this.editingId ? 'put' : 'post';
    
    this.http[method](url, this.currentConfiguration).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.showMessage('Configuration sauvegardée avec succès', 'success');
          this.loadConfigurations();
          this.resetForm();
        } else {
          this.showMessage('Erreur lors de la sauvegarde', 'error');
        }
        this.isSaving = false;
      },
      error: (error) => {
        console.error('Error saving configuration:', error);
        this.showMessage('Erreur lors de la sauvegarde de la configuration', 'error');
        this.isSaving = false;
      }
    });
  }

  testConnection(): void {
    this.isTestingConnection = true;
    this.http.post<any>(`${environment.apiUrl}/configuration/test-connection`, this.currentConfiguration).subscribe({
      next: (response) => {
        if (response.success) {
          this.showMessage('Connexion testée avec succès', 'success');
        } else {
          this.showMessage('Échec de la connexion: ' + response.message, 'error');
        }
        this.isTestingConnection = false;
      },
      error: (error) => {
        console.error('Error testing connection:', error);
        this.showMessage('Erreur lors du test de connexion', 'error');
        this.isTestingConnection = false;
      }
    });
  }

  showMessage(text: string, type: 'success' | 'error' | 'info'): void {
    this.message = text;
    this.messageType = type;
    setTimeout(() => {
      this.message = '';
      this.messageType = '';
    }, 5000);
  }

  getMessageClass(): string {
    switch (this.messageType) {
      case 'success':
        return 'bg-green-100 border-green-400 text-green-700';
      case 'error':
        return 'bg-red-100 border-red-400 text-red-700';
      case 'info':
        return 'bg-blue-100 border-blue-400 text-blue-700';
      default:
        return 'bg-gray-100 border-gray-400 text-gray-700';
    }
  }

  // New methods for tab management
  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'add') {
      this.resetForm();
    }
  }

  resetForm(): void {
    this.currentConfiguration = {
      sqlsrv: '',
      database: '',
      trustServerCertificate: 'true',
      biostar_username: '',
      biostar_password: '',
      ville_id: 0
    };
    this.editingId = null;
  }

  editConfiguration(config: Configuration): void {
    this.currentConfiguration = { ...config };
    this.editingId = config.id || null;
    this.activeTab = 'add';
  }

  deleteConfiguration(id: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette configuration ?')) {
      this.http.delete<any>(`${environment.apiUrl}/configuration/${id}`).subscribe({
        next: (response) => {
          if (response.success) {
            this.showMessage('Configuration supprimée avec succès', 'success');
            this.loadConfigurations();
          } else {
            this.showMessage('Erreur lors de la suppression', 'error');
          }
        },
        error: (error) => {
          console.error('Error deleting configuration:', error);
          this.showMessage('Erreur lors de la suppression de la configuration', 'error');
        }
      });
    }
  }

  getVilleName(villeId: number): string {
    const ville = this.villes.find(v => v.id === villeId);
    return ville ? ville.name : 'Ville inconnue';
  }
}
