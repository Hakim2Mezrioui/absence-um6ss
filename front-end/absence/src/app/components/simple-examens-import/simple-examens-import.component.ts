import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { read, utils, WorkBook, write, writeFile } from 'xlsx';
import { ExamensService } from '../../services/examens.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';

interface ExamenRow { [key: string]: string; }

interface Suggestion { label: string; id?: number; }

interface ReferenceEntry { label: string; normalized: string; id?: number; }

interface ImportResult {
  success: boolean;
  message: string;
  details?: {
    total?: number;
    created?: number;
    updated?: number;
    errors?: number;
  };
  error_details?: Array<{
    line: number;
    message: string;
    suggestions?: any;
  }>;
}

interface FilterOptions {
  etablissements?: Array<{ id: number; name: string }>;
  promotions?: Array<{ id: number; name: string }>;
  salles?: Array<{ id: number; name: string }>;
  options?: Array<{ id: number; name: string }>;
  groups?: Array<{ id: number; name: string; title?: string }>;
  villes?: Array<{ id: number; name: string }>;
  typesExamen?: Array<{ id: number; name: string }>;
}

@Component({
  selector: 'app-simple-examens-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simple-examens-import.component.html',
  styleUrls: ['./simple-examens-import.component.css']
})
export class SimpleExamensImportComponent implements OnInit, OnDestroy {
  readonly templateHeaders = [
    'title', 'date', 'heure_debut_poigntage', 'hour_debut', 'hour_fin', 'tolerance',
    'etablissement_name', 'promotion_name', 'type_examen_name', 'salle_name',
    'group_title', 'ville_name', 'option_name', 'annee_universitaire'
  ];

  readonly relationHeaders = [
    'etablissement_name','promotion_name','type_examen_name','salle_name','group_title','ville_name','option_name'
  ];

  fileName = '';
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isImporting = false;
  isDragging = false;

  referenceError = '';
  filterOptions: FilterOptions | null = null;
  importResult: ImportResult | null = null;

  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;

  // Propriétés pour le débogage
  fileInfo: {
    name: string;
    size: number;
    type: string;
    lastModified: Date;
    sheetCount: number;
    dataRange: string;
    rowCount: number;
  } | null = null;

  // Propriété pour afficher les options disponibles
  showAvailableOptions = false;

