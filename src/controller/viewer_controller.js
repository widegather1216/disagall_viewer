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

export const KEY_ACTIONS = {
  'Escape': () => closeViewer(),
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
  'C': () => triggerPostRecommend()
};

export function handleKeyDown(e) {
  const { overlayEl } = state.elements;
  if (!overlayEl || !overlayEl.classList.contains('active')) return;
  if (e.repeat) return;

  if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
    if (e.key === 'Escape') {
      e.target.blur();
    }
    return;
  }

  const action = KEY_ACTIONS[e.key];
  if (action) {
    e.preventDefault();
    e.stopPropagation();
    action();
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

  document.getElementById('disagall-close-btn').addEventListener('click', closeViewer);

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

  updateRecommendButtonUi();
  showImage(targetIndex);
}

export function closeViewer() {
  const { overlayEl } = state.elements;
  if (overlayEl) {
    overlayEl.classList.remove('active');
    document.body.style.overflow = state.previousBodyOverflow;
  }
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
