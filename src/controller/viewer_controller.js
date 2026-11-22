// Main Viewer Controller and Lifecycle for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import {
  extractPostImages,
  getCleanOriginalUrl,
  POST_BODY_CONTAINER_SELECTORS,
  isPostBodyImage
} from '../parser/image_parser.js';
import { getAdjacentPostUrl } from '../parser/post_navigator.js';
import {
  buildOverlayHtml,
  cacheOverlayElements,
  applyFittingAndPadding,
  showViewerToast,
  showNoPhotoNotice,
  dismissNoPhotoNotice,
  isEditableTarget,
  isExternalModalOpen
} from '../ui/overlay.js';
import { resetZoom, setupZoomEvents } from '../ui/zoom_pan.js';
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
  applyAutoHideUiSetting,
  applyAutoFullscreenSetting,
  initImmersionSettings,
  bindImmersionEvents
} from './immersion_controller.js';

export {
  isOverlayActive,
  clearIdleTimer,
  showUi,
  hideUi,
  resetIdleTimer,
  toggleUiManual,
  exitFullscreenSafely,
  toggleFullscreen,
  enterAutoFullscreenOnOpen,
  resetFullscreenState,
  applyAutoHideUiSetting,
  applyAutoFullscreenSetting,
  initImmersionSettings
};

const PADDING_SAVE_DEBOUNCE_MS = 250;
let paddingSaveTimer = null;

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

function renderViewerImage(mainImgEl, loaderEl, src, alt) {
  if (!mainImgEl) return;
  mainImgEl.src = src;
  mainImgEl.alt = alt;
  if (loaderEl) loaderEl.style.display = 'none';
  mainImgEl.style.opacity = '1';
  applyFittingAndPadding();
}

export function showImage(index) {
  if (state.postImages.length === 0) return;

  resetZoom();
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
  tempImg.onload = () => renderViewerImage(mainImgEl, loaderEl, tempImg.src, imgData.alt);
  tempImg.onerror = () => {
    const fallbackSrc = (imgData.element && (imgData.element.currentSrc || imgData.element.src)) || imgData.url;
    renderViewerImage(mainImgEl, loaderEl, fallbackSrc, imgData.alt);
  };
  tempImg.src = imgData.url;
}

export function navigate(direction) {
  showImage(state.currentIndex + direction);
}

