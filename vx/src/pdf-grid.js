// A grid-only page for the PDF specification: the page (or facing pages), margins, columns and gutters,
// the baseline grid, and a dimension chain under and beside each page. Drawn as vector in jsPDF, in mm.
import { layoutFor } from './idml.js';

const PT_PER_MM = 72 / 25.4;
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;

const MAGENTA = [214, 51, 132];
const BLUE = [110, 140, 200];
const COL_FILL = [228, 236, 250];
const TEXT_FILL = [255, 240, 150];

function hChain(pdf, y, segs) {
    const first = segs[0].x0;
    const last = segs[segs.length - 1].x1;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);
    pdf.line(first, y, last, y);
    const ticks = [first, ...segs.map((s) => s.x1)];
    ticks.forEach((x) => pdf.line(x, y - 1.2, x, y + 1.2));
    let narrow = 0;
    segs.forEach((s) => {
        const w = s.x1 - s.x0;
        const cx = (s.x0 + s.x1) / 2;
        pdf.setFontSize(7);
        const lw = Math.max(pdf.getTextWidth(s.mm), pdf.getTextWidth(s.em));
        if (lw + 1 <= w) {
            pdf.setTextColor(0, 0, 0);
            pdf.text(s.mm, cx, y + 4, { align: 'center' });
            if (s.em) {
                pdf.setTextColor(110, 110, 110);
                pdf.text(s.em, cx, y + 7.2, { align: 'center' });
            }
        } else {
            const ry = y + 12 + (narrow % 2) * 8.5;
            narrow++;
            pdf.setLineWidth(0.1);
            pdf.line(cx, y, cx, ry - 3.2);
            pdf.setTextColor(0, 0, 0);
            pdf.text(s.mm, cx, ry, { align: 'center' });
            pdf.setTextColor(110, 110, 110);
            pdf.text(s.em, cx, ry + 3.2, { align: 'center' });
        }
    });
    pdf.setTextColor(0, 0, 0);
}

function vChain(pdf, x, segs, side = 'left') {
    const first = segs[0].y0;
    const last = segs[segs.length - 1].y1;
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.15);
    pdf.line(x, first, x, last);
    [first, ...segs.map((s) => s.y1)].forEach((y) => pdf.line(x - 1.2, y, x + 1.2, y));
    segs.forEach((s) => {
        const cy = (s.y0 + s.y1) / 2;
        pdf.setFontSize(7);
        pdf.setTextColor(0, 0, 0);
        const dx = side === 'left' ? -1.6 : 4.4;
        const dx2 = side === 'left' ? -4.8 : 7.6;
        pdf.text(s.mm, x + dx, cy + pdf.getTextWidth(s.mm) / 2, { angle: 90 });
        if (s.em) {
            pdf.setTextColor(110, 110, 110);
            pdf.text(s.em, x + dx2, cy + pdf.getTextWidth(s.em) / 2, { angle: 90 });
        }
    });
    pdf.setTextColor(0, 0, 0);
}

/**
 * Draws the grid page on the current jsPDF page (A4 portrait, 210 x 297 mm).
 * inputs: form inputs (mm for page and margins, gutter in mm, typeSize and leading in pt).
 */
