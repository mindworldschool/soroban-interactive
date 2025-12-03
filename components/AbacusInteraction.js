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
    
    // Hover effect (desktop only)
    if (!this.isTouchDevice) {
      this.svg.addEventListener('mousemove', this.onHover.bind(this));
    }
    
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

    // Visual feedback
    if (this.abacus.renderer) {
      this.abacus.renderer.setBeadDragging(bead.col, bead.type, bead.index, true);
    }

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
    const newY = this.beadStartY + deltaY;

    // Get constraints
    const constraints = this.abacus.physics.getYConstraints(
      this.draggedBead.col,
      this.draggedBead.type,
      this.draggedBead.index
    );

    // Clamp Y within constraints
    const clampedY = Math.max(constraints.min, Math.min(constraints.max, newY));

    // Update bead position
    const beadData = this.draggedBead.type === 'heaven'
      ? this.abacus.beads[this.draggedBead.col].heaven
      : this.abacus.beads[this.draggedBead.col].earth[this.draggedBead.index];

    beadData.y = clampedY;

    // Update visual
    if (this.abacus.renderer) {
      this.abacus.renderer.updateBeadPosition(
        this.draggedBead.col,
        this.draggedBead.type,
        this.draggedBead.index,
        clampedY
      );
    }

    // Trigger onBeadMove event
    this.abacus.triggerEvent('onBeadMove', {
      col: this.draggedBead.col,
      type: this.draggedBead.type,
      index: this.draggedBead.index,
      y: clampedY
    });
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
    
    // Reset dragging state
    if (this.abacus.renderer) {
      this.abacus.renderer.setBeadDragging(
        this.draggedBead.col,
        this.draggedBead.type,
        this.draggedBead.index,
        false
      );
    }
    
    logger.debug(CONTEXT, 'Drag ended');
    
    this.isDragging = false;
    this.draggedBead = null;
  }

  /**
   * Hover handler (desktop only)
   * @param {MouseEvent} e
   */
  onHover(e) {
    if (this.isDragging) return;
    
    const { x, y } = screenToSVG(this.svg, e.clientX, e.clientY);
    const bead = this.getBeadAtPosition(x, y);
    
    // Update cursor and highlight
    if (bead && this.abacus.renderer) {
      this.abacus.renderer.highlightBead(bead.col, bead.type, bead.index, true);
    }
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
    
    for (let col = 0; col < this.abacus.digitCount; col++) {
      const rodX = 50 + col * 72;
      
      // Check heaven bead
      const heavenY = this.abacus.beads[col].heaven.y;
      if (isPointInCircle(x, y, rodX, heavenY, beadWidth)) {
        return { col, type: 'heaven', index: 0 };
      }
      
      // Check earth beads
      for (let i = 0; i < 4; i++) {
        const earthY = this.abacus.beads[col].earth[i].y;
        if (isPointInCircle(x, y, rodX, earthY, beadWidth)) {
          return { col, type: 'earth', index: i };
        }
      }
    }
    
    return null;
  }

  /**
   * Destroy interaction and clean up events
   */
  destroy() {
    this.svg.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
    
    this.svg.removeEventListener('touchstart', this.onTouchStart);
    document.removeEventListener('touchmove', this.onTouchMove);
    document.removeEventListener('touchend', this.onTouchEnd);
    
    this.svg.removeEventListener('mousemove', this.onHover);
    
    logger.debug(CONTEXT, 'Interaction destroyed');
  }
}
