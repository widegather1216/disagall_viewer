// Immersion Mode & Idle Timer Controller for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { applyFittingAndPadding } from '../ui/overlay.js';
import {
  normalizePaddingValue,
  applyPaddingSetting,
  resetStorageSyncGuards,
  initStorageSync,
} from './storage_sync.js';
import {
  setFullscreenUiHooks,
  getFullscreenElement,
  isOverlayFullscreenElement,
  resetFullscreenState,
  bindFullscreenChangeListener,
  exitFullscreenSafely,
  toggleFullscreen,
  enterAutoFullscreenOnOpen,
  isFullscreenTransitionGuarded,
  clearFullscreenMouseGuard,
  hasUserToggledFullscreen,
  handleAutoFullscreenDisabled,
} from './fullscreen_controller.js';

export {
  getFullscreenElement,
  resetFullscreenState,
  exitFullscreenSafely,
  toggleFullscreen,
  enterAutoFullscreenOnOpen,
  normalizePaddingValue,
  applyPaddingSetting,
};

let isHeaderHovered = false;
let isSliderInteracting = false;
let lastPointerScreenX = null;
let lastPointerScreenY = null;
let lastPointerClientX = null;
let lastPointerClientY = null;

export function isOverlayActive() {
  const { overlayEl } = state.elements;
  return Boolean(overlayEl && overlayEl.classList && overlayEl.classList.contains('active'));
}

export function clearIdleTimer() {
  if (!state.idleTimer) return;
  clearTimeout(state.idleTimer);
  state.idleTimer = null;
}

export function resetImmersionGuards() {
  isHeaderHovered = false;
  isSliderInteracting = false;
  resetStorageSyncGuards();
  clearFullscreenMouseGuard();
  lastPointerScreenX = null;
  lastPointerScreenY = null;
  lastPointerClientX = null;
  lastPointerClientY = null;
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
  if (state.zoom.isDragging || isSliderInteracting || isHeaderHovered) return true;
  return isHeaderCursorHovering();
}

function isAnyUiHiddenClass(overlayEl) {
  return (
    state.isUiHidden ||
    overlayEl.classList.contains('disagall-idle') ||
    overlayEl.classList.contains('disagall-ui-hidden')
  );
}

function syncFittingIfUnzoomed() {
  if (state.zoom.scale > CONFIG.ZOOM_EPSILON) return;
  applyFittingAndPadding();
}

export function showUi() {
  state.isUiHidden = false;
  const { overlayEl } = state.elements;
  if (!overlayEl) return;
  overlayEl.classList.remove('disagall-idle');
  overlayEl.classList.remove('disagall-ui-hidden');
  syncFittingIfUnzoomed();
}

export function hideUi(isManual = false) {
  if (!isOverlayActive()) return false;
  const { overlayEl } = state.elements;
  if (isManual) {
    clearIdleTimer();
    state.isUiHidden = true;
    overlayEl.classList.remove('disagall-idle');
    overlayEl.classList.add('disagall-ui-hidden');
    syncFittingIfUnzoomed();
    return true;
  }
  if (!state.autoHideUi || state.isUiHidden) return false;
  if (isIdleHideDeferred()) {
    resetIdleTimer();
    return false;
  }
  overlayEl.classList.add('disagall-idle');
  syncFittingIfUnzoomed();
  return true;
}

export function resetIdleTimer() {
  clearIdleTimer();
  if (!isOverlayActive()) return;
  const { overlayEl } = state.elements;
  if (isAnyUiHiddenClass(overlayEl)) showUi();
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
    clearFullscreenMouseGuard();
    showUi();
    resetIdleTimer();
    return false;
  }
  return hideUi(true);
}

setFullscreenUiHooks({ isOverlayActive, isAnyUiHiddenClass, showUi, hideUi, resetIdleTimer });

export function applyAutoFullscreenSetting(enabled) {
  state.autoFullscreen = Boolean(enabled);
  if (state.autoFullscreen) return;
  handleAutoFullscreenDisabled();
}

export function applyAutoHideUiSetting(enabled) {
  const prevAutoHide = state.autoHideUi;
  state.autoHideUi = Boolean(enabled);
  if (!isOverlayActive()) return;
  const { overlayEl } = state.elements;
  if (!state.autoHideUi) {
    clearIdleTimer();
    if (overlayEl.classList.contains('disagall-idle') && !state.isUiHidden) showUi();
    return;
  }
  const alreadyRunningOrHidden = Boolean(state.idleTimer) || isAnyUiHiddenClass(overlayEl);
  if (!state.isUiHidden && (!prevAutoHide || !alreadyRunningOrHidden)) resetIdleTimer();
}

export function initImmersionSettings() {
  initStorageSync({
    onAutoHideChange: applyAutoHideUiSetting,
    onAutoFullscreenChange: applyAutoFullscreenSetting,
    onRetroactiveAutoFullscreen: enterAutoFullscreenOnOpen,
    isOverlayActive,
    isOverlayFullscreenElement,
    isSliderInteracting: () => isSliderInteracting,
    hasUserToggledFullscreenInSession: hasUserToggledFullscreen,
  });
  bindFullscreenChangeListener();
}

function bindHeaderHoverEvents(overlayEl) {
  if (typeof overlayEl.querySelector !== 'function') return;
  const headerEl = overlayEl.querySelector('.disagall-header');
  if (!headerEl) return;
  headerEl.addEventListener('mouseenter', () => { isHeaderHovered = true; });
  headerEl.addEventListener('mouseleave', () => {
    isHeaderHovered = false;
    // Ignore synthetic mouseleave triggered when hiding UI sets pointer-events: none
    if (!isOverlayActive() || isAnyUiHiddenClass(overlayEl)) return;
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

function updateLastPointerCoords(e) {
  if (!e) return;
  if (Number.isFinite(e.screenX) && Number.isFinite(e.screenY)) {
    lastPointerScreenX = e.screenX;
    lastPointerScreenY = e.screenY;
  }
  if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
    lastPointerClientX = e.clientX;
    lastPointerClientY = e.clientY;
  }
}

function isStationarySyntheticMouseMove(e) {
  if (!e) return false;
  const hasMovement = Number.isFinite(e.movementX) && Number.isFinite(e.movementY);
  if (hasMovement && (e.movementX !== 0 || e.movementY !== 0)) return false;
  if (Number.isFinite(e.screenX) && Number.isFinite(e.screenY) && lastPointerScreenX !== null) {
    return e.screenX === lastPointerScreenX && e.screenY === lastPointerScreenY;
  }
  if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY) && lastPointerClientX !== null) {
    return e.clientX === lastPointerClientX && e.clientY === lastPointerClientY;
  }
  return false;
}

function handleOverlayMouseMove(overlayEl, e) {
  if (!isOverlayActive()) return;
  const suppressed = isAnyUiHiddenClass(overlayEl) && (isFullscreenTransitionGuarded() || isStationarySyntheticMouseMove(e));
  updateLastPointerCoords(e);
  if (suppressed) return;
  resetIdleTimer();
}

export function bindImmersionEvents(overlayEl, sliderEl) {
  if (!overlayEl) return;
  bindFullscreenChangeListener();
  overlayEl.addEventListener('mousemove', (e) => handleOverlayMouseMove(overlayEl, e));
  bindHeaderHoverEvents(overlayEl);
  bindSliderInteractionEvents(sliderEl);
}
