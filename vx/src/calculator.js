/**
 * Typography Layout Calculator Module
 * Handles calculations for typographic layouts based on Bringhurst principles
 */

/** @typedef {import('./types.js').LayoutInputs} LayoutInputs */
/** @typedef {import('./types.js').LayoutResults} LayoutResults */

const PT_TO_MM = 0.3528; // 1 point = 0.3528 mm
const BRINGHURST_COLUMN_MULTIPLIER = 33; // Optimal column width multiplier

/**
 * Optimal gutter width: 1em at the given type size
 * @param {number} typeSize Type size in points
 * @returns {number} Gutter width in millimetres
 */
export function calculateGutterWidth(typeSize) {
  return typeSize * PT_TO_MM;
}

/**
 * Width of the columns a span covers (or the full text box with no span)
 * @param {LayoutInputs} inputs
 * @returns {number} millimetres
 */
export function calculateColumnSpanWidth(inputs) {
  const fullTextBoxWidth = inputs.pageWidth - inputs.leftMargin - inputs.rightMargin;
  const totalGutterWidth = (inputs.numCols - 1) * inputs.gutterWidth;
  const columnWidth = (fullTextBoxWidth - totalGutterWidth) / inputs.numCols;

  if (inputs.columnSpanStart && inputs.columnSpanEnd) {
    const spanCols = inputs.columnSpanEnd - inputs.columnSpanStart + 1;
    return columnWidth * spanCols + inputs.gutterWidth * (spanCols - 1);
  }
  return fullTextBoxWidth;
}

/**
 * Calculates layout dimensions from input parameters
 * @param {LayoutInputs} inputs
 * @returns {LayoutResults}
 */
export function calculateLayout(inputs) {
  const fullTextBoxWidth = inputs.pageWidth - inputs.leftMargin - inputs.rightMargin;
  const totalGutterWidth = (inputs.numCols - 1) * inputs.gutterWidth;
  const columnWidth = (fullTextBoxWidth - totalGutterWidth) / inputs.numCols;

  return {
    textBoxWidth: calculateColumnSpanWidth(inputs),
    columnWidth,
    gutterWidth: inputs.gutterWidth,
    optimalColumnWidth: BRINGHURST_COLUMN_MULTIPLIER * inputs.typeSize * PT_TO_MM,
  };
}
