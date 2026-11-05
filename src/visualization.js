import { DEFAULT_SAMPLE_TEXT } from './defaultText.js';
/**
 * Gets sample text from textarea. The intro step always shows the Bringhurst essay,
 * whatever has been typed into the Text step.
 */
function getSampleText() {
    if (document.body.getAttribute('data-step') === '1')
        return DEFAULT_SAMPLE_TEXT.trim();
    const sampleTextInput = document.getElementById('sampleText');
    return sampleTextInput?.value.trim() || '';
}
/**
 * Gets layer visibility states from checkboxes
 */
function getLayerVisibility() {
    const showMargins = document.getElementById('showMargins')?.checked ?? true;
    const showColumns = document.getElementById('showColumns')?.checked ?? true;
    const showText = document.getElementById('showText')?.checked ?? true;
    const solidFills = document.getElementById('solidFills')?.checked ?? false;
    const showRaggedEdge = document.getElementById('showRaggedEdge')?.checked ?? false;
    return { margins: showMargins, columns: showColumns, text: showText, solidFills, marginsSolid: document.getElementById('showMargins')?.dataset.solid === '1', columnsSolid: document.getElementById('showColumns')?.dataset.solid === '1', raggedEdge: showRaggedEdge, baseline: document.getElementById('showBaseline')?.checked ?? false };
}
// Page dimensions and margins are always in mm, gutter is always in em
const PAGE_UNIT = 'mm';
const VISUALIZATION_SIZE = 400; // Maximum size for the visualization in pixels
const MIN_MARGIN_VISUAL = 2; // Minimum margin size in pixels for visibility
/**
 * Checks if facing pages mode is enabled
 */
function isFacingPages() {
    const checkbox = document.getElementById('facingPages');
    return checkbox?.checked || false;
}
/**
 * Draws ragged edge highlight - black rectangles showing where each line ends
 */
