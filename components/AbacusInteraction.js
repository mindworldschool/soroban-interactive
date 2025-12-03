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
    } else {
      // Earth beads - handle collision and group movement
      this.updateEarthBeadWithCollision(col, index, desiredY);
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
    const minGap = 1; // Minimum gap between beads

    const currentY = beads[draggedIndex].y;
    const movingUp = desiredY < currentY;

    // Get base constraints (bar and frame limits)
    const barBottom = 101;
    const bottomFrame = 264;
    const minY = barBottom + beadHeight / 2 + this.abacus.config.gapFromBar + 1;
    const maxY = bottomFrame - beadHeight / 2 - this.abacus.config.gapFromBar;

    if (movingUp) {
      // Moving up - can push beads above
      let newY = Math.max(minY, desiredY);

      // Check collision with bead above
      if (draggedIndex > 0) {
        const beadAbove = beads[draggedIndex - 1];
        const maxAllowedY = beadAbove.y - beadHeight - minGap;

        if (newY < maxAllowedY) {
          // No collision, move freely
          beads[draggedIndex].y = newY;
          if (this.abacus.renderer) {
            this.abacus.renderer.updateBeadPosition(col, 'earth', draggedIndex, newY);
          }
        } else {
          // Collision - push beads above
          const pushAmount = beadAbove.y - beadHeight - minGap - newY;
          this.pushBeadsUp(col, draggedIndex, newY);
        }
      } else {
        // Top bead, just constrain
        beads[draggedIndex].y = newY;
        if (this.abacus.renderer) {
          this.abacus.renderer.updateBeadPosition(col, 'earth', draggedIndex, newY);
        }
      }
    } else {
      // Moving down - can push beads below
      let newY = Math.min(maxY, desiredY);

      // Check collision with bead below
      if (draggedIndex < 3) {
        const beadBelow = beads[draggedIndex + 1];
        const minAllowedY = beadBelow.y + beadHeight + minGap;

        if (newY > minAllowedY) {
          // No collision, move freely
          beads[draggedIndex].y = newY;
          if (this.abacus.renderer) {
            this.abacus.renderer.updateBeadPosition(col, 'earth', draggedIndex, newY);
          }
        } else {
          // Collision - push beads below
          this.pushBeadsDown(col, draggedIndex, newY);
        }
      } else {
        // Bottom bead, just constrain
        beads[draggedIndex].y = newY;
        if (this.abacus.renderer) {
          this.abacus.renderer.updateBeadPosition(col, 'earth', draggedIndex, newY);
        }
      }
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
    const minGap = 1;

    const barBottom = 101;
    const minY = barBottom + beadHeight / 2 + this.abacus.config.gapFromBar + 1;

    // Calculate positions from dragged bead upward
    const positions = [];
    positions[startIndex] = Math.max(minY, newY);

    // Calculate positions for beads above
    for (let i = startIndex - 1; i >= 0; i--) {
      const requiredY = positions[i + 1] - beadHeight - minGap;
      positions[i] = Math.max(minY, requiredY);
    }

    // Check if top bead hits the limit
    if (positions[0] <= minY) {
      // Top bead hit limit, recalculate from top down
      positions[0] = minY;
      for (let i = 1; i <= startIndex; i++) {
        positions[i] = positions[i - 1] + beadHeight + minGap;
      }
    }

    // Update all affected beads
    for (let i = 0; i <= startIndex; i++) {
      beads[i].y = positions[i];
      if (this.abacus.renderer) {
        this.abacus.renderer.updateBeadPosition(col, 'earth', i, positions[i]);
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
    const minGap = 1;

    const bottomFrame = 264;
    const maxY = bottomFrame - beadHeight / 2 - this.abacus.config.gapFromBar;

    // Calculate positions from dragged bead downward
    const positions = [];
    positions[startIndex] = Math.min(maxY, newY);

    // Calculate positions for beads below
    for (let i = startIndex + 1; i < 4; i++) {
      const requiredY = positions[i - 1] + beadHeight + minGap;
      positions[i] = Math.min(maxY, requiredY);
    }

    // Check if bottom bead hits the limit
    if (positions[3] >= maxY) {
      // Bottom bead hit limit, recalculate from bottom up
      positions[3] = maxY;
      for (let i = 2; i >= startIndex; i--) {
        positions[i] = positions[i + 1] - beadHeight - minGap;
      }
    }

    // Update all affected beads
    for (let i = startIndex; i < 4; i++) {
      beads[i].y = positions[i];
      if (this.abacus.renderer) {
        this.abacus.renderer.updateBeadPosition(col, 'earth', i, positions[i]);
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

    // Use larger hit area for better UX (add 10px padding)
    const hitRadius = beadWidth + 10;

    for (let col = 0; col < this.abacus.digitCount; col++) {
      const rodX = 50 + col * 72;

      // Check heaven bead
      const heavenY = this.abacus.beads[col].heaven.y;
      if (isPointInCircle(x, y, rodX, heavenY, hitRadius)) {
        return { col, type: 'heaven', index: 0 };
      }

      // Check earth beads (iterate backwards so top beads are checked first)
      for (let i = 3; i >= 0; i--) {
        const earthY = this.abacus.beads[col].earth[i].y;
        if (isPointInCircle(x, y, rodX, earthY, hitRadius)) {
          return { col, type: 'earth', index: i };
        }
      }
    }

    return null;
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
