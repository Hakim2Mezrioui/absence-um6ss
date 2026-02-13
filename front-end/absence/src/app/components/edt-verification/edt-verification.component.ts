import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EdtTransformationService, EdtRowData, TEMPLATE_HEADERS } from '../../services/edt-transformation.service';
import { CoursService } from '../../services/cours.service';

@Component({
  selector: 'app-edt-verification',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edt-verification.component.html',
  styleUrls: ['./edt-verification.component.css']
})
export class EdtVerificationComponent implements OnInit {
  isProcessing = false;
  isImporting = false;
  isDragging = false;
  errorMessage = '';
  successMessage = '';
  fileName = '';
  tableRows: EdtRowData[] = [];
  filterOptions: any = null;
  importResult: { success: boolean; message: string; details?: any } | null = null;

  readonly templateHeaders = [...TEMPLATE_HEADERS];
  readonly displayHeaders: Record<string, string> = {
    title: 'Module / Cours',
    date: 'Date',
    hour_debut_poigntage: 'Pointage début',
    hour_debut: 'Heure début',
    hour_fin: 'Heure fin',
    tolerance: 'Tolérance',
    attendance_mode: 'Mode',
    exit_capture_window: 'Fenêtre sortie',
    etablissement_name: 'Établissement',
    promotion_name: 'Promotion',
    type_cours_name: 'Type cours',
    salle_name: 'Salle',
    group_title: 'Groupe',
    ville_name: 'Ville',
    option_name: 'Option',
    enseignant_name: 'Enseignant',
    annee_universitaire: 'Année univ.'
  };

  constructor(
    private edtService: EdtTransformationService,
    private coursService: CoursService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  loadFilterOptions(): void {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        this.filterOptions = options;
      },
      error: (err) => {
        console.warn('Options de filtre non chargées:', err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.importResult = null;
    this.isProcessing = true;
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const buffer = reader.result as ArrayBuffer;
        this.tableRows = this.edtService.parseEdtExcel(buffer);
        this.validateAllRows();
        this.successMessage = `${this.tableRows.length} ligne(s) extaite(s) avec succès. Vérifiez et corrigez si nécessaire.`;
      } catch (err: any) {
        this.errorMessage = err?.message || 'Impossible de lire le fichier EDT.';
        this.tableRows = [];
      } finally {
        this.isProcessing = false;
        input.value = '';
      }
    };
    reader.onerror = () => {
      this.errorMessage = 'Erreur lors de la lecture du fichier.';
      this.isProcessing = false;
      input.value = '';
    };
    reader.readAsArrayBuffer(file);
  }

  onZoneClick(fileInput: HTMLInputElement): void {
    fileInput.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      const input = document.createElement('input');
      input.type = 'file';
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      const ev = { target: input } as any;
      this.onFileSelected(ev);
    }
  }

  validateAllRows(): void {
    this.tableRows.forEach(row => {
      (row as any)._validation = this.edtService.validateRow(row);
    });
  }

  updateCell(rowIndex: number, field: keyof EdtRowData, value: string): void {
    const row = this.tableRows[rowIndex];
    if (!row) return;
    (row as any)[field] = value;
    if (field === 'attendance_mode') {
      const mode = (value || 'bicheck').toLowerCase();
      if (mode === 'bicheck' || mode === 'bi-check') {
        row.exit_capture_window = '60';
      } else {
        row.exit_capture_window = '0';
      }
    }
    if (field === 'hour_debut' && value) {
      row.hour_debut_poigntage = this.subtractMinutes(value, 30);
    }
    (row as any)._validation = this.edtService.validateRow(row);
  }

  toggleAttendanceMode(rowIndex: number): void {
    const row = this.tableRows[rowIndex];
    if (!row) return;
    const next = row.attendance_mode === 'bicheck' ? 'normal' : 'bicheck';
    row.attendance_mode = next;
    row.exit_capture_window = next === 'bicheck' ? '60' : '0';
    (row as any)._validation = this.edtService.validateRow(row);
  }

  private subtractMinutes(time: string, min: number): string {
    const [h, m] = time.split(':').map(Number);
    let total = (h || 0) * 60 + (m || 0) - min;
    if (total < 0) total = 0;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  isRowInvalid(rowIndex: number): boolean {
    const row = this.tableRows[rowIndex];
    const v = (row as any)?._validation as string[] | undefined;
    return !!v && v.length > 0;
  }

  getRowValidationMessages(rowIndex: number): string[] {
    const row = this.tableRows[rowIndex];
    return ((row as any)?._validation as string[]) || [];
  }

  hasInvalidRows(): boolean {
    return this.tableRows.some((_, i) => this.isRowInvalid(i));
  }

  getInvalidCount(): number {
    return this.tableRows.filter((_, i) => this.isRowInvalid(i)).length;
  }

  getHeaderLabel(header: string): string {
    return this.displayHeaders[header] || header;
  }

  trackByIndex(i: number): number {
    return i;
  }

  trackByHeader(_: number, h: string): string {
    return h;
  }

  downloadModeleCorrige(): void {
    if (!this.tableRows.length) {
      this.toastr.warning('Aucune donnée à exporter.');
      return;
    }
    this.edtService.exportToModelFormat(this.tableRows, 'modele_import_cours_corrige.xlsx');
    this.toastr.success('Fichier "modele_import_cours_corrige.xlsx" téléchargé.');
  }

  finaliserImportation(): void {
    if (this.hasInvalidRows()) {
      this.toastr.warning(`Veuillez corriger les ${this.getInvalidCount()} ligne(s) incomplètes avant l'importation.`);
      return;
    }

    this.isImporting = true;
    this.importResult = null;
    this.errorMessage = '';

    const coursData = this.edtService.prepareForApiImport(this.tableRows, this.filterOptions);
    const formData = new FormData();
    formData.append('data', JSON.stringify(coursData));

    this.coursService.importCours(formData).subscribe({
      next: (response) => {
        this.isImporting = false;
        const hasErrors = response.summary?.errors > 0 || (response.error_details?.length ?? 0) > 0;
        this.importResult = {
          success: !hasErrors,
          message: response.message || (hasErrors ? 'Importation terminée avec des erreurs' : 'Importation réussie'),
          details: response.summary
        };

        if (hasErrors) {
          this.toastr.warning(
            `Importation terminée avec ${response.summary?.errors || response.error_details?.length || 0} erreur(s).`,
            'Importation avec erreurs'
          );
        } else {
          this.toastr.success(
            `${response.summary?.created || 0} créé(s), ${response.summary?.updated || 0} mis à jour.`,
            'Importation réussie'
          );
          setTimeout(() => this.router.navigate(['/cours']), 2000);
        }
      },
      error: (err) => {
        this.isImporting = false;
        this.importResult = {
          success: false,
          message: err.error?.message || 'Erreur lors de l\'importation.'
        };
        this.toastr.error(err.error?.message || 'Erreur lors de l\'importation.', 'Erreur');
      }
    });
  }

  clearTable(): void {
    this.tableRows = [];
    this.fileName = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.importResult = null;
  }

  goBack(): void {
    this.router.navigate(['/cours']);
  }
}
