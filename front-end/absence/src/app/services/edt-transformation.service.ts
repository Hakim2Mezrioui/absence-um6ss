import { Injectable } from '@angular/core';
import { read, utils, WorkBook, WorkSheet, writeFile } from 'xlsx';

export interface EdtRowData {
  title: string;
  date: string;
  hour_debut_poigntage: string;
  hour_debut: string;
  hour_fin: string;
  tolerance: string;
  attendance_mode: 'normal' | 'bicheck';
  exit_capture_window: string;
  etablissement_name: string;
  promotion_name: string;
  type_cours_name: string;
  salle_name: string;
  group_title: string;
  ville_name: string;
  option_name: string;
  enseignant_name: string;
  annee_universitaire: string;
  _validation?: string[];
  _raw?: Record<string, unknown>;
}

export const TEMPLATE_HEADERS = [
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
] as const;

const REQUIRED_FIELDS = [
  'title',
  'date',
  'hour_debut',
  'hour_fin',
  'etablissement_name',
  'promotion_name',
  'type_cours_name',
  'salle_name',
  'group_title',
  'ville_name'
];

/** Valeurs par défaut pour l'extraction EDT FP4 */
const EDT_FP4_DEFAULTS = {
  etablissement_name: 'FACULTÉ MOHAMMED VI DE PHARMACIE UM6SS',
  promotion_name: 'FP4',
  ville_name: 'Casablanca',
  type_cours_name: 'Cours Magistral',
  option_name: 'General',
  tolerance_minutes: 15,
  exit_capture_window_bicheck: 60,
  pointage_offset_minutes: 30
};

@Injectable({
  providedIn: 'root'
})
export class EdtTransformationService {

  /**
   * Parse un fichier Excel EDT complexe (avec cellules fusionnées).
   * Remplit les cellules fusionnées avec la valeur de la cellule en haut à gauche.
   * @param defaults Valeurs par défaut pour EDT FP4 (etablissement_name, promotion_name, ville_name)
   */
  parseEdtExcel(buffer: ArrayBuffer, defaults?: Partial<typeof EDT_FP4_DEFAULTS>): EdtRowData[] {
    const workbook: WorkBook = read(new Uint8Array(buffer), {
      type: 'array',
      cellDates: true,
      cellNF: false,
      raw: false
    });

    let targetSheet: WorkSheet | null = null;
    let targetName = workbook.SheetNames[0];

    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      if (!ws || !ws['!ref']) continue;
      const rows = utils.sheet_to_json<any[]>(ws, { header: 1, defval: '', raw: true, blankrows: false });
      if (rows.length >= 2) {
        targetSheet = ws;
        targetName = name;
        break;
      }
    }

    if (!targetSheet || !targetSheet['!ref']) {
      throw new Error('Feuille Excel vide ou inaccessible.');
    }

    // Propager les valeurs des cellules fusionnées
    this.propagateMergedCells(targetSheet);

    const rows = utils.sheet_to_json<any[]>(targetSheet, { header: 1, defval: '', raw: true, blankrows: false });
    if (!rows.length) {
      throw new Error('Aucune donnée trouvée dans la feuille.');
    }

    // Essayer d'abord le format EDT grille (figure: plages en col A, jours en ligne 1, dates en ligne 2)
    const gridResult = this.extractEdtGridFormat(rows, defaults);
    if (gridResult.length > 0) {
      console.log('[EDT] Format grille détecté:', gridResult.length, 'ligne(s) extraite(s)');
      return gridResult;
    }

    // Essayer le format EDT FP4 alternatif (plages en ligne 1, jours en col A)
    const fp4Result = this.extractEdtFp4Rows(rows, defaults);
    if (fp4Result.length > 0) {
      console.log('[EDT] Format FP4 détecté:', fp4Result.length, 'ligne(s) extraite(s)');
      return fp4Result;
    }

