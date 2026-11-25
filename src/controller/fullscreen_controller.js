// Fullscreen State Machine & OS/Fallback Transitions for Disagall Viewer
import { state } from '../state.js';
import { showViewerToast } from '../ui/overlay.js';

const FULLSCREEN_TRANSITION_MOUSE_GUARD_MS = 1000;

let boundFullscreenDoc = null;
let fullscreenTransitionSeq = 0;
let inFlightRequestSeq = 0;
let inFlightExitSeq = 0;
let asyncPendingRequestCount = 0;
let osFullscreenWanted = false;
let hasObservedOsFullscreen = false;
let hasUserToggledFullscreenInSession = false;
let fullscreenMouseGuardUntil = 0;

let uiHooks = {
  isOverlayActive: () => Boolean(state.elements.overlayEl?.classList?.contains('active')),
  isAnyUiHiddenClass: (el) => Boolean(state.isUiHidden || el?.classList?.contains('disagall-idle') || el?.classList?.contains('disagall-ui-hidden')),
  showUi: () => {},
  hideUi: () => false,
  resetIdleTimer: () => {},
};

export function setFullscreenUiHooks(hooks = {}) { uiHooks = { ...uiHooks, ...hooks }; }
export function clearFullscreenMouseGuard() { fullscreenMouseGuardUntil = 0; }
export function hasUserToggledFullscreen() { return hasUserToggledFullscreenInSession; }

export function isFullscreenTransitionGuarded() {
  return (state.isFullscreenMode || inFlightRequestSeq !== 0) && Date.now() < fullscreenMouseGuardUntil;
}

export function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

export function isOverlayFullscreenElement() {
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
  const labelEl = typeof fullscreenBtnEl.querySelector === 'function' ? fullscreenBtnEl.querySelector('span') : null;
  if (labelEl) labelEl.textContent = active ? '전체화면 해제' : '전체화면';
}

function enterFullscreenVisualState() {
  if (!uiHooks.isOverlayActive()) return;
  const { overlayEl } = state.elements;
  fullscreenMouseGuardUntil = Date.now() + FULLSCREEN_TRANSITION_MOUSE_GUARD_MS;
  if (state.isFullscreenMode && overlayEl.classList.contains('disagall-fullscreen')) {
    updateFullscreenButtonUi(true);
    if (!uiHooks.isAnyUiHiddenClass(overlayEl)) uiHooks.hideUi(true);
    return;
  }
  state.isFullscreenMode = true;
  overlayEl.classList.add('disagall-fullscreen');
  updateFullscreenButtonUi(true);
  uiHooks.hideUi(true);
}

function exitFullscreenVisualState() {
  const { overlayEl } = state.elements;
  const wasActive = Boolean(state.isFullscreenMode || overlayEl?.classList?.contains('disagall-fullscreen'));
  clearFullscreenMouseGuard();
  state.isFullscreenMode = false;
  if (overlayEl) overlayEl.classList.remove('disagall-fullscreen');
  updateFullscreenButtonUi(false);
  if (wasActive && uiHooks.isOverlayActive()) { uiHooks.showUi(); uiHooks.resetIdleTimer(); }
}

export function resetFullscreenState() {
  fullscreenTransitionSeq += 1;
  inFlightRequestSeq = 0;
  inFlightExitSeq = 0;
  osFullscreenWanted = false;
  hasObservedOsFullscreen = false;
  hasUserToggledFullscreenInSession = false;
  clearFullscreenMouseGuard();
  state.isFullscreenMode = false;
  if (state.elements.overlayEl) state.elements.overlayEl.classList.remove('disagall-fullscreen');
  updateFullscreenButtonUi(false);
}

function syncFullscreenState() {
  if (!uiHooks.isOverlayActive()) {
    if (isOverlayFullscreenElement()) exitFullscreenSafely();
    return;
  }
  if (isOverlayFullscreenElement()) {
    const isStaleOrExiting = !osFullscreenWanted && (asyncPendingRequestCount > 0 || inFlightExitSeq === fullscreenTransitionSeq);
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

export function bindFullscreenChangeListener() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (boundFullscreenDoc === document) return;
  boundFullscreenDoc = document;
  ['fullscreenchange', 'webkitfullscreenchange'].forEach((ev) => document.addEventListener(ev, syncFullscreenState));
  ['fullscreenerror', 'webkitfullscreenerror'].forEach((ev) => document.addEventListener(ev, handleFullscreenError));
}

function handleFullscreenPromise(result, onSuccess, onFailure) {
  if (!result || typeof result.then !== 'function') {
    if (typeof onSuccess === 'function') onSuccess(false);
    return;
  }
  // Browser may reject fullscreen transitions outside direct user gestures
  result.then(
    () => { if (typeof onSuccess === 'function') onSuccess(true); },
    (err) => { if (typeof onFailure === 'function') onFailure(err, true); return err; }
  );
}

function resolveMethod(target, primary, fallback) {
  if (!target) return null;
  if (typeof target[primary] === 'function') return () => target[primary]();
  if (typeof target[fallback] === 'function') return () => target[fallback]();
  return null;
}

function consumeRequestSeq(seq, isAsync) {
  if (isAsync) asyncPendingRequestCount = Math.max(0, asyncPendingRequestCount - 1);
  if (inFlightRequestSeq === seq) inFlightRequestSeq = 0;
}

function handleRequestSuccess(seq, isAsync, onSuccess) {
  consumeRequestSeq(seq, isAsync);
  if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) {
    if (!isOverlayFullscreenElement()) return;
    if (!uiHooks.isOverlayActive() || !osFullscreenWanted) {
      exitFullscreenSafely();
      return;
    }
    hasObservedOsFullscreen = true;
    enterFullscreenVisualState();
    return;
  }
  if (isOverlayFullscreenElement()) hasObservedOsFullscreen = true;
  if (typeof onSuccess === 'function') onSuccess();
}

