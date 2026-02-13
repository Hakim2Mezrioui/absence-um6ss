import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { read, utils, WorkBook, writeFile, write } from 'xlsx';
import { CoursService, Cours } from '../../services/cours.service';
import { AuthService, User } from '../../services/auth.service';
import { UserContextService, UserContext } from '../../services/user-context.service';

interface CoursRow {
  [key: string]: string;
}

interface Suggestion {
  label: string;
  id?: number;
}

interface ReferenceEntry {
  label: string;
  normalized: string;
  id?: number;
}

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
  types_cours?: Array<{ id: number; name: string }>;
  enseignants?: Array<{ id: number; name: string; email?: string }>;
}

@Component({
  selector: 'app-simple-cours-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simple-cours-import.component.html',
  styleUrls: ['./simple-cours-import.component.css']
})
export class SimpleCoursImportComponent implements OnInit, OnDestroy {
  readonly templateHeaders = [
    'title',
    'date',
    'hour_debut_poigntage',
    'hour_debut',
    'hour_fin',
    'tolerance',
    'attendance_mode',
    'exit_capture_window',
    'etablissement_name',
    'promotion_name',
    'type_cours_name',
    'salle_name',
    'group_title',
    'ville_name',
    'option_name',
    'enseignant_name',
    'annee_universitaire'
  ];

  readonly relationHeaders = [
    'etablissement_name',
    'promotion_name',
    'type_cours_name',
    'salle_name',
    'group_title',
    'ville_name',
    'option_name',
    'enseignant_name'
  ];

  fileName = '';
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isImporting = false;
  isDragging = false;

  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;

