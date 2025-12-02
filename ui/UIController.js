/**
 * UI Controller - Manages all UI elements and interactions
 */

import { logger } from '../core/logger.js';
import { i18n } from '../i18n/i18n.js';
import { eventBus } from '../core/EventBus.js';
import { saveConfig, loadConfig } from '../utils/storage.js';

const CONTEXT = 'UIController';

export class UIController {
  /**
   * @param {Abacus} abacus - Abacus instance
   */
  constructor(abacus) {
    this.abacus = abacus;
    this.currentLang = i18n.getCurrentLanguage();
    
    this.init();
  }

  /**
   * Initialize UI
   */
  init() {
    this.createLanguageSwitcher();
    this.setupResetButton();
    this.setupConfigButton();
    this.setupConfigMenu();
    this.updateTexts();
    
    // Listen to language changes
    window.addEventListener('languageChanged', this.onLanguageChanged.bind(this));
    
    logger.debug(CONTEXT, 'UI Controller initialized');
  }

  /**
   * Create language switcher
   */
  createLanguageSwitcher() {
    const container = document.getElementById('languageSwitcher');
    if (!container) return;

    const languages = [
      { code: 'ua', label: 'UA' },
      { code: 'en', label: 'EN' },
      { code: 'ru', label: 'RU' },
      { code: 'es', label: 'ES' }
    ];

    container.innerHTML = '';

    languages.forEach(lang => {
      const btn = document.createElement('button');
      btn.className = 'language-btn';
      btn.textContent = lang.label;
      btn.dataset.lang = lang.code;
      
      if (lang.code === this.currentLang) {
        btn.classList.add('language-btn--active');
      }

      btn.addEventListener('click', () => this.changeLanguage(lang.code));
      container.appendChild(btn);
    });

    logger.debug(CONTEXT, 'Language switcher created');
  }

  /**
   * Change language
   * @param {string} lang - Language code
   */
  changeLanguage(lang) {
    i18n.setLanguage(lang);
    this.currentLang = lang;
    
    // Update active button
    const buttons = document.querySelectorAll('.language-btn');
    buttons.forEach(btn => {
      if (btn.dataset.lang === lang) {
        btn.classList.add('language-btn--active');
      } else {
        btn.classList.remove('language-btn--active');
      }
    });
    
    this.updateTexts();
    logger.info(CONTEXT, `Language changed to: ${lang}`);
  }

  /**
   * Handle language changed event
   * @param {CustomEvent} e
   */
  onLanguageChanged(e) {
    this.currentLang = e.detail.lang;
    this.updateTexts();
  }

  /**
   * Update all UI texts
   */
  updateTexts() {
    // Update header
    const appTitle = document.getElementById('appTitle');
    if (appTitle) {
      appTitle.textContent = i18n.t('appTitle');
    }

    const appTagline = document.getElementById('appTagline');
    if (appTagline) {
      appTagline.textContent = i18n.t('appTagline');
    }

    // Update buttons
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
      resetBtn.textContent = i18n.t('reset');
    }

    const configBtn = document.getElementById('configBtn');
    if (configBtn) {
      configBtn.innerHTML = `⚙️ ${i18n.t('settings')}`;
    }

    // Update config menu
    const configTitle = document.querySelector('.config-modal__title');
    if (configTitle) {
      configTitle.textContent = i18n.t('configTitle');
    }

    const showDigitsLabel = document.querySelector('label[for="showDigits"] span');
    if (showDigitsLabel) {
      showDigitsLabel.textContent = i18n.t('showDigits');
    }

    const sizeLabel = document.querySelector('label[for="sizeSelect"]');
    if (sizeLabel) {
      sizeLabel.textContent = i18n.t('sorobanSize');
    }

    const sizeOptions = document.querySelectorAll('#sizeSelect option');
    if (sizeOptions.length === 3) {
      sizeOptions[0].textContent = i18n.t('sizeSmall');
      sizeOptions[1].textContent = i18n.t('sizeMedium');
      sizeOptions[2].textContent = i18n.t('sizeLarge');
    }

    const closeBtn = document.getElementById('closeConfig');
    if (closeBtn) {
      closeBtn.textContent = i18n.t('close');
    }

