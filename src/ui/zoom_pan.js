// Zoom and Pan Engine for Disagall Viewer
import { state } from '../state.js';
import { applyFittingAndPadding } from './overlay.js';

function clearSuppressBackdropClick() {
  state.zoom.suppressNextBackdropClick = false;
  if (state.zoom.suppressClickTimer !== null) {
    clearTimeout(state.zoom.suppressClickTimer);
    state.zoom.suppressClickTimer = null;
  }
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
  window.removeEventListener('mousemove', onWindowMouseMove);
  window.removeEventListener('mouseup', onWindowMouseUp);
  if (wasDragging) {
    updateImgTransform();
  }
}

export function updateImgTransform() {
  const { mainImgEl, infoBadgeEl } = state.elements;
  if (!mainImgEl) return;
  if (state.zoom.transformRafId) cancelAnimationFrame(state.zoom.transformRafId);

  state.zoom.transformRafId = requestAnimationFrame(() => {
    if (state.zoom.scale <= 1.001) {
      state.zoom.scale = 1.0;
      state.zoom.panX = 0;
      state.zoom.panY = 0;
      mainImgEl.style.transform = `translate(0px, 0px) scale(1)`;
      mainImgEl.style.cursor = 'default';
      if (infoBadgeEl && mainImgEl.naturalWidth) {
        const isPortrait = mainImgEl.naturalHeight >= mainImgEl.naturalWidth;
        infoBadgeEl.textContent = isPortrait
          ? `세로 사진 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})`
          : `가로 사진 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})`;
      }
    } else {
      mainImgEl.style.cursor = state.zoom.isDragging ? 'grabbing' : 'grab';
      mainImgEl.style.transform = `translate(${state.zoom.panX}px, ${state.zoom.panY}px) scale(${state.zoom.scale.toFixed(2)})`;
      if (infoBadgeEl) {
        infoBadgeEl.textContent = `🔍 확대: ${(state.zoom.scale * 100).toFixed(0)}% (드래그로 이동 / 더블클릭 초기화)`;
      }
    }
  });
}

export function resetZoom(preservePendingRelease = false) {
  state.zoom.scale = 1.0;
  state.zoom.panX = 0;
  state.zoom.panY = 0;
  clearSuppressBackdropClick();
  if (preservePendingRelease && state.zoom.isDragging) {
    state.zoom.isDragging = false;
    state.zoom.pendingDragRelease = true;
    window.removeEventListener('mousemove', onWindowMouseMove);
  } else if (state.zoom.isDragging || state.zoom.pendingDragRelease) {
    state.zoom.isDragging = false;
    state.zoom.pendingDragRelease = false;
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  }
  updateImgTransform();
  applyFittingAndPadding();
}

export function setupZoomEvents(mainImgEl) {
  if (!mainImgEl) return;

  mainImgEl.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    const oldScale = state.zoom.scale;
    state.zoom.scale = Math.min(Math.max(1.0, state.zoom.scale + zoomDelta), 5.0);

    if (state.zoom.scale === 1.0) {
      state.zoom.panX = 0;
      state.zoom.panY = 0;
    } else if (oldScale === 1.0 && state.zoom.scale > 1.0) {
      state.zoom.panX = 0;
      state.zoom.panY = 0;
    }

    updateImgTransform();
    if (oldScale > 1.001 && state.zoom.scale <= 1.001) {
      state.zoom.scale = 1.0;
      applyFittingAndPadding();
    }
  }, { passive: false });

  mainImgEl.addEventListener('mousedown', (e) => {
    if (state.zoom.scale > 1.0 && e.button === 0) {
      e.preventDefault();
      clearSuppressBackdropClick();
      state.zoom.pendingDragRelease = false;
      state.zoom.isDragging = true;
      state.zoom.startX = e.clientX - state.zoom.panX;
      state.zoom.startY = e.clientY - state.zoom.panY;

      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
      updateImgTransform();
    }
  });

  mainImgEl.addEventListener('dblclick', (e) => {
    e.preventDefault();
    if (state.zoom.scale > 1.0) {
      resetZoom();
    } else {
      state.zoom.scale = 2.0;
      state.zoom.panX = 0;
      state.zoom.panY = 0;
      updateImgTransform();
    }
  });
}
