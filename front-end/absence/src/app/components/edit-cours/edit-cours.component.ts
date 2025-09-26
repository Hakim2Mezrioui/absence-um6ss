import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';
import { SallesService, CreateSalleRequest, Salle } from '../../services/salles.service';
import { NotificationService } from '../../services/notification.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-edit-cours',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './edit-cours.component.html',
  styleUrl: './edit-cours.component.css'
})
export class EditCoursComponent implements OnInit, OnDestroy {
  cours: Partial<Cours> = {
    name: '',
    date: '',
    pointage_start_hour: '',
    heure_debut: '',
    heure_fin: '',
    tolerance: '',
    etablissement_id: 0,
    promotion_id: 0,
    type_cours_id: 0,
    salle_id: 0,
    option_id: undefined,
    ville_id: 0,
    annee_universitaire: ''
  };

  loading = false;
  loadingData = true;
  error = '';
  success = '';
  coursId: number = 0;

  // Dropdown salle state (aligné avec add-cours)
  salleDropdownOpen = false;
  salleSearchTerm = '';
  filteredSalles: any[] = [];

  // Quick add salle modal state
  showAddSalleModal = false;
  newSalleForm: FormGroup;
  
  private destroy$ = new Subject<void>();

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  filteredGroups: any[] = [];
  selectedGroups: number[] = [];
  groupsDropdownOpen = false;
  groupSearchTerm = '';
  villes: any[] = [];

  // Années universitaires
  anneesUniversitaires: string[] = [];

