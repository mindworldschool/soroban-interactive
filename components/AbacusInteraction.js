/**
 * Abacus Interaction - Handles drag & drop and touch events
 */

import { logger } from '../core/logger.js';
import { screenToSVG, getBeadBounds, isPointInCircle } from '../utils/geometry.js';
import { isTouchDevice } from '../utils/helpers.js';

const CONTEXT = 'AbacusInteraction';

export class AbacusInteraction {
  /**
   * @param {Abacus} abacus - Abacus instance
   * @param {SVGElement} svgElement - SVG element
   */
  constructor(abacus, svgElement) {
    this.abacus = abacus;
    this.svg = svgElement;
    
    this.isDragging = false;
    this.draggedBead = null; // { col, type, index }
    this.dragStartY = 0;
    this.beadStartY = 0;
    
    this.isTouchDevice = isTouchDevice();
    
    this.initEvents();
    logger.debug(CONTEXT, `Interaction initialized (touch: ${this.isTouchDevice})`);
  }

  /**
   * Initialize event listeners
   */
  initEvents() {
    // Mouse events
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    // Touch events
    this.svg.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    document.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    document.addEventListener('touchend', this.onTouchEnd.bind(this));

    logger.debug(CONTEXT, 'Events initialized');
  }

  /**
   * Mouse down handler
   * @param {MouseEvent} e
   */
  onMouseDown(e) {
    e.preventDefault();
    const { x, y } = screenToSVG(this.svg, e.clientX, e.clientY);
    const bead = this.getBeadAtPosition(x, y);

    if (bead) {
      this.startDrag(bead, e.clientX, e.clientY);
    }
  }

  /**
   * Touch start handler
   * @param {TouchEvent} e
   */
  onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const { x, y } = screenToSVG(this.svg, touch.clientX, touch.clientY);
    const bead = this.getBeadAtPosition(x, y);

