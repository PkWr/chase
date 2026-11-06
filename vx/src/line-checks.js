// Line-break checks on the rendered preview: single lines stranded at the top or bottom of a column
// (orphans and widows) and very short last lines (runts). Reads the laid-out text, so it reflects the
// browser's line breaking, which InDesign may set differently. Columns past the last one on the page
// are the start of the next page.

const RUNT_SHARE = 0.15; // a last line shorter than this share of the column width is a runt

function firstWords(text, n = 5) {
    const w = text.replace(/\s+/g, ' ').trim().split(' ');
    return w.slice(0, n).join(' ') + (w.length > n ? '…' : '');
}

/** Lines of one paragraph as { col, left, right }, in reading order. */
function linesOf(p, x0, step) {
    const range = document.createRange();
    range.selectNodeContents(p);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    const cells = rects.map((r) => ({
        col: Math.max(0, Math.floor((r.left + 0.5 - x0) / step)),
        top: r.top, bottom: r.bottom, left: r.left, right: r.right,
    }));
    cells.sort((a, b) => a.col - b.col || a.top - b.top);
    const lines = [];
    for (const c of cells) {
        const last = lines[lines.length - 1];
        if (last && last.col === c.col && c.top < last.top + (last.bottom - last.top) * 0.5) {
            last.left = Math.min(last.left, c.left);
            last.right = Math.max(last.right, c.right);
            last.bottom = Math.max(last.bottom, c.bottom);
        } else {
            lines.push({ ...c });
        }
    }
    return lines;
}

/**
 * Looks through the first text flow in root. Returns null when it cannot be measured (hidden or absent),
 * otherwise { orphans, widows, runts }, each a list of { text, where }.
 */
export function analyseLines(root) {
    const div = root && root.querySelector('[data-flow]');
    if (!div || !div.offsetWidth)
        return null;
    const dr = div.getBoundingClientRect();
    if (!dr.width)
        return null;
    const scale = dr.width / div.offsetWidth;
    const n = parseInt(div.style.columnCount, 10) || 1;
    const pad = parseFloat(div.style.padding) || 0;
    const gap = parseFloat(div.style.columnGap) || 0;
    const colW = (div.offsetWidth - 2 * pad - (n - 1) * gap) / n;
    const step = (colW + gap) * scale;
    const x0 = dr.left + pad * scale;
    const out = { orphans: [], widows: [], runts: [] };
    const where = (col) => (col >= n ? 'the end of the page' : `the end of column ${col + 1}`);
    div.querySelectorAll(':scope > p').forEach((p) => {
        const lines = linesOf(p, x0, step);
        if (lines.length < 2)
            return;
        if (lines[0].col >= n)
            return; // starts on the next page: beyond what the preview shows
        // Group the lines by column
        const groups = [];
        for (const l of lines) {
            const g = groups[groups.length - 1];
            if (g && g.col === l.col)
                g.count++;
            else
                groups.push({ col: l.col, count: 1 });
        }
        const text = firstWords(p.textContent || '');
        if (groups.length > 1) {
            const first = groups[0];
            const last = groups[groups.length - 1];
            if (first.count === 1)
                out.orphans.push({ text, where: where(first.col) });
            if (last.count === 1 && last.col <= n)
                out.widows.push({ text, where: where(groups[groups.length - 2].col) });
        }
        // Runt: the paragraph's last line is a word or two
        const lastLine = lines[lines.length - 1];
        if (lastLine.col <= n && (lastLine.right - lastLine.left) < RUNT_SHARE * colW * scale)
            out.runts.push({ text, where: lastLine.col >= n ? 'the next page' : `column ${lastLine.col + 1}` });
    });
    return out;
}