export function drawGridPage(pdf, inputs, facing) {
    const lay = layoutFor(inputs, facing);
    const pageW = lay.W / PT_PER_MM;
    const pageH = lay.H / PT_PER_MM;
    const top = lay.top / PT_PER_MM;
    const bottom = lay.bottom / PT_PER_MM;
    const gutter = lay.gutter / PT_PER_MM;
    const emMM = inputs.typeSize / PT_PER_MM;
    const leadingMM = (inputs.leading || inputs.typeSize + 2) / PT_PER_MM;
    const both = (mm) => ({ mm: `${r1(mm)} mm`, em: `${r2(mm / emMM)} em` });

    // Title and caption
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text('Grid and measurements', 14, 14);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(90, 90, 90);
    pdf.text(`Page ${r1(pageW)} × ${r1(pageH)} mm · ${lay.n} ${lay.n === 1 ? 'column' : 'columns'} · gutter ${r1(gutter)} mm · baseline grid ${r1(inputs.leading || inputs.typeSize + 2)} pt · 1 em = ${r1(inputs.typeSize)} pt`, 14, 19);

    // Fit the page or spread, leaving room for the dimension chains
    const nPages = lay.pages.length;
    const areaX = 26;
    const areaW = 210 - areaX - 22;
    const areaY = 34;
    const areaH = 297 - areaY - 50;
    const s = Math.min(areaW / (pageW * nPages), areaH / pageH);
    const drawW = pageW * s * nPages;
    const x0 = areaX + (areaW - drawW) / 2;
    const y0 = areaY;

    // Page size across the top and down the right-hand side
    pdf.setFontSize(7);
    hChain(pdf, y0 - 5, [{ x0, x1: x0 + drawW, mm: nPages > 1 ? `${r1(pageW)} mm × 2 (spread ${r1(pageW * 2)} mm)` : `${r1(pageW)} mm`, em: '' }]);

    lay.pages.forEach((p, idx) => {
        const px = x0 + idx * pageW * s;
        const left = p.left / PT_PER_MM;
        const right = p.right / PT_PER_MM;
        const textW = p.textWidth / PT_PER_MM;
        const colW = p.colWidth / PT_PER_MM;

        // Page
        pdf.setFillColor(255, 255, 255);
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.3);
        pdf.rect(px, y0, pageW * s, pageH * s, 'FD');

        // Columns (text box columns in yellow, the others in blue)
        const textCols = new Set();
        for (const f of p.frames) {
            for (let i = 0; i < lay.n; i++) {
                const cx0 = p.x + p.left + i * (p.colWidth + lay.gutter);
                if (cx0 >= f.x0 - 0.01 && cx0 + p.colWidth <= f.x1 + 0.01) textCols.add(i);
            }
        }
        for (let i = 0; i < lay.n; i++) {
            const cx = px + (left + i * (colW + gutter)) * s;
            const fill = textCols.has(i) ? TEXT_FILL : COL_FILL;
            pdf.setFillColor(fill[0], fill[1], fill[2]);
            pdf.setDrawColor(BLUE[0], BLUE[1], BLUE[2]);
            pdf.setLineWidth(0.15);
            pdf.rect(cx, y0 + top * s, colW * s, (pageH - top - bottom) * s, 'FD');
        }

        // Baseline grid, over the text area
        pdf.setDrawColor(205, 205, 205);
        pdf.setLineWidth(0.05);
        for (let y = top + leadingMM; y <= pageH - bottom + 0.01; y += leadingMM) {
            pdf.line(px + left * s, y0 + y * s, px + (left + textW) * s, y0 + y * s);
        }

        // Margin rectangle
        pdf.setDrawColor(MAGENTA[0], MAGENTA[1], MAGENTA[2]);
        pdf.setLineWidth(0.25);
        pdf.rect(px + left * s, y0 + top * s, textW * s, (pageH - top - bottom) * s, 'S');

        // Horizontal chain under the page: margin, columns and gutters, margin
        const segs = [{ x0: px, x1: px + left * s, ...both(left) }];
        for (let i = 0; i < lay.n; i++) {
            const cx = px + (left + i * (colW + gutter)) * s;
            segs.push({ x0: cx, x1: cx + colW * s, ...both(colW) });
            if (i < lay.n - 1) segs.push({ x0: cx + colW * s, x1: cx + (colW + gutter) * s, ...both(gutter) });
        }
        segs.push({ x0: px + (left + textW) * s, x1: px + pageW * s, ...both(right) });
        hChain(pdf, y0 + pageH * s + 6, segs);
    });

    // Vertical chain at the left of the first page: top margin, text height, bottom margin
    vChain(pdf, x0 - 6, [
        { y0, y1: y0 + top * s, ...both(top) },
        { y0: y0 + top * s, y1: y0 + (pageH - bottom) * s, ...both(pageH - top - bottom) },
        { y0: y0 + (pageH - bottom) * s, y1: y0 + pageH * s, ...both(bottom) },
    ]);

    // Page height down the right-hand side
    vChain(pdf, x0 + drawW + 6, [{ y0, y1: y0 + pageH * s, ...both(pageH) }], 'right');

    // Legend
    const ly = 297 - 8;
    pdf.setFontSize(7);
    pdf.setTextColor(90, 90, 90);
    pdf.setFillColor(TEXT_FILL[0], TEXT_FILL[1], TEXT_FILL[2]);
    pdf.rect(14, ly - 2.6, 4, 3, 'F');
    pdf.text('Text box columns', 19.5, ly);
    pdf.setFillColor(COL_FILL[0], COL_FILL[1], COL_FILL[2]);
    pdf.rect(52, ly - 2.6, 4, 3, 'F');
    pdf.text('Other columns', 57.5, ly);
    pdf.setDrawColor(MAGENTA[0], MAGENTA[1], MAGENTA[2]);
    pdf.setLineWidth(0.3);
    pdf.line(86, ly - 1, 92, ly - 1);
    pdf.text('Margins', 93.5, ly);
    pdf.setDrawColor(205, 205, 205);
    pdf.line(112, ly - 1, 118, ly - 1);
    pdf.text('Baseline grid', 119.5, ly);
    pdf.setTextColor(0, 0, 0);
}
