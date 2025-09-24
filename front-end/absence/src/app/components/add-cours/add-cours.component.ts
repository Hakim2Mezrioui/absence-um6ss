import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CoursService, Cours } from '../../services/cours.service';

@Component({
  selector: 'app-add-cours',
  imports: [CommonModule, FormsModule],
  templateUrl: './add-cours.component.html',
  styleUrl: './add-cours.component.css'
})
export class AddCoursComponent implements OnInit {
  cours: Partial<Cours> = {
    name: '',
    date: '',
    pointage_start_hour: '',
    heure_debut: '',
    heure_fin: '',
    tolerance: '00:15', // Valeur par défaut en format time
    etablissement_id: 0,
    promotion_id: 0,
    type_cours_id: 0,
    salle_id: 0,
    option_id: undefined,
    group_id: undefined,
    ville_id: 0,
    annee_universitaire: '' // Sera défini dans generateAnneesUniversitaires()
  };

  // Propriété pour gérer la tolérance en minutes dans le formulaire
  toleranceMinutes: number = 15;

  loading = false;
  error = '';
  success = '';

  // Options pour les formulaires
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  typesCours: any[] = [];
  options: any[] = [];
  groups: any[] = [];
  villes: any[] = [];

  // Années universitaires
  anneesUniversitaires: string[] = [];

  constructor(
    private coursService: CoursService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadFilterOptions();
    this.generateAnneesUniversitaires();
  }

  loadFilterOptions() {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        this.etablissements = options.etablissements || [];
        this.promotions = options.promotions || [];
        this.salles = options.salles || [];
        this.typesCours = options.types_cours || [];
        this.options = options.options || [];
        this.groups = options.groups || [];
        this.villes = options.villes || [];
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des options';
        console.error('Erreur:', error);
      }
    });
  }

  generateAnneesUniversitaires() {
    const currentYear = new Date().getFullYear();
    
    // Générer 5 années avant et 5 années après l'année actuelle
    for (let i = -5; i <= 5; i++) {
      const year = currentYear + i;
      this.anneesUniversitaires.push(`${year}-${year + 1}`);
    }
    
    // Trier les années par ordre décroissant (plus récentes en premier)
    this.anneesUniversitaires.sort((a, b) => {
      const yearA = parseInt(a.split('-')[0]);
      const yearB = parseInt(b.split('-')[0]);
      return yearB - yearA;
    });
    
    // Sélectionner l'année actuelle par défaut
    this.cours.annee_universitaire = `${currentYear}-${currentYear + 1}`;
  }

  onSubmit() {
    if (!this.validateForm()) {
      return;
    }

    this.loading = true;
    this.error = '';
    this.success = '';

    // Conversion des IDs en nombres et de la tolérance en format time
    const coursData = {
      ...this.cours,
      etablissement_id: Number(this.cours.etablissement_id),
      promotion_id: Number(this.cours.promotion_id),
      type_cours_id: Number(this.cours.type_cours_id),
      salle_id: Number(this.cours.salle_id),
      option_id: this.cours.option_id ? Number(this.cours.option_id) : undefined,
      group_id: this.cours.group_id ? Number(this.cours.group_id) : undefined,
      ville_id: Number(this.cours.ville_id),
      tolerance: this.formatToleranceToTime(this.toleranceMinutes)
    };

    this.coursService.createCours(coursData).subscribe({
      next: (response) => {
        this.success = 'Cours créé avec succès';
        this.loading = false;
        setTimeout(() => {
          this.router.navigate(['/dashboard/cours']);
        }, 1500);
      },
      error: (error) => {
        this.error = 'Erreur lors de la création du cours';
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

    if (!this.toleranceMinutes || this.toleranceMinutes <= 0) {
      this.error = 'La tolérance en minutes est requise (minimum 1 minute)';
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
    const currentYear = new Date().getFullYear();
    
    this.cours = {
      name: '',
      date: '',
      pointage_start_hour: '',
      heure_debut: '',
      heure_fin: '',
      tolerance: '00:15',
      etablissement_id: 0,
      promotion_id: 0,
      type_cours_id: 0,
      salle_id: 0,
      option_id: undefined,
      group_id: undefined,
      ville_id: 0,
      annee_universitaire: `${currentYear}-${currentYear + 1}`
    };
    this.toleranceMinutes = 15;
    this.error = '';
    this.success = '';
  }

  /**
   * Calculer l'heure limite de pointage (heure de début + tolérance)
   */
  calculatePointageEndTime(): string {
    if (!this.cours.heure_debut || !this.toleranceMinutes) {
      return '';
    }

    try {
      const [hours, minutes] = this.cours.heure_debut.split(':').map(Number);
      
      // Ajouter la tolérance en minutes
      const totalMinutes = hours * 60 + minutes + this.toleranceMinutes;
      
      // Calculer les nouvelles heures et minutes
      const newHours = Math.floor(totalMinutes / 60);
      const newMinutes = totalMinutes % 60;
      
      // Formater l'heure
      return `${newHours.toString().padStart(2, '0')}:${newMinutes.toString().padStart(2, '0')}`;
    } catch (error) {
      return '';
    }
  }

  /**
   * Mettre à jour l'heure de pointage automatiquement
   */
  onHeureDebutChange() {
    // L'heure de pointage reste indépendante de l'heure de début
    // L'utilisateur peut la définir manuellement
  }

  /**
   * Mettre à jour l'heure de pointage quand la tolérance change
   */
  onToleranceChange() {
    // L'heure de pointage reste indépendante de la tolérance
    // L'utilisateur peut la définir manuellement
  }

  /**
   * Convertir la tolérance en minutes vers le format time (HH:MM)
   */
  formatToleranceToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}
