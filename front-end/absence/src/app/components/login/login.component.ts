import { Component } from '@angular/core';
import { NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LoadingComponent } from '../loading/loading.component';
import { AuthService, LoginRequest } from '../../services/auth.service';
import { NavigationService } from '../../services/navigation.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, LoadingComponent],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  // Propriétés du formulaire
  email: string = '';
  password: string = '';
  loading: boolean = false;
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private navigationService: NavigationService
  ) {}

  // Méthode de soumission du formulaire
  onSubmit() {
    if (this.email && this.password) {
      this.loading = true;
      this.errorMessage = '';
      
      const credentials: LoginRequest = {
        email: this.email,
        password: this.password
      };

      this.authService.login(credentials).subscribe({
        next: (response) => {
          this.loading = false;
          
          if (response.status === 'success') {
            console.log('Connexion réussie:', response);
            console.log('Utilisateur connecté:', response.user.first_name + ' ' + response.user.last_name);
            console.log('Token stocké dans les cookies');
            
            // Rediriger vers le tableau de bord
            this.navigationService.navigateToDashboard();
          } else {
            this.errorMessage = 'Erreur de connexion inattendue';
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Erreur de connexion:', error);
          
          if (error.status === 401) {
            this.errorMessage = 'Identifiants incorrects';
          } else if (error.status === 422) {
            // Erreur de validation Laravel
            if (error.error && error.error.errors) {
              const errors = error.error.errors;
              if (errors.email) {
                this.errorMessage = errors.email[0];
              } else if (errors.password) {
                this.errorMessage = errors.password[0];
              } else {
                this.errorMessage = 'Données de connexion invalides';
              }
            } else {
              this.errorMessage = 'Données de connexion invalides';
            }
          } else if (error.status === 0) {
            this.errorMessage = 'Impossible de se connecter au serveur';
          } else if (error.status === 500) {
            this.errorMessage = 'Erreur interne du serveur';
          } else {
            this.errorMessage = 'Erreur de connexion au serveur';
          }
        }
      });
    } else {
      this.errorMessage = 'Veuillez remplir tous les champs';
    }
  }

  // Méthode pour réinitialiser le formulaire
  resetForm(form: NgForm) {
    form.resetForm();
    this.email = '';
    this.password = '';
    this.errorMessage = '';
  }

  // Méthode pour effacer le message d'erreur
  clearError() {
    this.errorMessage = '';
  }
}
