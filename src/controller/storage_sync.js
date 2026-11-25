// Storage Read/Write, Debounce, Echo-Suppression & Live Sync for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { applyFittingAndPadding } from '../ui/overlay.js';

const MAX_SELF_PADDING_WRITE_HISTORY = 8;

let paddingWriteSeq = 0;
let pendingSelfPaddingWrites = [];
let boundStorageOnChanged = null;
let initialSettingsLoadSeq = 0;
let hasLocalPaddingEditSinceLoad = false;
let hasOnChangedSync = {
  padding: false,
  autoHideUi: false,
  autoFullscreen: false,
};

let syncCallbacks = {
  onAutoHideChange: () => {},
  onAutoFullscreenChange: () => {},
  onRetroactiveAutoFullscreen: () => {},
  isOverlayActive: () => {
    const { overlayEl } = state.elements;
    return Boolean(overlayEl && overlayEl.classList && overlayEl.classList.contains('active'));
  },
  isOverlayFullscreenElement: () => false,
  isSliderInteracting: () => false,
  hasUserToggledFullscreenInSession: () => false,
};

export function setStorageSyncCallbacks(callbacks = {}) {
  syncCallbacks = {
    ...syncCallbacks,
    ...callbacks,
  };
}

function isPaddingSavePending() {
  return Boolean(state.paddingSaveTimer);
}

export function normalizePaddingValue(rawValue) {
  if (typeof rawValue !== 'number' || !Number.isFinite(rawValue)) return null;
  return Math.min(CONFIG.PADDING_MAX, Math.max(CONFIG.PADDING_MIN, Math.round(rawValue)));
}

export function applyPaddingSetting(padding, { refit = true } = {}) {
  const normalized = normalizePaddingValue(padding);
  if (normalized === null) return false;

  state.currentPadding = normalized;
  const { sliderEl, sliderValEl } = state.elements;
  if (sliderEl) sliderEl.value = normalized;
  if (sliderValEl) sliderValEl.textContent = `${normalized}px`;

  if (refit && syncCallbacks.isOverlayActive() && !state.isFullscreenMode && state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
    applyFittingAndPadding();
  }
  return true;
}

export function markLocalPaddingModified() {
  hasLocalPaddingEditSinceLoad = true;
}

export function recordSelfPaddingWrite(padding) {
  const normalized = normalizePaddingValue(padding);
  if (normalized === null) return;
  paddingWriteSeq += 1;
  pendingSelfPaddingWrites.push({ seq: paddingWriteSeq, value: normalized });
  if (pendingSelfPaddingWrites.length > MAX_SELF_PADDING_WRITE_HISTORY) {
    pendingSelfPaddingWrites.shift();
  }
}

export function persistPaddingSetting() {
  const valueToSave = state.currentPadding;
  recordSelfPaddingWrite(valueToSave);
  try {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.set === 'function') {
      chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: valueToSave });
      return;
    }
    if (typeof GM_setValue === 'function') {
      GM_setValue(CONFIG.STORAGE_KEY_PADDING, valueToSave);
    }
  } catch (err) {
    // Non-fatal: Chrome extension context invalidated or storage write blocked
  }
}

export function clearPaddingSaveTimer() {
  if (!state.paddingSaveTimer) return false;
  clearTimeout(state.paddingSaveTimer);
  state.paddingSaveTimer = null;
  return true;
}

export function schedulePaddingSave() {
  clearPaddingSaveTimer();
  state.paddingSaveTimer = setTimeout(() => {
    state.paddingSaveTimer = null;
    persistPaddingSetting();
  }, CONFIG.PADDING_SAVE_DEBOUNCE_MS);
}

export function flushPaddingSave() {
  if (clearPaddingSaveTimer()) {
    persistPaddingSetting();
  }
}

export function resetStorageSyncGuards() {
  clearPaddingSaveTimer();
  pendingSelfPaddingWrites = [];
}

function shouldApplyInitialPadding() {
  return (
    !hasOnChangedSync.padding &&
    !hasLocalPaddingEditSinceLoad &&
    !syncCallbacks.isSliderInteracting() &&
    !isPaddingSavePending()
  );
}

