import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';

@Component({
  selector: 'app-edit-cours',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-cours.component.html',
  styleUrl: './edit-cours.component.css'
})
export class EditCoursComponent implements OnInit {
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
    annee_universitaire: '',
    statut_temporel: 'futur'
  };

  loading = false;
  loadingData = true;
  error = '';
  success = '';
  coursId: number = 0;

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  options: any[] = [];

  // Années universitaires
  anneesUniversitaires: string[] = [];

  constructor(
    private coursService: CoursService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    this.coursId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadFilterOptions();
    this.generateAnneesUniversitaires();
    this.loadCours();
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
        this.typesCours = options.types_cours || [];
        this.options = options.options || [];
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des options';
        console.error('Erreur:', error);
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
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined
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
