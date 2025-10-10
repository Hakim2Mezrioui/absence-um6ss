import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { read, utils, WorkBook, writeFile, write } from 'xlsx';
import { EtudiantsService, FilterOptions } from '../../services/etudiants.service';

interface StudentRow {
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

@Component({
  selector: 'app-simple-student-import',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './simple-import.component.html',
  styleUrls: ['./simple-import.component.css']
})
export class SimpleStudentImportComponent implements OnInit {
  readonly templateHeaders = [
    'matricule',
    'first_name',
    'last_name',
    'email',
    'promotion_name',
    'etablissement_name',
    'ville_name',
    'group_title',
    'option_name'
  ];

  readonly relationHeaders = [
    'promotion_name',
    'etablissement_name',
    'ville_name',
    'group_title',
    'option_name'
  ];

  fileName = '';
  errorMessage = '';
  successMessage = '';
  isProcessing = false;
  isImporting = false;

  referenceError = '';
  filterOptions: FilterOptions | null = null;
  importResult: ImportResult | null = null;

  tableHeaders: string[] = [];
  tableRows: StudentRow[] = [];

  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};
  
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

  constructor(private etudiantsService: EtudiantsService) {}

  ngOnInit(): void {
    this.loadReferenceData();
  }

  downloadTemplate(): void {
    const rows = [
      this.templateHeaders,
      ['ETU2025001', 'Imane', 'Benali', 'imane.benali@email.com', 'Promotion 1', 'Université A', 'Casablanca', 'Groupe A', 'Option 1'],
      ['ETU2025002', 'Youssef', 'El Amrani', 'youssef.elamrani@email.com', 'Promotion 2', 'Université B', 'Rabat', 'Groupe B', 'Option 2'],
      ['ETU2025003', 'Fatima', 'Alaoui', 'fatima.alaoui@email.com', 'Promotion 1', 'Université A', 'Casablanca', 'Groupe B', 'Option 1']
    ];

    const worksheet = utils.aoa_to_sheet(rows);
    
    // Définir la largeur des colonnes pour une meilleure lisibilité
    const colWidths = [
      { wch: 12 }, // matricule
      { wch: 15 }, // first_name
      { wch: 15 }, // last_name
      { wch: 25 }, // email
      { wch: 15 }, // promotion_name
      { wch: 20 }, // etablissement_name
      { wch: 15 }, // ville_name
      { wch: 12 }, // group_title
      { wch: 15 }  // option_name
    ];
    worksheet['!cols'] = colWidths;
    
    // Définir la plage de données pour éviter les problèmes de lecture
    const range = utils.encode_range({
      s: { c: 0, r: 0 },
      e: { c: this.templateHeaders.length - 1, r: rows.length - 1 }
    });
    worksheet['!ref'] = range;
    
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Etudiants');
    
    // Ajouter des métadonnées pour identifier le fichier comme modèle
    workbook.Props = {
      Title: 'Modèle d\'importation des étudiants',
      Subject: 'Template pour l\'importation des données d\'étudiants',
      Author: 'Système de gestion des absences',
      CreatedDate: new Date()
    };
    
    writeFile(workbook, 'modele_import_etudiants.xlsx');
    console.log('Modèle téléchargé avec succès');
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

    console.log('Fichier sélectionné:', file.name, 'Taille:', file.size, 'Type:', file.type);

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        console.log('Données du fichier chargées, taille:', data.length);
        
        // Options améliorées pour la lecture Excel
        const workbook: WorkBook = read(data, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false,
          raw: false,
          dateNF: 'yyyy-mm-dd'
        });
        
        console.log('Feuilles disponibles:', workbook.SheetNames);
        