    // Fallback: format tabulaire classique
    return this.extractEdtRows(rows);
  }

  /**
   * Propage la valeur de la cellule en haut à gauche d'une fusion vers toutes les cellules couvertes.
   */
  private propagateMergedCells(worksheet: WorkSheet): void {
    const merges = worksheet['!merges'];
    if (!merges || merges.length === 0) return;

    for (const merge of merges) {
      const { s, e } = merge;
      const topLeftCell = utils.encode_cell({ c: s.c, r: s.r });
      const topLeftValue = worksheet[topLeftCell]?.v ?? worksheet[topLeftCell]?.w ?? '';

      for (let r = s.r; r <= e.r; r++) {
        for (let c = s.c; c <= e.c; c++) {
          const addr = utils.encode_cell({ c, r });
          if (addr !== topLeftCell && !worksheet[addr]) {
            worksheet[addr] = { t: 's', v: String(topLeftValue), w: String(topLeftValue) };
          }
        }
      }
    }
  }

  /**
   * Format grille (figure EDT): A1="Horaire", L1=B-G jours, L2=B-G dates, Col A=L3+ plages horaires.
   * - Colonne A (lignes 2+): plages "09h00 - 10h30"
   * - Ligne 0: colonnes B-G = LUNDI, MARDI, MERCREDI...
   * - Ligne 1: colonnes B-G = 16/02/2026, 17/02/2026...
   * - Cellules [r][c] r>=2, c>=1: contenu multi-lignes
   */
  private extractEdtGridFormat(rows: any[][], defaults?: Partial<typeof EDT_FP4_DEFAULTS>): EdtRowData[] {
    const result: EdtRowData[] = [];
    const currentYear = new Date().getFullYear();
    const anneeUniv = `${currentYear}-${currentYear + 1}`;
    const def = { ...EDT_FP4_DEFAULTS, ...defaults };

    // 1. Plages horaires en colonne A, lignes 2+
    const timeSlots: { hour_debut: string; hour_fin: string; rowIndex: number }[] = [];
    for (let r = 2; r < rows.length; r++) {
      const cellVal = this.cellToString(rows[r]?.[0]);
      console.log(`[EDT Grid] Col A ligne ${r}:`, JSON.stringify(cellVal));

      if (!cellVal) continue;

      const parts = cellVal.split(/\s*[-–—]\s*/);
      if (parts.length >= 2) {
        const hour_debut = this.normalizeTimeFromRaw(parts[0].trim());
        const hour_fin = this.normalizeTimeFromRaw(parts[1].trim());
        if (hour_debut && hour_fin) {
          timeSlots.push({ hour_debut, hour_fin, rowIndex: r });
          console.log(`[EDT Grid] Plage horaire ligne ${r}:`, hour_debut, '-', hour_fin);
        }
      }
    }

    if (timeSlots.length === 0) {
      console.log('[EDT Grid] Aucune plage horaire en colonne A. Format grille ignoré.');
      return [];
    }

    // 2. Jours et dates (lignes 0 et 1, colonnes B à G)
    const dayByCol: { colIndex: number; jour: string; dateRaw: string | Date }[] = [];
    for (let c = 1; c <= 6; c++) {
      const jour = this.cellToString(rows[0]?.[c]);
      const dateRaw = rows[1]?.[c];
      const dateStr = dateRaw instanceof Date ? '' : this.cellToString(dateRaw);
      console.log(`[EDT Grid] Col ${c}: jour=`, jour, ', date=', dateRaw);

      if (jour && /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(jour)) {
        dayByCol.push({ colIndex: c, jour, dateRaw: dateRaw instanceof Date ? dateRaw : (dateStr || this.jourToDate(jour)) });
      }
    }

    if (dayByCol.length === 0) {
      console.log('[EDT Grid] Aucun jour détecté en ligne 0 (cols B-G). Format grille ignoré.');
      return [];
    }

    // 3. Parcourir les cellules de contenu (intersection créneau × jour)
    for (const slot of timeSlots) {
      const r = slot.rowIndex;
      const row = rows[r] || [];

      for (const dayInfo of dayByCol) {
        const cellVal = this.cellToString(row[dayInfo.colIndex]);
        console.log(`[EDT Grid] Cellule [${r},${dayInfo.colIndex}] (${dayInfo.jour} ${slot.hour_debut}):`, cellVal ? cellVal.substring(0, 80) + '...' : '(vide)');

        if (!cellVal) continue;

        const parsed = this.parseMultiLineCell(cellVal);
        if (!parsed.title && !parsed.salle_name && !parsed.enseignant_name) continue;

        // Heure interne dans la cellule (priorité si présente)
        let hour_debut = slot.hour_debut;
        let hour_fin = slot.hour_fin;
        if (parsed.internal_hour_debut && parsed.internal_hour_fin) {
          hour_debut = parsed.internal_hour_debut;
          hour_fin = parsed.internal_hour_fin;
        }

        const attendance_mode: 'normal' | 'bicheck' = 'bicheck';
        const exitWindow = def.exit_capture_window_bicheck;
        const tolMin = def.tolerance_minutes;
        const pointageOffset = def.pointage_offset_minutes ?? 30;
        const hour_debut_poigntage = this.subtractMinutes(hour_debut, pointageOffset);

        const dateFormatted = this.formatDateFromCell(dayInfo.dateRaw);

        const rowData: EdtRowData = {
          title: parsed.title || 'Cours',
          date: dateFormatted,
          hour_debut_poigntage,
          hour_debut,
          hour_fin,
          tolerance: `${String(Math.floor(tolMin / 60)).padStart(2, '0')}:${String(tolMin % 60).padStart(2, '0')}`,
          attendance_mode,
          exit_capture_window: String(exitWindow),
          etablissement_name: def.etablissement_name,
          promotion_name: def.promotion_name,
          type_cours_name: def.type_cours_name || '',
          salle_name: parsed.salle_name || '',
          group_title: parsed.group_title || '',
          ville_name: def.ville_name || '',
          option_name: def.option_name || '',
          enseignant_name: parsed.enseignant_name || '',
          annee_universitaire: anneeUniv,
          _raw: { jour: dayInfo.jour, date: dateFormatted, cell: cellVal }
        };

        result.push(rowData);
      }
    }

    console.log('[EDT Grid] Total extrait:', result.length);
    return result;
  }

  /** Extrait et formate la date en DD/MM/YYYY (ex: 14/02/2026) */
  private formatDateFromCell(dateStr: string | Date): string {
    if (dateStr instanceof Date) {
      return !isNaN(dateStr.getTime()) ? this.dateToDDMMYYYY(dateStr) : '';
    }
    if (!dateStr || !String(dateStr).trim()) {
      return new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const s = String(dateStr).trim();

    // Déjà au format DD/MM/YYYY ou D/M/YYYY
    const m1 = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (m1) {
      return `${m1[1].padStart(2, '0')}/${m1[2].padStart(2, '0')}/${m1[3]}`;
    }

    // Format YYYY-MM-DD
    const m2 = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (m2) {
      return `${m2[3].padStart(2, '0')}/${m2[2].padStart(2, '0')}/${m2[1]}`;
    }

    // Excel serial (nombre de jours depuis 1900-01-01)
    const num = parseFloat(s);
    if (!isNaN(num) && num > 0) {
      const excelEpoch = new Date(1899, 11, 30);
      const d = new Date(excelEpoch.getTime() + num * 86400000);
      return this.dateToDDMMYYYY(d);
    }

    // Format JS Date.toString() : "Mon Feb 16 2026 00:00:20 GMT+0000 (UTC)"
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return this.dateToDDMMYYYY(d);
    }

    return s;
  }

  private dateToDDMMYYYY(d: Date): string {
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  /**
   * Extrait les lignes au format EDT FP4 (matrice Jour x Plages horaires).
   * - Ligne 2 (index 1): colonnes B-G = plages horaires "08h30 - 10h00"
   * - Colonne A: jours (Lundi, Mardi...) avec forward fill
   * - Cellules contenu: texte multi-lignes (title, groupe, salle, enseignant)
   */
  private extractEdtFp4Rows(rows: any[][], defaults?: Partial<typeof EDT_FP4_DEFAULTS>): EdtRowData[] {
    const result: EdtRowData[] = [];
    const currentYear = new Date().getFullYear();
    const anneeUniv = `${currentYear}-${currentYear + 1}`;
    const def = { ...EDT_FP4_DEFAULTS, ...defaults };

    // 1. Identifier les plages horaires (ligne 2 / index 1, colonnes B à G)
    const timeSlots: { hour_debut: string; hour_fin: string; colIndex: number }[] = [];
    const headerRowIndices = [1, 0, 2];

    for (const rowIdx of headerRowIndices) {
      const headerRow = rows[rowIdx] || [];
      for (let c = 1; c <= 8; c++) {
        const cellVal = this.cellToString(headerRow[c]);
        if (rowIdx === 1 && c <= 6) {
          console.log(`[EDT FP4] Cellule header [${rowIdx},${c}]:`, JSON.stringify(cellVal));
        }

        if (!cellVal) continue;

        const parts = cellVal.split(/\s*[-–—]\s*/);
        if (parts.length >= 2) {
          const hour_debut = this.normalizeTimeFromRaw(parts[0].trim());
          const hour_fin = this.normalizeTimeFromRaw(parts[1].trim());
          if (hour_debut && hour_fin && !timeSlots.some(s => s.colIndex === c)) {
            timeSlots.push({ hour_debut, hour_fin, colIndex: c });
            console.log(`[EDT FP4] Plage horaire col ${c}:`, hour_debut, '-', hour_fin);
          }
        }
      }
      if (timeSlots.length > 0) break;
    }

    if (timeSlots.length === 0) {
      console.log('[EDT FP4] Aucune plage horaire détectée (format XXhXX - XXhXX). Format FP4 ignoré.');
      return [];
    }

    timeSlots.sort((a, b) => a.colIndex - b.colIndex);

    // 2. Forward fill pour les jours (colonne A)
    let currentDay = '';
    const dayByRow: string[] = [];

    for (let r = 0; r < rows.length; r++) {
      const dayCell = this.cellToString(rows[r]?.[0]);
      if (dayCell && /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)/i.test(dayCell)) {
        currentDay = dayCell;
      }
      dayByRow[r] = currentDay;
    }

    // 3. Parcourir les cellules de contenu (lignes 2+, colonnes des timeSlots)
    for (let r = 2; r < rows.length; r++) {
      const row = rows[r] || [];
      const jour = dayByRow[r];

      for (const slot of timeSlots) {
        const cellVal = this.cellToString(row[slot.colIndex]);
        console.log(`[EDT FP4] Cellule [${r},${slot.colIndex}] (${jour} ${slot.hour_debut}):`, cellVal ? cellVal.substring(0, 80) + '...' : '(vide)');

        if (!cellVal) continue;

        const parsed = this.parseMultiLineCell(cellVal);
        if (!parsed.title && !parsed.salle_name && !parsed.enseignant_name) continue;

        const attendance_mode: 'normal' | 'bicheck' = 'bicheck';
        const exitWindow = def.exit_capture_window_bicheck;
        const tolMin = def.tolerance_minutes;
        const pointageOffset = def.pointage_offset_minutes ?? 30;
        const hour_debut_poigntage = this.subtractMinutes(slot.hour_debut, pointageOffset);

        const rowData: EdtRowData = {
          title: parsed.title || 'Cours',
          date: this.jourToDate(jour),
          hour_debut_poigntage,
          hour_debut: slot.hour_debut,
          hour_fin: slot.hour_fin,
          tolerance: `${String(Math.floor(tolMin / 60)).padStart(2, '0')}:${String(tolMin % 60).padStart(2, '0')}`,
          attendance_mode,
          exit_capture_window: String(exitWindow),
          etablissement_name: def.etablissement_name,
          promotion_name: def.promotion_name,
          type_cours_name: def.type_cours_name || '',
          salle_name: parsed.salle_name || '',
          group_title: parsed.group_title || '',
          ville_name: def.ville_name || '',
          option_name: def.option_name || '',
          enseignant_name: parsed.enseignant_name || '',
          annee_universitaire: anneeUniv,
          _raw: { jour, cell: cellVal }
        };

        result.push(rowData);
      }
    }

    console.log('[EDT FP4] Total extrait:', result.length);
    return result;
  }

  /** Extrait une chaîne d'une cellule Excel (valeur brute ou objet) */
  private cellToString(val: any): string {
    if (val == null) return '';
    if (typeof val === 'string') return val.trim();
    if (typeof val === 'object' && ('w' in val || 'v' in val)) {
      return String((val as any).w ?? (val as any).v ?? '').trim();
    }
    return String(val).trim();
  }

  /** Convertit une chaîne "08h30" ou "08:30" en "08:30" */
  private normalizeTimeFromRaw(raw: string): string {
    const m = raw.match(/(\d{1,2})[h:.]?(\d{2})?/i);
    if (m) return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
    return '';
  }

  /** Convertit un jour (Lundi, Mardi...) en date DD/MM/YYYY (prochaine occurrence) */
  private jourToDate(jour: string): string {
    if (!jour) {
      const d = new Date();
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    const jours = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
    const idx = jours.indexOf(jour.toLowerCase());
    if (idx < 0) return jour;

    const today = new Date();
    const todayIdx = today.getDay();
    let daysToAdd = idx - todayIdx;
    if (daysToAdd <= 0) daysToAdd += 7;
    const target = new Date(today);
    target.setDate(today.getDate() + daysToAdd);
    return target.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  /**
   * Parse le contenu multi-lignes d'une cellule EDT.
   * - Première ligne non vide → title (module)
   * - "Pr Y. Ouazzani" → enseignant_name
   * - G1-G2-G3-G4 ou G1, G2, G3 → group_title
   * - Salle C401 ou C401 → salle_name
   * - HHhMM-HHhMM (heure interne) → internal_hour_debut, internal_hour_fin
   */
  private parseMultiLineCell(cellText: string): {
    title: string;
    group_title: string;
    salle_name: string;
    enseignant_name: string;
    internal_hour_debut?: string;
    internal_hour_fin?: string;
  } {
    const lines = cellText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    let title = '';
    let group_title = '';
    let salle_name = '';
    let enseignant_name = '';
    let internal_hour_debut = '';
    let internal_hour_fin = '';

    // Heure interne dans la cellule (ex: 09h00-10h30 ou 10h30-12h00)
    const internalTimeMatch = cellText.match(/(\d{1,2})h(\d{2})\s*[-–—]?\s*(\d{1,2})h(\d{2})/i);
    if (internalTimeMatch) {
      internal_hour_debut = `${internalTimeMatch[1].padStart(2, '0')}:${internalTimeMatch[2]}`;
      internal_hour_fin = `${internalTimeMatch[3].padStart(2, '0')}:${internalTimeMatch[4]}`;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      console.log(`[EDT] parseMultiLine ligne ${i}:`, JSON.stringify(line));

      // Enseignant : "Pr Y. Ouazzani" ou "Pr Y. OUAZZANI"
      if (/^Pr\s+/i.test(line)) {
        enseignant_name = line.replace(/^Pr\s+/i, '').trim();
        continue;
      }

      // Groupes : G1-G2-G3-G4-G5-G6 ou G1, G2, G3
      const gMatch = line.match(/(G\d+(?:[-,\s]*(?:G\d+))*)/i);
      if (gMatch) {
        group_title = gMatch[1].trim();
        continue;
      }

      // Salle : Salle C401 ou C401 ou Amphi X
      const salleMatch = line.match(/(?:Salle\s+)?(C\d{2,}|Amphi\s*\w*)/i);
      if (salleMatch) {
        salle_name = salleMatch[1].trim();
        continue;
      }

      // Ignorer les lignes qui sont uniquement une heure (déjà extraite)
      if (/^\d{1,2}h\d{2}\s*[-–—]?\s*\d{1,2}h\d{2}$/i.test(line)) continue;

      // Première ligne significative = titre du module
      if (!title && line && line.length > 2) {
        title = line;
      }
    }

    if (!title && lines.length > 0) title = lines[0];

    return {
      title,
      group_title,
      salle_name,
      enseignant_name,
      ...(internal_hour_debut && internal_hour_fin ? { internal_hour_debut, internal_hour_fin } : {})
    };
  }

  /**
   * Extrait les lignes EDT et les transforme au format attendu.
   * S'adapte à différentes structures de colonnes (détection par nom ou position).
   */
  private extractEdtRows(rows: any[][]): EdtRowData[] {
    const [headerRow, ...dataRows] = rows;
    const headers = (headerRow || []).map((h: any) => String(h || '').trim().toLowerCase().replace(/\s+/g, '_'));
    const headerMap = this.buildHeaderMap(headers);
    const isTemplateFormat = this.isTemplateFormat(headers);

    const result: EdtRowData[] = [];
    const currentYear = new Date().getFullYear();
    const anneeUniv = `${currentYear}-${currentYear + 1}`;

    for (const row of dataRows) {
      const values: Record<string, string> = {};
      (headerRow || []).forEach((h: any, i: number) => {
        const key = String(h || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') || `col_${i}`;
        let v = row[i];
        if (v === null || v === undefined) v = '';
        values[key] = String(v).trim();
      });

      let rowData: EdtRowData;

      if (isTemplateFormat && (values['title'] || values['hour_debut'] || values['salle_name'])) {
        rowData = this.buildFromTemplateFormat(values, anneeUniv);
      } else {
        const title = this.getCell(values, headerMap, ['title', 'module', 'nom', 'cours', 'nom_du_cours']);
        const heureRaw = this.getCell(values, headerMap, ['heure', 'heures', 'plage_horaire', 'creneau', 'hour_debut', 'hour_fin']);
        const dateRaw = this.getCell(values, headerMap, ['date', 'jour']);
        const salle = this.getCell(values, headerMap, ['salle', 'salle_name', 'salles', 'room']);
        const enseignant = this.getCell(values, headerMap, ['enseignant', 'enseignant_name', 'prof', 'professeur']);
        const groupe = this.getCell(values, headerMap, ['groupe', 'group_title', 'group', 'groupes']);
        const promotion = this.getCell(values, headerMap, ['promotion', 'promotion_name', 'niveau']);
        const etablissement = this.getCell(values, headerMap, ['etablissement', 'etablissement_name', 'faculte', 'établissement']);
        const typeCours = this.getCell(values, headerMap, ['type_cours', 'type_cours_name', 'type', 'type_de_cours']);
        const ville = this.getCell(values, headerMap, ['ville', 'ville_name', 'city']);
        const option = this.getCell(values, headerMap, ['option', 'option_name']);

        if (!title && !heureRaw && !salle && !enseignant) continue;

        const { hour_debut, hour_fin } = this.parseTimeRange(heureRaw);
        const hour_debut_poigntage = this.subtractMinutes(hour_debut, 30);
        const normalizedTitle = title || 'Cours';
        const attendance_mode: 'normal' | 'bicheck' = 'bicheck';
        const exit_capture_window = '60';

        rowData = {
          title: normalizedTitle,
          date: this.formatDateForExport(dateRaw),
          hour_debut_poigntage,
          hour_debut,
          hour_fin,
          tolerance: '00:15',
          attendance_mode,
          exit_capture_window,
          etablissement_name: etablissement || EDT_FP4_DEFAULTS.etablissement_name,
          promotion_name: promotion || '',
          type_cours_name: typeCours || EDT_FP4_DEFAULTS.type_cours_name,
          salle_name: salle || '',
          group_title: groupe || '',
          ville_name: ville || EDT_FP4_DEFAULTS.ville_name,
          option_name: option || EDT_FP4_DEFAULTS.option_name,
          enseignant_name: enseignant || '',
          annee_universitaire: anneeUniv,
          _raw: { ...values }
        };
      }

      result.push(rowData);
    }

    return result;
  }

  private isTemplateFormat(headers: string[]): boolean {
    const norm = headers.map(h => h.replace(/[^a-z0-9]/g, ''));
    return norm.includes('title') && (norm.includes('hourdebut') || norm.includes('hour_debut'));
  }

  private buildFromTemplateFormat(values: Record<string, string>, anneeUniv: string): EdtRowData {
    const get = (keys: string[]) => keys.map(k => values[k] || values[k.replace(/_/g, '')]).find(Boolean) || '';
    const title = get(['title']);
    const hourDebut = get(['hour_debut', 'hourdebut']);
    const hourFin = get(['hour_fin', 'hourfin']);
    const { hour_debut, hour_fin } = (hourDebut && hourFin)
      ? { hour_debut: this.normalizeTime(hourDebut), hour_fin: this.normalizeTime(hourFin) }
      : this.parseTimeRange(get(['heure', 'heures']));
    const hour_debut_poigntage = get(['hour_debut_poigntage', 'hourdebutpoigntage']) || this.subtractMinutes(hour_debut, 30);
    const modeRaw = (get(['attendance_mode', 'attendancemode']) || 'bicheck').toLowerCase();
    const attendance_mode: 'normal' | 'bicheck' = modeRaw === 'normal' ? 'normal' : 'bicheck';
    const exitRaw = get(['exit_capture_window', 'exitcapturewindow']);
    const exit_capture_window = attendance_mode === 'bicheck' ? (exitRaw || '60') : '0';

    return {
      title: title || 'Cours',
      date: this.formatDateForExport(get(['date'])),
      hour_debut_poigntage,
      hour_debut,
      hour_fin,
      tolerance: get(['tolerance']) || '00:15',
      attendance_mode,
      exit_capture_window,
      etablissement_name: get(['etablissement_name', 'etablissementname']) || EDT_FP4_DEFAULTS.etablissement_name,
      promotion_name: get(['promotion_name', 'promotionname']),
      type_cours_name: get(['type_cours_name', 'typecoursname']) || EDT_FP4_DEFAULTS.type_cours_name,
      salle_name: get(['salle_name', 'sallename']),
      group_title: get(['group_title', 'grouptitle']),
      ville_name: get(['ville_name', 'villename']) || EDT_FP4_DEFAULTS.ville_name,
      option_name: get(['option_name', 'optionname']) || EDT_FP4_DEFAULTS.option_name,
      enseignant_name: get(['enseignant_name', 'enseignantname']),
      annee_universitaire: get(['annee_universitaire', 'anneeuniversitaire']) || anneeUniv,
      _raw: { ...values }
    };
  }

  private normalizeTime(t: string): string {
    const m = t.match(/(\d{1,2})[h:.]?(\d{2})?/i);
    if (m) return `${m[1].padStart(2, '0')}:${(m[2] || '00').padStart(2, '0')}`;
    return t;
  }

  private buildHeaderMap(headers: string[]): Map<string, number> {
    const map = new Map<string, number>();
    headers.forEach((h, i) => {
      const norm = h.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      if (norm) map.set(norm, i);
      map.set(h, i);
    });
    return map;
  }

  private getCell(values: Record<string, string>, _headerMap: Map<string, number>, keys: string[]): string {
    for (const key of keys) {
      const kNorm = key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
      for (const [header, val] of Object.entries(values)) {
        if (!val) continue;
        const hNorm = header.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
        if (hNorm.includes(kNorm) || kNorm.includes(hNorm) || hNorm === kNorm) {
          return val;
        }
      }
    }
    return '';
  }

  /**
   * Transforme '09h00 - 10h30' ou '09:00-10:30' en hour_debut et hour_fin.
   */
  parseTimeRange(raw: string): { hour_debut: string; hour_fin: string } {
    if (!raw || !raw.trim()) {
      return { hour_debut: '08:00', hour_fin: '10:00' };
    }

    const match = raw.match(/(\d{1,2})[h:.](\d{2})\s*[-–—]\s*(\d{1,2})[h:.](\d{2})/i);
    if (match) {
      const h1 = match[1].padStart(2, '0');
      const m1 = match[2].padStart(2, '0');
      const h2 = match[3].padStart(2, '0');
      const m2 = match[4].padStart(2, '0');
      return {
        hour_debut: `${h1}:${m1}`,
        hour_fin: `${h2}:${m2}`
      };
    }

    const singleMatch = raw.match(/(\d{1,2})[h:.](\d{2})/i);
    if (singleMatch) {
      const h = singleMatch[1].padStart(2, '0');
      const m = singleMatch[2].padStart(2, '0');
      const start = `${h}:${m}`;
      const end = this.addMinutes(start, 120);
      return { hour_debut: start, hour_fin: end };
    }

    return { hour_debut: '08:00', hour_fin: '10:00' };
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  private subtractMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    let total = h * 60 + m - minutes;
    if (total < 0) total = 0;
    const nh = Math.floor(total / 60) % 24;
    const nm = total % 60;
    return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
  }

  private formatDateForExport(raw: string): string {
    if (!raw) {
      const d = new Date();
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    if (raw.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [y, m, d] = raw.split('-');
      return `${d}/${m}/${y}`;
    }
    if (raw.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      return raw;
    }
    const d = new Date(raw);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    return raw;
  }

  /**
   * Valide une ligne et retourne la liste des champs manquants.
   */
  validateRow(row: EdtRowData): string[] {
    const errors: string[] = [];
    for (const field of REQUIRED_FIELDS) {
      const val = (row as any)[field];
      if (!val || String(val).trim() === '') {
        const label = this.getFieldLabel(field);
        errors.push(`${label} manquant`);
      }
    }
    return errors;
  }

  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      title: 'Module/Cours',
      date: 'Date',
      hour_debut: 'Heure début',
      hour_fin: 'Heure fin',
      etablissement_name: 'Établissement',
      promotion_name: 'Promotion',
      type_cours_name: 'Type de cours',
      salle_name: 'Salle',
      group_title: 'Groupe',
      ville_name: 'Ville'
    };
    return labels[field] || field;
  }

  /**
   * Exporte les données au format modele_import_cours.xlsx.
   */
  exportToModelFormat(rows: EdtRowData[], filename = 'modele_import_cours_corrige.xlsx'): void {
    const headerRow = [...TEMPLATE_HEADERS];
    const dataRows = rows.map(row =>
      TEMPLATE_HEADERS.map(h => (row as any)[h] ?? '')
    );
    const aoa = [headerRow, ...dataRows];
    const worksheet = utils.aoa_to_sheet(aoa);
    const colWidths = TEMPLATE_HEADERS.map(() => ({ wch: 18 }));
    worksheet['!cols'] = colWidths;
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Cours');
    writeFile(workbook, filename);
  }

  /**
   * Prépare les données pour l'API d'import (format attendu par le backend).
   */
  prepareForApiImport(rows: EdtRowData[], filterOptions: any): any[] {
    return rows.map(row => {
      const normalizedMode = (row.attendance_mode || 'normal').toString().toLowerCase().trim();
      const attendanceMode = normalizedMode === 'bicheck' || normalizedMode === 'bi-check' ? 'bicheck' : 'normal';
      const exitWindow = parseInt(String(row.exit_capture_window || '0'), 10) || (attendanceMode === 'bicheck' ? 15 : 0);

      const item: any = {
        name: row.title || '',
        date: this.toApiDate(row.date),
        heure_debut: this.toApiTime(row.hour_debut),
        heure_fin: this.toApiTime(row.hour_fin),
        tolerance: this.toApiTime(row.tolerance || '00:15'),
        pointage_start_hour: this.toApiTime(row.hour_debut_poigntage || row.hour_debut),
        attendance_mode: attendanceMode,
        exit_capture_window: attendanceMode === 'bicheck' ? exitWindow : 0,
        etablissement_name: row.etablissement_name || '',
        promotion_name: row.promotion_name || '',
        type_cours_name: row.type_cours_name || '',
        salle_name: row.salle_name || '',
        group_title: row.group_title || '',
        ville_name: row.ville_name || '',
        option_name: row.option_name || '',
        enseignant_name: row.enseignant_name || '',
        annee_universitaire: row.annee_universitaire || ''
      };

      if (filterOptions) {
        const find = (arr: any[] | undefined, name: string, field = 'name') => {
          if (!name || !arr?.length) return null;
          const n = this.normalize(name);
          return arr.find((e: any) => {
            const v = this.normalize(e[field] || e.title || e.name || '');
            return v === n || v.includes(n) || n.includes(v);
          }) || null;
        };
        const etab = find(filterOptions.etablissements, row.etablissement_name);
        const promo = find(filterOptions.promotions, row.promotion_name);
        const type = find(filterOptions.types_cours, row.type_cours_name);
        const ville = find(filterOptions.villes, row.ville_name);
        const option = find(filterOptions.options, row.option_name);
        const enseignant = find(filterOptions.enseignants, row.enseignant_name);

        if (etab) item.etablissement_id = etab.id;
        if (promo) item.promotion_id = promo.id;
        if (type) item.type_cours_id = type.id;
        if (ville) item.ville_id = ville.id;
        if (option) item.option_id = option.id;
        if (enseignant) item.enseignant_id = enseignant.id;

        const salleNames = (row.salle_name || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const salleIds: number[] = [];
        salleNames.forEach((sn: string) => {
          const s = find(filterOptions.salles, sn);
          if (s) salleIds.push(s.id);
        });
        if (salleIds.length) item.salle_id = salleIds[0];

        const groupTitles = (row.group_title || '').split(',').map((g: string) => g.trim()).filter(Boolean);
        const groupIds: number[] = [];
        groupTitles.forEach((gt: string) => {
          const g = filterOptions.groups?.find((gr: any) =>
            this.normalize(gr.title || gr.name || '') === this.normalize(gt)
          );
          if (g) groupIds.push(g.id);
        });
        if (groupIds.length) item.group_ids = groupIds;
      }

      return item;
    });
  }

  private normalize(str: string): string {
    return String(str || '').toLowerCase().trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private toApiDate(dateStr: string): string {
    if (!dateStr) return '';
    const m = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}/)) return dateStr.split('T')[0];
    return dateStr;
  }

  private toApiTime(timeStr: string): string {
    if (!timeStr) return '00:00';
    const m = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (m) return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}:00`;
    return timeStr + (timeStr.includes(':') && timeStr.split(':').length === 2 ? ':00' : '');
  }
}
