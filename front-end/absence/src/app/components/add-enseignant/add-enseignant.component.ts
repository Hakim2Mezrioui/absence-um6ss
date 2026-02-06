import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EnseignantService } from '../../services/enseignant.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { ToastrService } from 'ngx-toastr';
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
    role_id: 6 // Rôle enseignant par défaut (non modifiable)
  };
  enseignant: any = {};
  
  // États du formulaire
  isLoading = false;
  isSubmitting = false;
  
  // Contexte utilisateur
  currentUser: any = null;
  userContext: any = null;
  isSuperAdmin = false;
  
  private apiBase = environment.apiUrl;

  constructor(
    private service: EnseignantService, 
    private router: Router,
    private http: HttpClient,
    private authService: AuthService,
    private userContextService: UserContextService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeUserContext();
    this.loadOptions();
  }

  initializeUserContext(): void {
    // Récupérer l'utilisateur actuel
    this.currentUser = this.authService.getCurrentUser();
    
    // Récupérer le contexte utilisateur
    this.userContext = this.userContextService.getCurrentUserContext();
    
    if (this.currentUser) {
      // Déterminer le rôle utilisateur
      this.isSuperAdmin = this.currentUser.role_id === 1; // Super Admin
    }
  }

  loadOptions(): void {
    // Plus besoin de charger les villes
  }

  submit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    this.service.createWithUser({ user: this.user, enseignant: this.enseignant }).subscribe({
      next: (response) => {
        this.toastr.success('Enseignant créé avec succès !', 'Succès');
        this.isSubmitting = false;
        
        // Rediriger après 1.5 secondes
        setTimeout(() => {
          this.router.navigate(['/enseignants']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.toastr.error(error.error?.message || 'Erreur lors de la création de l\'enseignant', 'Erreur');
        this.isSubmitting = false;
      }
    });
  }

  private validateForm(): boolean {
    if (!this.user.first_name?.trim()) {
      this.toastr.warning('Le prénom est requis', 'Validation');
      return false;
    }
    if (!this.user.last_name?.trim()) {
      this.toastr.warning('Le nom est requis', 'Validation');
      return false;
    }
    if (!this.user.email?.trim()) {
      this.toastr.warning('L\'email est requis', 'Validation');
      return false;
    }
    if (!this.user.password?.trim()) {
      this.toastr.warning('Le mot de passe est requis', 'Validation');
      return false;
    }
    return true;
  }

  goBack(): void {
    this.router.navigate(['/enseignants']);
  }

  resetForm(): void {
    this.user = { 
      first_name: '', 
      last_name: '', 
      email: '', 
      password: '', 
      role_id: 6 // Rôle enseignant par défaut
    };
    this.enseignant = {};
    
    this.toastr.info('Formulaire réinitialisé', 'Information');
  }
}
