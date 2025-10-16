import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class SimpleStudentImportComponent implements OnInit, OnDestroy {
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
  private validationTimers: Record<string, any> = {};
  private readonly debounceMs = 200;
  private worker: Worker | null = null;
  private requestCounter = 0;
  private lastRequestIdByCell: Record<string, number> = {};
  
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
    // Initialize web worker if supported
    try {
      this.worker = new Worker(new URL('./simple-import.worker.ts', import.meta.url), { type: 'module' });
      this.worker.onmessage = (e: MessageEvent<any>) => {
        const { requestId, rowIndex, header, isValid, suggestions } = e.data || {};
        const key = `${rowIndex}:${header}`;
        // Ignore outdated responses
        if (this.lastRequestIdByCell[key] !== requestId) return;
        if (!this.suggestionsByCell[rowIndex]) this.suggestionsByCell[rowIndex] = {};
        if (!this.invalidCells[rowIndex]) this.invalidCells[rowIndex] = {};
        this.suggestionsByCell[rowIndex][header] = suggestions || [];
        this.invalidCells[rowIndex][header] = !isValid;
      };
    } catch {
      this.worker = null;
    }
  }

  ngOnDestroy(): void {
    // Clear any pending validation timers
    Object.values(this.validationTimers).forEach((t) => clearTimeout(t));
    this.validationTimers = {};
    // Terminate worker
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
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
        
        // Choisir automatiquement la première feuille NON vide (au moins 1 ligne de données)
        let targetSheetName = workbook.SheetNames[0];
        let worksheet = workbook.Sheets[targetSheetName];
        let rows: any[][] = [];
        for (const name of workbook.SheetNames) {
          const ws = workbook.Sheets[name];
          if (!ws || !ws['!ref']) continue;
          const probe = utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: false, blankrows: false });
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
          console.log('Scan auto: première feuille non vide non trouvée, utilisation de la première feuille');
          rows = utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false, blankrows: false });
        }
        
        console.log('Feuille choisie:', targetSheetName);
        console.log('Plage de données:', worksheet['!ref']);
        
        // rows déjà prêt ci-dessus
        
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

        // Ajouter la colonne ville si elle n'existe pas
        if (!this.tableHeaders.includes('ville_name')) {
          this.tableHeaders.push('ville_name');
          console.log('Colonne ville ajoutée automatiquement');
        }

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
          
          // S'assurer que la colonne ville existe avec une valeur vide si elle n'était pas dans le fichier
          if (!rowObject.hasOwnProperty('ville_name')) {
            rowObject['ville_name'] = '';
          }
          
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

  testSuggestions(): void {
    console.log('🧪 TEST DES SUGGESTIONS - DIAGNOSTIC COMPLET');
    console.log('==========================================');
    
    // Test 1: Vérifier les données chargées
    console.log('1. Données chargées:', {
      filterOptions: this.filterOptions,
      referenceData: this.referenceData,
      promotionsCount: this.filterOptions?.promotions?.length || 0,
      promotionsDetails: this.filterOptions?.promotions?.map((p: any) => ({ id: p.id, name: p.name })) || []
    });
    
    // Test 2: Tester la recherche avec différents termes
    const testTerms = ['1ère', '2ème', '3ème', '4ème', '5ème', '6ème', 'LIC'];
    testTerms.forEach(term => {
      const results = this.computeSuggestions(this.referenceData['promotion_name'] || [], term);
      console.log(`2. Recherche "${term}":`, {
        found: results.suggestions.length,
        isValid: results.isValid,
        results: results.suggestions.map((r: any) => ({ id: r.id, label: r.label }))
      });
    });
    
    // Test 3: Vérifier si les suggestions sont correctement mappées
    console.log('3. Mapping des suggestions:', {
      promotion_name: this.referenceData['promotion_name']?.length || 0,
      promotion_name_details: this.referenceData['promotion_name']?.map((p: any) => ({ id: p.id, label: p.label, normalized: p.normalized })) || []
    });
    
    console.log('==========================================');
  }

  testImportMapping(): void {
    console.log('🧪 TEST DU MAPPING D\'IMPORT - DIAGNOSTIC COMPLET');
    console.log('===============================================');
    
    if (!this.tableRows.length) {
      console.log('❌ Aucune donnée de table à tester');
      return;
    }
    
    // Test avec les premières lignes de données
    const testRows = this.tableRows.slice(0, 3);
    
    testRows.forEach((row, index) => {
      console.log(`\n📊 Test ligne ${index + 1}:`, {
        matricule: row['matricule'],
        promotion_name: row['promotion_name'],
        etablissement_name: row['etablissement_name'],
        ville_name: row['ville_name'],
        group_title: row['group_title'],
        option_name: row['option_name']
      });
      
      // Tester le mapping des promotions
      if (row['promotion_name']) {
        const promotion = this.findPromotionForTest(row['promotion_name']);
        console.log(`  🔍 Promotion "${row['promotion_name']}" -> ${promotion ? `ID ${promotion.id} (${promotion.name})` : 'NON TROUVÉE'}`);
      }
      
      // Tester le mapping des établissements
      if (row['etablissement_name']) {
        const etablissement = this.findEtablissementForTest(row['etablissement_name']);
        console.log(`  🏢 Établissement "${row['etablissement_name']}" -> ${etablissement ? `ID ${etablissement.id} (${etablissement.name})` : 'NON TROUVÉ'}`);
      }
      
      // Tester le mapping des villes
      if (row['ville_name']) {
        const ville = this.findVilleForTest(row['ville_name']);
        console.log(`  🏙️ Ville "${row['ville_name']}" -> ${ville ? `ID ${ville.id} (${ville.name})` : 'NON TROUVÉE'}`);
      }
      
      // Tester le mapping des groupes
      if (row['group_title']) {
        const group = this.findGroupForTest(row['group_title']);
        console.log(`  👥 Groupe "${row['group_title']}" -> ${group ? `ID ${group.id} (${group.title})` : 'NON TROUVÉ'}`);
      }
      
      // Tester le mapping des options
      if (row['option_name']) {
        const option = this.findOptionForTest(row['option_name']);
        console.log(`  📚 Option "${row['option_name']}" -> ${option ? `ID ${option.id} (${option.name})` : 'NON TROUVÉE'}`);
      }
    });
    
    console.log('\n===============================================');
  }

  private findPromotionForTest(name: string): any {
    if (!name || !this.filterOptions?.promotions) return null;
    const normalizedName = this.normalize(name);
    
    // Recherche exacte d'abord
    let found = this.filterOptions.promotions.find(p => 
      this.normalize(p.name) === normalizedName
    );
    
    // Si pas trouvé, recherche partielle
    if (!found) {
      found = this.filterOptions.promotions.find(p => {
        const normalizedPromotion = this.normalize(p.name);
        return normalizedPromotion.includes(normalizedName) || 
               normalizedName.includes(normalizedPromotion) ||
               // Recherche par chiffre initial (ex: "4ème" -> "4ème année")
               (normalizedName.match(/^\d+/) && normalizedPromotion.match(/^\d+/) && 
                normalizedName.match(/^\d+/)?.[0] === normalizedPromotion.match(/^\d+/)?.[0]);
      });
    }
    
    return found;
  }

  private findEtablissementForTest(name: string): any {
    if (!name || !this.filterOptions?.etablissements) return null;
    const normalizedName = this.normalize(name);
    return this.filterOptions.etablissements.find(e => 
      this.normalize(e.name) === normalizedName ||
      this.normalize(e.name).includes(normalizedName) ||
      normalizedName.includes(this.normalize(e.name))
    );
  }

  private findVilleForTest(name: string): any {
    if (!name || !this.filterOptions?.villes) return null;
    const normalizedName = this.normalize(name);
    return this.filterOptions.villes.find(v => 
      this.normalize(v.name) === normalizedName ||
      this.normalize(v.name).includes(normalizedName) ||
      normalizedName.includes(this.normalize(v.name))
    );
  }

  private findGroupForTest(title: string): any {
    if (!title || !this.filterOptions?.groups) return null;
    const normalizedTitle = this.normalize(title);
    return this.filterOptions.groups.find(g => 
      this.normalize(g.title) === normalizedTitle ||
      this.normalize(g.title).includes(normalizedTitle) ||
      normalizedTitle.includes(this.normalize(g.title))
    );
  }

  private findOptionForTest(name: string): any {
    if (!name || !this.filterOptions?.options) return null;
    const normalizedName = this.normalize(name);
    return this.filterOptions.options.find(o => 
      this.normalize(o.name) === normalizedName ||
      this.normalize(o.name).includes(normalizedName) ||
      normalizedName.includes(this.normalize(o.name))
    );
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

        // Log détaillé pour les promotions
        if (!promotion && student.promotion_name) {
          console.log(`❌ Promotion non trouvée pour "${student.promotion_name}"`, {
            availablePromotions: this.filterOptions?.promotions?.map(p => p.name) || [],
            normalizedInput: this.normalize(student.promotion_name),
            normalizedAvailable: this.filterOptions?.promotions?.map(p => this.normalize(p.name)) || []
          });
        }

        // Assigner les IDs avec logging détaillé
        if (promotion) {
          student.promotion_id = promotion.id;
          console.log(`✅ Promotion assignée: "${student.promotion_name}" -> ID ${promotion.id}`);
        } else {
          console.log(`❌ Promotion NON assignée pour "${student.promotion_name}"`);
        }
        
        if (etablissement) {
          student.etablissement_id = etablissement.id;
          console.log(`✅ Établissement assigné: "${student.etablissement_name}" -> ID ${etablissement.id}`);
        }
        
        if (ville) {
          student.ville_id = ville.id;
          console.log(`✅ Ville assignée: "${student.ville_name}" -> ID ${ville.id}`);
        }
        
        if (group) {
          student.group_id = group.id;
          console.log(`✅ Groupe assigné: "${student.group_title}" -> ID ${group.id}`);
        }
        
        if (option) {
          student.option_id = option.id;
          console.log(`✅ Option assignée: "${student.option_name}" -> ID ${option.id}`);
        }

        // Log final de l'étudiant avant envoi
        console.log(`📤 Étudiant final avant envoi ${student.matricule}:`, {
          promotion_id: student.promotion_id,
          etablissement_id: student.etablissement_id,
          ville_id: student.ville_id,
          group_id: student.group_id,
          option_id: student.option_id
        });
      }

      return student;
    });

    // Log des données finales avant envoi
    console.log('📊 Données finales à envoyer au backend:', studentsData.map(s => ({
      matricule: s.matricule,
      promotion_name: s.promotion_name,
      promotion_id: s.promotion_id,
      etablissement_name: s.etablissement_name,
      etablissement_id: s.etablissement_id,
      ville_name: s.ville_name,
      ville_id: s.ville_id,
      group_title: s.group_title,
      group_id: s.group_id,
      option_name: s.option_name,
      option_id: s.option_id
    })));

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
        console.log('🔍 DIAGNOSTIC - Données chargées depuis l\'API:', {
          promotions: options.promotions?.length || 0,
          promotionsDetails: options.promotions?.map((p: any) => ({ id: p.id, name: p.name })) || [],
          etablissements: options.etablissements?.length || 0,
          villes: options.villes?.length || 0,
          groups: options.groups?.length || 0,
          options: options.options?.length || 0
        });
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
    
    console.log('🔍 DIAGNOSTIC - Données préparées pour les suggestions:', {
      promotion_name: this.referenceData['promotion_name'].length,
      promotion_name_details: this.referenceData['promotion_name'].map((p: any) => ({ id: p.id, label: p.label, normalized: p.normalized })),
      etablissement_name: this.referenceData['etablissement_name'].length,
      ville_name: this.referenceData['ville_name'].length,
      group_title: this.referenceData['group_title'].length,
      option_name: this.referenceData['option_name'].length
    });
    
    // Purge & réinitialisation du cache côté worker pour tenir compte des nouvelles listes
    // Send indexes to worker once prepared
    if (this.worker) {
      Object.keys(this.referenceData).forEach((header) => {
        const reference = this.referenceData[header];
        this.worker!.postMessage({ type: 'init', header, reference });
      });
    }
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
    // If worker available, offload computation
    if (this.worker) {
      const requestId = ++this.requestCounter;
      const key = `${rowIndex}:${header}`;
      this.lastRequestIdByCell[key] = requestId;
      this.worker.postMessage({
        requestId,
        rowIndex,
        header,
        rawValue: value,
        reference: referenceEntries
      });
      return;
    }
    // Fallback to sync computation
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

    // Fast path: for very short inputs, avoid expensive scoring
    if (normalized.length < 3) {
      const quick = reference
        .filter((entry) => entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized))
        .slice(0, 5)
        .map((entry) => this.toSuggestion(entry));
      // If we have an exact match, it's valid; otherwise suggest without heavy work
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

    // Reduce work: try quick candidates first, then score a limited subset
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
       // Bonus fort si chiffre initial identique (ex: 2 vs 2eme annee)
       const entryNum = numMatch(entry.normalized);
       if (termNum && entryNum && termNum === entryNum) {
         score += 60;
       }
      return { entry, score };
    }).filter((item) => item.score > 0);

    scored.sort((a, b) => b.score - a.score);
    // High-confidence acceptance: if best score is high, mark cell valid
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
