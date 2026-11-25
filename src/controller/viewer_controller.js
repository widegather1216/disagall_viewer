// Main Viewer Controller and Lifecycle for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import {
  extractPostImages,
  getBestImgUrl,
  getCleanOriginalUrl,
  POST_BODY_CONTAINER_SELECTORS,
  isPostBodyImage
} from '../parser/image_parser.js';
import {
  buildOverlayHtml,
  cacheOverlayElements,
  applyFittingAndPadding,
  dismissViewerToast,
  dismissNoPhotoNotice,
  isEditableTarget,
  isExternalModalOpen
} from '../ui/overlay.js';
import {
  setPostNavCallbacks,
  cancelPendingPostNavigation,
  clearAutoOpenPollTimer,
  navigatePost,
  checkAutoOpen
} from './post_nav_controller.js';
import { resetZoom, setupZoomEvents, consumeSuppressedBackdropClick, cancelZoomRaf } from '../ui/zoom_pan.js';
import { triggerPostRecommend, updateRecommendButtonUi, clearRecommendTimers } from './recommend_controller.js';
import {
  isOverlayActive,
  clearIdleTimer,
  resetImmersionGuards,
  showUi,
  hideUi,
  resetIdleTimer,
  toggleUiManual,
  getFullscreenElement,
  exitFullscreenSafely,
  toggleFullscreen,
  enterAutoFullscreenOnOpen,
  resetFullscreenState,
  normalizePaddingValue,
  applyPaddingSetting,
  applyAutoHideUiSetting,
  applyAutoFullscreenSetting,
  initImmersionSettings,
  bindImmersionEvents
} from './immersion_controller.js';
import {
  persistPaddingSetting,
  clearPaddingSaveTimer,
  schedulePaddingSave,
  flushPaddingSave,
  markLocalPaddingModified
} from './storage_sync.js';

export {
  isOverlayActive,
  clearIdleTimer,
  showUi,
  hideUi,
  resetIdleTimer,
  toggleUiManual,
  getFullscreenElement,
  exitFullscreenSafely,
  toggleFullscreen,
  enterAutoFullscreenOnOpen,
  resetFullscreenState,
  normalizePaddingValue,
  applyPaddingSetting,
  applyAutoHideUiSetting,
  applyAutoFullscreenSetting,
  initImmersionSettings,
  cancelPendingPostNavigation,
  clearAutoOpenPollTimer,
  navigatePost,
  checkAutoOpen
};

let imageLoadSeq = 0;
let renderedLoadSeq = -1;
let boundPageHideWin = null;
const boundMainImgEls = new WeakSet();

function resolveLazyOriginalUrl(img) {
  const attrUrl = img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('data-url');
  if (attrUrl) return attrUrl;
  if (!img.dataset) return null;
  return img.dataset.original || img.dataset.src || img.dataset.url || null;
}

export function forcePreloadPostImages() {
  const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
  imgs.forEach((img) => {
    if (!isPostBodyImage(img)) return;
    const orig = resolveLazyOriginalUrl(img);
    const needsPreload = img.src.includes('loading') || img.src.includes('blank.gif') || img.classList.contains('lazy');
    if (orig && needsPreload) {
      img.src = orig;
      img.classList.remove('lazy');
    }
  });

  try {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
  } catch (e) {
    // Non-fatal: synthetic window event dispatch may fail in restricted DOM environments
  }
}

export function collectPostImages() {
  state.postImages = extractPostImages(document);
  return state.postImages;
}

function updateNavAndCounterUi() {
  const { counterEl, prevBtnEl, nextBtnEl } = state.elements;
  const total = state.postImages.length;
  if (counterEl) {
    counterEl.textContent = `${state.currentIndex + 1} / ${total}`;
  }
  if (prevBtnEl) prevBtnEl.classList.toggle('disabled', total <= 1);
  if (nextBtnEl) nextBtnEl.classList.toggle('disabled', total <= 1);
}

function handleMainImgLoad() {
  if (renderedLoadSeq !== imageLoadSeq || !isOverlayActive()) return;
  if (state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
    applyFittingAndPadding();
  }
}

function ensureMainImgLoadListener(mainImgEl) {
  if (!mainImgEl || typeof mainImgEl.addEventListener !== 'function' || boundMainImgEls.has(mainImgEl)) {
    return;
  }
  mainImgEl.addEventListener('load', handleMainImgLoad);
  boundMainImgEls.add(mainImgEl);
}

function renderViewerImage(mainImgEl, loaderEl, src, alt, seq) {
  if (!mainImgEl || seq !== imageLoadSeq || !isOverlayActive()) return;
  ensureMainImgLoadListener(mainImgEl);
  renderedLoadSeq = seq;
  mainImgEl.src = src;
  mainImgEl.alt = alt;
  if (loaderEl) loaderEl.style.display = 'none';
  mainImgEl.style.opacity = '1';
  if (state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
    applyFittingAndPadding();
  }
}