function drawRaggedEdge(textDiv, textGroup, spanWidth, lineHeight, padding, justifyText = false, columnStep = spanWidth) {
    // Get the computed style to measure text properly
    const computedStyle = window.getComputedStyle(textDiv);
    const lineHeightValue = parseFloat(computedStyle.lineHeight);
    const paddingValue = padding;
    // Get bounding rects for coordinate conversion
    const textDivRect = textDiv.getBoundingClientRect();
    const textGroupRect = textGroup.getBoundingClientRect();
    // Use Range API with getClientRects to get actual rendered line positions
    const textNode = textDiv.firstChild;
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE)
        return;
    const range = document.createRange();
    range.selectNodeContents(textDiv);
    // getClientRects returns one rect per rendered line
    const lineRects = range.getClientRects();
    if (lineRects.length === 0)
        return;
    // Get SVG and textGroup positions for coordinate conversion
    const svg = textGroup.ownerSVGElement;
    if (!svg)
        return;
    const textGroupX = parseFloat(textGroup.getAttribute('x') || '0');
    const textGroupY = parseFloat(textGroup.getAttribute('y') || '0');
    // Calculate scale factor: SVG coordinates vs viewport coordinates
    // The foreignObject width/height in SVG vs actual rendered size
    const foreignObjectWidth = parseFloat(textGroup.getAttribute('width') || '0');
    const foreignObjectHeight = parseFloat(textGroup.getAttribute('height') || '0');
    const scaleX = foreignObjectWidth / textGroupRect.width;
    const scaleY = foreignObjectHeight / textGroupRect.height;
    // Use a unique identifier for this text group's ragged edge
    const textGroupId = textGroup.getAttribute('data-text-group-id') || `text-group-${Date.now()}-${Math.random()}`;
    textGroup.setAttribute('data-text-group-id', textGroupId);
    // Clear any existing ragged edge groups for THIS specific text group
    const existingGroups = svg.querySelectorAll(`.ragged-edge-group[data-text-group-id="${textGroupId}"]`);
    existingGroups.forEach(group => group.remove());
    // Create a group for ragged edge
    const raggedGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    raggedGroup.setAttribute('class', 'ragged-edge-group');
    raggedGroup.setAttribute('data-text-group-id', textGroupId);
    // Draw ragged edge - rectangles showing where each line ends
    // Skip if text is justified (no ragged edge in justified text)
    if (justifyText) {
        // Justified text - no ragged edge to show
        return;
    }
    const lineEnds = [];
    // Process each line rect
    for (let i = 0; i < lineRects.length; i++) {
        const lineRect = lineRects[i];
        // Convert viewport coordinates to coordinates relative to textDiv
        const lineLeftRelative = lineRect.left - textDivRect.left;
        const lineRightRelative = lineRect.right - textDivRect.left;
        const lineTopRelative = lineRect.top - textDivRect.top;
        // Convert to SVG coordinates
        // Account for padding in the textDiv
        const lineEndX = textGroupX + paddingValue + (lineRightRelative * scaleX);
        const lineY = textGroupY + paddingValue + (lineTopRelative * scaleY);
        const lineWidth = (lineRightRelative - lineLeftRelative) * scaleX;
        // Which column of flowing text this line is in, and so where that column's right edge is
        const lineStartX = (lineLeftRelative * scaleX);
        const colIndex = Math.max(0, Math.floor((lineStartX + 0.5) / columnStep));
        lineEnds.push({
            colIndex,
            x: lineEndX,
            y: lineY,
            width: lineWidth
        });
    }
    // Draw rectangles for each line - from end of text to right edge
    lineEnds.forEach((lineInfo) => {
        // Right edge of this line's column in SVG coordinates
        const textBoxRightEdge = textGroupX + (lineInfo.colIndex * columnStep) + spanWidth - paddingValue;
        const x = lineInfo.x; // End of text line in SVG coordinates
        const y = lineInfo.y; // Y position of line in SVG coordinates
        const width = textBoxRightEdge - x; // Width from end of text to right edge
        const height = lineHeightValue * 0.8 * scaleY; // Scaled line height
        if (width > 0 && x < textBoxRightEdge) {
            const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rect.setAttribute('x', x.toString());
            rect.setAttribute('y', y.toString());
            rect.setAttribute('width', width.toString());
            rect.setAttribute('height', height.toString());
            rect.setAttribute('fill', '#000000');
            rect.setAttribute('opacity', '0.3');
            raggedGroup.appendChild(rect);
        }
    });
    // Append ragged group AFTER text group to ensure it appears on top
    // Find the text group's position and insert after it, or append to end
    const textGroupIndex = Array.from(svg.children).indexOf(textGroup);
    if (textGroupIndex >= 0 && textGroupIndex < svg.children.length - 1) {
        svg.insertBefore(raggedGroup, svg.children[textGroupIndex + 1]);
    }
    else {
        svg.appendChild(raggedGroup);
    }
}
/**
 * Draws a single page with margins, columns, and text
 */