function handleRequestFailure(seq, isAsync, err, onFailure) {
  consumeRequestSeq(seq, isAsync);
  if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) return;
  if (isOverlayFullscreenElement()) {
    hasObservedOsFullscreen = true;
    enterFullscreenVisualState();
    return;
  }
  osFullscreenWanted = false;
  if (typeof onFailure === 'function') onFailure(err);
}

function startFullscreenRequest(requestFn, seq, onSuccess, onFailure) {
  try {
    const result = requestFn();
    if (result && typeof result.then === 'function') asyncPendingRequestCount += 1;
    handleFullscreenPromise(result, (isAsync) => handleRequestSuccess(seq, isAsync, onSuccess), (err, isAsync) => handleRequestFailure(seq, isAsync, err, onFailure));
    return true;
  } catch (err) {
    handleRequestFailure(seq, false, err, onFailure);
    return false;
  }
}

function requestOverlayFullscreen(overlayEl, { onSuccess, onFailure } = {}) {
  if (inFlightRequestSeq !== 0 && inFlightRequestSeq === fullscreenTransitionSeq) return false;
  const requestFn = resolveMethod(overlayEl, 'requestFullscreen', 'webkitRequestFullscreen');
  if (!requestFn) {
    osFullscreenWanted = false;
    if (typeof onFailure === 'function') onFailure(new Error('Fullscreen API unavailable'));
    return false;
  }
  const seq = ++fullscreenTransitionSeq;
  inFlightRequestSeq = seq;
  osFullscreenWanted = true;
  fullscreenMouseGuardUntil = Date.now() + FULLSCREEN_TRANSITION_MOUSE_GUARD_MS;
  return startFullscreenRequest(requestFn, seq, onSuccess, onFailure);
}

function finishFullscreenExit(seq) {
  if (inFlightExitSeq === seq) inFlightExitSeq = 0;
  if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) return;
  if (!isOverlayFullscreenElement()) exitFullscreenVisualState();
}

export function exitFullscreenSafely() {
  if (!getFullscreenElement()) return false;
  if (inFlightExitSeq !== 0 && inFlightExitSeq === fullscreenTransitionSeq) return false;
  const exitFn = resolveMethod(typeof document !== 'undefined' ? document : null, 'exitFullscreen', 'webkitExitFullscreen');
  if (!exitFn) return false;
  const seq = ++fullscreenTransitionSeq;
  inFlightExitSeq = seq;
  osFullscreenWanted = false;
  hasObservedOsFullscreen = false;
  try {
    const onDone = () => finishFullscreenExit(seq);
    handleFullscreenPromise(exitFn(), onDone, onDone);
    return true;
  } catch (err) {
    if (inFlightExitSeq === seq) inFlightExitSeq = 0;
    // Safely ignore unsupported or disallowed fullscreen exit errors
    return false;
  }
}

function engageFallbackFullscreen(toastMsg, toggleOffIfActive = false) {
  if (!uiHooks.isOverlayActive()) return;
  if (toggleOffIfActive) {
    exitFullscreenVisualState();
    return;
  }
  enterFullscreenVisualState();
  showViewerToast(toastMsg);
}

export function toggleFullscreen() {
  if (!uiHooks.isOverlayActive()) return false;
  hasUserToggledFullscreenInSession = true;
  if (getFullscreenElement()) return exitFullscreenSafely();
  const wasFallback = state.isFullscreenMode;
  return requestOverlayFullscreen(state.elements.overlayEl, {
    onSuccess: enterFullscreenVisualState,
    onFailure: () => engageFallbackFullscreen('OS 전체화면이 제한되어 창 전체 채움 모드로 전환했습니다.', wasFallback),
  });
}

export function enterAutoFullscreenOnOpen() {
  if (!uiHooks.isOverlayActive()) return false;
  return requestOverlayFullscreen(state.elements.overlayEl, {
    onSuccess: enterFullscreenVisualState,
    onFailure: () => engageFallbackFullscreen('여백 0px·UI 숨김으로 전체 채움 (F 키로 OS 전체화면)'),
  });
}

export function handleAutoFullscreenDisabled() {
  if (!isOverlayFullscreenElement()) osFullscreenWanted = false;
  if (state.isFullscreenMode && !getFullscreenElement() && uiHooks.isOverlayActive()) exitFullscreenVisualState();
}
