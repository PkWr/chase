// Specification page for the IDML export: a last page holding a table of every setting, its value, and
// where to change it in InDesign (menu path and Mac / Windows shortcut). Pure functions, no DOM.

const PT_PER_MM = 72 / 25.4;
const SPEC_FONT = 'Arial';
const num = (v) => String(Math.round(v * 10000) / 10000);
const mmOf = (pt) => Math.round((pt / PT_PER_MM) * 10) / 10;
const esc = (s) => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const DOC_SETUP = 'File > Document Setup… (Opt+Cmd+P / Ctrl+Alt+P)';
const MARGINS = 'Layout > Margins and Columns… (no default shortcut). Select the pages in the Pages panel first (Window > Pages, Cmd+F12 / F12). To change every page, double-click A-Master in the Pages panel instead.';
const GRID = 'InDesign > Settings > Grids… on Mac (Edit > Preferences > Grids… on Windows), Cmd+K / Ctrl+K then choose Grids. Show it with View > Grids & Guides > Show Baseline Grid (Opt+Cmd+\' / Ctrl+Alt+\').';
const BODY = 'Window > Styles > Paragraph Styles (Cmd+F11 / F11), then double-click Body.';

/** Rows of [setting, value, where to change it]. Pure; lay comes from layoutFor. */
export function specRows(spec, lay, facing, family) {
    const i = spec.inputs;
    const leading = i.leading || i.typeSize + 2;
    const after = spec.paraSpacePt === undefined || isNaN(spec.paraSpacePt) ? leading : spec.paraSpacePt;
    const rows = [
        ['Page size', `${i.pageWidth} × ${i.pageHeight} mm`, DOC_SETUP],
        ['Orientation', lay.H >= lay.W ? 'Portrait' : 'Landscape', DOC_SETUP],
        ['Facing pages', facing ? 'Yes' : 'No', DOC_SETUP + ', tick Facing Pages'],
    ];
    if (facing) {
        for (const p of lay.pages) {
            const outside = p.side === 'verso' ? p.left : p.right;
            const inside = p.side === 'verso' ? p.right : p.left;
            rows.push([`Margins, ${p.side} page`, `outside ${mmOf(outside)}, inside ${mmOf(inside)} mm`, MARGINS]);
        }
    } else {
        rows.push(['Margins, left and right', `${mmOf(lay.pages[0].left)} and ${mmOf(lay.pages[0].right)} mm`, MARGINS]);
    }
    rows.push(['Margins, top and bottom', `${mmOf(lay.top)} and ${mmOf(lay.bottom)} mm`, MARGINS]);
    rows.push(['Columns', String(lay.n), MARGINS]);
    rows.push(['Gutter', `${mmOf(lay.gutter)} mm`, MARGINS]);
    rows.push(['Baseline grid', `${num(leading)} pt, starting at the top of the page margin`, GRID]);
    rows.push(['Type size', `${num(i.typeSize)} pt`, BODY]);
    rows.push(['Leading', `${num(leading)} pt`, BODY]);
    rows.push(['Typeface', family, BODY]);
    rows.push(['Alignment', i.justifyText ? 'Justified' : 'Left aligned', BODY + ' Or the alignment buttons in the Paragraph panel (Window > Type & Tables > Paragraph, Opt+Cmd+T / Ctrl+Alt+T).']);
    rows.push(['Hyphenation', i.hyphenation ? 'On' : 'Off', BODY + ' Hyphenation is in the style options.']);
    rows.push(['Space after paragraph', `${num(after)} pt`, BODY + ' Indents and Spacing.']);
    rows.push(['Text frames', `${lay.spans * lay.pages.length} linked, starting in column ${lay.startIndex + 1}, each ${lay.spanCols} column${lay.spanCols > 1 ? 's' : ''} wide`, 'Object > Text Frame Options… (Cmd+B / Ctrl+B). Show the links with View > Extras > Show Text Threads (Opt+Cmd+Y / Ctrl+Alt+Y). Text that does not fit shows a red plus (overset).']);
    return rows;
}

