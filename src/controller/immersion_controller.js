// Immersion Mode, Idle Timer, Fullscreen, and Storage Sync Controller
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { applyFittingAndPadding, showViewerToast } from '../ui/overlay.js';

let isHeaderHovered = false;
let isSliderInteracting = false;
let hasBoundStorageSync = false;
let boundFullscreenDoc = null;
let fullscreenTransitionSeq = 0;
let inFlightRequestSeq = 0;
let inFlightExitSeq = 0;
let asyncPendingRequestCount = 0;
let osFullscreenWanted = false;
let hasObservedOsFullscreen = false;

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

function syncFittingIfUnzoomed() {
  if (state.zoom.scale > 1.001) return;
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

function isOverlayFullscreenElement() {
  const { overlayEl } = state.elements;
  return Boolean(overlayEl && getFullscreenElement() === overlayEl);
}

function updateFullscreenButtonUi(active) {
  const { fullscreenBtnEl } = state.elements;
  if (!fullscreenBtnEl) return;

  fullscreenBtnEl.classList.toggle('active', active);
  if (typeof fullscreenBtnEl.setAttribute === 'function') {
    fullscreenBtnEl.setAttribute('aria-pressed', active ? 'true' : 'false');
  }
  fullscreenBtnEl.title = active ? '전체화면 해제 (단축키: F / ESC)' : '전체화면 전환 (단축키: F)';

  if (typeof fullscreenBtnEl.querySelector === 'function') {
    const labelEl = fullscreenBtnEl.querySelector('span');
    if (labelEl) {
      labelEl.textContent = active ? '전체화면 해제' : '전체화면';
    }
  }
}

function enterFullscreenVisualState() {
  if (!isOverlayActive()) return;
  const { overlayEl } = state.elements;
  if (state.isFullscreenMode && overlayEl.classList.contains('disagall-fullscreen')) {
    updateFullscreenButtonUi(true);
    return;
  }

  state.isFullscreenMode = true;
  overlayEl.classList.add('disagall-fullscreen');
  updateFullscreenButtonUi(true);
  hideUi(true);
}

function exitFullscreenVisualState() {
  const { overlayEl } = state.elements;
  const wasActive = Boolean(
    state.isFullscreenMode || (overlayEl && overlayEl.classList.contains('disagall-fullscreen'))
  );

  state.isFullscreenMode = false;
  if (overlayEl) {
    overlayEl.classList.remove('disagall-fullscreen');
  }
  updateFullscreenButtonUi(false);

  if (wasActive && isOverlayActive()) {
    showUi();
    resetIdleTimer();
  }
}

export function resetFullscreenState() {
  fullscreenTransitionSeq += 1;
  inFlightRequestSeq = 0;
  inFlightExitSeq = 0;
  osFullscreenWanted = false;
  hasObservedOsFullscreen = false;
  state.isFullscreenMode = false;
  const { overlayEl } = state.elements;
  if (overlayEl) {
    overlayEl.classList.remove('disagall-fullscreen');
  }
  updateFullscreenButtonUi(false);
}

function syncFullscreenState() {
  if (!isOverlayActive()) {
    if (isOverlayFullscreenElement()) {
      exitFullscreenSafely();
    }
    return;
  }
  if (isOverlayFullscreenElement()) {
    const isStaleOrExiting =
      !osFullscreenWanted &&
      (asyncPendingRequestCount > 0 || inFlightExitSeq === fullscreenTransitionSeq);
    if (isStaleOrExiting) {
      exitFullscreenSafely();
      return;
    }
    hasObservedOsFullscreen = true;
    enterFullscreenVisualState();
    return;
  }
  if (hasObservedOsFullscreen && state.isFullscreenMode) {
    hasObservedOsFullscreen = false;
    osFullscreenWanted = false;
    exitFullscreenVisualState();
  }
}

function handleFullscreenError() {
  inFlightRequestSeq = 0;
  if (!isOverlayFullscreenElement()) {
    osFullscreenWanted = false;
    hasObservedOsFullscreen = false;
  }
}

function bindFullscreenChangeListener() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (boundFullscreenDoc === document) return;

  boundFullscreenDoc = document;
  document.addEventListener('fullscreenchange', syncFullscreenState);
  document.addEventListener('webkitfullscreenchange', syncFullscreenState);
  document.addEventListener('fullscreenerror', handleFullscreenError);
  document.addEventListener('webkitfullscreenerror', handleFullscreenError);
}

