import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { Subject, takeUntil } from 'rxjs';
import { read, utils, WorkBook, write } from 'xlsx';

import { AttendanceRapideService, AttendanceRapideStudent, AttendanceRapideData, AttendanceRapideLancerResponse, AttendanceRapideImportRequest, AttendanceRapideResponse } from '../../services/attendance-rapide.service';
import { EtudiantsService, FilterOptions } from '../../services/etudiants.service';
import { NotificationService } from '../../services/notification.service';

interface StudentRow { [key: string]: string; }

interface Suggestion { label: string; id?: number; }

interface ReferenceEntry { label: string; normalized: string; id?: number; }

@Component({
  selector: 'app-attendance-rapide',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, HttpClientModule],
  templateUrl: './attendance-rapide.component.html',
  styleUrl: './attendance-rapide.component.css'
})
export class AttendanceRapideComponent implements OnInit, OnDestroy {
  // Formulaire de configuration
  importForm: FormGroup;

  // En-têtes du template et relations
  readonly templateHeaders = [
    'nom', 'prenom', 'cne', 'cin', 'apogee', 'promotion_name', 'group_title', 'option_name'
  ];

  readonly relationHeaders = [
    'promotion_name', 'group_title', 'option_name'
    // Note: etablissement_name et ville_name viennent de la configuration
  ];

  // État de l'interface
  fileName = '';
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isImporting = false;
  showImportSection = false; // Contrôle l'affichage de la section d'import

  // Options de filtre
  filterOptions: FilterOptions = {
    promotions: [],
    groups: [],
    villes: [],
    etablissements: [],
    options: []
  };

  // Données de la table
  tableHeaders: string[] = [];
  tableRows: StudentRow[] = [];

