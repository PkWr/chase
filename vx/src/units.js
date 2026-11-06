/**
 * Units Module for Typography Layout Calculator
 * Handles unit conversions and descriptions
 */

/** @typedef {'mm' | 'pt' | 'em' | 'pc'} Unit */

/**
 * @typedef {Object} UnitInfo
 * @property {string} name
 * @property {string} abbreviation
 * @property {string} description
 * @property {number} conversionToMM 1 unit = X mm
 */

const PT_TO_MM = 0.3528;

/** @type {Record<Unit, UnitInfo>} */
export const UNITS = {
  mm: {
    name: 'Millimeters',
    abbreviation: 'mm',
    description: 'Metric unit, standard for print design (1mm = 0.03937 inches)',
    conversionToMM: 1,
  },
  pt: {
    name: 'Points',
    abbreviation: 'pt',
    description: 'Typography unit, 1/72 inch (1pt = 0.3528mm, standard for font sizes)',
    conversionToMM: PT_TO_MM,
  },
  em: {
    name: 'Ems',
    abbreviation: 'em',
    description: 'Relative to font size, 1em = current font size (typographic spacing)',
    conversionToMM: PT_TO_MM, // Default only; em conversion is dynamic on type size
  },
  pc: {
    name: 'Picas',
    abbreviation: 'pc',
    description: 'Typography unit, 12 points (1pc = 12pt = 4.2336mm)',
    conversionToMM: 4.2336,
  },
};

/**
 * Converts millimeters to the specified unit
 * @param {number} valueMM
 * @param {Unit} unit
 * @param {number} [typeSize=12] Type size in points (used for em)
 * @returns {number}
 */
export function convertFromMM(valueMM, unit, typeSize = 12) {
  if (unit === 'em') {
    return valueMM / (typeSize * PT_TO_MM);
  }
  return valueMM / UNITS[unit].conversionToMM;
}

/**
 * Converts a value from the specified unit to millimeters
 * @param {number} value
 * @param {Unit} unit
 * @param {number} [typeSize=12] Type size in points (used for em)
 * @returns {number}
 */
export function convertToMM(value, unit, typeSize = 12) {
  if (unit === 'em') {
    return value * (typeSize * PT_TO_MM);
  }
  return value * UNITS[unit].conversionToMM;
}

/**
 * Formats a value with its unit abbreviation
 * @param {number} value
 * @param {Unit} unit
 * @param {number} [decimals=2]
 * @returns {string}
 */
export function formatValue(value, unit, decimals = 2) {
  return `${value.toFixed(decimals)} ${UNITS[unit].abbreviation}`;
}
