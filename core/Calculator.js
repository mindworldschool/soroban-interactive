/**
 * Calculator for abacus values
 */

import { logger } from './logger.js';

const CONTEXT = 'Calculator';

export class Calculator {
  /**
   * Calculate total value from bead model
   * @param {Object} beads - Beads data object
   * @param {number} digitCount - Number of digits
   * @returns {number}
   */
  static calculateValue(beads, digitCount) {
    let total = 0;

    for (let col = 0; col < digitCount; col++) {
      const multiplier = Math.pow(10, digitCount - col - 1);
      const columnValue = this.calculateColumnValue(beads[col]);
      total += columnValue * multiplier;
    }

    logger.debug(CONTEXT, `Total value: ${total}`);
    return total;
  }

  /**
   * Calculate value for a single column
   * @param {Object} columnBeads - Beads data for one column
   * @returns {number}
   */
  static calculateColumnValue(columnBeads) {
    let value = 0;

    // Heaven bead = 5
    if (columnBeads.heaven.position === 'down') {
      value += 5;
    }

    // Earth beads = 1 each
    columnBeads.earth.forEach(bead => {
      if (bead.position === 'up') {
        value += 1;
      }
    });

    return value;
  }

  /**
   * Decompose number into digits array
   * @param {number} value - Number to decompose
   * @param {number} digitCount - Number of digits
   * @returns {Array<number>}
   */
  static decomposeNumber(value, digitCount) {
    const str = String(value).padStart(digitCount, '0');
    const digits = str.split('').map(d => parseInt(d, 10));
    
    logger.debug(CONTEXT, `Decomposed ${value} into:`, digits);
    return digits;
  }

  /**
   * Decompose single digit into heaven + earth
   * @param {number} digit - Digit (0-9)
   * @returns {Object} - {heaven: 0|1, earth: 0-4}
   */
  static decomposeDigit(digit) {
    if (digit < 0 || digit > 9) {
      logger.warn(CONTEXT, `Invalid digit: ${digit}`);
      return { heaven: 0, earth: 0 };
    }

    if (digit >= 5) {
      return {
        heaven: 1,
        earth: digit - 5
      };
    } else {
      return {
        heaven: 0,
        earth: digit
      };
    }
  }

  /**
   * Validate number can be displayed on abacus
   * @param {number} value - Number to validate
   * @param {number} digitCount - Number of digits
   * @returns {boolean}
   */
  static isValidNumber(value, digitCount) {
    const maxValue = Math.pow(10, digitCount) - 1;
    const isValid = value >= 0 && value <= maxValue;
    
    if (!isValid) {
      logger.warn(CONTEXT, `Invalid number ${value} for ${digitCount} digits (max: ${maxValue})`);
    }
    
    return isValid;
  }

  /**
   * Get maximum value for given digit count
   * @param {number} digitCount - Number of digits
   * @returns {number}
   */
  static getMaxValue(digitCount) {
    return Math.pow(10, digitCount) - 1;
  }

  /**
   * Format number with leading zeros
   * @param {number} value - Number to format
   * @param {number} digitCount - Number of digits
   * @returns {string}
   */
  static formatNumber(value, digitCount) {
    return String(value).padStart(digitCount, '0');
  }

  /**
   * Generate random number for abacus
   * @param {number} digitCount - Number of digits
   * @param {number} minDigit - Minimum digit value (default: 0)
   * @param {number} maxDigit - Maximum digit value (default: 9)
   * @returns {number}
   */
  static generateRandomNumber(digitCount, minDigit = 0, maxDigit = 9) {
    let result = '';
    
    for (let i = 0; i < digitCount; i++) {
      const digit = Math.floor(Math.random() * (maxDigit - minDigit + 1)) + minDigit;
      result += digit;
    }
    
    const value = parseInt(result, 10);
    logger.debug(CONTEXT, `Generated random number: ${value}`);
    return value;
  }
}