  referenceError = '';
  filterOptions: FilterOptions | null = null;
  importResult: ImportResult | null = null;

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
  tableRows: CoursRow[] = [];

  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};
  private validationTimers: Record<string, any> = {};
  private readonly debounceMs = 200;

  constructor(
    private coursService: CoursService,
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
      
      console.log('🔐 Contexte utilisateur initialisé (simple-cours-import):', {
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
    // Utiliser les données réelles de la base de données si disponibles
    const getFirstValue = (arr: any[] | undefined, field: string = 'name'): string => {
      if (!arr || arr.length === 0) return 'Exemple';
      return arr[0][field] || arr[0].title || arr[0].name || 'Exemple';
    };

    const getSecondValue = (arr: any[] | undefined, field: string = 'name'): string => {
      if (!arr || arr.length < 2) return getFirstValue(arr, field);
      return arr[1][field] || arr[1].title || arr[1].name || 'Exemple';
    };

    // Obtenir les valeurs réelles ou des valeurs par défaut
    const etablissement1 = getFirstValue(this.filterOptions?.etablissements);
    const etablissement2 = getSecondValue(this.filterOptions?.etablissements);
    const promotion1 = getFirstValue(this.filterOptions?.promotions);
    const promotion2 = getSecondValue(this.filterOptions?.promotions);
    const typeCours1 = getFirstValue(this.filterOptions?.types_cours);
    const typeCours2 = getSecondValue(this.filterOptions?.types_cours);
    const salle1 = getFirstValue(this.filterOptions?.salles);
    const salle2 = getSecondValue(this.filterOptions?.salles);
    const groupe1 = getFirstValue(this.filterOptions?.groups, 'title');
    const groupe2 = getSecondValue(this.filterOptions?.groups, 'title');
    const ville1 = getFirstValue(this.filterOptions?.villes);
    const ville2 = getSecondValue(this.filterOptions?.villes);
    const option1 = getFirstValue(this.filterOptions?.options);
    const option2 = getSecondValue(this.filterOptions?.options);
    const enseignant1 = getFirstValue(this.filterOptions?.enseignants);
    const enseignant2 = getSecondValue(this.filterOptions?.enseignants);

    // Date du jour + quelques jours pour les exemples
    const today = new Date();
    const date1 = new Date(today);
    date1.setDate(today.getDate() + 1);
    const date2 = new Date(today);
    date2.setDate(today.getDate() + 2);
    
    // Année universitaire actuelle (format YYYY-YYYY)
    const currentYear = new Date().getFullYear();
    const anneeUniv = `${currentYear}-${currentYear + 1}`;

    const rows = [
      this.templateHeaders,
      [
        'Chimie Analytique Instrumentale -TP',
        date1.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        '07:45',
        '08:00',
        '10:00',
        '00:15',
        'normal',
        '0',
        etablissement1,
        promotion1,
        typeCours1,
        salle1 + (salle2 ? `, ${salle2}` : ''),
        groupe1,
        ville1,
        option1 || '',
        enseignant1 || '',
        anneeUniv
      ],
      [
        'Microbiologie - TP',
        date2.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        '09:45',
        '10:00',
        '12:00',
        '00:15',
        'bicheck',
        '15',
        etablissement2 || etablissement1,
        promotion2 || promotion1,
        typeCours2 || typeCours1,
        salle2 || salle1,
        groupe2 || groupe1,
        ville2 || ville1,
        option2 || option1 || '',
        enseignant2 || enseignant1 || '',
        anneeUniv
      ]
    ];

    const worksheet = utils.aoa_to_sheet(rows);
    
    // Définir la largeur des colonnes pour une meilleure lisibilité
    const colWidths = [
      { wch: 20 }, // title
      { wch: 12 }, // date
      { wch: 15 }, // hour_debut_poigntage
      { wch: 10 }, // hour_debut
      { wch: 10 }, // hour_fin
      { wch: 10 }, // tolerance
      { wch: 12 }, // attendance_mode
      { wch: 12 }, // exit_capture_window
      { wch: 20 }, // etablissement_name
      { wch: 15 }, // promotion_name
      { wch: 15 }, // type_cours_name
      { wch: 20 }, // salle_name (augmenté pour plusieurs salles)
      { wch: 12 }, // group_title
      { wch: 15 }, // ville_name
      { wch: 15 }, // option_name
      { wch: 20 }, // enseignant_name
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
    utils.book_append_sheet(workbook, worksheet, 'Cours');
    
    // Ajouter des métadonnées pour identifier le fichier comme modèle
    workbook.Props = {
      Title: 'Modèle d\'importation des cours',
      Subject: 'Template pour l\'importation des données de cours',
      Author: 'Système de gestion des absences',
      CreatedDate: new Date()
    };
    
    writeFile(workbook, 'modele_import_cours.xlsx');
  }

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
          const rowObject: CoursRow = {};
          this.tableHeaders.forEach((header, index) => {
            let cellValue = row[index];
            
            // Détecter le type de colonne basé sur le nom
            const headerLower = header.toLowerCase();
            const isDateColumn = headerLower.includes('date');
            const isTimeColumn = headerLower.includes('heure') || headerLower.includes('hour') || headerLower.includes('time') || headerLower.includes('poigntage');
            
            if (cellValue === null || cellValue === undefined) {
              cellValue = '';
            } else if (isDateColumn) {
              // Gérer les dates
              if (cellValue instanceof Date) {
                // Utiliser les méthodes locales pour éviter le décalage de timezone
                const year = cellValue.getFullYear();
                const month = (cellValue.getMonth() + 1).toString().padStart(2, '0');
                const day = cellValue.getDate().toString().padStart(2, '0');
                cellValue = `${year}-${month}-${day}`; // YYYY-MM-DD
              } else if (typeof cellValue === 'number') {
                // Date Excel en format serial (nombre de jours depuis 1900-01-01)
                // Excel compte le 1er janvier 1900 comme jour 1, mais il y a un bug Excel (1900 considéré comme bissextile)
                const excelEpoch = new Date(1899, 11, 30); // 30 décembre 1899
                const date = new Date(excelEpoch.getTime() + (cellValue - 1) * 86400000);
                // Utiliser les méthodes locales pour éviter le décalage de timezone
                const year = date.getFullYear();
                const month = (date.getMonth() + 1).toString().padStart(2, '0');
                const day = date.getDate().toString().padStart(2, '0');
                cellValue = `${year}-${month}-${day}`;
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
            } else if (headerLower === 'tolerance') {
              // Gestion spécifique pour la colonne tolerance
              if (cellValue instanceof Date) {
                // Extraire seulement l'heure au format HH:MM (sans secondes)
                const hours = cellValue.getHours().toString().padStart(2, '0');
                const minutes = cellValue.getMinutes().toString().padStart(2, '0');
                cellValue = `${hours}:${minutes}`;
              } else if (typeof cellValue === 'number') {
                // Détecter si c'est un nombre simple (minutes) ou un format décimal Excel
                if (cellValue < 1) {
                  // Format décimal Excel (fraction de jour) : 0.010416666666666666 = 00:15:00
                  const totalSeconds = Math.round(cellValue * 86400);
                  const hours = Math.floor(totalSeconds / 3600);
                  const minutes = Math.floor((totalSeconds % 3600) / 60);
                  cellValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } else {
                  // Nombre simple = minutes : 15 = 15 minutes = 00:15
                  const totalMinutes = Math.floor(cellValue);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  cellValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                }
              } else {
                // Si c'est une string, vérifier si c'est un nombre simple
                const strValue = String(cellValue).trim();
                // Si c'est un nombre simple (ex: "15"), le convertir en minutes
                if (/^\d+$/.test(strValue)) {
                  const totalMinutes = parseInt(strValue, 10);
                  const hours = Math.floor(totalMinutes / 60);
                  const minutes = totalMinutes % 60;
                  cellValue = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
                } else {
                  // Sinon, utiliser tel quel (sera formaté par formatTolerance plus tard)
                  cellValue = strValue;
                }
              }
            } else if (headerLower === 'exit_capture_window') {
              // Gestion spécifique pour la colonne exit_capture_window (nombre de minutes)
              if (cellValue instanceof Date) {
                // Si Excel a converti en Date, extraire les minutes depuis l'heure
                // Ex: Date avec 00:15:00 = 15 minutes
                const totalMinutes = cellValue.getHours() * 60 + cellValue.getMinutes();
                cellValue = totalMinutes.toString();
              } else if (typeof cellValue === 'number') {
                // Si c'est un nombre, garder tel quel (déjà en minutes)
                // Mais s'assurer que c'est un entier valide (0-120)
                const minutes = Math.max(0, Math.min(120, Math.floor(cellValue)));
                cellValue = minutes.toString();
              } else {
                // Si c'est une string, parser comme nombre de minutes
                const strValue = String(cellValue).trim();
                // Si c'est un nombre simple (ex: "15"), garder tel quel
                if (/^\d+$/.test(strValue)) {
                  const minutes = parseInt(strValue, 10);
                  // Valider la plage (0-120 minutes)
                  const validMinutes = Math.max(0, Math.min(120, minutes));
                  cellValue = validMinutes.toString();
                } else {
                  // Sinon, essayer d'extraire les chiffres
                  const digits = strValue.replace(/\D/g, '');
                  if (digits) {
                    const minutes = parseInt(digits, 10);
                    const validMinutes = Math.max(0, Math.min(120, minutes));
                    cellValue = validMinutes.toString();
                  } else {
                    cellValue = '0'; // Valeur par défaut
                  }
                }
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
    if (file) {
      // Créer un événement artificiel pour utiliser la méthode existante
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      input.files = dataTransfer.files;
      const fakeEvent = { target: input } as any;
      this.onFileSelected(fakeEvent);
    }
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
      groups: this.filterOptions.groups?.map(g => g.title || g.name) || [],
      villes: this.filterOptions.villes?.map(v => v.name) || [],
      types_cours: this.filterOptions.types_cours?.map(t => t.name) || [],
      enseignants: this.filterOptions.enseignants?.map(e => e.name) || []
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
      'title': 'Ex: Cours de Mathématiques',
      'date': 'Ex: 15/01/2024',
      'hour_debut': 'Ex: 08:00',
      'hour_fin': 'Ex: 10:00',
      'tolerance': 'Ex: 00:15',
      'attendance_mode': 'Ex: normal ou bicheck',
      'exit_capture_window': 'Ex: 15',
      'etablissement_name': 'Ex: Université A',
      'promotion_name': 'Ex: Promotion 1',
      'type_cours_name': 'Ex: Cours Magistral',
      'salle_name': 'Ex: C401, C501 (séparées par virgule)',
      'group_title': 'Ex: Groupe A, Groupe B (séparés par virgule) ou "Tous"',
      'ville_name': 'Ex: Casablanca',
      'option_name': 'Ex: Option 1',
      'annee_universitaire': 'Ex: 2024-2025'
    };
    return placeholders[header] || 'Saisir une valeur';
  }

  getHeaderDisplayName(header: string): string {
    const displayNames: Record<string, string> = {
      'title': 'Titre du cours',
      'date': 'Date',
      'hour_debut': 'Heure début',
      'hour_fin': 'Heure fin',
      'tolerance': 'Tolérance',
      'attendance_mode': 'Mode de pointage',
      'exit_capture_window': 'Fenêtre sortie (min)',
      'etablissement_name': 'Établissement',
      'promotion_name': 'Promotion',
      'type_cours_name': 'Type de cours',
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
    // Afficher l'aperçu si la valeur dépasse 12 caractères
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

  getRowsWithErrors(): CoursRow[] {
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
    // Comportement standard : une ligne a des suggestions si au moins une cellule
    // possède des suggestions ET est marquée invalide.
    return this.tableHeaders.some(header =>
      this.getSuggestions(rowIndex, header).length > 0 && this.isCellInvalid(rowIndex, header)
    );
  }

  getColumnWidth(header: string): string {
    const columnWidths: Record<string, string> = {
      'title': '520px',
      'date': '240px',
      'hour_debut': '200px',
      'hour_fin': '200px',
      'tolerance': '160px',
      'etablissement_name': '220px',
      'promotion_name': '180px',
      'type_cours_name': '160px',
      'salle_name': '220px',   // Augmenté pour supporter plusieurs salles (C401, C501, 506)
      'group_title': '220px',  // Augmenté pour supporter plusieurs groupes (Groupe A, Groupe B)
      'ville_name': '140px',
      'option_name': '160px',
      'annee_universitaire': '180px'
    };
    return columnWidths[header] || '180px';
  }

  getMinColumnWidth(header: string): string {
    // Retourne la largeur minimale (même valeur que getColumnWidth)
    return this.getColumnWidth(header);
  }

  getColumnMinWidth(header: string): string {
    const minWidths: Record<string, string> = {
      'title': '480px',
      'date': '220px',
      'hour_debut': '180px',
      'hour_fin': '180px',
      'hour_debut_poigntage': '200px'
    };
    return minWidths[header] || '140px';
  }

  importCours(): void {
    if (this.hasInvalidCells()) {
      this.errorMessage = 'Veuillez corriger toutes les erreurs avant de procéder à l\'importation.';
      return;
    }

    this.isImporting = true;
    this.importResult = null;
    this.errorMessage = '';

    // Préparer les données pour l'importation
    const coursData = this.tableRows.map(row => {
      const normalizedMode = ((row['attendance_mode'] || 'normal').toString().toLowerCase().trim());
      const attendanceMode = normalizedMode === 'bicheck' || normalizedMode === 'bi-check' ? 'bicheck' : 'normal';
      const rawExitWindow = parseInt((row['exit_capture_window'] || '').toString(), 10);
      const exitWindowValue = !isNaN(rawExitWindow) ? rawExitWindow : 0;

      const cours: any = {
        name: row['title'] || '',
        date: this.formatDate(row['date'] || ''),
        heure_debut: this.formatTime(row['hour_debut'] || ''),
        heure_fin: this.formatTime(row['hour_fin'] || ''),
        tolerance: this.formatTime(row['tolerance'] || '00:15'),
        // Utiliser hour_debut_poigntage si fourni, sinon utiliser hour_debut comme fallback
        pointage_start_hour: this.formatTime(row['hour_debut_poigntage'] || row['hour_debut'] || ''),
        attendance_mode: attendanceMode,
        exit_capture_window: attendanceMode === 'bicheck' ? (exitWindowValue || 15) : 0,
        etablissement_name: row['etablissement_name'] || '',
        promotion_name: row['promotion_name'] || '',
        type_cours_name: row['type_cours_name'] || '',
        salle_name: row['salle_name'] || '',
        group_title: row['group_title'] || '',
        ville_name: row['ville_name'] || '',
        option_name: row['option_name'] || '',
        enseignant_name: row['enseignant_name'] || '',
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

        const findTypeCours = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.types_cours?.find(t => 
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

        const findGroup = (title: string) => {
          if (!title) return null;
          const normalizedTitle = this.normalize(title);
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

        const findEnseignant = (nameOrEmail: string) => {
          if (!nameOrEmail) return null;
          const normalized = this.normalize(nameOrEmail);
          
          // Recherche par nom complet ou email
          return this.filterOptions?.enseignants?.find(e => {
            const normalizedName = this.normalize(e.name);
            const normalizedEmail = e.email ? this.normalize(e.email) : '';
            
            return normalizedName === normalized ||
                   normalizedName.includes(normalized) ||
                   normalized.includes(normalizedName) ||
                   (normalizedEmail && (normalizedEmail === normalized || normalizedEmail.includes(normalized)));
          });
        };

        const etablissement = findEtablissement(cours.etablissement_name);
        const promotion = findPromotion(cours.promotion_name);
        const typeCours = findTypeCours(cours.type_cours_name);
        
        // Parser les salles séparées par virgule
        const salleNames = this.parseSalleNames(cours.salle_name);
        const salleIds: number[] = [];
        salleNames.forEach((salleName: string) => {
          const salle = findSalle(salleName);
          if (salle) {
            salleIds.push(salle.id);
          }
        });
        
        // Parser les groupes à partir de group_title (ex: "Groupe A, Groupe B")
        const rawGroupTitle = cours.group_title || '';
        let groupIds: number[] = [];

        // Cas spécial : "Tous" = tous les groupes (on ne force pas group_ids)
        if (this.normalize(rawGroupTitle) !== 'tous') {
          const titles = this.parseGroupTitles(rawGroupTitle);
          const effectiveTitles = titles.length > 0 ? titles : (rawGroupTitle ? [rawGroupTitle] : []);

          effectiveTitles.forEach(title => {
            const g = findGroup(title);
            if (g && typeof g.id === 'number') {
              groupIds.push(g.id);
            }
          });
        }

        const ville = findVille(cours.ville_name);
        const option = findOption(cours.option_name);
        const enseignant = findEnseignant(cours.enseignant_name);

        // Assigner les IDs
        if (etablissement) {
          cours.etablissement_id = etablissement.id;
        }
        
        if (promotion) {
          cours.promotion_id = promotion.id;
        }
        
        if (typeCours) {
          cours.type_cours_id = typeCours.id;
        }
        
        // Gérer plusieurs salles
        if (salleIds.length > 0) {
          cours.salle_id = salleIds[0]; // Première salle pour compatibilité
          // Ne pas inclure salle_ids dans les données JSON (le backend va parser salle_name)
          // Le backend va parser salle_name et créer salle_ids automatiquement
        }
        
        // Gérer les groupes (multi-groupes)
        if (groupIds.length > 0) {
          // Compatibilité : un group_id principal
          (cours as any).group_id = groupIds[0];
          // Et la version many-to-many pour le back-end
          (cours as any).group_ids = groupIds;
        }
        
        if (ville) {
          cours.ville_id = ville.id;
        }
        
        if (option) {
          cours.option_id = option.id;
        }
        
        if (enseignant) {
          cours.enseignant_id = enseignant.id;
        }
        
        // NE PAS supprimer salle_name - le backend en a besoin pour parser toutes les salles
        // Le backend va lire salle_name depuis les données JSON (ex: "C401, C501, 506")
        // et le parser pour créer salle_ids automatiquement
        // delete cours.salle_name; // ❌ À RETIRER
      }

      return cours;
    });

    // Envoyer les données JSON directement au lieu d'un fichier Excel
    const formData = new FormData();
    formData.append('data', JSON.stringify(coursData));

    this.coursService.importCours(formData).subscribe({
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
            ? `Importation réussie ! ${totalCreated} cours créé(s), ${totalUpdated} mis à jour.`
            : 'Importation terminée avec succès !';
          
          this.toastr.success(
            message,
            'Importation réussie',
            {
              timeOut: 4000,
              positionClass: 'toast-top-right'
            }
          );
          
          // Redirection vers la page des cours après un délai
          setTimeout(() => {
            this.router.navigate(['/cours']);
          }, 2000);
        }
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Erreur lors de l\'importation:', error);
        this.importResult = {
          success: false,
          message: error.error?.message || 'Erreur lors de l\'importation des cours.'
        };
        this.errorMessage = 'Erreur lors de l\'importation.';
        
        // Toast d'erreur
        this.toastr.error(
          error.error?.message || 'Erreur lors de l\'importation des cours.',
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
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
        console.log('🔍 Réponse complète de getFilterOptions:', {
          hasEnseignants: !!options.enseignants,
          enseignantsType: Array.isArray(options.enseignants) ? 'array' : typeof options.enseignants,
          enseignantsLength: Array.isArray(options.enseignants) ? options.enseignants.length : 'N/A',
          enseignantsSample: Array.isArray(options.enseignants) ? options.enseignants.slice(0, 3) : options.enseignants,
          allKeys: Object.keys(options)
        });
        this.filterOptions = options;
        this.prepareReferenceData(options);
        if (this.tableRows.length) {
          this.validateRows();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des références:', error);
        this.referenceError = 'Impossible de charger les références (promotions, établissements, etc.). Les suggestions seront indisponibles.';
      }
    });
  }

  private prepareReferenceData(options: FilterOptions): void {
    // Log pour déboguer les options reçues
    console.log('📥 Options reçues dans prepareReferenceData:', {
      hasEnseignants: !!options.enseignants,
      enseignantsCount: options.enseignants?.length || 0,
      enseignantsSample: options.enseignants?.slice(0, 3) || [],
      allKeys: Object.keys(options)
    });
    
    // IMPORTANT : pour les suggestions, on ne filtre PLUS les salles par rôle / contexte.
    // On utilise toutes les salles renvoyées par l'API, afin que les propositions fonctionnent
    // de la même manière pour super-admin, scolarité et admin établissement.
    const allSalles = options.salles || [];

    this.referenceData = {
      etablissement_name: (options.etablissements || []).map((e) => this.toReferenceEntry(e.name, e.id)),
      promotion_name: (options.promotions || []).map((p) => this.toReferenceEntry(p.name, p.id)),
      type_cours_name: (options.types_cours || []).map((t) => this.toReferenceEntry(t.name, t.id)),
      salle_name: allSalles.map((s) => {
        const entry = this.toReferenceEntry(s.name, s.id);
        if (!entry) {
          console.warn('⚠️ Salle invalide ignorée:', s);
        }
        return entry;
      }).filter(entry => entry !== null && entry !== undefined),
      group_title: (options.groups || []).map((g) => this.toReferenceEntry(g.title || g.name, g.id)),
      ville_name: (options.villes || []).map((v) => this.toReferenceEntry(v.name, v.id)),
      option_name: (options.options || []).map((o) => this.toReferenceEntry(o.name, o.id)),
      enseignant_name: (options.enseignants || []).flatMap((e) => {
        // Vérifier que l'enseignant a les propriétés nécessaires
        if (!e || !e.name || !e.id) {
          console.warn('⚠️ Enseignant invalide ignoré:', e);
          return [];
        }
        // Créer plusieurs entrées pour recherche flexible : une pour le nom, une pour l'email
        const nameEntry = this.toReferenceEntry(e.name, e.id);
        const entries = nameEntry ? [nameEntry] : [];
        // Ajouter aussi l'email comme entrée séparée pour permettre la recherche par email
        if (e.email) {
          const emailEntry = this.toReferenceEntry(e.email, e.id);
          if (emailEntry) {
            entries.push(emailEntry);
          }
        }
        return entries;
      }).filter(entry => entry !== null && entry !== undefined)
    };
    
    // Log pour déboguer les enseignants et salles
    const enseignantsArray = options.enseignants || [];
    const enseignantsRefArray = this.referenceData['enseignant_name'] || [];
    const sallesRefArray = this.referenceData['salle_name'] || [];
    console.log('📚 Données de référence chargées:', {
      role_id: this.currentUser?.role_id,
      isScolarite: this.currentUser?.role_id === 4,
      enseignants: {
        total: enseignantsArray.length,
        referenceEntries: enseignantsRefArray.length,
        sample: enseignantsRefArray.slice(0, 3).map(e => e?.label)
      },
      salles: {
        total: allSalles.length,
        referenceEntries: sallesRefArray.length,
        sample: sallesRefArray.slice(0, 3).map(e => e?.label)
      },
      allReferenceDataKeys: Object.keys(this.referenceData)
    });
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

    // Cas spécial pour enseignant_name : accepter tout nom saisi sans vérification DB
    if (header === 'enseignant_name') {
      this.suggestionsByCell[rowIndex][header] = [];
      this.invalidCells[rowIndex][header] = false;
      return;
    }

    // Utiliser la notation bracket pour enseignant_name (TypeScript requirement)
    const referenceEntries = header === 'enseignant_name' 
      ? this.referenceData['enseignant_name']
      : this.referenceData[header];

    if (!referenceEntries || referenceEntries.length === 0) {
      // Log spécial pour enseignant_name et salle_name si pas de données
      if (header === 'enseignant_name' || header === 'salle_name') {
        console.warn(`⚠️ Pas de données de référence pour ${header} [ligne ${rowIndex + 1}]:`, {
          header,
          role_id: this.currentUser?.role_id,
          isScolarite: this.currentUser?.role_id === 4,
          referenceDataKeys: Object.keys(this.referenceData),
          hasKey: header in this.referenceData,
          referenceDataLength: this.referenceData[header]?.length || 0,
          referenceDataType: typeof this.referenceData[header],
          isArray: Array.isArray(this.referenceData[header]),
          filterOptionsCount: header === 'enseignant_name' 
            ? (this.filterOptions?.enseignants?.length || 0)
            : (this.filterOptions?.salles?.length || 0)
        });
      }
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
        // Cas spécial pour group_title : accepter "Tous" comme valeur valide
        if (header === 'group_title' && this.normalize(val) === 'tous') {
          // "Tous" est valide, pas besoin de suggestions
          return;
        }
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
      // Validation normale pour les autres champs ou une seule salle
      const { isValid, suggestions } = this.computeSuggestions(referenceEntries, value);
      this.suggestionsByCell[rowIndex][header] = suggestions;
      this.invalidCells[rowIndex][header] = !isValid;
      
      // Log de débogage pour enseignant_name et salle_name
      if (header === 'enseignant_name' || header === 'salle_name') {
        console.log(`🔍 Validation ${header} [ligne ${rowIndex + 1}]:`, {
          value,
          isValid,
          suggestionsCount: suggestions.length,
          referenceEntriesCount: referenceEntries.length,
          suggestions: suggestions.slice(0, 3).map(s => s.label),
          role_id: this.currentUser?.role_id,
          isScolarite: this.currentUser?.role_id === 4
        });
      }
    }
  }

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
      // Vérifier la correspondance exacte avant de retourner
      const exactMatchQuick = reference.find((entry) => entry.normalized === normalized);
      if (exactMatchQuick) {
        return { isValid: true, suggestions: [] };
      }
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
    
    // Ne valider que les correspondances exactes (déjà vérifiées ligne 956-959)
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

  // Formater une date
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    // Essayer différents formats de date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Format français DD/MM/YYYY
      const parts = dateString.split('/');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
      return dateString;
    }
    
    // Utiliser les méthodes locales pour éviter le décalage de timezone
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // Formater une heure
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
