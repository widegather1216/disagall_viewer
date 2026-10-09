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

.disagall-btn-recommend {
  background: rgba(59, 130, 246, 0.2);
  border-color: rgba(96, 165, 250, 0.45);
  color: #93c5fd;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  padding: 6px 13px;
  transition: all 0.2s ease;
}

.disagall-btn-recommend:hover {
  background: rgba(59, 130, 246, 0.38);
  border-color: rgba(96, 165, 250, 0.75);
  color: #ffffff;
  transform: translateY(-1px);
}

.disagall-btn-recommend:active,
.disagall-btn-recommend.voted {
  background: #2563eb;
  border-color: #3b82f6;
  color: #ffffff;
  transform: scale(0.96);
}

.disagall-btn-recommend svg {
  flex-shrink: 0;
  transition: transform 0.2s ease;
}

.disagall-btn-recommend:hover svg {
  transform: scale(1.18) rotate(-6deg);
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

/* Toast Notification */
.disagall-toast {
  position: absolute;
  top: 72px;
  left: 50%;
  transform: translateX(-50%) translateY(-10px);
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.18);
  color: #f8fafc;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: -0.3px;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s;
  z-index: 100;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
}

.disagall-toast.show {
  opacity: 1;
  visibility: visible;
  transform: translateX(-50%) translateY(0);
}

