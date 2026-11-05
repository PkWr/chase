/**
 * UI Module for Typography Layout Calculator
 * Handles DOM manipulation and user interactions
 */
import { calculateLayout } from './calculator.js';
import { PAPER_SIZES, getPaperSize, getDefaultPaperSize } from './paperSizes.js';
import { updateVisualization } from './visualization.js';
import { convertFromMM, convertToMM, formatValue } from './units.js';
import { DEFAULT_SAMPLE_TEXT } from './defaultText.js';
import { buildIdmlBlob } from './idml.js';
import { initStylesPanel, getStyleSettings, getStyleFonts, resetStyles } from './styles-panel.js';
import { styleDefs, fontName, EMPHASIS } from './idml-styles.js';
import { drawGridPage } from './pdf-grid.js';
import { analyseLines } from './line-checks.js';
// Page dimensions are always in mm, gutter is always in em
const PAGE_UNIT = 'mm';
const GUTTER_UNIT = 'em';
/**
 * Parses and converts a margin value from form input to millimeters
 * @param inputId - ID of the input element
 * @param marginUnit - Current margin unit ('em' or 'mm')
 * @param typeSize - Type size in points (required for em conversion)
 * @returns Margin value in millimeters
 */
function parseAndConvertMargin(inputId, marginUnit, typeSize) {
    const input = document.getElementById(inputId);
    let value = parseFloat(input?.value || '0');
    if (marginUnit === 'em') {
        value = convertToMM(value, 'em', typeSize);
    }
    return value;
}
/**
 * Gets facing pages margins and converts them to millimeters
 * @param marginUnit - Current margin unit ('em' or 'mm')
 * @param typeSize - Type size in points (required for em conversion)
 * @returns Object with all facing pages margins in millimeters
 */
function getFacingPagesMargins(marginUnit, typeSize) {
    return {
        innerMarginLeft: parseAndConvertMargin('innerMarginLeft', marginUnit, typeSize),
        innerMarginRight: parseAndConvertMargin('innerMarginRight', marginUnit, typeSize),
        outerMarginLeft: parseAndConvertMargin('outerMarginLeft', marginUnit, typeSize),
        outerMarginRight: parseAndConvertMargin('outerMarginRight', marginUnit, typeSize),
    };
}
/**
 * Adds input and change event listeners to an element with common handlers
 * @param elementId - ID of the element
 * @param handlers - Object with optional handler functions
 */
function addInputChangeListeners(elementId, handlers) {
    const element = document.getElementById(elementId);
    if (!element)
        return;
    const bothHandler = handlers.onBoth || (() => { });
    const inputHandler = handlers.onInput || bothHandler;
    const changeHandler = handlers.onChange || bothHandler;
    element.addEventListener('input', inputHandler);
    element.addEventListener('change', changeHandler);
}
/**
 * Gets all input values from the form, converting from selected unit to mm
 * @returns LayoutInputs object with form values in millimeters
 */
/**
 * Gets column span from checkboxes
 */
function getColumnSpan() {
    const slider = document.getElementById('columnSpanSlider');
    if (!slider)
        return null;
    const spanCount = parseInt(slider.value, 10);
    if (isNaN(spanCount) || spanCount < 1)
        return null;
    return {
        start: 1,
        end: spanCount
    };
}
/**
 * Gets text columns from slider - returns array starting from slider value through span
 */
function getTextColumns() {
    const textStartSlider = document.getElementById('textStartSlider');
    if (!textStartSlider)
        return [1];
    const textStart = parseInt(textStartSlider.value, 10) || 1;
    const columnSpan = getColumnSpan();
    if (columnSpan) {
        // Return columns from textStart through the span end
        const start = Math.max(textStart, columnSpan.start);
        const end = columnSpan.end;
        const columns = [];
        for (let i = start; i <= end; i++) {
            columns.push(i);
        }
        return columns.length > 0 ? columns : [textStart];
    }
    return [textStart];
}
function getFormInputs() {
    const typeSize = parseFloat(document.getElementById('typeSize').value);
    const leadingInput = document.getElementById('leading');
    let leading = parseFloat(leadingInput?.value || '');
    // Default to type size + 2 if not set
    if (isNaN(leading) || leading <= 0) {
        leading = typeSize + 2;
        if (leadingInput) {
            leadingInput.value = leading.toFixed(1);
        }
    }
    const facingPages = isFacingPages();
    // Get margin unit
    const marginUnitToggle = document.getElementById('marginUnitToggle');
    const marginUnit = (marginUnitToggle?.checked ? 'em' : 'mm');
    // Page dimensions are always in mm (no conversion needed)
    const pageWidth = parseFloat(document.getElementById('pageWidth').value);
    const pageHeight = parseFloat(document.getElementById('pageHeight').value);
    // Get margins and convert to mm if needed
    const topMargin = parseAndConvertMargin('topMargin', marginUnit, typeSize);
    const bottomMargin = parseAndConvertMargin('bottomMargin', marginUnit, typeSize);
    // Get margins based on facing pages mode
    let leftMargin;
    let rightMargin;
    if (facingPages) {
        // Facing pages: use inner and outer margins
        const facingMargins = getFacingPagesMargins(marginUnit, typeSize);
        // For compatibility, set leftMargin = average inner, rightMargin = average outer
        leftMargin = (facingMargins.innerMarginLeft + facingMargins.innerMarginRight) / 2;
        rightMargin = (facingMargins.outerMarginLeft + facingMargins.outerMarginRight) / 2;
    }
    else {
        // Single page: use left and right margins
        leftMargin = parseAndConvertMargin('leftMargin', marginUnit, typeSize);
        rightMargin = parseAndConvertMargin('rightMargin', marginUnit, typeSize);
    }
    // Get gutter width - convert based on selected unit
    let gutterWidth = parseFloat(document.getElementById('gutterWidth').value);
    if (isNaN(gutterWidth) || gutterWidth <= 0) {
        // Default based on unit: 1em or equivalent in mm
        if (marginUnit === 'em') {
            gutterWidth = 1.0; // Default to 1em
        }
        else {
            gutterWidth = convertFromMM(convertToMM(1.0, 'em', typeSize), 'mm', typeSize); // 1em in mm
        }
        const gutterInput = document.getElementById('gutterWidth');
        if (gutterInput) {
            gutterInput.value = marginUnit === 'em' ? '1.000' : gutterWidth.toFixed(3);
        }
    }
    // Convert gutter width to mm for calculations
    let gutterWidthMM;
    if (marginUnit === 'em') {
        gutterWidthMM = convertToMM(gutterWidth, 'em', typeSize);
    }
    else {
        gutterWidthMM = gutterWidth; // Already in mm
    }
    const numCols = parseInt(document.getElementById('numCols').value, 10);
    const fontFamily = document.getElementById('fontFamily').value;
    const hyphenation = document.getElementById('hyphenation')?.checked ?? false;
    const justifyText = document.getElementById('justifyText')?.checked ?? false;
    const columnSpan = getColumnSpan();
    const textColumns = getTextColumns();
    const inputs = {
        pageWidth, // Already in mm
        pageHeight, // Already in mm
        leftMargin, // Already in mm
        rightMargin, // Already in mm
        topMargin, // Already in mm
        bottomMargin, // Already in mm
        typeSize, // Type size is always in points
        leading, // Leading (line height) in points
        fontFamily, // Font family name
        numCols,
        gutterWidth: gutterWidthMM, // Already converted to mm
        hyphenation, // Hyphenation enabled/disabled
        justifyText, // Text justification enabled/disabled
    };
    // Add facing pages specific margins if in facing pages mode (already converted to mm above)
    if (facingPages) {
        const facingMargins = getFacingPagesMargins(marginUnit, typeSize);
        inputs.innerMarginLeft = facingMargins.innerMarginLeft;
        inputs.innerMarginRight = facingMargins.innerMarginRight;
        inputs.outerMarginLeft = facingMargins.outerMarginLeft;
        inputs.outerMarginRight = facingMargins.outerMarginRight;
    }
    if (columnSpan) {
        inputs.columnSpanStart = columnSpan.start;
        inputs.columnSpanEnd = columnSpan.end;
    }
    if (textColumns.length > 0) {
        inputs.textColumns = textColumns;
    }
    return inputs;
}
/**
 * Suggests and sets gutter width based on type size
 * Gutter is always in ems (1em = type size)
 */
export function suggestGutter() {
    const typeSize = parseFloat(document.getElementById('typeSize').value);
    const marginUnitToggle = document.getElementById('marginUnitToggle');
    const marginUnit = (marginUnitToggle?.checked ? 'em' : 'mm');
    const gutterInput = document.getElementById('gutterWidth');
    const noteSpan = document.getElementById('autoGutterNote');
    // Set gutter based on selected unit
    if (marginUnit === 'em') {
        gutterInput.value = '1.000';
    }
    else {
        // Convert 1em to mm
        const gutterMM = convertToMM(1.0, 'em', typeSize);
        gutterInput.value = gutterMM.toFixed(3);
    }
    if (noteSpan) {
        // Show actual value: 1em = typeSize pt = typeSize * 0.3528 mm
        const gutterMM = typeSize * 0.3528;
        if (marginUnit === 'em') {
            noteSpan.textContent = `1em = ${typeSize}pt (${gutterMM.toFixed(2)}mm)`;
        }
        else {
            const gutterEm = convertFromMM(gutterMM, 'em', typeSize);
            noteSpan.textContent = `${gutterMM.toFixed(2)}mm = ${gutterEm.toFixed(2)}em (${typeSize}pt)`;
        }
    }
}
/**
 * Calculates words per line based on column width and type size
 * @param columnWidthMM - Column width in millimeters
 * @param typeSize - Type size in points
 * @returns Estimated words per line
 */
function calculateWordsPerLine(columnWidthMM, typeSize) {
    // Average character width is approximately 0.5-0.6 times the type size
    // Converting type size from points to mm: typeSize * 0.3528
    const typeSizeMM = typeSize * 0.3528;
    const avgCharWidthMM = typeSizeMM * 0.55; // Average character width
    // Calculate characters per line
    const charsPerLine = columnWidthMM / avgCharWidthMM;
    // Average word length is approximately 5 characters (including space)
    const wordsPerLine = charsPerLine / 5;
    return Math.round(wordsPerLine);
}
/**
 * Updates column width display
 */
function updateColumnWidthDisplay() {
    try {
        const inputs = getFormInputs();
        const results = calculateLayout(inputs);
        // Column width is in mm, convert to em
        const columnWidthMM = results.columnWidth;
        const columnWidthEM = convertFromMM(columnWidthMM, GUTTER_UNIT, inputs.typeSize);
        const columnWidthDisplay = document.getElementById('columnWidthDisplay');
        if (columnWidthDisplay) {
            columnWidthDisplay.textContent = `Column width: ${formatValue(columnWidthEM, GUTTER_UNIT, 2)} (${formatValue(columnWidthMM, PAGE_UNIT, 2)})`;
        }
    }
    catch (e) {
        const columnWidthDisplay = document.getElementById('columnWidthDisplay');
        if (columnWidthDisplay) {
            columnWidthDisplay.textContent = '';
        }
    }
}
/**
 * Updates words per line indicator with Bringhurst's guidance
 */
function updateWordsPerLine() {
    try {
        const inputs = getFormInputs();
        const results = calculateLayout(inputs);
        // Use textBoxWidth (which accounts for column span) instead of columnWidth
        // This gives accurate words per line for the actual text box width
        updateBringhurstSection(results.textBoxWidth, inputs.typeSize, inputs.leading);
    }
    catch (e) {
        const wordsPerLineElement = document.getElementById('wordsPerLine');
        if (wordsPerLineElement) {
            wordsPerLineElement.textContent = '—';
        }
    }
}
/**
 * Updates visualization when inputs change
 */
/**
 * Updates the specification section with all current values
 */
