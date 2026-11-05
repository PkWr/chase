// Style settings and the metrics of each styled block. Pure functions, no DOM, so they can be tested.
// Sizes are ratios of the body size. Heading leading is tight (half lines of the body leading) and each heading is padded to whole body lines, so the
// baselines of the text after it stay on the baseline grid. Headings differ by size only, never by weight.

export const STYLE_DEFAULTS = {
    h1: 2.2,
    h2: 1.5,
    h3: 1.15,
    quoteIndent: 2, // em, left indent of Block Quote and Citation
    citationSize: 0.85,
};

/** Whole body lines needed to hold a size: a 19.2 pt heading on 14 pt leading takes 2. */
export const linesFor = (sizePx, lineHeightPx) => Math.max(1, Math.ceil(sizePx / lineHeightPx - 0.001));

/** Extra space that brings a block of height h up to a whole number of body lines. */
export const snapHeight = (h, lineHeightPx) => Math.ceil(h / lineHeightPx - 0.001) * lineHeightPx - h;

/**
 * Metrics of one block style, in the same pixels as base.
 * base: { sizePx, lineHeightPx, spaceAfterPx }; settings: STYLE_DEFAULTS-shaped.
 * Returns { sizePx, lineHeightPx, marginTopPx, marginBottomPx, indentPx, keepWithNext }.
 */
export function blockMetrics(style, settings, base) {
    const s = { ...STYLE_DEFAULTS, ...settings };
    const m = { sizePx: base.sizePx, lineHeightPx: base.lineHeightPx, marginTopPx: 0, marginBottomPx: base.spaceAfterPx, indentPx: 0, keepWithNext: false, snapToGrid: false };
    if (style === 'h1' || style === 'h2' || style === 'h3') {
        m.sizePx = base.sizePx * s[style];
        // Tight leading: the smallest half line of body leading that holds the size. A heading that wraps
        // is then padded up to whole body lines (snapHeight) so the text after it stays on the grid.
        const half = base.lineHeightPx / 2;
        m.lineHeightPx = Math.max(half, Math.ceil(m.sizePx / half - 0.001) * half);
        m.snapToGrid = true;
        m.marginTopPx = (style === 'h1' ? 2 : 1) * base.lineHeightPx;
        // space after is the Space after paragraph setting from Type, like every other style
        m.keepWithNext = true;
    } else if (style === 'quote') {
        m.indentPx = s.quoteIndent * base.sizePx;
    } else if (style === 'citation') {
        m.sizePx = base.sizePx * s.citationSize;
        m.indentPx = s.quoteIndent * base.sizePx;
    }
    return m;
}
