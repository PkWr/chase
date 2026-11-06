/**
 * Type definitions (JSDoc) for Typography Layout Calculator
 */

/**
 * @typedef {Object} LayoutInputs
 * @property {number} pageWidth
 * @property {number} pageHeight
 * @property {number} leftMargin
 * @property {number} rightMargin
 * @property {number} topMargin
 * @property {number} bottomMargin
 * @property {number} typeSize
 * @property {number} [leading] Line height in points
 * @property {string} [fontFamily]
 * @property {number} numCols
 * @property {number} gutterWidth
 * @property {boolean} [hyphenation]
 * @property {boolean} [justifyText]
 * @property {number} [columnSpanStart] First column in span (1-indexed)
 * @property {number} [columnSpanEnd] Last column in span (1-indexed)
 * @property {number[]} [textColumns] Column indices where text appears (1-indexed)
 * @property {number} [innerMarginLeft] Facing pages: verso binding edge
 * @property {number} [innerMarginRight] Facing pages: recto binding edge
 * @property {number} [outerMarginLeft] Facing pages: verso outer
 * @property {number} [outerMarginRight] Facing pages: recto outer
 */

/**
 * @typedef {Object} LayoutResults
 * @property {number} textBoxWidth
 * @property {number} columnWidth
 * @property {number} gutterWidth
 * @property {number} optimalColumnWidth
 */

export {};
