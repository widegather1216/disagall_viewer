// Main Viewer Controller and Lifecycle for Disagall Viewer
import { state } from '../state.js';
import { getBestImgUrl, POST_BODY_CONTAINER_SELECTORS, isPostBodyImage } from '../parser/image_parser.js';
import {
  buildOverlayHtml,
  cacheOverlayElements,
  applyFittingAndPadding,
  dismissViewerToast,
  dismissNoPhotoNotice,
  isEditableTarget
} from '../ui/overlay.js';
import {
  setPostNavCallbacks,
  cancelPendingPostNavigation,
  clearAutoOpenPollTimer,
  checkAutoOpen
} from './post_nav_controller.js';
import { setupZoomEvents, resetZoom, cancelZoomRaf } from '../ui/zoom_pan.js';
import { updateRecommendButtonUi, clearRecommendTimers } from './recommend_controller.js';
import { bindOverlayControls } from './overlay_bindings.js';
import {
  forcePreloadPostImages,
  collectPostImages,
  showImage,
  findTargetImageIndex,
  ensureMainImgLoadListener,
  resetImageLoadSeq
} from './image_loader.js';
import { setViewerShortcutCallbacks, handleKeyDown } from './viewer_shortcuts.js';
import {
  isOverlayActive,
  clearIdleTimer,
  resetImmersionGuards,
  showUi,
  hideUi,
  resetIdleTimer,
  getFullscreenElement,
  exitFullscreenSafely,
  enterAutoFullscreenOnOpen,
  resetFullscreenState,
  initImmersionSettings,
  bindImmersionEvents
} from './immersion_controller.js';
import { flushPaddingSave } from './storage_sync.js';

export { forcePreloadPostImages, collectPostImages, showImage, navigate } from './image_loader.js';
export { KEY_ACTIONS, CODE_ACTIONS, handleKeyDown, handleGlobalViewerShortcut } from './viewer_shortcuts.js';
export { cancelPendingPostNavigation, clearAutoOpenPollTimer, navigatePost, checkAutoOpen } from './post_nav_controller.js';
export {
  isOverlayActive, clearIdleTimer, showUi, hideUi, resetIdleTimer, toggleUiManual,
  getFullscreenElement, exitFullscreenSafely, toggleFullscreen, enterAutoFullscreenOnOpen,
  resetFullscreenState, normalizePaddingValue, applyPaddingSetting,
  applyAutoHideUiSetting, applyAutoFullscreenSetting, initImmersionSettings
} from './immersion_controller.js';

let boundPageHideWin = null;
let boundContextMenuDoc = null;
let boundResizeWin = null;
let boundMessageWin = null;

export function createOverlay() {
  if (state.elements.overlayEl) return;
  const overlay = document.createElement('div');
  overlay.id = 'disagall-viewer-overlay';
  overlay.innerHTML = buildOverlayHtml();
  document.body.appendChild(overlay);
  cacheOverlayElements();

  const { overlayEl, mainImgEl, sliderEl } = state.elements;
  bindOverlayControls(closeViewer);
  bindImmersionEvents(overlayEl, sliderEl);
  ensureMainImgLoadListener(mainImgEl);
  setupZoomEvents(mainImgEl);
  window.addEventListener('keydown', handleKeyDown, true);
}

function blurActiveEditable() {
  const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
  if (isEditableTarget(activeEl) && typeof activeEl.blur === 'function') activeEl.blur();
}

function activateOverlayDom(overlayEl) {
  blurActiveEditable();
  const wasActive = isOverlayActive();
  if (!wasActive) {
    resetFullscreenState();
    state.previousBodyOverflow = document.body.style.overflow;
  }
  overlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';
  return wasActive;
}

function syncInitialViewerMode(overlayEl, wasActive) {
  if (state.autoFullscreen) {
    hideUi(true);
    enterAutoFullscreenOnOpen();
    return;
  }
  showUi();
  resetIdleTimer();
  if (!wasActive && getFullscreenElement() === overlayEl) exitFullscreenSafely();
}

export function openViewer(targetSrc, isAuto = false) {
  forcePreloadPostImages();
  collectPostImages();
  if (state.postImages.length === 0) {
    if (!isAuto) alert('디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.');
    return;
  }
  cancelPendingPostNavigation();
  clearAutoOpenPollTimer();
  dismissNoPhotoNotice();
  createOverlay();

  const { overlayEl } = state.elements;
  if (!overlayEl) return;
  const targetIndex = findTargetImageIndex(targetSrc);
  const wasActive = activateOverlayDom(overlayEl);
  updateRecommendButtonUi();
  showImage(targetIndex);
  syncInitialViewerMode(overlayEl, wasActive);
}