    if (bead) {
      this.startDrag(bead, touch.clientX, touch.clientY);
    }
  }

  /**
   * Start dragging a bead
   * @param {Object} bead - { col, type, index }
   * @param {number} clientX - Starting X position (screen)
   * @param {number} clientY - Starting Y position (screen)
   */
  startDrag(bead, clientX, clientY) {
    this.isDragging = true;
    this.draggedBead = bead;

    // Convert to SVG coordinates
    const svgCoords = screenToSVG(this.svg, clientX, clientY);
    this.dragStartY = svgCoords.y;

    const beadData = bead.type === 'heaven'
      ? this.abacus.beads[bead.col].heaven
      : this.abacus.beads[bead.col].earth[bead.index];

    this.beadStartY = beadData.y;
    beadData.isDragging = true;

    logger.debug(CONTEXT, `Started dragging: col=${bead.col}, type=${bead.type}, index=${bead.index}`);
  }

  /**
   * Mouse move handler
   * @param {MouseEvent} e
   */
  onMouseMove(e) {
    if (!this.isDragging) return;

    this.updateDrag(e.clientX, e.clientY);
  }

  /**
   * Touch move handler
   * @param {TouchEvent} e
   */
  onTouchMove(e) {
    if (!this.isDragging) return;
    e.preventDefault();

    const touch = e.touches[0];
    this.updateDrag(touch.clientX, touch.clientY);
  }

  /**
   * Update bead position during drag
   * @param {number} clientX - Current X position (screen)
   * @param {number} clientY - Current Y position (screen)
   */
  updateDrag(clientX, clientY) {
    // Convert to SVG coordinates
    const svgCoords = screenToSVG(this.svg, clientX, clientY);
    const deltaY = svgCoords.y - this.dragStartY;
    const desiredY = this.beadStartY + deltaY;

    const col = this.draggedBead.col;
    const type = this.draggedBead.type;
    const index = this.draggedBead.index;

    if (type === 'heaven') {
      // Heaven bead - simple, no collision with others
      const constraints = this.abacus.physics.getYConstraints(col, type, index);
      const clampedY = Math.max(constraints.min, Math.min(constraints.max, desiredY));

      this.abacus.beads[col].heaven.y = clampedY;
      if (this.abacus.renderer) {
        this.abacus.renderer.updateBeadPosition(col, type, index, clampedY);
      }

      // Update position based on current Y for real-time digit update
      // Heaven bead is active (down) if in bottom 1/3 of range (close to bar)
      const minY = 40 + this.abacus.config.beadHeight / 2 + this.abacus.config.gapFromBar;
      const maxY = 91 - this.abacus.config.beadHeight / 2 - this.abacus.config.gapFromBar - 1;
      const range = maxY - minY;
      const activeThreshold = maxY - range / 3;
      this.abacus.beads[col].heaven.position = clampedY > activeThreshold ? 'down' : 'up';
    } else {
      // Earth beads - handle collision and group movement
      this.updateEarthBeadWithCollision(col, index, desiredY);

      // Update positions for all earth beads based on current Y
      // Earth bead is active (up) if in top 1/3 of range (close to bar)
      const minY = 101 + this.abacus.config.beadHeight / 2 + this.abacus.config.gapFromBar + 1;
      const maxY = 264 - this.abacus.config.beadHeight / 2 - this.abacus.config.gapFromBar;
      const range = maxY - minY;
      const activeThreshold = minY + range / 3;
      this.abacus.beads[col].earth.forEach(bead => {
        bead.position = bead.y < activeThreshold ? 'up' : 'down';
      });
    }

    // Update digit display in real-time
    if (this.abacus.config.showDigits && this.abacus.renderer) {
      this.abacus.renderer.updateDigits();
    }

    // Trigger onBeadMove event
    this.abacus.triggerEvent('onBeadMove', {
      col: this.draggedBead.col,
      type: this.draggedBead.type,
      index: this.draggedBead.index,
      y: desiredY
    });
  }

  /**
   * Update earth bead position with collision detection
   * @param {number} col - Column index
   * @param {number} draggedIndex - Index of dragged bead
   * @param {number} desiredY - Desired Y position
   */
  updateEarthBeadWithCollision(col, draggedIndex, desiredY) {
    const beads = this.abacus.beads[col].earth;
    const beadHeight = this.abacus.config.beadHeight;
    const minGap = 0; // No gap - beads touch each other

    // Get base constraints (bar and frame limits)
    const barBottom = 101;
    const bottomFrame = 264;
    const minY = barBottom + beadHeight / 2 + this.abacus.config.gapFromBar + 1;
    const maxY = bottomFrame - beadHeight / 2 - this.abacus.config.gapFromBar;

    // Constrain to frame limits first
    let newY = Math.max(minY, Math.min(maxY, desiredY));

    // Check collision with bead above
    if (draggedIndex > 0) {
      const beadAbove = beads[draggedIndex - 1];
      const minDistanceFromAbove = beadAbove.y + beadHeight + minGap;

      if (newY < minDistanceFromAbove) {
        // Would collide with bead above - push group up
        this.pushBeadsUp(col, draggedIndex, newY);
        return;
      }
    }

    // Check collision with bead below
    if (draggedIndex < 3) {
      const beadBelow = beads[draggedIndex + 1];
      const maxDistanceFromBelow = beadBelow.y - beadHeight - minGap;

      if (newY > maxDistanceFromBelow) {
        // Would collide with bead below - push group down
        this.pushBeadsDown(col, draggedIndex, newY);
        return;
      }
    }

    // No collision - move freely
    beads[draggedIndex].y = newY;
    if (this.abacus.renderer) {
      this.abacus.renderer.updateBeadPosition(col, 'earth', draggedIndex, newY);
    }
  }

  /**
   * Push beads up when dragging up
   * @param {number} col - Column index
   * @param {number} startIndex - Index of dragged bead
   * @param {number} newY - New Y position for dragged bead
   */
  pushBeadsUp(col, startIndex, newY) {
    const beads = this.abacus.beads[col].earth;
    const beadHeight = this.abacus.config.beadHeight;
    const minGap = 0;

    const barBottom = 101;
    const minY = barBottom + beadHeight / 2 + this.abacus.config.gapFromBar + 1;

    // Start with dragged bead position
    const positions = {};
    positions[startIndex] = Math.max(minY, newY);

    // Find which beads need to move by checking from NEW position of dragged bead
    const beadsToMove = [startIndex];

    // Check beads above - calculate expected position based on dragged bead's NEW position
    for (let i = startIndex - 1; i >= 0; i--) {
      const beadBelowNewY = i === startIndex - 1 ? positions[startIndex] : positions[i + 1];
      const expectedTouchY = beadBelowNewY - beadHeight - minGap;

      // Only include if bead is currently touching or would collide
      if (beads[i].y >= expectedTouchY - 1) {
        beadsToMove.unshift(i);
        positions[i] = expectedTouchY;
      } else {
        break; // Stop if gap found
      }
    }

    // Check if top bead would go beyond limit
    const topIndex = beadsToMove[0];
    if (positions[topIndex] < minY) {
      // Limit hit - recalculate from top down
      positions[topIndex] = minY;
      for (let i = topIndex + 1; i <= startIndex; i++) {
        positions[i] = positions[i - 1] + beadHeight + minGap;
      }
    }

    // Update positions
    for (const index of beadsToMove) {
      beads[index].y = positions[index];
      if (this.abacus.renderer) {
        this.abacus.renderer.updateBeadPosition(col, 'earth', index, positions[index]);
      }
    }
  }

  /**
   * Push beads down when dragging down
   * @param {number} col - Column index
   * @param {number} startIndex - Index of dragged bead
   * @param {number} newY - New Y position for dragged bead
   */
  pushBeadsDown(col, startIndex, newY) {
    const beads = this.abacus.beads[col].earth;
    const beadHeight = this.abacus.config.beadHeight;
    const minGap = 0;

    const bottomFrame = 264;
    const maxY = bottomFrame - beadHeight / 2 - this.abacus.config.gapFromBar;

    // Start with dragged bead position
    const positions = {};
    positions[startIndex] = Math.min(maxY, newY);

    // Find which beads need to move by checking from NEW position of dragged bead
    const beadsToMove = [startIndex];

    // Check beads below - calculate expected position based on dragged bead's NEW position
    for (let i = startIndex + 1; i < 4; i++) {
      const beadAboveNewY = i === startIndex + 1 ? positions[startIndex] : positions[i - 1];
      const expectedTouchY = beadAboveNewY + beadHeight + minGap;

      // Only include if bead is currently touching or would collide
      if (beads[i].y <= expectedTouchY + 1) {
        beadsToMove.push(i);
        positions[i] = expectedTouchY;
      } else {
        break; // Stop if gap found
      }
    }

    // Check if bottom bead would go beyond limit
    const bottomIndex = beadsToMove[beadsToMove.length - 1];
    if (positions[bottomIndex] > maxY) {
      // Limit hit - recalculate from bottom up
      positions[bottomIndex] = maxY;
      for (let i = bottomIndex - 1; i >= startIndex; i--) {
        positions[i] = positions[i + 1] - beadHeight - minGap;
      }
    }

    // Update positions
    for (const index of beadsToMove) {
      beads[index].y = positions[index];
      if (this.abacus.renderer) {
        this.abacus.renderer.updateBeadPosition(col, 'earth', index, positions[index]);
      }
    }
  }

  /**
   * Mouse up handler
   * @param {MouseEvent} e
   */
  onMouseUp(e) {
    if (!this.isDragging) return;
    
    this.endDrag();
  }

  /**
   * Touch end handler
   * @param {TouchEvent} e
   */
  onTouchEnd(e) {
    if (!this.isDragging) return;
    
    this.endDrag();
  }

  /**
   * End dragging and snap bead to position
   */
  endDrag() {
    if (!this.draggedBead) return;

    // Snap to grid
    if (this.abacus.physics) {
      this.abacus.physics.snapBead(
        this.draggedBead.col,
        this.draggedBead.type,
        this.draggedBead.index
      );
    }

    logger.debug(CONTEXT, 'Drag ended');

    this.isDragging = false;
    this.draggedBead = null;
  }


  /**
   * Find bead at given position
   * @param {number} x - SVG X coordinate
   * @param {number} y - SVG Y coordinate
   * @returns {Object|null} - { col, type, index } or null
   */
  getBeadAtPosition(x, y) {
    const beadWidth = this.abacus.config.beadWidth;
    const beadHeight = this.abacus.config.beadHeight;

    // Use exact bead boundaries for precise grabbing (reduced from beadWidth + 10)
    const hitRadiusX = beadWidth - 2; // Slightly smaller than actual width
    const hitRadiusY = beadHeight / 2 - 2; // Slightly smaller than actual height

    for (let col = 0; col < this.abacus.digitCount; col++) {
      const rodX = 50 + col * 72;

      // Check heaven bead
      const heavenY = this.abacus.beads[col].heaven.y;
      if (this.isPointInBead(x, y, rodX, heavenY, hitRadiusX, hitRadiusY)) {
        return { col, type: 'heaven', index: 0 };
      }

      // Check earth beads (iterate backwards so top beads are checked first)
      for (let i = 3; i >= 0; i--) {
        const earthY = this.abacus.beads[col].earth[i].y;
        if (this.isPointInBead(x, y, rodX, earthY, hitRadiusX, hitRadiusY)) {
          return { col, type: 'earth', index: i };
        }
      }
    }

    return null;
  }

  /**
   * Check if point is within bead boundaries (ellipse shape)
   * @param {number} px - Point X
   * @param {number} py - Point Y
   * @param {number} beadX - Bead center X
   * @param {number} beadY - Bead center Y
   * @param {number} radiusX - Horizontal radius
   * @param {number} radiusY - Vertical radius
   * @returns {boolean}
   */
  isPointInBead(px, py, beadX, beadY, radiusX, radiusY) {
    // Ellipse equation: (x-cx)²/rx² + (y-cy)²/ry² <= 1
    const dx = px - beadX;
    const dy = py - beadY;
    return (dx * dx) / (radiusX * radiusX) + (dy * dy) / (radiusY * radiusY) <= 1;
  }

  /**
   * Update SVG reference after re-render
   * @param {SVGElement} newSvg - New SVG element
   */
  updateSvgReference(newSvg) {
    if (!newSvg) {
      logger.error(CONTEXT, 'Cannot update SVG reference: newSvg is null');
      return;
    }

    // Remove old event listeners
    if (this.svg) {
      this.svg.removeEventListener('mousedown', this.onMouseDown);
      this.svg.removeEventListener('touchstart', this.onTouchStart);
    }

    // Update reference
    this.svg = newSvg;

    // Re-attach event listeners to new SVG
    this.svg.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.svg.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });

    logger.debug(CONTEXT, 'SVG reference updated');
  }

  /**
   * Destroy interaction and clean up events
   */
  destroy() {
    if (this.svg) {
      this.svg.removeEventListener('mousedown', this.onMouseDown);
      this.svg.removeEventListener('touchstart', this.onTouchStart);
    }

    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);

    logger.debug(CONTEXT, 'Interaction destroyed');
  }
}
