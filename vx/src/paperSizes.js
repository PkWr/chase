/**
 * Paper sizes data from papersizes.io
 * Common international paper sizes in millimeters
 */

/** @typedef {{name: string, width: number, height: number, category: string}} PaperSize */

/** @type {PaperSize[]} */
export const PAPER_SIZES = [
  // A Series
  { name: 'A0', width: 841, height: 1189, category: 'A Series' },
  { name: 'A1', width: 594, height: 841, category: 'A Series' },
  { name: 'A2', width: 420, height: 594, category: 'A Series' },
  { name: 'A3', width: 297, height: 420, category: 'A Series' },
  { name: 'A4', width: 210, height: 297, category: 'A Series' },
  { name: 'A5', width: 148, height: 210, category: 'A Series' },
  { name: 'A6', width: 105, height: 148, category: 'A Series' },
  { name: 'A7', width: 74, height: 105, category: 'A Series' },
  { name: 'A8', width: 52, height: 74, category: 'A Series' },

  // B Series
  { name: 'B0', width: 1000, height: 1414, category: 'B Series' },
  { name: 'B1', width: 707, height: 1000, category: 'B Series' },
  { name: 'B2', width: 500, height: 707, category: 'B Series' },
  { name: 'B3', width: 353, height: 500, category: 'B Series' },
  { name: 'B4', width: 250, height: 353, category: 'B Series' },
  { name: 'B5', width: 176, height: 250, category: 'B Series' },
  { name: 'B6', width: 125, height: 176, category: 'B Series' },

  // US Paper Sizes
  { name: 'US Letter', width: 216, height: 279, category: 'US Paper' },
  { name: 'US Legal', width: 216, height: 356, category: 'US Paper' },
  { name: 'US Tabloid', width: 279, height: 432, category: 'US Paper' },
  { name: 'US Ledger', width: 432, height: 279, category: 'US Paper' },
  { name: 'US Junior Legal', width: 127, height: 203, category: 'US Paper' },
  { name: 'US Half Letter', width: 140, height: 216, category: 'US Paper' },

  // ANSI Sizes
  { name: 'ANSI A', width: 216, height: 279, category: 'ANSI' },
  { name: 'ANSI B', width: 279, height: 432, category: 'ANSI' },
  { name: 'ANSI C', width: 432, height: 559, category: 'ANSI' },
  { name: 'ANSI D', width: 559, height: 864, category: 'ANSI' },
  { name: 'ANSI E', width: 864, height: 1118, category: 'ANSI' },

  // Arch Sizes
  { name: 'Arch A', width: 229, height: 305, category: 'Architectural' },
  { name: 'Arch B', width: 305, height: 457, category: 'Architectural' },
  { name: 'Arch C', width: 457, height: 610, category: 'Architectural' },
  { name: 'Arch D', width: 610, height: 914, category: 'Architectural' },
  { name: 'Arch E', width: 914, height: 1219, category: 'Architectural' },

  // Books
  { name: 'Folio', width: 304.8, height: 482.6, category: 'Books' },
  { name: 'Quarto', width: 241.3, height: 304.8, category: 'Books' },
  { name: 'Imperial Octavo', width: 209.55, height: 292.1, category: 'Books' },
  { name: 'Royal Octavo', width: 165.1, height: 254, category: 'Books' },
  { name: 'Crown Octavo', width: 136.525, height: 203.2, category: 'Books' },
];

/**
 * Get paper size by name
 * @param {string} name
 * @returns {PaperSize | undefined}
 */
export function getPaperSize(name) {
  return PAPER_SIZES.find((size) => size.name === name);
}

/**
 * Get default paper size (A4)
 * @returns {PaperSize}
 */
export function getDefaultPaperSize() {
  return getPaperSize('A4') || PAPER_SIZES[0];
}

