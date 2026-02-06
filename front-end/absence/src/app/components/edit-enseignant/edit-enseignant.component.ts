import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { EnseignantService } from '../../services/enseignant.service';
import { AuthService } from '../../services/auth.service';
import { UserContextService } from '../../services/user-context.service';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-edit-enseignant',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-enseignant.component.html',
  styleUrl: './edit-enseignant.component.css'
})
export class EditEnseignantComponent implements OnInit {
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
  
  // ID de l'enseignant à modifier
  enseignantId: number | null = null;
  
  private apiBase = environment.apiUrl;

  constructor(
    private service: EnseignantService, 
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private authService: AuthService,
    private userContextService: UserContextService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeUserContext();
    this.loadEnseignantData();
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

  loadEnseignantData(): void {
    // Récupérer l'ID depuis l'URL
    this.route.params.subscribe(params => {
      this.enseignantId = +params['id'];
      if (this.enseignantId) {
        this.loadEnseignant();
      }
    });
  }

  loadEnseignant(): void {
    if (!this.enseignantId) return;
    
    this.isLoading = true;
    this.service.get(this.enseignantId).subscribe({
      next: (response) => {
        console.log('Enseignant data:', response);
        
        if (response.success && response.data) {
          const enseignantData = response.data;
          
          // Remplir les données utilisateur
          this.user = {
            first_name: enseignantData.user?.first_name || '',
            last_name: enseignantData.user?.last_name || '',
            email: enseignantData.user?.email || '',
            password: '', // Ne pas pré-remplir le mot de passe
            role_id: enseignantData.user?.role_id || 6
          };
          
          // Remplir les données enseignant
          this.enseignant = {
            statut: enseignantData.statut || null
          };
        }
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'enseignant:', error);
        this.toastr.error('Erreur lors du chargement des données de l\'enseignant', 'Erreur');
        this.isLoading = false;
      }
    });
  }

  loadOptions(): void {
    // Plus besoin de charger les villes
  }

  submit(): void {
    if (!this.validateForm()) {
      return;
    }

    this.isSubmitting = true;

    // Préparer les données pour la mise à jour
    const updateData = {
      user: {
        first_name: this.user.first_name,
        last_name: this.user.last_name,
        email: this.user.email,
        // Ne mettre à jour le mot de passe que s'il est fourni
        ...(this.user.password && { password: this.user.password })
      },
      enseignant: {
        statut: this.enseignant.statut || null
      }
    };

    this.service.updateWithUser(this.enseignantId!, updateData).subscribe({
      next: (response) => {
        this.toastr.success('Enseignant modifié avec succès !', 'Succès');
        this.isSubmitting = false;
        
        // Rediriger après 1.5 secondes
        setTimeout(() => {
          this.router.navigate(['/enseignants']);
        }, 1500);
      },
      error: (error) => {
        console.error('Erreur lors de la modification:', error);
        this.toastr.error(error.error?.message || 'Erreur lors de la modification de l\'enseignant', 'Erreur');
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
    return true;
  }

  goBack(): void {
    this.router.navigate(['/enseignants']);
  }

  resetForm(): void {
    // Recharger les données originales
    this.loadEnseignant();
    this.toastr.info('Formulaire réinitialisé', 'Information');
  }
}
