// Disagall Viewer - Popup Controller & Storage Sync Script

const STORAGE_KEYS = {
  PADDING: 'defaultPadding',
  AUTO_HIDE_UI: 'autoHideUi',
  AUTO_FULLSCREEN: 'autoFullscreen',
};

const DEFAULT_SETTINGS = {
  [STORAGE_KEYS.PADDING]: 24,
  [STORAGE_KEYS.AUTO_HIDE_UI]: true,
  [STORAGE_KEYS.AUTO_FULLSCREEN]: false,
};

const PADDING_SAVE_DEBOUNCE_MS = 250;

/**
 * Parse a raw padding input string into an integer, or null if NaN.
 * @param {string|number} rawValue - Raw input value
 * @returns {number|null} Parsed integer or null
 */
function parsePaddingValue(rawValue) {
  const parsed = parseInt(rawValue, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Update slider input value and pixel label text safely.
 * @param {object|null} slider - Range input element
 * @param {object|null} valDisplay - Value label element
 * @param {number} padding - Numeric padding value
 */
function applyPaddingUi(slider, valDisplay, padding) {
  if (slider) slider.value = padding;
  if (valDisplay) valDisplay.textContent = `${padding}px`;
}

/**
 * Load settings from Chrome sync storage with fallback defaults.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {object} callbacks - { onPaddingLoaded, onAutoHideLoaded }
 */
function loadSettings(storage, callbacks = {}) {
  if (!storage || typeof storage.get !== 'function') return;

  storage.get(DEFAULT_SETTINGS, (result) => {
    if (!result) return;

    const padding = result[STORAGE_KEYS.PADDING];
    if (typeof callbacks.onPaddingLoaded === 'function' && typeof padding === 'number' && !Number.isNaN(padding)) {
      callbacks.onPaddingLoaded(padding);
    }

    const autoHide = result[STORAGE_KEYS.AUTO_HIDE_UI];
    if (typeof callbacks.onAutoHideLoaded === 'function' && typeof autoHide === 'boolean') {
      callbacks.onAutoHideLoaded(autoHide);
    }

    const autoFullscreen = result[STORAGE_KEYS.AUTO_FULLSCREEN];
    if (typeof callbacks.onAutoFullscreenLoaded === 'function' && typeof autoFullscreen === 'boolean') {
      callbacks.onAutoFullscreenLoaded(autoFullscreen);
    }
  });
}

function saveBooleanSetting(storage, key, enabled, callback) {
  if (!storage || typeof storage.set !== 'function') return;
  storage.set({ [key]: Boolean(enabled) }, callback);
}

/**
 * Save Auto-Hide UI (Immersion Mode) setting to Chrome sync storage.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {boolean} enabled - Whether auto-hide UI is enabled
 * @param {function} [callback] - Optional completion callback
 */
function saveAutoHideUi(storage, enabled, callback) {
  saveBooleanSetting(storage, STORAGE_KEYS.AUTO_HIDE_UI, enabled, callback);
}

/**
 * Save Auto-Fullscreen setting to Chrome sync storage.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {boolean} enabled - Whether auto-fullscreen on open is enabled
 * @param {function} [callback] - Optional completion callback
 */
function saveAutoFullscreen(storage, enabled, callback) {
  saveBooleanSetting(storage, STORAGE_KEYS.AUTO_FULLSCREEN, enabled, callback);
}

/**
 * Save default padding setting to Chrome sync storage.
 * @param {object} storage - chrome.storage.sync API instance
 * @param {number} padding - Padding value in pixels
 * @param {function} [callback] - Optional completion callback
 */
function savePadding(storage, padding, callback) {
  if (!storage || typeof storage.set !== 'function') return;
  const numericPadding = Number(padding);
  if (Number.isNaN(numericPadding)) return;
  storage.set({ [STORAGE_KEYS.PADDING]: numericPadding }, callback);
}

/**
 * Load initial storage values into popup DOM elements.
 * @param {object|null} storageRef - chrome.storage.sync reference
 * @param {object} elements - { slider, valDisplay, autoHideToggle }
 */
function applyInitialSettings(storageRef, { slider, valDisplay, autoHideToggle, autoFullscreenToggle }) {
  if (!storageRef) return;

  loadSettings(storageRef, {
    onPaddingLoaded: (padding) => applyPaddingUi(slider, valDisplay, padding),
    onAutoHideLoaded: (autoHide) => {
      if (autoHideToggle) autoHideToggle.checked = autoHide;
    },
    onAutoFullscreenLoaded: (autoFullscreen) => {
      if (autoFullscreenToggle) autoFullscreenToggle.checked = autoFullscreen;
    },
  });
}

/**
 * Read, validate, and preview padding value from a slider event.
 * @param {Event} event - DOM input/change event
 * @param {object} slider - Range input element
 * @param {object|null} valDisplay - Value label element
 * @returns {number|null} Validated integer padding or null
 */
function readAndPreviewPadding(event, slider, valDisplay) {
  const rawValue = event && event.target ? event.target.value : slider.value;
  const parsed = parsePaddingValue(rawValue);
  if (parsed === null) return null;
  if (valDisplay) valDisplay.textContent = `${parsed}px`;
  return parsed;
}

/**
 * Bind debounced input and immediate change persistence for the padding slider.
 * @param {object|null} slider - Range input element
 * @param {object|null} valDisplay - Value label element
 * @param {object|null} storageRef - chrome.storage.sync reference
 * @param {number} [debounceMs] - Debounce delay in milliseconds
 */
function bindPopupSlider(slider, valDisplay, storageRef, debounceMs = PADDING_SAVE_DEBOUNCE_MS) {
  if (!slider) return;
  let saveTimer = null;

  const clearPendingSave = () => {
    if (!saveTimer) return;
    clearTimeout(saveTimer);
    saveTimer = null;
  };

  slider.addEventListener('input', (e) => {
    const parsed = readAndPreviewPadding(e, slider, valDisplay);
    if (parsed === null || !storageRef) return;
    clearPendingSave();
    saveTimer = setTimeout(() => {
      saveTimer = null;
      savePadding(storageRef, parsed);
    }, debounceMs);
  });

  slider.addEventListener('change', (e) => {
    const parsed = readAndPreviewPadding(e, slider, valDisplay);
    if (parsed === null) return;
    clearPendingSave();
    savePadding(storageRef, parsed);
  });
}

/**
 * Bind change persistence for the Auto-Hide UI toggle switch.
 * @param {object|null} autoHideToggle - Checkbox input element
 * @param {object|null} storageRef - chrome.storage.sync reference
 */
function bindPopupToggle(toggleEl, storageRef, saveFn = saveAutoHideUi) {
  if (!toggleEl) return;

  toggleEl.addEventListener('change', (e) => {
    const checked = e && e.target ? e.target.checked : toggleEl.checked;
    saveFn(storageRef, Boolean(checked));
  });
}

/**
 * Apply validated chrome.storage.onChanged updates to popup DOM elements.
 * @param {object} changes - Storage change map
 * @param {string} areaName - Storage area name
 * @param {object} elements - { slider, valDisplay, autoHideToggle, autoFullscreenToggle }
 */
function handleStorageChange(changes, areaName, elements) {
  if (areaName !== 'sync' || !changes || !elements) return;

  const { slider, valDisplay, autoHideToggle, autoFullscreenToggle } = elements;
  const autoHideChange = changes[STORAGE_KEYS.AUTO_HIDE_UI];
  if (autoHideChange && autoHideToggle && typeof autoHideChange.newValue === 'boolean') {
    autoHideToggle.checked = autoHideChange.newValue;
  }

  const autoFullscreenChange = changes[STORAGE_KEYS.AUTO_FULLSCREEN];
  if (autoFullscreenChange && autoFullscreenToggle && typeof autoFullscreenChange.newValue === 'boolean') {
    autoFullscreenToggle.checked = autoFullscreenChange.newValue;
  }

  const paddingChange = changes[STORAGE_KEYS.PADDING];
  if (paddingChange && typeof paddingChange.newValue === 'number' && !Number.isNaN(paddingChange.newValue)) {
    applyPaddingUi(slider, valDisplay, paddingChange.newValue);
  }
}

/**
 * Subscribe to chrome.storage.onChanged for external sync updates.
 * @param {object} elements - { slider, valDisplay, autoHideToggle }
 * @param {object|null} [storageEvents] - Optional chrome.storage.onChanged instance
 * @returns {function|null} Registered listener function or null
 */
function bindStorageSync(elements, storageEvents = null) {
  const target = storageEvents || (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.onChanged : null);
  if (!target || typeof target.addListener !== 'function') return null;

  const listener = (changes, areaName) => handleStorageChange(changes, areaName, elements);
  target.addListener(listener);
  return listener;
}

/**
 * Initialize popup DOM bindings and storage synchronization.
 * @param {Document} [documentRef] - DOM Document reference
 * @param {object} [storageRef] - chrome.storage.sync reference
 * @returns {object|null} Initialized element references
 */
function initPopup(documentRef = (typeof document !== 'undefined' ? document : null), storageRef = (typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.sync : null)) {
  if (!documentRef) return null;

  const elements = {
    slider: documentRef.getElementById('padding-slider'),
    valDisplay: documentRef.getElementById('padding-val'),
    autoHideToggle: documentRef.getElementById('auto-hide-ui-toggle'),
    autoFullscreenToggle: documentRef.getElementById('auto-fullscreen-toggle'),
  };

  applyInitialSettings(storageRef, elements);
  bindPopupSlider(elements.slider, elements.valDisplay, storageRef);
  bindPopupToggle(elements.autoHideToggle, storageRef, saveAutoHideUi);
  bindPopupToggle(elements.autoFullscreenToggle, storageRef, saveAutoFullscreen);
  bindStorageSync(elements);

  return elements;
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
    PADDING_SAVE_DEBOUNCE_MS,
    loadSettings,
    saveAutoHideUi,
    saveAutoFullscreen,
    savePadding,
    bindPopupSlider,
    bindPopupToggle,
    bindStorageSync,
    handleStorageChange,
    initPopup,
  };
}