    // Update footer
    const footer = document.getElementById('appFooter');
    if (footer) {
      footer.textContent = i18n.t('footer');
    }

    logger.debug(CONTEXT, 'UI texts updated');
  }

  /**
   * Setup reset button
   */
  setupResetButton() {
    const resetBtn = document.getElementById('resetBtn');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
      this.abacus.clear();
      logger.info(CONTEXT, 'Abacus reset');
    });
  }

  /**
   * Setup config button
   */
  setupConfigButton() {
    const configBtn = document.getElementById('configBtn');
    if (!configBtn) return;

    configBtn.addEventListener('click', () => {
      this.showConfigMenu();
    });
  }

  /**
   * Setup config menu
   */
  setupConfigMenu() {
    const closeBtn = document.getElementById('closeConfig');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideConfigMenu();
      });
    }

    // Show digits checkbox
    const showDigitsCheckbox = document.getElementById('showDigits');
    if (showDigitsCheckbox) {
      // Load saved state
      const config = loadConfig() || {};
      showDigitsCheckbox.checked = config.showDigits || false;
      this.abacus.setShowDigits(showDigitsCheckbox.checked);

      showDigitsCheckbox.addEventListener('change', (e) => {
        this.abacus.setShowDigits(e.target.checked);
        saveConfig({ ...loadConfig(), showDigits: e.target.checked });
        logger.info(CONTEXT, `Show digits: ${e.target.checked}`);
      });
    }

    // Size selector
    const sizeSelect = document.getElementById('sizeSelect');
    if (sizeSelect) {
      // Load saved state
      const config = loadConfig() || {};
      const savedSize = config.digitCount || 13;
      sizeSelect.value = savedSize;

      sizeSelect.addEventListener('change', (e) => {
        const newSize = parseInt(e.target.value, 10);
        this.changeAbacusSize(newSize);
      });
    }

    // Click outside to close
    const configOverlay = document.getElementById('config-menu');
    if (configOverlay) {
      configOverlay.addEventListener('click', (e) => {
        if (e.target === configOverlay) {
          this.hideConfigMenu();
        }
      });
    }
  }

  /**
   * Show config menu
   */
  showConfigMenu() {
    const configMenu = document.getElementById('config-menu');
    if (configMenu) {
      configMenu.style.display = 'flex';
      logger.debug(CONTEXT, 'Config menu opened');
    }
  }

  /**
   * Hide config menu
   */
  hideConfigMenu() {
    const configMenu = document.getElementById('config-menu');
    if (configMenu) {
      configMenu.style.display = 'none';
      logger.debug(CONTEXT, 'Config menu closed');
    }
  }

  /**
   * Change abacus size
   * @param {number} newSize - New digit count
   */
  changeAbacusSize(newSize) {
    // Save config
    saveConfig({ ...loadConfig(), digitCount: newSize });
    
    // Reload page to reinitialize abacus with new size
    logger.info(CONTEXT, `Changing abacus size to ${newSize} - reloading...`);
    window.location.reload();
  }

  /**
   * Show toast notification
   * @param {string} message - Message to show
   * @param {string} type - Type: 'success', 'error', 'warning', 'info'
   */
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.innerHTML = `
      <div class="toast__message">${message}</div>
      <button class="toast__close">×</button>
    `;

    // Add to body
    document.body.appendChild(toast);

    // Show animation
    setTimeout(() => toast.classList.add('toast--show'), 10);

    // Close button
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => {
      this.hideToast(toast);
    });

    // Auto hide after 3 seconds
    setTimeout(() => {
      this.hideToast(toast);
    }, 3000);
  }

  /**
   * Hide toast
   * @param {HTMLElement} toast
   */
  hideToast(toast) {
    toast.classList.remove('toast--show');
    toast.classList.add('toast--hide');
    setTimeout(() => toast.remove(), 300);
  }

  /**
   * Destroy UI controller
   */
  destroy() {
    window.removeEventListener('languageChanged', this.onLanguageChanged);
    logger.debug(CONTEXT, 'UI Controller destroyed');
  }
}
