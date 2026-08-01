// ==UserScript==
// @name         디시 사진 뷰어 (Disagall Viewer - Safari / Tampermonkey)
// @namespace    https://gall.dcinside.com/
// @version      1.0.0
// @description  디시인사이드 게시글 사진을 화면에 맞춰 원본 화질 그대로 감상하는 유저스크립트 (Safari 지원)
// @author       Beomjun Kim
// @match        https://gall.dcinside.com/*
// @match        https://*.dcinside.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
  'use strict';

  // 1. Inject Stylesheet
  const cssStyles = `
/* Disagall Viewer Overlay Styles */
#disagall-viewer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(8, 9, 12, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 99999999;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  user-select: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.25s;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  box-sizing: border-box;
  color: #f0f2f5;
  overflow: hidden;
}

#disagall-viewer-overlay.active {
  opacity: 1;
  visibility: visible;
}

/* Header Controls Bar */
.disagall-header {
  width: 100%;
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%);
  z-index: 10;
  box-sizing: border-box;
}

.disagall-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.disagall-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.3px;
  color: #3b82f6;
  display: flex;
  align-items: center;
  gap: 6px;
}

.disagall-counter {
  font-size: 14px;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.12);
  padding: 4px 10px;
  border-radius: 20px;
  color: #e2e8f0;
}

.disagall-info-badge {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  background: rgba(255, 255, 255, 0.06);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.disagall-header-center {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(20, 24, 33, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 6px 16px;
  border-radius: 30px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
}

.disagall-padding-control {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #cbd5e1;
}

.disagall-slider-label {
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.disagall-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 110px;
  height: 4px;
  border-radius: 2px;
  background: #334155;
  outline: none;
  cursor: pointer;
}

.disagall-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: transform 0.15s ease, background-color 0.15s ease;
}

.disagall-slider::-webkit-slider-thumb:hover {
  transform: scale(1.25);
  background: #60a5fa;
}

.disagall-padding-val {
  min-width: 38px;
  font-weight: 600;
  font-size: 12px;
  color: #60a5fa;
  text-align: right;
}

.disagall-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.disagall-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #f1f5f9;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.15s ease;
}

.disagall-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  border-color: rgba(255, 255, 255, 0.25);
  transform: translateY(-1px);
}

.disagall-btn-close {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.35);
  color: #fca5a5;
  font-size: 16px;
  font-weight: bold;
  padding: 6px 14px;
}

.disagall-btn-close:hover {
  background: rgba(239, 68, 68, 0.4);
  color: #ffffff;
}

/* Stage & Main Photo Area */
.disagall-stage {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
}

.disagall-img-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
  position: relative;
  transition: all 0.2s ease-out;
}

.disagall-img {
  display: block;
  object-fit: contain;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  border-radius: 2px;
  transition: max-width 0.15s ease, max-height 0.15s ease, opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: transform, max-width, max-height;
}

.disagall-img.portrait {
  height: 100%;
  width: auto;
}

.disagall-img.landscape {
  width: 100%;
  height: auto;
}

/* Navigation Arrow Buttons */
.disagall-nav-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 54px;
  height: 90px;
  background: rgba(15, 17, 23, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  z-index: 20;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.disagall-nav-btn-prev {
  left: 0;
  border-top-right-radius: 12px;
  border-bottom-right-radius: 12px;
  border-left: none;
}

.disagall-nav-btn-next {
  right: 0;
  border-top-left-radius: 12px;
  border-bottom-left-radius: 12px;
  border-right: none;
}

.disagall-nav-btn:hover {
  background: rgba(30, 41, 59, 0.85);
  border-color: rgba(59, 130, 246, 0.4);
  width: 64px;
}

.disagall-nav-btn svg {
  width: 24px;
  height: 24px;
  fill: currentColor;
}

.disagall-nav-hint {
  font-size: 10px;
  font-weight: 600;
  color: #94a3b8;
  margin-top: 4px;
}

.disagall-nav-btn.disabled {
  opacity: 0.25;
  cursor: not-allowed;
  pointer-events: none;
}

/* Footer & Hints */
.disagall-footer {
  width: 100%;
  padding: 10px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 100%);
  z-index: 10;
  box-sizing: border-box;
}

.disagall-keyhints {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #94a3b8;
}

.disagall-keyhint {
  display: flex;
  align-items: center;
  gap: 5px;
}

.disagall-kbd {
  background: rgba(255, 255, 255, 0.12);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  padding: 2px 6px;
  font-size: 11px;
  font-weight: 600;
  color: #f1f5f9;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

/* Loader Animation */
.disagall-loader {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #60a5fa;
  font-size: 14px;
  font-weight: 500;
  z-index: 15;
}

.disagall-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(59, 130, 246, 0.2);
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: disagall-spin 0.8s linear infinite;
}

@keyframes disagall-spin {
  to { transform: rotate(360deg); }
}

/* Floating Quick Launcher Button for Safari */
#disagall-quick-launcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999990;
  background: linear-gradient(135deg, #2563eb, #1d4ed8);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 30px;
  padding: 10px 18px;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.4);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
}

#disagall-quick-launcher:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 12px 32px rgba(37, 99, 235, 0.6);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
}
`;

  if (typeof GM_addStyle !== 'undefined') {
    GM_addStyle(cssStyles);
  } else {
    const styleEl = document.createElement('style');
    styleEl.textContent = cssStyles;
    document.head.appendChild(styleEl);
  }

  // 2. Logic Implementation
  let postImages = [];
  let currentIndex = 0;
  let currentPadding = typeof GM_getValue !== 'undefined' ? GM_getValue('defaultPadding', 24) : 24;
  let overlayEl = null;
  let mainImgEl = null;
  let counterEl = null;
  let infoBadgeEl = null;
  let sliderEl = null;
  let sliderValEl = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let loaderEl = null;

  // Zoom & Pan state variables
  let zoomScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let transformRafId = null;

  function updateImgTransform() {
    if (!mainImgEl) return;
    if (transformRafId) cancelAnimationFrame(transformRafId);

    transformRafId = requestAnimationFrame(() => {
      if (zoomScale <= 1.001) {
        zoomScale = 1.0;
        panX = 0;
        panY = 0;
        mainImgEl.style.transform = `translate(0px, 0px) scale(1)`;
        mainImgEl.style.cursor = 'default';
        if (infoBadgeEl && mainImgEl.naturalWidth) {
          const isPortrait = mainImgEl.naturalHeight >= mainImgEl.naturalWidth;
          infoBadgeEl.textContent = isPortrait ? `세로 사진 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})` : `가로 사진 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})`;
        }
      } else {
        mainImgEl.style.cursor = isDragging ? 'grabbing' : 'grab';
        mainImgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${zoomScale.toFixed(2)})`;
        if (infoBadgeEl) {
          infoBadgeEl.textContent = `🔍 확대: ${(zoomScale * 100).toFixed(0)}% (드래그로 이동 / 더블클릭 초기화)`;
        }
      }
    });
  }

  function resetZoom() {
    zoomScale = 1.0;
    panX = 0;
    panY = 0;
    isDragging = false;
    updateImgTransform();
  }

  function getCleanOriginalUrl(rawUrl) {
    if (!rawUrl) return '';
    let cleanUrl = rawUrl.replace(/[\?&]type=[^&]+/g, '');
    if (cleanUrl.includes('dcinside.com/viewimage.php')) {
      if (!cleanUrl.includes('no_gsc=1')) {
        cleanUrl += (cleanUrl.includes('?') ? '&' : '?') + 'no_gsc=1';
      }
    }
    return cleanUrl;
  }

  function getBestImgUrl(img) {
    if (!img) return '';
    let rawUrl = img.getAttribute('data-original') || 
                 img.getAttribute('data-src') || 
                 (img.dataset ? (img.dataset.original || img.dataset.src) : '') || 
                 img.src || 
                 '';
    if (!rawUrl) return '';
    if (rawUrl.includes('gallview_loading') || rawUrl.includes('loading') || rawUrl.includes('blank.gif') || rawUrl.includes('nstatic.dcinside.com')) {
      const dataOrig = img.getAttribute('data-original') || img.getAttribute('data-src') || (img.dataset ? (img.dataset.original || img.dataset.src) : '');
      if (dataOrig) rawUrl = dataOrig;
    }
    return getCleanOriginalUrl(rawUrl);
  }

  function isPostBodyImage(img) {
    if (!img) return false;
    if (img.width > 0 && img.width < 100 && img.height > 0 && img.height < 100) return false;
    const postContainers = [
      '.writing_view_box',
      '.thum-txtin',
      '.usertxt',
      '.gallview_contents',
      '.btn_recommend_box',
      '#dc_contents'
    ];
    for (const selector of postContainers) {
      if (img.closest(selector)) return true;
    }
    return false;
  }

  function forcePreloadPostImages() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (isPostBodyImage(img)) {
        const orig = img.getAttribute('data-original') || img.getAttribute('data-src') || (img.dataset ? (img.dataset.original || img.dataset.src) : '');
        if (orig && (img.src !== orig || img.src.includes('blank.gif') || img.src.includes('loading'))) {
          img.src = orig;
        }
      }
    });
  }

  function collectPostImages() {
    postImages = [];
    const images = document.querySelectorAll('img');
    const seenUrls = new Set();

    images.forEach(img => {
      if (isPostBodyImage(img)) {
        const url = getBestImgUrl(img);
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          postImages.push({
            url: url,
            alt: img.alt || '디시 사진 원본',
            element: img
          });
        }
      }
    });
  }

  function applyFittingAndPadding() {
    if (!mainImgEl || !overlayEl) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const headerH = 60;
    const footerH = 40;

    const availW = Math.max(100, viewportW - (currentPadding * 2));
    const availH = Math.max(100, viewportH - headerH - footerH - (currentPadding * 2));

    const stageEl = overlayEl.querySelector('.disagall-stage');
    if (stageEl) {
      stageEl.style.padding = `${currentPadding}px`;
    }

    mainImgEl.style.maxWidth = `${availW}px`;
    mainImgEl.style.maxHeight = `${availH}px`;
  }

  function createOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'disagall-viewer-overlay';

    overlayEl.innerHTML = `
      <div class="disagall-header">
        <div class="disagall-header-left">
          <div class="disagall-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
              <circle cx="12" cy="13" r="4"></circle>
            </svg>
            디시 사진 뷰어
          </div>
          <div class="disagall-counter" id="disagall-counter">1 / 1</div>
          <div class="disagall-info-badge" id="disagall-info-badge">로딩 중...</div>
        </div>

        <div class="disagall-header-center">
          <div class="disagall-padding-control" title="더블클릭시 24px로 리셋됩니다">
            <span class="disagall-slider-label">🖼️ 여백(패딩):</span>
            <input type="range" class="disagall-slider" id="disagall-slider" min="0" max="100" value="${currentPadding}">
            <span class="disagall-padding-val" id="disagall-slider-val">${currentPadding}px</span>
          </div>
        </div>

        <div class="disagall-header-right">
          <button class="disagall-btn" id="disagall-btn-orig" title="새 탭에서 원본 이미지 파일 바로 열기">
            🔗 원본 링크
          </button>
          <button class="disagall-btn disagall-btn-close" id="disagall-btn-close" title="닫기 (Esc)">
            ✕
          </button>
        </div>
      </div>

      <div class="disagall-stage">
        <div class="disagall-loader" id="disagall-loader">
          <div class="disagall-spinner"></div>
          <span>고화질 원본 로딩 중...</span>
        </div>
        <div class="disagall-img-wrapper" id="disagall-img-wrapper">
          <img class="disagall-img" id="disagall-main-img" src="" alt="디시 원본 사진" referrerpolicy="no-referrer-when-downgrade">
        </div>
        <button class="disagall-nav-btn disagall-nav-btn-prev" id="disagall-prev">
          <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <span class="disagall-nav-hint">이전 (←)</span>
        </button>
        <button class="disagall-nav-btn disagall-nav-btn-next" id="disagall-next">
          <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          <span class="disagall-nav-hint">다음 (→)</span>
        </button>
      </div>

      <div class="disagall-footer">
        <div class="disagall-keyhints">
          <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">휠/트랙패드</span> 자유 확대/축소</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 화면 이동</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">Esc</span> 닫기</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    mainImgEl = document.getElementById('disagall-main-img');
    counterEl = document.getElementById('disagall-counter');
    infoBadgeEl = document.getElementById('disagall-info-badge');
    sliderEl = document.getElementById('disagall-slider');
    sliderValEl = document.getElementById('disagall-slider-val');
    prevBtnEl = document.getElementById('disagall-prev');
    nextBtnEl = document.getElementById('disagall-next');
    loaderEl = document.getElementById('disagall-loader');

    // Event listeners
    document.getElementById('disagall-btn-close').addEventListener('click', closeViewer);
    prevBtnEl.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
    nextBtnEl.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });

    document.getElementById('disagall-btn-orig').addEventListener('click', () => {
      if (postImages[currentIndex]) {
        window.open(postImages[currentIndex].url, '_blank');
      }
    });

    sliderEl.addEventListener('input', (e) => {
      currentPadding = parseInt(e.target.value, 10);
      if (sliderValEl) sliderValEl.textContent = currentPadding + 'px';
      if (typeof GM_setValue !== 'undefined') GM_setValue('defaultPadding', currentPadding);
      applyFittingAndPadding();
    });

    sliderEl.parentElement.addEventListener('dblclick', () => {
      currentPadding = 24;
      sliderEl.value = 24;
      if (sliderValEl) sliderValEl.textContent = '24px';
      if (typeof GM_setValue !== 'undefined') GM_setValue('defaultPadding', 24);
      applyFittingAndPadding();
    });

    // Zoom & Pan Mouse Wheel Listener
    const wrapper = document.getElementById('disagall-img-wrapper');
    wrapper.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      const newScale = Math.min(Math.max(1.0, zoomScale * zoomFactor), 8.0);
      if (newScale === 1.0) {
        resetZoom();
      } else {
        zoomScale = newScale;
        updateImgTransform();
      }
    }, { passive: false });

    // Drag Listener
    wrapper.addEventListener('mousedown', (e) => {
      if (zoomScale <= 1.05) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      updateImgTransform();
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;
      updateImgTransform();
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        updateImgTransform();
      }
    });

    wrapper.addEventListener('dblclick', () => {
      resetZoom();
    });

    window.addEventListener('keydown', handleKeyDown);
  }

  function showImage(index) {
    if (postImages.length === 0) return;
    resetZoom();
    currentIndex = (index + postImages.length) % postImages.length;
    const imgData = postImages[currentIndex];

    if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${postImages.length}`;
    if (prevBtnEl) prevBtnEl.classList.toggle('disabled', postImages.length <= 1);
    if (nextBtnEl) nextBtnEl.classList.toggle('disabled', postImages.length <= 1);

    loaderEl.style.display = 'flex';
    mainImgEl.style.opacity = '0';
    mainImgEl.referrerPolicy = 'no-referrer-when-downgrade';

    const tempImg = new Image();
    tempImg.referrerPolicy = 'no-referrer-when-downgrade';
    tempImg.onload = () => {
      mainImgEl.src = tempImg.src;
      mainImgEl.alt = imgData.alt;
      loaderEl.style.display = 'none';
      mainImgEl.style.opacity = '1';
      applyFittingAndPadding();
    };
    tempImg.onerror = () => {
      const fallbackSrc = (imgData.element && (imgData.element.currentSrc || imgData.element.src)) || imgData.url;
      mainImgEl.src = fallbackSrc;
      mainImgEl.alt = imgData.alt;
      loaderEl.style.display = 'none';
      mainImgEl.style.opacity = '1';
      applyFittingAndPadding();
    };
    tempImg.src = imgData.url;
  }

  function navigate(direction) {
    showImage(currentIndex + direction);
  }

  function handleKeyDown(e) {
    if (!overlayEl || !overlayEl.classList.contains('active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeViewer();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      navigate(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      navigate(1);
    }
  }

  function openViewer(targetSrc) {
    forcePreloadPostImages();
    collectPostImages();

    if (postImages.length === 0) {
      alert("디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.");
      return;
    }

    createOverlay();

    let targetIndex = 0;
    const searchUrl = targetSrc ? getCleanOriginalUrl(targetSrc) : null;
    if (searchUrl) {
      const foundIdx = postImages.findIndex(item => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl));
      if (foundIdx !== -1) targetIndex = foundIdx;
    }

    overlayEl.classList.add('active');
    document.body.style.overflow = 'hidden';
    showImage(targetIndex);
  }

  function closeViewer() {
    if (overlayEl) {
      overlayEl.classList.remove('active');
      document.body.style.overflow = '';
    }
  }

  function initQuickLauncher() {
    const isPostPage = document.querySelector('.writing_view_box, .thum-txtin, .usertxt, .gallview_contents, #dc_contents');
    if (!isPostPage) return;

    if (document.getElementById('disagall-quick-launcher')) return;

    const launcher = document.createElement('button');
    launcher.id = 'disagall-quick-launcher';
    launcher.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      📷 뷰어 열기 (V)
    `;
    launcher.title = '디시 사진 뷰어로 화면 맞춤 원본 감상 (단축키: V)';
    launcher.addEventListener('click', () => openViewer());
    document.body.appendChild(launcher);
  }

  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return;
    }
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      if (!overlayEl || !overlayEl.classList.contains('active')) {
        openViewer();
      }
    }
  });

  document.addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (img && isPostBodyImage(img)) {
      const url = getBestImgUrl(img);
      openViewer(url);
    }
  }, true);

  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand("📷 디시 사진 뷰어 실행", () => openViewer());
  }

  window.addEventListener('DOMContentLoaded', initQuickLauncher);
  setTimeout(initQuickLauncher, 1000);

})();