/* No Photo Notice Floating Banner (When navigating into a post without photos / no photo tab) */
.disagall-no-photo-notice {
  position: fixed;
  top: 24px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.94);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(59, 130, 246, 0.2);
  color: #f8fafc;
  padding: 10px 18px;
  border-radius: 30px;
  display: flex;
  align-items: center;
  gap: 16px;
  z-index: 99999999;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
  font-weight: 500;
  animation: disagall-slide-down 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes disagall-slide-down {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.disagall-notice-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.disagall-notice-icon {
  font-size: 16px;
}

.disagall-notice-text {
  color: #e2e8f0;
  letter-spacing: -0.2px;
}

.disagall-notice-btns {
  display: flex;
  align-items: center;
  gap: 6px;
}

.disagall-notice-btn {
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #f1f5f9;
  border-radius: 14px;
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.disagall-notice-btn:hover {
  background: #3b82f6;
  border-color: #60a5fa;
  color: #ffffff;
}

.disagall-notice-btn.close {
  background: transparent;
  border: none;
  color: #94a3b8;
  padding: 4px 8px;
}

.disagall-notice-btn.close:hover {
  color: #ffffff;
}

/* Floating Quick Launcher Button for Safari (Clean & Minimal) */
#disagall-quick-launcher {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 999990;
  background: rgba(15, 23, 42, 0.8);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 24px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  opacity: 0.85;
}

#disagall-quick-launcher:hover {
  opacity: 1;
  transform: translateY(-2px);
  color: #f8fafc;
  background: rgba(30, 41, 59, 0.95);
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
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
  const CONFIG = {
    DEFAULT_PADDING: 24,
    STORAGE_KEY_PADDING: 'defaultPadding',
    STORAGE_KEY_AUTO_OPEN: 'disagall_auto_open',
    TOAST_DURATION: 1800,
    POST_NAV_DELAY: 150,
    AUTO_OPEN_MAX_ATTEMPTS: 15,
    AUTO_OPEN_POLL_INTERVAL: 150,
    RECOMMEND_SYNC_DELAYS: [500, 1200],
    RECOMMEND_THROTTLE_MS: 1200,
    NO_PHOTO_NOTICE_DURATION: 8000
  };

  let postImages = [];
  let currentIndex = 0;
  let currentPadding = typeof GM_getValue !== 'undefined' ? GM_getValue(CONFIG.STORAGE_KEY_PADDING, CONFIG.DEFAULT_PADDING) : CONFIG.DEFAULT_PADDING;
  let overlayEl = null;
  let mainImgEl = null;
  let counterEl = null;
  let infoBadgeEl = null;
  let sliderEl = null;
  let sliderValEl = null;
  let prevBtnEl = null;
  let nextBtnEl = null;
  let loaderEl = null;
  let toastEl = null;
  let toastTimer = null;
  let recommendBtnEl = null;
  let previousBodyOverflow = '';

  // Zoom & Pan state variables
  let zoomScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let transformRafId = null;

  // Drag event listeners with dynamic lifecycle
  function onWindowMouseMove(e) {
    if (!isDragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    updateImgTransform();
  }

  function onWindowMouseUp() {
    if (isDragging) {
      isDragging = false;
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
      updateImgTransform();
    }
  }

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
    if (isDragging) {
      isDragging = false;
      window.removeEventListener('mousemove', onWindowMouseMove);
      window.removeEventListener('mouseup', onWindowMouseUp);
    }
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
                 img.getAttribute('data-url') ||
                 img.getAttribute('data-lazy-src') ||
                 (img.dataset ? (img.dataset.original || img.dataset.src || img.dataset.url) : '') || 
                 img.src || 
                 '';

    if (!rawUrl || rawUrl.includes('gallview_loading') || rawUrl.includes('loading') || rawUrl.includes('blank.gif') || rawUrl.includes('nstatic.dcinside.com')) {
      const dataOrig = img.getAttribute('data-original') || img.getAttribute('data-src') || (img.dataset ? (img.dataset.original || img.dataset.src) : '');
      if (dataOrig && !dataOrig.includes('loading')) {
        rawUrl = dataOrig;
      } else {
        const parentAnchor = img.closest('a');
        if (parentAnchor && parentAnchor.href) {
          const anchorHref = parentAnchor.href;
          if (anchorHref.includes('viewimage.php') || anchorHref.includes('dcimg') || anchorHref.includes('image') || anchorHref.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
            rawUrl = anchorHref;
          }
        }
      }
    }

    return getCleanOriginalUrl(rawUrl);
  }

  function isDcIconOrUiAsset(img, url) {
    if (!url) return true;

    if (
      url.includes('/dcicon/') ||
      url.includes('/emoticon/') ||
      url.includes('/dccon') ||
      url.includes('dccon.php') ||
      url.includes('nik.gif') ||
      url.includes('fix_nik.gif') ||
      url.includes('bestcon') ||
      url.includes('/btn_') ||
      url.includes('icon_') ||
      url.includes('logo') ||
      url.includes('banner') ||
      url.includes('gallview_loading') ||
      url.includes('nstatic.dcinside.com')
    ) {
      return true;
    }

    if (img) {
      if (
        img.classList.contains('written_dccon') ||
        img.classList.contains('dccon') ||
        img.hasAttribute('conalt') ||
        img.hasAttribute('detail') ||
        (img.dataset && img.dataset.dcconoverstatus !== undefined) ||
        (img.title && img.title.includes('갤로그'))
      ) {
        return true;
      }
    }

    return false;
  }

  // Selectors for non-body elements to exclude
  const EXCLUDED_CONTAINER_SELECTORS = [
    '.comment_box',
    '.comment_wrap',
    '.cmt_list',
    '.reply_box',
    '.btn_box',
    '.rcmd_box',
    '.dc_allbanner',
    '.con_banner',
    '#right_box',
    '.side_box',
    '.gall_list',
    '.recommend_box',
    '.pop_info',
    '.attached_file',
    '.option_box',
    '.written_dccon',
    '#ad_nv_slot',
    '.ad_box',
    'header',
    'footer',
    '.gnb',
    '.lnb'
  ].join(', ');

  // Selectors for known post body containers
  const POST_BODY_CONTAINER_SELECTORS = [
    '.write_div',
    '.thum-txtin',
    '.us-txt',
    '.usertxt',
    '.writing_view_box',
    '.gallview_contents',
    '.view_content_wrap',
    '.reading_box',
    '.article-content',
    '#dc_contents',
    '[id*="write_div"]',
    '[class*="write_div"]',
    '.gall_view_box',
    '.view_content',
    '.contents'
  ].join(', ');

  function isPostBodyImage(img) {
    if (!img || img.tagName !== 'IMG') return false;

    // 1. Exclude non-body sections (comments, banners, sidebars, headers, footers)
    if (img.closest(EXCLUDED_CONTAINER_SELECTORS)) return false;

    // 2. Check for DC Cons / UI assets
    const url = getBestImgUrl(img);
    if (isDcIconOrUiAsset(img, url)) return false;

    // 3. Check if inside any known post body container
    if (img.closest(POST_BODY_CONTAINER_SELECTORS)) return true;

    // 4. Fallback check: if url is a known photo upload URL or direct image format
    const isKnownPhotoUrl = url.includes('viewimage.php') ||
                            url.includes('dcimg') ||
                            url.includes('dccdn') ||
                            url.includes('upload') ||
                            url.includes('image.dcinside') ||
                            url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);

    return !!isKnownPhotoUrl;
  }

  function forcePreloadPostImages() {
    const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
    imgs.forEach(img => {
      if (!isPostBodyImage(img)) return;
      const orig = img.getAttribute('data-original') || img.getAttribute('data-src') || img.getAttribute('data-url') || (img.dataset ? (img.dataset.original || img.dataset.src || img.dataset.url) : null);
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

  // Helper to extract image candidates from elements with deduplication
  function extractImagesFromElements(imageElements, seenUrls) {
    const results = [];
    imageElements.forEach((img) => {
      if (!isPostBodyImage(img)) return;

      const cleanUrl = getBestImgUrl(img);
      if (cleanUrl && !seenUrls.has(cleanUrl)) {
        seenUrls.add(cleanUrl);
        results.push({
          url: cleanUrl,
          element: img,
          alt: img.alt || '디시 갤러리 본문 이미지'
        });
      }
    });
    return results;
  }

  // Pure extractor: Find all post body images strictly in given root
  function extractPostImages(root = document) {
    const seenUrls = new Set();
    const collected = [];

    // Find post content containers first
    let containers = Array.from(root.querySelectorAll(POST_BODY_CONTAINER_SELECTORS));
    containers = containers.filter(c => !c.closest(EXCLUDED_CONTAINER_SELECTORS));

    containers.forEach((container) => {
      collected.push(...extractImagesFromElements(container.querySelectorAll('img'), seenUrls));
    });

    // Fallback scan: search all <img> tags if container-based search yielded 0 images
    if (collected.length === 0) {
      collected.push(...extractImagesFromElements(root.querySelectorAll('img'), seenUrls));
    }

    return collected;
  }

  function collectPostImages() {
    postImages = extractPostImages(document);
    return postImages;
  }

  // Apply Fitting Rules & Padding dynamically
  function applyFittingAndPadding() {
    if (!mainImgEl || !overlayEl) return;

    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    const headerEl = overlayEl.querySelector('.disagall-header');
    const footerEl = overlayEl.querySelector('.disagall-footer');
    const headerH = headerEl ? headerEl.offsetHeight : 60;
    const footerH = footerEl ? footerEl.offsetHeight : 40;

    const nw = mainImgEl.naturalWidth;
    const nh = mainImgEl.naturalHeight;

    if (!nw || !nh) {
      mainImgEl.style.width = 'auto';
      mainImgEl.style.height = 'auto';
      mainImgEl.style.maxWidth = `calc(100vw - ${currentPadding * 2}px)`;
      mainImgEl.style.maxHeight = `calc(100vh - ${headerH + footerH + (currentPadding * 2)}px)`;
      return;
    }

    const availW = Math.max(100, viewportW - (currentPadding * 2));
    const availH = Math.max(100, viewportH - headerH - footerH - (currentPadding * 2));

    const stageEl = overlayEl.querySelector('.disagall-stage');
    if (stageEl) {
      stageEl.style.padding = `${currentPadding}px`;
    }

    mainImgEl.style.maxWidth = `${availW}px`;
    mainImgEl.style.maxHeight = `${availH}px`;
  }

  // Build viewer overlay HTML markup
  function buildOverlayHtml() {
    return `
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
          <button class="disagall-btn disagall-btn-recommend" id="disagall-btn-recommend" title="개념글 추천 (단축키: R)">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
            </svg>
            <span>개추</span>
          </button>
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

      <div class="disagall-toast" id="disagall-toast"></div>

      <div class="disagall-footer">
        <div class="disagall-keyhints">
          <div class="disagall-keyhint"><span class="disagall-kbd">R</span> 개추</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">↑</span> <span class="disagall-kbd">↓</span> 이전/다음 글</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">휠/트랙패드</span> 자유 확대/축소</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 화면 이동</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">Esc</span> 닫기</div>
        </div>
      </div>
    `;
  }

  // Cache overlay DOM element references
  function cacheOverlayElements() {
    mainImgEl = document.getElementById('disagall-main-img');
    counterEl = document.getElementById('disagall-counter');
    infoBadgeEl = document.getElementById('disagall-info-badge');
    sliderEl = document.getElementById('disagall-slider');
    sliderValEl = document.getElementById('disagall-slider-val');
    prevBtnEl = document.getElementById('disagall-prev');
    nextBtnEl = document.getElementById('disagall-next');
    loaderEl = document.getElementById('disagall-loader');
    toastEl = document.getElementById('disagall-toast');
    recommendBtnEl = document.getElementById('disagall-btn-recommend');
  }

  // Bind interactive events for overlay
  function bindOverlayEvents() {
    document.getElementById('disagall-btn-close').addEventListener('click', closeViewer);
    prevBtnEl.addEventListener('click', (e) => { e.stopPropagation(); navigate(-1); });
    nextBtnEl.addEventListener('click', (e) => { e.stopPropagation(); navigate(1); });

    if (recommendBtnEl) {
      recommendBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerPostRecommend();
      });
    }

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

    // Drag Listener (dynamically bind mousemove/mouseup)
    wrapper.addEventListener('mousedown', (e) => {
      if (zoomScale <= 1.05) return;
      isDragging = true;
      startX = e.clientX - panX;
      startY = e.clientY - panY;
      updateImgTransform();
      window.addEventListener('mousemove', onWindowMouseMove);
      window.addEventListener('mouseup', onWindowMouseUp);
    });

    wrapper.addEventListener('dblclick', () => {
      resetZoom();
    });

    window.addEventListener('keydown', handleKeyDown);
  }

  // Initialize and Create Overlay DOM
  function createOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'disagall-viewer-overlay';
    overlayEl.innerHTML = buildOverlayHtml();
    document.body.appendChild(overlayEl);

    cacheOverlayElements();
    bindOverlayEvents();
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

  // Show temporary feedback toast inside viewer overlay
  function showViewerToast(message, duration = CONFIG.TOAST_DURATION) {
    if (!toastEl) return;
    if (toastTimer) clearTimeout(toastTimer);

    toastEl.textContent = message;
    toastEl.classList.add('show');

    toastTimer = setTimeout(() => {
      if (toastEl) toastEl.classList.remove('show');
    }, duration);
  }

  // Get post recommend count from page DOM
  function getPostRecommendCount() {
    const countEl = document.querySelector('[id^="recommend_view_up_"], .up_num_box .up_num, .btn_recommend_box .up_num, .recom_num');
    if (countEl) {
      const text = countEl.textContent.trim();
      const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num)) return num;
    }
    return null;
  }

  // Extended selectors for DC Inside recommend buttons across desktop, mobile, and minor/mini galleries
  const RECOMMEND_BUTTON_SELECTORS = [
    'button.btn_recom_up',
    '.btn_recommend_box button.btn_recom_up',
    '.btn_recommend_box button',
    '.btn_recom_up',
    '.btn-recom',
    '.btn_recommend',
    'button[data-action="recommend"]',
    'button[data-type="recommend"]',
    'button[onclick*="recom"]',
    'a[onclick*="recom"]',
    'button.recom_btn',
    'button[id*="recommend"]',
    'button[data-no]',
    'a.btn_recom_up',
    'div.btn_recom_up'
  ].join(', ');

  let lastRecommendTime = 0;
  let isRecommending = false;
  let hasVotedCurrentPost = false;

  // Find native recommend button in the post
  function getNativeRecommendButton() {
    return document.querySelector(RECOMMEND_BUTTON_SELECTORS);
  }

  // Check if current user is logged in on DC Inside
  function isUserLoggedIn() {
    const isLoginInput = document.getElementById('is_login') || document.querySelector('input[name="is_login"]');
    if (isLoginInput && isLoginInput.value) {
      return isLoginInput.value.trim().toUpperCase() === 'Y';
    }

    const loginOutBtn = document.querySelector('.btn_top_loginout, .login_info a, .user_info .logout, a[href*="logout"]');
    if (loginOutBtn) {
      const text = loginOutBtn.textContent.trim();
      if (text.includes('로그아웃')) return true;
      if (text.includes('로그인')) return false;
    }

    if (document.querySelector('.my_nick, .user_name, .btn_logout, .user_info_box')) {
      return true;
    }

    return false;
  }

  // Check if gallery has anti-spam / anti-bot code enforcement (kcaptcha_use = 'Y')
  function isGalleryCodeEnforced() {
    const kcaptchaInput = document.getElementById('kcaptcha_use') || document.querySelector('input[name="kcaptcha_use"]');
    if (kcaptchaInput && kcaptchaInput.value) {
      return kcaptchaInput.value.trim().toUpperCase() === 'Y';
    }

    return !!document.querySelector('#kcaptcha, [id*="kcaptcha"], .captcha_box');
  }

  // Safe single-dispatch for recommend button (native click, fallback to synthetic MouseEvent only on error)
  function dispatchRecommendClick(btn) {
    if (!btn) return false;

    // 1. Attempt native click first - executes all bound event listeners with native bubbling
    if (typeof btn.click === 'function') {
      try {
        btn.click();
        return true;
      } catch (e) {}
    }

    // 2. Fallback to synthetic MouseEvent ONLY if native click is unavailable or throws
    try {
      const mouseEvt = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
        buttons: 1
      });
      return btn.dispatchEvent(mouseEvt);
    } catch (err) {
      return false;
    }
  }

  // Update recommend button label with latest count and login status hints
  function updateRecommendButtonUi() {
    if (!recommendBtnEl) return;
    const count = getPostRecommendCount();
    const countText = count !== null ? ` (${count})` : '';

    const isLoggedIn = isUserLoggedIn();
    const isCodeEnforced = isGalleryCodeEnforced();

    // If gallery strictly enforces code/login for non-members and user is not logged in
    const lockIcon = (!isLoggedIn && isCodeEnforced) ? ' 🔒' : '';
    const hintTitle = (!isLoggedIn && isCodeEnforced) 
      ? '개념글 추천 (비회원 코드/로그인 제한 갤러리 - 단축키: R)' 
      : '개념글 추천 (단축키: R)';

    recommendBtnEl.title = hintTitle;

    recommendBtnEl.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
      </svg>
      <span>개추${countText}${lockIcon}</span>
    `;
  }

  // Trigger post recommend action with single-dispatch, throttling, and login verification
  function triggerPostRecommend() {
    if (isRecommending) return false;

    const now = Date.now();
    if (now - lastRecommendTime < CONFIG.RECOMMEND_THROTTLE_MS) {
      showViewerToast('잠시 후 다시 시도해 주세요.');
      return false;
    }

    const btn = getNativeRecommendButton();
    if (!btn) {
      showViewerToast('본문의 추천 버튼을 찾을 수 없습니다.');
      return false;
    }

    // Edge case: Already voted in this session or button explicitly disabled
    const isAlreadyVoted = hasVotedCurrentPost || 
                           btn.disabled || 
                           (recommendBtnEl && recommendBtnEl.classList.contains('voted'));

    if (isAlreadyVoted) {
      showViewerToast('이미 개념글 추천을 완료한 게시글입니다. 👍');
      return true;
    }

    const isLoggedIn = isUserLoggedIn();
    const isCodeEnforced = isGalleryCodeEnforced();
    const beforeCount = getPostRecommendCount();

    lastRecommendTime = now;
    isRecommending = true;

    try {
      dispatchRecommendClick(btn);

      // Initial feedback toast
      if (!isLoggedIn && isCodeEnforced) {
        showViewerToast('개추 시도 중... (비회원 코드 제한 가능 🔒)');
      } else {
        showViewerToast('개념글 추천을 눌렀습니다! 👍');
      }

      // Check count after DC ajax finishes to verify if recommendation actually succeeded
      setTimeout(() => {
        const midCount = getPostRecommendCount();
        updateRecommendButtonUi();

        if (midCount !== null && beforeCount !== null && midCount > beforeCount) {
          hasVotedCurrentPost = true;
          if (recommendBtnEl) recommendBtnEl.classList.add('voted');
          showViewerToast('개념글 추천이 완료되었습니다! 👍');
        }
      }, CONFIG.RECOMMEND_SYNC_DELAYS[0]); // 500ms

      setTimeout(() => {
        const afterCount = getPostRecommendCount();
        updateRecommendButtonUi();

        if (afterCount !== null && beforeCount !== null) {
          if (afterCount > beforeCount) {
            hasVotedCurrentPost = true;
            if (recommendBtnEl) recommendBtnEl.classList.add('voted');
          } else {
            hasVotedCurrentPost = false;
            // Count didn't increase! Check login / code enforcement edge cases
            if (!isLoggedIn) {
              if (recommendBtnEl) recommendBtnEl.classList.remove('voted');
              showViewerToast('로그인이 필요한 갤러리입니다. (비회원 추천 제한 🔒)', 2500);
            } else {
              showViewerToast('추천이 반영되지 않았습니다. (이미 추천했거나 제한됨)');
            }
          }
        }
      }, CONFIG.RECOMMEND_SYNC_DELAYS[1]); // 1200ms

      return true;
    } catch (e) {
      showViewerToast('추천 실행 중 오류가 발생했습니다.');
      return false;
    } finally {
      setTimeout(() => {
        isRecommending = false;
      }, 500);
    }
  }

  // Extract post ID from DC Inside URL
  function extractPostNo(url) {
    if (!url) return null;
    try {
      const parsed = new URL(url, window.location.origin);
      const no = parsed.searchParams.get('no');
      if (no) return no;
      const match = parsed.pathname.match(/\/(\d+)(?:\/|\?|$)/);
      if (match) return match[1];
    } catch (e) {
      const match = url.match(/[?&]no=(\d+)/) || url.match(/\/(\d+)(?:\/|\?|$)/);
      if (match) return match[1];
    }
    return null;
  }

  // Validate desktop DC post row
  function isDesktopPostRowValid(tr, currentPostNo) {
    const titLink = tr.querySelector('.gall_tit a:not(.reply_numbox)') || tr.querySelector('a');
    if (!titLink || !titLink.href) return false;
    const hrefAttr = titLink.getAttribute('href') || titLink.href || '';
    if (hrefAttr.startsWith('javascript:')) return false;

    // Check if this row is the current post being viewed
    const isCurrentPost = tr.classList.contains('crt') || 
                          tr.className.includes('crt') || 
                          !!tr.querySelector('.crt_icon') || 
                          (currentPostNo && (
                            tr.innerHTML.includes(currentPostNo) || 
                            extractPostNo(titLink.href) === currentPostNo
                          ));

    if (isCurrentPost) return true;

    const numEl = tr.querySelector('.gall_num');
    const subjectEl = tr.querySelector('.gall_subject');
    const numText = numEl ? numEl.textContent.trim() : '';
    const subjectText = subjectEl ? subjectEl.textContent.trim() : '';

    if (numText === '-' || !numText || isNaN(Number(numText))) return false;
    if (subjectText === '공지' || subjectText === 'AD' || subjectText === '설문') return false;
    if (numText === '공지' || numText === '설문') return false;
    if (tr.classList.contains('notice')) return false;

    return true;
  }

  // Validate mobile DC post item
  function isMobilePostItemValid(li) {
    const link = li.querySelector('a');
    if (!link || !link.href) return false;
    const hrefAttr = link.getAttribute('href') || link.href || '';
    if (hrefAttr.startsWith('javascript:')) return false;
    if (li.classList.contains('notice') || li.querySelector('.sp-notice')) return false;
    return true;
  }

  // Parse valid post rows from desktop or mobile list
  function getValidPostRows(currentPostNo) {
    const tableRows = Array.from(document.querySelectorAll('table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content'));
    if (tableRows.length > 0) {
      return tableRows.filter(tr => isDesktopPostRowValid(tr, currentPostNo));
    }
    const mobileItems = Array.from(document.querySelectorAll('.gall-detail-lst li, .gall-thum-btm li'));
    return mobileItems.filter(isMobilePostItemValid);
  }

  // Find index of the currently viewed post among valid rows
  function findCurrentPostRowIndex(validRows, currentPostNo) {
    return validRows.findIndex(row => {
      if (row.classList.contains('crt') || row.className.includes('crt') || !!row.querySelector('.crt_icon')) return true;

      if (currentPostNo) {
        const numEl = row.querySelector('.gall_num');
        if (numEl && numEl.textContent.trim() === currentPostNo) return true;

        const titLink = row.querySelector('.gall_tit a:not(.reply_numbox)') || row.querySelector('a');
        if (titLink && extractPostNo(titLink.href) === currentPostNo) return true;
      }
      return false;
    });
  }

  // Check if a post list row/item contains photo attachments (for boards without a dedicated photo tab)
  function hasPhotoAttachment(row) {
    if (!row) return false;

    // 1. Check subject text (e.g. '사진' category)
    const subjectEl = row.querySelector('.gall_subject');
    if (subjectEl) {
      const subj = subjectEl.textContent.trim();
      if (subj.includes('사진')) return true;
    }

    // 2. Check desktop DC title photo icon (.icon_pic, .icon_recomimg)
    const photoIcon = row.querySelector(
      '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg'
    );
    if (photoIcon) return true;

    // 3. Check mobile DC photo icon
    const mobilePhotoIcon = row.querySelector('.sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]');
    if (mobilePhotoIcon) return true;

    // 4. Check general image icon excluding text/survey/ad icons
    const anyImgIcon = row.querySelector('.icon_img');
    if (anyImgIcon) {
      const cls = anyImgIcon.className || '';
      if (!cls.includes('icon_txt') && !cls.includes('survey') && !cls.includes('notice') && !cls.includes('ad')) {
        return true;
      }
    }

    return false;
  }

  // Find adjacent post (previous / next) with smart photo filtering for boards without a photo tab
  function getAdjacentPostUrl(direction, preferPhotos = true) {
    const currentPostNo = extractPostNo(window.location.href);
    const validRows = getValidPostRows(currentPostNo);

    if (validRows.length === 0) {
      return null;
    }

    const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
    if (currentIdx === -1) {
      return null;
    }

    const step = direction === 'up' ? -1 : 1;
    let targetIdx = -1;

    // 1. If photo filtering is preferred (e.g. photo tab does not exist / mixed post list),
    // look for the next row that contains photo attachments
    if (preferPhotos) {
      let candidateIdx = currentIdx + step;
      while (candidateIdx >= 0 && candidateIdx < validRows.length) {
        if (hasPhotoAttachment(validRows[candidateIdx])) {
          targetIdx = candidateIdx;
          break;
        }
        candidateIdx += step;
      }
    }

    // 2. Fallback: If no photo post found ahead or preferPhotos is false, take immediate adjacent valid row
    if (targetIdx === -1) {
      const fallbackIdx = currentIdx + step;
      if (fallbackIdx >= 0 && fallbackIdx < validRows.length) {
        targetIdx = fallbackIdx;
      }
    }

    // Boundary checks
    if (targetIdx < 0) {
      return { error: 'top', message: '목록의 가장 최신 글입니다.' };
    }
    if (targetIdx >= validRows.length) {
      return { error: 'bottom', message: '목록의 마지막 글입니다.' };
    }

    const targetRow = validRows[targetIdx];
    const targetLink = targetRow.querySelector('.gall_tit a:not(.reply_numbox)') || targetRow.querySelector('a');
    const targetTitle = targetLink ? (targetLink.textContent || '').trim().replace(/\s+/g, ' ') : '';

    return {
      url: targetLink ? targetLink.href : null,
      title: targetTitle,
      hasPhoto: hasPhotoAttachment(targetRow)
    };
  }

  // Navigate to adjacent post with auto-open session flag
  function navigatePost(direction) {
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

  // Floating notification when auto-navigated to a post with no photos (e.g. photo tab absent)
  function showNoPhotoNotice() {
    let noticeEl = document.getElementById('disagall-no-photo-notice');
    if (noticeEl) noticeEl.remove();

    noticeEl = document.createElement('div');
    noticeEl.id = 'disagall-no-photo-notice';
    noticeEl.className = 'disagall-no-photo-notice';
    noticeEl.innerHTML = `
      <div class="disagall-notice-content">
        <span class="disagall-notice-icon">📷</span>
        <span class="disagall-notice-text">본문에 사진이 없는 글입니다. (사진 탭 미적용)</span>
      </div>
      <div class="disagall-notice-btns">
        <button id="disagall-notice-prev" class="disagall-notice-btn" title="이전 글 (↑ / W)">↑ 이전 글</button>
        <button id="disagall-notice-next" class="disagall-notice-btn" title="다음 글 (↓ / S)">↓ 다음 글</button>
        <button id="disagall-notice-close" class="disagall-notice-btn close" title="닫기 (ESC)">✕</button>
      </div>
    `;

    document.body.appendChild(noticeEl);

    // Event listeners
    const prevBtn = noticeEl.querySelector('#disagall-notice-prev');
    const nextBtn = noticeEl.querySelector('#disagall-notice-next');
    const closeBtn = noticeEl.querySelector('#disagall-notice-close');

    if (prevBtn) prevBtn.addEventListener('click', () => navigatePost('up'));
    if (nextBtn) nextBtn.addEventListener('click', () => navigatePost('down'));
    if (closeBtn) closeBtn.addEventListener('click', () => noticeEl.remove());

    // Allow keyboard navigation even when overlay is closed
    const handleNoticeKey = (e) => {
      if (['ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        window.removeEventListener('keydown', handleNoticeKey);
        navigatePost('up');
      } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        window.removeEventListener('keydown', handleNoticeKey);
        navigatePost('down');
      } else if (e.key === 'Escape') {
        noticeEl.remove();
        window.removeEventListener('keydown', handleNoticeKey);
      }
    };
    window.addEventListener('keydown', handleNoticeKey);

    // Auto dismiss after specified duration
    setTimeout(() => {
      if (noticeEl && noticeEl.parentNode) {
        noticeEl.remove();
        window.removeEventListener('keydown', handleNoticeKey);
      }
    }, CONFIG.NO_PHOTO_NOTICE_DURATION);
  }

  // Key-Action mapping for viewer shortcuts
  const KEY_ACTIONS = {
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

  function handleKeyDown(e) {
    if (!overlayEl || !overlayEl.classList.contains('active')) return;
    if (e.repeat) return; // Prevent rapid duplicate calls on held-down keys

    // Edge case: Ignore shortcuts if user is typing inside an input/textarea/editable element
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

  function openViewer(targetSrc, isAuto = false) {
    forcePreloadPostImages();
    collectPostImages();

    if (postImages.length === 0) {
      if (!isAuto) {
        alert("디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.");
      }
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
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (!hasVotedCurrentPost && recommendBtnEl) {
      recommendBtnEl.classList.remove('voted');
    }

    updateRecommendButtonUi();
    showImage(targetIndex);
  }

  function closeViewer() {
    if (overlayEl) {
      overlayEl.classList.remove('active');
      document.body.style.overflow = previousBodyOverflow;
    }
  }

  // Window Resize Listener for dynamic viewport fit (throttled via requestAnimationFrame)
  let resizeRafId = null;
  window.addEventListener('resize', () => {
    if (overlayEl && overlayEl.classList.contains('active')) {
      if (resizeRafId) cancelAnimationFrame(resizeRafId);
      resizeRafId = requestAnimationFrame(() => {
        applyFittingAndPadding();
        resizeRafId = null;
      });
    }
  });

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

  // Automatically open viewer if navigated via post navigation (sessionStorage)
  function checkAutoOpen() {
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

          if (postImages.length > 0) {
            clearInterval(pollTimer);
            openViewer(null, true);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollTimer);
            // Edge case: Navigated to a post with no photos (e.g. photo tab absent)
            showNoPhotoNotice();
          }
        }, CONFIG.AUTO_OPEN_POLL_INTERVAL);
      }
    } catch (e) {}
  }

  window.addEventListener('DOMContentLoaded', () => {
    initQuickLauncher();
    checkAutoOpen();
  });
  setTimeout(() => {
    initQuickLauncher();
    checkAutoOpen();
  }, 1000);

})();