export function closeViewer() {
  resetImageLoadSeq();
  cancelPendingPostNavigation();
  clearAutoOpenPollTimer();
  dismissNoPhotoNotice();
  dismissViewerToast();
  clearRecommendTimers();
  clearIdleTimer();
  cancelResizeRaf();

  const { overlayEl } = state.elements;
  if (overlayEl) {
    overlayEl.classList.remove('active');
    document.body.style.overflow = state.previousBodyOverflow;
  }
  flushPaddingSave();
  resetImmersionGuards();
  resetFullscreenState();
  showUi();
  resetZoom();
  cancelZoomRaf();
  cancelResizeRaf();
  exitFullscreenSafely();
}

setPostNavCallbacks({
  onOpenViewer: (targetSrc, isAuto) => openViewer(targetSrc, isAuto),
  onPreloadAndCollect: () => {
    forcePreloadPostImages();
    collectPostImages();
    return state.postImages;
  },
});

setViewerShortcutCallbacks({
  onOpenViewer: () => openViewer(),
  onCloseViewer: () => closeViewer(),
});

export function hasPostBodyContainer() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return false;
  return Boolean(document.querySelector(POST_BODY_CONTAINER_SELECTORS));
}

export function openViewerForImageTarget(target) {
  if (isOverlayActive() || !target || typeof target.closest !== 'function') return false;
  if (target.closest('#disagall-viewer-overlay')) return false;
  const img = target.closest('img');
  if (!img || !isPostBodyImage(img)) return false;
  openViewer(getBestImgUrl(img));
  return true;
}

export function clearQuickLauncherTimer() {
  if (state.quickLauncherTimer === null) return;
  clearTimeout(state.quickLauncherTimer);
  state.quickLauncherTimer = null;
}

export function scheduleQuickLauncherFallback(fn, delayMs = 1000) {
  if (typeof fn !== 'function') return;
  clearQuickLauncherTimer();
  let fired = false;
  const timerId = setTimeout(() => {
    fired = true;
    state.quickLauncherTimer = null;
    fn();
  }, delayMs);
  state.quickLauncherTimer = fired ? null : timerId;
}

function bindContextMenuTracker() {
  if (typeof document === 'undefined' || typeof document.addEventListener !== 'function') return;
  if (boundContextMenuDoc === document) return;
  boundContextMenuDoc = document;
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    state.lastRightClickedImgSrc = (target && target.tagName === 'IMG' && isPostBodyImage(target))
      ? getBestImgUrl(target)
      : null;
  }, true);
}

function cancelResizeRaf() {
  if (state.resizeRafId === null) return;
  cancelAnimationFrame(state.resizeRafId);
  state.resizeRafId = null;
}

function bindResizeHandler() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (boundResizeWin === window) return;
  boundResizeWin = window;
  window.addEventListener('resize', () => {
    if (!isOverlayActive()) return;
    cancelResizeRaf();
    let fired = false;
    const rafId = requestAnimationFrame(() => {
      fired = true;
      state.resizeRafId = null;
      if (isOverlayActive()) applyFittingAndPadding();
    });
    state.resizeRafId = fired ? null : rafId;
  });
}

function bindTestOpenListener() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (boundMessageWin === window) return;
  boundMessageWin = window;
  window.addEventListener('message', (event) => {
    if (event.origin && event.origin !== window.location.origin && window.location.origin !== 'null') return;
    if (event.data && event.data.action === 'disagall_test_open') openViewer();
  });
}

function handlePageHideCleanup() {
  cancelPendingPostNavigation();
  clearAutoOpenPollTimer();
  clearQuickLauncherTimer();
  flushPaddingSave();
}

function bindPageHideCleanup() {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
  if (boundPageHideWin === window) return;
  boundPageHideWin = window;
  window.addEventListener('pagehide', handlePageHideCleanup);
}

export function initViewerBase() {
  initImmersionSettings();
  bindContextMenuTracker();
  bindResizeHandler();
  bindTestOpenListener();
  bindPageHideCleanup();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoOpen);
  } else {
    checkAutoOpen();
  }
}
