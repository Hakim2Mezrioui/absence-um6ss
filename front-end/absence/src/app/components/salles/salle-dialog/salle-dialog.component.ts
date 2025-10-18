import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';

import { Salle, CreateSalleRequest } from '../../../services/salles.service';

export interface SalleDialogData {
  salle: Salle | null;
  etablissements: any[];
  villes: any[];
  mode: 'create' | 'edit';
}

@Component({
  selector: 'app-salle-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule
  ],
  templateUrl: './salle-dialog.component.html',
  styleUrl: './salle-dialog.component.css'
})
export class SalleDialogComponent implements OnInit {
  salleForm: FormGroup;
  isEditMode: boolean;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalleDialogData
  ) {
    this.isEditMode = data.mode === 'edit';
    this.salleForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.salle) {
      this.populateForm(this.data.salle);
    }
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      etage: [0, [Validators.required, Validators.min(0)]],
      batiment: ['', [Validators.required, Validators.maxLength(100)]],
      etablissement_id: ['', [Validators.required]],
      ville_id: ['', [Validators.required]],
      capacite: [null, [Validators.min(1)]],
      description: ['', [Validators.maxLength(500)]]
    });
  }

  private populateForm(salle: Salle): void {
    this.salleForm.patchValue({
      name: salle.name,
      etage: salle.etage,
      batiment: salle.batiment,
      etablissement_id: salle.etablissement_id,
      ville_id: salle.ville_id,
      capacite: salle.capacite,
      description: salle.description
    });
  }

  onSubmit(): void {
    if (this.salleForm.valid) {
      const formValue = this.salleForm.value;
      const salleData: CreateSalleRequest = {
        name: formValue.name.trim(),
        etage: parseInt(formValue.etage),
        batiment: formValue.batiment.trim(),
        etablissement_id: parseInt(formValue.etablissement_id),
        ville_id: parseInt(formValue.ville_id),
        capacite: formValue.capacite ? parseInt(formValue.capacite) : undefined,
        description: formValue.description ? formValue.description.trim() : undefined
      };

      this.dialogRef.close(salleData);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  getTitle(): string {
    return this.isEditMode ? 'Modifier la salle' : 'Ajouter une salle';
  }

  getSubmitLabel(): string {
    return this.isEditMode ? 'Modifier' : 'Ajouter';
  }

  // Getters pour faciliter l'accès aux contrôles du formulaire
  get nameControl() { return this.salleForm.get('name'); }
  get etageControl() { return this.salleForm.get('etage'); }
  get batimentControl() { return this.salleForm.get('batiment'); }
  get etablissementControl() { return this.salleForm.get('etablissement_id'); }
  get villeControl() { return this.salleForm.get('ville_id'); }
  get capaciteControl() { return this.salleForm.get('capacite'); }
  get descriptionControl() { return this.salleForm.get('description'); }
}