function updateSpecification() {
    try {
        const inputs = getFormInputs();
        const results = calculateLayout(inputs);
        const facingPages = isFacingPages();
        const orientationToggle = document.getElementById('orientationToggle')?.checked ?? false;
        const orientation = orientationToggle ? 'Landscape' : 'Portrait';
        const specContent = document.getElementById('specificationContent');
        if (!specContent)
            return;
        // Get column span info
        const columnSpan = getColumnSpan();
        const textColumns = getTextColumns();
        // Get paper size name if preset is selected
        const paperSizeSelect = document.getElementById('paperSizeSelect');
        const selectedPaperSize = paperSizeSelect?.value || '';
        let pageSizeLabel = 'Custom';
        if (selectedPaperSize) {
            const paperSize = getPaperSize(selectedPaperSize);
            if (paperSize) {
                pageSizeLabel = paperSize.name;
            }
        }
        // Get margin unit for display
        const marginUnitToggle = document.getElementById('marginUnitToggle');
        const marginUnit = (marginUnitToggle?.checked ? 'em' : 'mm');
        let html = '<table class="spec-table">';
        // Page Setup
        html += `<tr><td class="spec-label">Page size:</td><td class="spec-value">${pageSizeLabel}</td></tr>`;
        html += `<tr><td class="spec-label">Page dimensions:</td><td class="spec-value">${inputs.pageWidth} × ${inputs.pageHeight} mm</td></tr>`;
        html += `<tr><td class="spec-label">Orientation:</td><td class="spec-value">${orientation}</td></tr>`;
        html += `<tr><td class="spec-label">Facing pages:</td><td class="spec-value">${facingPages ? 'Yes' : 'No'}</td></tr>`;
        // Helper function to format margin values with both units
        const formatMarginValue = (mmValue, displayUnit) => {
            if (displayUnit === 'em') {
                const emValue = convertFromMM(mmValue, 'em', inputs.typeSize);
                return `${emValue.toFixed(1)} em (${mmValue.toFixed(1)} mm)`;
            }
            else {
                const emValue = convertFromMM(mmValue, 'em', inputs.typeSize);
                return `${mmValue.toFixed(1)} mm (${emValue.toFixed(1)} em)`;
            }
        };
        // Margins
        if (facingPages) {
            const innerMarginLeftMM = inputs.innerMarginLeft || 0;
            const innerMarginRightMM = inputs.innerMarginRight || 0;
            const outerMarginLeftMM = inputs.outerMarginLeft || 0;
            const outerMarginRightMM = inputs.outerMarginRight || 0;
            html += `<tr><td class="spec-label">Verso inner:</td><td class="spec-value">${formatMarginValue(innerMarginLeftMM, marginUnit)}</td></tr>`;
            html += `<tr><td class="spec-label">Verso outer:</td><td class="spec-value">${formatMarginValue(outerMarginLeftMM, marginUnit)}</td></tr>`;
            html += `<tr><td class="spec-label">Recto inner:</td><td class="spec-value">${formatMarginValue(innerMarginRightMM, marginUnit)}</td></tr>`;
            html += `<tr><td class="spec-label">Recto outer:</td><td class="spec-value">${formatMarginValue(outerMarginRightMM, marginUnit)}</td></tr>`;
        }
        else {
            const leftMarginMM = inputs.leftMargin;
            const rightMarginMM = inputs.rightMargin;
            html += `<tr><td class="spec-label">Left margin:</td><td class="spec-value">${formatMarginValue(leftMarginMM, marginUnit)}</td></tr>`;
            html += `<tr><td class="spec-label">Right margin:</td><td class="spec-value">${formatMarginValue(rightMarginMM, marginUnit)}</td></tr>`;
        }
        const topMarginMM = inputs.topMargin;
        const bottomMarginMM = inputs.bottomMargin;
        html += `<tr><td class="spec-label">Top margin:</td><td class="spec-value">${formatMarginValue(topMarginMM, marginUnit)}</td></tr>`;
        html += `<tr><td class="spec-label">Bottom margin:</td><td class="spec-value">${formatMarginValue(bottomMarginMM, marginUnit)}</td></tr>`;
        // Typography
        html += `<tr><td class="spec-label">Type size:</td><td class="spec-value">${inputs.typeSize} pt</td></tr>`;
        html += `<tr><td class="spec-label">Leading:</td><td class="spec-value">${inputs.leading || inputs.typeSize + 2} pt</td></tr>`;
        html += `<tr><td class="spec-label">Space after paragraph:</td><td class="spec-value">${document.getElementById('paraSpace')?.value || '0'} pt</td></tr>`;
        html += `<tr><td class="spec-label">Font family:</td><td class="spec-value">${inputs.fontFamily || 'serif'}</td></tr>`;
        html += `<tr><td class="spec-label">Hyphenation:</td><td class="spec-value">${inputs.hyphenation !== false ? 'Enabled' : 'Disabled'}</td></tr>`;
        const justifyText = document.getElementById('justifyText')?.checked ?? false;
        html += `<tr><td class="spec-label">Text alignment:</td><td class="spec-value">${justifyText ? 'Justified' : 'Left-aligned'}</td></tr>`;
        // Paragraph and character styles
        try {
            const spaceField = document.getElementById('paraSpace')?.value ?? '';
            const styleSpec = { inputs, styleSettings: getStyleSettings(), styleFonts: getStyleFonts(), paraSpacePt: spaceField === '' ? undefined : parseFloat(spaceField) };
            const r1 = (v) => String(Math.round(v * 10) / 10);
            html += '<tr><td class="spec-label spec-group" colspan="2">Paragraph styles</td></tr>';
            for (const d of styleDefs(styleSpec, fontName)) {
                const m = d.metrics;
                const indent = m.indentPx ? `, indent ${r1(m.indentPx)} pt` : '';
                html += `<tr><td class="spec-label">${d.name}:</td><td class="spec-value">${r1(m.sizePx)} pt on ${r1(m.lineHeightPx)} pt, ${d.font}, space before ${r1(m.marginTopPx)} pt, after ${r1(m.marginBottomPx)} pt${indent}</td></tr>`;
            }
            html += '<tr><td class="spec-label spec-group" colspan="2">Character styles</td></tr>';
            html += `<tr><td class="spec-label">${EMPHASIS}:</td><td class="spec-value">Italic</td></tr>`;
        }
        catch (e) {
            // Styles are optional in the specification
        }
        // Column Layout
        html += `<tr><td class="spec-label">Number of columns:</td><td class="spec-value">${inputs.numCols}</td></tr>`;
        // Get gutter width in display unit
        const gutterInputSpec = document.getElementById('gutterWidth');
        const gutterDisplay = gutterInputSpec ? parseFloat(gutterInputSpec.value) : (marginUnit === 'em' ? 1.0 : results.gutterWidth);
        let gutterDisplayValue;
        let gutterDisplayUnit;
        if (marginUnit === 'em') {
            // Show in ems with mm equivalent
            gutterDisplayValue = gutterDisplay;
            gutterDisplayUnit = 'em';
            html += `<tr><td class="spec-label">Gutter width:</td><td class="spec-value">${gutterDisplayValue.toFixed(1)} ${gutterDisplayUnit} (${results.gutterWidth.toFixed(1)} mm)</td></tr>`;
        }
        else {
            // Show in mm with em equivalent
            gutterDisplayValue = gutterDisplay;
            gutterDisplayUnit = 'mm';
            const gutterEm = convertFromMM(results.gutterWidth, 'em', inputs.typeSize);
            html += `<tr><td class="spec-label">Gutter width:</td><td class="spec-value">${gutterDisplayValue.toFixed(1)} ${gutterDisplayUnit} (${gutterEm.toFixed(1)} em)</td></tr>`;
        }
        // Column width with em equivalent
        const columnWidthEm = convertFromMM(results.columnWidth, 'em', inputs.typeSize);
        html += `<tr><td class="spec-label">Column width:</td><td class="spec-value">${results.columnWidth.toFixed(1)} mm (${columnWidthEm.toFixed(1)} em)</td></tr>`;
        // Text Box
        if (columnSpan) {
            html += `<tr><td class="spec-label">Text box spans:</td><td class="spec-value">Columns ${columnSpan.start}–${columnSpan.end}</td></tr>`;
        }
        // Text box width with em equivalent
        const textBoxWidthEm = convertFromMM(results.textBoxWidth, 'em', inputs.typeSize);
        html += `<tr><td class="spec-label">Text box width:</td><td class="spec-value">${results.textBoxWidth.toFixed(1)} mm (${textBoxWidthEm.toFixed(1)} em)</td></tr>`;
        if (textColumns && textColumns.length > 0) {
            const textStart = Math.min(...textColumns);
            html += `<tr><td class="spec-label">Text starts at column:</td><td class="spec-value">${textStart}</td></tr>`;
        }
        html += '</table>';
        specContent.innerHTML = html;
        // Update Bringhurst says section in compositor side
        updateBringhurstSection(results.textBoxWidth, inputs.typeSize, inputs.leading);
    }
    catch (e) {
        // Silently fail if inputs are invalid
    }
}
/**
 * Report checks: words per line, type size and leading.
 * Within range is a plain note; out of range is a warning with the reason.
 */
function setCheck(valueId, guideId, valueText, state) {
    const v = document.getElementById(valueId);
    const g = document.getElementById(guideId);
    if (v) v.textContent = valueText;
    if (g) {
        g.textContent = state.warn ? `Warning: ${state.text}` : state.text;
        g.classList.toggle('report-warning', !!state.warn);
    }
}
function updateBringhurstSection(textBoxWidth, typeSize, leading) {
    try {
        // Bringhurst: about 66 characters per line (~13 words); 45-75 characters is comfortable
        const MIN_WORDS = 9, MAX_WORDS = 15;
        const words = calculateWordsPerLine(textBoxWidth, typeSize);
        let line;
        if (words < MIN_WORDS) {
            line = { warn: true, text: `short line (${MIN_WORDS}-${MAX_WORDS} words suggested). Short lines break the reading rhythm: the eye returns to the left edge too often, justified text opens up rivers and gaps, and hyphenation increases. This is hardest on readers with dyslexia or tracking difficulties, and on people reading in a second language.` };
        } else if (words > MAX_WORDS) {
            line = { warn: true, text: `long line (${MIN_WORDS}-${MAX_WORDS} words suggested). Long lines make it easy to lose your place when moving to the next line, and tire the eye. This is hardest on readers with dyslexia, low vision or a visual tracking difficulty, and on younger or less confident readers.` };
        } else {
            line = { text: `Within the suggested range of ${MIN_WORDS}-${MAX_WORDS} words (about 45-75 characters).` };
        }
        setCheck('wordsPerLine', 'bringhurstGuidance', String(words), line);

        // Type size for body text in print: roughly 9-12 pt
        const MIN_SIZE = 9, MAX_SIZE = 12;
        let size;
        if (typeSize < MIN_SIZE) {
            size = { warn: true, text: `small for body text (${MIN_SIZE}-${MAX_SIZE} pt suggested). Small type is harder to read for older readers, readers with low vision, and anyone reading in poor light or on a worn printing surface. Accessibility guidance for print often starts at 12 pt.` };
        } else if (typeSize > MAX_SIZE) {
            size = { warn: true, text: `large for continuous body text (${MIN_SIZE}-${MAX_SIZE} pt suggested). Fewer words fit on each line, so the line length and spacing need rechecking. Large print is helpful for low-vision readers and early readers, so this may be intended for that audience.` };
        } else {
            size = { text: `Within the suggested range of ${MIN_SIZE}-${MAX_SIZE} pt for printed body text.` };
        }
        setCheck('typeSizeValue', 'typeSizeGuidance', `${typeSize} pt`, size);

        // Leading as a ratio of type size: about 120-150%
        const lead = leading || typeSize * 1.2;
        const ratio = lead / typeSize;
        const MIN_R = 1.15, MAX_R = 1.5;
        let lh;
        if (ratio < MIN_R - 0.005) {
            lh = { warn: true, text: `tight (${Math.round(MIN_R * 100)}-${Math.round(MAX_R * 100)}% of type size suggested). Lines sit too close, so ascenders and descenders crowd each other and the eye can slip to the wrong line. Hardest on readers with dyslexia or low vision, and on long lines.` };
        } else if (ratio > MAX_R + 0.005) {
            lh = { warn: true, text: `loose (${Math.round(MIN_R * 100)}-${Math.round(MAX_R * 100)}% of type size suggested). Lines drift apart and stop reading as one block of text, which breaks the flow from one line to the next. Hardest on readers who scan or track with difficulty.` };
        } else {
            lh = { text: `Within the suggested range of ${Math.round(MIN_R * 100)}-${Math.round(MAX_R * 100)}% of type size.` };
        }
        setCheck('bringhurstLeading', 'bringhurstLeadingGuidance', `${(Math.round(lead * 10) / 10)} pt (${Math.round(ratio * 100)}%)`, lh);
    }
    catch (e) {
        ['wordsPerLine', 'typeSizeValue', 'bringhurstLeading'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '—';
        });
    }
}
/**
 * Orphan, widow and runt counts from the rendered preview. Always shown as text, with the definition;
 * out of range it becomes a warning with examples and the reason. The preview is hidden while the Report
 * is open, so the last measurement is kept and shown there.
 */