  // Données de référence pour la validation
  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};
  private validationTimers: Record<string, any> = {};
  private readonly debounceMs = 200;

  // Gestion des dropdowns
  activeFocusedCell: { row: number; header: string } | null = null;
  dropdownSuggestions: Suggestion[] = [];
  selectedSuggestionIndex: number = -1;

  // Données d'attendance (mode consultation)
  attendanceData: AttendanceRapideData | null = null;
  students: AttendanceRapideStudent[] = [];
  hasTriedToLoad = false;
  totalStudents = 0;
  presentCount = 0;
  absentCount = 0;
  loading = false;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private attendanceRapideService: AttendanceRapideService,
    private etudiantsService: EtudiantsService,
    private notificationService: NotificationService
  ) {
    this.importForm = this.fb.group({
      ville_id: ['', Validators.required],
      etablissement_id: ['', Validators.required],
      date: ['', Validators.required],
      heure_debut: ['', Validators.required],
      heure_fin: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.loadFilterOptions();
  }

  ngOnDestroy(): void {
    Object.values(this.validationTimers).forEach((t) => clearTimeout(t));
    this.validationTimers = {};
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ====================
  // GESTION DE L'INTERFACE
  // ====================

  showImport(): void {
    this.showImportSection = true;
  }

  hideImport(): void {
    this.showImportSection = false;
    this.clearTable();
  }

  // ====================
  // CHARGEMENT DES OPTIONS
  // ====================

  loadFilterOptions(): void {
    this.etudiantsService.getFilterOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.filterOptions = {
            villes: options.villes || [],
            etablissements: options.etablissements || [],
            promotions: options.promotions || [],
            groups: options.groups || [],
            options: options.options || []
          };
          this.prepareReferenceData();
        },
        error: (err) => {
          console.error('Erreur lors du chargement des options:', err);
          this.errorMessage = 'Erreur lors du chargement des options';
        }
      });
  }

  private prepareReferenceData(): void {
    this.referenceData = {
      promotion_name: (this.filterOptions.promotions || []).map(p => this.toReferenceEntry(p.name, p.id)),
      group_title: (this.filterOptions.groups || []).map(g => this.toReferenceEntry(g.title, g.id)),
      option_name: (this.filterOptions.options || []).map(o => this.toReferenceEntry(o.name, o.id))
    };
  }

  // ====================
  // TÉLÉCHARGEMENT DU MODÈLE
  // ====================

  downloadCSVTemplate(): void {
    this.attendanceRapideService.downloadTemplate('csv')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = 'modele_attendance_rapide.csv';
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur lors du téléchargement du modèle CSV:', err);
          this.notificationService.errorMessage('Erreur lors du téléchargement du modèle CSV');
        }
      });
  }

  downloadExcelTemplate(): void {
    this.attendanceRapideService.downloadTemplate('xlsx')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
          link.download = 'modele_attendance_rapide.xlsx';
            link.click();
              window.URL.revokeObjectURL(url);
        },
        error: (err) => {
          console.error('Erreur lors du téléchargement du modèle Excel:', err);
          this.notificationService.errorMessage('Erreur lors du téléchargement du modèle Excel');
        }
      });
  }

  // ====================
  // SÉLECTION ET LECTURE DU FICHIER
  // ====================

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
          return;
        }
        
    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        
        const workbook: WorkBook = read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          raw: false
        });
        
        let targetSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[targetSheetName];
        let rows: any[][] = [];
        
        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (!ws || !ws['!ref']) continue;
          const probe = utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false, blankrows: false });
          if (probe.length >= 2 && probe.some((r, idx) => idx > 0 && r.some((c: any) => (c ?? '').toString().trim() !== ''))) {
            targetSheetName = name;
            worksheet = ws;
            rows = probe;
            break;
          }
        }
        
        if (!worksheet || !worksheet['!ref']) {
          throw new Error('La feuille Excel est vide ou inaccessible.');
        }
        if (!rows.length) {
          rows = utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false, blankrows: false });
        }

        if (!rows.length) {
          throw new Error('Le fichier est vide.');
        }

        const [headerRow, ...dataRows] = rows;
        
        this.tableHeaders = headerRow.map((header, index) => {
          const cleanHeader = String(header || '').trim();
          if (!cleanHeader) {
            return `colonne_${index + 1}`;
          }
          return cleanHeader;
        });

        this.tableRows = dataRows.map((row, rowIndex) => {
          const rowObject: StudentRow = {};
          this.tableHeaders.forEach((header, index) => {
            let cellValue = row[index];
            
            if (cellValue === null || cellValue === undefined) {
              cellValue = '';
            } else if (typeof cellValue === 'number') {
              cellValue = cellValue.toString();
            } else if (cellValue instanceof Date) {
              cellValue = cellValue.toISOString().split('T')[0];
            } else {
              cellValue = String(cellValue).trim();
            }
            
            rowObject[header] = cellValue;
          });
          
          return rowObject;
        });

        this.tableRows = this.tableRows.filter(row => {
          return Object.values(row).some(value => value && value.trim() !== '');
        });

        if (!this.tableRows.length) {
          this.successMessage = 'Le fichier a été importé, mais aucune donnée valide n\'a été trouvée.';
        } else {
          this.successMessage = `${this.tableRows.length} ligne(s) chargée(s) avec succès.`;
        }

        this.validateRows();
      } catch (error: any) {
        console.error('Erreur détaillée lors de la lecture du fichier:', error);
        this.errorMessage = error?.message || 'Impossible de lire le fichier.';
        this.tableHeaders = [];
        this.tableRows = [];
      } finally {
        this.isProcessing = false;
      }
    };

    reader.onerror = (error) => {
      console.error('Erreur de lecture du fichier:', error);
      this.isProcessing = false;
      this.errorMessage = 'Erreur lors de la lecture du fichier.';
    };

    reader.readAsArrayBuffer(file);
  }

  // ====================
  // VALIDATION EN TEMPS RÉEL
  // ====================

  updateCell(rowIndex: number, header: string, value: string): void {
    if (!this.tableRows[rowIndex]) {
      return;
    }
    this.tableRows[rowIndex] = {
      ...this.tableRows[rowIndex],
      [header]: value
    };
    const timerKey = `${rowIndex}:${header}`;
    if (this.validationTimers[timerKey]) {
      clearTimeout(this.validationTimers[timerKey]);
    }
    this.validationTimers[timerKey] = setTimeout(() => {
      this.validateCell(rowIndex, header);
      // Mettre à jour le dropdown si cette cellule est active
      if (this.activeFocusedCell?.row === rowIndex && this.activeFocusedCell?.header === header) {
        this.updateDropdownSuggestions(rowIndex, header);
      }
      delete this.validationTimers[timerKey];
    }, this.debounceMs);
  }

  private validateRows(): void {
    this.suggestionsByCell = {};
    this.invalidCells = {};

    const headersToCheck = this.relationHeaders.filter((header) => this.tableHeaders.includes(header));
    if (!headersToCheck.length) {
      return;
    }

    this.tableRows.forEach((_, rowIndex) => {
      headersToCheck.forEach((header) => this.validateCell(rowIndex, header));
    });
  }

  private validateCell(rowIndex: number, header: string): void {
    if (!this.relationHeaders.includes(header)) {
      return;
    }

    if (!this.suggestionsByCell[rowIndex]) {
      this.suggestionsByCell[rowIndex] = {};
    }
    if (!this.invalidCells[rowIndex]) {
      this.invalidCells[rowIndex] = {};
    }

    const value = this.tableRows[rowIndex]?.[header] ?? '';
    const referenceEntries = this.referenceData[header];

    if (!referenceEntries || referenceEntries.length === 0) {
      this.suggestionsByCell[rowIndex][header] = [];
      this.invalidCells[rowIndex][header] = false;
      return;
    }

    const { isValid, suggestions } = this.computeSuggestions(referenceEntries, value);
    this.suggestionsByCell[rowIndex][header] = suggestions;
    this.invalidCells[rowIndex][header] = !isValid;
  }

  private computeSuggestions(reference: ReferenceEntry[], rawValue: string): { isValid: boolean; suggestions: Suggestion[] } {
    const value = (rawValue ?? '').trim();
    const normalized = this.normalize(value);

    if (!value) {
      return {
        isValid: false,
        suggestions: reference.slice(0, 5).map((entry) => this.toSuggestion(entry))
      };
    }

    if (normalized.length < 3) {
      const quick = reference
        .filter((entry) => entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized))
        .slice(0, 5)
        .map((entry) => this.toSuggestion(entry));
      const exact = reference.find((entry) => entry.normalized === normalized);
      if (exact) {
        return { isValid: true, suggestions: [] };
      }
      return { isValid: false, suggestions: quick.length ? quick : reference.slice(0, 5).map((e) => this.toSuggestion(e)) };
    }

    const exactMatch = reference.find((entry) => entry.normalized === normalized);
    if (exactMatch) {
      return { isValid: true, suggestions: [] };
    }

    const quickCandidates = reference.filter((entry) =>
      entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized) || normalized.includes(entry.normalized)
    );

    const pool = quickCandidates.length ? quickCandidates : reference.slice(0, Math.min(300, reference.length));

    const numMatch = (s: string): string | null => {
      const m = s.match(/^(\d+)/);
      return m ? m[1] : null;
    };
    const termNum = numMatch(normalized);
    const scored = pool.map((entry) => {
      let score = 0;
      if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) {
        score += 50;
      }
      if (entry.normalized.startsWith(normalized)) {
        score += 20;
      }
      const distance = this.levenshteinDistance(normalized, entry.normalized);
      score += Math.max(0, 40 - distance * 10);
      const entryNum = numMatch(entry.normalized);
      if (termNum && entryNum && termNum === entryNum) {
        score += 60;
      }
      return { entry, score };
    }).filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    if (top && top.score >= 80) {
      return { isValid: true, suggestions: [] };
    }

    const baseCandidates = scored.length ? scored : reference.slice(0, 3);

    const suggestions = baseCandidates
      .slice(0, 5)
      .map((item) => this.toSuggestion('entry' in item ? item.entry : item));

    return { isValid: false, suggestions };
  }

  // ====================
  // UTILITAIRES
  // ====================

  private toReferenceEntry(label: string | undefined, id?: number): ReferenceEntry {
    const safeLabel = label ?? '';
    return {
      label: safeLabel,
      normalized: this.normalize(safeLabel),
      id
    };
  }

  private toSuggestion(entry: ReferenceEntry): Suggestion {
    return { label: entry.label, id: entry.id };
  }

  private normalize(value: string): string {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim();
  }

  private levenshteinDistance(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    if (!m) return n;
    if (!n) return m;

    const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) {
      matrix[i][0] = i;
    }
    for (let j = 0; j <= n; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return matrix[m][n];
  }

  // ====================
  // GESTION DES SUGGESTIONS
  // ====================

  getSuggestions(rowIndex: number, header: string): Suggestion[] {
    return this.suggestionsByCell[rowIndex]?.[header] ?? [];
  }

  isCellInvalid(rowIndex: number, header: string): boolean {
    return !!this.invalidCells[rowIndex]?.[header];
  }

  applySuggestion(rowIndex: number, header: string, suggestion: Suggestion): void {
    this.updateCell(rowIndex, header, suggestion.label);
  }

  // ====================
  // GESTION DES DROPDOWNS
  // ====================

  onInputFocus(rowIndex: number, header: string): void {
    if (!this.relationHeaders.includes(header)) {
      return;
    }
    this.activeFocusedCell = { row: rowIndex, header };
    this.selectedSuggestionIndex = -1;
    this.updateDropdownSuggestions(rowIndex, header);
  }

  onInputBlur(rowIndex: number, header: string): void {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => {
      if (this.activeFocusedCell?.row === rowIndex && this.activeFocusedCell?.header === header) {
        this.closeDropdown();
      }
    }, 200);
  }

  closeDropdown(): void {
    this.activeFocusedCell = null;
    this.dropdownSuggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  isDropdownVisible(rowIndex: number, header: string): boolean {
    return this.activeFocusedCell?.row === rowIndex && 
           this.activeFocusedCell?.header === header &&
           this.dropdownSuggestions.length > 0;
  }

  hasActiveDropdown(rowIndex: number): boolean {
    return this.activeFocusedCell?.row === rowIndex && this.dropdownSuggestions.length > 0;
  }

  private updateDropdownSuggestions(rowIndex: number, header: string): void {
    const suggestions = this.getSuggestions(rowIndex, header);
    this.dropdownSuggestions = suggestions;
    this.selectedSuggestionIndex = -1;
  }

  onKeyDown(event: KeyboardEvent, rowIndex: number, header: string): void {
    if (!this.isDropdownVisible(rowIndex, header)) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          this.dropdownSuggestions.length - 1
        );
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        break;
      case 'Enter':
        event.preventDefault();
        if (this.selectedSuggestionIndex >= 0 && this.selectedSuggestionIndex < this.dropdownSuggestions.length) {
          this.selectSuggestion(this.dropdownSuggestions[this.selectedSuggestionIndex], rowIndex, header);
        }
        break;
      case 'Escape':
        event.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  selectSuggestion(suggestion: Suggestion, rowIndex: number, header: string): void {
    this.updateCell(rowIndex, header, suggestion.label);
    this.closeDropdown();
  }

  // ====================
  // AFFICHAGE ET HELPERS
  // ====================

  trackByHeader(_: number, header: string): string {
    return header;
  }

  trackByRow(index: number): number {
    return index;
  }

  getPlaceholder(header: string): string {
    const placeholders: Record<string, string> = {
      'nom': 'Ex: Alami',
      'prenom': 'Ex: Ahmed',
      'cne': 'Ex: R123456789',
      'cin': 'Ex: AB123456',
      'apogee': 'Ex: 12345678',
      'promotion_name': 'Ex: 1ère année',
      'group_title': 'Ex: Groupe 1',
      'option_name': 'Ex: Option 1'
    };
    return placeholders[header] || 'Saisir une valeur';
  }

  getHeaderDisplayName(header: string): string {
    const displayNames: Record<string, string> = {
      'nom': 'Nom',
      'prenom': 'Prénom',
      'cne': 'CNE',
      'cin': 'CIN',
      'apogee': 'Code Apogée',
      'promotion_name': 'Promotion',
      'group_title': 'Groupe',
      'option_name': 'Option'
    };
    return displayNames[header] || header;
  }

  getColumnWidth(header: string): string {
    const columnWidths: Record<string, string> = {
      'nom': '150px',
      'prenom': '150px',
      'cne': '140px',
      'cin': '120px',
      'apogee': '140px',
      'promotion_name': '180px',
      'group_title': '140px',
      'option_name': '160px'
    };
    return columnWidths[header] || '150px';
  }

  hasInvalidCells(): boolean {
    return Object.keys(this.invalidCells).some(rowIndex => 
      Object.values(this.invalidCells[parseInt(rowIndex)]).some(isInvalid => isInvalid)
    );
  }

  getInvalidCellsCount(): number {
    let count = 0;
    Object.keys(this.invalidCells).forEach(rowIndex => {
      Object.values(this.invalidCells[parseInt(rowIndex)]).forEach(isInvalid => {
        if (isInvalid) count++;
      });
    });
    return count;
  }

  getValidCellsCount(): number {
    let count = 0;
    Object.keys(this.invalidCells).forEach(rowIndex => {
      Object.values(this.invalidCells[parseInt(rowIndex)]).forEach(isInvalid => {
        if (!isInvalid) count++;
      });
    });
    return count;
  }

  getTotalCellsCount(): number {
    let count = 0;
    Object.keys(this.invalidCells).forEach(rowIndex => {
      count += Object.keys(this.invalidCells[parseInt(rowIndex)]).length;
    });
    return count;
  }

  isRowInvalid(rowIndex: number): boolean {
    const rowInvalidMap = this.invalidCells[rowIndex];
    if (!rowInvalidMap) return false;
    return Object.values(rowInvalidMap).some(isInvalid => !!isInvalid);
  }

  isRowValid(rowIndex: number): boolean {
    return !this.isRowInvalid(rowIndex);
  }

  hasRowSuggestions(rowIndex: number): boolean {
    return this.tableHeaders.some(header => 
      this.getSuggestions(rowIndex, header).length > 0 && this.isCellInvalid(rowIndex, header)
    );
  }

  clearTable(): void {
    this.fileName = '';
    this.tableHeaders = [];
    this.tableRows = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.suggestionsByCell = {};
    this.invalidCells = {};
  }

  // Helper pour déterminer si un étudiant est présent
  isStudentPresent(student: AttendanceRapideStudent): boolean {
    if (typeof student.present === 'boolean') {
      return student.present;
    }
    return student.status === 'present';
  }

  // ====================
  // IMPORTATION
  // ====================

  importList(): void {
    if (this.hasInvalidCells()) {
      this.errorMessage = 'Veuillez corriger toutes les erreurs avant de procéder à l\'importation.';
      return;
    }

    if (!this.importForm.valid) {
      this.errorMessage = 'Veuillez remplir tous les champs de configuration.';
      return;
    }

    this.isImporting = true;
    this.errorMessage = '';

    const formValues = this.importForm.value;
    
    // Créer un fichier Excel temporaire avec les données corrigées
    const worksheet = utils.json_to_sheet(this.tableRows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Students');
    
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const file = new File([blob], 'students_import.xlsx', { type: blob.type });

    this.attendanceRapideService.importList({
      file: file,
      etablissement_id: formValues.etablissement_id,
      ville_id: formValues.ville_id
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isImporting = false;
          if (response.success) {
            this.successMessage = response.message || 'Liste importée avec succès !';
            this.notificationService.successMessage('Liste importée avec succès !');
            this.clearTable();
            this.showImportSection = false;
          } else {
            this.errorMessage = response.message || 'Erreur lors de l\'importation.';
            this.notificationService.errorMessage('Erreur lors de l\'importation');
          }
        },
        error: (err) => {
          this.isImporting = false;
          console.error('Erreur lors de l\'importation:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de l\'importation.';
          this.notificationService.errorMessage('Erreur lors de l\'importation');
        }
      });
  }

  // ====================
  // RÉCUPÉRATION DES DONNÉES (MODE CONSULTATION)
  // ====================

  loadAttendanceData(): void {
    const formValues = this.importForm.value;
    
    if (!formValues.etablissement_id || !formValues.date || 
        !formValues.heure_debut || !formValues.heure_fin || !formValues.ville_id) {
      this.notificationService.warningMessage('Veuillez remplir tous les champs de configuration');
      return;
    }

    this.loading = true;
    this.hasTriedToLoad = true;
    this.errorMessage = '';

    this.attendanceRapideService.lancerRecuperation({
      etablissement_id: formValues.etablissement_id,
      date: formValues.date,
      heure_debut: formValues.heure_debut,
      heure_fin: formValues.heure_fin,
      ville_id: formValues.ville_id
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: AttendanceRapideResponse) => {
          this.loading = false;
          if (response.success && response.data) {
            // Vérifier si data est de type AttendanceRapideLancerResponse (a students)
            const lancerData = response.data as any;
            if (lancerData.students) {
              this.students = lancerData.students || [];
              this.totalStudents = this.students.length;
              
              // Calculer présents/absents en fonction de la propriété disponible
              this.presentCount = this.students.filter(s => 
                s.present === true || s.status === 'present'
              ).length;
              this.absentCount = this.students.filter(s => 
                s.present === false || s.status === 'absent'
              ).length;

              if (this.students.length === 0) {
                this.notificationService.warningMessage('Aucun étudiant trouvé');
              } else {
                this.notificationService.successMessage(`${this.students.length} étudiant(s) trouvé(s)`);
              }
            } else {
              this.errorMessage = 'Format de réponse inattendu';
              this.students = [];
              this.totalStudents = 0;
              this.presentCount = 0;
              this.absentCount = 0;
            }
          } else {
            this.errorMessage = response.message || 'Aucune donnée trouvée';
            this.students = [];
            this.totalStudents = 0;
            this.presentCount = 0;
            this.absentCount = 0;
          }
        },
        error: (err) => {
          this.loading = false;
          console.error('Erreur lors de la récupération des données:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la récupération des données';
          this.notificationService.errorMessage('Erreur lors de la récupération des données');
          this.students = [];
          this.totalStudents = 0;
          this.presentCount = 0;
          this.absentCount = 0;
        }
      });
  }
}
