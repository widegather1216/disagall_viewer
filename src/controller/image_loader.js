// Image Preloading, Navigation, and Target Resolution for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import {
  extractPostImages,
  getCleanOriginalUrl,
  POST_BODY_CONTAINER_SELECTORS,
  isPostBodyImage
} from '../parser/image_parser.js';
import { applyFittingAndPadding } from '../ui/overlay.js';
import { resetZoom } from '../ui/zoom_pan.js';
import { isOverlayActive } from './immersion_controller.js';

let imageLoadSeq = 0;
let renderedLoadSeq = -1;
const boundMainImgEls = new WeakSet();

export function resetImageLoadSeq() {
  imageLoadSeq += 1;
  renderedLoadSeq = -1;
}

function resolveLazyOriginalUrl(img) {
  const attrUrl = img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('data-url');
  if (attrUrl) return attrUrl;
  if (!img.dataset) return null;
  return img.dataset.original || img.dataset.src || img.dataset.url || null;
}

function preloadSinglePostImage(img) {
  if (!isPostBodyImage(img)) return;
  const orig = resolveLazyOriginalUrl(img);
  const needsPreload = img.src.includes('loading') || img.src.includes('blank.gif') || img.classList.contains('lazy');
  if (orig && needsPreload) {
    img.src = orig;
    img.classList.remove('lazy');
  }
}

export function forcePreloadPostImages() {
  const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
  imgs.forEach(preloadSinglePostImage);

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

export function ensureMainImgLoadListener(mainImgEl) {
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

function prepareImageLoadingUi() {
  const { loaderEl, mainImgEl } = state.elements;
  if (loaderEl) loaderEl.style.display = 'flex';
  if (mainImgEl) {
    mainImgEl.style.opacity = '0';
    mainImgEl.referrerPolicy = 'no-referrer-when-downgrade';
  }
  return { loaderEl, mainImgEl };
}

function attachTempImageHandlers(imgData, mainImgEl, loaderEl, seq) {
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

export function showImage(index) {
  if (state.postImages.length === 0) return;

  const seq = ++imageLoadSeq;
  renderedLoadSeq = -1;
  resetZoom(true);
  state.currentIndex = (index + state.postImages.length) % state.postImages.length;
  updateNavAndCounterUi();

  const imgData = state.postImages[state.currentIndex];
  const { loaderEl, mainImgEl } = prepareImageLoadingUi();
  attachTempImageHandlers(imgData, mainImgEl, loaderEl, seq);
}

export function navigate(direction) {
  showImage(state.currentIndex + direction);
}

function findImageIndexByUrl(searchUrl) {
  if (!searchUrl) return -1;
  return state.postImages.findIndex(
    (item) => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl)
  );
}

export function findTargetImageIndex(targetSrc) {
  if (targetSrc) {
    const directIdx = findImageIndexByUrl(getCleanOriginalUrl(targetSrc));
    if (directIdx !== -1) return directIdx;
  }

  const fallbackIdx = findImageIndexByUrl(state.lastRightClickedImgSrc);
  return fallbackIdx !== -1 ? fallbackIdx : 0;
}