let lineResults = null;
let lineChecksTimer = null;
const LINE_CHECKS = [
    { key: 'orphans', value: 'orphanValue', guide: 'orphanGuidance', noun: 'orphan', plural: 'orphans',
        def: 'An orphan is the first line of a paragraph left alone at the bottom of a column.',
        why: 'It breaks the flow into the next column and reads as a mistake. Readers who rely on the shape of the text block to keep their place are most affected. Change the text box height or leading, or edit the text so the paragraph breaks differently.' },
    { key: 'widows', value: 'widowValue', guide: 'widowGuidance', noun: 'widow', plural: 'widows',
        def: 'A widow is the last line of a paragraph left alone at the top of the next column.',
        why: 'It leaves a stray line separated from its paragraph, which interrupts the reading flow and looks like an error. Change the text box height or leading, or edit the text so the paragraph breaks differently.' },
    { key: 'runts', value: 'runtValue', guide: 'runtGuidance', noun: 'runt', plural: 'runts',
        def: 'A runt is a very short last line, a word or two, at the end of a paragraph.',
        why: 'It leaves a hole in the text block and draws the eye to a fragment. In narrow columns it is often a single hyphenated piece of a word. Adjust the column width, the tracking or the wording of the paragraph.' },
];
function renderLineChecks() {
    for (const c of LINE_CHECKS) {
        const v = document.getElementById(c.value);
        const g = document.getElementById(c.guide);
        if (!v || !g)
            continue;
        if (!lineResults) {
            v.textContent = `Measuring ${c.plural}…`;
            g.textContent = c.def;
            g.classList.remove('report-warning');
            continue;
        }
        const found = lineResults[c.key];
        const n = found.length;
        v.textContent = `${n} ${n === 1 ? c.noun : c.plural} found`;
        if (n === 0) {
            g.textContent = c.def;
            g.classList.remove('report-warning');
        }
        else {
            const eg = found.slice(0, 2).map((f) => `“${f.text}” at ${f.where}`).join('; ');
            g.textContent = `Warning: in this preview, for example ${eg}. ${c.def} ${c.why}`;
            g.classList.add('report-warning');
        }
    }
}
function scheduleLineChecks() {
    if (lineChecksTimer !== null)
        clearTimeout(lineChecksTimer);
    // wait for the preview to size itself and snap its headings before measuring
    lineChecksTimer = window.setTimeout(() => {
        lineChecksTimer = null;
        const measure = () => {
            try {
                const r = analyseLines(document.getElementById('visualizationContainer'));
                if (r)
                    lineResults = r;
            }
            catch (e) {
                // measurement is best-effort
            }
            renderLineChecks();
        };
        // The Report hides the preview; lay it out out of sight for a moment so the checks can be measured there too
        if (document.body.dataset.step === '8' && !document.body.classList.contains('measuring')) {
            document.body.classList.add('measuring');
            updateVisualizationOnInputChange();
            window.setTimeout(() => {
                measure();
                document.body.classList.remove('measuring');
            }, 700);
            return;
        }
        measure();
    }, 450);
}
function updateVisualizationOnInputChange() {
    try {
        const inputs = getFormInputs();
        const results = calculateLayout(inputs);
        updateVisualization(inputs);
        updateWordsPerLine();
        updateColumnWidthDisplay();
        updateSpecification();
        scheduleLineChecks();
    }
    catch (e) {
        // Log error for debugging
        console.error('Error updating visualization:', e);
        if (e instanceof Error) {
            console.error('Error message:', e.message);
            console.error('Error stack:', e.stack);
        }
        console.error('Input values:', {
            topMargin: document.getElementById('topMargin')?.value,
            bottomMargin: document.getElementById('bottomMargin')?.value,
            leftMargin: document.getElementById('leftMargin')?.value,
            rightMargin: document.getElementById('rightMargin')?.value,
            typeSize: document.getElementById('typeSize')?.value,
            pageWidth: document.getElementById('pageWidth')?.value,
            pageHeight: document.getElementById('pageHeight')?.value,
        });
    }
}
/**
 * Applies default settings: single page, 1 column, 4em margins, 12pt type, 14pt leading, A4 page size, default sample text
 */
function applyDefaultSettings() {
    try {
        // Set margin unit to em (checked)
        const marginUnitToggle = document.getElementById('marginUnitToggle');
        if (marginUnitToggle) {
            marginUnitToggle.checked = true;
        }
        // Set facing pages to false (single page)
        const facingPagesCheckbox = document.getElementById('facingPages');
        if (facingPagesCheckbox) {
            facingPagesCheckbox.checked = false;
        }
        // Set margins to 4em
        const topMarginInput = document.getElementById('topMargin');
        const bottomMarginInput = document.getElementById('bottomMargin');
        const leftMarginInput = document.getElementById('leftMargin');
        const rightMarginInput = document.getElementById('rightMargin');
        if (topMarginInput)
            topMarginInput.value = '4.0';
        if (bottomMarginInput)
            bottomMarginInput.value = '4.0';
        if (leftMarginInput)
            leftMarginInput.value = '4.0';
        if (rightMarginInput)
            rightMarginInput.value = '4.0';
        // Clear facing pages margins
        const innerMarginLeftInput = document.getElementById('innerMarginLeft');
        const innerMarginRightInput = document.getElementById('innerMarginRight');
        const outerMarginLeftInput = document.getElementById('outerMarginLeft');
        const outerMarginRightInput = document.getElementById('outerMarginRight');
        if (innerMarginLeftInput)
            innerMarginLeftInput.value = '';
        if (innerMarginRightInput)
            innerMarginRightInput.value = '';
        if (outerMarginLeftInput)
            outerMarginLeftInput.value = '';
        if (outerMarginRightInput)
            outerMarginRightInput.value = '';
        // Type is left aligned by default
        const justifyReset = document.getElementById('justifyText');
        if (justifyReset) {
            justifyReset.checked = false;
            justifyReset.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Set columns to 1
        const numColsInput = document.getElementById('numCols');
        if (numColsInput)
            numColsInput.value = '1';
        // The text box covers that single column (a leftover span of 3 columns would leave the page empty)
        const spanSliderReset = document.getElementById('columnSpanSlider');
        const startSliderReset = document.getElementById('textStartSlider');
        if (spanSliderReset) {
            spanSliderReset.max = '1';
            spanSliderReset.value = '1';
        }
        if (startSliderReset) {
            startSliderReset.max = '1';
            startSliderReset.value = '1';
        }
        // Set type size to 12pt
        const typeSizeInput = document.getElementById('typeSize');
        if (typeSizeInput)
            typeSizeInput.value = '12';
        // Set leading to 14pt
        const leadingInput = document.getElementById('leading');
        if (leadingInput)
            leadingInput.value = '14';
        // Set page size to A4
        const paperSizeSelect = document.getElementById('paperSizeSelect');
        if (paperSizeSelect) {
            paperSizeSelect.value = 'A4';
            applyPaperSize('A4');
        }
        // Set sample text to default
        const sampleTextInput = document.getElementById('sampleText');
        if (sampleTextInput) {
            sampleTextInput.value = DEFAULT_SAMPLE_TEXT;
        }
        // Update margin inputs visibility
        updateMarginInputs();
        // Update visualization and save settings
        updateVisualizationOnInputChange();
        saveSettings(true); // Save immediately
    }
    catch (e) {
        console.error('Error applying default settings:', e);
    }
}
/**
 * Resets all settings to defaults: single page, 1 column, 4em margins, 12pt type, 14pt leading, A4 page size, default sample text
 */
function resetToDefaults() {
    try {
        // Clear localStorage
        localStorage.removeItem('compositorSettings');
        // Apply default settings
        applyDefaultSettings();
        // Styles (sizes, indent, typefaces) go back to their defaults too
        resetStyles();
        // The Report and the download area start over as well
        lineResults = null;
        renderLineChecks();
        const idmlStatusReset = document.getElementById('idmlStatus');
        if (idmlStatusReset)
            idmlStatusReset.textContent = '';
        document.querySelectorAll('#downloadRow button').forEach((btn) => { btn.disabled = false; });
        const reportStage = document.getElementById('reportStage');
        if (reportStage)
            reportStage.scrollTop = 0;
        updateVisualizationOnInputChange();
    }
    catch (e) {
        console.error('Error resetting to defaults:', e);
    }
}
/**
 * Updates column span checkboxes based on number of columns
 */
function updateColumnSpanSlider() {
    const slider = document.getElementById('columnSpanSlider');
    const valueDisplay = document.getElementById('columnSpanValue');
    if (!slider)
        return;
    const numCols = parseInt(document.getElementById('numCols').value, 10) || 1;
    // Update slider max to match number of columns
    slider.max = numCols.toString();
    // Ensure slider value doesn't exceed max
    const currentValue = parseInt(slider.value, 10);
    if (currentValue > numCols) {
        slider.value = numCols.toString();
    }
    // Update display value
    if (valueDisplay) {
        valueDisplay.textContent = slider.value;
    }
    // Update text column checkboxes when span changes
    updateTextStartSlider();
}
/**
 * Updates text start slider - sets max to numCols and updates value display
 */
function updateTextStartSlider() {
    const slider = document.getElementById('textStartSlider');
    const valueDisplay = document.getElementById('textStartValue');
    if (!slider)
        return;
    const numCols = parseInt(document.getElementById('numCols').value, 10) || 1;
    const columnSpan = getColumnSpan();
    // Set max to number of columns
    slider.max = numCols.toString();
    // Ensure value doesn't exceed max
    const currentValue = parseInt(slider.value, 10) || 1;
    if (currentValue > numCols) {
        slider.value = numCols.toString();
    }
    // Default to span start if span exists, otherwise 1
    if (!slider.value || slider.value === '0') {
        if (columnSpan) {
            slider.value = columnSpan.start.toString();
        }
        else {
            slider.value = '1';
        }
    }
    // Update display
    if (valueDisplay) {
        valueDisplay.textContent = slider.value;
    }
}
/**
 * Populates the paper size dropdown
 */
function populatePaperSizeDropdown() {
    const select = document.getElementById('paperSizeSelect');
    if (!select) {
        console.error('Paper size select element not found');
        return;
    }
    // Clear all existing options
    select.innerHTML = '';
    // Add Custom option first
    const customOpt = document.createElement('option');
    customOpt.value = '';
    customOpt.textContent = 'Custom';
    select.appendChild(customOpt);
    // Check if PAPER_SIZES is available
    if (!PAPER_SIZES || PAPER_SIZES.length === 0) {
        console.error('PAPER_SIZES array is empty or not available');
        return;
    }
    // Group paper sizes by category
    const categories = new Map();
    PAPER_SIZES.forEach(size => {
        if (!categories.has(size.category)) {
            categories.set(size.category, []);
        }
        categories.get(size.category).push(size);
    });
    // Save current selection before clearing
    const currentValue = select.value;
    // Add optgroups for each category
    categories.forEach((sizes, category) => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = category;
        sizes.forEach(size => {
            const option = document.createElement('option');
            option.value = size.name;
            option.textContent = `${size.name} (${size.width} × ${size.height} mm)`;
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    });
    // Check for saved paper size in localStorage
    const savedSettings = localStorage.getItem('compositorSettings');
    let savedPaperSize = null;
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.paperSizeSelect !== undefined && settings.paperSizeSelect !== '') {
                savedPaperSize = settings.paperSizeSelect;
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    // Restore saved value if it exists and is valid, otherwise restore current value, otherwise set default
    if (savedPaperSize && select.querySelector(`option[value="${savedPaperSize}"]`)) {
        select.value = savedPaperSize;
    }
    else if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
        select.value = currentValue;
    }
    else {
        const defaultSize = getDefaultPaperSize();
        if (defaultSize) {
            select.value = defaultSize.name;
            applyPaperSize(defaultSize.name);
        }
    }
}
/**
 * Gets current orientation
 */
function getOrientation() {
    const orientationToggle = document.getElementById('orientationToggle');
    return orientationToggle?.checked ? 'landscape' : 'portrait';
}
/**
 * Applies a paper size to the width and height inputs
 * @param paperSizeName - Name of the paper size to apply
 */
function applyPaperSize(paperSizeName) {
    const size = getPaperSize(paperSizeName);
    if (!size)
        return;
    const orientation = getOrientation();
    // Page dimensions are always in mm (no conversion needed)
    let width = size.width;
    let height = size.height;
    // Swap if landscape orientation
    if (orientation === 'landscape') {
        [width, height] = [height, width];
    }
    const widthInput = document.getElementById('pageWidth');
    const heightInput = document.getElementById('pageHeight');
    // Page dimensions are always in mm (1 decimal place)
    if (widthInput)
        widthInput.value = width.toFixed(1);
    if (heightInput)
        heightInput.value = height.toFixed(1);
    updateVisualizationOnInputChange();
    saveSettings();
}
/**
 * Swaps page width and height based on orientation
 */
function updateOrientation() {
    const pageWidthInput = document.getElementById('pageWidth');
    const pageHeightInput = document.getElementById('pageHeight');
    const currentWidth = parseFloat(pageWidthInput.value);
    const currentHeight = parseFloat(pageHeightInput.value);
    // Swap width and height
    pageWidthInput.value = currentHeight.toString();
    pageHeightInput.value = currentWidth.toString();
    updateVisualizationOnInputChange();
}
/**
 * Updates the visual state of orientation toggle icons
 */
function updateOrientationToggleState() {
    const orientationToggle = document.getElementById('orientationToggle');
    const portraitOption = document.querySelector('.unit-option-portrait');
    const landscapeOption = document.querySelector('.unit-option-landscape');
    if (orientationToggle && portraitOption && landscapeOption) {
        if (orientationToggle.checked) {
            // Landscape selected
            portraitOption.classList.remove('unit-option-mm');
            portraitOption.classList.add('unit-option-em');
            landscapeOption.classList.remove('unit-option-em');
            landscapeOption.classList.add('unit-option-mm');
        }
        else {
            // Portrait selected
            portraitOption.classList.remove('unit-option-em');
            portraitOption.classList.add('unit-option-mm');
            landscapeOption.classList.remove('unit-option-mm');
            landscapeOption.classList.add('unit-option-em');
        }
    }
}
/**
 * Checks if facing pages mode is enabled
 */
function isFacingPages() {
    const checkbox = document.getElementById('facingPages');
    return checkbox?.checked || false;
}
/**
 * Updates margin inputs visibility and syncs values when switching modes
 */
/**
 * Updates margin labels to show the selected unit
 */
function updateMarginLabels() {
    const marginUnitToggle = document.getElementById('marginUnitToggle');
    const marginUnit = (marginUnitToggle?.checked ? 'em' : 'mm');
    const unitLabel = marginUnit === 'em' ? 'em' : 'mm';
    const labelMap = {
        'topMarginLabel': 'Top',
        'bottomMarginLabel': 'Bottom',
        'leftMarginLabel': 'Left',
        'rightMarginLabel': 'Right',
        'innerMarginLeftLabel': 'Inner',
        'innerMarginRightLabel': 'Inner',
        'outerMarginLeftLabel': 'Outer',
        'outerMarginRightLabel': 'Outer',
        'gutterWidthLabel': 'Gutter width'
    };
    try {
        const typeSize = parseFloat(document.getElementById('typeSize').value);
        Object.keys(labelMap).forEach(labelId => {
            const label = document.getElementById(labelId);
            if (label) {
                if (labelId === 'gutterWidthLabel') {
                    // For gutter width, show only the unit in label
                    label.textContent = `Gutter width (${unitLabel})`;
                    // Show conversion value in helper text below input
                    const gutterInput = document.getElementById('gutterWidth');
                    const conversionElement = document.getElementById('gutterWidthConversion');
                    let gutterValue = gutterInput ? parseFloat(gutterInput.value) : NaN;
                    // If gutter value is empty or invalid, use default (1em or equivalent)
                    if (isNaN(gutterValue) || gutterValue <= 0) {
                        if (marginUnit === 'em') {
                            gutterValue = 1.0; // Default to 1em
                        }
                        else {
                            gutterValue = convertToMM(1.0, 'em', typeSize); // Default to 1em equivalent in mm
                        }
                    }
                    if (conversionElement && !isNaN(typeSize) && !isNaN(gutterValue) && gutterValue > 0) {
                        let conversionValue;
                        let conversionUnit;
                        if (marginUnit === 'em') {
                            // Show mm equivalent
                            conversionValue = convertToMM(gutterValue, 'em', typeSize);
                            conversionUnit = 'mm';
                            conversionElement.textContent = `${conversionValue.toFixed(1)} ${conversionUnit}`;
                        }
                        else {
                            // Show em equivalent
                            conversionValue = convertFromMM(gutterValue, 'em', typeSize);
                            conversionUnit = 'em';
                            conversionElement.textContent = `${conversionValue.toFixed(1)} ${conversionUnit}`;
                        }
                    }
                    else if (conversionElement) {
                        conversionElement.textContent = '';
                    }
                }
                else {
                    // For margin labels, show only the unit in label
                    label.textContent = `${labelMap[labelId]} (${unitLabel})`;
                    // Show conversion value in helper text below input
                    const inputId = labelId.replace('Label', '');
                    const input = document.getElementById(inputId);
                    const conversionElement = document.getElementById(`${inputId}Conversion`);
                    const marginValue = input ? parseFloat(input.value) : 0;
                    if (conversionElement && !isNaN(typeSize) && !isNaN(marginValue) && marginValue > 0) {
                        let conversionValue;
                        let conversionUnit;
                        if (marginUnit === 'em') {
                            // Show mm equivalent
                            conversionValue = convertToMM(marginValue, 'em', typeSize);
                            conversionUnit = 'mm';
                            conversionElement.textContent = `${conversionValue.toFixed(1)} ${conversionUnit}`;
                        }
                        else {
                            // Show em equivalent
                            conversionValue = convertFromMM(marginValue, 'em', typeSize);
                            conversionUnit = 'em';
                            conversionElement.textContent = `${conversionValue.toFixed(1)} ${conversionUnit}`;
                        }
                    }
                    else if (conversionElement) {
                        conversionElement.textContent = '';
                    }
                }
            }
        });
    }
    catch (e) {
        // Fallback to simple labels if conversion fails
        Object.keys(labelMap).forEach(labelId => {
            const label = document.getElementById(labelId);
            if (label) {
                label.textContent = `${labelMap[labelId]} (${unitLabel})`;
            }
        });
    }
}
/**
 * Converts margin and gutter values when switching units
 */
function convertMarginValues(fromUnit, toUnit) {
    if (fromUnit === toUnit)
        return;
    const typeSize = parseFloat(document.getElementById('typeSize').value);
    const marginInputs = [
        'topMargin',
        'bottomMargin',
        'leftMargin',
        'rightMargin',
        'innerMarginLeft',
        'innerMarginRight',
        'outerMarginLeft',
        'outerMarginRight'
    ];
    marginInputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input && input.value) {
            const currentValue = parseFloat(input.value);
            if (!isNaN(currentValue)) {
                // Convert to mm first, then to target unit
                let valueInMM;
                if (fromUnit === 'em') {
                    valueInMM = convertToMM(currentValue, 'em', typeSize);
                }
                else {
                    valueInMM = currentValue; // Already in mm
                }
                // Convert from mm to target unit
                let newValue;
                if (toUnit === 'em') {
                    newValue = convertFromMM(valueInMM, 'em', typeSize);
                }
                else {
                    newValue = valueInMM; // Already in mm
                }
                input.value = newValue.toFixed(1);
            }
        }
    });
    // Convert gutter width
    const gutterInput = document.getElementById('gutterWidth');
    if (gutterInput) {
        let currentGutter = parseFloat(gutterInput.value);
        // If gutter is empty or invalid, use default (1em or equivalent)
        if (isNaN(currentGutter) || currentGutter <= 0) {
            if (fromUnit === 'em') {
                currentGutter = 1.0; // Default to 1em
            }
            else {
                currentGutter = convertToMM(1.0, 'em', typeSize); // Default to 1em equivalent in mm
            }
        }
        // Convert to mm first, then to target unit
        let gutterInMM;
        if (fromUnit === 'em') {
            gutterInMM = convertToMM(currentGutter, 'em', typeSize);
        }
        else {
            gutterInMM = currentGutter; // Already in mm
        }
        // Convert from mm to target unit
        let newGutter;
        if (toUnit === 'em') {
            newGutter = convertFromMM(gutterInMM, 'em', typeSize);
        }
        else {
            newGutter = gutterInMM; // Already in mm
        }
        gutterInput.value = newGutter.toFixed(3);
    }
}
function updateMarginInputs() {
    const facingPages = isFacingPages();
    const singlePageMargins = document.getElementById('singlePageMargins');
    const facingPagesMargins = document.getElementById('facingPagesMargins');
    const leftMarginInput = document.getElementById('leftMargin');
    const rightMarginInput = document.getElementById('rightMargin');
    const innerMarginLeftInput = document.getElementById('innerMarginLeft');
    const innerMarginRightInput = document.getElementById('innerMarginRight');
    const outerMarginLeftInput = document.getElementById('outerMarginLeft');
    const outerMarginRightInput = document.getElementById('outerMarginRight');
    // Update labels
    updateMarginLabels();
    if (facingPages) {
        // Show facing pages inputs, hide single page inputs
        if (singlePageMargins)
            singlePageMargins.style.display = 'none';
        if (facingPagesMargins)
            facingPagesMargins.style.display = 'grid';
        // Sync values: mirror leftMargin/rightMargin to inner/outer (only if not already synced)
        // Also check that left/right margins actually have values before syncing
        if (leftMarginInput && innerMarginLeftInput && !innerMarginLeftInput.dataset.synced) {
            const leftVal = leftMarginInput.value;
            const rightVal = rightMarginInput.value;
            // Only sync if left/right margins have valid values (not empty)
            if (leftVal !== '' && !isNaN(parseFloat(leftVal))) {
                innerMarginLeftInput.value = leftVal;
                innerMarginRightInput.value = leftVal;
            }
            if (rightVal !== '' && !isNaN(parseFloat(rightVal))) {
                outerMarginLeftInput.value = rightVal;
                outerMarginRightInput.value = rightVal;
            }
            innerMarginLeftInput.dataset.synced = 'true';
            // Clear the other sync flag
            if (leftMarginInput.dataset.synced)
                leftMarginInput.dataset.synced = '';
        }
    }
    else {
        // Show single page inputs, hide facing pages inputs
        if (singlePageMargins)
            singlePageMargins.style.display = 'grid';
        if (facingPagesMargins)
            facingPagesMargins.style.display = 'none';
        // Sync values: average inner to leftMargin, average outer to rightMargin (only if not already synced)
        // Also check that inner/outer margins actually have values before syncing
        if (innerMarginLeftInput && leftMarginInput && !leftMarginInput.dataset.synced) {
            const innerLeftVal = parseFloat(innerMarginLeftInput.value);
            const innerRightVal = parseFloat(innerMarginRightInput.value);
            const outerLeftVal = parseFloat(outerMarginLeftInput.value);
            const outerRightVal = parseFloat(outerMarginRightInput.value);
            // Only sync if inner/outer margins have valid values (not empty/NaN)
            if (!isNaN(innerLeftVal) && !isNaN(innerRightVal) && innerMarginLeftInput.value !== '' && innerMarginRightInput.value !== '') {
                const avgInner = ((innerLeftVal + innerRightVal) / 2).toFixed(1);
                leftMarginInput.value = avgInner;
            }
            if (!isNaN(outerLeftVal) && !isNaN(outerRightVal) && outerMarginLeftInput.value !== '' && outerMarginRightInput.value !== '') {
                const avgOuter = ((outerLeftVal + outerRightVal) / 2).toFixed(1);
                rightMarginInput.value = avgOuter;
            }
            leftMarginInput.dataset.synced = 'true';
            // Clear the other sync flag
            if (innerMarginLeftInput.dataset.synced)
                innerMarginLeftInput.dataset.synced = '';
        }
    }
}
/**
 * Initializes the calculator UI
 */