/** Builds the spec page: returns { page, frame, story, pageName } as XML strings. */
export function specPage(spec, lay, facing, family) {
    const rows = specRows(spec, lay, facing, family);
    const m = Math.min(15 * PT_PER_MM, lay.W / 10);
    const x = facing ? -lay.W : 0;
    const frameW = lay.W - 2 * m;
    const pageName = String(lay.pages.length + (facing ? 2 : 1));
    const page = `<Page Self="u250" Name="${pageName}" AppliedMaster="n" GeometricBounds="0 0 ${num(lay.H)} ${num(lay.W)}" ItemTransform="1 0 0 1 ${num(x)} ${num(-lay.H / 2)}">`
        + `<MarginPreference ColumnCount="1" ColumnGutter="12" Top="${num(m)}" Bottom="${num(m)}" Left="${num(m)}" Right="${num(m)}" ColumnDirection="Horizontal" ColumnsPositions="0 ${num(frameW)}"/></Page>`;
    const x0 = x + m; const x1 = x0 + frameW; const y0 = -lay.H / 2 + m; const y1 = lay.H / 2 - m;
    const pt = (a, b) => `<PathPointType Anchor="${num(a)} ${num(b)}" LeftDirection="${num(a)} ${num(b)}" RightDirection="${num(a)} ${num(b)}"/>`;
    const frame = '<TextFrame Self="u1200" ParentStory="u1001" PreviousTextFrame="n" NextTextFrame="n" ContentType="TextType" ItemLayer="u2" AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]" ItemTransform="1 0 0 1 0 0" FillColor="Swatch/None" StrokeColor="Swatch/None" StrokeWeight="0">'
        + '<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>'
        + pt(x0, y0) + pt(x0, y1) + pt(x1, y1) + pt(x1, y0)
        + '</PathPointArray></GeometryPathType></PathGeometry></Properties>'
        + '<TextFramePreference TextColumnCount="1" FirstBaselineOffset="LeadingOffset"/></TextFrame>';

    const size = Math.max(6.5, Math.min(9, lay.W / 60));
    const widths = [0.24, 0.26, 0.5].map((f) => frameW * f);
    const para = (style, text) => `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${style}"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"><Content>${esc(text)}</Content></CharacterStyleRange></ParagraphStyleRange>`;
    const cell = (n, col, row, style, text) => `<Cell Self="u1500i${n}" Name="${col}:${row}" RowSpan="1" ColumnSpan="1" AppliedCellStyle="CellStyle/$ID/[None]" AppliedCellStylePriority="0" TopInset="2" BottomInset="2" LeftInset="2" RightInset="3" BottomEdgeStrokeWeight="0.5" BottomEdgeStrokeColor="Color/Black">${para(style, text)}</Cell>`;
    const all = [['Setting', 'Value', 'Where to change it in InDesign'], ...rows];
    let cells = ''; let n = 0;
    all.forEach((r, ri) => r.forEach((t, ci) => { cells += cell(n++, ci, ri, ri === 0 ? 'SpecHead' : 'SpecText', t); }));
    const table = `<Table Self="u1500" HeaderRowCount="0" FooterRowCount="0" BodyRowCount="${all.length}" ColumnCount="3" AppliedTableStyle="TableStyle/$ID/[Basic Table]" TableDirection="LeftToRightDirection">`
        + all.map((_, r) => `<Row Self="u1500Row${r}" Name="${r}" SingleRowHeight="${num(size + 6)}" AutoGrow="true"/>`).join('')
        + widths.map((w, c) => `<Column Self="u1500Column${c}" Name="${c}" SingleColumnWidth="${num(w)}"/>`).join('')
        + cells + '</Table>';
    const story = '<Story Self="u1001" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">\n'
        + para('SpecTitle', 'chase specification') + '<Br/>\n'
        + para('SpecText', 'Open this file with File > Open… (Cmd+O / Ctrl+O). The table lists each setting in this document and where to change it. Delete this page when it is no longer needed.') + '<Br/>\n'
        + `<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/SpecText"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">${table}</CharacterStyleRange></ParagraphStyleRange>\n`
        + '</Story>';
    const styles = [
        ['SpecTitle', 'Bold', size + 5, size + 9, size],
        ['SpecHead', 'Bold', size, size + 3, 0],
        ['SpecText', 'Regular', size, size + 3, size / 2],
    ].map(([name, fs, ps, ld, sa]) => `<ParagraphStyle Self="ParagraphStyle/${name}" Name="${name}" Imported="false" NextStyle="ParagraphStyle/${name}" KeyboardShortcut="0 0" FontStyle="${fs}" PointSize="${num(ps)}" Justification="LeftAlign" SpaceBefore="0" SpaceAfter="${num(sa)}" FillColor="Color/Black"><Properties><Leading type="unit">${num(ld)}</Leading><AppliedFont type="string">${SPEC_FONT}</AppliedFont></Properties></ParagraphStyle>\n`).join('');
    return { page, frame, story, pageName, styles };
}
