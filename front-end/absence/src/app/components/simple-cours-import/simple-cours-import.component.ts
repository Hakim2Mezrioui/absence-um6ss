import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
}

interface FilterOptions {
  etablissements?: Array<{ id: number; name: string }>;
  promotions?: Array<{ id: number; name: string }>;
  salles?: Array<{ id: number; name: string }>;
  options?: Array<{ id: number; name: string }>;
  groups?: Array<{ id: number; name: string; title: string }>;
  villes?: Array<{ id: number; name: string }>;
  types_cours?: Array<{ id: number; name: string }>;
}

@Component({
  selector: 'app-simple-cours-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simple-cours-import.component.html',
  styleUrls: ['./simple-cours-import.component.css']
})
export class SimpleCoursImportComponent implements OnInit {
  readonly templateHeaders = [
    'title',
    'date',
    'hour_debut',
    'hour_fin',
    'tolerance',
    'etablissement_name',
    'promotion_name',
    'type_cours_name',
    'salle_name',
    'group_title',
    'ville_name',
    'option_name',
    'annee_universitaire'
  ];

  readonly relationHeaders = [
    'etablissement_name',
    'promotion_name',
    'type_cours_name',
    'salle_name',
    'group_title',
    'ville_name',
    'option_name'
  ];

  fileName = '';
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isImporting = false;

  // User context and role management
  currentUser: User | null = null;
  userContext: UserContext | null = null;
  isSuperAdmin = false;
  isAdminEtablissement = false;

  referenceError = '';
  filterOptions: FilterOptions | null = null;
  importResult: ImportResult | null = null;

