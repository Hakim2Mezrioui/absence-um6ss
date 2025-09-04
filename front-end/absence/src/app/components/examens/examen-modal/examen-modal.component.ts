import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { Examen } from '../../../services/examens.service';

@Component({
  selector: 'app-examen-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Modal Overlay -->
    <div class="modal-overlay" (click)="onOverlayClick($event)">
      <!-- Modal Content -->
      <div class="modal-content" [@slideIn]>
        <!-- Modal Header -->
        <div class="modal-header">
          <h2 class="modal-title">
            {{ isEditMode ? 'Modifier l\'examen' : 'Ajouter un examen' }}
          </h2>
          <button 
            class="modal-close"
            (click)="onClose()"
            type="button"
          >
            <span class="material-icons">close</span>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body">
          <form [formGroup]="examenForm" (ngSubmit)="onSubmit()">
            <!-- Titre -->
            <div class="form-group">
              <label for="title" class="form-label">Titre de l'examen *</label>
              <input
                id="title"
                type="text"
                formControlName="title"
                class="form-input"
                [class.form-input-error]="isFieldInvalid('title')"
                placeholder="Entrez le titre de l'examen"
              >
              <div *ngIf="isFieldInvalid('title')" class="form-error">
                {{ getFieldError('title') }}
              </div>
            </div>

            <!-- Date et Heures -->
            <div class="form-row">
              <div class="form-group">
                <label for="date" class="form-label">Date *</label>
                <input
                  id="date"
                  type="date"
                  formControlName="date"
                  class="form-input"
                  [class.form-input-error]="isFieldInvalid('date')"
                >
                <div *ngIf="isFieldInvalid('date')" class="form-error">
                  {{ getFieldError('date') }}
                </div>
              </div>

              <div class="form-group">
                <label for="heure_debut" class="form-label">Heure de début *</label>
                <input
                  id="heure_debut"
                  type="time"
                  formControlName="heure_debut"
                  class="form-input"
                  [class.form-input-error]="isFieldInvalid('heure_debut')"
                >
                <div *ngIf="isFieldInvalid('heure_debut')" class="form-error">
                  {{ getFieldError('heure_debut') }}
                </div>
              </div>

              <div class="form-group">
                <label for="heure_fin" class="form-label">Heure de fin *</label>
                <input
                  id="heure_fin"
                  type="time"
                  formControlName="heure_fin"
                  class="form-input"
                  [class.form-input-error]="isFieldInvalid('heure_fin')"
                >
                <div *ngIf="isFieldInvalid('heure_fin')" class="form-error">
                  {{ getFieldError('heure_fin') }}
                </div>
              </div>
            </div>

            <!-- Établissement et Promotion -->
            <div class="form-row">
              <div class="form-group">
                <label for="etablissement_id" class="form-label">Établissement *</label>
                <select
                  id="etablissement_id"
                  formControlName="etablissement_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('etablissement_id')"
                >
                  <option value="">Sélectionnez un établissement</option>
                  <option *ngFor="let etab of etablissements" [value]="etab.id">
                    {{ etab.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('etablissement_id')" class="form-error">
                  {{ getFieldError('etablissement_id') }}
                </div>
              </div>

              <div class="form-group">
                <label for="promotion_id" class="form-label">Promotion *</label>
                <select
                  id="promotion_id"
                  formControlName="promotion_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('promotion_id')"
                >
                  <option value="">Sélectionnez une promotion</option>
                  <option *ngFor="let promo of promotions" [value]="promo.id">
                    {{ promo.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('promotion_id')" class="form-error">
                  {{ getFieldError('promotion_id') }}
                </div>
              </div>
            </div>

            <!-- Option et Salle -->
            <div class="form-row">
              <div class="form-group">
                <label for="option_id" class="form-label">Option *</label>
                <select
                  id="option_id"
                  formControlName="option_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('option_id')"
                >
                  <option value="">Sélectionnez une option</option>
                  <option *ngFor="let opt of options" [value]="opt.id">
                    {{ opt.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('option_id')" class="form-error">
                  {{ getFieldError('option_id') }}
                </div>
              </div>

              <div class="form-group">
                <label for="salle_id" class="form-label">Salle *</label>
                <select
                  id="salle_id"
                  formControlName="salle_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('salle_id')"
                >
                  <option value="">Sélectionnez une salle</option>
                  <option *ngFor="let salle of salles" [value]="salle.id">
                    {{ salle.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('salle_id')" class="form-error">
                  {{ getFieldError('salle_id') }}
                </div>
              </div>
            </div>

            <!-- Type d'examen et Année universitaire -->
            <div class="form-row">
              <div class="form-group">
                <label for="type_examen_id" class="form-label">Type d'examen *</label>
                <select
                  id="type_examen_id"
                  formControlName="type_examen_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('type_examen_id')"
                >
                  <option value="">Sélectionnez un type</option>
                  <option *ngFor="let type of typesExamen" [value]="type.id">
                    {{ type.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('type_examen_id')" class="form-error">
                  {{ getFieldError('type_examen_id') }}
                </div>
              </div>

              <div class="form-group">
                <label for="annee_universitaire" class="form-label">Année universitaire *</label>
                <input
                  id="annee_universitaire"
                  type="text"
                  formControlName="annee_universitaire"
                  class="form-input"
                  [class.form-input-error]="isFieldInvalid('annee_universitaire')"
                  placeholder="ex: 2023-2024"
                >
                <div *ngIf="isFieldInvalid('annee_universitaire')" class="form-error">
                  {{ getFieldError('annee_universitaire') }}
                </div>
              </div>
            </div>

            <!-- Groupe et Ville -->
            <div class="form-row">
              <div class="form-group">
                <label for="group_id" class="form-label">Groupe *</label>
                <select
                  id="group_id"
                  formControlName="group_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('group_id')"
                >
                  <option value="">Sélectionnez un groupe</option>
                  <option *ngFor="let group of groups" [value]="group.id">
                    {{ group.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('group_id')" class="form-error">
                  {{ getFieldError('group_id') }}
                </div>
              </div>

              <div class="form-group">
                <label for="ville_id" class="form-label">Ville *</label>
                <select
                  id="ville_id"
                  formControlName="ville_id"
                  class="form-select"
                  [class.form-select-error]="isFieldInvalid('ville_id')"
                >
                  <option value="">Sélectionnez une ville</option>
                  <option *ngFor="let ville of villes" [value]="ville.id">
                    {{ ville.name }}
                  </option>
                </select>
                <div *ngIf="isFieldInvalid('ville_id')" class="form-error">
                  {{ getFieldError('ville_id') }}
                </div>
              </div>
            </div>


            <!-- Error Message -->
            <div *ngIf="error" class="form-error-global">
              {{ error }}
            </div>

            <!-- Form Actions -->
            <div class="form-actions">
              <button
                type="button"
                class="btn btn-secondary"
                (click)="onClose()"
                [disabled]="loading"
              >
                Annuler
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                [disabled]="loading || examenForm.invalid"
              >
                <span *ngIf="loading" class="loading-spinner"></span>
                {{ isEditMode ? 'Modifier' : 'Ajouter' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 20px;
    }

    .modal-content {
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
      width: 100%;
      max-width: 800px;
      max-height: 90vh;
      overflow-y: auto;
      animation: slideIn 0.3s ease-out;
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 24px 0 24px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 16px;
    }

    .modal-title {
      font-size: 20px;
      font-weight: 600;
      color: #111827;
      margin: 0;
    }

    .modal-close {
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 6px;
      color: #6b7280;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background-color: #f3f4f6;
      color: #374151;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-label {
      display: block;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
      margin-bottom: 6px;
    }

    .form-input,
    .form-select,
    .form-textarea {
      width: 100%;
      padding: 10px 12px;
      border: 2px solid #d1d5db;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input-error,
    .form-select-error {
      border-color: #ef4444;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-error {
      color: #dc2626;
      font-size: 12px;
      margin-top: 4px;
    }

    .form-error-global {
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      color: #dc2626;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 20px;
      font-size: 14px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
    }

    .btn {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-primary {
      background-color: #3b82f6;
      color: white;
    }

    .btn-primary:hover:not(:disabled) {
      background-color: #2563eb;
    }

    .btn-secondary {
      background-color: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover:not(:disabled) {
      background-color: #e5e7eb;
    }

    .loading-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid transparent;
      border-top: 2px solid currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
        gap: 0;
      }
      
      .modal-content {
        margin: 10px;
        max-height: 95vh;
      }
      
      .modal-header,
      .modal-body {
        padding: 16px;
      }
    }
  `]
})
export class ExamenModalComponent implements OnInit, OnDestroy {
  @Input() isEditMode = false;
  @Input() examen: Examen | null = null;
  @Input() etablissements: any[] = [];
  @Input() promotions: any[] = [];
  @Input() options: any[] = [];
  @Input() salles: any[] = [];
  @Input() typesExamen: any[] = [];
  @Input() groups: any[] = [];
  @Input() villes: any[] = [];
  @Input() loading = false;
  @Input() error = '';

  @Output() close = new EventEmitter<void>();
  @Output() submit = new EventEmitter<any>();

  examenForm: FormGroup;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder) {
    this.examenForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      promotion_id: ['', Validators.required],
      option_id: ['', Validators.required],
      salle_id: ['', Validators.required],
      type_examen_id: ['', Validators.required],
      annee_universitaire: ['', Validators.required],
      group_id: ['', Validators.required],
      ville_id: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    if (this.isEditMode && this.examen) {
      this.examenForm.patchValue({
        title: this.examen.title,
        date: this.examen.date,
        heure_debut: this.examen.heure_debut,
        heure_fin: this.examen.heure_fin,
        etablissement_id: this.examen.etablissement_id,
        promotion_id: this.examen.promotion_id,
        option_id: this.examen.option_id,
        salle_id: this.examen.salle_id,
        type_examen_id: this.examen.type_examen_id,
        annee_universitaire: this.examen.annee_universitaire,
        group_id: this.examen.group_id,
        ville_id: this.examen.ville_id
      });
    } else {
      // Mode ajout - définir l'année universitaire par défaut
      const currentYear = new Date().getFullYear();
      this.examenForm.patchValue({
        annee_universitaire: `${currentYear}-${currentYear + 1}`
      });
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onSubmit(): void {
    if (this.examenForm.valid) {
      this.submit.emit(this.examenForm.value);
    } else {
      this.markFormGroupTouched();
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.examenForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.examenForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['min']) return `Valeur minimum: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valeur maximum: ${field.errors['max'].max}`;
    }
    return '';
  }

  private markFormGroupTouched(): void {
    Object.keys(this.examenForm.controls).forEach(key => {
      const control = this.examenForm.get(key);
      control?.markAsTouched();
    });
  }
}
