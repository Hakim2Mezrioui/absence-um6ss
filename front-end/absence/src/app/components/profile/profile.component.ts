import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { ProfileService, UserProfile } from '../../services/profile.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  userProfile: UserProfile | null = null;
  isLoading = true;
  isEditing = false;
  editMode: 'basic' | 'preferences' | 'password' = 'basic';
  
  // Form data
  editForm = {
    first_name: '',
    last_name: '',
    email: '',
    department: '',
    position: '',
    preferences: {
      language: 'fr',
      theme: 'light',
      notifications: true
    }
  };

  passwordForm = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };

  // Avatar upload
  selectedFile: File | null = null;
  avatarPreview: string | null = null;

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadUserProfile(): void {
    // Récupérer le profil de l'utilisateur connecté depuis les cookies
    this.profileService.getUserProfile()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profile) => {
          if (profile) {
            this.userProfile = profile;
            this.populateEditForm();
          } else {
            console.warn('Aucun utilisateur authentifié trouvé');
            this.userProfile = null;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du profil:', error);
          this.userProfile = null;
          this.isLoading = false;
        }
      });
  }

  populateEditForm(): void {
    if (this.userProfile) {
      this.editForm = {
        first_name: this.userProfile.first_name || '',
        last_name: this.userProfile.last_name || '',
        email: this.userProfile.email || '',
        department: this.userProfile.etablissement?.name || '',
        position: this.userProfile.post?.name || '',
        preferences: {
          language: this.userProfile.preferences?.language || 'fr',
          theme: this.userProfile.preferences?.theme || 'light',
          notifications: this.userProfile.preferences?.notifications ?? true
        }
      };
    }
  }

  startEdit(mode: 'basic' | 'preferences' | 'password'): void {
    this.editMode = mode;
    this.isEditing = true;
    this.populateEditForm();
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.editMode = 'basic';
    this.selectedFile = null;
    this.avatarPreview = null;
    this.populateEditForm();
  }

  saveProfile(): void {
    if (!this.userProfile) return;

    const updateData = {
      first_name: this.editForm.first_name,
      last_name: this.editForm.last_name,
      email: this.editForm.email,
      department: this.editForm.department,
      position: this.editForm.position,
      preferences: this.editForm.preferences
    };

    this.profileService.updateUserProfile(updateData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedProfile) => {
          this.userProfile = updatedProfile;
          this.isEditing = false;
          this.editMode = 'basic';
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour:', error);
        }
      });
  }

  changePassword(): void {
    if (!this.userProfile) return;

    if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    this.profileService.changePassword(this.passwordForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('Mot de passe modifié avec succès');
          this.passwordForm = {
            current_password: '',
            new_password: '',
            confirm_password: ''
          };
          this.isEditing = false;
        },
        error: (error) => {
          console.error('Erreur lors du changement de mot de passe:', error);
          alert('Erreur lors du changement de mot de passe');
        }
      });
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      
      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.avatarPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadAvatar(): void {
    if (!this.selectedFile || !this.userProfile) return;

    this.profileService.uploadAvatar(this.selectedFile)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (this.userProfile) {
            this.userProfile.avatar = response.avatar_url;
          }
          this.selectedFile = null;
          this.avatarPreview = null;
        },
        error: (error) => {
          console.error('Erreur lors de l\'upload:', error);
          alert('Erreur lors de l\'upload de l\'avatar');
        }
      });
  }

  getFullName(): string {
    return this.userProfile ? this.profileService.getFullName(this.userProfile) : '';
  }

  getInitials(): string {
    return this.userProfile ? this.profileService.getInitials(this.userProfile) : '';
  }

  formatDate(dateString: string): string {
    return this.profileService.formatDate(dateString);
  }

  formatDateTime(dateString: string): string {
    return this.profileService.formatDateTime(dateString);
  }

  getStatusClass(): string {
    return this.userProfile ? this.profileService.getStatusClass(this.userProfile.status) : '';
  }

  getStatusText(): string {
    return this.userProfile ? this.profileService.getStatusText(this.userProfile.status) : '';
  }

  hasPermission(permission: string): boolean {
    return this.profileService.hasPermission(permission);
  }

  getRoleName(): string {
    return this.userProfile ? this.profileService.getRoleName(this.userProfile) : '';
  }

  getPostName(): string {
    return this.userProfile ? this.profileService.getPostName(this.userProfile) : '';
  }

  getEtablissementName(): string {
    return this.userProfile ? this.profileService.getEtablissementName(this.userProfile) : '';
  }
}
