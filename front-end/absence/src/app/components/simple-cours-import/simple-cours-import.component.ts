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
    const rows = [
      this.templateHeaders,
      ['Cours de Mathématiques', '15/01/2024', '08:00', '10:00', '00:15', 'Université A', 'Promotion 1', 'Cours Magistral', 'Salle A1', 'Groupe A', 'Casablanca', 'Option 1', '2024-2025'],
      ['Cours de Physique', '16/01/2024', '10:00', '12:00', '00:15', 'Université B', 'Promotion 2', 'TD', 'Salle B2', 'Groupe B', 'Rabat', 'Option 2', '2024-2025']
    ];

    const worksheet = utils.aoa_to_sheet(rows);
    
    // Définir la largeur des colonnes pour une meilleure lisibilité
    const colWidths = [
      { wch: 20 }, // title
      { wch: 12 }, // date
      { wch: 10 }, // hour_debut
      { wch: 10 }, // hour_fin
      { wch: 10 }, // tolerance
      { wch: 20 }, // etablissement_name
      { wch: 15 }, // promotion_name
      { wch: 15 }, // type_cours_name
      { wch: 12 }, // salle_name
      { wch: 12 }, // group_title
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
          rows = utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '', raw: false, blankrows: false });
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

        // Traiter les données avec une meilleure gestion des types
        this.tableRows = dataRows.map((row, rowIndex) => {
          const rowObject: CoursRow = {};
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
      groups: this.filterOptions.groups?.map(g => g.title || g.name) || [],
      villes: this.filterOptions.villes?.map(v => v.name) || [],
      types_cours: this.filterOptions.types_cours?.map(t => t.name) || []
    };
  }

  getSuggestions(rowIndex: number, header: string): Suggestion[] { return this.suggestionsByCell[rowIndex]?.[header] ?? []; }
  isCellInvalid(rowIndex: number, header: string): boolean { return !!this.invalidCells[rowIndex]?.[header]; }
  applySuggestion(rowIndex: number, header: string, suggestion: Suggestion): void { this.updateCell(rowIndex, header, suggestion.label); }

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
      'salle_name': '140px',
      'group_title': '140px',
      'ville_name': '140px',
      'option_name': '160px',
      'annee_universitaire': '180px'
    };
    return columnWidths[header] || '180px';
  }

  getColumnMinWidth(header: string): string {
    const minWidths: Record<string, string> = {
      'title': '480px',
      'date': '220px',
      'hour_debut': '180px',
      'hour_fin': '180px'
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

        const etablissement = findEtablissement(cours.etablissement_name);
        const promotion = findPromotion(cours.promotion_name);
        const typeCours = findTypeCours(cours.type_cours_name);
        const salle = findSalle(cours.salle_name);
        const group = findGroup(cours.group_title);
        const ville = findVille(cours.ville_name);
        const option = findOption(cours.option_name);

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
        
        if (salle) {
          cours.salle_id = salle.id;
        }
        
        if (group) {
          cours.group_id = group.id as any;
        }
        
        if (ville) {
          cours.ville_id = ville.id;
        }
        
        if (option) {
          cours.option_id = option.id;
        }
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
      group_title: (options.groups || []).map((g) => this.toReferenceEntry(g.title || g.name, g.id)),
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
