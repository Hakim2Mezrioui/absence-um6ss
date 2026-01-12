import { Component, OnInit, Inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AbsenceService, Absence } from '../../../services/absence.service';
import { NotificationService } from '../../../services/notification.service';

export interface JustifyAbsenceDialogData {
  absence: Absence;
}

@Component({
  selector: 'app-justify-absence-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './justify-absence-dialog.component.html',
  styleUrl: './justify-absence-dialog.component.css'
})
export class JustifyAbsenceDialogComponent implements OnInit {
  justifyForm!: FormGroup;
  selectedFile: File | null = null;
  fileName: string = '';
  isUploading = false;
  acceptedFormats = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
  maxFileSize = 5 * 1024 * 1024; // 5MB
  isStatusDropdownOpen = false;

  constructor(
    public dialogRef: MatDialogRef<JustifyAbsenceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: JustifyAbsenceDialogData,
    private fb: FormBuilder,
    private absenceService: AbsenceService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.justifyForm = this.fb.group({
      justifiee: [true, Validators.required],
      motif: ['', [Validators.required, Validators.maxLength(500)]]
    });

    // Si l'absence est déjà justifiée, pré-remplir le formulaire
    if (this.data.absence.justifiee && this.data.absence.motif) {
      this.justifyForm.patchValue({
        justifiee: true,
        motif: this.data.absence.motif
      });
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Vérifier la taille
      if (file.size > this.maxFileSize) {
        this.notificationService.error(
          'Fichier trop volumineux',
          'La taille du fichier ne doit pas dépasser 5MB'
        );
        return;
      }

      // Vérifier le format
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.acceptedFormats.includes(fileExtension)) {
        this.notificationService.error(
          'Format non supporté',
          `Formats acceptés: ${this.acceptedFormats.join(', ')}`
        );
        return;
      }

      this.selectedFile = file;
      this.fileName = file.name;
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      
      // Vérifier la taille
      if (file.size > this.maxFileSize) {
        this.notificationService.error(
          'Fichier trop volumineux',
          'La taille du fichier ne doit pas dépasser 5MB'
        );
        return;
      }

      // Vérifier le format
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!this.acceptedFormats.includes(fileExtension)) {
        this.notificationService.error(
          'Format non supporté',
          `Formats acceptés: ${this.acceptedFormats.join(', ')}`
        );
        return;
      }

      this.selectedFile = file;
      this.fileName = file.name;
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.fileName = '';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  onSubmit(): void {
    if (this.justifyForm.invalid) {
      this.notificationService.warning(
        'Formulaire invalide',
        'Veuillez remplir tous les champs requis'
      );
      return;
    }

    this.isUploading = true;

    const formValue = this.justifyForm.value;

    // Si un fichier est sélectionné, uploader d'abord
    if (this.selectedFile) {
      this.absenceService.uploadJustificatif(this.data.absence.id, this.selectedFile)
        .subscribe({
          next: (response) => {
            // Ensuite, mettre à jour la justification avec le motif
            this.absenceService.justifierAbsence(this.data.absence.id, {
              justifiee: formValue.justifiee,
              motif: formValue.motif,
              justificatif: response.justificatif
            }).subscribe({
              next: () => {
                this.notificationService.success(
                  'Absence justifiée',
                  'L\'absence a été justifiée avec succès'
                );
                this.dialogRef.close(true);
              },
              error: (error) => {
                this.isUploading = false;
                this.notificationService.error(
                  'Erreur',
                  'Erreur lors de la justification de l\'absence'
                );
              }
            });
          },
          error: (error) => {
            this.isUploading = false;
            this.notificationService.error(
              'Erreur d\'upload',
              'Erreur lors de l\'upload du justificatif'
            );
          }
        });
    } else {
      // Pas de fichier, juste mettre à jour la justification
      this.absenceService.justifierAbsence(this.data.absence.id, {
        justifiee: formValue.justifiee,
        motif: formValue.motif
      }).subscribe({
        next: () => {
          this.notificationService.success(
            'Absence justifiée',
            'L\'absence a été justifiée avec succès'
          );
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.isUploading = false;
          this.notificationService.error(
            'Erreur',
            'Erreur lors de la justification de l\'absence'
          );
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }

  getStudentName(): string {
    if (this.data.absence.etudiant) {
      return `${this.data.absence.etudiant.first_name} ${this.data.absence.etudiant.last_name}`;
    }
    return 'Étudiant inconnu';
  }

  getStudentMatricule(): string {
    return this.data.absence.etudiant?.matricule || 'N/A';
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('fr-FR');
  }

  /**
   * Obtenir l'icône du statut sélectionné
   */
  getStatusIcon(): string {
    const status = this.justifyForm.get('justifiee')?.value;
    return status ? 'check_circle' : 'cancel';
  }

  /**
   * Obtenir le texte du statut sélectionné
   */
  getStatusText(): string {
    const status = this.justifyForm.get('justifiee')?.value;
    return status ? 'Justifiée' : 'Non justifiée';
  }

  /**
   * Obtenir la classe CSS pour le statut
   */
  getStatusClass(): string {
    const status = this.justifyForm.get('justifiee')?.value;
    return status ? 'status-justified' : 'status-unjustified';
  }

  /**
   * Toggle le dropdown de statut
   */
  toggleStatusDropdown(): void {
    this.isStatusDropdownOpen = !this.isStatusDropdownOpen;
  }

  /**
   * Sélectionner un statut
   */
  selectStatus(value: boolean): void {
    this.justifyForm.patchValue({ justifiee: value });
    this.isStatusDropdownOpen = false;
  }

  /**
   * Fermer le dropdown si on clique en dehors
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.custom-select')) {
      this.isStatusDropdownOpen = false;
    }
  }

  downloadExistingFile(): void {
    this.absenceService.downloadJustificatif(this.data.absence.id)
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = this.data.absence.justificatif || 'justificatif';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.notificationService.error(
            'Erreur',
            'Impossible de télécharger le justificatif'
          );
        }
      });
  }
}