  constructor(
    private coursService: CoursService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private sallesService: SallesService,
    private notificationService: NotificationService
  ) {
    this.newSalleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      batiment: [''],
      etage: [0],
      capacite: [null],
      description: [''],
      etablissement_id: [null, Validators.required]
    });
  }

  ngOnInit() {
    this.coursId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadFilterOptions();
    this.generateAnneesUniversitaires();
    this.loadCours();
    // Fermer dropdown au clic extérieur
    document.addEventListener('click', this.handleDocumentClick, true);
  }

  ngOnDestroy() {
    document.removeEventListener('click', this.handleDocumentClick, true);
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCours() {
    this.loadingData = true;
    this.coursService.getCoursById(this.coursId).subscribe({
      next: (cours) => {
        this.cours = {
          ...cours,
          date: cours.date ? cours.date.split('T')[0] : '', // Format pour input date
          option_id: cours.option_id || undefined
        };
        
        // Charger les groupes sélectionnés
        if (cours.groups && Array.isArray(cours.groups)) {
          this.selectedGroups = cours.groups.map((group: any) => group.id);
        }
        this.loadingData = false;
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement du cours';
        this.loadingData = false;
        console.error('Erreur:', error);
      }
    });
  }

  loadFilterOptions() {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        this.etablissements = options.etablissements || [];
        this.promotions = options.promotions || [];
        this.salles = options.salles || [];
        this.updateFilteredSalles();
        this.typesCours = options.types_cours || [];
        this.options = options.options || [];
        this.groups = options.groups || [];
        this.updateFilteredGroups();
        this.villes = options.villes || [];
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des options';
        console.error('Erreur:', error);
      }
    });
  }

  // Salle dropdown helpers (alignés avec add-cours)
  onSalleSearch(term: string): void {
    this.salleSearchTerm = term || '';
    this.updateFilteredSalles();
  }

  updateFilteredSalles(): void {
    const term = (this.salleSearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredSalles = [...(this.salles || [])];
      return;
    }
    this.filteredSalles = (this.salles || []).filter((s: any) => {
      const name = (s?.name || '').toString().toLowerCase();
      const batiment = (s?.batiment || '').toString().toLowerCase();
      return name.includes(term) || batiment.includes(term);
    });
  }

  trackBySalleId(index: number, salle: any): any {
    return salle?.id || index;
  }

  private handleDocumentClick = (event: Event) => {
    const target = event.target as HTMLElement;
    const dropdown = target.closest('.salle-dropdown');
    const button = target.closest('#salle-dropdown-button-edit');
    if (!dropdown && !button && this.salleDropdownOpen) {
      this.salleDropdownOpen = false;
    }
  }

  getSalleName(id: number | string): string {
    const numericId = Number(id);
    const found = (this.salles || []).find((s: any) => Number(s?.id) === numericId);
    return found?.name || 'Salle sélectionnée';
  }

  selectSalle(salle: any): void {
    if (salle) {
      this.cours.salle_id = salle.id;
    } else {
      this.cours.salle_id = undefined;
    }
    this.salleDropdownOpen = false;
  }

  toggleSalleDropdown(): void {
    this.salleDropdownOpen = !this.salleDropdownOpen;
  }

  closeSalleDropdown(): void {
    this.salleDropdownOpen = false;
  }

  // Groups dropdown helpers
  onGroupSearch(term: string): void {
    this.groupSearchTerm = term || '';
    this.updateFilteredGroups();
  }

  updateFilteredGroups(): void {
    const term = (this.groupSearchTerm || '').trim().toLowerCase();
    if (!term) {
      this.filteredGroups = [...(this.groups || [])];
      return;
    }
    this.filteredGroups = (this.groups || []).filter((g: any) => {
      const name = (g?.name || '').toString().toLowerCase();
      return name.includes(term);
    });
  }

  toggleGroupsDropdown(): void {
    this.groupsDropdownOpen = !this.groupsDropdownOpen;
  }

  isGroupSelected(groupId: number): boolean {
    return this.selectedGroups.includes(groupId);
  }

  toggleGroupSelection(groupId: number): void {
    const index = this.selectedGroups.indexOf(groupId);
    if (index > -1) {
      this.selectedGroups.splice(index, 1);
    } else {
      this.selectedGroups.push(groupId);
    }
  }

  getGroupName(groupId: number): string {
    const group = this.groups.find(g => g.id === groupId);
    return group ? group.name : 'Groupe inconnu';
  }

  openAddSalleModal(): void {
    const etabId = this.cours.etablissement_id || null;
    this.newSalleForm.reset({
      name: '',
      batiment: '',
      etage: 0,
      capacite: null,
      description: '',
      etablissement_id: etabId
    });
    this.showAddSalleModal = true;
  }

  closeAddSalleModal(): void {
    this.showAddSalleModal = false;
  }

  submitNewSalle(): void {
    if (this.newSalleForm.invalid) {
      Object.values(this.newSalleForm.controls).forEach(c => c.markAsTouched());
      return;
    }
    const payload: CreateSalleRequest = {
      name: this.newSalleForm.value.name,
      batiment: this.newSalleForm.value.batiment || '',
      etage: Number(this.newSalleForm.value.etage) || 0,
      etablissement_id: Number(this.newSalleForm.value.etablissement_id),
      capacite: this.newSalleForm.value.capacite ? Number(this.newSalleForm.value.capacite) : undefined,
      description: this.newSalleForm.value.description || undefined
    };

    this.loading = true;
    this.sallesService.createSalle(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const created: Salle = res.salle;
          this.salles = [created, ...this.salles];
          this.updateFilteredSalles();
          this.cours.salle_id = created.id;
          this.notificationService.success('Salle créée', 'La salle a été ajoutée et sélectionnée');
          this.closeAddSalleModal();
          this.loading = false;
        },
        error: (err) => {
          console.error('Error creating salle:', err);
          this.notificationService.error('Erreur', 'Impossible de créer la salle');
          this.loading = false;
        }
      });
  }

  generateAnneesUniversitaires() {
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 5; i++) {
      const year = currentYear - 2 + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Conversion des IDs en nombres
    const coursData = {
      ...this.cours,
      etablissement_id: Number(this.cours.etablissement_id),
      promotion_id: Number(this.cours.promotion_id),
      type_cours_id: Number(this.cours.type_cours_id),
      salle_id: Number(this.cours.salle_id),
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined,
      ville_id: Number(this.cours.ville_id),
      group_ids: this.selectedGroups // Envoyer les groupes sélectionnés
    };

    this.coursService.updateCours(this.coursId, coursData).subscribe({
      next: (response) => {
        this.success = 'Cours modifié avec succès';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/cours']);
        }, 1500);
      },
      error: (error) => {
        this.error = 'Erreur lors de la modification du cours';
        this.loading = false;
        console.error('Erreur:', error);
      }
    });
  }

  validateForm(): boolean {
    if (!this.cours.name?.trim()) {
      this.error = 'Le nom du cours est requis';
      return false;
    }

    if (!this.cours.date) {
      this.error = 'La date est requise';
      return false;
    }

    if (!this.cours.pointage_start_hour) {
      this.error = 'L\'heure de début de pointage est requise';
      return false;
    }

    if (!this.cours.heure_debut) {
      this.error = 'L\'heure de début est requise';
      return false;
    }

    if (!this.cours.heure_fin) {
      this.error = 'L\'heure de fin est requise';
      return false;
    }

    if (!this.cours.tolerance) {
      this.error = 'La tolérance est requise';
      return false;
    }

    if (!this.cours.etablissement_id || this.cours.etablissement_id === 0) {
      this.error = 'L\'établissement est requis';
      return false;
    }

    if (!this.cours.promotion_id || this.cours.promotion_id === 0) {
      this.error = 'La promotion est requise';
      return false;
    }

    if (!this.cours.type_cours_id || this.cours.type_cours_id === 0) {
      this.error = 'Le type de cours est requis';
      return false;
    }

    if (!this.cours.salle_id || this.cours.salle_id === 0) {
      this.error = 'La salle est requise';
      return false;
    }

    // Le groupe est optionnel, pas de validation requise

    if (!this.cours.ville_id || this.cours.ville_id === 0) {
      this.error = 'La ville est requise';
      return false;
    }

    if (!this.cours.annee_universitaire) {
      this.error = 'L\'année universitaire est requise';
      return false;
    }

    // Validation des heures
    if (this.cours.heure_debut && this.cours.heure_fin) {
      if (this.cours.heure_debut >= this.cours.heure_fin) {
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        return false;
      }
    }

    return true;
  }

  onCancel() {
    this.router.navigate(['/dashboard/cours']);
  }

  clearError() {
    this.error = '';
  }

  resetForm() {
    // Recharger les données du cours depuis le serveur
    this.loadCours();
    this.error = '';
    this.success = '';
  }
}
