// Overlay Control Event Bindings (Buttons, Slider, Backdrop) for Disagall Viewer
import { state } from '../state.js';
import { applyFittingAndPadding } from '../ui/overlay.js';
import { consumeSuppressedBackdropClick } from '../ui/zoom_pan.js';
import { triggerPostRecommend } from './recommend_controller.js';
import { navigate } from './image_loader.js';
import { resetIdleTimer, toggleFullscreen, normalizePaddingValue } from './immersion_controller.js';
import {
  persistPaddingSetting,
  clearPaddingSaveTimer,
  schedulePaddingSave,
  markLocalPaddingModified
} from './storage_sync.js';

function bindStopPropagationClick(el, handler) {
  if (!el) return;
  el.addEventListener('click', (e) => {
    e.stopPropagation();
    handler();
  });
}

function bindOverlayButtons(onCloseViewer) {
  const { prevBtnEl, nextBtnEl, recommendBtnEl, fullscreenBtnEl } = state.elements;
  const closeBtnEl = document.getElementById('disagall-close-btn');
  if (closeBtnEl) closeBtnEl.addEventListener('click', onCloseViewer);
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
    if (e?.target?.value !== undefined) {
      applySliderPaddingInput(e.target.value, sliderValEl);
    } else {
      markLocalPaddingModified();
    }
    clearPaddingSaveTimer();
    persistPaddingSetting();
  });
}

function bindOverlayBackdrop(overlayEl, onCloseViewer) {
  if (!overlayEl) return;
  overlayEl.addEventListener('click', (e) => {
    if (consumeSuppressedBackdropClick()) return;
    const target = e?.target;
    if (!target) return;
    if (target === overlayEl || target.id === 'disagall-stage' || target.id === 'disagall-img-wrapper') {
      onCloseViewer();
    }
  });
}

export function bindOverlayControls(onCloseViewer) {
  const { overlayEl, sliderEl, sliderValEl } = state.elements;
  bindOverlayButtons(onCloseViewer);
  bindPaddingSlider(sliderEl, sliderValEl);
  bindOverlayBackdrop(overlayEl, onCloseViewer);
}
