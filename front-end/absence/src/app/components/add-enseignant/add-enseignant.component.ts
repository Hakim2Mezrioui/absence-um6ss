import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EnseignantService } from '../../services/enseignant.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-add-enseignant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-enseignant.component.html',
  styleUrl: './add-enseignant.component.css'
})
export class AddEnseignantComponent implements OnInit {
  user: any = { 
    first_name: '', 
    last_name: '', 
    email: '', 
    password: '', 
    role_id: null, 
    post_id: null, 
    ville_id: null, 
    etablissement_id: null 
  };
  enseignant: any = { ville_id: null };
  
  // Options pour les listes déroulantes
  roles: any[] = [];
  posts: any[] = [];
  villes: any[] = [];
  etablissements: any[] = [];
  
  // États du formulaire
  isLoading = false;
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  
  private apiBase = environment.apiUrl;

  constructor(
    private service: EnseignantService, 
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadOptions();
  }

  loadOptions(): void {
    this.isLoading = true;
    
    // Charger les options en parallèle
    Promise.all([
      this.loadRoles(),
      this.loadPosts(),
      this.loadVilles(),
      this.loadEtablissements()
    ]).finally(() => {
      this.isLoading = false;
    });
  }

  private loadRoles(): Promise<void> {
    return this.http.get<any>(`${this.apiBase}/roles`).toPromise()
      .then(res => {
        this.roles = res?.roles || [];
      })
      .catch((error) => {
        console.error('Error loading roles:', error);
        this.roles = [];
      }) as Promise<void>;
  }

  private loadPosts(): Promise<void> {
    return this.http.get<any>(`${this.apiBase}/posts`).toPromise()
      .then(res => {
        this.posts = res?.posts || [];
      })
      .catch((error) => {
        console.error('Error loading posts:', error);
        this.posts = [];
      }) as Promise<void>;
  }

  private loadVilles(): Promise<void> {
    return this.http.get<any>(`${this.apiBase}/villes`).toPromise()
      .then(res => {
        this.villes = res?.villes || [];
      })
      .catch((error) => {
        console.error('Error loading villes:', error);
        this.villes = [];
      }) as Promise<void>;
  }

  private loadEtablissements(): Promise<void> {
    return this.http.get<any>(`${this.apiBase}/etablissements`).toPromise()
      .then(res => {
        this.etablissements = res?.etablissements || [];
      })
      .catch((error) => {
        console.error('Error loading etablissements:', error);
        this.etablissements = [];
      }) as Promise<void>;
  }

  submit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.service.createWithUser({ user: this.user, enseignant: this.enseignant }).subscribe({
      next: (response) => {
        this.successMessage = 'Enseignant créé avec succès !';
        this.isSubmitting = false;
        
        // Rediriger après 2 secondes
        setTimeout(() => {
          this.router.navigate(['/dashboard/enseignants']);
        }, 2000);
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la création de l\'enseignant';
        this.isSubmitting = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.user.first_name?.trim()) {
      this.errorMessage = 'Le prénom est requis';
      return false;
    }
    if (!this.user.last_name?.trim()) {
      this.errorMessage = 'Le nom est requis';
      return false;
    }
    if (!this.user.email?.trim()) {
      this.errorMessage = 'L\'email est requis';
      return false;
    }
    if (!this.user.password?.trim()) {
      this.errorMessage = 'Le mot de passe est requis';
      return false;
    }
    if (!this.user.role_id) {
      this.errorMessage = 'Le rôle est requis';
      return false;
    }
    if (!this.user.post_id) {
      this.errorMessage = 'Le poste est requis';
      return false;
    }
    if (!this.user.ville_id) {
      this.errorMessage = 'La ville est requise';
      return false;
    }
    if (!this.enseignant.ville_id) {
      this.errorMessage = 'La ville de l\'enseignant est requise';
      return false;
    }
    return true;
  }

  goBack(): void {
    this.router.navigate(['/dashboard/enseignants']);
  }

  resetForm(): void {
    this.user = { 
      first_name: '', 
      last_name: '', 
      email: '', 
      password: '', 
      role_id: null, 
      post_id: null, 
      ville_id: null, 
      etablissement_id: null 
    };
    this.enseignant = { ville_id: null };
    this.errorMessage = '';
    this.successMessage = '';
  }
}