function handleFullscreenPromise(result, onSuccess, onFailure) {
  if (!result || typeof result.then !== 'function') {
    if (typeof onSuccess === 'function') onSuccess(false);
    return;
  }
  result.then(
    () => {
      if (typeof onSuccess === 'function') onSuccess(true);
    },
    (err) => {
      // Browser may reject fullscreen transitions outside direct user gestures
      if (typeof onFailure === 'function') onFailure(err, true);
      return err;
    }
  );
}

function getFullscreenRequestFn(overlayEl) {
  if (!overlayEl) return null;
  if (typeof overlayEl.requestFullscreen === 'function') {
    return () => overlayEl.requestFullscreen();
  }
  if (typeof overlayEl.webkitRequestFullscreen === 'function') {
    return () => overlayEl.webkitRequestFullscreen();
  }
  return null;
}

function handleRequestSuccess(seq, isAsync, onSuccess) {
  if (isAsync) {
    asyncPendingRequestCount = Math.max(0, asyncPendingRequestCount - 1);
  }
  if (inFlightRequestSeq === seq) {
    inFlightRequestSeq = 0;
  }
  if (seq !== fullscreenTransitionSeq || !isOverlayActive()) {
    if (isOverlayFullscreenElement() && (!isOverlayActive() || !osFullscreenWanted)) {
      exitFullscreenSafely();
      return;
    }
    if (isOverlayActive() && osFullscreenWanted && isOverlayFullscreenElement()) {
      hasObservedOsFullscreen = true;
      enterFullscreenVisualState();
    }
    return;
  }
  if (isOverlayFullscreenElement()) {
    hasObservedOsFullscreen = true;
  }
  if (typeof onSuccess === 'function') onSuccess();
}

function handleRequestFailure(seq, isAsync, err, onFailure) {
  if (isAsync) {
    asyncPendingRequestCount = Math.max(0, asyncPendingRequestCount - 1);
  }
  if (inFlightRequestSeq === seq) {
    inFlightRequestSeq = 0;
  }
  if (seq !== fullscreenTransitionSeq || !isOverlayActive()) {
    return;
  }
  if (isOverlayFullscreenElement()) {
    hasObservedOsFullscreen = true;
    enterFullscreenVisualState();
    return;
  }
  osFullscreenWanted = false;
  if (typeof onFailure === 'function') onFailure(err);
}

function requestOverlayFullscreen(overlayEl, { onSuccess, onFailure } = {}) {
  if (inFlightRequestSeq !== 0 && inFlightRequestSeq === fullscreenTransitionSeq) {
    return false;
  }
  const requestFn = getFullscreenRequestFn(overlayEl);
  if (!requestFn) {
    osFullscreenWanted = false;
    if (typeof onFailure === 'function') onFailure(new Error('Fullscreen API unavailable'));
    return false;
  }

  const seq = ++fullscreenTransitionSeq;
  inFlightRequestSeq = seq;
  osFullscreenWanted = true;

  try {
    const result = requestFn();
    if (result && typeof result.then === 'function') {
      asyncPendingRequestCount += 1;
    }
    handleFullscreenPromise(
      result,
      (isAsync) => handleRequestSuccess(seq, isAsync, onSuccess),
      (err, isAsync) => handleRequestFailure(seq, isAsync, err, onFailure)
    );
    return true;
  } catch (err) {
    handleRequestFailure(seq, false, err, onFailure);
    return false;
  }
}

function getExitFullscreenFn() {
  if (typeof document === 'undefined') return null;
  if (typeof document.exitFullscreen === 'function') {
    return () => document.exitFullscreen();
  }
  if (typeof document.webkitExitFullscreen === 'function') {
    return () => document.webkitExitFullscreen();
  }
  return null;
}