        const firstSheet = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheet];
        
        // Vérifier si la feuille existe et contient des données
        if (!worksheet || !worksheet['!ref']) {
          throw new Error('La feuille Excel est vide ou inaccessible.');
        }
        
        console.log('Plage de données:', worksheet['!ref']);
        
        // Conversion améliorée avec gestion des types de données
        const rows = utils.sheet_to_json<any[]>(worksheet, { 
          header: 1, 
          defval: '',
          raw: false,
          dateNF: 'yyyy-mm-dd',
          blankrows: false
        });
        
        // Capturer les informations du fichier pour le débogage
        this.fileInfo = {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: new Date(file.lastModified),
          sheetCount: workbook.SheetNames.length,
          dataRange: worksheet['!ref'] || 'Aucune',
          rowCount: rows.length
        };
        
        console.log('Informations du fichier:', this.fileInfo);

        console.log('Lignes parsées:', rows.length, 'Première ligne:', rows[0]);

        if (!rows.length) {
          throw new Error('Le fichier est vide.');
        }

        const [headerRow, ...dataRows] = rows;
        
        // Nettoyer et valider les en-têtes
        this.tableHeaders = headerRow.map((header, index) => {
          const cleanHeader = String(header || '').trim();
          if (!cleanHeader) {
            console.warn(`En-tête vide à la colonne ${index + 1}`);
            return `colonne_${index + 1}`;
          }
          return cleanHeader;
        });
        
        console.log('En-têtes détectés:', this.tableHeaders);

        // Traiter les données avec une meilleure gestion des types
        this.tableRows = dataRows.map((row, rowIndex) => {
          const rowObject: StudentRow = {};
          this.tableHeaders.forEach((header, index) => {
            let cellValue = row[index];
            
            // Convertir les valeurs en string et nettoyer
            if (cellValue === null || cellValue === undefined) {
              cellValue = '';
            } else if (typeof cellValue === 'number') {
              // Préserver les nombres comme string pour éviter les problèmes de format
              cellValue = cellValue.toString();
            } else if (cellValue instanceof Date) {
              // Convertir les dates en format ISO
              cellValue = cellValue.toISOString().split('T')[0];
            } else {
              cellValue = String(cellValue).trim();
            }
            
            rowObject[header] = cellValue;
          });
          
          // Log pour débogage
          if (rowIndex < 3) {
            console.log(`Ligne ${rowIndex + 1}:`, rowObject);
          }
          
          return rowObject;
        });

        // Filtrer les lignes complètement vides
        this.tableRows = this.tableRows.filter(row => {
          return Object.values(row).some(value => value && value.trim() !== '');
        });

        console.log('Lignes de données finales:', this.tableRows.length);

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
    this.fileInfo = null;
  }

  toggleAvailableOptions(): void {
    this.showAvailableOptions = !this.showAvailableOptions;
  }

  getAvailableOptions(): any {
    if (!this.filterOptions) return null;
    
    return {
      promotions: this.filterOptions.promotions?.map(p => p.name) || [],
      etablissements: this.filterOptions.etablissements?.map(e => e.name) || [],
      villes: this.filterOptions.villes?.map(v => v.name) || [],
      groups: this.filterOptions.groups?.map(g => g.title) || [],
      options: this.filterOptions.options?.map(o => o.name) || []
    };
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
      'matricule': 'Ex: ETU2025001',
      'first_name': 'Ex: Imane',
      'last_name': 'Ex: Benali',
      'email': 'Ex: imane.benali@email.com',
      'promotion_name': 'Ex: Promotion 1',
      'etablissement_name': 'Ex: Université A',
      'ville_name': 'Ex: Casablanca',
      'group_title': 'Ex: Groupe A',
      'option_name': 'Ex: Option 1'
    };
    return placeholders[header] || 'Saisir une valeur';
  }

  getHeaderDisplayName(header: string): string {
    const displayNames: Record<string, string> = {
      'matricule': 'Matricule',
      'first_name': 'Prénom',
      'last_name': 'Nom',
      'email': 'Email',
      'promotion_name': 'Promotion',
      'etablissement_name': 'Établissement',
      'ville_name': 'Ville',
      'group_title': 'Groupe',
      'option_name': 'Option'
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


  importStudents(): void {
    if (this.hasInvalidCells()) {
      this.errorMessage = 'Veuillez corriger toutes les erreurs avant de procéder à l\'importation.';
      return;
    }

    this.isImporting = true;
    this.importResult = null;
    this.errorMessage = '';

    // Préparer les données pour l'importation
    const studentsData = this.tableRows.map(row => {
      const student: any = {
        matricule: row['matricule'] || '',
        first_name: row['first_name'] || '',
        last_name: row['last_name'] || '',
        email: row['email'] || '',
        promotion_name: row['promotion_name'] || '',
        etablissement_name: row['etablissement_name'] || '',
        ville_name: row['ville_name'] || '',
        group_title: row['group_title'] || '',
        option_name: row['option_name'] || ''
      };

      // Convertir les noms en IDs si possible
      if (this.filterOptions) {
        // Fonction de correspondance flexible pour gérer les variations de noms
        const findPromotion = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.promotions?.find(p => 
            this.normalize(p.name) === normalizedName ||
            this.normalize(p.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(p.name))
          );
        };

        const findEtablissement = (name: string) => {
          if (!name) return null;
          const normalizedName = this.normalize(name);
          return this.filterOptions?.etablissements?.find(e => 
            this.normalize(e.name) === normalizedName ||
            this.normalize(e.name).includes(normalizedName) ||
            normalizedName.includes(this.normalize(e.name))
          );
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

        const findGroup = (title: string) => {
          if (!title) return null;
          const normalizedTitle = this.normalize(title);
          return this.filterOptions?.groups?.find(g => 
            this.normalize(g.title) === normalizedTitle ||
            this.normalize(g.title).includes(normalizedTitle) ||
            normalizedTitle.includes(this.normalize(g.title))
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

        const promotion = findPromotion(student.promotion_name);
        const etablissement = findEtablissement(student.etablissement_name);
        const ville = findVille(student.ville_name);
        const group = findGroup(student.group_title);
        const option = findOption(student.option_name);

        // Log pour débogage
        console.log(`Étudiant ${student.matricule}:`, {
          promotion_name: student.promotion_name,
          promotion_found: promotion ? `${promotion.name} (ID: ${promotion.id})` : 'Non trouvée',
          etablissement_name: student.etablissement_name,
          etablissement_found: etablissement ? `${etablissement.name} (ID: ${etablissement.id})` : 'Non trouvé',
          ville_name: student.ville_name,
          ville_found: ville ? `${ville.name} (ID: ${ville.id})` : 'Non trouvée',
          group_title: student.group_title,
          group_found: group ? `${group.title} (ID: ${group.id})` : 'Non trouvé',
          option_name: student.option_name,
          option_found: option ? `${option.name} (ID: ${option.id})` : 'Non trouvée'
        });

        if (promotion) student.promotion_id = promotion.id;
        if (etablissement) student.etablissement_id = etablissement.id;
        if (ville) student.ville_id = ville.id;
        if (group) student.group_id = group.id;
        if (option) student.option_id = option.id;
      }

      return student;
    });

    // Créer un fichier Excel temporaire pour l'importation
    const worksheet = utils.json_to_sheet(studentsData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Etudiants');
    
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const formData = new FormData();
    formData.append('file', blob, 'students_import.xlsx');

    this.etudiantsService.importEtudiants(formData).subscribe({
      next: (response) => {
        this.isImporting = false;
        console.log('Réponse d\'importation:', response);
        
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
        } else {
          this.successMessage = 'Importation terminée avec succès.';
        }
      },
      error: (error) => {
        this.isImporting = false;
        console.error('Erreur lors de l\'importation:', error);
        this.importResult = {
          success: false,
          message: error.error?.message || 'Erreur lors de l\'importation des étudiants.'
        };
        this.errorMessage = 'Erreur lors de l\'importation.';
      }
    });
  }

  private loadReferenceData(): void {
    this.etudiantsService.getFilterOptions().subscribe({
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
    this.referenceData = {
      promotion_name: (options.promotions || []).map((p) => this.toReferenceEntry(p.name, p.id)),
      etablissement_name: (options.etablissements || []).map((e) => this.toReferenceEntry(e.name, e.id)),
      ville_name: (options.villes || []).map((v) => this.toReferenceEntry(v.name, v.id)),
      group_title: (options.groups || []).map((g) => this.toReferenceEntry(g.title, g.id)),
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
}