export function navigatePost(direction) {
  const result = getAdjacentPostUrl(direction);
  if (!result) {
    showViewerToast('이동할 수 있는 게시글 목록을 찾을 수 없습니다.');
    return;
  }
  if (result.error) {
    showViewerToast(result.message);
    return;
  }
  if (!result.url) return;

  const label = direction === 'up' ? '위쪽 최신 글' : '아래쪽 이전 글';
  const photoHint = result.hasPhoto ? ' 📷' : '';
  const titleHint = result.title ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + '...' : result.title})` : '';
  showViewerToast(`${label}로 이동 중...${photoHint}${titleHint}`);

  try {
    sessionStorage.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
  } catch (e) {
    // Non-fatal: sessionStorage may be blocked under browser privacy or sandbox policies
  }

  setTimeout(() => {
    window.location.href = result.url;
  }, CONFIG.POST_NAV_DELAY);
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

function persistPaddingSetting() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.set === 'function') {
    chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: state.currentPadding });
    return;
  }
  if (typeof GM_setValue === 'function') {
    GM_setValue(CONFIG.STORAGE_KEY_PADDING, state.currentPadding);
  }
}

function clearPaddingSaveTimer() {
  if (!paddingSaveTimer) return false;
  clearTimeout(paddingSaveTimer);
  paddingSaveTimer = null;
  return true;
}

function schedulePaddingSave() {
  clearPaddingSaveTimer();
  paddingSaveTimer = setTimeout(() => {
    paddingSaveTimer = null;
    persistPaddingSetting();
  }, PADDING_SAVE_DEBOUNCE_MS);
}

function flushPaddingSave() {
  if (clearPaddingSaveTimer()) {
    persistPaddingSetting();
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

function bindPaddingSlider(sliderEl, sliderValEl) {
  if (!sliderEl) return;

  sliderEl.addEventListener('input', (e) => {
    const nextPadding = parseInt(e.target.value, 10);
    if (Number.isNaN(nextPadding)) return;
    state.currentPadding = nextPadding;
    if (sliderValEl) sliderValEl.textContent = `${state.currentPadding}px`;
    applyFittingAndPadding();
    resetIdleTimer();
    schedulePaddingSave();
  });

  sliderEl.addEventListener('change', () => {
    clearPaddingSaveTimer();
    persistPaddingSetting();
  });
}

function bindOverlayBackdrop(overlayEl) {
  overlayEl.addEventListener('click', (e) => {
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
  setupZoomEvents(mainImgEl);
  window.addEventListener('keydown', handleKeyDown, true);
}

function findTargetImageIndex(targetSrc) {
  const searchUrl = targetSrc ? getCleanOriginalUrl(targetSrc) : state.lastRightClickedImgSrc;
  if (!searchUrl) return 0;

  const foundIdx = state.postImages.findIndex(
    (item) => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl)
  );
  return foundIdx !== -1 ? foundIdx : 0;
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

  showUi();
  resetIdleTimer();
  updateRecommendButtonUi();
  showImage(targetIndex);
  if (state.autoFullscreen) {
    enterAutoFullscreenOnOpen();
  } else if (!wasActive && getFullscreenElement() === overlayEl) {
    exitFullscreenSafely();
  }
}

export function closeViewer() {
  dismissNoPhotoNotice();
  clearRecommendTimers();
  clearIdleTimer();
  flushPaddingSave();
  resetImmersionGuards();
  resetFullscreenState();
  showUi();
  resetZoom();

  const { overlayEl } = state.elements;
  if (overlayEl) {
    overlayEl.classList.remove('active');
    document.body.style.overflow = state.previousBodyOverflow;
  }

  exitFullscreenSafely();
}

function startAutoOpenPolling() {
  let attempts = 0;
  const maxAttempts = CONFIG.AUTO_OPEN_MAX_ATTEMPTS;
  const pollTimer = setInterval(() => {
    attempts++;
    forcePreloadPostImages();
    collectPostImages();

    if (state.postImages.length > 0) {
      clearInterval(pollTimer);
      openViewer(null, true);
      return;
    }
    if (attempts >= maxAttempts) {
      clearInterval(pollTimer);
      showNoPhotoNotice((dir) => navigatePost(dir));
    }
  }, CONFIG.AUTO_OPEN_POLL_INTERVAL);
}

export function checkAutoOpen() {
  try {
    const autoOpen = sessionStorage.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN);
    if (autoOpen !== '1') return;
    sessionStorage.removeItem(CONFIG.STORAGE_KEY_AUTO_OPEN);
    startAutoOpenPolling();
  } catch (e) {
    // Non-fatal: sessionStorage access may be blocked under strict privacy/sandbox policies
  }
}

function bindContextMenuTracker() {
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG' && isPostBodyImage(target)) {
      state.lastRightClickedImgSrc = getCleanOriginalUrl(target.src);
      return;
    }
    state.lastRightClickedImgSrc = null;
  }, true);
}

function bindResizeHandler() {
  let resizeRafId = null;
  window.addEventListener('resize', () => {
    const { overlayEl } = state.elements;
    if (!overlayEl || !overlayEl.classList.contains('active')) return;
    if (resizeRafId) cancelAnimationFrame(resizeRafId);
    resizeRafId = requestAnimationFrame(() => {
      applyFittingAndPadding();
      resizeRafId = null;
    });
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

export function initViewerBase() {
  initImmersionSettings();
  bindContextMenuTracker();
  bindResizeHandler();
  bindTestOpenListener();
  bindAutoOpenTrigger();
}
