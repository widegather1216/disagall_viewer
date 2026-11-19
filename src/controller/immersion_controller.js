// Immersion Mode, Idle Timer, Fullscreen, and Storage Sync Controller
import { CONFIG } from '../config.js';
import { state } from '../state.js';

let isHeaderHovered = false;
let isSliderInteracting = false;
let hasBoundStorageSync = false;

export function isOverlayActive() {
  const { overlayEl } = state.elements;
  return Boolean(overlayEl && overlayEl.classList.contains('active'));
}

export function clearIdleTimer() {
  if (!state.idleTimer) return;
  clearTimeout(state.idleTimer);
  state.idleTimer = null;
}

export function resetImmersionGuards() {
  isHeaderHovered = false;
  isSliderInteracting = false;
}

function isHeaderCursorHovering() {
  const { overlayEl } = state.elements;
  if (!overlayEl || typeof overlayEl.querySelector !== 'function') return false;
  const headerEl = overlayEl.querySelector('.disagall-header');
  if (!headerEl || typeof headerEl.matches !== 'function') return false;

  try {
    return headerEl.matches(':hover');
  } catch (err) {
    // Some DOM environments or mock elements do not support :hover selector matching
    return false;
  }
}

function isIdleHideDeferred() {
  if (state.zoom.isDragging || isSliderInteracting || isHeaderHovered) {
    return true;
  }
  return isHeaderCursorHovering();
}

function isAnyUiHiddenClass(overlayEl) {
  return (
    state.isUiHidden ||
    overlayEl.classList.contains('disagall-idle') ||
    overlayEl.classList.contains('disagall-ui-hidden')
  );
}

export function showUi() {
  state.isUiHidden = false;
  const { overlayEl } = state.elements;
  if (!overlayEl) return;

  overlayEl.classList.remove('disagall-idle');
  overlayEl.classList.remove('disagall-ui-hidden');
}

export function hideUi(isManual = false) {
  if (!isOverlayActive()) return false;
  const { overlayEl } = state.elements;

  if (isManual) {
    clearIdleTimer();
    state.isUiHidden = true;
    overlayEl.classList.remove('disagall-idle');
    overlayEl.classList.add('disagall-ui-hidden');
    return true;
  }

  if (!state.autoHideUi || state.isUiHidden) return false;
  if (isIdleHideDeferred()) {
    resetIdleTimer();
    return false;
  }

  overlayEl.classList.add('disagall-idle');
  return true;
}

export function resetIdleTimer() {
  clearIdleTimer();
  if (!isOverlayActive()) return;

  const { overlayEl } = state.elements;
  if (isAnyUiHiddenClass(overlayEl)) {
    showUi();
  }

  if (!state.autoHideUi) return;

  state.idleTimer = setTimeout(() => {
    state.idleTimer = null;
    hideUi(false);
  }, CONFIG.UI_IDLE_TIMEOUT);
}

export function toggleUiManual() {
  if (!isOverlayActive()) return false;
  const { overlayEl } = state.elements;

  if (isAnyUiHiddenClass(overlayEl)) {
    showUi();
    resetIdleTimer();
    return false;
  }

  return hideUi(true);
}

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function handleFullscreenPromise(result) {
  if (!result || typeof result.catch !== 'function') return;
  result.catch((err) => {
    // Browser may reject fullscreen transitions outside direct user gestures
    return err;
  });
}

export function exitFullscreenSafely() {
  if (!getFullscreenElement()) return false;
  try {
    if (typeof document.exitFullscreen === 'function') {
      handleFullscreenPromise(document.exitFullscreen());
      return true;
    }
    if (typeof document.webkitExitFullscreen === 'function') {
      handleFullscreenPromise(document.webkitExitFullscreen());
      return true;
    }
  } catch (err) {
    // Safely ignore unsupported or disallowed fullscreen exit errors
    return false;
  }
  return false;
}

export function toggleFullscreen() {
  if (!isOverlayActive()) return false;
  if (getFullscreenElement()) {
    return exitFullscreenSafely();
  }

  const { overlayEl } = state.elements;
  try {
    if (typeof overlayEl.requestFullscreen === 'function') {
      handleFullscreenPromise(overlayEl.requestFullscreen());
      return true;
    }
    if (typeof overlayEl.webkitRequestFullscreen === 'function') {
      handleFullscreenPromise(overlayEl.webkitRequestFullscreen());
      return true;
    }
  } catch (err) {
    // Safely ignore unsupported or disallowed fullscreen request errors
    return false;
  }
  return false;
}

export function applyAutoHideUiSetting(enabled) {
  state.autoHideUi = Boolean(enabled);
  if (!isOverlayActive()) return;

  const { overlayEl } = state.elements;
  if (!state.autoHideUi) {
    clearIdleTimer();
    if (overlayEl.classList.contains('disagall-idle') && !state.isUiHidden) {
      showUi();
    }
    return;
  }

  if (!state.isUiHidden) {
    resetIdleTimer();
  }
}

function loadInitialAutoHideSetting() {
  const hasChromeSync =
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.sync &&
    typeof chrome.storage.sync.get === 'function';

  if (hasChromeSync) {
    chrome.storage.sync.get({ [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: true }, (result) => {
      if (result && typeof result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI] === 'boolean') {
        applyAutoHideUiSetting(result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI]);
      }
    });
    return;
  }

  if (typeof GM_getValue === 'function') {
    const savedAutoHide = GM_getValue(CONFIG.STORAGE_KEY_AUTO_HIDE_UI, true);
    if (typeof savedAutoHide === 'boolean') {
      applyAutoHideUiSetting(savedAutoHide);
    }
  }
}

function bindAutoHideStorageListener() {
  const canBindListener =
    !hasBoundStorageSync &&
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.onChanged &&
    typeof chrome.storage.onChanged.addListener === 'function';

  if (!canBindListener) return;

  hasBoundStorageSync = true;
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync' || !changes) return;
    const change = changes[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
    if (change && typeof change.newValue === 'boolean') {
      applyAutoHideUiSetting(change.newValue);
    }
  });
}

export function initImmersionSettings() {
  loadInitialAutoHideSetting();
  bindAutoHideStorageListener();
}

function bindHeaderHoverEvents(overlayEl) {
  if (typeof overlayEl.querySelector !== 'function') return;
  const headerEl = overlayEl.querySelector('.disagall-header');
  if (!headerEl) return;

  headerEl.addEventListener('mouseenter', () => {
    isHeaderHovered = true;
  });
  headerEl.addEventListener('mouseleave', () => {
    isHeaderHovered = false;
    resetIdleTimer();
  });
}

function bindSliderInteractionEvents(sliderEl) {
  if (!sliderEl) return;

  const startSliderInteraction = () => {
    isSliderInteracting = true;
    resetIdleTimer();
  };
  const endSliderInteraction = () => {
    if (!isSliderInteracting) return;
    isSliderInteracting = false;
    resetIdleTimer();
  };

  sliderEl.addEventListener('mousedown', startSliderInteraction);
  sliderEl.addEventListener('touchstart', startSliderInteraction, { passive: true });
  sliderEl.addEventListener('change', endSliderInteraction);
  sliderEl.addEventListener('mouseup', endSliderInteraction);
  sliderEl.addEventListener('touchend', endSliderInteraction);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('mouseup', endSliderInteraction);
  }
}

export function bindImmersionEvents(overlayEl, sliderEl) {
  overlayEl.addEventListener('mousemove', () => {
    resetIdleTimer();
  });
  bindHeaderHoverEvents(overlayEl);
  bindSliderInteractionEvents(sliderEl);
}
