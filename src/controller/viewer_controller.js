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
  showNoPhotoNotice
} from '../ui/overlay.js';
import { resetZoom, setupZoomEvents } from '../ui/zoom_pan.js';
import { triggerPostRecommend, updateRecommendButtonUi } from './recommend_controller.js';

export function forcePreloadPostImages() {
  const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
  imgs.forEach(img => {
    if (!isPostBodyImage(img)) return;
    const orig = img.getAttribute('data-original') ||
                 img.getAttribute('data-src') ||
                 img.getAttribute('data-url') ||
                 (img.dataset ? (img.dataset.original || img.dataset.src || img.dataset.url) : null);
    if (orig && (img.src.includes('loading') || img.src.includes('blank.gif') || img.classList.contains('lazy'))) {
      img.src = orig;
      img.classList.remove('lazy');
    }
  });

  try {
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
  } catch (e) {}
}

export function collectPostImages() {
  state.postImages = extractPostImages(document);
  return state.postImages;
}

export function showImage(index) {
  if (state.postImages.length === 0) return;

  resetZoom();

  state.currentIndex = (index + state.postImages.length) % state.postImages.length;
  const imgData = state.postImages[state.currentIndex];
  const { counterEl, prevBtnEl, nextBtnEl, loaderEl, mainImgEl } = state.elements;

  if (counterEl) {
    counterEl.textContent = `${state.currentIndex + 1} / ${state.postImages.length}`;
  }

  if (prevBtnEl) {
    prevBtnEl.classList.toggle('disabled', state.postImages.length <= 1);
  }
  if (nextBtnEl) {
    nextBtnEl.classList.toggle('disabled', state.postImages.length <= 1);
  }

  if (loaderEl) loaderEl.style.display = 'flex';
  if (mainImgEl) {
    mainImgEl.style.opacity = '0';
    mainImgEl.referrerPolicy = 'no-referrer-when-downgrade';
  }

  const tempImg = new Image();
  tempImg.referrerPolicy = 'no-referrer-when-downgrade';

  tempImg.onload = () => {
    if (mainImgEl) {
      mainImgEl.src = tempImg.src;
      mainImgEl.alt = imgData.alt;
      if (loaderEl) loaderEl.style.display = 'none';
      mainImgEl.style.opacity = '1';
      applyFittingAndPadding();
    }
  };

  tempImg.onerror = () => {
    if (mainImgEl) {
      const fallbackSrc = (imgData.element && (imgData.element.currentSrc || imgData.element.src)) || imgData.url;
      mainImgEl.src = fallbackSrc;
      mainImgEl.alt = imgData.alt;
      if (loaderEl) loaderEl.style.display = 'none';
      mainImgEl.style.opacity = '1';
      applyFittingAndPadding();
    }
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

  if (result.url) {
    const label = direction === 'up' ? '위쪽 최신 글' : '아래쪽 이전 글';
    const photoHint = result.hasPhoto ? ' 📷' : '';
    const titleHint = result.title ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + '...' : result.title})` : '';
    showViewerToast(`${label}로 이동 중...${photoHint}${titleHint}`);

    try {
      sessionStorage.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    } catch (e) {}

    setTimeout(() => {
      window.location.href = result.url;
    }, CONFIG.POST_NAV_DELAY);
  }
}

let isHeaderHovered = false;
let isSliderInteracting = false;
let hasBoundStorageSync = false;

function isOverlayActive() {
  const { overlayEl } = state.elements;
  return Boolean(overlayEl && overlayEl.classList.contains('active'));
}

export function clearIdleTimer() {
  if (state.idleTimer) {
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
}

function isIdleHideDeferred() {
  if (state.zoom.isDragging || isSliderInteracting || isHeaderHovered) {
    return true;
  }
  const { overlayEl } = state.elements;
  if (!overlayEl || typeof overlayEl.querySelector !== 'function') {
    return false;
  }
  const headerEl = overlayEl.querySelector('.disagall-header');
  if (!headerEl || typeof headerEl.matches !== 'function') {
    return false;
  }
  try {
    return headerEl.matches(':hover');
  } catch (err) {
    // Some DOM environments or mock elements do not support :hover selector matching
    return false;
  }
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
  if (
    state.isUiHidden ||
    overlayEl.classList.contains('disagall-idle') ||
    overlayEl.classList.contains('disagall-ui-hidden')
  ) {
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

  const isHidden =
    state.isUiHidden ||
    overlayEl.classList.contains('disagall-idle') ||
    overlayEl.classList.contains('disagall-ui-hidden');

  if (isHidden) {
    showUi();
    resetIdleTimer();
    return false;
  }

  return hideUi(true);
}

function getFullscreenElement() {
  if (typeof document === 'undefined') return null;
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function handleFullscreenPromise(result) {
  if (result && typeof result.catch === 'function') {
    result.catch((err) => {
      // Browser may reject fullscreen transitions outside direct user gestures
      return err;
    });
  }
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

export function initImmersionSettings() {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.get === 'function') {
    chrome.storage.sync.get({ [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: true }, (result) => {
      if (result && typeof result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI] === 'boolean') {
        applyAutoHideUiSetting(result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI]);
      }
    });
  } else if (typeof GM_getValue === 'function') {
    const savedAutoHide = GM_getValue(CONFIG.STORAGE_KEY_AUTO_HIDE_UI, true);
    if (typeof savedAutoHide === 'boolean') {
      applyAutoHideUiSetting(savedAutoHide);
    }
  }

  if (
    !hasBoundStorageSync &&
    typeof chrome !== 'undefined' &&
    chrome.storage &&
    chrome.storage.onChanged &&
    typeof chrome.storage.onChanged.addListener === 'function'
  ) {
    hasBoundStorageSync = true;
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'sync' || !changes) return;
      const change = changes[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
      if (change && typeof change.newValue === 'boolean') {
        applyAutoHideUiSetting(change.newValue);
      }
    });
  }
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

function isEditableTarget(target) {
  if (!target) return false;
  const tag = typeof target.tagName === 'string' ? target.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(target.isContentEditable);
}

function isExternalModalOpen() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') {
    return false;
  }
  const openModal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
  if (!openModal) return false;
  const { overlayEl } = state.elements;
  return !overlayEl || (typeof overlayEl.contains === 'function' && !overlayEl.contains(openModal));
}

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

  const action = KEY_ACTIONS[e.key];
  if (action) {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    action();
  }
}

function bindImmersionEvents(overlayEl, sliderEl) {
  overlayEl.addEventListener('mousemove', () => {
    resetIdleTimer();
  });

  const headerEl = typeof overlayEl.querySelector === 'function'
    ? overlayEl.querySelector('.disagall-header')
    : null;
  if (headerEl) {
    headerEl.addEventListener('mouseenter', () => {
      isHeaderHovered = true;
    });
    headerEl.addEventListener('mouseleave', () => {
      isHeaderHovered = false;
      resetIdleTimer();
    });
  }

  if (sliderEl) {
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
}

export function createOverlay() {
  if (state.elements.overlayEl) return;

  const overlay = document.createElement('div');
  overlay.id = 'disagall-viewer-overlay';
  overlay.innerHTML = buildOverlayHtml();
  document.body.appendChild(overlay);

  cacheOverlayElements();

  const { overlayEl, mainImgEl, prevBtnEl, nextBtnEl, sliderEl, sliderValEl, recommendBtnEl } = state.elements;

  const closeBtnEl = document.getElementById('disagall-close-btn');
  if (closeBtnEl) {
    closeBtnEl.addEventListener('click', closeViewer);
  }

  if (recommendBtnEl) {
    recommendBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerPostRecommend();
    });
  }

  if (prevBtnEl) {
    prevBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(-1);
    });
  }

  if (nextBtnEl) {
    nextBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(1);
    });
  }

  if (sliderEl) {
    sliderEl.addEventListener('input', (e) => {
      state.currentPadding = parseInt(e.target.value, 10);
      if (sliderValEl) sliderValEl.textContent = state.currentPadding + 'px';
      applyFittingAndPadding();
      resetIdleTimer();

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: state.currentPadding });
      } else if (typeof GM_setValue !== 'undefined') {
        GM_setValue(CONFIG.STORAGE_KEY_PADDING, state.currentPadding);
      }
    });
  }

  overlayEl.addEventListener('click', (e) => {
    if (e.target === overlayEl || e.target.id === 'disagall-stage' || e.target.id === 'disagall-img-wrapper') {
      closeViewer();
    }
  });

  bindImmersionEvents(overlayEl, sliderEl);
  setupZoomEvents(mainImgEl);
  window.addEventListener('keydown', handleKeyDown, true);
}

export function openViewer(targetSrc, isAuto = false) {
  forcePreloadPostImages();
  collectPostImages();

  if (state.postImages.length === 0) {
    if (!isAuto) {
      alert("디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.");
    }
    return;
  }

  createOverlay();

  let targetIndex = 0;
  const searchUrl = targetSrc ? getCleanOriginalUrl(targetSrc) : state.lastRightClickedImgSrc;

  if (searchUrl) {
    const foundIdx = state.postImages.findIndex(item => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl));
    if (foundIdx !== -1) {
      targetIndex = foundIdx;
    }
  }

  const { overlayEl } = state.elements;
  overlayEl.classList.add('active');
  state.previousBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';

  showUi();
  resetIdleTimer();
  updateRecommendButtonUi();
  showImage(targetIndex);
}

export function closeViewer() {
  clearIdleTimer();
  isHeaderHovered = false;
  isSliderInteracting = false;
  showUi();
  resetZoom();

  const { overlayEl } = state.elements;
  if (overlayEl) {
    overlayEl.classList.remove('active');
    document.body.style.overflow = state.previousBodyOverflow;
  }

  exitFullscreenSafely();
}

export function checkAutoOpen() {
  try {
    const autoOpen = sessionStorage.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN);
    if (autoOpen === '1') {
      sessionStorage.removeItem(CONFIG.STORAGE_KEY_AUTO_OPEN);

      let attempts = 0;
      const maxAttempts = CONFIG.AUTO_OPEN_MAX_ATTEMPTS;
      const pollTimer = setInterval(() => {
        attempts++;
        forcePreloadPostImages();
        collectPostImages();

        if (state.postImages.length > 0) {
          clearInterval(pollTimer);
          openViewer(null, true);
        } else if (attempts >= maxAttempts) {
          clearInterval(pollTimer);
          showNoPhotoNotice((dir) => navigatePost(dir));
        }
      }, CONFIG.AUTO_OPEN_POLL_INTERVAL);
    }
  } catch (e) {}
}

export function initViewerBase() {
  initImmersionSettings();

  // Contextmenu listener for right clicked images
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG' && isPostBodyImage(target)) {
      state.lastRightClickedImgSrc = getCleanOriginalUrl(target.src);
    } else {
      state.lastRightClickedImgSrc = null;
    }
  }, true);

  // Window resize listener
  let resizeRafId = null;
  window.addEventListener('resize', () => {
    const { overlayEl } = state.elements;
    if (overlayEl && overlayEl.classList.contains('active')) {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        applyFittingAndPadding();
        resizeRafId = null;
      });
    }
  });

  // Test open listener
  window.addEventListener('message', (event) => {
    if (event.origin && event.origin !== window.location.origin && window.location.origin !== 'null') return;
    if (event.data && event.data.action === 'disagall_test_open') {
      openViewer();
    }
  });

  // Auto open trigger
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoOpen);
  } else {
    checkAutoOpen();
  }
}
