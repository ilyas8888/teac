import { format } from 'date-fns';
import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts } from 'pdf-lib';
import type { Evaluation } from '../types';
import { TABLE, rowCenterY, rowHeight, SHEET, type QcmRow } from './omr';

const PAGE_W = 595;
const PAGE_H = 842;
const S = PAGE_W / SHEET.W;

const X = (u: number) => u * S;
const Y = (v: number) => PAGE_H - v * S;

const BLACK = rgb(0, 0, 0);
const GRAY = rgb(0.6, 0.6, 0.6);
const LGRAY = rgb(0.85, 0.85, 0.85);
const WHITE = rgb(1, 1, 1);

export interface SheetStudent {
  nom: string;
  prenom: string;
  classe?: string;
}

export async function generateAnswerSheet(
  evaluation: Evaluation,
  qcmRows: QcmRow[],
  students?: SheetStudent[],
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const targets: Array<SheetStudent | null> = students && students.length > 0 ? students : [null];

  targets.forEach((student) => addPage(pdf, font, bold, evaluation, qcmRows, student));

  return pdf.save();
}

function addPage(
  pdf: PDFDocument,
  font: PDFFont,
  bold: PDFFont,
  evaluation: Evaluation,
  qcmRows: QcmRow[],
  student: SheetStudent | null,
): void {
  const page = pdf.addPage([PAGE_W, PAGE_H]);
  const n = qcmRows.length;
  const rh = rowHeight(n);
  const date = format(new Date(evaluation.date), 'dd/MM/yyyy');
  const maxOpts = Math.min(5, Math.max(...qcmRows.map((r) => r.options.filter(Boolean).length)));
  const optLabels = ['A', 'B', 'C', 'D', 'E'].slice(0, maxOpts);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: WHITE });
  drawCornerMarkers(page);

  drawCenteredText(page, bold, 'FEUILLE DE REPONSES QCM', 15, 60, BLACK);
  drawCenteredText(page, font, evaluation.titre, 12, 84, BLACK);
  drawCenteredText(page, font, `${date} - Bareme : ${evaluation.bareme} pts`, 10, 104, GRAY);

  page.drawText('Nom :', { x: X(50), y: Y(140), size: 11, font, color: BLACK });
  drawLine(page, 88, 142, 290, 142, BLACK, 0.8);
  page.drawText('Prenom :', { x: X(300), y: Y(140), size: 11, font, color: BLACK });
  drawLine(page, 348, 142, 540, 142, BLACK, 0.8);
  page.drawText('Classe :', { x: X(550), y: Y(140), size: 11, font, color: BLACK });
  drawLine(page, 590, 142, 744, 142, BLACK, 0.8);

  if (student) {
    page.drawText(student.nom, { x: X(92), y: Y(138), size: 11, font: bold, color: BLACK });
    page.drawText(student.prenom, { x: X(352), y: Y(138), size: 11, font: bold, color: BLACK });
    if (student.classe) {
      page.drawText(student.classe, { x: X(594), y: Y(138), size: 11, font: bold, color: BLACK });
    }
  }

  drawCenteredText(
    page,
    font,
    'Noircissez entierement la case de votre choix - ne faites pas de croix ni de crochet',
    9,
    168,
    GRAY,
  );

  drawLine(page, 40, 178, 754, 178, BLACK, 1);

  page.drawText('Question', { x: X(TABLE.LABEL_X), y: Y(200), size: 10, font: bold, color: BLACK });
  optLabels.forEach((label, j) => {
    drawCenteredAt(page, bold, label, 11, TABLE.OPT_X[j], 200, BLACK);
  });
  drawCenteredAt(page, bold, '/ pts', 10, TABLE.PTS_X, 200, BLACK);
  drawLine(page, 40, 208, 754, 208, BLACK, 0.8);

  qcmRows.forEach((row, i) => {
    const cy = rowCenterY(i, n);
    const lineY = TABLE.TABLE_TOP + (i + 1) * rh;

    page.drawText(row.label, { x: X(TABLE.LABEL_X), y: Y(cy + 4), size: 10, font, color: BLACK });

    row.options.filter(Boolean).slice(0, maxOpts).forEach((_, j) => {
      if (row.multiple) {
        page.drawRectangle({
          x: X(TABLE.OPT_X[j] - 10),
          y: Y(cy + 10),
          width: X(20),
          height: X(20),
          borderColor: BLACK,
          borderWidth: 1.5 * S,
        });
      } else {
        page.drawEllipse({
          x: X(TABLE.OPT_X[j]),
          y: Y(cy),
          xScale: X(10),
          yScale: X(10),
          borderColor: BLACK,
          borderWidth: 1.5 * S,
        });
      }
    });

    drawCenteredAt(page, font, String(row.points), 9, TABLE.PTS_X, cy + 4, GRAY);

    if (i < n - 1) {
      drawLine(page, 40, lineY, 754, lineY, LGRAY, 0.5);
    }
  });

  drawLine(page, 40, TABLE.TABLE_TOP + n * rh, 754, TABLE.TABLE_TOP + n * rh, BLACK, 1);
  drawCenteredText(page, font, `ID : ${evaluation.id.slice(0, 12)}... - Teac`, 8, 1075, GRAY);
  drawCornerMarkers(page);
}

function drawCenteredText(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  y: number,
  color: ReturnType<typeof rgb>,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_W - width) / 2, y: Y(y), size, font, color });
}

function drawCenteredAt(
  page: PDFPage,
  font: PDFFont,
  text: string,
  size: number,
  cx: number,
  y: number,
  color: ReturnType<typeof rgb>,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: X(cx) - width / 2, y: Y(y), size, font, color });
}

function drawLine(
  page: PDFPage,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: ReturnType<typeof rgb>,
  thickness: number,
): void {
  page.drawLine({
    start: { x: X(x1), y: Y(y1) },
    end: { x: X(x2), y: Y(y2) },
    color,
    thickness: thickness * S,
  });
}

function drawCornerMarkers(page: PDFPage): void {
  [
    [15, 15],
    [759, 15],
    [15, 1088],
    [759, 1088],
  ].forEach(([x, y]) => {
    page.drawRectangle({
      x: X(x),
      y: Y(y + 20),
      width: X(20),
      height: X(20),
      color: BLACK,
    });
  });
}
