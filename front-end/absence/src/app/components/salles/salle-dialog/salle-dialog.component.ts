import { Component, Inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';

import { Salle, CreateSalleRequest } from '../../../services/salles.service';
import { BiostarService, BiostarDevice, BiostarDeviceGroup } from '../../../services/biostar.service';

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
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatIconModule,
    MatSelectModule
  ],
  templateUrl: './salle-dialog.component.html',
  styleUrl: './salle-dialog.component.css'
})
export class SalleDialogComponent implements OnInit {
  salleForm: FormGroup;
  isEditMode: boolean;
  allBiostarDevices: BiostarDevice[] = [];
  biostarDevices: BiostarDevice[] = [];
  filteredBiostarDevices: BiostarDevice[] = [];
  devicesLoading = false;
  devicesError: string | null = null;
  deviceSearch = '';
  // Device groups prefilter
  deviceGroups: BiostarDeviceGroup[] = [];
  filteredDeviceGroups: BiostarDeviceGroup[] = [];
  groupsLoading = false;
  groupsError: string | null = null;
  selectedGroupIds: number[] = [];
  deviceGroupSearch = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<SalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SalleDialogData,
    private biostarService: BiostarService,
    private cdr: ChangeDetectorRef
  ) {
    this.isEditMode = data.mode === 'edit';
    this.salleForm = this.createForm();
  }

  ngOnInit(): void {
    if (this.isEditMode && this.data.salle) {
      this.populateForm(this.data.salle);
      // Charger les devices si une ville est déjà définie en mode édition
      const villeId = this.salleForm.get('ville_id')?.value;
      if (villeId) {
        this.loadDeviceGroupsAndDevices(Number(villeId));
      }
    }

    // Charger la liste des devices quand la ville change
    this.salleForm.get('ville_id')?.valueChanges.subscribe((villeId) => {
      if (villeId) {
        this.loadDeviceGroupsAndDevices(Number(villeId));
      } else {
        this.biostarDevices = [];
        this.filteredBiostarDevices = [];
        this.deviceSearch = '';
        this.salleForm.get('devices')?.setValue([]);
        this.devicesError = null;
        this.devicesLoading = false;
        this.deviceGroups = [];
        this.filteredDeviceGroups = [];
        this.groupsError = null;
        this.groupsLoading = false;
        this.selectedGroupIds = [];
        this.deviceGroupSearch = '';
      }
    });
  }

  private createForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      etage: [0, [Validators.required, Validators.min(0)]],
      batiment: ['', [Validators.required, Validators.maxLength(100)]],
      etablissement_id: ['', [Validators.required]],
      ville_id: ['', [Validators.required]],
      capacite: [null, [Validators.min(1)]],
      description: ['', [Validators.maxLength(500)]],
      devices: [[], [Validators.required]]
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
      description: salle.description,
      devices: salle.devices || []
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
        description: formValue.description ? formValue.description.trim() : undefined,
        devices: (formValue.devices || []) as { devid: string | number; devnm: string }[]
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
  get devicesControl() { return this.salleForm.get('devices'); }
  filterDevices(): void {
    const term = (this.deviceSearch || '').toLowerCase().trim();
    if (!term) {
      this.filteredBiostarDevices = [...this.biostarDevices];
    } else {
      this.filteredBiostarDevices = this.biostarDevices.filter(d => {
        const nameMatch = (d.devnm || '').toLowerCase().includes(term);
        const idMatch = String(d.devid).toLowerCase().includes(term);
        return nameMatch || idMatch;
      });
    }
    // Forcer la détection de changement
    this.cdr.detectChanges();
  }

  private loadBiostarDevices(villeId: number): void {
    this.devicesLoading = true;
    this.devicesError = null;
    this.biostarService.getDevices(villeId).subscribe({
      next: (res) => {
        this.allBiostarDevices = res.devices || [];
        this.applyGroupFilter();
        this.filterDevices();
        this.devicesLoading = false;
        if (res.devices && res.devices.length === 0) {
          this.devicesError = "Aucun device disponible pour cette ville.";
        }
      },
      error: (err) => {
        console.error('Erreur lors du chargement des devices:', err);
        this.allBiostarDevices = [];
        this.biostarDevices = [];
        this.filteredBiostarDevices = [];
        this.devicesLoading = false;
        this.devicesError = err.error?.message || "Impossible de charger les devices pour cette ville. Vérifiez la configuration Biostar.";
      }
    });
  }

  private loadDeviceGroupsAndDevices(villeId: number): void {
    this.groupsLoading = true;
    this.groupsError = null;
    this.biostarService.getDeviceGroups(villeId).subscribe({
      next: (res) => {
        this.deviceGroups = res.groups || [];
        this.filterGroups();
        this.groupsLoading = false;
        // After loading groups, fetch devices (with current selectedGroupIds)
        this.loadBiostarDevices(villeId);
      },
      error: (err) => {
        console.error('Erreur lors du chargement des groupes de devices:', err);
        this.deviceGroups = [];
        this.filteredDeviceGroups = [];
        this.groupsLoading = false;
        this.groupsError = err.error?.message || "Impossible de charger les groupes de devices pour cette ville.";
        // Even if groups fail, still load devices
        this.loadBiostarDevices(villeId);
      }
    });
  }

  onToggleGroup(groupId: number): void {
    const set = new Set(this.selectedGroupIds);
    if (set.has(groupId)) {
      set.delete(groupId);
    } else {
      set.add(groupId);
    }
    this.selectedGroupIds = Array.from(set);
    this.applyGroupFilter();
    this.filterDevices();
  }

  onGroupsSelectionChange(selectedIds: number[]): void {
    this.selectedGroupIds = selectedIds || [];
    this.applyGroupFilter();
    this.filterDevices();
  }

  onGroupSearchInput(value: string): void {
    this.deviceGroupSearch = value || '';
    this.filterGroups();
  }

  private filterGroups(): void {
    const term = (this.deviceGroupSearch || '').toLowerCase().trim();
    if (!term) {
      this.filteredDeviceGroups = [...this.deviceGroups];
    } else {
      this.filteredDeviceGroups = this.deviceGroups.filter(g => (g.name || '').toLowerCase().includes(term));
    }
  }

  private applyGroupFilter(): void {
    if (!this.selectedGroupIds || this.selectedGroupIds.length === 0) {
      this.biostarDevices = [...this.allBiostarDevices];
      return;
    }
    const set = new Set(this.selectedGroupIds.map(id => Number(id)));
    this.biostarDevices = this.allBiostarDevices.filter(d => d.device_group_id != null && set.has(Number(d.device_group_id)));
  }

  onSearchInput(value: string): void {
    this.deviceSearch = value || '';
    this.filterDevices(); // Filtrer à chaque changement
  }

  onDeviceSearchChange(value: string): void {
    this.deviceSearch = value || '';
    this.filterDevices(); // Filtrer à chaque changement
  }

  isDeviceSelected(device: BiostarDevice): boolean {
    const selected = this.devicesControl?.value || [];
    return selected.some((d: BiostarDevice) => d.devid === device.devid);
  }

  toggleDevice(device: BiostarDevice): void {
    const selected = [...(this.devicesControl?.value || [])];
    const index = selected.findIndex((d: BiostarDevice) => d.devid === device.devid);
    
    if (index >= 0) {
      selected.splice(index, 1);
    } else {
      selected.push(device);
    }
    
    this.devicesControl?.setValue(selected);
    this.devicesControl?.markAsTouched();
  }
}
