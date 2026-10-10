// Zoom and Pan Engine for Disagall Viewer
import { state } from '../state.js';

export function onWindowMouseMove(e) {
  if (!state.zoom.isDragging) return;
  state.zoom.panX = e.clientX - state.zoom.startX;
  state.zoom.panY = e.clientY - state.zoom.startY;
  updateImgTransform();
}

export function onWindowMouseUp() {
  if (state.zoom.isDragging) {
    state.zoom.isDragging = false;
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
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

export function resetZoom() {
  state.zoom.scale = 1.0;
  state.zoom.panX = 0;
  state.zoom.panY = 0;
  if (state.zoom.isDragging) {
    state.zoom.isDragging = false;
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mouseup', onWindowMouseUp);
  }
  updateImgTransform();
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
  }, { passive: false });

  mainImgEl.addEventListener('mousedown', (e) => {
    if (state.zoom.scale > 1.0 && e.button === 0) {
      e.preventDefault();
      state.zoom.isDragging = true;
      state.zoom.startX = e.clientX - state.zoom.panX;
      state.zoom.startY = e.clientY - state.zoom.panY;

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
