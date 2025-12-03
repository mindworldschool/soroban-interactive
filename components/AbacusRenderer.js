/**
 * Abacus Renderer - Handles SVG rendering
 */

import { logger } from '../core/logger.js';

const CONTEXT = 'AbacusRenderer';

export class AbacusRenderer {
  /**
   * @param {Abacus} abacus - Abacus instance
   */
  constructor(abacus) {
    this.abacus = abacus;
    logger.debug(CONTEXT, 'Renderer initialized');
  }

  /**
   * Update single bead position without full re-render
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {number} y - New Y position
   */
  updateBeadPosition(col, type, index, y) {
    const svg = this.abacus.svgElement;
    if (!svg) return;

    const selector = `[data-col="${col}"][data-type="${type}"][data-index="${index}"]`;
    const beadGroup = svg.querySelector(selector);
    
    if (beadGroup) {
      const x = 50 + col * 72;
      const path = beadGroup.querySelector('path');
      const line = beadGroup.querySelector('line');
      
      if (path && line) {
        path.setAttribute('d', this.getBeadPath(x, y, this.abacus.config.beadWidth, this.abacus.config.beadHeight));
        line.setAttribute('y1', y);
        line.setAttribute('y2', y);
      }
    }
  }

  /**
   * Get SVG path for bead shape
   * @param {number} x - Center X
   * @param {number} y - Center Y
   * @param {number} width - Bead width
   * @param {number} height - Bead height
   * @returns {string}
   */
  getBeadPath(x, y, width, height) {
    const hw = width;
    const hh = height / 2;
    const cutSize = 12;
    const sideRoundness = 2;

    return `
      M ${x - cutSize} ${y - hh}
      L ${x + cutSize} ${y - hh}
      Q ${x + cutSize + 2} ${y - hh + 2} ${x + hw - sideRoundness} ${y - sideRoundness}
      Q ${x + hw} ${y} ${x + hw - sideRoundness} ${y + sideRoundness}
      Q ${x + cutSize + 2} ${y + hh - 2} ${x + cutSize} ${y + hh}
      L ${x - cutSize} ${y + hh}
      Q ${x - cutSize - 2} ${y + hh - 2} ${x - hw + sideRoundness} ${y + sideRoundness}
      Q ${x - hw} ${y} ${x - hw + sideRoundness} ${y - sideRoundness}
      Q ${x - cutSize - 2} ${y - hh + 2} ${x - cutSize} ${y - hh}
      Z
    `;
  }

  /**
   * Highlight bead on hover
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {boolean} highlight - Highlight state
   */
  highlightBead(col, type, index, highlight) {
    const svg = this.abacus.svgElement;
    if (!svg) return;

    const selector = `[data-col="${col}"][data-type="${type}"][data-index="${index}"]`;
    const beadGroup = svg.querySelector(selector);
    
    if (beadGroup) {
      const path = beadGroup.querySelector('path');
      if (path) {
        if (highlight) {
          path.style.filter = 'brightness(1.2)';
          path.style.cursor = 'grab';
        } else {
          path.style.filter = '';
          path.style.cursor = '';
        }
      }
    }
  }

  /**
   * Set bead as dragging
   * @param {number} col - Column index
   * @param {string} type - 'heaven' or 'earth'
   * @param {number} index - Bead index
   * @param {boolean} isDragging - Dragging state
   */
  setBeadDragging(col, type, index, isDragging) {
    const svg = this.abacus.svgElement;
    if (!svg) return;

    const selector = `[data-col="${col}"][data-type="${type}"][data-index="${index}"]`;
    const beadGroup = svg.querySelector(selector);
    
    if (beadGroup) {
      const path = beadGroup.querySelector('path');
      if (path) {
        if (isDragging) {
          path.style.cursor = 'grabbing';
          path.style.filter = 'brightness(1.3)';
        } else {
          path.style.cursor = '';
          path.style.filter = '';
        }
      }
    }
  }

  /**
   * Update digits display
   */
  updateDigits() {
    if (!this.abacus.config.showDigits) return;

    const svg = this.abacus.svgElement;
    if (!svg) return;

    // Remove old digits
    const oldDigits = svg.querySelector('.digits');
    if (oldDigits) {
      oldDigits.remove();
    }

    // Create new digits group using proper SVG namespace
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const digitsGroup = document.createElementNS(SVG_NS, 'g');
    digitsGroup.setAttribute('class', 'digits');

    for (let col = 0; col < this.abacus.digitCount; col++) {
      const x = 50 + col * 72;
      const value = this.abacus.getColumnValue(col);

      // Create text element with proper SVG namespace
      const textElement = document.createElementNS(SVG_NS, 'text');
      textElement.setAttribute('x', x);
      textElement.setAttribute('y', '5');
      textElement.setAttribute('text-anchor', 'middle');
      textElement.setAttribute('font-family', 'Montserrat, sans-serif');
      textElement.setAttribute('font-size', '20');
      textElement.setAttribute('font-weight', '700');
      textElement.setAttribute('fill', '#4a4a4a');
      textElement.textContent = value;

      digitsGroup.appendChild(textElement);
    }

    // Insert new digits group
    svg.appendChild(digitsGroup);
  }

  /**
   * Full re-render of abacus
   */
  render() {
    this.abacus.render();
    logger.debug(CONTEXT, 'Full re-render complete');
  }
}