export function showImage(index) {
  if (state.postImages.length === 0) return;

  const seq = ++imageLoadSeq;
  renderedLoadSeq = -1;
  resetZoom(true);
  state.currentIndex = (index + state.postImages.length) % state.postImages.length;
  updateNavAndCounterUi();

  const imgData = state.postImages[state.currentIndex];
  const { loaderEl, mainImgEl } = state.elements;
  if (loaderEl) loaderEl.style.display = 'flex';
  if (mainImgEl) {
    mainImgEl.style.opacity = '0';
    mainImgEl.referrerPolicy = 'no-referrer-when-downgrade';
  }

  const tempImg = new Image();
  tempImg.referrerPolicy = 'no-referrer-when-downgrade';
  tempImg.onload = () => {
    tempImg.onload = null;
    tempImg.onerror = null;
    if (seq !== imageLoadSeq || !isOverlayActive()) return;
    renderViewerImage(mainImgEl, loaderEl, tempImg.src, imgData.alt, seq);
  };
  tempImg.onerror = () => {
    tempImg.onload = null;
    tempImg.onerror = null;
    if (seq !== imageLoadSeq || !isOverlayActive()) return;
    const fallbackSrc = (imgData.element && (imgData.element.currentSrc || imgData.element.src)) || imgData.url;
    renderViewerImage(mainImgEl, loaderEl, fallbackSrc, imgData.alt, seq);
  };
  tempImg.src = imgData.url;
}

export function navigate(direction) {
  showImage(state.currentIndex + direction);
}

export const KEY_ACTIONS = {
  'Escape': () => {
    if (getFullscreenElement()) {
      exitFullscreenSafely();
      return;
    }
    closeViewer();
  },
  'ArrowLeft': () => navigate(-1),
  'a': () => navigate(-1),
  'A': () => navigate(-1),
  'ArrowRight': () => navigate(1),
  'd': () => navigate(1),
  'D': () => navigate(1),
  'ArrowUp': () => navigatePost('up'),
  'w': () => navigatePost('up'),
  'W': () => navigatePost('up'),
  'ArrowDown': () => navigatePost('down'),
  's': () => navigatePost('down'),
  'S': () => navigatePost('down'),
  'r': () => triggerPostRecommend(),
  'R': () => triggerPostRecommend(),
  'c': () => triggerPostRecommend(),
  'C': () => triggerPostRecommend(),
  'h': () => toggleUiManual(),
  'H': () => toggleUiManual(),
  'f': () => toggleFullscreen(),
  'F': () => toggleFullscreen()
};

export const CODE_ACTIONS = {
  'KeyA': () => navigate(-1),
  'KeyD': () => navigate(1),
  'KeyW': () => navigatePost('up'),
  'KeyS': () => navigatePost('down'),
  'KeyR': () => triggerPostRecommend(),
  'KeyC': () => triggerPostRecommend(),
  'KeyH': () => toggleUiManual(),
  'KeyF': () => toggleFullscreen()
};

export function handleKeyDown(e) {
  if (!isOverlayActive()) return;
  if (!e || e.repeat) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;

  if (isEditableTarget(e.target)) {
    if (e.key === 'Escape' && typeof e.target.blur === 'function') {
      e.target.blur();
    }
    return;
  }

  if (isExternalModalOpen()) return;

  const action = KEY_ACTIONS[e.key] || (e.code ? CODE_ACTIONS[e.code] : null);
  if (action) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    action();
  }
}

function bindStopPropagationClick(el, handler) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    handler();
  });
}

function bindOverlayButtons() {
  const { prevBtnEl, nextBtnEl, recommendBtnEl, fullscreenBtnEl } = state.elements;
  const closeBtnEl = document.getElementById('disagall-close-btn');
  if (closeBtnEl) {
    closeBtnEl.addEventListener('click', closeViewer);
  }
  bindStopPropagationClick(recommendBtnEl, triggerPostRecommend);
  bindStopPropagationClick(fullscreenBtnEl, toggleFullscreen);
  bindStopPropagationClick(prevBtnEl, () => navigate(-1));
  bindStopPropagationClick(nextBtnEl, () => navigate(1));
}

function applySliderPaddingInput(rawValue, sliderValEl) {
  const numeric = typeof rawValue === 'string' && rawValue.trim() !== '' ? Number(rawValue) : rawValue;
  const nextPadding = normalizePaddingValue(numeric);
  if (nextPadding === null) return null;
  state.currentPadding = nextPadding;
  if (sliderValEl) sliderValEl.textContent = `${state.currentPadding}px`;
  markLocalPaddingModified();
  applyFittingAndPadding();
  return state.currentPadding;
}

