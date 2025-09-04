import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { ExamensService, Examen } from '../../services/examens.service';
import { NotificationService } from '../../services/notification.service';
import { TypesExamenService, TypeExamen } from '../../services/types-examen.service';
import { Subject, takeUntil, switchMap } from 'rxjs';

@Component({
  selector: 'app-edit-examen',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule, RouterModule],
  templateUrl: './edit-examen.component.html',
  styleUrl: './edit-examen.component.css'
})
export class EditExamenComponent implements OnInit, OnDestroy {
  examen: Examen | null = null;
  
  examenForm: FormGroup;
  loading = false;
  error = '';
  
  // Options de formulaire
  etablissements: any[] = [];
  promotions: any[] = [];
  salles: any[] = [];
  options: any[] = [];
  typesExamen: TypeExamen[] = [];
  
  private destroy$ = new Subject<void>();

  constructor(
    private examensService: ExamensService,
    private notificationService: NotificationService,
    private fb: FormBuilder,
    private typesExamenService: TypesExamenService,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.examenForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required],
      type_examen_id: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      promotion_id: ['', Validators.required],
      option_id: [''],
      salle_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    console.log('🎯 EditExamenComponent initialisé');
    
    this.loadFilterOptions();
    this.loadTypesExamen();
    
    // Récupérer l'examen depuis l'URL
    this.route.params.pipe(
      switchMap(params => {
        const id = +params['id'];
        console.log('🆔 ID de l\'examen à récupérer:', id);
        console.log('🔗 URL de l\'API:', `${this.examensService['apiUrl']}/${id}`);
        
        return this.examensService.getExamen(id);
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Réponse reçue du backend:', response);
        
        // Extraire l'examen de la réponse
        if (response && response.examen) {
          this.examen = response.examen;
          console.log('✅ Examen extrait avec succès:', this.examen);
          this.populateForm();
        } else if (response && response.id) {
          // Si la réponse est directement l'examen (fallback)
          this.examen = response;
          console.log('✅ Examen reçu directement:', this.examen);
          this.populateForm();
        } else {
          console.error('❌ Structure de réponse inattendue:', response);
          this.error = 'Structure de réponse inattendue du serveur';
        }
      },
      error: (err) => {
        console.error('❌ Erreur lors du chargement de l\'examen:', err);
        console.error('📊 Détails de l\'erreur:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url
        });
        
        this.error = `Erreur lors du chargement de l'examen (${err.status || 'Unknown'})`;
        
        // Rediriger vers la liste des examens après un délai
        setTimeout(() => {
          this.router.navigate(['/dashboard/examens']);
        }, 3000);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  populateForm(): void {
    console.log('📝 Tentative de remplissage du formulaire');
    console.log('📊 Examen à utiliser:', this.examen);
    
    if (this.examen) {
      console.log('✅ Examen trouvé, remplissage du formulaire...');
      
      // Formater les dates et heures pour le formulaire
      const formatDate = (dateString: string) => {
        if (!dateString) return '';
        // Extraire la date YYYY-MM-DD du format ISO
        return dateString.split('T')[0];
      };
      
      const formatTime = (timeString: string) => {
        if (!timeString) return '';
        // Extraire l'heure HH:MM du format ISO
        return timeString.split('T')[1].substring(0, 5);
      };
      
      const formValues = {
        title: this.examen.title || '',
        date: formatDate(this.examen.date),
        heure_debut: formatTime(this.examen.heure_debut),
        heure_fin: formatTime(this.examen.heure_fin),
        type_examen_id: this.examen.type_examen_id || '',
        etablissement_id: this.examen.etablissement_id || '',
        promotion_id: this.examen.promotion_id || '',
        option_id: this.examen.option_id || '',
        salle_id: this.examen.salle_id || '',
        annee_universitaire: this.examen.annee_universitaire || ''
      };
      
      console.log('📋 Valeurs brutes de l\'examen:', {
        date: this.examen.date,
        heure_debut: this.examen.heure_debut,
        heure_fin: this.examen.heure_fin
      });
      
      console.log('📋 Valeurs formatées pour le formulaire:', formValues);
      
      this.examenForm.patchValue(formValues);
      
      console.log('✅ Formulaire rempli avec succès');
      console.log('📊 État du formulaire après remplissage:', this.examenForm.value);
    } else {
      console.error('❌ Aucun examen disponible pour remplir le formulaire');
      this.error = 'Aucun examen à modifier';
    }
  }

  loadFilterOptions(): void {
    console.log('🔧 Chargement des options de filtre...');
    
    this.examensService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Options de filtre reçues:', response);
          
          this.etablissements = response.etablissements || [];
          this.promotions = response.promotions || [];
          this.salles = response.salles || [];
          this.options = response.options || [];
          
          console.log('📊 Options chargées:', {
            etablissements: this.etablissements.length,
            promotions: this.promotions.length,
            salles: this.salles.length,
            options: this.options.length
          });
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des options de filtre:', err);
          this.error = 'Erreur lors du chargement des options';
        }
      });
  }

  loadTypesExamen(): void {
    this.typesExamenService.getTypesExamenPaginated(1, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.typesExamen = response.data || [];
        },
        error: (err) => {
          console.error('Error loading types examen:', err);
          this.error = 'Erreur lors du chargement des types d\'examen';
        }
      });
  }

  onSubmit(): void {
    if (this.examenForm.valid && this.examen) {
      this.loading = true;
      this.error = '';

      const formData = this.examenForm.value;
      
      // Validation de la date et heure
      if (formData.heure_fin <= formData.heure_debut) {
        this.error = 'L\'heure de fin doit être postérieure à l\'heure de début';
        this.loading = false;
        return;
      }

      this.examensService.updateExamen(this.examen.id, formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Succès', 'Examen modifié avec succès');
            this.loading = false;
            // Rediriger vers la liste des examens
            this.router.navigate(['/dashboard/examens']);
          },
          error: (err) => {
            this.error = 'Erreur lors de la modification de l\'examen';
            console.error('Error updating examen:', err);
            this.loading = false;
          }
        });
    } else {
      this.markFormGroupTouched();
    }
  }

  resetForm(): void {
    if (this.examen) {
      this.populateForm();
    } else {
      this.examenForm.reset();
    }
    this.error = '';
  }

  markFormGroupTouched(): void {
    Object.keys(this.examenForm.controls).forEach(key => {
      const control = this.examenForm.get(key);
      control?.markAsTouched();
    });
  }

  getErrorMessage(controlName: string): string {
    const control = this.examenForm.get(controlName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
    }
    return '';
  }

  isFieldInvalid(controlName: string): boolean {
    const control = this.examenForm.get(controlName);
    return !!(control?.invalid && control.touched);
  }
}
