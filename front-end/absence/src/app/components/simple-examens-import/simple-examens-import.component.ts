import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { read, utils, WorkBook, write, writeFile } from 'xlsx';
import { ExamensService } from '../../services/examens.service';

interface ExamenRow { [key: string]: string; }

interface Suggestion { label: string; id?: number; }

interface ReferenceEntry { label: string; normalized: string; id?: number; }

interface ImportResult {
  success: boolean;
  message: string;
  details?: { total?: number; created?: number; updated?: number; errors?: number };
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
export class SimpleExamensImportComponent implements OnInit {
  readonly templateHeaders = [
    'title', 'date', 'hour_debut', 'hour_fin', 'tolerance',
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

  referenceError = '';
  filterOptions: FilterOptions | null = null;
  importResult: ImportResult | null = null;

  tableHeaders: string[] = [];
  tableRows: ExamenRow[] = [];

  private referenceData: Record<string, ReferenceEntry[]> = {};
  private suggestionsByCell: Record<number, Record<string, Suggestion[]>> = {};
  private invalidCells: Record<number, Record<string, boolean>> = {};

  constructor(private examensService: ExamensService) {}

  ngOnInit(): void {
    this.loadReferenceData();
  }

  downloadTemplate(): void {
    const rows = [
      this.templateHeaders,
      ['Examen de Math', '15/01/2024', '09:00', '11:00', '15', 'Université A', 'Promotion 1', 'Contrôle', 'Salle 101', 'Groupe A', 'Rabat', 'Option 1', '2024-2025'],
      ['Examen de Physique', '16/01/2024', '14:00', '16:00', '10', 'Université B', 'Promotion 2', 'Final', 'Salle 202', 'Groupe B', 'Casablanca', 'Option 2', '2024-2025']
    ];
    const worksheet = utils.aoa_to_sheet(rows);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Examens');
    writeFile(workbook, 'modele_import_examens.xlsx');
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isProcessing = true;
    this.fileName = file.name;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer);
        const workbook: WorkBook = read(data, { type: 'array' });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = utils.sheet_to_json<string[]>(worksheet, { header: 1, defval: '' });
        if (!rows.length) throw new Error('Le fichier est vide.');

        const [headerRow, ...dataRows] = rows;
        this.tableHeaders = headerRow.map(h => h.toString());
        this.tableRows = dataRows.map(row => {
          const obj: ExamenRow = {};
          this.tableHeaders.forEach((h, i) => obj[h] = row[i] ?? '');
          return obj;
        });

        this.successMessage = this.tableRows.length
          ? `${this.tableRows.length} ligne(s) chargée(s) avec succès.`
          : 'Le fichier a été importé, mais aucune donnée n\'a été trouvée.';

        this.validateRows();
      } catch (e: any) {
        this.errorMessage = e?.message || 'Lecture du fichier impossible.';
        this.tableHeaders = [];
        this.tableRows = [];
      } finally {
        this.isProcessing = false;
      }
    };
    reader.onerror = () => { this.isProcessing = false; this.errorMessage = 'Erreur lors de la lecture du fichier.'; };
    reader.readAsArrayBuffer(file);
  }

  trackByHeader(_: number, header: string): string { return header; }
  trackByRow(index: number): number { return index; }

  updateCell(rowIndex: number, header: string, value: string): void {
    if (!this.tableRows[rowIndex]) return;
    this.tableRows[rowIndex] = { ...this.tableRows[rowIndex], [header]: value };
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

  getSuggestions(rowIndex: number, header: string): Suggestion[] { return this.suggestionsByCell[rowIndex]?.[header] ?? []; }
  isCellInvalid(rowIndex: number, header: string): boolean { return !!this.invalidCells[rowIndex]?.[header]; }
  applySuggestion(rowIndex: number, header: string, suggestion: Suggestion): void { this.updateCell(rowIndex, header, suggestion.label); }

  getPlaceholder(header: string): string {
    const placeholders: Record<string, string> = {
      'title':'Ex: Examen de Math','date':'Ex: 15/01/2024','hour_debut':'Ex: 09:00','hour_fin':'Ex: 11:00','tolerance':'Ex: 15',
      'etablissement_name':'Ex: Université A','promotion_name':'Ex: Promotion 1','type_examen_name':'Ex: Contrôle','salle_name':'Ex: Salle 101',
      'group_title':'Ex: Groupe A','ville_name':'Ex: Rabat','option_name':'Ex: Option 1','annee_universitaire':'Ex: 2024-2025'
    }; return placeholders[header] || 'Saisir une valeur';
  }

  getHeaderDisplayName(header: string): string {
    const display: Record<string,string> = {
      'title':'Titre','date':'Date','hour_debut':'Heure début','hour_fin':'Heure fin','tolerance':'Tolérance (min)',
      'etablissement_name':'Établissement','promotion_name':'Promotion','type_examen_name':'Type d\'examen','salle_name':'Salle',
      'group_title':'Groupe','ville_name':'Ville','option_name':'Option','annee_universitaire':'Année universitaire'
    }; return display[header] || header;
  }

  showFullValue(value: string | undefined): boolean { return (value ?? '').trim().length > 12; }
  hasInvalidCells(): boolean { return Object.keys(this.invalidCells).some(r => Object.values(this.invalidCells[+r]).some(v => v)); }
  getInvalidCellsCount(): number { let c=0; Object.keys(this.invalidCells).forEach(r=>Object.values(this.invalidCells[+r]).forEach(v=>{if(v)c++;})); return c; }

  importExamens(): void {
    if (this.hasInvalidCells()) { this.errorMessage = 'Veuillez corriger toutes les erreurs avant l\'importation.'; return; }
    this.isImporting = true; this.importResult = null; this.errorMessage = '';

    const examensData = this.tableRows.map(row => {
      const examen: any = {
        title: row['title'] || '',
        date: this.formatDate(row['date'] || ''),
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

      if (this.filterOptions) {
        const etab = this.filterOptions.etablissements?.find(e => e.name === examen.etablissement_name);
        const promo = this.filterOptions.promotions?.find(p => p.name === examen.promotion_name);
        const type = this.filterOptions.typesExamen?.find(t => t.name === examen.type_examen_name);
        const salle = this.filterOptions.salles?.find(s => s.name === examen.salle_name);
        const group = this.filterOptions.groups?.find(g => (g.title || g.name) === examen.group_title);
        const ville = this.filterOptions.villes?.find(v => v.name === examen.ville_name);
        const option = this.filterOptions.options?.find(o => o.name === examen.option_name);
        if (etab) examen.etablissement_id = etab.id;
        if (promo) examen.promotion_id = promo.id;
        if (type) examen.type_examen_id = type.id;
        if (salle) examen.salle_id = salle.id;
        if (group) examen.group_id = group.id as any;
        if (ville) examen.ville_id = ville.id;
        if (option) examen.option_id = option.id;
      }
      return examen;
    });

    const worksheet = utils.json_to_sheet(examensData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Examens');
    const excelBuffer = write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const formData = new FormData(); formData.append('file', blob, 'examens_import.xlsx');

    this.examensService.importExamens(formData).subscribe({
      next: (response) => {
        this.isImporting = false;
        this.importResult = { success: true, message: response.message || 'Importation réussie !', details: { total: response.total, created: response.created, updated: response.updated, errors: response.errors } };
        this.successMessage = 'Importation terminée avec succès.';
      },
      error: (error) => {
        this.isImporting = false;
        this.importResult = { success: false, message: error.error?.message || 'Erreur lors de l\'importation des examens.' };
        this.errorMessage = 'Erreur lors de l\'importation.';
      }
    });
  }

  private loadReferenceData(): void {
    this.examensService.getFilterOptions().subscribe({
      next: (options) => { this.filterOptions = options; this.prepareReferenceData(options); if (this.tableRows.length) this.validateRows(); },
      error: () => { this.referenceError = 'Impossible de charger les références.'; }
    });
  }

  private prepareReferenceData(options: FilterOptions): void {
    this.referenceData = {
      etablissement_name: (options.etablissements || []).map(e => this.toReferenceEntry(e.name, e.id)),
      promotion_name: (options.promotions || []).map(p => this.toReferenceEntry(p.name, p.id)),
      type_examen_name: (options.typesExamen || []).map(t => this.toReferenceEntry(t.name, t.id)),
      salle_name: (options.salles || []).map(s => this.toReferenceEntry(s.name, s.id)),
      group_title: (options.groups || []).map(g => this.toReferenceEntry(g.title || g.name, (g as any).id)),
      ville_name: (options.villes || []).map(v => this.toReferenceEntry(v.name, v.id)),
      option_name: (options.options || []).map(o => this.toReferenceEntry(o.name, o.id))
    };
  }

  private validateRows(): void { this.suggestionsByCell = {}; this.invalidCells = {}; const headers = this.relationHeaders.filter(h => this.tableHeaders.includes(h)); if (!headers.length) return; this.tableRows.forEach((_, i) => headers.forEach(h => this.validateCell(i, h))); }

  private validateCell(rowIndex: number, header: string): void {
    if (!this.relationHeaders.includes(header)) return;
    if (!this.suggestionsByCell[rowIndex]) this.suggestionsByCell[rowIndex] = {};
    if (!this.invalidCells[rowIndex]) this.invalidCells[rowIndex] = {};
    const value = this.tableRows[rowIndex]?.[header] ?? '';
    const ref = this.referenceData[header];
    if (!ref || ref.length === 0) { this.suggestionsByCell[rowIndex][header] = []; this.invalidCells[rowIndex][header] = false; return; }
    const { isValid, suggestions } = this.computeSuggestions(ref, value);
    this.suggestionsByCell[rowIndex][header] = suggestions;
    this.invalidCells[rowIndex][header] = !isValid;
  }

  private computeSuggestions(reference: ReferenceEntry[], rawValue: string): { isValid: boolean; suggestions: Suggestion[] } {
    const value = (rawValue ?? '').trim();
    const normalized = this.normalize(value);
    if (!value) { return { isValid: false, suggestions: reference.slice(0,5).map(e => this.toSuggestion(e)) }; }
    const exact = reference.find(e => e.normalized === normalized); if (exact) return { isValid: true, suggestions: [] };
    const scored = reference.map(entry => { let score = 0; if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) score += 50; if (entry.normalized.startsWith(normalized)) score += 20; const dist = this.levenshteinDistance(normalized, entry.normalized); score += Math.max(0, 40 - dist * 10); return { entry, score }; }).filter(i => i.score > 0);
    scored.sort((a,b) => b.score - a.score);
    const candidates = scored.length ? scored : reference.slice(0,3);
    return { isValid: false, suggestions: candidates.slice(0,5).map(i => this.toSuggestion('entry' in i ? (i as any).entry : i)) };
  }

  private toReferenceEntry(label: string | undefined, id?: number): ReferenceEntry { const safe = label ?? ''; return { label: safe, normalized: this.normalize(safe), id }; }
  private toSuggestion(entry: ReferenceEntry): Suggestion { return { label: entry.label, id: entry.id }; }
  private normalize(value: string): string { return (value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'').trim(); }
  private levenshteinDistance(a: string, b: string): number { const m=a.length,n=b.length; if(!m) return n; if(!n) return m; const matrix:number[][]=Array.from({length:m+1},()=>new Array(n+1).fill(0)); for(let i=0;i<=m;i++) matrix[i][0]=i; for(let j=0;j<=n;j++) matrix[0][j]=j; for(let i=1;i<=m;i++){ for(let j=1;j<=n;j++){ const cost=a[i-1]===b[j-1]?0:1; matrix[i][j]=Math.min(matrix[i-1][j]+1,matrix[i][j-1]+1,matrix[i-1][j-1]+cost); } } return matrix[m][n]; }

  private formatDate(dateString: string): string { if (!dateString) return ''; const date = new Date(dateString); if (isNaN(date.getTime())) { const parts = dateString.split('/'); if (parts.length===3) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`; return dateString; } return date.toISOString().split('T')[0]; }
  private formatTime(timeString: string): string { if (!timeString) return ''; const t=timeString.trim().replace(/\s/g,''); if (/^\d{1,2}:\d{2}$/.test(t)) return t+':00'.substring(t.length-5?0:0); if (/^\d{1,2}h\d{2}$/.test(t)) return t.replace('h',':')+':00'; if (/^\d{1,2}\.\d{2}$/.test(t)) return t.replace('.',':')+':00'; if (/^\d{2}:\d{2}:\d{2}$/.test(t)) return t; return t; }
}


