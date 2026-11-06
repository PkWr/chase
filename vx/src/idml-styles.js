// Named styles for the IDML export. Pure functions, no DOM.
// Paragraph styles: Body Text, Heading 1-3, Block Quote, Citation. Character style: Emphasis (italic).
// Sizes, leading and spacing come from the same blockMetrics the preview uses, in points, so the
// InDesign file matches the page. Every style aligns to the baseline grid, which does in InDesign what
// the preview does by padding headings to whole lines.

import { blockMetrics, STYLE_DEFAULTS } from './style-settings.js';
import { parseStyled, stylesUsed, SOFT_RETURN } from './styled-text.js';

/** The font style name InDesign expects for the regular weight of each typeface offered. */
export function fontName(family) {
    if (family === 'serif')
        return 'Times New Roman';
    if (family === 'sans-serif')
        return 'Arial';
    if (family === 'monospace')
        return 'Courier New';
    return family || 'Times New Roman';
}

export const STYLE_LABELS = {
    body: 'Body Text',
    h1: 'Heading 1',
    h2: 'Heading 2',
    h3: 'Heading 3',
    quote: 'Block Quote',
    citation: 'Citation',
};
export const EMPHASIS = 'Emphasis';
const ORDER = ['body', 'h1', 'h2', 'h3', 'quote', 'citation'];

const num = (v) => String(Math.round(v * 10000) / 10000);
const attr = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
export const paraRef = (key) => `ParagraphStyle/${encodeURIComponent(STYLE_LABELS[key])}`;
const charRef = `CharacterStyle/${encodeURIComponent(EMPHASIS)}`;
const NO_CHAR = 'CharacterStyle/$ID/[No character style]';

/**
 * One definition per style: { key, name, metrics, font }. spec carries inputs, paraSpacePt,
 * styleSettings (ratios) and styleFonts ({style: typeface or ''}); fontName turns a typeface into a font name.
 */
export function styleDefs(spec, fontName) {
    const i = spec.inputs;
    const leading = i.leading || i.typeSize + 2;
    const spaceAfter = spec.paraSpacePt === undefined || isNaN(spec.paraSpacePt) ? leading : spec.paraSpacePt;
    const base = { sizePx: i.typeSize, lineHeightPx: leading, spaceAfterPx: spaceAfter };
    const settings = { ...STYLE_DEFAULTS, ...(spec.styleSettings || {}) };
    const fonts = spec.styleFonts || {};
    return ORDER.map((key) => ({
        key,
        name: STYLE_LABELS[key],
        metrics: blockMetrics(key, settings, base),
        font: fontName(fonts[key] || i.fontFamily),
    }));
}

/** The paragraph styles as IDML XML. */
export function paragraphStylesXml(defs, inputs) {
    return defs.map((d) => {
        const m = d.metrics;
        const next = paraRef('body');
        return `<ParagraphStyle Self="${paraRef(d.key)}" Name="${attr(d.name)}" Imported="false" NextStyle="${next}" KeyboardShortcut="0 0" FontStyle="Regular"`
            + ` PointSize="${num(m.sizePx)}" Justification="${inputs.justifyText ? 'LeftJustified' : 'LeftAlign'}" Hyphenation="${inputs.hyphenation ? 'true' : 'false'}"`
            + ` SpaceBefore="${num(m.marginTopPx)}" SpaceAfter="${num(m.marginBottomPx)}" LeftIndent="${num(m.indentPx)}"`
            + ` AlignToBaseline="true" KeepWithNext="${m.keepWithNext ? 1 : 0}" FillColor="Color/Black">`
            + `<Properties><Leading type="unit">${num(m.lineHeightPx)}</Leading><AppliedFont type="string">${attr(d.font)}</AppliedFont></Properties></ParagraphStyle>\n`;
    }).join('');
}

/** The character style that carries italic. */
export function characterStylesXml() {
    return `<CharacterStyle Self="${charRef}" Name="${EMPHASIS}" Imported="false" KeyboardShortcut="0 0" FontStyle="Italic"/>\n`;
}

/** Story content: one ParagraphStyleRange per block, emphasis runs on the Emphasis character style. */
export function storyBodyXml(text, xmlText) {
    const blocks = parseStyled(text);
    const range = (b) => {
        const runs = b.runs.map((r) => {
            const style = r.em ? charRef : NO_CHAR;
            const content = r.br ? SOFT_RETURN : xmlText(r.text);
            return `<CharacterStyleRange AppliedCharacterStyle="${style}"><Content>${content}</Content></CharacterStyleRange>`;
        }).join('');
        return runs;
    };
    return blocks.map((b, i) =>
        `<ParagraphStyleRange AppliedParagraphStyle="${paraRef(b.style)}">${range(b)}${i < blocks.length - 1 ? '<Br/>' : ''}</ParagraphStyleRange>`).join('\n');
}

/** Which styles the text uses, for the specification page. */
export function usedStyles(text) {
    const blocks = parseStyled(text || '');
    const used = stylesUsed(blocks);
    return { used, emphasis: blocks.some((b) => b.runs.some((r) => r.em)) };
}