function applyInitialAutoFullscreen(savedAutoFullscreen) {
  if (hasOnChangedSync.autoFullscreen || typeof savedAutoFullscreen !== 'boolean') return;
  state.autoFullscreen = savedAutoFullscreen;
  if (
    savedAutoFullscreen &&
    syncCallbacks.isOverlayActive() &&
    !state.isFullscreenMode &&
    !syncCallbacks.isOverlayFullscreenElement() &&
    !syncCallbacks.hasUserToggledFullscreenInSession()
  ) {
    syncCallbacks.onRetroactiveAutoFullscreen();
  }
}

function applyInitialSettingsResult(result) {
  if (!result) return;
  if (shouldApplyInitialPadding()) {
    applyPaddingSetting(result[CONFIG.STORAGE_KEY_PADDING]);
  }
  const savedAutoHide = result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
  if (!hasOnChangedSync.autoHideUi && typeof savedAutoHide === 'boolean') {
    syncCallbacks.onAutoHideChange(savedAutoHide);
  }
  applyInitialAutoFullscreen(result[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]);
}

function hasChromeSyncGet() {
  return (
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.sync &&
    typeof chrome.storage.sync.get === 'function'
  );
}

export function loadInitialSettings() {
  const seq = ++initialSettingsLoadSeq;
  hasLocalPaddingEditSinceLoad = false;
  hasOnChangedSync = { padding: false, autoHideUi: false, autoFullscreen: false };

  if (hasChromeSyncGet()) {
    chrome.storage.sync.get(
      {
        [CONFIG.STORAGE_KEY_PADDING]: CONFIG.DEFAULT_PADDING,
        [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: true,
        [CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]: false,
      },
      (result) => {
        if (!result || seq !== initialSettingsLoadSeq) return;
        applyInitialSettingsResult(result);
      }
    );
    return;
  }

  if (typeof GM_getValue === 'function') {
    applyInitialSettingsResult({
      [CONFIG.STORAGE_KEY_PADDING]: GM_getValue(CONFIG.STORAGE_KEY_PADDING, CONFIG.DEFAULT_PADDING),
      [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: GM_getValue(CONFIG.STORAGE_KEY_AUTO_HIDE_UI, true),
      [CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]: GM_getValue(CONFIG.STORAGE_KEY_AUTO_FULLSCREEN, false),
    });
  }
}

function consumeSupersededSelfPaddingEcho(normalizedValue) {
  const matchIdx = pendingSelfPaddingWrites.findIndex((entry) => entry.value === normalizedValue);
  if (matchIdx === -1) return false;

  const matched = pendingSelfPaddingWrites[matchIdx];
  pendingSelfPaddingWrites = pendingSelfPaddingWrites.filter((entry) => entry.seq > matched.seq);
  return matched.seq < paddingWriteSeq;
}

function handleSyncPaddingChange(paddingChange) {
  if (!paddingChange) return;
  const normalized = normalizePaddingValue(paddingChange.newValue);
  if (normalized === null) return;
  if (syncCallbacks.isSliderInteracting() || isPaddingSavePending()) return;
  if (consumeSupersededSelfPaddingEcho(normalized)) return;

  hasOnChangedSync.padding = true;
  applyPaddingSetting(normalized);
}

function handleStorageSyncChanges(changes, areaName) {
  if (areaName !== 'sync' || !changes) return;
  handleSyncPaddingChange(changes[CONFIG.STORAGE_KEY_PADDING]);

  const autoHideChange = changes[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
  if (autoHideChange && typeof autoHideChange.newValue === 'boolean') {
    hasOnChangedSync.autoHideUi = true;
    syncCallbacks.onAutoHideChange(autoHideChange.newValue);
  }
  const autoFullscreenChange = changes[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN];
  if (autoFullscreenChange && typeof autoFullscreenChange.newValue === 'boolean') {
    hasOnChangedSync.autoFullscreen = true;
    syncCallbacks.onAutoFullscreenChange(autoFullscreenChange.newValue);
  }
}

export function bindImmersionStorageListener() {
  const storageEvents =
    typeof chrome !== 'undefined' && chrome.storage ? chrome.storage.onChanged : null;
  if (
    !storageEvents ||
    boundStorageOnChanged === storageEvents ||
    typeof storageEvents.addListener !== 'function'
  ) {
    return;
  }

  boundStorageOnChanged = storageEvents;
  storageEvents.addListener(handleStorageSyncChanges);
}

export function initStorageSync(callbacks) {
  if (callbacks) {
    setStorageSyncCallbacks(callbacks);
  }
  loadInitialSettings();
  bindImmersionStorageListener();
}