export function exitFullscreenSafely() {
  if (!getFullscreenElement()) return false;
  if (inFlightExitSeq !== 0 && inFlightExitSeq === fullscreenTransitionSeq) {
    return false;
  }
  const exitFn = getExitFullscreenFn();
  if (!exitFn) return false;

  const seq = ++fullscreenTransitionSeq;
  inFlightExitSeq = seq;
  osFullscreenWanted = false;
  hasObservedOsFullscreen = false;

  const finalizeExit = () => {
    if (inFlightExitSeq === seq) {
      inFlightExitSeq = 0;
    }
    if (seq !== fullscreenTransitionSeq || !isOverlayActive()) return;
    if (!isOverlayFullscreenElement()) {
      exitFullscreenVisualState();
    }
  };

  try {
    handleFullscreenPromise(exitFn(), finalizeExit, finalizeExit);
    return true;
  } catch (err) {
    if (inFlightExitSeq === seq) {
      inFlightExitSeq = 0;
    }
    // Safely ignore unsupported or disallowed fullscreen exit errors
    return false;
  }
}

export function toggleFullscreen() {
  if (!isOverlayActive()) return false;
  if (getFullscreenElement()) {
    return exitFullscreenSafely();
  }

  const { overlayEl } = state.elements;
  const wasFallback = state.isFullscreenMode;
  return requestOverlayFullscreen(overlayEl, {
    onSuccess: enterFullscreenVisualState,
    onFailure: () => {
      if (!isOverlayActive()) return;
      if (wasFallback) {
        exitFullscreenVisualState();
        return;
      }
      enterFullscreenVisualState();
      showViewerToast('OS 전체화면이 제한되어 창 전체 채움 모드로 전환했습니다.');
    },
  });
}

export function enterAutoFullscreenOnOpen() {
  if (!isOverlayActive()) return false;
  const { overlayEl } = state.elements;
  return requestOverlayFullscreen(overlayEl, {
    onSuccess: enterFullscreenVisualState,
    onFailure: () => {
      if (!isOverlayActive()) return;
      enterFullscreenVisualState();
      showViewerToast('여백 0px·UI 숨김으로 전체 채움 (F 키로 OS 전체화면)');
    },
  });
}

export function applyAutoFullscreenSetting(enabled) {
  state.autoFullscreen = Boolean(enabled);
  if (!state.autoFullscreen) {
    if (!isOverlayFullscreenElement()) {
      osFullscreenWanted = false;
    }
    if (state.isFullscreenMode && !getFullscreenElement() && isOverlayActive()) {
      exitFullscreenVisualState();
    }
  }
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
    chrome.storage.sync.get(
      {
        [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: true,
        [CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]: false,
      },
      (result) => {
        if (!result) return;
        if (typeof result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI] === 'boolean') {
          applyAutoHideUiSetting(result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI]);
        }
        if (typeof result[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN] === 'boolean') {
          applyAutoFullscreenSetting(result[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]);
        }
      }
    );
    return;
  }

  if (typeof GM_getValue === 'function') {
    const savedAutoHide = GM_getValue(CONFIG.STORAGE_KEY_AUTO_HIDE_UI, true);
    if (typeof savedAutoHide === 'boolean') {
      applyAutoHideUiSetting(savedAutoHide);
    }
    const savedAutoFullscreen = GM_getValue(CONFIG.STORAGE_KEY_AUTO_FULLSCREEN, false);
    if (typeof savedAutoFullscreen === 'boolean') {
      applyAutoFullscreenSetting(savedAutoFullscreen);
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
    const autoHideChange = changes[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
    if (autoHideChange && typeof autoHideChange.newValue === 'boolean') {
      applyAutoHideUiSetting(autoHideChange.newValue);
    }
    const autoFullscreenChange = changes[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN];
    if (autoFullscreenChange && typeof autoFullscreenChange.newValue === 'boolean') {
      applyAutoFullscreenSetting(autoFullscreenChange.newValue);
    }
  });
}

export function initImmersionSettings() {
  loadInitialAutoHideSetting();
  bindAutoHideStorageListener();
  bindFullscreenChangeListener();
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
  bindFullscreenChangeListener();
  overlayEl.addEventListener('mousemove', () => {
    resetIdleTimer();
  });
  bindHeaderHoverEvents(overlayEl);
  bindSliderInteractionEvents(sliderEl);
}