  tableHeaders: string[] = [];
  tableRows: CoursRow[] = [];

  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};

  constructor(
    private coursService: CoursService,
    private authService: AuthService,
    private userContextService: UserContextService
  ) {}

  ngOnInit(): void {
    this.initializeUserContext();
    this.loadReferenceData();
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
    const rows = [
      this.templateHeaders,
      ['Cours de Mathématiques', '15/01/2024', '08:00', '10:00', '00:15', 'Université A', 'Promotion 1', 'Cours Magistral', 'Salle A1', 'Groupe A', 'Casablanca', 'Option 1', '2024-2025'],
      ['Cours de Physique', '16/01/2024', '10:00', '12:00', '00:15', 'Université B', 'Promotion 2', 'TD', 'Salle B2', 'Groupe B', 'Rabat', 'Option 2', '2024-2025']
    ];

    const worksheet = utils.aoa_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Cours');
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
        const workbook: WorkBook = read(data, { type: 'array' });
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        const rows = utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });

        if (!rows.length) {
          throw new Error('Le fichier est vide.');
        }

        const [headerRow, ...dataRows] = rows;
        this.tableHeaders = headerRow.map((header) => header.toString());
        this.tableRows = dataRows.map((row) => {
          const rowObject: CoursRow = {};
          this.tableHeaders.forEach((header, index) => {
            rowObject[header] = row[index] ?? '';
          });
          return rowObject;
        });

        if (!this.tableRows.length) {
          this.successMessage = 'Le fichier a été importé, mais aucune donnée n\'a été trouvée.';
        } else {
          this.successMessage = `${this.tableRows.length} ligne(s) chargée(s) avec succès.`;
        }

        this.validateRows();
      } catch (error: any) {
        console.error('Erreur lors de la lecture du fichier:', error);
        this.errorMessage = error?.message || 'Impossible de lire le fichier. Assurez-vous qu\'il s\'agit d\'un fichier Excel valable.';
        this.tableHeaders = [];
        this.tableRows = [];
      } finally {
        this.isProcessing = false;
      }
    };

    reader.onerror = () => {
      this.isProcessing = false;
      this.errorMessage = 'Erreur lors de la lecture du fichier.';
    };

    reader.readAsArrayBuffer(file);
  }

  trackByHeader(_: number, header: string): string {
    return header;
  }

  trackByRow(index: number): number {
    return index;
  }

  updateCell(rowIndex: number, header: string, value: string): void {
    if (!this.tableRows[rowIndex]) {
      return;
    }
    this.tableRows[rowIndex] = {
      ...this.tableRows[rowIndex],
      [header]: value
    };
    this.validateCell(rowIndex, header);
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
  }

  getSuggestions(rowIndex: number, header: string): Suggestion[] {
    return this.suggestionsByCell[rowIndex]?.[header] ?? [];
  }

  isCellInvalid(rowIndex: number, header: string): boolean {
    return !!this.invalidCells[rowIndex]?.[header];
  }

  applySuggestion(rowIndex: number, header: string, suggestion: Suggestion): void {
    const value = suggestion.label;
    this.updateCell(rowIndex, header, value);
  }

  getPlaceholder(header: string): string {
    const placeholders: Record<string, string> = {
      'title': 'Ex: Cours de Mathématiques',
      'date': 'Ex: 15/01/2024',
      'hour_debut': 'Ex: 08:00',
      'hour_fin': 'Ex: 10:00',
      'tolerance': 'Ex: 00:15',
      'etablissement_name': 'Ex: Université A',
      'promotion_name': 'Ex: Promotion 1',
      'type_cours_name': 'Ex: Cours Magistral',
      'salle_name': 'Ex: Salle A1',
      'group_title': 'Ex: Groupe A',
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
      const cours: any = {
        name: row['title'] || '',
        date: this.formatDate(row['date'] || ''),
        heure_debut: this.formatTime(row['hour_debut'] || ''),
        heure_fin: this.formatTime(row['hour_fin'] || ''),
        tolerance: this.formatTime(row['tolerance'] || '00:15'),
        pointage_start_hour: this.formatTime(row['hour_debut'] || ''),
        etablissement_name: row['etablissement_name'] || '',
        promotion_name: row['promotion_name'] || '',
        type_cours_name: row['type_cours_name'] || '',
        salle_name: row['salle_name'] || '',
        group_title: row['group_title'] || '',
        ville_name: row['ville_name'] || '',
        option_name: row['option_name'] || '',
        annee_universitaire: row['annee_universitaire'] || ''
      };

      // Convertir les noms en IDs si possible
      if (this.filterOptions) {
        const etablissement = this.filterOptions.etablissements?.find(e => e.name === cours.etablissement_name);
        const promotion = this.filterOptions.promotions?.find(p => p.name === cours.promotion_name);
        const typeCours = this.filterOptions.types_cours?.find(t => t.name === cours.type_cours_name);
        const salle = this.filterOptions.salles?.find(s => s.name === cours.salle_name);
        const group = this.filterOptions.groups?.find(g => g.title === cours.group_title);
        const ville = this.filterOptions.villes?.find(v => v.name === cours.ville_name);
        const option = this.filterOptions.options?.find(o => o.name === cours.option_name);

        if (etablissement) cours.etablissement_id = etablissement.id;
        if (promotion) cours.promotion_id = promotion.id;
        if (typeCours) cours.type_cours_id = typeCours.id;
        if (salle) cours.salle_id = salle.id;
        if (group) cours.group_id = group.id;
        if (ville) cours.ville_id = ville.id;
        if (option) cours.option_id = option.id;
      }

      return cours;
    });

    // Créer un fichier Excel temporaire pour l'importation
    const worksheet = utils.json_to_sheet(coursData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Cours');
    
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const formData = new FormData();
    formData.append('file', blob, 'cours_import.xlsx');

    this.coursService.importCours(formData).subscribe({
      next: (response) => {
        this.isImporting = false;
        this.importResult = {
          success: true,
          message: response.message || 'Importation réussie !',
          details: {
            total: response.total,
            created: response.created,
            updated: response.updated,
            errors: response.errors
          }
        };
        this.successMessage = 'Importation terminée avec succès.';
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Erreur lors de l\'importation:', error);
        this.importResult = {
          success: false,
          message: error.error?.message || 'Erreur lors de l\'importation des cours.'
        };
        this.errorMessage = 'Erreur lors de l\'importation.';
      }
    });
  }

  private loadReferenceData(): void {
    this.coursService.getFilterOptions().subscribe({
      next: (options) => {
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
    // Filtrer les salles selon le rôle et l'établissement
    let filteredSalles = options.salles || [];
    if (!this.isSuperAdmin && this.currentUser) {
      filteredSalles = filteredSalles.filter((salle: any) => {
        return salle.etablissement_id === this.currentUser!.etablissement_id && 
               salle.ville_id === this.currentUser!.ville_id;
      });
      
      console.log('🔒 Filtrage des salles pour l\'import cours:', {
        etablissementId: this.currentUser.etablissement_id,
        villeId: this.currentUser.ville_id,
        sallesOriginales: (options.salles || []).length,
        sallesFiltrees: filteredSalles.length
      });
    }

    this.referenceData = {
      etablissement_name: (options.etablissements || []).map((e) => this.toReferenceEntry(e.name, e.id)),
      promotion_name: (options.promotions || []).map((p) => this.toReferenceEntry(p.name, p.id)),
      type_cours_name: (options.types_cours || []).map((t) => this.toReferenceEntry(t.name, t.id)),
      salle_name: filteredSalles.map((s) => this.toReferenceEntry(s.name, s.id)),
      group_title: (options.groups || []).map((g) => this.toReferenceEntry(g.title, g.id)),
      ville_name: (options.villes || []).map((v) => this.toReferenceEntry(v.name, v.id)),
      option_name: (options.options || []).map((o) => this.toReferenceEntry(o.name, o.id))
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

    const exactMatch = reference.find((entry) => entry.normalized === normalized);
    if (exactMatch) {
      return { isValid: true, suggestions: [] };
    }

    const scored = reference.map((entry) => {
      let score = 0;
      if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) {
        score += 50;
      }
      if (entry.normalized.startsWith(normalized)) {
        score += 20;
      }
      const distance = this.levenshteinDistance(normalized, entry.normalized);
      score += Math.max(0, 40 - distance * 10);
      return { entry, score };
    }).filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);

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
    
    return date.toISOString().split('T')[0];
  }

  // Formater une heure
  private formatTime(timeString: string): string {
    if (!timeString) return '';
    
    // Supprimer les espaces et normaliser
    const time = timeString.trim().replace(/\s/g, '');
    
    // Format HH:MM
    if (/^\d{1,2}:\d{2}$/.test(time)) {
      return time;
    }
    
    // Format HHhMM
    if (/^\d{1,2}h\d{2}$/.test(time)) {
      return time.replace('h', ':');
    }
    
    // Format HH.MM
    if (/^\d{1,2}\.\d{2}$/.test(time)) {
      return time.replace('.', ':');
    }
    
    return timeString;
  }
}
