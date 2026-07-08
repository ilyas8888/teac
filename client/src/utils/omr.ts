// ─── Print coordinate space : 794 × 1123 px (A4 référence) ──────────────────
// Le SVG de la feuille de réponses utilise viewBox="0 0 794 1123".
// L'OMR travaille en coordonnées normalisées [0,1] déduites de ces valeurs.

export const SHEET = { W: 794, H: 1123 };

// Centres des repères de coin dans l'espace print (px)
// → les carrés noirs SVG font 20×20 à 15px des bords
export const MARK_PX = {
  TL: { x: 25,  y: 25   },
  TR: { x: 769, y: 25   },
  BL: { x: 25,  y: 1098 },
  BR: { x: 769, y: 1098 },
};

// Centres des repères en coordonnées normalisées [0,1]
const MN = {
  TL: { u: MARK_PX.TL.x / SHEET.W, v: MARK_PX.TL.y / SHEET.H },
  TR: { u: MARK_PX.TR.x / SHEET.W, v: MARK_PX.TR.y / SHEET.H },
  BL: { u: MARK_PX.BL.x / SHEET.W, v: MARK_PX.BL.y / SHEET.H },
  BR: { u: MARK_PX.BR.x / SHEET.W, v: MARK_PX.BR.y / SHEET.H },
};

// Disposition de la grille de réponses (px dans l'espace print)
export const TABLE = {
  TABLE_TOP:   260,              // Y du haut de la première ligne
  AREA_H:      800,              // hauteur totale disponible pour les lignes
  ROW_H_MIN:   32,
  ROW_H_MAX:   58,
  OPT_X:       [200, 285, 370, 455, 540] as readonly number[],  // centres X des colonnes A-E
  LABEL_X:     60,
  PTS_X:       650,
  BUBBLE_R:    10,               // rayon de bulle en px print
};

export function rowHeight(n: number): number {
  return Math.min(TABLE.ROW_H_MAX, Math.max(TABLE.ROW_H_MIN, Math.floor(TABLE.AREA_H / Math.max(1, n))));
}

export function rowCenterY(i: number, n: number): number {
  const h = rowHeight(n);
  return TABLE.TABLE_TOP + i * h + h / 2;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QcmRow {
  label:      string;
  questionId: string;
  options:    string[];
  correctes:  number[];
  points:     number;
  multiple:   boolean;
}

export interface BubbleResult {
  label:      string;
  questionId: string;
  options:    string[];
  detected:   number[];
  correctes:  number[];
  points:     number;
  earned:     number;
  isCorrect:  boolean;
  multiple:   boolean;
}

export interface AnalysisOk {
  results:      BubbleResult[];
  totalEarned:  number;
  totalPoints:  number;
  debugUrl:     string;
}

export type AnalysisResult = AnalysisOk | { error: string };

// ─── Algorithme OMR ──────────────────────────────────────────────────────────

type Point   = { x: number; y: number };
type Corners = { TL: Point; TR: Point; BL: Point; BR: Point };

function toGray(data: Uint8ClampedArray): Uint8ClampedArray {
  const g = new Uint8ClampedArray(data.length >> 2);
  for (let i = 0; i < g.length; i++) {
    g[i] = Math.round(0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2]);
  }
  return g;
}

function detectCorners(gray: Uint8ClampedArray, w: number, h: number): Corners | null {
  const REGION    = 0.20;  // 20 % de l'image depuis chaque coin
  const DARK      = 80;    // seuil de noirceur
  const MIN_PX    = 25;    // pixels sombres minimum pour valider un repère

  function centroid(x0: number, y0: number, x1: number, y1: number): Point | null {
    let sx = 0, sy = 0, n = 0;
    for (let y = y0; y < y1; y++)
      for (let x = x0; x < x1; x++)
        if (gray[y * w + x] < DARK) { sx += x; sy += y; n++; }
    return n >= MIN_PX ? { x: sx / n, y: sy / n } : null;
  }

  const rx = Math.floor(w * REGION);
  const ry = Math.floor(h * REGION);

  const TL = centroid(0,     0,     rx, ry);
  const TR = centroid(w - rx, 0,    w,  ry);
  const BL = centroid(0,     h - ry, rx, h);
  const BR = centroid(w - rx, h - ry, w, h);

  if (!TL || !TR || !BL || !BR) return null;

  // Vérification : les 4 coins doivent former un quasi-rectangle
  const wr = (TR.x - TL.x) / (BR.x - BL.x);
  const hr = (BL.y - TL.y) / (BR.y - TR.y);
  if (wr < 0.6 || wr > 1.4 || hr < 0.6 || hr > 1.4) return null;

  return { TL, TR, BL, BR };
}

