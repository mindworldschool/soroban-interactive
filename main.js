/**
 * Main entry point for Soroban Interactive
 * © 2025 MindWorld School
 */

import { Abacus } from './components/Abacus.js';
import { AbacusRenderer } from './components/AbacusRenderer.js';
import { AbacusInteraction } from './components/AbacusInteraction.js';
import { AbacusPhysics } from './components/AbacusPhysics.js';
import { UIController } from './ui/UIController.js';
import { logger } from './core/logger.js';
import { loadConfig } from './utils/storage.js';

const CONTEXT = 'Main';

/**
 * Initialize application
 */
function init() {
  logger.info(CONTEXT, '🧮 Soroban Interactive - Starting...');

  // Load saved configuration
  const config = loadConfig() || {};
  const digitCount = config.digitCount || 13;
  const showDigits = config.showDigits || false;

  logger.info(CONTEXT, `Configuration: ${digitCount} rods, digits: ${showDigits}`);

  // Create abacus
  const container = document.getElementById('abacus-container');
  if (!container) {
    logger.error(CONTEXT, 'Container #abacus-container not found!');
    return;
  }

  const abacus = new Abacus(container, digitCount);
  
  // Set initial configuration
  abacus.setShowDigits(showDigits);

  // Attach modules
  const renderer = new AbacusRenderer(abacus);
  const physics = new AbacusPhysics(abacus);
  
  abacus.renderer = renderer;
  abacus.physics = physics;

  // First render
  abacus.render();

  // Attach interaction after render
  const svg = container.querySelector('#abacus-svg');
  if (svg) {
    const interaction = new AbacusInteraction(abacus, svg);
    abacus.interaction = interaction;
    logger.info(CONTEXT, '✅ Interaction enabled');
  } else {
    logger.error(CONTEXT, 'SVG element not found!');
  }

  // Create UI controller
  const ui = new UIController(abacus);
  abacus.ui = ui;

  // Event listeners
  abacus.on('onChange', (data) => {
    logger.debug(CONTEXT, 'Value changed:', data.value);
  });

  abacus.on('onBeadMove', (data) => {
    // You can add visual feedback here if needed
  });

  abacus.on('onBeadSnap', (data) => {
    logger.debug(CONTEXT, `Bead snapped: col=${data.col}, type=${data.type}, position=${data.position}`);
  });

  // Export to window for debugging
  window.abacus = abacus;
  window.logger = logger;

  logger.info(CONTEXT, '✨ Soroban Interactive - Ready!');
  logger.info(CONTEXT, `Current value: ${abacus.getValue()}`);
  logger.info(CONTEXT, 'You can interact with the abacus by dragging beads');
  logger.info(CONTEXT, 'Debug: Access abacus via window.abacus');
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Handle errors
window.addEventListener('error', (e) => {
  logger.error(CONTEXT, 'Unhandled error:', e.error);
});

window.addEventListener('unhandledrejection', (e) => {
  logger.error(CONTEXT, 'Unhandled promise rejection:', e.reason);
});
