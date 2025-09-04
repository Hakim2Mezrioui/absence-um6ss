import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDeleteData {
  title: string;
  message: string;
  studentName: string;
  matricule: string;
  date: string;
}

@Component({
  selector: 'app-confirm-delete-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="p-6">
      <div class="flex items-center gap-4 mb-4">
        <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
          <mat-icon class="text-red-600 text-2xl">warning</mat-icon>
        </div>
        <h2 class="text-xl font-semibold text-gray-900">{{ data.title }}</h2>
      </div>
      
      <div class="mb-6">
        <p class="text-gray-700 mb-3">{{ data.message }}</p>
        
        <div class="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <div class="flex items-center gap-2 mb-2">
            <mat-icon class="text-gray-500 text-sm">person</mat-icon>
            <span class="font-medium text-gray-800">{{ data.studentName }}</span>
          </div>
          <div class="flex items-center gap-2 mb-2">
            <mat-icon class="text-gray-500 text-sm">badge</mat-icon>
            <span class="text-sm text-gray-600">Matricule: {{ data.matricule }}</span>
          </div>
          <div class="flex items-center gap-2">
            <mat-icon class="text-gray-500 text-sm">event</mat-icon>
            <span class="text-sm text-gray-600">Date: {{ data.date }}</span>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end gap-3">
        <button 
          mat-button 
          (click)="onCancel()"
          class="text-gray-600 hover:text-gray-800"
        >
          Annuler
        </button>
        <button 
          mat-raised-button 
          color="warn"
          (click)="onConfirm()"
          class="bg-red-600 hover:bg-red-700 text-white"
        >
          <mat-icon class="mr-2">delete</mat-icon>
          Supprimer
        </button>
      </div>
    </div>
  `,
  styles: [`
    .mat-mdc-dialog-container {
      --mdc-dialog-container-color: white;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteData
  ) {}

  onCancel(): void {
    this.dialogRef.close(false);
  }

  onConfirm(): void {
    this.dialogRef.close(true);
  }
}
