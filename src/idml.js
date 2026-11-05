// IDML export: builds the files of an InDesign Markup Language package from the layout settings.
// Pure functions only (no DOM), so the output can be checked in tests. ui.js zips and downloads it.
//
// What is written: page size, facing pages, margins, columns and gutter on the document pages and the
// master, a baseline grid at the leading, one paragraph style ("Body"), and the text in frames placed
// where the text starts and spans, linked in order. Text that does not fit stays overset (red plus).

const PT_PER_MM = 72 / 25.4;
const DOM = '8.0';
const NS = 'xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging"';
const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

export const IDML_MIMETYPE = 'application/vnd.adobe.indesign-idml-package';

const mm = (v) => (Number(v) || 0) * PT_PER_MM;
const num = (v) => String(Math.round(v * 10000) / 10000);

/** Escapes text for XML, dropping characters XML cannot carry. */
export function xmlText(s) {
    return String(s)
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
const attr = (s) => xmlText(s).replace(/"/g, '&quot;');

/** The font style name InDesign expects for the regular weight of each typeface offered. */
function fontName(family) {
    if (family === 'serif')
        return 'Times New Roman';
    if (family === 'sans-serif')
        return 'Arial';
    if (family === 'monospace')
        return 'Courier New';
    return family || 'Times New Roman';
}

/**
 * Works out the pages, margins, columns and text frames. Everything is in points.
 * Spread coordinates: x runs from the spine (single page: left edge) and y from the spread's centre.
 */
export function layoutFor(inputs, facing) {
    const W = mm(inputs.pageWidth);
    const H = mm(inputs.pageHeight);
    const top = mm(inputs.topMargin);
    const bottom = mm(inputs.bottomMargin);
    const gutter = mm(inputs.gutterWidth);
    const n = Math.max(1, inputs.numCols | 0);
    // Physical margins of each page. The facing-page names follow the on-screen drawing:
    // verso has the outer margin on its left and the inner margin on its right.
    const pages = facing
        ? [
            { side: 'verso', left: mm(inputs.outerMarginLeft ?? inputs.rightMargin), right: mm(inputs.innerMarginLeft ?? inputs.leftMargin), x: -W },
            { side: 'recto', left: mm(inputs.innerMarginRight ?? inputs.leftMargin), right: mm(inputs.outerMarginRight ?? inputs.rightMargin), x: 0 },
        ]
        : [{ side: 'single', left: mm(inputs.leftMargin), right: mm(inputs.rightMargin), x: 0 }];
    const spanStart = inputs.columnSpanStart !== undefined ? inputs.columnSpanStart : 1;
    const spanEnd = inputs.columnSpanEnd !== undefined ? inputs.columnSpanEnd : n;
    const spanCols = Math.max(1, spanEnd - spanStart + 1);
    const textColumns = inputs.textColumns && inputs.textColumns.length > 0 ? inputs.textColumns : [spanStart];
    const startIndex = Math.max(0, Math.min(...textColumns) - 1);
    const spans = Math.max(1, Math.floor((n - startIndex) / spanCols));
    for (const p of pages) {
        p.textWidth = W - p.left - p.right;
        p.colWidth = (p.textWidth - (n - 1) * gutter) / n;
        p.positions = [];
        for (let i = 0; i < n; i++) {
            p.positions.push(i * (p.colWidth + gutter), i * (p.colWidth + gutter) + p.colWidth);
        }
        p.frames = [];
        for (let s = 0; s < spans; s++) {
            const col = startIndex + s * spanCols;
            const x0 = p.x + p.left + col * (p.colWidth + gutter);
            const w = spanCols * p.colWidth + (spanCols - 1) * gutter;
            p.frames.push({ x0, x1: x0 + w, y0: -H / 2 + top, y1: H / 2 - bottom });
        }
    }
    return { W, H, top, bottom, gutter, n, pages, spans, spanCols, startIndex };
}

function marginPref(p, lay) {
    // For facing pages InDesign names the margins Left = inside (spine side) and Right = outside.
    let left = p.left;
    let right = p.right;
    if (p.side === 'verso') {
        left = p.right;
        right = p.left;
    }
    return `<MarginPreference ColumnCount="${lay.n}" ColumnGutter="${num(lay.gutter)}" Top="${num(lay.top)}" Bottom="${num(lay.bottom)}" Left="${num(left)}" Right="${num(right)}" ColumnDirection="Horizontal" ColumnsPositions="${p.positions.map(num).join(' ')}"/>`;
}

function pageXml(id, name, master, p, lay, withMargins = true) {
    const bounds = `0 0 ${num(lay.H)} ${num(lay.W)}`;
    return `<Page Self="${id}" Name="${name}" AppliedMaster="${master}" GeometricBounds="${bounds}" ItemTransform="1 0 0 1 ${num(p.x)} ${num(-lay.H / 2)}">${withMargins ? marginPref(p, lay) : ''}</Page>`;
}

function frameXml(id, prev, next, f) {
    const pt = (x, y) => `<PathPointType Anchor="${num(x)} ${num(y)}" LeftDirection="${num(x)} ${num(y)}" RightDirection="${num(x)} ${num(y)}"/>`;
    return `<TextFrame Self="${id}" ParentStory="u1000" PreviousTextFrame="${prev}" NextTextFrame="${next}" ContentType="TextType" ItemLayer="u2" AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]" ItemTransform="1 0 0 1 0 0" FillColor="Swatch/None" StrokeColor="Swatch/None" StrokeWeight="0">`
        + '<Properties><PathGeometry><GeometryPathType PathOpen="false"><PathPointArray>'
        + pt(f.x0, f.y0) + pt(f.x0, f.y1) + pt(f.x1, f.y1) + pt(f.x1, f.y0)
        + '</PathPointArray></GeometryPathType></PathGeometry></Properties>'
        + '<TextFramePreference TextColumnCount="1" FirstBaselineOffset="LeadingOffset"/>'
        + '</TextFrame>';
}

/**
 * Builds the package. Returns an array of [path, content] in zip order (mimetype first).
 * spec: { inputs, text, paraSpacePt, facing, name }
 */
export function buildIdmlFiles(spec) {
    const inputs = spec.inputs;
    const facing = !!spec.facing;
    const lay = layoutFor(inputs, facing);
    const paras = String(spec.text || '').split(/\n+/).map((s) => s.trim()).filter(Boolean);
    const leading = inputs.leading || inputs.typeSize + 2;
    const spaceAfter = spec.paraSpacePt === undefined || isNaN(spec.paraSpacePt) ? leading : spec.paraSpacePt;
    const family = fontName(inputs.fontFamily);
    const files = [];
    const add = (path, content) => files.push([path, content]);

    add('mimetype', IDML_MIMETYPE);

    add('META-INF/container.xml', HEAD
        + '<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles>'
        + '<rootfile full-path="designmap.xml" media-type="text/xml"/></rootfiles></container>\n');

    // Frames, in reading order across the pages, linked into one story.
    const frames = [];
    lay.pages.forEach((p, pi) => p.frames.forEach((f, fi) => frames.push({ page: pi, f })));
    frames.forEach((fr, i) => { fr.id = 'u' + (1100 + i); });
    frames.forEach((fr, i) => {
        fr.prev = i > 0 ? frames[i - 1].id : 'n';
        fr.next = i < frames.length - 1 ? frames[i + 1].id : 'n';
    });

    const pageIds = lay.pages.map((_, i) => 'u' + (210 + i));
    const masterPageIds = lay.pages.map((_, i) => 'u' + (110 + i));

    add('designmap.xml', HEAD
        + '<?aid style="50" type="document" readerVersion="6.0" featureSet="257" product="8.0(370)" ?>\n'
        + `<Document ${NS} DOMVersion="${DOM}" Self="d" StoryList="u1000" Name="${attr(spec.name || 'chase')}" ZeroPoint="0 0" ActiveLayer="u2" `
        + 'CMYKProfile="U.S. Web Coated (SWOP) v2" RGBProfile="sRGB IEC61966-2.1" SolidColorIntent="UseColorSettings" AfterBlendingIntent="UseColorSettings" DefaultImageIntent="UseColorSettings" RGBPolicy="PreserveEmbeddedProfiles" CMYKPolicy="CombinationOfPreserveAndSafeCmyk" AccurateLABSpots="false">\n'
        + '<idPkg:Graphic src="Resources/Graphic.xml"/>\n'
        + '<idPkg:Styles src="Resources/Styles.xml"/>\n'
        + '<idPkg:Preferences src="Resources/Preferences.xml"/>\n'
        + '<Layer Self="u2" Name="Layer 1" Visible="true" Locked="false" IgnoreWrap="false" ShowGuides="true" LockGuides="false" UI="true" Expendable="true" Printable="true"><Properties><LayerColor type="enumeration">LightBlue</LayerColor></Properties></Layer>\n'
        + `<Section Self="u300" Length="${lay.pages.length}" Name="" ContinueNumbering="false" IncludeSectionPrefix="false" PageNumberStyle="Arabic" Marker="" PageStart="${pageIds[0]}" SectionPrefix=""${facing ? ' PageNumberStart="2"' : ''}/>\n`
        + '<idPkg:MasterSpread src="MasterSpreads/MasterSpread_u100.xml"/>\n'
        + '<idPkg:Spread src="Spreads/Spread_u200.xml"/>\n'
        + '<idPkg:Story src="Stories/Story_u1000.xml"/>\n'
        + '</Document>\n');

    add('Resources/Graphic.xml', HEAD
        + `<idPkg:Graphic ${NS} DOMVersion="${DOM}">\n`
        + '<Color Self="Color/Black" Model="Process" Space="CMYK" ColorValue="0 0 0 100" ColorOverride="Specialblack" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Black" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
        + '<Color Self="Color/Paper" Model="Process" Space="CMYK" ColorValue="0 0 0 0" ColorOverride="Hiddenreserved" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Paper" ColorEditable="true" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
        + '<Color Self="Color/Registration" Model="Registration" Space="CMYK" ColorValue="100 100 100 100" ColorOverride="Hiddenreserved" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="Registration" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
        + '<Swatch Self="Swatch/None" Name="None" ColorEditable="false" ColorRemovable="false" Visible="true" SwatchCreatorID="7937"/>\n'
        + '</idPkg:Graphic>\n');

    add('Resources/Styles.xml', HEAD
        + `<idPkg:Styles ${NS} DOMVersion="${DOM}">\n`
        + '<RootCharacterStyleGroup Self="u70">\n'
        + '<CharacterStyle Self="CharacterStyle/$ID/[No character style]" Imported="false" KeyboardShortcut="0 0" Name="$ID/[No character style]"/>\n'
        + '</RootCharacterStyleGroup>\n'
        + '<RootParagraphStyleGroup Self="u71">\n'
        + '<ParagraphStyle Self="ParagraphStyle/$ID/[No paragraph style]" Name="$ID/[No paragraph style]" Imported="false" NextStyle="ParagraphStyle/$ID/[No paragraph style]" KeyboardShortcut="0 0"/>\n'
        + `<ParagraphStyle Self="ParagraphStyle/Body" Name="Body" Imported="false" NextStyle="ParagraphStyle/Body" KeyboardShortcut="0 0" FontStyle="Regular" PointSize="${num(inputs.typeSize)}" Justification="${inputs.justifyText ? 'LeftJustified' : 'LeftAlign'}" Hyphenation="${inputs.hyphenation ? 'true' : 'false'}" SpaceBefore="0" SpaceAfter="${num(spaceAfter)}" FillColor="Color/Black">`
        + `<Properties><Leading type="unit">${num(leading)}</Leading><AppliedFont type="string">${attr(family)}</AppliedFont></Properties></ParagraphStyle>\n`
        + '</RootParagraphStyleGroup>\n'
        + '<RootObjectStyleGroup Self="u72">\n'
        + '<ObjectStyle Self="ObjectStyle/$ID/[None]" Name="$ID/[None]" Imported="false" KeyboardShortcut="0 0"/>\n'
        + '<ObjectStyle Self="ObjectStyle/$ID/[Normal Text Frame]" Name="$ID/[Normal Text Frame]" Imported="false" KeyboardShortcut="0 0"/>\n'
        + '</RootObjectStyleGroup>\n'
        + '</idPkg:Styles>\n');

    add('Resources/Preferences.xml', HEAD
        + `<idPkg:Preferences ${NS} DOMVersion="${DOM}">\n`
        + `<DocumentPreference PageHeight="${num(lay.H)}" PageWidth="${num(lay.W)}" PagesPerDocument="${lay.pages.length}" FacingPages="${facing ? 'true' : 'false'}" PageBinding="LeftToRight" ColumnDirection="Horizontal" PageOrientation="${lay.H >= lay.W ? 'Portrait' : 'Landscape'}"/>\n`
        + '<ViewPreference HorizontalMeasurementUnits="Millimeters" VerticalMeasurementUnits="Millimeters"/>\n'
        + `<GridPreference BaselineStart="${num(leading)}" BaselineDivision="${num(leading)}" BaselineShown="true" BaselineViewThreshold="25" BaselineGridRelativeOption="TopOfMarginOfBaselineGridRelativeOption"/>\n`
        + '</idPkg:Preferences>\n');

    add('MasterSpreads/MasterSpread_u100.xml', HEAD
        + `<idPkg:MasterSpread ${NS} DOMVersion="${DOM}">\n`
        + `<MasterSpread Self="u100" Name="A-Master" NamePrefix="A" BaseName="Master" ShowMasterItems="true" PageCount="${lay.pages.length}" OverriddenPageItemProps="" PrimaryTextFrame="n" ItemTransform="1 0 0 1 0 0">\n`
        + lay.pages.map((p, i) => pageXml(masterPageIds[i], 'A', 'n', p, lay)).join('\n') + '\n'
        + '</MasterSpread>\n</idPkg:MasterSpread>\n');

    add('Spreads/Spread_u200.xml', HEAD
        + `<idPkg:Spread ${NS} DOMVersion="${DOM}">\n`
        + `<Spread Self="u200" PageTransitionType="None" PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium" ShowMasterItems="true" PageCount="${lay.pages.length}" BindingLocation="${facing ? 1 : 0}" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 0" FlattenerOverride="Default">\n`
        + lay.pages.map((p, i) => pageXml(pageIds[i], String(facing ? i + 2 : i + 1), 'u100', p, lay)).join('\n') + '\n'
        + frames.map((fr) => frameXml(fr.id, fr.prev, fr.next, fr.f)).join('\n') + '\n'
        + '</Spread>\n</idPkg:Spread>\n');

    const body = paras.map((t, i) =>
        '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body">'
        + '<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">'
        + `<Content>${xmlText(t)}</Content>${i < paras.length - 1 ? '<Br/>' : ''}`
        + '</CharacterStyleRange></ParagraphStyleRange>').join('\n');
    add('Stories/Story_u1000.xml', HEAD
        + `<idPkg:Story ${NS} DOMVersion="${DOM}">\n`
        + '<Story Self="u1000" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="$ID/" AppliedNamedGrid="n">\n'
        + (body || '<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/Body"><CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"><Content></Content></CharacterStyleRange></ParagraphStyleRange>') + '\n'
        + '</Story>\n</idPkg:Story>\n');

    return files;
}

/** Zips the package. mimetype goes first and is stored uncompressed, as InDesign requires. */
export async function buildIdmlBlob(JSZipClass, spec) {
    const zip = new JSZipClass();
    for (const [path, content] of buildIdmlFiles(spec)) {
        zip.file(path, content, path === 'mimetype' ? { compression: 'STORE', createFolders: false } : { compression: 'DEFLATE', createFolders: false });
    }
    return zip.generateAsync({ type: 'blob', mimeType: IDML_MIMETYPE, compression: 'DEFLATE' });
}