  tableHeaders: string[] = [];
  tableRows: ExamenRow[] = [];

  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};
  private validationTimers: Record<string, any> = {};
  private readonly debounceMs = 200;

  constructor(
    private examensService: ExamensService,
    private authService: AuthService,
    private userContextService: UserContextService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.initializeUserContext();
    this.loadReferenceData();
  }

  ngOnDestroy(): void {
    // Clear any pending validation timers
    Object.values(this.validationTimers).forEach((t) => clearTimeout(t));
    this.validationTimers = {};
  }

  initializeUserContext() {
    this.currentUser = this.authService.getCurrentUser();
    this.userContext = this.userContextService.getCurrentUserContext();
    
    if (this.currentUser) {
      this.isSuperAdmin = this.currentUser.role_id === 1;
      this.isAdminEtablissement = [2, 3, 4, 6].includes(this.currentUser.role_id);
      
      console.log('🔐 Contexte utilisateur initialisé (simple-examens-import):', {
        user: this.currentUser.email,
        role_id: this.currentUser.role_id,
        isSuperAdmin: this.isSuperAdmin,
        isAdminEtablissement: this.isAdminEtablissement,
        ville_id: this.currentUser.ville_id,
        etablissement_id: this.currentUser.etablissement_id
      });
    }
  }

  downloadTemplate(): void {
    const rows = [
      this.templateHeaders,
      ['Examen de Math', '15/01/2024', '08:45', '09:00', '11:00', '15', 'Université A', 'Promotion 1', 'Contrôle', 'C401, C501', 'Groupe A, Groupe B', 'Rabat', 'Option 1', '2024-2025'],
      ['Examen de Physique', '16/01/2024', '13:45', '14:00', '16:00', '10', 'Université B', 'Promotion 2', 'Final', 'C201, C202, C203', 'Groupe B, Groupe C', 'Casablanca', 'Option 2', '2024-2025']
    ];
    const worksheet = utils.aoa_to_sheet(rows);
    
    // Définir la largeur des colonnes pour une meilleure lisibilité
    const colWidths = [
      { wch: 20 }, // title
      { wch: 12 }, // date
      { wch: 12 }, // heure_debut_poigntage
      { wch: 10 }, // hour_debut
      { wch: 10 }, // hour_fin
      { wch: 10 }, // tolerance
      { wch: 20 }, // etablissement_name
      { wch: 15 }, // promotion_name
      { wch: 15 }, // type_examen_name
      { wch: 25 }, // salle_name (augmenté pour plusieurs salles)
      { wch: 20 }, // group_title (augmenté pour plusieurs groupes)
      { wch: 15 }, // ville_name
      { wch: 15 }, // option_name
      { wch: 15 }  // annee_universitaire
    ];
    worksheet['!cols'] = colWidths;
    
    // Définir la plage de données pour éviter les problèmes de lecture
    const range = utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: this.templateHeaders.length - 1, r: rows.length - 1 }
    });
    worksheet['!ref'] = range;
    
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Examens');
    
    // Ajouter des métadonnées pour identifier le fichier comme modèle
    workbook.Props = {
      Title: 'Modèle d\'importation des examens',
      Subject: 'Template pour l\'importation des données d\'examens',
      Author: 'Système de gestion des absences',
      CreatedDate: new Date()
    };
    
    writeFile(workbook, 'modele_import_examens.xlsx');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.handleFile(file);
      input.value = '';
    }
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

  addEmptyRow(): void {
    if (!this.tableHeaders.length) {
      this.tableHeaders = [...this.templateHeaders];
    }
    const newRow: Record<string, string> = {};
    this.tableHeaders.forEach((h) => (newRow[h] = ''));
    this.tableRows = [...this.tableRows, newRow];
    this.validateRows();
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      this.handleFile(file);
    }
  }

  private handleFile(file: File): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        
        // Options améliorées pour la lecture Excel
        const workbook: WorkBook = read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        // Choisir automatiquement la première feuille NON vide (au moins 1 ligne de données)
        let targetSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[targetSheetName];
        let rows: any[][] = [];
        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (!ws || !ws['!ref']) continue;
          const probe = utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true, blankrows: false });
          // au moins 2 lignes: 1 header + 1 data
          if (probe.length >= 2 && probe.some((r, idx) => idx > 0 && r.some((c: any) => (c ?? '').toString().trim() !== ''))) {
            targetSheetName = name;
            worksheet = ws;
            rows = probe;
            break;
          }
        }
        // Si le scan n'a pas trouvé, utiliser la première feuille telle quelle
        if (!worksheet || !worksheet['!ref']) {
          throw new Error('La feuille Excel est vide ou inaccessible.');
        }
        if (!rows.length) {
          rows = utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: true, blankrows: false });
        }
        
        // Capturer les informations du fichier
        this.fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
          sheetCount: workbook.SheetNames.length,
          dataRange: worksheet['!ref'] || 'Aucune',
          rowCount: rows.length
        };

        if (!rows.length) {
          throw new Error('Le fichier est vide.');
        }

        const [headerRow, ...dataRows] = rows;
        
        // Nettoyer et valider les en-têtes
        this.tableHeaders = headerRow.map((header, index) => {
          const cleanHeader = String(header || '').trim();
          if (!cleanHeader) {
            return `colonne_${index + 1}`;
          }
          return cleanHeader;
        });

        // Traiter les données avec préservation des types date/heure
        this.tableRows = dataRows.map((row, rowIndex) => {
          const rowObject: ExamenRow = {};
          this.tableHeaders.forEach((header, index) => {
            let cellValue = row[index];
            
            // Détecter le type de colonne basé sur le nom
            const headerLower = header.toLowerCase();
            const isDateColumn = headerLower.includes('date');
            const isTimeColumn = headerLower.includes('heure') || headerLower.includes('hour') || headerLower.includes('time');
            
            if (cellValue === null || cellValue === undefined) {
              cellValue = '';
            } else if (isDateColumn) {
              // Gérer les dates
              if (cellValue instanceof Date) {
                cellValue = this.formatDateLocal(cellValue); // YYYY-MM-DD en local
              } else if (typeof cellValue === 'number') {
                // Date Excel en format serial (nombre de jours depuis 1900-01-01)
                // Excel compte le 1er janvier 1900 comme jour 1, mais JavaScript compte depuis 1970
                // Correction: Excel a un bug connu (considère 1900 comme année bissextile)
                const excelEpoch = new Date(1899, 11, 30); // 30 décembre 1899
                const date = new Date(excelEpoch.getTime() + (cellValue - 1) * 86400000);
                cellValue = this.formatDateLocal(date);
              } else {
                // Si c'est déjà une string, utiliser formatDate pour normaliser
                cellValue = this.formatDate(String(cellValue).trim());
              }
            } else if (isTimeColumn) {
              // Gérer les heures
              if (cellValue instanceof Date) {
                // Extraire seulement l'heure
                const hours = cellValue.getHours().toString().padStart(2, '0');
                const minutes = cellValue.getMinutes().toString().padStart(2, '0');
                const seconds = cellValue.getSeconds().toString().padStart(2, '0');
                cellValue = `${hours}:${minutes}:${seconds}`;
              } else if (typeof cellValue === 'number') {
                // Heure Excel en format décimal (0.5 = 12:00:00, 0.25 = 06:00:00)
                const totalSeconds = Math.round(cellValue * 86400);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                cellValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
              } else {
                // Si c'est déjà une string, utiliser formatTime pour normaliser
                cellValue = this.formatTime(String(cellValue).trim());
              }
            } else {
              // Autres colonnes : conversion standard
              if (typeof cellValue === 'number') {
                cellValue = cellValue.toString();
              } else {
                cellValue = String(cellValue).trim();
              }
            }
            
            rowObject[header] = cellValue;
          });
          
          return rowObject;
        });

        // Filtrer les lignes complètement vides
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
        console.error('Stack trace:', error.stack);
        this.errorMessage = error?.message || 'Impossible de lire le fichier. Assurez-vous qu\'il s\'agit d\'un fichier Excel valide et qu\'il contient des données.';
        this.tableHeaders = [];
        this.tableRows = [];
      } finally {
        this.isProcessing = false;
      }
    };

    reader.onerror = (error) => {
      console.error('Erreur de lecture du fichier:', error);
      this.isProcessing = false;
      this.errorMessage = 'Erreur lors de la lecture du fichier. Vérifiez que le fichier n\'est pas corrompu.';
    };

    reader.readAsArrayBuffer(file);
  }

  trackByHeader(_: number, header: string): string { return header; }
  trackByRow(index: number): number { return index; }

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
    // Debounce validation to avoid blocking UI on every keystroke
    this.validationTimers[timerKey] = setTimeout(() => {
    this.validateCell(rowIndex, header);
      delete this.validationTimers[timerKey];
    }, this.debounceMs);
  }

  clearTable(): void {
    this.fileName = '';
    this.tableHeaders = [];
    this.tableRows = [];
    this.errorMessage = '';
    this.successMessage = '';
    this.importResult = null;
    this.suggestionsByCell = {};
    this.invalidCells = {};
    this.fileInfo = null;
  }

  toggleAvailableOptions(): void {
    this.showAvailableOptions = !this.showAvailableOptions;
  }

  getAvailableOptions(): any {
    if (!this.filterOptions) return null;
    
    return {
      etablissements: this.filterOptions.etablissements?.map(e => e.name) || [],
      promotions: this.filterOptions.promotions?.map(p => p.name) || [],
      salles: this.filterOptions.salles?.map(s => s.name) || [],
      options: this.filterOptions.options?.map(o => o.name) || [],
      groups: this.filterOptions.groups?.map(g => g.title) || [],
      villes: this.filterOptions.villes?.map(v => v.name) || [],
      typesExamen: this.filterOptions.typesExamen?.map(t => t.name) || []
    };
  }

  getSuggestions(rowIndex: number, header: string): Suggestion[] { return this.suggestionsByCell[rowIndex]?.[header] ?? []; }
  isCellInvalid(rowIndex: number, header: string): boolean { return !!this.invalidCells[rowIndex]?.[header]; }
  applySuggestion(rowIndex: number, header: string, suggestion: Suggestion): void {
    const suggestionLabel = suggestion.label || '';

    // Cas spécial pour salle_name et group_title : gérer plusieurs valeurs séparées par virgule
    if (header === 'salle_name' || header === 'group_title') {
      // Suggestion spéciale : supprimer les doublons
      if (suggestionLabel === 'Supprimer les doublons') {
        const current = this.tableRows[rowIndex]?.[header] || '';
        const parts = current.split(',').map(p => p.trim()).filter(p => p.length > 0);

        const deduped = Array.from(
          new Map(
            parts
              .filter(Boolean)
              .map(v => [v.toLowerCase(), v])
          ).values()
        );

        const newValue = deduped.join(', ');
        this.updateCell(rowIndex, header, newValue);
        return;
      }

      // Nettoyer le label pour retirer "(pour "xxx")"
      const baseLabel = suggestionLabel.replace(/\s*\(pour\s+"[^"]*"\)\s*$/i, '').trim();

      const current = this.tableRows[rowIndex]?.[header] || '';
      const parts = current.split(',').map(p => p.trim()).filter(p => p.length > 0);

      // Tenter de cibler le token concerné si indiqué dans le label "(pour "xxx")"
      const match = suggestionLabel.match(/\(pour\s+"([^"]+)"\)/i);
      const target = match?.[1]?.trim().toLowerCase();

      let replaced = false;
      const updated = parts.map(p => {
        if (!replaced && target && p.toLowerCase() === target) {
          replaced = true;
          return baseLabel;
        }
        return p;
      });

      // Si on n'a pas remplacé (token introuvable), on ajoute la valeur proposée
      if (!replaced) {
        updated.push(baseLabel);
      }

      // Supprimer les doublons (insensible à la casse) avant de reconstruire la valeur
      const deduped = Array.from(
        new Map(
          updated
            .filter(Boolean)
            .map(v => [v.toLowerCase(), v]) // clé normalisée, valeur originale
        ).values()
      );

      const newValue = deduped.join(', ');
      this.updateCell(rowIndex, header, newValue);
      return;
    }

    // Cas général (autres colonnes)
    this.updateCell(rowIndex, header, suggestionLabel);
  }

  getPlaceholder(header: string): string {
    const placeholders: Record<string, string> = {
      'title': 'Ex: Examen de Math',
      'date': 'Ex: 15/01/2024',
      'heure_debut_poigntage': 'Ex: 08:45',
      'hour_debut': 'Ex: 09:00',
      'hour_fin': 'Ex: 11:00',
      'tolerance': 'Ex: 15',
      'etablissement_name': 'Ex: Université A',
      'promotion_name': 'Ex: Promotion 1',
      'type_examen_name': 'Ex: Contrôle',
      'salle_name': 'Ex: C401, C501 (séparées par virgule)',
      'group_title': 'Ex: Groupe A, Groupe B (séparés par virgule) ou "Tous"',
      'ville_name': 'Ex: Rabat',
      'option_name': 'Ex: Option 1',
      'annee_universitaire': 'Ex: 2024-2025'
    };
    return placeholders[header] || 'Saisir une valeur';
  }

  getHeaderDisplayName(header: string): string {
    const displayNames: Record<string, string> = {
      'title': 'Titre',
      'date': 'Date',
      'heure_debut_poigntage': 'Heure début pointage',
      'hour_debut': 'Heure début',
      'hour_fin': 'Heure fin',
      'tolerance': 'Tolérance (min)',
      'etablissement_name': 'Établissement',
      'promotion_name': 'Promotion',
      'type_examen_name': 'Type d\'examen',
      'salle_name': 'Salle',
      'group_title': 'Groupe',
      'ville_name': 'Ville',
      'option_name': 'Option',
      'annee_universitaire': 'Année universitaire'
    };
    return displayNames[header] || header;
  }

  showFullValue(value: string | undefined): boolean {
    const text = (value ?? '').trim();
    return text.length > 12;
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

  getInvalidColumnsCount(): number {
    const invalidColumns = new Set<string>();
    Object.keys(this.invalidCells).forEach(rowIndex => {
      Object.keys(this.invalidCells[parseInt(rowIndex)]).forEach(header => {
        if (this.invalidCells[parseInt(rowIndex)][header]) {
          invalidColumns.add(header);
        }
      });
    });
    return invalidColumns.size;
  }

  getValidColumnsCount(): number {
    const validColumns = new Set<string>();
    Object.keys(this.invalidCells).forEach(rowIndex => {
      Object.keys(this.invalidCells[parseInt(rowIndex)]).forEach(header => {
        if (!this.invalidCells[parseInt(rowIndex)][header]) {
          validColumns.add(header);
        }
      });
    });
    return validColumns.size;
  }

  isRowInvalid(rowIndex: number): boolean {
    const rowInvalidMap = this.invalidCells[rowIndex];
    if (!rowInvalidMap) return false;
    return Object.values(rowInvalidMap).some(isInvalid => !!isInvalid);
  }

  isRowValid(rowIndex: number): boolean {
    return !this.isRowInvalid(rowIndex);
  }

  getRowsWithErrors(): ExamenRow[] {
    return this.tableRows.filter((_, index) => this.isRowInvalid(index));
  }

  getRowsWithErrorsIndices(): number[] {
    return this.tableRows
      .map((_, index) => index)
      .filter(index => this.isRowInvalid(index));
  }

  hasAnyErrors(): boolean {
    return this.tableRows.some((_, index) => this.isRowInvalid(index));
  }

  isColumnInvalid(header: string): boolean {
    return this.tableRows.some((_, index) => this.isCellInvalid(index, header));
  }

  hasRowSuggestions(rowIndex: number): boolean {
    return this.tableHeaders.some(header => 
      this.getSuggestions(rowIndex, header).length > 0 && this.isCellInvalid(rowIndex, header)
    );
  }

  getColumnWidth(header: string): string {
    const columnWidths: Record<string, string> = {
      'title': '280px',
      'date': '150px',
      'heure_debut_poigntage': '180px',
      'hour_debut': '130px',
      'hour_fin': '130px',
      'tolerance': '140px',
      'etablissement_name': '320px',  // Augmenté pour les noms longs
      'promotion_name': '200px',
      'type_examen_name': '200px',
      'salle_name': '220px',  // Augmenté pour supporter plusieurs salles (C401, C501, 506)
      'group_title': '220px',  // Augmenté pour supporter plusieurs groupes (Groupe A, Groupe B)
      'ville_name': '160px',
      'option_name': '180px',
      'annee_universitaire': '200px'
    };
    return columnWidths[header] || '200px';
  }

  getMinColumnWidth(header: string): string {
    // Retourne la largeur minimale (même valeur que getColumnWidth)
    // Permet aux colonnes de s'étendre selon le contenu
    return this.getColumnWidth(header);
  }

  importExamens(): void {
    if (this.hasInvalidCells()) {
      this.errorMessage = 'Veuillez corriger toutes les erreurs avant de procéder à l\'importation.';
      return;
    }

    this.isImporting = true;
    this.importResult = null;
    this.errorMessage = '';

    // Préparer les données pour l'importation
    const examensData = this.tableRows.map(row => {
      const examen: any = {
        title: row['title'] || '',
        date: this.formatDate(row['date'] || ''),
        heure_debut_poigntage: this.formatTime(row['heure_debut_poigntage'] || ''),
        heure_debut: this.formatTime(row['hour_debut'] || ''),
        heure_fin: this.formatTime(row['hour_fin'] || ''),
        tolerance: parseInt((row['tolerance'] || '15').toString(), 10) || 15,
        etablissement_name: row['etablissement_name'] || '',
        promotion_name: row['promotion_name'] || '',
        type_examen_name: row['type_examen_name'] || '',
        salle_name: row['salle_name'] || '',
        group_title: row['group_title'] || '',
        ville_name: row['ville_name'] || '',
        option_name: row['option_name'] || '',
        annee_universitaire: row['annee_universitaire'] || ''
      };

      // Convertir les noms en IDs si possible
      if (this.filterOptions) {
        // Fonction de correspondance flexible pour gérer les variations de noms
        const findEtablissement = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.etablissements?.find(e => 
            this.normalize(e.name) === normalizedName ||
            this.normalize(e.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(e.name))
          );
        };

        const findPromotion = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          
          // Recherche exacte d'abord
          let found = this.filterOptions?.promotions?.find(p => 
            this.normalize(p.name) === normalizedName
          );
          
          // Si pas trouvé, recherche partielle
          if (!found) {
            found = this.filterOptions?.promotions?.find(p => {
              const normalizedPromotion = this.normalize(p.name);
              return normalizedPromotion.includes(normalizedName) || 
                     normalizedName.includes(normalizedPromotion) ||
                     // Recherche par chiffre initial (ex: "4ème" -> "4ème année")
                     (normalizedName.match(/^\d+/) && normalizedPromotion.match(/^\d+/) && 
                      normalizedName.match(/^\d+/)?.[0] === normalizedPromotion.match(/^\d+/)?.[0]);
            });
          }
          
          return found;
        };

        const findTypeExamen = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.typesExamen?.find(t => 
            this.normalize(t.name) === normalizedName ||
            this.normalize(t.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(t.name))
          );
        };

        const findSalle = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.salles?.find(s => 
            this.normalize(s.name) === normalizedName ||
            this.normalize(s.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(s.name))
          );
        };

        const findGroup = (title: string): { id: number | null; title?: string; name?: string } | null | undefined => {
          if (!title) return null;
          const normalizedTitle = this.normalize(title);
          // Cas spécial : "Tous" signifie tous les groupes de la promo
          if (normalizedTitle === 'tous') {
            return { id: null, title: 'Tous' };
          }
          return this.filterOptions?.groups?.find(g => {
            const groupTitle = g.title || g.name;
            return this.normalize(groupTitle) === normalizedTitle ||
                   this.normalize(groupTitle).includes(normalizedTitle) ||
                   normalizedTitle.includes(this.normalize(groupTitle));
          });
        };

        const findVille = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.villes?.find(v => 
            this.normalize(v.name) === normalizedName ||
            this.normalize(v.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(v.name))
          );
        };

        const findOption = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.options?.find(o => 
            this.normalize(o.name) === normalizedName ||
            this.normalize(o.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(o.name))
          );
        };

        const etablissement = findEtablissement(examen.etablissement_name);
        const promotion = findPromotion(examen.promotion_name);
        const typeExamen = findTypeExamen(examen.type_examen_name);
        
        // Parser les salles séparées par virgule
        const salleNames = this.parseSalleNames(examen.salle_name);
        const salleIds: number[] = [];
        salleNames.forEach((salleName: string) => {
          const salle = findSalle(salleName);
          if (salle) {
            salleIds.push(salle.id);
          }
        });
        
        const group = findGroup(examen.group_title);
        const ville = findVille(examen.ville_name);
        const option = findOption(examen.option_name);

        // Assigner les IDs
        if (etablissement) {
          examen.etablissement_id = etablissement.id;
        }
        
        if (promotion) {
          examen.promotion_id = promotion.id;
        }
        
        if (typeExamen) {
          examen.type_examen_id = typeExamen.id;
        }
        
        // Gérer plusieurs salles
        if (salleIds.length > 0) {
          examen.salle_id = salleIds[0]; // Première salle pour compatibilité
          // Ne pas inclure salle_ids dans le fichier Excel (Excel ne peut pas stocker des tableaux)
          // Le backend va parser salle_name depuis le fichier Excel et créer salle_ids automatiquement
        }
        
        if (group) {
          if (group.id) {
            examen.group_id = group.id as any;
          }
          // Si "Tous" (id null), on laisse group_id vide et group_title='Tous'
          // Le backend interprète group_id vide + group_title='Tous' comme tous les groupes
        }
        
        if (ville) {
          examen.ville_id = ville.id;
        }
        
        if (option) {
          examen.option_id = option.id;
        }
        
        // NE PAS supprimer salle_name - il doit rester dans le fichier Excel
        // Le backend va lire salle_name depuis le fichier Excel (ex: "C401, C501, 506")
        // et le parser pour créer salle_ids automatiquement
        // delete examen.salle_name; // ❌ À RETIRER
      }

      return examen;
    });

    // Créer un fichier Excel temporaire pour l'importation
    const worksheet = utils.json_to_sheet(examensData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Examens');
    
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const formData = new FormData();
    formData.append('file', blob, 'examens_import.xlsx');

    this.examensService.importExamens(formData).subscribe({
      next: (response) => {
        this.isImporting = false;
        
        // Déterminer si l'importation est réussie ou non
        const hasErrors = response.summary?.errors > 0 || response.error_details?.length > 0;
        
        this.importResult = {
          success: !hasErrors,
          message: response.message || (hasErrors ? 'Importation terminée avec des erreurs' : 'Importation réussie !'),
          details: {
            total: response.summary?.total_processed || response.total,
            created: response.summary?.created || response.created,
            updated: response.summary?.updated || response.updated,
            errors: response.summary?.errors || response.errors
          },
          error_details: response.error_details
        };
        
        if (hasErrors) {
          this.errorMessage = `Importation terminée avec ${response.summary?.errors || response.error_details?.length || 0} erreur(s).`;
          // Toast d'erreur
          this.toastr.warning(
            `Importation terminée avec ${response.summary?.errors || response.error_details?.length || 0} erreur(s).`,
            'Importation avec erreurs',
            {
              timeOut: 5000,
              positionClass: 'toast-top-right'
            }
          );
        } else {
        this.successMessage = 'Importation terminée avec succès.';
          // Toast de succès
          const totalCreated = response.summary?.created || response.created || 0;
          const totalUpdated = response.summary?.updated || response.updated || 0;
          const message = totalCreated > 0 || totalUpdated > 0 
            ? `Importation réussie ! ${totalCreated} examen(s) créé(s), ${totalUpdated} mis à jour.`
            : 'Importation terminée avec succès !';
          
          this.toastr.success(
            message,
            'Importation réussie',
            {
              timeOut: 4000,
              positionClass: 'toast-top-right'
            }
          );
          
          // Redirection vers la page des examens après un délai
          setTimeout(() => {
            this.router.navigate(['/examens']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Erreur lors de l\'importation:', error);
        this.importResult = {
          success: false,
          message: error.error?.message || 'Erreur lors de l\'importation des examens.'
        };
        this.errorMessage = 'Erreur lors de l\'importation.';
        
        // Toast d'erreur
        this.toastr.error(
          error.error?.message || 'Erreur lors de l\'importation des examens.',
          'Erreur d\'importation',
          {
            timeOut: 5000,
            positionClass: 'toast-top-right'
          }
        );
      }
    });
  }

  private loadReferenceData(): void {
    this.examensService.getFilterOptions().subscribe({
      next: (options) => {
        this.filterOptions = options;
        this.prepareReferenceData(options);
        if (this.tableRows.length) {
          this.validateRows();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des références:', error);
        this.referenceError = 'Impossible de charger les références (établissements, promotions, etc.). Les suggestions seront indisponibles.';
      }
    });
  }

  private prepareReferenceData(options: FilterOptions): void {
    // Filtrer les salles selon le rôle et l'établissement
    let filteredSalles = options.salles || [];
    if (!this.isSuperAdmin && this.currentUser) {
      filteredSalles = filteredSalles.filter((salle: any) => {
        return salle.etablissement_id === this.currentUser!.etablissement_id && 
               salle.ville_id === this.currentUser!.ville_id;
      });
      
      console.log('🔒 Filtrage des salles pour l\'import:', {
        etablissementId: this.currentUser.etablissement_id,
        villeId: this.currentUser.ville_id,
        sallesOriginales: (options.salles || []).length,
        sallesFiltrees: filteredSalles.length
      });
    }

    this.referenceData = {
      etablissement_name: (options.etablissements || []).map(e => this.toReferenceEntry(e.name, e.id)),
      promotion_name: (options.promotions || []).map(p => this.toReferenceEntry(p.name, p.id)),
      type_examen_name: (options.typesExamen || []).map(t => this.toReferenceEntry(t.name, t.id)),
      salle_name: filteredSalles.map(s => this.toReferenceEntry(s.name, s.id)),
      group_title: [
        { label: 'Tous', normalized: 'tous', id: -1 }, // option globale pour tous les groupes
        ...(options.groups || []).map(g => this.toReferenceEntry(g.title || g.name, (g as any).id))
      ],
      ville_name: (options.villes || []).map(v => this.toReferenceEntry(v.name, v.id)),
      option_name: (options.options || []).map(o => this.toReferenceEntry(o.name, o.id))
    };
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

    // Cas spécial pour group_title : accepter "Tous" comme valeur valide
    if (header === 'group_title' && this.normalize(value) === 'tous') {
      this.suggestionsByCell[rowIndex][header] = [];
      this.invalidCells[rowIndex][header] = false;
      return;
    }

    const referenceEntries = this.referenceData[header];

    if (!referenceEntries || referenceEntries.length === 0) {
      this.suggestionsByCell[rowIndex][header] = [];
      this.invalidCells[rowIndex][header] = false;
      return;
    }

    // Cas spécial pour salle_name et group_title : valider plusieurs valeurs séparées par virgule
    if ((header === 'salle_name' || header === 'group_title') && value.includes(',')) {
      const valueNames =
        header === 'salle_name'
          ? this.parseSalleNames(value)
          : this.parseGroupTitles(value);

      let allValid = true;
      const allSuggestions: Suggestion[] = [];

      valueNames.forEach((val: string) => {
        const { isValid, suggestions } = this.computeSuggestions(referenceEntries, val);
        if (!isValid) {
          allValid = false;
          // Ajouter les suggestions pour cette valeur
          if (suggestions.length > 0) {
            allSuggestions.push(
              ...suggestions.map(s => ({ ...s, label: `${s.label} (pour "${val}")` }))
            );
          }
        }
      });

      // Détection de redondance (doublons) dans les valeurs
      const seen: Record<string, number> = {};
      let hasDuplicates = false;
      valueNames.forEach((val: string) => {
        const key = this.normalize(val);
        seen[key] = (seen[key] || 0) + 1;
        if (seen[key] > 1) {
          hasDuplicates = true;
        }
      });

      const suggestions: Suggestion[] = [];

      // Ajouter une suggestion spéciale pour supprimer les doublons
      if (hasDuplicates) {
        suggestions.push({
          label: 'Supprimer les doublons',
        });
      }

      // Suggestions de correspondance (valeurs non trouvées)
      if (!allValid) {
        suggestions.push(...allSuggestions.slice(0, 5));
      }

      this.suggestionsByCell[rowIndex][header] = suggestions;
      this.invalidCells[rowIndex][header] = hasDuplicates || !allValid;
    } else {
      // Validation normale pour les autres champs ou une seule valeur
      const { isValid, suggestions } = this.computeSuggestions(referenceEntries, value);
      this.suggestionsByCell[rowIndex][header] = suggestions;
      this.invalidCells[rowIndex][header] = !isValid;
    }
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

    // Correspondance exacte
    const exactMatch = reference.find((entry) => entry.normalized === normalized);
    if (exactMatch) {
      return { isValid: true, suggestions: [] };
    }

    // Détection spéciale pour les salles : si la valeur est uniquement numérique
    // Chercher les salles qui contiennent ce nombre (ex: "506" -> "C506", "A506", etc.)
    const isNumericOnly = /^\d+$/.test(value);
    let enhancedCandidates: ReferenceEntry[] = [];
    
    if (isNumericOnly) {
      // Chercher les salles qui se terminent par ce nombre ou le contiennent
      enhancedCandidates = reference.filter((entry) => {
        // Extraire le nombre de la salle (ex: "C506" -> "506")
        const entryNumber = entry.normalized.replace(/^[a-z]+/i, ''); // Enlever les lettres au début
        return entryNumber === normalized || entry.normalized.includes(normalized);
      });
    }

    // Fast path: for very short inputs, avoid expensive scoring
    if (normalized.length < 3) {
      const quick = reference
        .filter((entry) => entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized))
        .slice(0, 5)
        .map((entry) => this.toSuggestion(entry));
      
      // Si on a des candidats améliorés (pour les nombres), les prioriser
      if (enhancedCandidates.length > 0) {
        const enhancedSuggestions = enhancedCandidates
          .slice(0, 5)
          .map((entry) => this.toSuggestion(entry));
        return { isValid: false, suggestions: enhancedSuggestions };
      }
      
      // If we have an exact match, it's valid; otherwise suggest without heavy work
      return { isValid: false, suggestions: quick.length ? quick : reference.slice(0, 5).map((e) => this.toSuggestion(e)) };
    }

    // Reduce work: try quick candidates first, then score a limited subset
    const quickCandidates = reference.filter((entry) =>
      entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized) || normalized.includes(entry.normalized)
    );

    // Combiner les candidats rapides avec les candidats améliorés (pour les nombres)
    const allCandidates = [...new Set([...enhancedCandidates, ...quickCandidates])];
    const pool = allCandidates.length ? allCandidates : reference.slice(0, Math.min(300, reference.length));

    const numMatch = (s: string): string | null => {
      const m = s.match(/\d+/);
      return m ? m[0] : null;
    };
    const termNum = numMatch(normalized);
    const scored = pool.map((entry) => {
      let score = 0;
      
      // Bonus très élevé si c'est un nombre et que la salle contient ce nombre
      if (isNumericOnly && termNum) {
        const entryNumber = entry.normalized.replace(/^[a-z]+/i, '');
        if (entryNumber === termNum) {
          score += 100; // Score très élevé pour correspondance exacte du nombre
        } else if (entry.normalized.includes(termNum)) {
          score += 80; // Score élevé si le nombre est contenu
        }
      }
      
      if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) {
        score += 50;
      }
      if (entry.normalized.startsWith(normalized)) {
        score += 20;
      }
      const distance = this.levenshteinDistance(normalized, entry.normalized);
      score += Math.max(0, 40 - distance * 10);
      
      // Bonus fort si chiffre initial identique (ex: 2 vs 2eme annee)
      const entryNum = numMatch(entry.normalized);
      if (termNum && entryNum && termNum === entryNum) {
        score += 60;
      }
      
      return { entry, score };
    }).filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    
    // Ne valider que les correspondances exactes (déjà vérifiées ligne 918-921)
    // Pour tout le reste, afficher des suggestions même avec un score élevé
    const baseCandidates = scored.length ? scored : reference.slice(0, 3);

    const suggestions = baseCandidates
      .slice(0, 5)
      .map((item) => this.toSuggestion('entry' in item ? item.entry : item));

    return { isValid: false, suggestions };
  }

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

  // Parser les noms de salles séparés par virgule
  private parseSalleNames(salleNamesString: string): string[] {
    if (!salleNamesString || !salleNamesString.trim()) {
      return [];
    }
    return salleNamesString
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);
  }

  // Parser les titres de groupes séparés par virgule
  private parseGroupTitles(groupTitlesString: string): string[] {
    if (!groupTitlesString || !groupTitlesString.trim()) {
      return [];
    }
    return groupTitlesString
      .split(',')
      .map(title => title.trim())
      .filter(title => title.length > 0);
  }

  // Formater une date en local (pas UTC) pour éviter le décalage d'un jour
  private formatDateLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateString;
    }
    return this.formatDateLocal(date);
  }

  private formatTime(timeString: string): string {
    if (!timeString) return '';
    const t = timeString.trim().replace(/\s/g, '');
    if (/^\d{1,2}:\d{2}$/.test(t)) {
      return t + ':00'.substring(t.length - 5 ? 0 : 0);
    }
    if (/^\d{1,2}h\d{2}$/.test(t)) {
      return t.replace('h', ':') + ':00';
    }
    if (/^\d{1,2}\.\d{2}$/.test(t)) {
      return t.replace('.', ':') + ':00';
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(t)) {
      return t;
    }
    return t;
  }
}