/**
 * Exports the current visualization as a standalone HTML file
 */
async function exportVisualizationAsPDF() {
    const container = window.previewEl('visualizationContainer');
    if (!container) {
        alert('Visualization container not found');
        return;
    }
    let svg = container.querySelector('svg');
    if (!svg) {
        alert('No visualization to export. Please generate a layout first.');
        return;
    }
    // Check if PDF libraries are available (loaded from CDN)
    if (typeof window === 'undefined' || !window.jspdf || !window.html2canvas) {
        alert('PDF libraries not loaded. Please refresh the page and try again.');
        return;
    }
    const jsPDF = window.jspdf.jsPDF;
    const html2canvas = window.html2canvas;
    // Get current inputs
    const inputs = getFormInputs();
    const facingPagesCheckbox = document.getElementById('facingPages');
    const facingPages = facingPagesCheckbox?.checked ?? false;
    // Page 1 is the clean page: text only, in the set layout. Margins, columns, the baseline grid and
    // the ragged-edge marks are switched off for the capture and put back afterwards.
    const showMarginsCheckbox = document.getElementById('showMargins');
    const showColumnsCheckbox = document.getElementById('showColumns');
    const showTextCheckbox = document.getElementById('showText');
    const showRaggedEdgeCheckbox = document.getElementById('showRaggedEdge');
    const showBaselineCheckbox = document.getElementById('showBaseline');
    const originalMargins = showMarginsCheckbox?.checked ?? true;
    const originalColumns = showColumnsCheckbox?.checked ?? true;
    const originalText = showTextCheckbox?.checked ?? true;
    const originalRaggedEdge = showRaggedEdgeCheckbox?.checked ?? false;
    const originalBaseline = showBaselineCheckbox?.checked ?? false;
    if (showMarginsCheckbox)
        showMarginsCheckbox.checked = false;
    if (showColumnsCheckbox)
        showColumnsCheckbox.checked = false;
    if (showTextCheckbox)
        showTextCheckbox.checked = true;
    if (showRaggedEdgeCheckbox)
        showRaggedEdgeCheckbox.checked = false;
    if (showBaselineCheckbox)
        showBaselineCheckbox.checked = false;
    const restoreLayers = () => {
        if (showMarginsCheckbox)
            showMarginsCheckbox.checked = originalMargins;
        if (showColumnsCheckbox)
            showColumnsCheckbox.checked = originalColumns;
        if (showTextCheckbox)
            showTextCheckbox.checked = originalText;
        if (showRaggedEdgeCheckbox)
            showRaggedEdgeCheckbox.checked = originalRaggedEdge;
        if (showBaselineCheckbox)
            showBaselineCheckbox.checked = originalBaseline;
        updateVisualizationOnInputChange();
    };
    // Re-render with only the text layer showing
    updateVisualizationOnInputChange();
    // Wait for visualization to update and SVG to be sized
    await new Promise(resolve => setTimeout(resolve, 300));
    // Get the updated SVG
    const updatedSvg = container.querySelector('svg');
    if (!updatedSvg) {
        alert('Failed to generate visualization. Please try again.');
        restoreLayers();
        return;
    }
    // Use the updated SVG (reassign the existing svg variable)
    svg = updatedSvg;
    // Force a reflow to ensure SVG is fully rendered and sized
    container.offsetHeight;
    // Create PDF - A4 size in mm (210 x 297)
    const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });
    const pdfWidth = 210; // A4 width in mm
    const pdfHeight = 297; // A4 height in mm
    const margin = 10; // Margin in mm
    const contentWidth = pdfWidth - (margin * 2);
    const contentHeight = pdfHeight - (margin * 2);
    // Much simpler approach: Export the preview container directly as an image
    // This preserves everything exactly as it appears - fonts, spacing, colors, etc.
    // No need for complex font scaling calculations
    // Get the actual rendered size of the container
    const containerRect = container.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    // Calculate scale to fit image to PDF page (maintaining aspect ratio)
    const imageAspectRatio = containerWidth / containerHeight;
    const pdfAspectRatio = contentWidth / contentHeight;
    let imageWidthMM;
    let imageHeightMM;
    if (imageAspectRatio > pdfAspectRatio) {
        // Image is wider - fit by width
        imageWidthMM = contentWidth;
        imageHeightMM = contentWidth / imageAspectRatio;
    }
    else {
        // Image is taller - fit by height
        imageHeightMM = contentHeight;
        imageWidthMM = contentHeight * imageAspectRatio;
    }
    try {
        // Convert preview container directly to canvas/image
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            width: containerWidth,
            height: containerHeight,
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: false,
            onclone: (clonedDoc) => {
                // Ensure all text is black in the cloned document
                const style = clonedDoc.createElement('style');
                style.textContent = `
          * {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
          }
          foreignObject,
          foreignObject *,
          foreignObject div,
          foreignObject div *,
          foreignObject span,
          foreignObject span * {
            color: #000000 !important;
            -webkit-text-fill-color: #000000 !important;
            background-color: transparent !important;
          }
          text, tspan {
            fill: #000000 !important;
          }
        `;
                clonedDoc.head.appendChild(style);
                // html2canvas copies the page's computed styles onto the cloned svg; the body is italic, so reset it there
                clonedDoc.querySelectorAll('svg').forEach((s) => {
                    s.style.setProperty('font-style', 'normal', 'important');
                });
                // Directly modify all elements in cloned document
                const clonedForeignObjects = clonedDoc.querySelectorAll('foreignObject');
                clonedForeignObjects.forEach((fo) => {
                    const allElements = fo.querySelectorAll('div, span, *');
                    allElements.forEach((el) => {
                        const htmlEl = el;
                        htmlEl.style.removeProperty('color');
                        htmlEl.style.removeProperty('-webkit-text-fill-color');
                        htmlEl.style.setProperty('color', '#000000', 'important');
                        htmlEl.style.setProperty('-webkit-text-fill-color', '#000000', 'important');
                        htmlEl.style.setProperty('background-color', 'transparent', 'important');
                        // The page's italic body style must not leak into the text; only marked italics (em) stay italic
                        if (!htmlEl.closest('em'))
                            htmlEl.style.setProperty('font-style', 'normal', 'important');
                    });
                });
            }
        });
        const imgData = canvas.toDataURL('image/png');
        // Add image to PDF, centered horizontally
        const xOffset = (pdfWidth - imageWidthMM) / 2;
        pdf.addImage(imgData, 'PNG', xOffset, margin, imageWidthMM, imageHeightMM);
        // Page 2: grid only, with measurements (vector)
        pdf.addPage();
        drawGridPage(pdf, inputs, facingPages);
        // Page 3: Specification table
        pdf.addPage();
        // Get specification table HTML
        const specContent = document.getElementById('specificationContent');
        if (specContent) {
            const specTable = specContent.querySelector('.spec-table');
            if (specTable) {
                // Create temporary container for table
                const tempTableContainer = document.createElement('div');
                tempTableContainer.style.position = 'absolute';
                tempTableContainer.style.left = '-9999px';
                tempTableContainer.style.width = `${contentWidth * (96 / 25.4)}px`; // Convert mm to pixels
                tempTableContainer.style.backgroundColor = '#ffffff';
                tempTableContainer.style.padding = '20px';
                tempTableContainer.style.fontFamily = 'Arial, sans-serif';
                // Clone and style table for PDF
                const tableClone = specTable.cloneNode(true);
                tableClone.style.width = '100%';
                tableClone.style.borderCollapse = 'collapse';
                tableClone.style.color = '#000000';
                tableClone.style.fontSize = '14px';
                // Style all cells
                const cells = tableClone.querySelectorAll('td');
                cells.forEach((cell) => {
                    cell.style.padding = '8px';
                    cell.style.borderBottom = '1px solid #000000';
                    cell.style.color = '#000000';
                    cell.style.backgroundColor = '#ffffff';
                });
                // Style labels
                const labels = tableClone.querySelectorAll('.spec-label');
                labels.forEach((label) => {
                    label.style.fontWeight = 'bold';
                    label.style.color = '#000000';
                });
                // Style values
                const values = tableClone.querySelectorAll('.spec-value');
                values.forEach((value) => {
                    value.style.color = '#000000';
                });
                tempTableContainer.appendChild(tableClone);
                document.body.appendChild(tempTableContainer);
                // Wait a moment for the DOM to update
                await new Promise(resolve => setTimeout(resolve, 100));
                const tableCanvas = await html2canvas(tempTableContainer, {
                    backgroundColor: '#ffffff',
                    scale: 2,
                    logging: false,
                    useCORS: true,
                    allowTaint: false
                });
                const tableImgData = tableCanvas.toDataURL('image/png');
                const tableHeightMM = (tableCanvas.height / 2) / (96 / 25.4); // Convert to mm (divide by 2 for scale)
                const tableWidthMM = contentWidth; // Use content width
                pdf.addImage(tableImgData, 'PNG', margin, margin, tableWidthMM, tableHeightMM);
                document.body.removeChild(tempTableContainer);
            }
        }
        restoreLayers();
        // Save PDF
        pdf.save(`typography-layout-${Date.now()}.pdf`);
    }
    catch (error) {
        console.error('Error exporting PDF:', error);
        console.error('Error details:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
        });
        // No cleanup needed - we're using the actual container
        const tempTableContainer = document.querySelector('div[style*="-9999px"]');
        if (tempTableContainer && document.body.contains(tempTableContainer)) {
            document.body.removeChild(tempTableContainer);
        }
        restoreLayers();
        alert(`Error exporting PDF: ${error instanceof Error ? error.message : 'Unknown error'}. Please check the console for details.`);
    }
}
// Debounce timer for saveSettings
let saveSettingsTimer = null;
/**
 * Saves all form settings to localStorage with debouncing
 * For critical settings (like margins), saves immediately
 */