function drawPage(svg, inputs, pageX, pageY, pageWidth, pageHeight, leftMargin, rightMargin, topMargin, bottomMargin, scaleX, scaleY, layerVisibility) {
    // Draw page background
    const pageRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    pageRect.setAttribute('x', pageX.toString());
    pageRect.setAttribute('y', pageY.toString());
    pageRect.setAttribute('width', pageWidth.toString());
    pageRect.setAttribute('height', pageHeight.toString());
    pageRect.setAttribute('fill', '#ffffff');
    pageRect.setAttribute('stroke', '#333333');
    pageRect.setAttribute('stroke-width', '0.5');
    svg.appendChild(pageRect);
    // Calculate scaled margins
    const scaledTopMargin = Math.max(topMargin * scaleY, MIN_MARGIN_VISUAL);
    const scaledBottomMargin = Math.max(bottomMargin * scaleY, MIN_MARGIN_VISUAL);
    const scaledLeftMargin = Math.max(leftMargin * scaleX, MIN_MARGIN_VISUAL);
    const scaledRightMargin = Math.max(rightMargin * scaleX, MIN_MARGIN_VISUAL);
    // Draw margins
    if (layerVisibility.margins) {
        if (layerVisibility.marginsSolid) {
            // Solid yellow block (top, bottom, left, right)
            // Top margin
            const topMarginRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            topMarginRect.setAttribute('x', pageX.toString());
            topMarginRect.setAttribute('y', pageY.toString());
            topMarginRect.setAttribute('width', pageWidth.toString());
            topMarginRect.setAttribute('height', scaledTopMargin.toString());
            topMarginRect.setAttribute('fill', '#ffe100'); // Solid yellow
            topMarginRect.setAttribute('stroke', 'none');
            svg.appendChild(topMarginRect);
            // Bottom margin
            const bottomMarginRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            bottomMarginRect.setAttribute('x', pageX.toString());
            bottomMarginRect.setAttribute('y', (pageY + pageHeight - scaledBottomMargin).toString());
            bottomMarginRect.setAttribute('width', pageWidth.toString());
            bottomMarginRect.setAttribute('height', scaledBottomMargin.toString());
            bottomMarginRect.setAttribute('fill', '#ffe100'); // Solid yellow
            bottomMarginRect.setAttribute('stroke', 'none');
            svg.appendChild(bottomMarginRect);
            // Left margin
            const leftMarginRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            leftMarginRect.setAttribute('x', pageX.toString());
            leftMarginRect.setAttribute('y', (pageY + scaledTopMargin).toString());
            leftMarginRect.setAttribute('width', scaledLeftMargin.toString());
            leftMarginRect.setAttribute('height', (pageHeight - scaledTopMargin - scaledBottomMargin).toString());
            leftMarginRect.setAttribute('fill', '#ffe100'); // Solid yellow
            leftMarginRect.setAttribute('stroke', 'none');
            svg.appendChild(leftMarginRect);
            // Right margin
            const rightMarginRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            rightMarginRect.setAttribute('x', (pageX + pageWidth - scaledRightMargin).toString());
            rightMarginRect.setAttribute('y', (pageY + scaledTopMargin).toString());
            rightMarginRect.setAttribute('width', scaledRightMargin.toString());
            rightMarginRect.setAttribute('height', (pageHeight - scaledTopMargin - scaledBottomMargin).toString());
            rightMarginRect.setAttribute('fill', '#ffe100'); // Solid yellow
            rightMarginRect.setAttribute('stroke', 'none');
            svg.appendChild(rightMarginRect);
        }
        else {
            // Margin keyline in yellow
            const marginRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            marginRect.setAttribute('x', (pageX + scaledLeftMargin).toString());
            marginRect.setAttribute('y', (pageY + scaledTopMargin).toString());
            marginRect.setAttribute('width', (pageWidth - scaledLeftMargin - scaledRightMargin).toString());
            marginRect.setAttribute('height', (pageHeight - scaledTopMargin - scaledBottomMargin).toString());
            marginRect.setAttribute('fill', 'none');
            marginRect.setAttribute('stroke', '#ffe100');
            marginRect.setAttribute('stroke-width', '1.5');
            svg.appendChild(marginRect);
        }
    }
    // Draw columns
    if (layerVisibility.columns && inputs.numCols > 0) {
        const textBoxX = pageX + scaledLeftMargin;
        const textBoxY = pageY + scaledTopMargin;
        const textBoxWidth = pageWidth - scaledLeftMargin - scaledRightMargin;
        const textBoxHeight = pageHeight - scaledTopMargin - scaledBottomMargin;
        const scaledGutterWidth = inputs.gutterWidth * scaleX;
        const totalGutters = (inputs.numCols - 1) * scaledGutterWidth;
        const availableWidth = textBoxWidth - totalGutters;
        const columnWidth = availableWidth / inputs.numCols;
        for (let i = 0; i < inputs.numCols; i++) {
            const colX = textBoxX + (i * (columnWidth + scaledGutterWidth));
            const colRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            colRect.setAttribute('x', colX.toString());
            colRect.setAttribute('y', textBoxY.toString());
            colRect.setAttribute('width', columnWidth.toString());
            colRect.setAttribute('height', textBoxHeight.toString());
            if (layerVisibility.columnsSolid) {
                colRect.setAttribute('fill', 'rgba(255, 225, 0, 0.14)'); // Yellow tint
                colRect.setAttribute('stroke', 'none');
            }
            else {
                colRect.setAttribute('fill', 'none');
                colRect.setAttribute('stroke', '#ffe100');
                colRect.setAttribute('stroke-width', '1');
            }
            svg.appendChild(colRect);
        }
    }
    // Baseline grid: yellow lines across the page at the leading, from the first baseline
    if (layerVisibility.baseline) {
        const leadPt = inputs.leading !== undefined ? inputs.leading : inputs.typeSize + 2;
        const lh = leadPt * 0.3528 * scaleY;
        const fs = inputs.typeSize * 0.3528 * scaleY;
        // Real font metrics, so the first grid line sits on the first text baseline
        let asc = 0.891 * fs, desc = 0.216 * fs;
        try {
            const fam = inputs.fontFamily || 'serif';
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.font = `${fs}px ${fam === 'serif' || fam === 'sans-serif' || fam === 'monospace' ? fam : `'${fam}', serif`}`;
            const m = ctx.measureText('Hxg');
            if (m.fontBoundingBoxAscent) { asc = m.fontBoundingBoxAscent; desc = m.fontBoundingBoxDescent; }
        } catch (e) { /* keep estimates */ }
        const first = pageY + scaledTopMargin + (lh - (asc + desc)) / 2 + asc;
        const limit = pageY + pageHeight - scaledBottomMargin + 0.5;
        if (lh > 0.5) {
            for (let y = first; y <= limit; y += lh) {
                const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                ln.setAttribute('x1', pageX.toString());
                ln.setAttribute('x2', (pageX + pageWidth).toString());
                ln.setAttribute('y1', y.toString());
                ln.setAttribute('y2', y.toString());
                ln.setAttribute('stroke', '#ffe100');
                ln.setAttribute('stroke-width', '0.75');
                svg.appendChild(ln);
            }
        }
    }
    // Draw text
    if (layerVisibility.text) {
        const sampleText = getSampleText();
        if (sampleText && sampleText.trim().length > 0) {
            const textBoxX = pageX + scaledLeftMargin;
            const textBoxY = pageY + scaledTopMargin;
            const fullTextBoxWidth = pageWidth - scaledLeftMargin - scaledRightMargin;
            const textBoxHeight = pageHeight - scaledTopMargin - scaledBottomMargin;
            const scaledGutterWidth = inputs.gutterWidth * scaleX;
            const totalGutters = (inputs.numCols - 1) * scaledGutterWidth;
            const availableWidth = fullTextBoxWidth - totalGutters;
            const columnWidth = availableWidth / inputs.numCols;
            // Determine column span
            const columnSpanStart = inputs.columnSpanStart !== undefined ? inputs.columnSpanStart : 1;
            const columnSpanEnd = inputs.columnSpanEnd !== undefined ? inputs.columnSpanEnd : inputs.numCols;
            const spanCols = columnSpanEnd - columnSpanStart + 1;
            const spanGutters = Math.max(0, spanCols - 1);
            const spanWidth = (columnWidth * spanCols) + (scaledGutterWidth * spanGutters);
            // Determine which column text starts in
            const textColumns = inputs.textColumns && inputs.textColumns.length > 0
                ? inputs.textColumns
                : [columnSpanStart];
            const textStartColumn = Math.min(...textColumns);
            const textStartIndex = Math.max(0, textStartColumn - 1);
            // Calculate how many times the span can repeat across available columns
            const availableColsFromStart = inputs.numCols - textStartIndex;
            const numberOfSpans = Math.floor(availableColsFromStart / spanCols);
            // Calculate font size and line height
            const typeSizeMM = inputs.typeSize * 0.3528;
            const fontSizeSVG = typeSizeMM * scaleY;
            // Use leading if provided, otherwise default to type size + 2
            const leadingPt = inputs.leading !== undefined ? inputs.leading : inputs.typeSize + 2;
            const leadingMM = leadingPt * 0.3528;
            const lineHeight = leadingMM * scaleY;
            const padding = 0; // Remove padding so text matches margins exactly
            // Store reference to the parent SVG for RAF callbacks (needed for facing pages)
            const parentSvg = svg;
            // One text box across all the spans, set in CSS columns so the text flows from one span to the next
            // (each span is spanCols columns wide; the gap between spans is one gutter)
            if (numberOfSpans > 0) {
                const spanIndex = 0;
                const boxWidth = (numberOfSpans * spanWidth) + ((numberOfSpans - 1) * scaledGutterWidth);
                const columnStep = spanWidth + scaledGutterWidth;
                const spanStartIndex = textStartIndex + (spanIndex * spanCols);
                const spanStartX = textBoxX + (spanStartIndex * (columnWidth + scaledGutterWidth));
                // Create text group for this span
                const textGroup = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
                textGroup.setAttribute('x', spanStartX.toString());
                textGroup.setAttribute('y', textBoxY.toString());
                textGroup.setAttribute('width', boxWidth.toString());
                textGroup.setAttribute('height', textBoxHeight.toString());
                // Determine visualization mode
                const showRivers = layerVisibility.raggedEdge && inputs.justifyText;
                const showRaggedEdge = layerVisibility.raggedEdge && !inputs.justifyText;
                // Set background color based on visualization mode
                let textBgColor = '#ffffff'; // Default white background
                if (showRivers || showRaggedEdge) {
                    textBgColor = '#000000'; // Black background for both rivers and ragged edge
                }
                // Create text div first
                const textDiv = document.createElementNS('http://www.w3.org/1999/xhtml', 'div');
                textDiv.style.fontSize = `${fontSizeSVG}px`;
                textDiv.style.lineHeight = `${lineHeight}px`;
                // Use selected font family or default to serif
                const fontFamily = inputs.fontFamily || 'serif';
                textDiv.style.fontFamily = fontFamily === 'serif' ? 'serif' : fontFamily === 'sans-serif' ? 'sans-serif' : fontFamily === 'monospace' ? 'monospace' : `'${fontFamily}', serif`;
                textDiv.style.width = '100%';
                textDiv.style.height = '100%';
                // Flow: fill each span to the bottom of the text box, then continue in the next
                textDiv.style.columnCount = String(numberOfSpans);
                textDiv.style.columnGap = `${scaledGutterWidth}px`;
                textDiv.style.columnFill = 'auto';
                textDiv.style.padding = `${padding}px`;
                textDiv.style.boxSizing = 'border-box';
                textDiv.style.overflow = 'hidden';
                textDiv.style.wordWrap = 'break-word';
                textDiv.style.whiteSpace = 'pre-wrap'; // Preserve line breaks and wrap text
                textDiv.style.hyphens = inputs.hyphenation !== false ? 'auto' : 'none';
                textDiv.style.textAlign = inputs.justifyText ? 'justify' : 'left';
                // Set background color on textDiv directly (not SVG rectangle)
                // This ensures it shows through properly
                if (showRivers || showRaggedEdge) {
                    textDiv.style.backgroundColor = '#000000';
                }
                else {
                    textDiv.style.backgroundColor = 'transparent';
                }
                // Set text color for spaces (unwrapped text nodes)
                if (showRivers) {
                    textDiv.style.color = '#ffffff'; // White spaces for rivers
                }
                else if (showRaggedEdge) {
                    textDiv.style.color = '#000000'; // Black spaces for ragged edge
                }
                // Add background rectangle behind textDiv (for cases where textDiv doesn't cover full area)
                const textBgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
                textBgRect.setAttribute('x', '0');
                textBgRect.setAttribute('y', '0');
                textBgRect.setAttribute('width', spanWidth.toString());
                textBgRect.setAttribute('height', textBoxHeight.toString());
                textBgRect.setAttribute('fill', textBgColor);
                textGroup.appendChild(textBgRect);
                // Paragraphs: every run of line breaks is one paragraph break, with the space after set in Type
                // (blank lines in the text are not drawn as empty lines)
                const spacePt = parseFloat(document.getElementById('paraSpace')?.value ?? '');
                const leadingPt = inputs.leading || (inputs.typeSize + 2);
                const spaceAfter = (isNaN(spacePt) || spacePt < 0 ? leadingPt : spacePt) * (lineHeight / leadingPt);
                const paragraphs = sampleText.split(/\n+/).map(s => s.replace(/[ \t]+$/, '')).filter(s => s.trim().length > 0);
                const wrapWords = showRivers || showRaggedEdge;
                if (!wrapWords) {
                    textDiv.style.color = '#000000';
                }
                paragraphs.forEach((para, i) => {
                    const p = document.createElementNS('http://www.w3.org/1999/xhtml', 'p');
                    p.style.margin = i < paragraphs.length - 1 ? `0 0 ${spaceAfter}px` : '0';
                    p.style.padding = '0';
                    p.style.whiteSpace = 'pre-wrap';
                    if (wrapWords) {
                        // Ragged edge and rivers: each word on a white background over black, so the gaps show
                        para.split(/(\s+)/).forEach(word => {
                            if (word.trim().length > 0) {
                                const span = document.createElementNS('http://www.w3.org/1999/xhtml', 'span');
                                span.style.backgroundColor = '#ffffff';
                                span.style.color = '#000000';
                                span.textContent = word;
                                p.appendChild(span);
                            }
                            else {
                                p.appendChild(document.createTextNode(word));
                            }
                        });
                    }
                    else {
                        p.textContent = para;
                    }
                    textDiv.appendChild(p);
                });
                textGroup.appendChild(textDiv);
                parentSvg.appendChild(textGroup);
                // Draw ragged edge highlight if enabled
                if (layerVisibility.raggedEdge && sampleText && sampleText.trim().length > 0) {
                    // Use requestAnimationFrame to ensure text is fully rendered before measuring
                    // Store RAF IDs so they can be cancelled if visualization updates
                    const rafIds = [];
                    const rafId1 = requestAnimationFrame(() => {
                        const rafId2 = requestAnimationFrame(() => {
                            // Double RAF ensures layout is complete
                            // Verify the SVG is still the current one in the container
                            const container = window.previewEl('visualizationContainer');
                            const currentSvg = textGroup.ownerSVGElement;
                            // Check if SVG exists and is in container, and matches the parent SVG
                            if (container && currentSvg && currentSvg === parentSvg && container.contains(currentSvg) && currentSvg.contains(textGroup) && textGroup.contains(textDiv)) {
                                drawRaggedEdge(textDiv, textGroup, spanWidth, lineHeight, padding, inputs.justifyText || false, columnStep);
                            }
                        });
                        rafIds.push(rafId2);
                    });
                    rafIds.push(rafId1);
                    // Store RAF IDs on the textGroup for potential cleanup
                    textGroup.__rafIds = rafIds;
                }
            }
        }
    }
}
/**
 * Updates the page layout visualization
 * @param inputs - Layout input parameters
 */