// Mappe un point en coordonnées print (px) vers les pixels du scan
function printToScan(px: number, py: number, corners: Corners): Point {
  const u = px / SHEET.W;
  const v = py / SHEET.H;

  // Normalise par rapport au cadre des repères
  const a = (u - MN.TL.u) / (MN.TR.u - MN.TL.u);
  const b = (v - MN.TL.v) / (MN.BL.v - MN.TL.v);

  return {
    x: Math.round((1-a)*(1-b)*corners.TL.x + a*(1-b)*corners.TR.x + (1-a)*b*corners.BL.x + a*b*corners.BR.x),
    y: Math.round((1-a)*(1-b)*corners.TL.y + a*(1-b)*corners.TR.y + (1-a)*b*corners.BL.y + a*b*corners.BR.y),
  };
}

function sampleCircle(gray: Uint8ClampedArray, w: number, h: number, cx: number, cy: number, r: number): number {
  let sum = 0, n = 0;
  const r2 = r * r;
  for (let y = Math.max(0, cy - r | 0); y <= Math.min(h - 1, (cy + r) | 0); y++)
    for (let x = Math.max(0, cx - r | 0); x <= Math.min(w - 1, (cx + r) | 0); x++)
      if ((x-cx)**2 + (y-cy)**2 <= r2) { sum += gray[y * w + x]; n++; }
  return n > 0 ? sum / n : 255;
}

function loadImg(file: File): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); res(img); };
    img.onerror = rej;
    img.src = url;
  });
}

export async function analyzeSheet(file: File, rows: QcmRow[]): Promise<AnalysisResult> {
  const img = await loadImg(file);
  const cv  = document.createElement('canvas');
  cv.width  = img.width;
  cv.height = img.height;
  const ctx = cv.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const data  = ctx.getImageData(0, 0, img.width, img.height).data;
  const gray  = toGray(data);
  const w = img.width, h = img.height;

  const corners = detectCorners(gray, w, h);
  if (!corners) return {
    error: 'Repères de coin non détectés. Vérifiez que les 4 carrés noirs sont entièrement visibles et que la feuille est bien éclairée.',
  };

  // Rayon de bulle proportionnel à la taille détectée de la feuille
  const markSpanPx    = corners.TR.x - corners.TL.x;
  const markSpanNorm  = MN.TR.u - MN.TL.u;
  const scaleRatio    = markSpanPx / (markSpanNorm * SHEET.W);
  const bubbleR       = Math.max(8, Math.round(TABLE.BUBBLE_R * scaleRatio));

  const FILL = 140; // luminosité < seuil → case cochée
  const n    = rows.length;

  const results: BubbleResult[] = rows.map((row, i) => {
    const printY = rowCenterY(i, n);
    const detected: number[] = [];

    row.options.slice(0, TABLE.OPT_X.length).forEach((_, j) => {
      const { x, y } = printToScan(TABLE.OPT_X[j], printY, corners);
      if (sampleCircle(gray, w, h, x, y, bubbleR) < FILL) detected.push(j);
    });

    const cSet = new Set(row.correctes);
    const dSet = new Set(detected);
    const isCorrect = cSet.size === dSet.size && [...cSet].every(c => dSet.has(c));

    return { ...row, detected, isCorrect, earned: isCorrect ? row.points : 0 };
  });

  // Superposition de debug sur le canvas
  const lw = Math.max(2, Math.round(bubbleR / 4));
  ctx.lineWidth = lw;
  ctx.font = `bold ${Math.round(bubbleR * 1.2)}px sans-serif`;

  rows.forEach((row, i) => {
    const printY = rowCenterY(i, n);
    const res    = results[i];

    row.options.slice(0, TABLE.OPT_X.length).forEach((_, j) => {
      const { x, y } = printToScan(TABLE.OPT_X[j], printY, corners);
      const isDet = res.detected.includes(j);
      const isCor = row.correctes.includes(j);

      if      (isDet && isCor)  ctx.strokeStyle = '#22c55e';  // vert   : bon
      else if (isDet && !isCor) ctx.strokeStyle = '#ef4444';  // rouge  : faux
      else if (!isDet && isCor) ctx.strokeStyle = '#f59e0b';  // orange : manqué
      else                      ctx.strokeStyle = 'rgba(120,120,120,0.25)';

      ctx.beginPath();
      ctx.arc(x, y, bubbleR + lw * 2, 0, Math.PI * 2);
      ctx.stroke();
    });
  });

  // Repères de coin en violet
  Object.values(corners).forEach(({ x, y }) => {
    ctx.fillStyle = '#7c3aed';
    const s = Math.round(bubbleR * 0.8);
    ctx.fillRect(x - s, y - s, s * 2, s * 2);
  });

  return {
    results,
    totalEarned: results.reduce((s, r) => s + r.earned, 0),
    totalPoints: results.reduce((s, r) => s + r.points, 0),
    debugUrl: cv.toDataURL('image/jpeg', 0.88),
  };
}
