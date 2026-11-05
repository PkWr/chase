// Style settings and the metrics of each styled block. Pure functions, no DOM, so they can be tested.
// Sizes are ratios of the body size. Headings are set in whole lines of the body leading so that the
// baselines of the text after them stay on the baseline grid.

export const STYLE_DEFAULTS = {
    h1: 1.6,
    h2: 1.3,
    h3: 1.15,
    quoteIndent: 2, // em, left indent of Block Quote and Citation
    citationSize: 0.85,
};

/** Whole body lines needed to hold a size: a 19.2 pt heading on 14 pt leading takes 2. */
export const linesFor = (sizePx, lineHeightPx) => Math.max(1, Math.ceil(sizePx / lineHeightPx - 0.001));

/**
 * Metrics of one block style, in the same pixels as base.
 * base: { sizePx, lineHeightPx, spaceAfterPx }; settings: STYLE_DEFAULTS-shaped.
 * Returns { sizePx, lineHeightPx, marginTopPx, marginBottomPx, indentPx, bold, keepWithNext }.
 */
export function blockMetrics(style, settings, base) {
    const s = { ...STYLE_DEFAULTS, ...settings };
    const m = { sizePx: base.sizePx, lineHeightPx: base.lineHeightPx, marginTopPx: 0, marginBottomPx: base.spaceAfterPx, indentPx: 0, bold: false, keepWithNext: false };
    if (style === 'h1' || style === 'h2' || style === 'h3') {
        m.sizePx = base.sizePx * s[style];
        m.lineHeightPx = linesFor(m.sizePx, base.lineHeightPx) * base.lineHeightPx;
        m.marginTopPx = (style === 'h1' ? 2 : 1) * base.lineHeightPx;
        m.marginBottomPx = 0;
        m.bold = true;
        m.keepWithNext = true;
    } else if (style === 'quote') {
        m.indentPx = s.quoteIndent * base.sizePx;
    } else if (style === 'citation') {
        m.sizePx = base.sizePx * s.citationSize;
        m.indentPx = s.quoteIndent * base.sizePx;
    }
    return m;
}
