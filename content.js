// Disagall Viewer - Content Script for DC Inside

(function () {
  'use strict';

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
  let currentPadding = CONFIG.DEFAULT_PADDING; // default padding in px
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
  let lastRightClickedImgSrc = null;
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

  // Apply zoom and pan transform to main image element with hardware acceleration (rAF)
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

  // Reset zoom & pan to default fit state
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

  // Load saved padding setting from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get([CONFIG.STORAGE_KEY_PADDING], (result) => {
      if (result && typeof result[CONFIG.STORAGE_KEY_PADDING] === 'number') {
        currentPadding = result[CONFIG.STORAGE_KEY_PADDING];
        if (sliderEl) {
          sliderEl.value = currentPadding;
          if (sliderValEl) sliderValEl.textContent = currentPadding + 'px';
        }
      }
    });
  }

  // Extract real image URL considering lazy loading (data-original / data-src) & parent <a> link
  function getBestImgUrl(img) {
    if (!img) return '';
    
    // Check lazy loading attributes first before src
    let rawUrl = img.getAttribute('data-original') || 
                 img.getAttribute('data-src') || 
                 img.getAttribute('data-url') ||
                 img.getAttribute('data-lazy-src') ||
                 (img.dataset ? (img.dataset.original || img.dataset.src || img.dataset.url) : '') || 
                 img.src || 
                 '';

    // If rawUrl is placeholder/spinner/loading gif/nstatic, check parent <a> link or data-original
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

  // Check if an element or URL is a DC Con, Nikcon, profile icon, or UI asset
  function isDcIconOrUiAsset(img, url) {
    if (!url) return true;

    // Check URL patterns
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

    // Check element attributes & classes
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

  // Helper to check if an image belongs to post body content
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

  // Track right-clicked element on the page
  document.addEventListener('contextmenu', (e) => {
    const target = e.target;
    if (target && target.tagName === 'IMG' && isPostBodyImage(target)) {
      lastRightClickedImgSrc = getBestImgUrl(target);
    } else {
      lastRightClickedImgSrc = null;
    }
  }, true);

  // Clean and resolve original resolution URL for DC Inside
  function getCleanOriginalUrl(url) {
    if (!url) return '';
    // Handle relative protocol
    if (url.startsWith('//')) {
      url = window.location.protocol + url;
    }
    // Convert preview or thumbnail params if needed
    try {
      let parsed = new URL(url);
      // Remove thumbnail parameters if present
      parsed.searchParams.delete('s');
      parsed.searchParams.delete('type');
      return parsed.toString();
    } catch (e) {
      return url;
    }
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

  // Find all post body images and update state
  function collectPostImages() {
    postImages = extractPostImages(document);
    return postImages;
  }

  // Build viewer overlay HTML markup
  function buildOverlayHtml() {
    return `
      <div class="disagall-header">
        <div class="disagall-header-left">
          <div class="disagall-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
              <circle cx="8.5" cy="8.5" r="1.5"></circle>
              <polyline points="21 15 16 10 5 21"></polyline>
            </svg>
            디시 사진 뷰어
          </div>
          <div class="disagall-counter" id="disagall-counter">1 / 1</div>
          <div class="disagall-info-badge" id="disagall-info-badge">화면 맞춤</div>
        </div>

        <div class="disagall-header-center">
          <div class="disagall-padding-control">
            <span class="disagall-slider-label">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <rect x="7" y="7" width="10" height="10" rx="1" ry="1"></rect>
              </svg>
              여백(패딩):
            </span>
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
          <button class="disagall-btn disagall-btn-close" id="disagall-close-btn" title="닫기 (ESC)">✕ 닫기</button>
        </div>
      </div>

      <div class="disagall-stage" id="disagall-stage">
        <div class="disagall-nav-btn disagall-nav-btn-prev" id="disagall-prev-btn" title="이전 이미지 (←)">
          <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          <span class="disagall-nav-hint">←</span>
        </div>

        <div class="disagall-loader" id="disagall-loader">
          <div class="disagall-spinner"></div>
          <span>고화질 원본 로딩 중...</span>
        </div>

        <div class="disagall-img-wrapper" id="disagall-img-wrapper">
          <img class="disagall-img" id="disagall-main-img" src="" alt="확대 뷰어 이미지" />
        </div>

        <div class="disagall-nav-btn disagall-nav-btn-next" id="disagall-next-btn" title="다음 이미지 (→)">
          <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
          <span class="disagall-nav-hint">→</span>
        </div>
      </div>

      <div class="disagall-toast" id="disagall-toast"></div>

      <div class="disagall-footer">
        <div class="disagall-keyhints">
          <div class="disagall-keyhint"><span class="disagall-kbd">R</span> 개추</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">↑</span> <span class="disagall-kbd">↓</span> 이전/다음 글</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">마우스 휠 / 트랙패드</span> 확대/축소</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 사진 이동</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> 닫기</div>
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
    prevBtnEl = document.getElementById('disagall-prev-btn');
    nextBtnEl = document.getElementById('disagall-next-btn');
    loaderEl = document.getElementById('disagall-loader');
    toastEl = document.getElementById('disagall-toast');
    recommendBtnEl = document.getElementById('disagall-btn-recommend');
  }

  // Bind interactive events for overlay
  function bindOverlayEvents() {
    document.getElementById('disagall-close-btn').addEventListener('click', closeViewer);

    if (recommendBtnEl) {
      recommendBtnEl.addEventListener('click', (e) => {
        e.stopPropagation();
        triggerPostRecommend();
      });
    }

    prevBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(-1);
    });

    nextBtnEl.addEventListener('click', (e) => {
      e.stopPropagation();
      navigate(1);
    });

    sliderEl.addEventListener('input', (e) => {
      currentPadding = parseInt(e.target.value, 10);
      sliderValEl.textContent = currentPadding + 'px';
      applyFittingAndPadding();
      
      // Save padding preference
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
        chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: currentPadding });
      }
    });

    // Close on overlay background click (not image or controls)
    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl || e.target.id === 'disagall-stage' || e.target.id === 'disagall-img-wrapper') {
        closeViewer();
      }
    });

    // Mouse wheel inside stage for photo zooming & trackpad pinch
    const stageEl = document.getElementById('disagall-stage');
    stageEl.addEventListener('wheel', (e) => {
      e.preventDefault();
      
      const delta = e.deltaY;
      const zoomFactor = delta < 0 ? 1.15 : 0.86;
      const prevScale = zoomScale;
      zoomScale = Math.min(5.0, Math.max(1.0, zoomScale * zoomFactor));

      if (zoomScale <= 1.001) {
        zoomScale = 1.0;
        panX = 0;
        panY = 0;
      } else {
        const scaleRatio = zoomScale / prevScale;
        panX = panX * scaleRatio;
        panY = panY * scaleRatio;
      }

      updateImgTransform();
    }, { passive: false });

    // Drag to Pan when zoomed in (dynamically bind mousemove/mouseup)
    mainImgEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      if (zoomScale > 1.0) {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        mainImgEl.style.cursor = 'grabbing';
        e.preventDefault();
        window.addEventListener('mousemove', onWindowMouseMove);
        window.addEventListener('mouseup', onWindowMouseUp);
      }
    });

    // Double click to toggle 2x zoom / reset
    mainImgEl.addEventListener('dblclick', (e) => {
      e.preventDefault();
      if (zoomScale > 1.05) {
        resetZoom();
      } else {
        zoomScale = 2.2;
        panX = 0;
        panY = 0;
        updateImgTransform();
      }
    });

    // Keyboard navigation
    window.addEventListener('keydown', handleKeyDown, true);
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

  // Apply Fitting Rules & Padding dynamically
  function applyFittingAndPadding() {
    if (!mainImgEl || !mainImgEl.naturalWidth || !mainImgEl.naturalHeight) return;

    const nw = mainImgEl.naturalWidth;
    const nh = mainImgEl.naturalHeight;
    const isPortrait = nh >= nw;

    // Dynamically calculate available area considering actual header & footer heights
    const headerEl = overlayEl ? overlayEl.querySelector('.disagall-header') : null;
    const footerEl = overlayEl ? overlayEl.querySelector('.disagall-footer') : null;
    const headerHeight = headerEl ? headerEl.offsetHeight : 52;
    const footerHeight = footerEl ? footerEl.offsetHeight : 38;
    const availableHeight = Math.max(100, window.innerHeight - headerHeight - footerHeight - (currentPadding * 2));
    const availableWidth = Math.max(100, window.innerWidth - (currentPadding * 2));

    // Calculate maximum image dimensions while maintaining natural aspect ratio
    const widthRatio = availableWidth / nw;
    const heightRatio = availableHeight / nh;
    const scale = Math.min(widthRatio, heightRatio);

    const targetWidth = Math.round(nw * scale);
    const targetHeight = Math.round(nh * scale);

    mainImgEl.style.maxWidth = `${targetWidth}px`;
    mainImgEl.style.maxHeight = `${targetHeight}px`;
    mainImgEl.style.width = '100%';
    mainImgEl.style.height = '100%';

    // Orientation Badge Text
    const orientationText = isPortrait ? `세로 사진 (${nw}x${nh})` : `가로 사진 (${nw}x${nh})`;
    if (infoBadgeEl) {
      infoBadgeEl.textContent = orientationText;
    }

    if (isPortrait) {
      mainImgEl.classList.add('portrait');
      mainImgEl.classList.remove('landscape');
    } else {
      mainImgEl.classList.add('landscape');
      mainImgEl.classList.remove('portrait');
    }
  }

  // Force DC Inside lazy-loaded images to load immediately on page/viewer open
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

  // Display specific image by index
  function showImage(index) {
    if (postImages.length === 0) return;

    // Reset zoom & pan when navigating to another photo
    resetZoom();

    currentIndex = (index + postImages.length) % postImages.length;
    const imgData = postImages[currentIndex];

    // Update Counter & Nav Button states
    if (counterEl) {
      counterEl.textContent = `${currentIndex + 1} / ${postImages.length}`;
    }

    if (prevBtnEl) {
      prevBtnEl.classList.toggle('disabled', postImages.length <= 1);
    }
    if (nextBtnEl) {
      nextBtnEl.classList.toggle('disabled', postImages.length <= 1);
    }

    // Show Loader & hide image until loaded
    loaderEl.style.display = 'flex';
    mainImgEl.style.opacity = '0';

    // Ensure mainImgEl retains correct referrer policy for DC Inside servers
    mainImgEl.referrerPolicy = 'no-referrer-when-downgrade';

    // Load High-Res Image with Referrer Policy
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
      // Fallback: Check if DOM element's src is available
      const fallbackSrc = (imgData.element && (imgData.element.currentSrc || imgData.element.src)) || imgData.url;
      mainImgEl.src = fallbackSrc;
      mainImgEl.alt = imgData.alt;
      loaderEl.style.display = 'none';
      mainImgEl.style.opacity = '1';
      applyFittingAndPadding();
    };

    tempImg.src = imgData.url;
  }

  // Navigate images
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

  // Keyboard Event Handler with input focus guard and key repeat prevention
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

  // Open Lightbox Viewer
  function openViewer(targetSrc, isAuto = false) {
    // 1. Force un-lazyload all post body images immediately
    forcePreloadPostImages();

    // 2. Collect post body images
    collectPostImages();

    if (postImages.length === 0) {
      if (!isAuto) {
        alert("디시 사진 뷰어: 게시글 본문에서 감상 가능한 이미지를 찾지 못했습니다.");
      }
      return;
    }

    createOverlay();

    // Find index of targeted image
    let targetIndex = 0;
    const searchUrl = targetSrc ? getCleanOriginalUrl(targetSrc) : lastRightClickedImgSrc;

    if (searchUrl) {
      const foundIdx = postImages.findIndex(item => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl));
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
      }
    }

    overlayEl.classList.add('active');
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden'; // Prevent page scroll behind overlay

    if (!hasVotedCurrentPost && recommendBtnEl) {
      recommendBtnEl.classList.remove('voted');
    }

    updateRecommendButtonUi();
    showImage(targetIndex);
  }

  // Close Lightbox Viewer
  function closeViewer() {
    if (overlayEl) {
      overlayEl.classList.remove('active');
      document.body.style.overflow = previousBodyOverflow;
    }
  }

  // Listen for messages from background script (Context Menu)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'open_viewer') {
        openViewer(message.srcUrl);
        sendResponse({ success: true });
      }
    });
  }

  // Window message listener for test pages or internal triggers (with origin validation)
  window.addEventListener('message', (event) => {
    if (event.origin && event.origin !== window.location.origin && window.location.origin !== 'null') return;
    if (event.data && event.data.action === 'disagall_test_open') {
      openViewer();
    }
  });

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

  // Bootstrap auto-open check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkAutoOpen);
  } else {
    checkAutoOpen();
  }

})();

