/**
 * Geometry utility functions for collision detection and positioning
 */

/**
 * Calculate distance between two points
 * @param {number} x1 
 * @param {number} y1 
 * @param {number} x2 
 * @param {number} y2 
 * @returns {number}
 */
export function getDistance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if point is inside circle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} cx - Circle center X
 * @param {number} cy - Circle center Y
 * @param {number} radius - Circle radius
 * @returns {boolean}
 */
export function isPointInCircle(px, py, cx, cy, radius) {
  const distance = getDistance(px, py, cx, cy);
  return distance <= radius;
}

/**
 * Check if point is inside rectangle
 * @param {number} px - Point X
 * @param {number} py - Point Y
 * @param {number} rx - Rectangle X
 * @param {number} ry - Rectangle Y
 * @param {number} width - Rectangle width
 * @param {number} height - Rectangle height
 * @returns {boolean}
 */
export function isPointInRect(px, py, rx, ry, width, height) {
  return px >= rx && px <= rx + width && py >= ry && py <= ry + height;
}

/**
 * Clamp value between min and max
 * @param {number} value 
 * @param {number} min 
 * @param {number} max 
 * @returns {number}
 */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation between two values
 * @param {number} start 
 * @param {number} end 
 * @param {number} t - Progress (0-1)
 * @returns {number}
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * Convert SVG screen coordinates to SVG element coordinates
 * @param {SVGElement} svg - SVG element
 * @param {number} clientX - Screen X
 * @param {number} clientY - Screen Y
 * @returns {Object} - {x, y}
 */
export function screenToSVG(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
  return { x: svgP.x, y: svgP.y };
}

/**
 * Check if bead is near the bar (for snapping)
 * @param {number} beadY - Bead Y position
 * @param {number} barY - Bar Y position
 * @param {number} snapDistance - Snap distance threshold
 * @returns {boolean}
 */
export function isNearBar(beadY, barY, snapDistance) {
  return Math.abs(beadY - barY) <= snapDistance;
}

/**
 * Get bead bounds (for collision detection)
 * @param {number} x - Bead center X
 * @param {number} y - Bead center Y
 * @param {number} width - Bead width
 * @param {number} height - Bead height
 * @returns {Object} - {left, right, top, bottom}
 */
export function getBeadBounds(x, y, width, height) {
  return {
    left: x - width,
    right: x + width,
    top: y - height / 2,
    bottom: y + height / 2,
    centerX: x,
    centerY: y
  };
}
