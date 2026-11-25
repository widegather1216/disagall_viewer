// Zoom and Pan Engine for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { applyFittingAndPadding, formatImageOrientationLabel } from './overlay.js';

const ZOOM_MIN = 1.0;
const ZOOM_MAX = 5.0;
const ZOOM_STEP = 0.15;
const ZOOM_DBLCLICK_SCALE = 2.0;
const boundZoomImgEls = new WeakSet();

const isViewerActive = () => Boolean(state.elements.overlayEl?.classList?.contains('active'));

export function cancelZoomRaf() {
  if (state.zoom.transformRafId === null) return;
  cancelAnimationFrame(state.zoom.transformRafId);
  state.zoom.transformRafId = null;
}

function clearSuppressBackdropClick() {
  state.zoom.suppressNextBackdropClick = false;
  if (state.zoom.suppressClickTimer === null) return;
  clearTimeout(state.zoom.suppressClickTimer);
  state.zoom.suppressClickTimer = null;
}

function armSuppressBackdropClick() {
  clearSuppressBackdropClick();
  state.zoom.suppressNextBackdropClick = true;
  state.zoom.suppressClickTimer = setTimeout(() => {
    state.zoom.suppressClickTimer = null;
    state.zoom.suppressNextBackdropClick = false;
  }, 0);
}

export function consumeSuppressedBackdropClick() {
  if (!state.zoom.suppressNextBackdropClick) return false;
  clearSuppressBackdropClick();
  return true;
}

function clearWindowDragListeners(includeMouseUp = true) {
  window.removeEventListener('mousemove', onWindowMouseMove);
  if (includeMouseUp) window.removeEventListener('mouseup', onWindowMouseUp);
}

function resetMainImgStyle(mainImgEl) {
  if (!mainImgEl) return;
  mainImgEl.style.transform = 'translate(0px, 0px) scale(1)';
  mainImgEl.style.cursor = 'default';
}

export function onWindowMouseMove(e) {
  if (!state.zoom.isDragging) return;
  state.zoom.panX = e.clientX - state.zoom.startX;
  state.zoom.panY = e.clientY - state.zoom.startY;
  updateImgTransform();
}

export function onWindowMouseUp(e) {
  if (e && typeof e.button === 'number' && e.button !== 0) return;
  if (!state.zoom.isDragging && !state.zoom.pendingDragRelease) return;
  const wasDragging = state.zoom.isDragging;
  state.zoom.isDragging = false;
  state.zoom.pendingDragRelease = false;
  armSuppressBackdropClick();
  clearWindowDragListeners(true);
  if (wasDragging) updateImgTransform();
}

function applyZoomBadgeAndStyle(mainImgEl, infoBadgeEl) {
  if (state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
    Object.assign(state.zoom, { scale: ZOOM_MIN, panX: 0, panY: 0 });
    resetMainImgStyle(mainImgEl);
    if (infoBadgeEl && mainImgEl.naturalWidth) {
      infoBadgeEl.textContent = formatImageOrientationLabel(mainImgEl.naturalWidth, mainImgEl.naturalHeight);
    }
    return;
  }
  mainImgEl.style.cursor = state.zoom.isDragging ? 'grabbing' : 'grab';
  mainImgEl.style.transform = `translate(${state.zoom.panX}px, ${state.zoom.panY}px) scale(${state.zoom.scale.toFixed(2)})`;
  if (infoBadgeEl) {
    infoBadgeEl.textContent = `🔍 확대: ${(state.zoom.scale * 100).toFixed(0)}% (드래그로 이동 / 더블클릭 초기화)`;
  }
}

export function updateImgTransform() {
  const { mainImgEl, infoBadgeEl } = state.elements;
  if (!mainImgEl) return;
  if (!isViewerActive()) return cancelZoomRaf();
  cancelZoomRaf();
  let fired = false;
  const rafId = requestAnimationFrame(() => {
    fired = true;
    state.zoom.transformRafId = null;
    if (isViewerActive()) applyZoomBadgeAndStyle(mainImgEl, infoBadgeEl);
  });
  state.zoom.transformRafId = fired ? null : rafId;
}

function clearDragState(preservePendingRelease) {
  if (!state.zoom.isDragging && !state.zoom.pendingDragRelease) return;
  const keepPending = preservePendingRelease && state.zoom.isDragging;
  state.zoom.isDragging = false;
  state.zoom.pendingDragRelease = keepPending;
  clearWindowDragListeners(!keepPending);
}

export function resetZoom(preservePendingRelease = false) {
  Object.assign(state.zoom, { scale: ZOOM_MIN, panX: 0, panY: 0 });
  clearSuppressBackdropClick();
  clearDragState(preservePendingRelease);
  resetMainImgStyle(state.elements.mainImgEl);
  updateImgTransform();
  applyFittingAndPadding();
}

function handleZoomWheel(e) {
  if (!isViewerActive()) return;
  e.preventDefault();
  const oldScale = state.zoom.scale;
  state.zoom.scale = Math.min(Math.max(ZOOM_MIN, state.zoom.scale + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)), ZOOM_MAX);
  if (state.zoom.scale === ZOOM_MIN || oldScale === ZOOM_MIN) {
    state.zoom.panX = 0;
    state.zoom.panY = 0;
  }
  updateImgTransform();
  if (oldScale > CONFIG.ZOOM_EPSILON && state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
    state.zoom.scale = ZOOM_MIN;
    applyFittingAndPadding();
  }
}

function handleZoomMouseDown(e) {
  if (!isViewerActive() || state.zoom.scale <= ZOOM_MIN || e.button !== 0) return;
  e.preventDefault();
  clearSuppressBackdropClick();
  Object.assign(state.zoom, { pendingDragRelease: false, isDragging: true, startX: e.clientX - state.zoom.panX, startY: e.clientY - state.zoom.panY });
  clearWindowDragListeners(true);
  window.addEventListener('mousemove', onWindowMouseMove);
  window.addEventListener('mouseup', onWindowMouseUp);
  updateImgTransform();
}

function handleZoomDblClick(e) {
  if (!isViewerActive()) return;
  e.preventDefault();
  if (state.zoom.scale > ZOOM_MIN) return resetZoom();
  Object.assign(state.zoom, { scale: ZOOM_DBLCLICK_SCALE, panX: 0, panY: 0 });
  updateImgTransform();
}

export function setupZoomEvents(mainImgEl) {
  if (!mainImgEl || boundZoomImgEls.has(mainImgEl)) return;
  boundZoomImgEls.add(mainImgEl);
  mainImgEl.addEventListener('wheel', handleZoomWheel, { passive: false });
  mainImgEl.addEventListener('mousedown', handleZoomMouseDown);
  mainImgEl.addEventListener('dblclick', handleZoomDblClick);
}
