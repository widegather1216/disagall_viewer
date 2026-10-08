// Disagall Viewer - Content Script for DC Inside

(function () {
  'use strict';

  let postImages = [];
  let currentIndex = 0;
  let currentPadding = 24; // default padding in px
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
  let lastRightClickedImgSrc = null;

  // Zoom & Pan state variables
  let zoomScale = 1.0;
  let panX = 0;
  let panY = 0;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let transformRafId = null;

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
    isDragging = false;
    updateImgTransform();
  }

  // Load saved padding setting from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['defaultPadding'], (result) => {
      if (result && typeof result.defaultPadding === 'number') {
        currentPadding = result.defaultPadding;
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

  // Helper to check if an image belongs to post body content
  function isPostBodyImage(img) {
    if (!img || img.tagName !== 'IMG') return false;

    // 1. Exclude non-body sections (comments, banners, sidebars, headers, footers)
    const excludedParent = img.closest([
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
    ].join(', '));
    if (excludedParent) return false;

    // 2. Check for DC Cons / UI assets
    const url = getBestImgUrl(img);
    if (isDcIconOrUiAsset(img, url)) return false;

    // 3. Check if inside any known post body container
    const postContainer = img.closest([
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
    ].join(', '));

    if (postContainer) return true;

    // 4. Fallback check: if url is a known photo upload URL or direct image format
    const isKnownPhotoUrl = url.includes('viewimage.php') ||
                            url.includes('dcimg') ||
                            url.includes('dccdn') ||
                            url.includes('upload') ||
                            url.includes('image.dcinside') ||
                            url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);

    if (isKnownPhotoUrl) return true;

    return false;
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

  // Find all post body images strictly in current DC Inside page
  function collectPostImages() {
    postImages = [];
    const seenUrls = new Set();

    const bodySelectors = [
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

    // Find post content containers first
    let containers = Array.from(document.querySelectorAll(bodySelectors));
    containers = containers.filter(c => !c.closest('.comment_box, .comment_wrap, .cmt_list, .reply_box, #right_box, .side_box, header, footer'));

    containers.forEach((container) => {
      const imageElements = container.querySelectorAll('img');
      imageElements.forEach((img) => {
        if (!isPostBodyImage(img)) return;

        const cleanUrl = getBestImgUrl(img);
        if (cleanUrl && !seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);
          postImages.push({
            url: cleanUrl,
            element: img,
            alt: img.alt || '디시 갤러리 본문 이미지'
          });
        }
      });
    });

    // Fallback scan: search all <img> tags if container-based search yielded 0 images
    if (postImages.length === 0) {
      const allImages = document.querySelectorAll('img');
      allImages.forEach((img) => {
        if (!isPostBodyImage(img)) return;

        const cleanUrl = getBestImgUrl(img);
        if (cleanUrl && !seenUrls.has(cleanUrl)) {
          seenUrls.add(cleanUrl);
          postImages.push({
            url: cleanUrl,
            element: img,
            alt: img.alt || '디시 갤러리 본문 이미지'
          });
        }
      });
    }

    return postImages;
  }

  // Initialize and Create Overlay DOM
  function createOverlay() {
    if (overlayEl) return;

    overlayEl = document.createElement('div');
    overlayEl.id = 'disagall-viewer-overlay';

    overlayEl.innerHTML = `
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
          <div class="disagall-keyhint"><span class="disagall-kbd">↑</span> <span class="disagall-kbd">↓</span> 이전/다음 글</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">마우스 휠 / 트랙패드</span> 확대/축소</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 사진 이동</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
          <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> 닫기</div>
        </div>
      </div>
    `;

    document.body.appendChild(overlayEl);

    // Cache elements
    mainImgEl = document.getElementById('disagall-main-img');
    counterEl = document.getElementById('disagall-counter');
    infoBadgeEl = document.getElementById('disagall-info-badge');
    sliderEl = document.getElementById('disagall-slider');
    sliderValEl = document.getElementById('disagall-slider-val');
    prevBtnEl = document.getElementById('disagall-prev-btn');
    nextBtnEl = document.getElementById('disagall-next-btn');
    loaderEl = document.getElementById('disagall-loader');
    toastEl = document.getElementById('disagall-toast');

    // Event Bindings
    document.getElementById('disagall-close-btn').addEventListener('click', closeViewer);

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
        chrome.storage.sync.set({ defaultPadding: currentPadding });
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

    // Drag to Pan when zoomed in
    mainImgEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Left click only
      if (zoomScale > 1.0) {
        isDragging = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        mainImgEl.style.cursor = 'grabbing';
        e.preventDefault();
      }
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

  // Apply Fitting Rules & Padding dynamically
  function applyFittingAndPadding() {
    if (!mainImgEl || !mainImgEl.naturalWidth) return;

    const nw = mainImgEl.naturalWidth;
    const nh = mainImgEl.naturalHeight;
    const aspect = (nw / nh).toFixed(2);

    const isPortrait = nh >= nw;

    // Header is ~50px, Footer is ~36px
    const headerHeight = 52;
    const footerHeight = 38;
    const availableHeight = Math.max(100, window.innerHeight - headerHeight - footerHeight - (currentPadding * 2));
    const availableWidth = Math.max(100, window.innerWidth - (currentPadding * 2));

    // Calculate maximum image dimensions while maintaining natural aspect ratio
    let targetWidth = nw;
    let targetHeight = nh;

    // Fit to available bounding box
    const widthRatio = availableWidth / nw;
    const heightRatio = availableHeight / nh;
    const scale = Math.min(widthRatio, heightRatio);

    targetWidth = Math.round(nw * scale);
    targetHeight = Math.round(nh * scale);

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
    const bodySelectors = [
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

    const imgs = document.querySelectorAll(`${bodySelectors} img, img`);
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
  function showViewerToast(message, duration = 1800) {
    if (!toastEl) return;
    if (toastTimer) clearTimeout(toastTimer);

    toastEl.textContent = message;
    toastEl.classList.add('show');

    toastTimer = setTimeout(() => {
      if (toastEl) toastEl.classList.remove('show');
    }, duration);
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

  // Find adjacent post (previous / next) from the bottom post list table
  function getAdjacentPostUrl(direction) {
    const currentPostNo = extractPostNo(window.location.href);

    // 1. Desktop DC table rows (.gall_list tbody tr.ub-content)
    const tableRows = Array.from(document.querySelectorAll('table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content'));

    let validRows = [];
    if (tableRows.length > 0) {
      validRows = tableRows.filter(tr => {
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

        const numEl = tr.querySelector('.gall_num');
        const subjectEl = tr.querySelector('.gall_subject');
        const numText = numEl ? numEl.textContent.trim() : '';
        const subjectText = subjectEl ? subjectEl.textContent.trim() : '';

        // If it is the current post, it is always valid (DC replaces post number with crt_icon)
        if (isCurrentPost) {
          return true;
        }

        // Ignore notice, AD, survey, and placeholder rows for non-current rows
        if (numText === '-' || !numText || isNaN(Number(numText))) return false;
        if (subjectText === '공지' || subjectText === 'AD' || subjectText === '설문') return false;
        if (numText === '공지' || numText === '설문') return false;
        if (tr.classList.contains('notice')) return false;

        return true;
      });
    }

    // 2. Mobile DC list fallback (.gall-detail-lst li)
    if (validRows.length === 0) {
      const mobileItems = Array.from(document.querySelectorAll('.gall-detail-lst li, .gall-thum-btm li'));
      validRows = mobileItems.filter(li => {
        const link = li.querySelector('a');
        if (!link || !link.href) return false;
        const hrefAttr = link.getAttribute('href') || link.href || '';
        if (hrefAttr.startsWith('javascript:')) return false;
        if (li.classList.contains('notice') || li.querySelector('.sp-notice')) return false;
        return true;
      });
    }

    if (validRows.length === 0) {
      return null;
    }

    // Find index of current post in valid rows
    let currentIdx = validRows.findIndex(row => {
      // Direct class match or icon
      if (row.classList.contains('crt') || row.className.includes('crt') || !!row.querySelector('.crt_icon')) return true;

      // Match by post number
      if (currentPostNo) {
        const numEl = row.querySelector('.gall_num');
        if (numEl && numEl.textContent.trim() === currentPostNo) return true;

        const titLink = row.querySelector('.gall_tit a:not(.reply_numbox)') || row.querySelector('a');
        if (titLink && extractPostNo(titLink.href) === currentPostNo) return true;
      }
      return false;
    });

    if (currentIdx === -1) {
      return null;
    }

    // direction: 'up' -> targetIdx = currentIdx - 1 (위쪽 행: 더 최신 글)
    // direction: 'down' -> targetIdx = currentIdx + 1 (아래쪽 행: 더 과거 글)
    const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;

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
      title: targetTitle
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
      const titleHint = result.title ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + '...' : result.title})` : '';
      showViewerToast(`${label}로 이동 중...${titleHint}`);

      try {
        sessionStorage.setItem('disagall_auto_open', '1');
      } catch (e) {}

      setTimeout(() => {
        window.location.href = result.url;
      }, 150);
    }
  }

  // Keyboard Event Handler
  function handleKeyDown(e) {
    if (!overlayEl || !overlayEl.classList.contains('active')) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeViewer();
    } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      e.stopPropagation();
      navigate(-1);
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      e.stopPropagation();
      navigate(1);
    } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      e.stopPropagation();
      navigatePost('up');
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      e.stopPropagation();
      navigatePost('down');
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
    document.body.style.overflow = 'hidden'; // Prevent page scroll behind overlay

    showImage(targetIndex);
  }

  // Close Lightbox Viewer
  function closeViewer() {
    if (overlayEl) {
      overlayEl.classList.remove('active');
      document.body.style.overflow = '';
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

  // Window message listener for test pages or internal triggers
  window.addEventListener('message', (event) => {
    if (event.data && event.data.action === 'disagall_test_open') {
      openViewer();
    }
  });

  // Window Resize Listener for dynamic viewport fit
  window.addEventListener('resize', () => {
    if (overlayEl && overlayEl.classList.contains('active')) {
      applyFittingAndPadding();
    }
  });

  // Automatically open viewer if navigated via post navigation (sessionStorage)
  function checkAutoOpen() {
    try {
      const autoOpen = sessionStorage.getItem('disagall_auto_open');
      if (autoOpen === '1') {
        sessionStorage.removeItem('disagall_auto_open');

        let attempts = 0;
        const maxAttempts = 15;
        const pollTimer = setInterval(() => {
          attempts++;
          forcePreloadPostImages();
          collectPostImages();

          if (postImages.length > 0) {
            clearInterval(pollTimer);
            openViewer(null, true);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollTimer);
          }
        }, 150);
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

