// Overlay UI and Fitting Engine for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { isEditableTarget, isExternalModalOpen } from './dom_guards.js';
import { showNoPhotoNotice, dismissNoPhotoNotice } from './no_photo_notice.js';
import {
  buildOverlayHtml,
  buildOverlayHeaderHtml,
  buildOverlayStageHtml,
  buildOverlayFooterHtml,
} from './overlay_template.js';

export {
  buildOverlayHtml,
  buildOverlayHeaderHtml,
  buildOverlayStageHtml,
  buildOverlayFooterHtml,
  isEditableTarget,
  isExternalModalOpen,
  showNoPhotoNotice,
  dismissNoPhotoNotice,
};

const MIN_VIEWPORT_SIZE = 100;
const DEFAULT_HEADER_HEIGHT = 52;
const DEFAULT_FOOTER_HEIGHT = 38;

export function formatImageOrientationLabel(nw, nh) {
  return nh >= nw ? `세로 사진 (${nw}x${nh})` : `가로 사진 (${nw}x${nh})`;
}

export function cacheOverlayElements() {
  state.elements.overlayEl = document.getElementById('disagall-viewer-overlay');
  state.elements.stageEl = document.getElementById('disagall-stage');
  state.elements.mainImgEl = document.getElementById('disagall-main-img');
  state.elements.counterEl = document.getElementById('disagall-counter');
  state.elements.infoBadgeEl = document.getElementById('disagall-info-badge');
  state.elements.sliderEl = document.getElementById('disagall-slider');
  state.elements.sliderValEl = document.getElementById('disagall-slider-val');
  state.elements.prevBtnEl = document.getElementById('disagall-prev-btn');
  state.elements.nextBtnEl = document.getElementById('disagall-next-btn');
  state.elements.loaderEl = document.getElementById('disagall-loader');
  state.elements.toastEl = document.getElementById('disagall-toast');
  state.elements.recommendBtnEl = document.getElementById('disagall-btn-recommend');
  state.elements.fullscreenBtnEl = document.getElementById('disagall-btn-fullscreen');
}

function isUiHiddenState(overlayEl) {
  if (state.isUiHidden) return true;
  if (!overlayEl || !overlayEl.classList) return false;
  return (
    overlayEl.classList.contains('disagall-idle') ||
    overlayEl.classList.contains('disagall-ui-hidden')
  );
}

function getOverlayChromeHeights(overlayEl) {
  if (isUiHiddenState(overlayEl)) {
    return { headerHeight: 0, footerHeight: 0 };
  }
  const hasQuery = overlayEl && typeof overlayEl.querySelector === 'function';
  const headerEl = hasQuery ? overlayEl.querySelector('.disagall-header') : null;
  const footerEl = hasQuery ? overlayEl.querySelector('.disagall-footer') : null;
  return {
    headerHeight: headerEl && headerEl.offsetHeight ? headerEl.offsetHeight : DEFAULT_HEADER_HEIGHT,
    footerHeight: footerEl && footerEl.offsetHeight ? footerEl.offsetHeight : DEFAULT_FOOTER_HEIGHT,
  };
}

function resolveStageElement(overlayEl) {
  if (state.elements.stageEl) return state.elements.stageEl;
  if (overlayEl && typeof overlayEl.querySelector === 'function') {
    return overlayEl.querySelector('#disagall-stage') || overlayEl.querySelector('.disagall-stage');
  }
  return typeof document !== 'undefined' ? document.getElementById('disagall-stage') : null;
}

function applyStageChromePadding(overlayEl) {
  const heights = getOverlayChromeHeights(overlayEl);
  const stageEl = resolveStageElement(overlayEl);
  if (stageEl && stageEl.style) {
    stageEl.style.paddingTop = `${heights.headerHeight}px`;
    stageEl.style.paddingBottom = `${heights.footerHeight}px`;
  }
  return heights;
}

function applyFittedImageDimensions(mainImgEl, nw, nh, headerHeight, footerHeight) {
  const effectivePadding = state.isFullscreenMode ? 0 : state.currentPadding;
  const availableHeight = Math.max(MIN_VIEWPORT_SIZE, window.innerHeight - headerHeight - footerHeight - (effectivePadding * 2));
  const availableWidth = Math.max(MIN_VIEWPORT_SIZE, window.innerWidth - (effectivePadding * 2));
  const scale = Math.min(availableWidth / nw, availableHeight / nh);

  mainImgEl.style.maxWidth = `${Math.round(nw * scale)}px`;
  mainImgEl.style.maxHeight = `${Math.round(nh * scale)}px`;
  mainImgEl.style.width = '100%';
  mainImgEl.style.height = '100%';
}

function updateOrientationUi(mainImgEl, infoBadgeEl, nw, nh) {
  const isPortrait = nh >= nw;
  if (infoBadgeEl) {
    infoBadgeEl.textContent = formatImageOrientationLabel(nw, nh);
  }
  mainImgEl.classList.toggle('portrait', isPortrait);
  mainImgEl.classList.toggle('landscape', !isPortrait);
}

export function applyFittingAndPadding() {
  const { mainImgEl, overlayEl, infoBadgeEl } = state.elements;
  if (!mainImgEl || !mainImgEl.naturalWidth || !mainImgEl.naturalHeight) return;

  const nw = mainImgEl.naturalWidth;
  const nh = mainImgEl.naturalHeight;
  const { headerHeight, footerHeight } = applyStageChromePadding(overlayEl);
  applyFittedImageDimensions(mainImgEl, nw, nh, headerHeight, footerHeight);
  updateOrientationUi(mainImgEl, infoBadgeEl, nw, nh);
}

let toastSeq = 0;

export function dismissViewerToast() {
  toastSeq += 1;
  if (state.toastTimer !== null) {
    clearTimeout(state.toastTimer);
    state.toastTimer = null;
  }
  const { toastEl } = state.elements;
  if (toastEl && toastEl.classList) {
    toastEl.classList.remove('show');
  }
}

export function showViewerToast(message, duration = CONFIG.TOAST_DURATION) {
  const { toastEl } = state.elements;
  if (!toastEl) return;
  if (state.toastTimer !== null) clearTimeout(state.toastTimer);

  const seq = ++toastSeq;
  let fired = false;
  toastEl.textContent = message;
  toastEl.classList.add('show');

  const timerId = setTimeout(() => {
    fired = true;
    if (seq !== toastSeq) return;
    state.toastTimer = null;
    if (toastEl && toastEl.classList) toastEl.classList.remove('show');
  }, duration);
  state.toastTimer = fired ? null : timerId;
}