function saveSettings(immediate = false) {
    if (immediate) {
        // Save immediately for critical settings
        saveSettingsImmediate();
        return;
    }
    // Clear existing timer
    if (saveSettingsTimer !== null) {
        clearTimeout(saveSettingsTimer);
    }
    // Debounce: wait 200ms before saving to avoid excessive writes (reduced from 300ms)
    saveSettingsTimer = window.setTimeout(() => {
        saveSettingsImmediate();
        saveSettingsTimer = null;
    }, 200);
}
/**
 * Immediately saves all form settings to localStorage
 */
function saveSettingsImmediate() {
    try {
        // Check if localStorage is available
        if (typeof Storage === 'undefined' || !localStorage) {
            console.warn('localStorage is not available');
            return;
        }
        // Test if localStorage is actually accessible (Safari Tracking Prevention)
        try {
            localStorage.setItem('__test__', 'test');
            localStorage.removeItem('__test__');
        }
        catch (testError) {
            // localStorage is blocked (e.g., Safari Tracking Prevention)
            console.warn('localStorage access blocked by browser - settings will not persist');
            return;
        }
        const settings = {};
        // Page dimensions
        const pageWidth = document.getElementById('pageWidth')?.value || '';
        const pageHeight = document.getElementById('pageHeight')?.value || '';
        const paperSizeSelect = document.getElementById('paperSizeSelect')?.value || '';
        const orientationToggle = document.getElementById('orientationToggle')?.checked ?? false;
        settings.pageWidth = pageWidth;
        settings.pageHeight = pageHeight;
        settings.paperSizeSelect = paperSizeSelect;
        settings.orientationToggle = orientationToggle;
        // Margins
        const marginUnitToggle = document.getElementById('marginUnitToggle')?.checked ?? false;
        settings.marginUnitToggle = marginUnitToggle;
        // Get margin values - use empty string if input doesn't exist or is empty
        const topMarginInput = document.getElementById('topMargin');
        const bottomMarginInput = document.getElementById('bottomMargin');
        const leftMarginInput = document.getElementById('leftMargin');
        const rightMarginInput = document.getElementById('rightMargin');
        const innerMarginLeftInput = document.getElementById('innerMarginLeft');
        const innerMarginRightInput = document.getElementById('innerMarginRight');
        const outerMarginLeftInput = document.getElementById('outerMarginLeft');
        const outerMarginRightInput = document.getElementById('outerMarginRight');
        // Always save margin values, even if empty (to preserve user's cleared inputs)
        settings.topMargin = topMarginInput?.value ?? '';
        settings.bottomMargin = bottomMarginInput?.value ?? '';
        settings.leftMargin = leftMarginInput?.value ?? '';
        settings.rightMargin = rightMarginInput?.value ?? '';
        settings.innerMarginLeft = innerMarginLeftInput?.value ?? '';
        settings.innerMarginRight = innerMarginRightInput?.value ?? '';
        settings.outerMarginLeft = outerMarginLeftInput?.value ?? '';
        settings.outerMarginRight = outerMarginRightInput?.value ?? '';
        // Facing pages
        const facingPages = document.getElementById('facingPages')?.checked ?? false;
        settings.facingPages = facingPages;
        // Columns
        const numCols = document.getElementById('numCols')?.value || '';
        const gutterWidth = document.getElementById('gutterWidth')?.value || '';
        settings.numCols = numCols;
        settings.gutterWidth = gutterWidth;
        // Column span slider
        const columnSpanSlider = document.getElementById('columnSpanSlider');
        if (columnSpanSlider) {
            settings.columnSpanValue = columnSpanSlider.value;
        }
        // Text start slider
        const textStartSlider = document.getElementById('textStartSlider');
        if (textStartSlider) {
            settings.textStartColumn = parseInt(textStartSlider.value, 10) || 1;
        }
        // Typography
        const typeSize = document.getElementById('typeSize')?.value || '';
        const leading = document.getElementById('leading')?.value || '';
        const fontFamily = document.getElementById('fontFamily')?.value || '';
        const hyphenation = document.getElementById('hyphenation')?.checked ?? false;
        const justifyText = document.getElementById('justifyText')?.checked ?? false;
        settings.typeSize = typeSize;
        settings.leading = leading;
        settings.fontFamily = fontFamily;
        settings.hyphenation = hyphenation;
        settings.justifyText = justifyText;
        // Sample text
        const sampleText = document.getElementById('sampleText')?.value || '';
        settings.sampleText = sampleText;
        // Layer visibility
        const showMargins = document.getElementById('showMargins')?.checked ?? true;
        const showColumns = document.getElementById('showColumns')?.checked ?? true;
        const showText = document.getElementById('showText')?.checked ?? true;
        const solidFills = document.getElementById('solidFills')?.checked ?? false;
        const showRaggedEdge = document.getElementById('showRaggedEdge')?.checked ?? false;
        settings.showMargins = showMargins;
        settings.showColumns = showColumns;
        settings.showText = showText;
        settings.solidFills = solidFills;
        settings.showRaggedEdge = showRaggedEdge;
        // Sparkle toggle
        const sparkleToggle = document.getElementById('sparkleToggle')?.checked ?? true;
        settings.sparkleEnabled = sparkleToggle;
        const settingsJson = JSON.stringify(settings);
        // Try to save with error handling
        try {
            localStorage.setItem('compositorSettings', settingsJson);
            // Verify the save worked
            const verify = localStorage.getItem('compositorSettings');
            if (verify !== settingsJson) {
                console.warn('Settings save verification failed - data may not have been saved correctly');
                // Try one more time with a small delay
                setTimeout(() => {
                    try {
                        localStorage.removeItem('compositorSettings');
                        localStorage.setItem('compositorSettings', settingsJson);
                        const verify2 = localStorage.getItem('compositorSettings');
                        if (verify2 !== settingsJson) {
                            console.error('Settings still not saved after retry');
                        }
                    }
                    catch (retryError) {
                        console.error('Failed to retry save:', retryError);
                    }
                }, 50);
            }
        }
        catch (e) {
            // Handle quota exceeded or other errors
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error('localStorage quota exceeded - cannot save settings');
            }
            else {
                console.error('Failed to save settings:', e);
            }
            // Try to clear old data and retry once
            try {
                localStorage.removeItem('compositorSettings');
                localStorage.setItem('compositorSettings', settingsJson);
            }
            catch (retryError) {
                console.error('Failed to save settings after retry:', retryError);
            }
        }
    }
    catch (e) {
        console.error('Failed to prepare settings for save:', e);
    }
}
/**
 * Loads all form settings from localStorage
 */
