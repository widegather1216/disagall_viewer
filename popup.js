// Disagall Viewer - Popup Controller & Storage Sync Script

const STORAGE_KEYS = {
  PADDING: 'defaultPadding',
  AUTO_HIDE_UI: 'autoHideUi',
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.PADDING]: 24,
  [STORAGE_KEYS.AUTO_HIDE_UI]: true,
};

/**
 * Load settings from Chrome sync storage with fallback defaults.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {object} callbacks - { onPaddingLoaded, onAutoHideLoaded }
 */
function loadSettings(storage, callbacks = {}) {
  if (!storage || typeof storage.get !== 'function') return;

  storage.get(DEFAULT_SETTINGS, (result) => {
    if (!result) return;

    if (typeof callbacks.onPaddingLoaded === 'function' && typeof result[STORAGE_KEYS.PADDING] === 'number') {
      callbacks.onPaddingLoaded(result[STORAGE_KEYS.PADDING]);
    }

    if (typeof callbacks.onAutoHideLoaded === 'function' && typeof result[STORAGE_KEYS.AUTO_HIDE_UI] === 'boolean') {
      callbacks.onAutoHideLoaded(result[STORAGE_KEYS.AUTO_HIDE_UI]);
    }
  });
}

/**
 * Save Auto-Hide UI (Immersion Mode) setting to Chrome sync storage.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {boolean} enabled - Whether auto-hide UI is enabled
 * @param {function} [callback] - Optional completion callback
 */
function saveAutoHideUi(storage, enabled, callback) {
  if (!storage || typeof storage.set !== 'function') return;
  storage.set({ [STORAGE_KEYS.AUTO_HIDE_UI]: Boolean(enabled) }, callback);
}

/**
 * Save default padding setting to Chrome sync storage.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {number} padding - Padding value in pixels
 * @param {function} [callback] - Optional completion callback
 */
function savePadding(storage, padding, callback) {
  if (!storage || typeof storage.set !== 'function') return;
  storage.set({ [STORAGE_KEYS.PADDING]: Number(padding) }, callback);
}

/**
 * Initialize popup DOM bindings and storage synchronization.
 * @param {Document} [documentRef] - DOM Document reference
 * @param {object} [storageRef] - chrome.storage.sync reference
 * @returns {object|null} Initialized element references
 */
function initPopup(documentRef = (typeof document !== 'undefined' ? document : null), storageRef = (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.sync : null)) {
  if (!documentRef) return null;

  const slider = documentRef.getElementById('padding-slider');
  const valDisplay = documentRef.getElementById('padding-val');
  const autoHideToggle = documentRef.getElementById('auto-hide-ui-toggle');

  // 1. Initial load from storage
  if (storageRef) {
    loadSettings(storageRef, {
      onPaddingLoaded: (padding) => {
        if (slider) slider.value = padding;
        if (valDisplay) valDisplay.textContent = `${padding}px`;
      },
      onAutoHideLoaded: (autoHide) => {
        if (autoHideToggle) autoHideToggle.checked = autoHide;
      },
    });
  }

  // 2. Padding slider input listener
  if (slider && valDisplay) {
    slider.addEventListener('input', (e) => {
      const newVal = parseInt(e.target.value, 10);
      valDisplay.textContent = `${newVal}px`;
      if (storageRef) {
        savePadding(storageRef, newVal);
      }
    });
  }

  // 3. Auto-hide UI toggle change listener
  if (autoHideToggle) {
    autoHideToggle.addEventListener('change', (e) => {
      const enabled = Boolean(e.target.checked);
      if (storageRef) {
        saveAutoHideUi(storageRef, enabled);
      }
    });
  }

  // 4. Storage changed listener (multi-tab / external sync)
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'sync') {
        if (changes[STORAGE_KEYS.AUTO_HIDE_UI] && autoHideToggle) {
          autoHideToggle.checked = changes[STORAGE_KEYS.AUTO_HIDE_UI].newValue;
        }
        if (changes[STORAGE_KEYS.PADDING] && slider && valDisplay) {
          slider.value = changes[STORAGE_KEYS.PADDING].newValue;
          valDisplay.textContent = `${changes[STORAGE_KEYS.PADDING].newValue}px`;
        }
      }
    });
  }

  return { slider, valDisplay, autoHideToggle };
}

// Browser lifecycle hook
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const storage = (typeof chrome !== 'undefined' && chrome.storage) ? chrome.storage.sync : null;
    initPopup(document, storage);
  });
}

// CommonJS export for Node.js unit testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    STORAGE_KEYS,
    DEFAULT_SETTINGS,
    loadSettings,
    saveAutoHideUi,
    savePadding,
    initPopup,
  };
}