export function updateVisualization(inputs) {
    const container = window.previewEl('visualizationContainer');
    if (!container)
        return;
    // Validate inputs
    if (!inputs.numCols || inputs.numCols <= 0 || isNaN(inputs.numCols)) {
        return;
    }
    if (isNaN(inputs.gutterWidth) || inputs.gutterWidth < 0) {
        return;
    }
    const facingPages = isFacingPages();
    const layerVisibility = getLayerVisibility();
    // Calculate scale to fit visualization
    const aspectRatio = inputs.pageHeight / inputs.pageWidth;
    let singlePageWidth;
    let singlePageHeight;
    if (aspectRatio > 1) {
        // Portrait orientation
        singlePageHeight = VISUALIZATION_SIZE;
        singlePageWidth = VISUALIZATION_SIZE / aspectRatio;
    }
    else {
        // Landscape orientation
        singlePageWidth = VISUALIZATION_SIZE;
        singlePageHeight = VISUALIZATION_SIZE * aspectRatio;
    }
    // For facing pages, show two pages side by side (flush, no gap)
    const visWidth = facingPages ? singlePageWidth * 2 : singlePageWidth;
    const headingHeight = facingPages ? 20 : 0; // Space for headings above pages
    const visHeight = singlePageHeight + headingHeight;
    // SVG dimensions
    const svgWidth = visWidth;
    const svgHeight = visHeight;
    // Calculate scaled dimensions
    const scaleX = singlePageWidth / inputs.pageWidth;
    const scaleY = singlePageHeight / inputs.pageHeight;
    // Create SVG with viewBox
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${svgWidth} ${svgHeight}`);
    svg.classList.add('page-visualization');
    // Sizing will be set in requestAnimationFrame after container dimensions are known
    if (facingPages) {
        // Draw two pages side by side (flush, no gap)
        // Use facing pages specific margins if available
        const innerMarginLeft = inputs.innerMarginLeft !== undefined ? inputs.innerMarginLeft : inputs.leftMargin;
        const innerMarginRight = inputs.innerMarginRight !== undefined ? inputs.innerMarginRight : inputs.leftMargin;
        const outerMarginLeft = inputs.outerMarginLeft !== undefined ? inputs.outerMarginLeft : inputs.rightMargin;
        const outerMarginRight = inputs.outerMarginRight !== undefined ? inputs.outerMarginRight : inputs.rightMargin;
        const leftPageX = 0;
        const rightPageX = singlePageWidth;
        const pageY = headingHeight; // Offset pages down to make room for headings
        const headingY = headingHeight - 5; // Position headings just above pages
        // Use same font size as body text (0.85rem, approximately 13.6px at default 16px base)
        const headingFontSize = 13.6;
        // Add Verso heading above left page
        const versoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        versoText.setAttribute('x', (singlePageWidth / 2).toString());
        versoText.setAttribute('y', headingY.toString());
        versoText.setAttribute('text-anchor', 'middle');
        versoText.setAttribute('font-size', headingFontSize.toString());
        versoText.setAttribute('font-family', 'IBM Plex Mono, monospace');
        versoText.setAttribute('fill', '#ffffff');
        versoText.setAttribute('font-weight', '400');
        versoText.textContent = 'Verso';
        svg.appendChild(versoText);
        // Add Recto heading above right page
        const rectoText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        rectoText.setAttribute('x', (singlePageWidth + singlePageWidth / 2).toString());
        rectoText.setAttribute('y', headingY.toString());
        rectoText.setAttribute('text-anchor', 'middle');
        rectoText.setAttribute('font-size', headingFontSize.toString());
        rectoText.setAttribute('font-family', 'IBM Plex Mono, monospace');
        rectoText.setAttribute('fill', '#ffffff');
        rectoText.setAttribute('font-weight', '400');
        rectoText.textContent = 'Recto';
        svg.appendChild(rectoText);
        // Verso (left page): outer margin on left, inner margin on right
        drawPage(svg, inputs, leftPageX, pageY, singlePageWidth, singlePageHeight, outerMarginLeft, // Left margin (outer)
        innerMarginLeft, // Right margin (inner)
        inputs.topMargin, inputs.bottomMargin, scaleX, scaleY, layerVisibility);
        // Recto (right page): inner margin on left, outer margin on right
        drawPage(svg, inputs, rightPageX, pageY, singlePageWidth, singlePageHeight, innerMarginRight, // Left margin (inner)
        outerMarginRight, // Right margin (outer)
        inputs.topMargin, inputs.bottomMargin, scaleX, scaleY, layerVisibility);
    }
    else {
        // Single page
        drawPage(svg, inputs, 0, 0, singlePageWidth, singlePageHeight, inputs.leftMargin, inputs.rightMargin, inputs.topMargin, inputs.bottomMargin, scaleX, scaleY, layerVisibility);
    }
    // Clear container (this removes all ragged edge groups from previous render)
    // Cancel any pending requestAnimationFrame callbacks before clearing
    const oldSvg = container.querySelector('svg');
    if (oldSvg) {
        const foreignObjects = oldSvg.querySelectorAll('foreignObject');
        foreignObjects.forEach((fo) => {
            const rafIds = fo.__rafIds;
            if (rafIds && Array.isArray(rafIds)) {
                rafIds.forEach((id) => cancelAnimationFrame(id));
            }
        });
    }
    container.innerHTML = '';
    // Add new SVG
    container.appendChild(svg);
    // Note: Decorations are now stored in app-wrapper, not visualizationContainer
    // Calculate proper sizing based on container dimensions and SVG aspect ratio
    const hostWindow = (container.ownerDocument && container.ownerDocument.defaultView) || window;
    hostWindow.requestAnimationFrame(() => {
        const containerRect = container.getBoundingClientRect();
        const containerStyle = getComputedStyle(container);
        const containerWidth = containerRect.width -
            (parseFloat(containerStyle.paddingLeft) || 0) -
            (parseFloat(containerStyle.paddingRight) || 0);
        const containerHeight = containerRect.height -
            (parseFloat(containerStyle.paddingTop) || 0) -
            (parseFloat(containerStyle.paddingBottom) || 0);
        const svgAspectRatio = svgWidth / svgHeight;
        const isLandscape = svgAspectRatio > 1;
        if (isLandscape) {
            // Width is longer - fit by width using percentage sizing
            // (facing pages and landscape pages: full width, height follows, the preview scrolls if needed)
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            svg.setAttribute('width', '100%');
            svg.removeAttribute('height');
            svg.style.height = 'auto';
        }
        else {
            // Height is longer - fit by height using explicit pixel dimensions
            const scale = containerHeight / svgHeight;
            const scaledWidth = svgWidth * scale;
            if (scaledWidth <= containerWidth) {
                // Height fits, width fits within container
                svg.setAttribute('width', `${scaledWidth}px`);
                svg.setAttribute('height', `${containerHeight}px`);
            }
            else {
                // Width would exceed container - fall back to fitting by width
                const widthScale = containerWidth / svgWidth;
                svg.setAttribute('width', `${containerWidth}px`);
                svg.setAttribute('height', `${svgHeight * widthScale}px`);
            }
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
        }
        updateScaleIndicator(container, svg, inputs, facingPages);
        buildPageStack(container, svg);
    });
}
/**
 * On the intro step, show the essay running over as many pages as it needs: the page is repeated
 * below, each copy scrolled along to the next group of columns, and the stage scrolls.
 */
function buildPageStack(container, svg) {
    container.classList.remove('stack');
    const body = container.ownerDocument.body;
    if (body.getAttribute('data-step') !== '1' || !svg.getAttribute('height'))
        return;
    const flow = svg.querySelector('foreignObject > div');
    if (!flow)
        return;
    const padding = parseFloat(flow.style.paddingLeft) || 0;
    const gap = parseFloat(flow.style.columnGap) || 0;
    const step = flow.clientWidth - 2 * padding + gap;
    const extra = flow.scrollWidth - flow.clientWidth;
    if (step <= 0 || extra <= 1)
        return;
    const pages = Math.min(8, 1 + Math.ceil((extra - 1) / step));
    for (let k = 1; k < pages; k++) {
        const copy = svg.cloneNode(true);
        copy.classList.add('stack-page');
        container.appendChild(copy);
        const copyFlow = copy.querySelector('foreignObject > div');
        if (copyFlow)
            copyFlow.scrollLeft = k * step;
    }
    if (pages > 1)
        container.classList.add('stack');
}
/**
 * Updates the scale indicator based on actual rendered SVG size
 */
function updateScaleIndicator(container, svg, inputs, facingPages) {
    const scaleIndicator = window.previewEl('scaleIndicator');
    if (!scaleIndicator || !container)
        return;
    // Get actual rendered SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    const actualWidth = svgRect.width;
    const actualHeight = svgRect.height;
    // Calculate rendered page dimensions based on SVG aspect ratio
    const totalPageWidth = facingPages ? inputs.pageWidth * 2 : inputs.pageWidth;
    const pageAspectRatio = inputs.pageHeight / totalPageWidth;
    const svgAspectRatio = actualWidth / actualHeight;
    // Determine which dimension is constraining
    let renderedPageWidth;
    let renderedPageHeight;
    if (svgAspectRatio > pageAspectRatio) {
        // Height is constraining
        renderedPageHeight = actualHeight;
        renderedPageWidth = actualHeight / pageAspectRatio;
    }
    else {
        // Width is constraining
        renderedPageWidth = actualWidth;
        renderedPageHeight = actualWidth * pageAspectRatio;
    }
    // Calculate scale based on actual rendered size
    const singlePageWidth = facingPages ? renderedPageWidth / 2 : renderedPageWidth;
    const actualScaleX = singlePageWidth / inputs.pageWidth;
    // Update scale indicator
    if (actualScaleX < 1) {
        // Preview is smaller than reality
        const ratio = Math.round((1 / actualScaleX) * 100) / 100;
        scaleIndicator.textContent = `Scale: 1:${ratio.toFixed(2)}`;
    }
    else if (actualScaleX > 1) {
        // Preview is larger than reality
        const ratio = Math.round(actualScaleX * 100) / 100;
        scaleIndicator.textContent = `Scale: ${ratio.toFixed(2)}:1`;
    }
    else {
        scaleIndicator.textContent = 'Scale: 1:1';
    }
}