function loadSettings() {
    try {
        // Check if localStorage is available
        if (typeof Storage === 'undefined' || !localStorage) {
            console.warn('localStorage is not available - using defaults');
            return;
        }
        // Test if localStorage is actually accessible (Safari Tracking Prevention)
        try {
            localStorage.setItem('__test__', 'test');
            localStorage.removeItem('__test__');
        }
        catch (testError) {
            // localStorage is blocked (e.g., Safari Tracking Prevention)
            console.warn('localStorage access blocked by browser - using defaults');
            return;
        }
        const savedSettings = localStorage.getItem('compositorSettings');
        const marginUnitToggle = document.getElementById('marginUnitToggle');
        // If no saved settings, apply defaults
        if (!savedSettings) {
            applyDefaultSettings();
            return;
        }
        let settings;
        try {
            settings = JSON.parse(savedSettings);
        }
        catch (parseError) {
            console.error('Failed to parse saved settings:', parseError);
            // Clear corrupted data
            try {
                localStorage.removeItem('compositorSettings');
            }
            catch (e) {
                console.error('Failed to clear corrupted settings:', e);
            }
            return;
        }
        // Validate settings object
        if (typeof settings !== 'object' || settings === null) {
            console.error('Invalid settings format');
            return;
        }
        // Page dimensions
        if (settings.pageWidth) {
            const pageWidthInput = document.getElementById('pageWidth');
            if (pageWidthInput)
                pageWidthInput.value = settings.pageWidth;
        }
        if (settings.pageHeight) {
            const pageHeightInput = document.getElementById('pageHeight');
            if (pageHeightInput)
                pageHeightInput.value = settings.pageHeight;
        }
        if (settings.paperSizeSelect !== undefined) {
            const paperSizeSelect = document.getElementById('paperSizeSelect');
            if (paperSizeSelect)
                paperSizeSelect.value = settings.paperSizeSelect;
        }
        if (settings.orientationToggle !== undefined) {
            const orientationToggle = document.getElementById('orientationToggle');
            if (orientationToggle)
                orientationToggle.checked = settings.orientationToggle;
        }
        // Margin unit - default to em (checked) unless explicitly saved as false
        if (marginUnitToggle) {
            // Only use saved setting if it's explicitly set to false (mm)
            // Default to em (checked) for all other cases
            if (settings.marginUnitToggle === false) {
                marginUnitToggle.checked = false; // User explicitly saved as mm
            }
            else {
                marginUnitToggle.checked = true; // Default to em
            }
        }
        // Facing pages - load this FIRST so we can show/hide the correct inputs
        // and prevent sync logic from overwriting loaded margins
        const facingPagesCheckbox = document.getElementById('facingPages');
        const facingPages = settings.facingPages !== undefined ? settings.facingPages : false;
        // Set sync flags FIRST before calling updateMarginInputs() to prevent overwriting
        const leftMarginInput = document.getElementById('leftMargin');
        const rightMarginInput = document.getElementById('rightMargin');
        const innerMarginLeftInput = document.getElementById('innerMarginLeft');
        const innerMarginRightInput = document.getElementById('innerMarginRight');
        const outerMarginLeftInput = document.getElementById('outerMarginLeft');
        const outerMarginRightInput = document.getElementById('outerMarginRight');
        if (facingPages) {
            // In facing pages mode, set sync flags on ALL margins to prevent overwriting
            // This prevents old left/right values from syncing to inner/outer
            if (innerMarginLeftInput)
                innerMarginLeftInput.dataset.synced = 'loading';
            if (innerMarginRightInput)
                innerMarginRightInput.dataset.synced = 'loading';
            if (outerMarginLeftInput)
                outerMarginLeftInput.dataset.synced = 'loading';
            if (outerMarginRightInput)
                outerMarginRightInput.dataset.synced = 'loading';
            if (leftMarginInput)
                leftMarginInput.dataset.synced = 'loading';
            if (rightMarginInput)
                rightMarginInput.dataset.synced = 'loading';
        }
        else {
            // In single page mode, set sync flags on BOTH left/right AND inner/outer to prevent sync
            // This prevents old inner/outer values from overwriting loaded left/right values
            if (leftMarginInput)
                leftMarginInput.dataset.synced = 'loading';
            if (rightMarginInput)
                rightMarginInput.dataset.synced = 'loading';
            if (innerMarginLeftInput)
                innerMarginLeftInput.dataset.synced = 'loading';
            if (innerMarginRightInput)
                innerMarginRightInput.dataset.synced = 'loading';
            if (outerMarginLeftInput)
                outerMarginLeftInput.dataset.synced = 'loading';
            if (outerMarginRightInput)
                outerMarginRightInput.dataset.synced = 'loading';
        }
        if (facingPagesCheckbox) {
            facingPagesCheckbox.checked = facingPages;
            // Update margin inputs visibility based on facing pages state
            // Sync flags prevent updateMarginInputs() from overwriting values
            updateMarginInputs();
        }
        else {
            // If no facing pages checkbox, ensure margin inputs are updated
            // Sync flags prevent updateMarginInputs() from overwriting values
            updateMarginInputs();
        }
        // Now load margins AFTER sync flags are set
        // Only load if value exists and is not empty string
        if (settings.topMargin !== undefined && settings.topMargin !== '') {
            const topMarginInput = document.getElementById('topMargin');
            if (topMarginInput)
                topMarginInput.value = String(settings.topMargin);
        }
        if (settings.bottomMargin !== undefined && settings.bottomMargin !== '') {
            const bottomMarginInput = document.getElementById('bottomMargin');
            if (bottomMarginInput)
                bottomMarginInput.value = String(settings.bottomMargin);
        }
        if (facingPages) {
            // Load facing pages margins
            // IMPORTANT: Clear left/right margin values first to prevent them from syncing to inner/outer
            // These might have old values from a previous single page session
            if (leftMarginInput)
                leftMarginInput.value = '';
            if (rightMarginInput)
                rightMarginInput.value = '';
            // Now load the saved inner/outer margin values - only if value exists and is not empty
            if (settings.innerMarginLeft !== undefined && settings.innerMarginLeft !== '') {
                if (innerMarginLeftInput)
                    innerMarginLeftInput.value = String(settings.innerMarginLeft);
            }
            if (settings.innerMarginRight !== undefined && settings.innerMarginRight !== '') {
                const innerMarginRightInput = document.getElementById('innerMarginRight');
                if (innerMarginRightInput)
                    innerMarginRightInput.value = String(settings.innerMarginRight);
            }
            if (settings.outerMarginLeft !== undefined && settings.outerMarginLeft !== '') {
                const outerMarginLeftInput = document.getElementById('outerMarginLeft');
                if (outerMarginLeftInput)
                    outerMarginLeftInput.value = String(settings.outerMarginLeft);
            }
            if (settings.outerMarginRight !== undefined && settings.outerMarginRight !== '') {
                const outerMarginRightInput = document.getElementById('outerMarginRight');
                if (outerMarginRightInput)
                    outerMarginRightInput.value = String(settings.outerMarginRight);
            }
            // Clear sync flags after loading to allow manual updates
            if (innerMarginLeftInput)
                innerMarginLeftInput.dataset.synced = '';
            if (innerMarginRightInput)
                innerMarginRightInput.dataset.synced = '';
            if (outerMarginLeftInput)
                outerMarginLeftInput.dataset.synced = '';
            if (outerMarginRightInput)
                outerMarginRightInput.dataset.synced = '';
            if (leftMarginInput)
                leftMarginInput.dataset.synced = '';
            if (rightMarginInput)
                rightMarginInput.dataset.synced = '';
        }
        else {
            // Load single page margins - only if value exists and is not empty
            // IMPORTANT: Clear inner/outer margin values first to prevent them from syncing to left/right
            // These might have old values from a previous facing pages session
            if (innerMarginLeftInput)
                innerMarginLeftInput.value = '';
            if (innerMarginRightInput)
                innerMarginRightInput.value = '';
            if (outerMarginLeftInput)
                outerMarginLeftInput.value = '';
            if (outerMarginRightInput)
                outerMarginRightInput.value = '';
            // Now load the saved left/right margin values
            if (settings.leftMargin !== undefined && settings.leftMargin !== '') {
                if (leftMarginInput)
                    leftMarginInput.value = String(settings.leftMargin);
            }
            if (settings.rightMargin !== undefined && settings.rightMargin !== '') {
                const rightMarginInput = document.getElementById('rightMargin');
                if (rightMarginInput)
                    rightMarginInput.value = String(settings.rightMargin);
            }
            // Clear sync flags after loading to allow manual updates
            if (leftMarginInput)
                leftMarginInput.dataset.synced = '';
            if (rightMarginInput)
                rightMarginInput.dataset.synced = '';
            // Also clear inner/outer sync flags since we set them to prevent sync
            if (innerMarginLeftInput)
                innerMarginLeftInput.dataset.synced = '';
            if (innerMarginRightInput)
                innerMarginRightInput.dataset.synced = '';
            if (outerMarginLeftInput)
                outerMarginLeftInput.dataset.synced = '';
            if (outerMarginRightInput)
                outerMarginRightInput.dataset.synced = '';
        }
        // Ensure all sync flags are cleared after loading to allow manual updates
        const allMarginInputs = [
            'topMargin', 'bottomMargin', 'leftMargin', 'rightMargin',
            'innerMarginLeft', 'innerMarginRight', 'outerMarginLeft', 'outerMarginRight'
        ];
        allMarginInputs.forEach(id => {
            const input = document.getElementById(id);
            if (input && input.dataset.synced === 'loading') {
                input.dataset.synced = '';
            }
        });
        // Columns
        if (settings.numCols) {
            const numColsInput = document.getElementById('numCols');
            if (numColsInput)
                numColsInput.value = settings.numCols;
        }
        if (settings.gutterWidth) {
            const gutterWidthInput = document.getElementById('gutterWidth');
            if (gutterWidthInput)
                gutterWidthInput.value = settings.gutterWidth;
        }
        // Typography
        if (settings.typeSize) {
            const typeSizeInput = document.getElementById('typeSize');
            if (typeSizeInput)
                typeSizeInput.value = settings.typeSize;
        }
        if (settings.leading) {
            const leadingInput = document.getElementById('leading');
            if (leadingInput)
                leadingInput.value = settings.leading;
        }
        if (settings.fontFamily) {
            const fontFamilySelect = document.getElementById('fontFamily');
            if (fontFamilySelect)
                fontFamilySelect.value = settings.fontFamily;
        }
        if (settings.hyphenation !== undefined) {
            const hyphenationCheckbox = document.getElementById('hyphenation');
            if (hyphenationCheckbox)
                hyphenationCheckbox.checked = settings.hyphenation;
        }
        if (settings.justifyText !== undefined) {
            const justifyTextCheckbox = document.getElementById('justifyText');
            if (justifyTextCheckbox) {
                justifyTextCheckbox.checked = settings.justifyText;
                justifyTextCheckbox.dispatchEvent(new Event('change', { bubbles: true })); // the alignment icons follow it
            }
        }
        // Sample text
        if (settings.sampleText !== undefined) {
            const sampleTextInput = document.getElementById('sampleText');
            if (sampleTextInput)
                sampleTextInput.value = settings.sampleText;
        }
        // Layer visibility
        if (settings.showMargins !== undefined) {
            const showMarginsCheckbox = document.getElementById('showMargins');
            if (showMarginsCheckbox)
                showMarginsCheckbox.checked = settings.showMargins;
        }
        if (settings.showColumns !== undefined) {
            const showColumnsCheckbox = document.getElementById('showColumns');
            if (showColumnsCheckbox)
                showColumnsCheckbox.checked = settings.showColumns;
        }
        if (settings.showText !== undefined) {
            const showTextCheckbox = document.getElementById('showText');
            if (showTextCheckbox)
                showTextCheckbox.checked = settings.showText;
        }
        if (settings.solidFills !== undefined) {
            const solidFillsCheckbox = document.getElementById('solidFills');
            if (solidFillsCheckbox)
                solidFillsCheckbox.checked = settings.solidFills;
        }
        if (settings.showRaggedEdge !== undefined) {
            const showRaggedEdgeCheckbox = document.getElementById('showRaggedEdge');
            if (showRaggedEdgeCheckbox)
                showRaggedEdgeCheckbox.checked = settings.showRaggedEdge;
        }
        // Update margin labels and inputs visibility after loading
        // BUT don't sync values - we just loaded them, so preserve what was loaded
        updateMarginLabels();
        // Only update visibility, not values (sync flags prevent overwriting)
        const isFacingPagesMode = isFacingPages();
        const singlePageMargins = document.getElementById('singlePageMargins');
        const facingPagesMargins = document.getElementById('facingPagesMargins');
        if (isFacingPagesMode) {
            if (singlePageMargins)
                singlePageMargins.style.display = 'none';
            if (facingPagesMargins)
                facingPagesMargins.style.display = 'grid';
        }
        else {
            if (singlePageMargins)
                singlePageMargins.style.display = 'grid';
            if (facingPagesMargins)
                facingPagesMargins.style.display = 'none';
        }
        // Restore column span slider
        if (settings.columnSpanValue) {
            const columnSpanSlider = document.getElementById('columnSpanSlider');
            const columnSpanValue = document.getElementById('columnSpanValue');
            if (columnSpanSlider) {
                const numCols = parseInt(document.getElementById('numCols').value, 10) || 1;
                const savedValue = Math.min(parseInt(settings.columnSpanValue, 10), numCols); // Ensure value doesn't exceed max
                columnSpanSlider.value = savedValue.toString();
                if (columnSpanValue) {
                    columnSpanValue.textContent = savedValue.toString();
                }
            }
        }
        else if (settings.columnSpan && Array.isArray(settings.columnSpan)) {
            // Legacy support: convert old checkbox-based settings to slider
            const columnSpanSlider = document.getElementById('columnSpanSlider');
            const columnSpanValue = document.getElementById('columnSpanValue');
            if (columnSpanSlider && settings.columnSpan.length > 0) {
                const spanCount = settings.columnSpan.length;
                const numCols = parseInt(document.getElementById('numCols').value, 10) || 1;
                const savedValue = Math.min(spanCount, numCols);
                columnSpanSlider.value = savedValue.toString();
                if (columnSpanValue) {
                    columnSpanValue.textContent = savedValue.toString();
                }
            }
        }
        // Restore text start slider
        const textStartSlider = document.getElementById('textStartSlider');
        if (textStartSlider) {
            // Support both old textColumns array and new textStartColumn value
            if (settings.textStartColumn !== undefined) {
                textStartSlider.value = settings.textStartColumn.toString();
            }
            else if (settings.textColumns && Array.isArray(settings.textColumns) && settings.textColumns.length > 0) {
                // Migrate from old checkbox system - use first column
                textStartSlider.value = Math.min(...settings.textColumns).toString();
            }
            const textStartValue = document.getElementById('textStartValue');
            if (textStartValue) {
                textStartValue.textContent = textStartSlider.value;
            }
            updateTextStartSlider(); // Update max and validate
        }
        // Restore sparkle toggle
        if (settings.sparkleEnabled !== undefined) {
            const sparkleToggle = document.getElementById('sparkleToggle');
            if (sparkleToggle) {
                sparkleToggle.checked = settings.sparkleEnabled;
            }
        }
        // Trigger visualization update after all settings are loaded
        setTimeout(() => {
            updateVisualizationOnInputChange();
            updateWordsPerLine();
            updateColumnWidthDisplay();
        }, 200);
    }
    catch (e) {
        // Silently fail if localStorage is not available or data is corrupted
        console.error('Failed to load settings:', e);
        // Still trigger visualization with defaults
        setTimeout(() => {
            updateVisualizationOnInputChange();
            updateWordsPerLine();
            updateColumnWidthDisplay();
        }, 200);
    }
}
/**
 * Shows the introduction modal
 */
