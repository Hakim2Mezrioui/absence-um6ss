/* Web Worker for computing validation suggestions off the main thread */

interface Suggestion {
  label: string;
  id?: number;
}

interface ReferenceEntry {
  label: string;
  normalized: string;
  id?: number;
}

type InitMessage = {
  type: 'init';
  header: string;
  reference: ReferenceEntry[];
};

type ComputeMessage = {
  type: 'compute';
  requestId: number;
  rowIndex: number;
  header: string;
  rawValue: string;
  reference?: ReferenceEntry[];
};

type InMessage = InitMessage | ComputeMessage;

type OutMessage = {
  requestId: number;
  rowIndex: number;
  header: string;
  isValid: boolean;
  suggestions: Suggestion[];
};

const referenceByHeader: Record<string, ReferenceEntry[]> = {};
const normalizedSetByHeader: Record<string, Set<string>> = {};
const prefixIndexByHeader: Record<string, Map<string, ReferenceEntry[]>> = {};
const resultCache: Map<string, { isValid: boolean; suggestions: Suggestion[] }> = new Map();

function buildIndexes(header: string, reference: ReferenceEntry[]) {
  referenceByHeader[header] = reference;
  const normalizedSet = new Set<string>();
  const prefixIndex = new Map<string, ReferenceEntry[]>();
  for (const entry of reference) {
    normalizedSet.add(entry.normalized);
    const pref = entry.normalized.slice(0, 3);
    if (!prefixIndex.has(pref)) prefixIndex.set(pref, []);
    prefixIndex.get(pref)!.push(entry);
  }
  normalizedSetByHeader[header] = normalizedSet;
  prefixIndexByHeader[header] = prefixIndex;
}

function normalize(value: string): string {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const matrix: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) matrix[i][0] = i;
  for (let j = 0; j <= n; j++) matrix[0][j] = j;
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

function compute(header: string, reference: ReferenceEntry[], rawValue: string): { isValid: boolean; suggestions: Suggestion[] } {
  const value = (rawValue ?? '').trim();
  const normalized = normalize(value);

  const cacheKey = `${header}|${normalized}`;
  if (resultCache.has(cacheKey)) {
    return resultCache.get(cacheKey)!;
  }

  if (!value) {
    const res = {
      isValid: false,
      suggestions: reference.slice(0, 5).map((entry) => ({ label: entry.label, id: entry.id }))
    };
    resultCache.set(cacheKey, res);
    return res;
  }

  if (normalized.length < 3) {
    const quick = reference
      .filter((entry) => entry.normalized.startsWith(normalized) || entry.normalized.includes(normalized))
      .slice(0, 30)
      .map((entry) => ({ label: entry.label, id: entry.id }));
    const exact = (normalizedSetByHeader[header] || new Set()).has(normalized);
    const res = exact
      ? { isValid: true, suggestions: [] }
      : { isValid: false, suggestions: quick.length ? quick.slice(0, 5) : reference.slice(0, 5).map((e) => ({ label: e.label, id: e.id })) };
    resultCache.set(cacheKey, res);
    return res;
  }

  if ((normalizedSetByHeader[header] || new Set()).has(normalized)) {
    const res = { isValid: true, suggestions: [] };
    resultCache.set(cacheKey, res);
    return res;
  }

  let pool: ReferenceEntry[] = [];
  const prefixIndex = prefixIndexByHeader[header];
  if (prefixIndex) {
    const pref = normalized.slice(0, 3);
    pool = (prefixIndex.get(pref) || []).slice(0, 200);
  }
  if (pool.length === 0) {
    // Fallback includes with hard cap
    for (const entry of reference) {
      if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) {
        pool.push(entry);
        if (pool.length >= 200) break;
      }
    }
    if (pool.length === 0) pool = reference.slice(0, Math.min(200, reference.length));
  }

  const limited = pool.slice(0, 50); // strict cap for distance
  const scored = limited.map((entry) => {
    let score = 0;
    if (entry.normalized.includes(normalized) || normalized.includes(entry.normalized)) score += 50;
    if (entry.normalized.startsWith(normalized)) score += 20;
    const distance = levenshteinDistance(normalized, entry.normalized);
    score += Math.max(0, 40 - distance * 10);
    return { entry, score };
  }).filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score);
  const suggestions = (scored.length ? scored : limited.slice(0, 3))
    .slice(0, 5)
    .map((item: any) => ('entry' in item ? item.entry : item))
    .map((entry: ReferenceEntry) => ({ label: entry.label, id: entry.id }));
  const res = { isValid: false, suggestions };
  resultCache.set(cacheKey, res);
  return res;
}

self.onmessage = (e: MessageEvent<InMessage>) => {
  const msg = e.data;
  if (!msg) return;
  if (msg.type === 'init') {
    const { header, reference } = msg as InitMessage;
    buildIndexes(header, reference || []);
    return;
  }
  const { requestId, rowIndex, header, rawValue, reference } = msg as ComputeMessage;
  const ref = referenceByHeader[header] || reference || [];
  const result = compute(header, ref, rawValue || '');
  const out: OutMessage = {
    requestId,
    rowIndex,
    header,
    isValid: result.isValid,
    suggestions: result.suggestions
  };
  (self as any).postMessage(out);
};