function bindPaddingSlider(sliderEl, sliderValEl) {
  if (!sliderEl) return;

  sliderEl.addEventListener('input', (e) => {
    if (applySliderPaddingInput(e.target.value, sliderValEl) === null) return;
    resetIdleTimer();
    schedulePaddingSave();
  });

  sliderEl.addEventListener('change', (e) => {
    if (e && e.target && e.target.value !== undefined) {
      applySliderPaddingInput(e.target.value, sliderValEl);
    } else {
      markLocalPaddingModified();
    }
    clearPaddingSaveTimer();
    persistPaddingSetting();
  });
}

function bindOverlayBackdrop(overlayEl) {
  overlayEl.addEventListener('click', (e) => {
    if (consumeSuppressedBackdropClick()) return;
    if (e.target === overlayEl || e.target.id === 'disagall-stage' || e.target.id === 'disagall-img-wrapper') {
      closeViewer();
    }
  });
}

export function createOverlay() {
  if (state.elements.overlayEl) return;

  const overlay = document.createElement('div');
  overlay.id = 'disagall-viewer-overlay';
  overlay.innerHTML = buildOverlayHtml();
  document.body.appendChild(overlay);
  cacheOverlayElements();

  const { overlayEl, mainImgEl, sliderEl, sliderValEl } = state.elements;
  bindOverlayButtons();
  bindPaddingSlider(sliderEl, sliderValEl);
  bindOverlayBackdrop(overlayEl);
  bindImmersionEvents(overlayEl, sliderEl);
  ensureMainImgLoadListener(mainImgEl);
  setupZoomEvents(mainImgEl);
  window.addEventListener('keydown', handleKeyDown, true);
}

function findImageIndexByUrl(searchUrl) {
  if (!searchUrl) return -1;
  return state.postImages.findIndex(
    (item) => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl)
  );
}

function findTargetImageIndex(targetSrc) {
  if (targetSrc) {
    const directIdx = findImageIndexByUrl(getCleanOriginalUrl(targetSrc));
    if (directIdx !== -1) return directIdx;
  }

  const fallbackIdx = findImageIndexByUrl(state.lastRightClickedImgSrc);
  return fallbackIdx !== -1 ? fallbackIdx : 0;
}

export function openViewer(targetSrc, isAuto = false) {
  forcePreloadPostImages();
  collectPostImages();

  if (state.postImages.length === 0) {
    if (!isAuto) {
      alert('디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.');
    }
    return;
  }

  cancelPendingPostNavigation();
  clearAutoOpenPollTimer();
  dismissNoPhotoNotice();
  createOverlay();

  const targetIndex = findTargetImageIndex(targetSrc);
  const { overlayEl } = state.elements;
  if (typeof document !== 'undefined' && isEditableTarget(document.activeElement) && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
  const wasActive = isOverlayActive();
  if (!wasActive) {
    resetFullscreenState();
    state.previousBodyOverflow = document.body.style.overflow;
  }
  overlayEl.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (state.autoFullscreen) {
    hideUi(true);
  } else {
    showUi();
    resetIdleTimer();
  }
  updateRecommendButtonUi();
  showImage(targetIndex);
  if (state.autoFullscreen) {
    enterAutoFullscreenOnOpen();
  } else if (!wasActive && getFullscreenElement() === overlayEl) {
    exitFullscreenSafely();
  }
}

export function closeViewer() {
  imageLoadSeq += 1;
  renderedLoadSeq = -1;
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

function bindContextMenuTracker() {
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG' && isPostBodyImage(target)) {
      state.lastRightClickedImgSrc = getBestImgUrl(target);
      return;
    }
    state.lastRightClickedImgSrc = null;
  }, true);
}

function cancelResizeRaf() {
  if (state.resizeRafId === null) return;
  cancelAnimationFrame(state.resizeRafId);
  state.resizeRafId = null;
}

function bindResizeHandler() {
  window.addEventListener('resize', () => {
    if (!isOverlayActive()) return;
    cancelResizeRaf();
    let fired = false;
    const rafId = requestAnimationFrame(() => {
      fired = true;
      state.resizeRafId = null;
      if (!isOverlayActive()) return;
      applyFittingAndPadding();
    });
    state.resizeRafId = fired ? null : rafId;
  });
}

function bindTestOpenListener() {
  window.addEventListener('message', (event) => {
    if (event.origin && event.origin !== window.location.origin && window.location.origin !== 'null') return;
    if (event.data && event.data.action === 'disagall_test_open') {
      openViewer();
    }
  });
}

function bindAutoOpenTrigger() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoOpen);
    return;
  }
  checkAutoOpen();
}

function handlePageHideCleanup() {
  cancelPendingPostNavigation();
  clearAutoOpenPollTimer();
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
  bindAutoOpenTrigger();
}