function showIntroModal() {
    const modal = document.getElementById('introModal');
    if (modal) {
        modal.classList.add('show');
    }
}
/**
 * Hides the introduction modal
 */
function hideIntroModal() {
    const modal = document.getElementById('introModal');
    if (modal) {
        modal.classList.remove('show');
    }
}
// Track if decorations have been initialized
let decorationsInitialized = false;
/**
 * Adds random letterpress decoration images to the visualization container
 */
function addLetterpressDecorations() {
    // Use app-wrapper to cover the whole page
    const pageContainer = document.querySelector('.app-wrapper');
    if (!pageContainer)
        return;
    // Only add decorations once on page load
    if (decorationsInitialized)
        return;
    // Check if decorations already exist
    if (pageContainer.querySelector('.letterpress-decoration')) {
        decorationsInitialized = true;
        return;
    }
    const decorations = [
        {
            src: 'images/compositor.jpg',
            alt: 'Composing stick with lead type',
            name: 'compositor',
            type: 'image'
        },
        {
            src: 'images/chase.jpeg',
            alt: 'Chase with type',
            name: 'chase',
            type: 'image'
        },
        {
            src: 'images/em.jpg',
            alt: 'Capital wooden M',
            name: 'em',
            type: 'image'
        }
    ];
    // Randomly decide if we should include an emoji (50% chance)
    const includeEmoji = Math.random() > 0.5;
    const emojis = ['💣', '🔥', '💥'];
    if (includeEmoji) {
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        decorations.push({
            src: randomEmoji,
            alt: 'Random emoji',
            name: 'emoji',
            type: 'emoji'
        });
    }
    // Shuffle decorations for random order
    const shuffledDecorations = decorations.sort(() => Math.random() - 0.5);
    shuffledDecorations.forEach((decoration, index) => {
        // Stagger appearance: each decoration appears 1 second after the previous one
        const appearanceDelay = index * 1000;
        setTimeout(() => {
            const containerRect = pageContainer.getBoundingClientRect();
            const pageWidth = containerRect.width;
            const pageHeight = containerRect.height;
            let element;
            if (decoration.type === 'emoji') {
                // Create emoji element
                element = document.createElement('div');
                element.textContent = decoration.src;
                element.className = 'letterpress-decoration letterpress-emoji';
                element.id = `decoration-${decoration.name}`;
                element.style.fontSize = '200px';
                element.style.textAlign = 'center';
                element.style.lineHeight = '1';
            }
            else {
                // Create image element
                const img = document.createElement('img');
                img.src = decoration.src;
                img.alt = decoration.alt;
                img.className = 'letterpress-decoration';
                img.id = `decoration-${decoration.name}`;
                // Handle image load errors gracefully
                img.onerror = () => {
                    console.warn(`Failed to load decoration image: ${decoration.src}`);
                    img.style.display = 'none';
                };
                element = img;
            }
            // Random position anywhere on the whole page
            const imageSize = decoration.type === 'emoji' ? 200 : 500;
            const padding = 50; // Padding from edges
            // Calculate available area for positioning
            const maxX = pageWidth - imageSize - padding;
            const maxY = pageHeight - imageSize - padding;
            // Random position within available bounds
            let x = padding + Math.random() * Math.max(0, maxX - padding);
            let y = padding + Math.random() * Math.max(0, maxY - padding);
            // Ensure values are valid
            x = Math.max(padding, Math.min(x, pageWidth - imageSize - padding));
            y = Math.max(padding, Math.min(y, pageHeight - imageSize - padding));
            // Position relative to page container (using fixed positioning)
            // Calculate position relative to viewport based on app-wrapper position
            const viewportX = containerRect.left + x;
            const viewportY = containerRect.top + y;
            element.style.position = 'fixed';
            element.style.left = `${viewportX}px`;
            element.style.top = `${viewportY}px`;
            element.style.zIndex = '10000'; // Ensure it appears above everything
            // Random rotation between -15 and 15 degrees (only for images)
            if (decoration.type === 'image') {
                const rotation = (Math.random() * 30) - 15;
                element.style.transform = `rotate(${rotation}deg)`;
            }
            // Start with opacity 0 and fade in
            element.style.opacity = '0';
            pageContainer.appendChild(element);
            // Store timeout IDs for cleanup
            const fadeInTimeout = setTimeout(() => {
                element.style.transition = 'opacity 0.3s ease-in';
                element.style.opacity = '1';
            }, 50);
            // Random display duration between 2-4 seconds after appearance
            const displayDuration = 2000 + Math.random() * 2000; // 2000-4000ms
            const removeTimeout = setTimeout(() => {
                if (element.parentNode && element.parentNode === pageContainer) {
                    // Remove instantly without fade-out
                    element.remove();
                }
            }, displayDuration);
            // Store timeout IDs on element for potential cleanup
            element.__timeoutIds = [fadeInTimeout, removeTimeout];
        }, appearanceDelay);
    });
    decorationsInitialized = true;
}
export function initializeCalculator() {
    // Save settings before page unload as backup
    window.addEventListener('beforeunload', () => {
        // Clear any pending debounced save and save immediately
        if (saveSettingsTimer !== null) {
            clearTimeout(saveSettingsTimer);
            saveSettingsTimer = null;
        }
        saveSettingsImmediate();
    });
    // Also save on visibility change (when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Clear any pending debounced save and save immediately
            if (saveSettingsTimer !== null) {
                clearTimeout(saveSettingsTimer);
                saveSettingsTimer = null;
            }
            saveSettingsImmediate();
        }
    });
    // Initialize footer menu toggle
    const footerMenuToggle = document.getElementById('footerMenuToggle');
    const footer = document.getElementById('footer');
    if (footerMenuToggle && footer) {
        footerMenuToggle.addEventListener('click', () => {
            footer.classList.toggle('expanded');
        });
    }
    // Allow independent scrolling in container - CSS overscroll-behavior handles scroll chaining
    // No JavaScript needed for independent scrolling with CSS overscroll-behavior: contain
    // Populate paper size dropdown FIRST (before loadSettings so dropdown is ready)
    populatePaperSizeDropdown();
    // Load saved settings after dropdown is populated
    loadSettings();
    // Set em toggle default to checked after loading (will override if no saved setting)
    const defaultMarginUnitToggle = document.getElementById('marginUnitToggle');
    if (defaultMarginUnitToggle && !defaultMarginUnitToggle.checked) {
        // Only set if not already checked (no saved setting was loaded)
        const savedSettings = localStorage.getItem('compositorSettings');
        if (!savedSettings || !JSON.parse(savedSettings).marginUnitToggle) {
            defaultMarginUnitToggle.checked = true; // Default to em
        }
    }
    // Initialize orientation toggle state
    updateOrientationToggleState();
    // Add letterpress decorations (only if sparkle is enabled)
    const sparkleToggle = document.getElementById('sparkleToggle');
    if (sparkleToggle) {
        // Load saved sparkle setting
        const savedSettings = localStorage.getItem('compositorSettings');
        if (savedSettings) {
            try {
                const settings = JSON.parse(savedSettings);
                if (settings.sparkleEnabled !== undefined) {
                    sparkleToggle.checked = settings.sparkleEnabled;
                }
                else {
                    sparkleToggle.checked = true; // Default to enabled
                }
            }
            catch (e) {
                sparkleToggle.checked = true; // Default to enabled
            }
        }
        else {
            sparkleToggle.checked = true; // Default to enabled
        }
        // Add decorations if enabled
        if (sparkleToggle.checked) {
            setTimeout(() => {
                addLetterpressDecorations();
            }, 100);
        }
        // Handle toggle change
        sparkleToggle.addEventListener('change', () => {
            saveSettings();
            // If enabling, add decorations; if disabling, remove them
            if (sparkleToggle.checked) {
                setTimeout(() => {
                    addLetterpressDecorations();
                }, 100);
            }
            else {
                const pageContainer = document.querySelector('.app-wrapper');
                if (pageContainer) {
                    const decorations = pageContainer.querySelectorAll('.letterpress-decoration');
                    decorations.forEach(decoration => decoration.remove());
                    decorationsInitialized = false; // Reset flag so decorations can be re-added if toggled back on
                }
            }
        });
    }
    // Initialize modal
    const modal = document.getElementById('introModal');
    const readMeLink = document.getElementById('readMeLink');
    const readMeLinkFixed = document.getElementById('readMeLinkFixed');
    const closeModal = document.getElementById('closeModal');
    const handleReadMeClick = (e) => {
        e.preventDefault();
        showIntroModal();
    };
    if (readMeLink) {
        readMeLink.addEventListener('click', handleReadMeClick);
    }
    if (readMeLinkFixed) {
        readMeLinkFixed.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            showIntroModal();
        });
    }
    // Initialize reset link
    const resetLink = document.getElementById('resetLink');
    if (resetLink) {
        resetLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetToDefaults();
        });
    }
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            hideIntroModal();
        });
    }
    // Close modal when clicking outside
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideIntroModal();
            }
        });
        // Close modal on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) {
                hideIntroModal();
            }
        });
        // The start screen (index.html) carries the introduction, so the Read me modal opens only on request.
    }
    // Save dismissal state when closing
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            localStorage.setItem('introModalDismissed', 'true');
        });
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                localStorage.setItem('introModalDismissed', 'true');
            }
        });
    }
    // Initialize margin inputs visibility
    updateMarginInputs();
    // Handle margin unit toggle
    initStylesPanel(() => updateVisualizationOnInputChange());
    // em / mm text choice in the panel header: clicking a word sets the (hidden) checkbox that holds the unit
    document.querySelectorAll('.unit-pick .unit-opt').forEach((opt) => {
        opt.addEventListener('click', () => {
            const box = document.getElementById('marginUnitToggle');
            if (box && box.checked !== (opt.dataset.unit === 'em'))
                box.click();
        });
    });
    const marginUnitToggle = document.getElementById('marginUnitToggle');
    if (marginUnitToggle) {
        let previousUnit = marginUnitToggle.checked ? 'em' : 'mm';
        marginUnitToggle.addEventListener('change', () => {
            const newUnit = marginUnitToggle.checked ? 'em' : 'mm';
            convertMarginValues(previousUnit, newUnit);
            updateMarginLabels();
            previousUnit = newUnit;
            // Update gutter helper text after unit change
            updateColumnWidthDisplay();
            updateVisualizationOnInputChange();
            saveSettings();
        });
    }
    // Handle gutter width input changes to update label
    addInputChangeListeners('gutterWidth', {
        onBoth: () => {
            updateMarginLabels();
            updateVisualizationOnInputChange();
            saveSettings();
        }
    });
    // Handle margin input changes to update labels with conversion values
    const marginInputs = [
        'topMargin',
        'bottomMargin',
        'leftMargin',
        'rightMargin',
        'innerMarginLeft',
        'innerMarginRight',
        'outerMarginLeft',
        'outerMarginRight'
    ];
    marginInputs.forEach(inputId => {
        addInputChangeListeners(inputId, {
            onBoth: () => {
                // Clear sync flags when user manually changes margins
                const input = document.getElementById(inputId);
                if (input) {
                    input.dataset.synced = '';
                }
                // Also clear related sync flags
                if (inputId === 'leftMargin' || inputId === 'rightMargin') {
                    const innerMarginLeftInput = document.getElementById('innerMarginLeft');
                    if (innerMarginLeftInput)
                        innerMarginLeftInput.dataset.synced = '';
                }
                if (inputId.startsWith('inner') || inputId.startsWith('outer')) {
                    const leftMarginInput = document.getElementById('leftMargin');
                    if (leftMarginInput)
                        leftMarginInput.dataset.synced = '';
                }
                // Debug logging
                updateMarginLabels();
                updateVisualizationOnInputChange();
                saveSettings(true); // Save immediately for margins
            }
        });
    });
    // Handle facing pages checkbox
    const facingPagesCheckbox = document.getElementById('facingPages');
    if (facingPagesCheckbox) {
        facingPagesCheckbox.addEventListener('change', () => {
            // Clear sync flags when switching modes
            const innerMarginLeftInput = document.getElementById('innerMarginLeft');
            const leftMarginInput = document.getElementById('leftMargin');
            if (innerMarginLeftInput)
                innerMarginLeftInput.dataset.synced = '';
            if (leftMarginInput)
                leftMarginInput.dataset.synced = '';
            updateMarginInputs();
            updateVisualizationOnInputChange();
            saveSettings();
        });
    }
    // Note: Facing pages margin inputs are already handled above in marginInputs array
    // Handle sample text input - update visualization when text changes
    const sampleTextInput = document.getElementById('sampleText');
    addInputChangeListeners('sampleText', {
        onBoth: () => {
            updateVisualizationOnInputChange();
            saveSettings();
        }
    });
    // Handle layer visibility checkboxes
    const layerCheckboxes = ['showMargins', 'showColumns', 'showText', 'solidFills', 'showRaggedEdge', 'showBaseline'];
    layerCheckboxes.forEach(id => {
        addInputChangeListeners(id, {
            onChange: () => {
                updateVisualizationOnInputChange();
                saveSettings();
            }
        });
    });
    // Load default text on page open (only if no saved text exists)
    // Note: loadSettings() handles loading saved text, so we only set default if nothing was loaded
    if (sampleTextInput && !sampleTextInput.value) {
        sampleTextInput.value = DEFAULT_SAMPLE_TEXT;
    }
    // Handle load default text button
    const loadDefaultTextButton = document.getElementById('loadDefaultTextButton');
    if (loadDefaultTextButton && sampleTextInput) {
        loadDefaultTextButton.addEventListener('click', () => {
            sampleTextInput.value = DEFAULT_SAMPLE_TEXT;
            updateVisualizationOnInputChange();
            saveSettings();
        });
    }
    // Handle clear text button
    const clearTextButton = document.getElementById('clearTextButton');
    if (clearTextButton && sampleTextInput) {
        clearTextButton.addEventListener('click', () => {
            sampleTextInput.value = '';
            updateVisualizationOnInputChange();
            saveSettings();
        });
    }
    // Initialize column span slider
    updateColumnSpanSlider();
    // Handle column span slider
    const columnSpanSlider = document.getElementById('columnSpanSlider');
    const columnSpanValue = document.getElementById('columnSpanValue');
    if (columnSpanSlider) {
        addInputChangeListeners('columnSpanSlider', {
            onInput: () => {
                if (columnSpanValue) {
                    columnSpanValue.textContent = columnSpanSlider.value;
                }
                updateTextStartSlider();
                updateVisualizationOnInputChange();
                saveSettings();
            },
            onChange: () => {
                updateTextStartSlider();
                updateVisualizationOnInputChange();
                saveSettings();
            }
        });
    }
    // Initialize text start slider
    updateTextStartSlider();
    // Handle text start slider
    const textStartSlider = document.getElementById('textStartSlider');
    const textStartValue = document.getElementById('textStartValue');
    if (textStartSlider) {
        addInputChangeListeners('textStartSlider', {
            onBoth: () => {
                if (textStartValue) {
                    textStartValue.textContent = textStartSlider.value;
                }
                updateVisualizationOnInputChange();
                saveSettings();
            }
        });
    }
    // Handle number of columns change
    addInputChangeListeners('numCols', {
        onBoth: () => {
            updateColumnSpanSlider();
            updateTextStartSlider();
            updateVisualizationOnInputChange();
            saveSettings();
        }
    });
    // Paper size dropdown already populated above (before loadSettings)
    // Set gutter on load
    suggestGutter();
    // Get type size and leading inputs
    const typeSizeInput = document.getElementById('typeSize');
    const leadingInput = document.getElementById('leading');
    // Initialize leading to default value (type size + 2) if empty
    if (typeSizeInput && leadingInput && (!leadingInput.value || leadingInput.value === '')) {
        const typeSize = parseFloat(typeSizeInput.value);
        if (!isNaN(typeSize)) {
            leadingInput.value = (typeSize + 2).toFixed(1);
        }
    }
    // Recalculate gutter and words per line when type size changes
    if (typeSizeInput) {
        addInputChangeListeners('typeSize', {
            onInput: () => {
                suggestGutter();
                // Auto-update leading to type size + 2 if leading is empty
                if (leadingInput && (!leadingInput.value || leadingInput.value === '')) {
                    const newTypeSize = parseFloat(typeSizeInput.value);
                    leadingInput.value = (newTypeSize + 2).toFixed(1);
                }
                updateColumnWidthDisplay();
                updateWordsPerLine();
                updateMarginLabels();
                updateVisualizationOnInputChange();
                saveSettings(true); // Save immediately for type size
            },
            onChange: () => {
                updateColumnWidthDisplay();
                updateWordsPerLine();
                updateMarginLabels();
                updateVisualizationOnInputChange();
                saveSettings(true); // Save immediately for type size
            }
        });
    }
    // Handle leading input
    addInputChangeListeners('leading', {
        onBoth: () => {
            updateVisualizationOnInputChange();
            saveSettings(true); // Save immediately for leading
        }
    });
    // Export to PDF button
    const exportHtmlButton = document.getElementById('exportHtmlButton');
    if (exportHtmlButton) {
        exportHtmlButton.addEventListener('click', () => {
            exportVisualizationAsPDF().catch(error => {
                console.error('PDF export error:', error);
                alert('Error exporting PDF. Please try again.');
            });
        });
    }
    // Export to InDesign (IDML) button
    const exportIdmlButton = document.getElementById('exportIdmlButton');
    if (exportIdmlButton) {
        const idmlStatus = document.getElementById('idmlStatus');
        exportIdmlButton.addEventListener('click', async () => {
            const say = (msg) => { if (idmlStatus) idmlStatus.textContent = msg; };
            try {
                say('Building the InDesign file…');
                const JSZipClass = await window.loadJSZip();
                const inputs = getFormInputs();
                const text = document.getElementById('sampleText')?.value || '';
                const spaceField = document.getElementById('paraSpace')?.value ?? '';
                const spec = { inputs, text, styleSettings: getStyleSettings(), styleFonts: getStyleFonts(), paraSpacePt: spaceField === '' ? undefined : parseFloat(spaceField), facing: isFacingPages(), name: 'chase.indd' };
                const blob = await buildIdmlBlob(JSZipClass, spec);
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'chase-layout.idml';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(link.href), 5000);
                say('Downloaded chase-layout.idml. Open it in InDesign; text that does not fit shows as overset. The last page lists each setting and where to change it.');
            }
            catch (error) {
                console.error('IDML export error:', error);
                say('The InDesign file could not be made. Check the connection and try again.');
            }
        });
    }
    // Handle paper size selection
    const paperSizeSelect = document.getElementById('paperSizeSelect');
    if (paperSizeSelect) {
        paperSizeSelect.addEventListener('change', (e) => {
            const target = e.target;
            if (target.value) {
                applyPaperSize(target.value); // applyPaperSize already calls saveSettings
            }
            else {
                updateVisualizationOnInputChange();
                saveSettings();
            }
        });
    }
    // Handle custom page width/height inputs
    const updateCustomSize = () => {
        if (paperSizeSelect)
            paperSizeSelect.value = ''; // Set to custom if dimensions are changed manually
        updateVisualizationOnInputChange();
        saveSettings(true); // Save immediately for page dimensions
    };
    addInputChangeListeners('pageWidth', { onBoth: updateCustomSize });
    addInputChangeListeners('pageHeight', { onBoth: updateCustomSize });
    // Handle orientation toggle change
    const orientationToggle = document.getElementById('orientationToggle');
    if (orientationToggle) {
        orientationToggle.addEventListener('change', () => {
            // Update active state for icons
            updateOrientationToggleState();
            // If a paper size is selected, reapply it with new orientation
            if (paperSizeSelect && paperSizeSelect.value) {
                applyPaperSize(paperSizeSelect.value);
            }
            else {
                // Otherwise, swap current width and height
                updateOrientation();
                saveSettings();
            }
        });
    }
    // Note: Most inputs are already handled above with specific handlers
    // pageWidth/pageHeight handled above, margins handled in marginInputs,
    // numCols/gutterWidth handled above, so no need for duplicate listeners
    // Handle font family change
    addInputChangeListeners('fontFamily', {
        onChange: () => {
            updateVisualizationOnInputChange();
            saveSettings();
        }
    });
    // Handle hyphenation checkbox
    addInputChangeListeners('hyphenation', {
        onChange: updateVisualizationOnInputChange
    });
    // Function to update ragged edge label based on justify text state
    function updateRaggedEdgeLabel() {
        const justifyTextCheckbox = document.getElementById('justifyText');
        // Find the span inside the label that contains the showRaggedEdge checkbox
        const raggedEdgeCheckbox = document.getElementById('showRaggedEdge');
        const raggedEdgeLabel = raggedEdgeCheckbox?.closest('label')?.querySelector('span');
        if (raggedEdgeLabel && justifyTextCheckbox) {
            if (justifyTextCheckbox.checked) {
                raggedEdgeLabel.textContent = 'Show rivers';
            }
            else {
                raggedEdgeLabel.textContent = 'Show ragged edge';
            }
        }
    }
    // Handle justify text checkbox
    addInputChangeListeners('justifyText', {
        onChange: () => {
            updateRaggedEdgeLabel();
            updateVisualizationOnInputChange();
        }
    });
    // Update label on initialization and after settings load
    updateRaggedEdgeLabel();
    // Initial visualization and words per line
    // Note: loadSettings() already triggers visualization updates after loading settings
    // Only update if no settings were loaded (first visit)
    const hasSavedSettings = localStorage.getItem('compositorSettings');
    if (!hasSavedSettings) {
        updateVisualizationOnInputChange();
        updateWordsPerLine();
    }
    // Add resize observer to update scale indicator when window/container resizes
    const visualizationContainer = window.previewEl('visualizationContainer');
    let resizeTimeout;
    if (visualizationContainer && window.ResizeObserver) {
        const resizeObserver = new ResizeObserver(() => {
            // Debounce resize updates
            if (resizeTimeout !== undefined) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = window.setTimeout(() => {
                updateVisualizationOnInputChange();
            }, 100);
        });
        resizeObserver.observe(visualizationContainer);
    }
    // Window resize also refreshes the drawing; the pop-out window forwards its own resizes here.
    window.addEventListener('resize', () => {
        if (resizeTimeout !== undefined) {
            clearTimeout(resizeTimeout);
        }
        resizeTimeout = window.setTimeout(() => {
            updateVisualizationOnInputChange();
        }, 100);
    });
    // Initialize term modal (Verso/Recto)
    const termModal = document.getElementById('termModal');
    const termModalClose = document.getElementById('termModalClose');
    const termModalTitle = document.getElementById('termModalTitle');
    const termModalContent = document.getElementById('termModalContent');
    const termContent = `
    <div class="modal-section">
      <h3 class="modal-section-title">Verso</h3>
      <p class="modal-section-text">Verso refers to the left-hand page of an open book, typically an even-numbered page. In bookbinding terminology, verso means "the back of the leaf" and is the side that appears on the left when a book is open.</p>
      <p class="modal-section-text">In facing pages layouts, the verso page has its outer margin on the left edge and its inner margin (binding edge) on the right.</p>
    </div>
    <div class="modal-section">
      <h3 class="modal-section-title">Recto</h3>
      <p class="modal-section-text">Recto refers to the right-hand page of an open book, typically an odd-numbered page. In bookbinding terminology, recto means "the front of the leaf" and is the side that appears on the right when a book is open.</p>
      <p class="modal-section-text">In facing pages layouts, the recto page has its inner margin (binding edge) on the left and its outer margin on the right edge.</p>
    </div>
  `;
    // Add click handlers to page links
    const pageLinks = document.querySelectorAll('.page-link');
    pageLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (termModal && termModalTitle && termModalContent) {
                termModalTitle.textContent = 'Verso & Recto';
                termModalContent.innerHTML = termContent;
                termModal.classList.add('show');
            }
        });
    });
    if (termModalClose) {
        termModalClose.addEventListener('click', () => {
            if (termModal)
                termModal.classList.remove('show');
        });
    }
    // Close term modal when clicking outside
    if (termModal) {
        termModal.addEventListener('click', (e) => {
            if (e.target === termModal) {
                termModal.classList.remove('show');
            }
        });
    }
}
