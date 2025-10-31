import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

interface User {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  role_id: number;
  role?: {
    id: number;
    name: string;
  };
  etablissement_id?: number;
  etablissement?: {
    id: number;
    name: string;
  };
  ville_id?: number;
  ville?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
}

interface Etablissement {
  id: number;
  name: string;
}

interface Ville {
  id: number;
  name: string;
}

interface FormOptions {
  roles: Role[];
  etablissements: Etablissement[];
  villes: Ville[];
}

@Component({
  selector: 'app-user-management',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrl: './user-management.component.css'
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  allUsers: User[] = []; // Tous les utilisateurs chargés une seule fois
  formOptions: FormOptions = {
    roles: [],
    etablissements: [],
    villes: []
  };
  
  // Pagination côté frontend
  currentPage = 1;
  itemsPerPage = 15;
  totalItems = 0;
  totalPages = 0;
  
  // Filtres et recherche
  searchTerm = '';
  selectedRoleId: number | string | null = '';
  selectedEtablissementId: number | string | null = '';
  selectedVilleId: number | string | null = '';
  
  // États de l'interface
  isLoading = false;
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showChangePasswordModal = false;
  selectedUser: User | null = null;
  
  // Formulaire
  userForm = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role_id: 0,
    etablissement_id: '' as string | number | null,
    ville_id: '' as string | number | null
  };
  
  // Messages
  successMessage = '';
  errorMessage = '';
  
  // Formulaire de changement de mot de passe
  passwordForm = {
    new_password: '',
    confirm_password: ''
  };
  
  private apiUrl = 'http://10.0.244.100:8000/api';

  constructor(
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadFormOptions();
  }

  // Token headers are attached globally by the TokenInterceptor

  loadUsers(): void {
    this.isLoading = true;
    
    // Charger tous les utilisateurs sans pagination côté serveur
    this.http.get<any>(`${this.apiUrl}/user-management?per_page=1000`).subscribe({
      next: (response) => {
        this.allUsers = response.data.data;
        this.applyFilters(); // Appliquer les filtres côté frontend
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.errorMessage = 'Erreur lors du chargement des utilisateurs';
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.allUsers];

    // Filtrage par terme de recherche
    if (this.searchTerm && this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        (user.role?.name && user.role.name.toLowerCase().includes(searchLower)) ||
        (user.etablissement?.name && user.etablissement.name.toLowerCase().includes(searchLower)) ||
        (user.ville?.name && user.ville.name.toLowerCase().includes(searchLower))
      );
    }

    // Filtrage par rôle
    if (this.selectedRoleId !== null && this.selectedRoleId !== undefined && this.selectedRoleId !== '') {
      const roleId = typeof this.selectedRoleId === 'string' ? parseInt(this.selectedRoleId) : this.selectedRoleId;
      filtered = filtered.filter(user => user.role_id === roleId);
    }

    // Filtrage par établissement
    if (this.selectedEtablissementId !== null && this.selectedEtablissementId !== undefined && this.selectedEtablissementId !== '') {
      const etablissementId = typeof this.selectedEtablissementId === 'string' ? parseInt(this.selectedEtablissementId) : this.selectedEtablissementId;
      filtered = filtered.filter(user => user.etablissement_id === etablissementId);
    }

    // Filtrage par ville
    if (this.selectedVilleId !== null && this.selectedVilleId !== undefined && this.selectedVilleId !== '') {
      const villeId = typeof this.selectedVilleId === 'string' ? parseInt(this.selectedVilleId) : this.selectedVilleId;
      filtered = filtered.filter(user => user.ville_id === villeId);
    }

    this.filteredUsers = filtered;
    this.updatePagination();
  }

  updatePagination(): void {
    this.totalItems = this.filteredUsers.length;
    this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
    
    // S'assurer que la page actuelle est valide
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    }
    
    // Calculer les utilisateurs à afficher pour la page actuelle
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.users = this.filteredUsers.slice(startIndex, endIndex);
  }

  loadFormOptions(): void {
    this.http.get<any>(`${this.apiUrl}/user-management/form-options`).subscribe({
      next: (response) => {
        this.formOptions = response.data;
        // Charger les utilisateurs après avoir chargé les options
        this.loadUsers();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des options:', error);
        // Charger les utilisateurs même en cas d'erreur
        this.loadUsers();
      }
    });
  }

  searchUsers(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.selectedRoleId = '';
    this.selectedEtablissementId = '';
    this.selectedVilleId = '';
    this.currentPage = 1;
    this.applyFilters();
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.applyFilters();
  }

  openCreateModal(): void {
    this.userForm = {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      role_id: 0,
      etablissement_id: '',
      ville_id: ''
    };
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(user: User): void {
    this.selectedUser = user;
    this.userForm = {
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      password: '',
      role_id: user.role_id,
      etablissement_id: user.etablissement_id || '',
      ville_id: user.ville_id || ''
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openDeleteModal(user: User): void {
    this.selectedUser = user;
    this.showDeleteModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openChangePasswordModal(user: User): void {
    this.selectedUser = user;
    this.passwordForm = {
      new_password: '',
      confirm_password: ''
    };
    this.showChangePasswordModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDeleteModal = false;
    this.showChangePasswordModal = false;
    this.selectedUser = null;
    this.errorMessage = '';
    this.successMessage = '';
  }

  createUser(): void {
    if (!this.validateForm()) return;

    const createData = { ...this.userForm };
    // Convertir les chaînes vides en null pour les champs optionnels
    if (createData.etablissement_id === '') {
      createData.etablissement_id = null;
    }
    if (createData.ville_id === '') {
      createData.ville_id = null;
    }

    this.isLoading = true;
    this.http.post<any>(`${this.apiUrl}/user-management`, createData).subscribe({
      next: (response) => {
        this.successMessage = 'Utilisateur créé avec succès';
        this.closeModals();
        this.loadUsers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la création de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  updateUser(): void {
    if (!this.validateForm() || !this.selectedUser) return;

    const updateData = { ...this.userForm };
    // Ne pas inclure le mot de passe dans la mise à jour normale
    delete (updateData as any).password;
    
    // Convertir les chaînes vides en null pour les champs optionnels
    if (updateData.etablissement_id === '') {
      updateData.etablissement_id = null;
    }
    if (updateData.ville_id === '') {
      updateData.ville_id = null;
    }

    this.isLoading = true;
    this.http.put<any>(`${this.apiUrl}/user-management/${this.selectedUser.id}`, updateData).subscribe({
      next: (response) => {
        this.successMessage = 'Utilisateur mis à jour avec succès';
        this.closeModals();
        this.loadUsers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la mise à jour de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  deleteUser(): void {
    if (!this.selectedUser) return;

    this.isLoading = true;
    this.http.delete<any>(`${this.apiUrl}/user-management/${this.selectedUser.id}`).subscribe({
      next: (response) => {
        this.successMessage = 'Utilisateur supprimé avec succès';
        this.closeModals();
        this.loadUsers();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.errorMessage = error.error?.message || 'Erreur lors de la suppression de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  changePassword(): void {
    if (!this.validatePasswordForm() || !this.selectedUser) return;

    this.isLoading = true;
    this.http.put<any>(`${this.apiUrl}/user-management/${this.selectedUser.id}`, {
      password: this.passwordForm.new_password
    }).subscribe({
      next: (response) => {
        this.successMessage = 'Mot de passe modifié avec succès';
        this.closeModals();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du changement de mot de passe:', error);
        this.errorMessage = error.error?.message || 'Erreur lors du changement de mot de passe';
        this.isLoading = false;
      }
    });
  }

  private validatePasswordForm(): boolean {
    if (!this.passwordForm.new_password.trim()) {
      this.errorMessage = 'Le nouveau mot de passe est requis';
      return false;
    }
    if (this.passwordForm.new_password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return false;
    }
    if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
      this.errorMessage = 'Les mots de passe ne correspondent pas';
      return false;
    }
    return true;
  }

  private validateForm(): boolean {
    if (!this.userForm.first_name.trim()) {
      this.errorMessage = 'Le prénom est requis';
      return false;
    }
    if (!this.userForm.last_name.trim()) {
      this.errorMessage = 'Le nom est requis';
      return false;
    }
    if (!this.userForm.email.trim()) {
      this.errorMessage = 'L\'email est requis';
      return false;
    }
    if (!this.userForm.password.trim() && this.showCreateModal) {
      this.errorMessage = 'Le mot de passe est requis';
      return false;
    }
    if (!this.userForm.role_id) {
      this.errorMessage = 'Le rôle est requis';
      return false;
    }
    return true;
  }

  getRoleName(roleId: number): string {
    const role = this.formOptions.roles.find(r => r.id === roleId);
    return role ? role.name : 'Non défini';
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  getMaxItems(): number {
    return Math.min(this.currentPage * this.itemsPerPage, this.totalItems);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}
