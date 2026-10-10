// Disagall Viewer - Content Script for DC Inside (Built from src/)

(() => {
  // src/config.js
  var CONFIG = {
    DEFAULT_PADDING: 24,
    STORAGE_KEY_PADDING: "defaultPadding",
    STORAGE_KEY_AUTO_OPEN: "disagall_auto_open",
    TOAST_DURATION: 1800,
    POST_NAV_DELAY: 150,
    AUTO_OPEN_MAX_ATTEMPTS: 15,
    AUTO_OPEN_POLL_INTERVAL: 150,
    RECOMMEND_SYNC_DELAYS: [500, 1200],
    RECOMMEND_THROTTLE_MS: 1200,
    NO_PHOTO_NOTICE_DURATION: 8e3
  };

  // src/state.js
  var state = {
    postImages: [],
    currentIndex: 0,
    currentPadding: CONFIG.DEFAULT_PADDING,
    lastRightClickedImgSrc: null,
    previousBodyOverflow: "",
    // DOM Elements Cache
    elements: {
      overlayEl: null,
      mainImgEl: null,
      counterEl: null,
      infoBadgeEl: null,
      sliderEl: null,
      sliderValEl: null,
      prevBtnEl: null,
      nextBtnEl: null,
      loaderEl: null,
      toastEl: null,
      recommendBtnEl: null
    },
    toastTimer: null,
    // Zoom & Pan
    zoom: {
      scale: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      startX: 0,
      startY: 0,
      transformRafId: null
    }
  };

  // src/parser/image_parser.js
  var EXCLUDED_CONTAINER_SELECTORS = [
    ".comment_box",
    ".comment_wrap",
    ".cmt_list",
    ".reply_box",
    ".btn_box",
    ".rcmd_box",
    ".dc_allbanner",
    ".con_banner",
    "#right_box",
    ".side_box",
    ".gall_list",
    ".recommend_box",
    ".pop_info",
    ".attached_file",
    ".option_box",
    ".written_dccon",
    "#ad_nv_slot",
    ".ad_box",
    "header",
    "footer",
    ".gnb",
    ".lnb"
  ].join(", ");
  var POST_BODY_CONTAINER_SELECTORS = [
    ".write_div",
    ".thum-txtin",
    ".us-txt",
    ".usertxt",
    ".writing_view_box",
    ".gallview_contents",
    ".view_content_wrap",
    ".reading_box",
    ".article-content",
    "#dc_contents",
    '[id*="write_div"]',
    '[class*="write_div"]',
    ".gall_view_box",
    ".view_content",
    ".contents"
  ].join(", ");
  function getCleanOriginalUrl(url, baseProtocol = typeof window !== "undefined" ? window.location?.protocol : "https:") {
    if (!url) return "";
    if (url.startsWith("//")) {
      url = (baseProtocol || "https:") + url;
    }
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete("s");
      parsed.searchParams.delete("type");
      return parsed.toString();
    } catch (e) {
      return url;
    }
  }
  function getBestImgUrl(img) {
    if (!img) return "";
    let rawUrl = img.getAttribute?.("data-original") || img.getAttribute?.("data-src") || img.getAttribute?.("data-url") || img.getAttribute?.("data-lazy-src") || (img.dataset ? img.dataset.original || img.dataset.src || img.dataset.url : "") || img.src || "";
    if (!rawUrl || rawUrl.includes("gallview_loading") || rawUrl.includes("loading") || rawUrl.includes("blank.gif") || rawUrl.includes("nstatic.dcinside.com")) {
      const dataOrig = img.getAttribute?.("data-original") || img.getAttribute?.("data-src") || (img.dataset ? img.dataset.original || img.dataset.src : "");
      if (dataOrig && !dataOrig.includes("loading")) {
        rawUrl = dataOrig;
      } else {
        const parentAnchor = img.closest ? img.closest("a") : null;
        if (parentAnchor && parentAnchor.href) {
          const anchorHref = parentAnchor.href;
          if (anchorHref.includes("viewimage.php") || anchorHref.includes("dcimg") || anchorHref.includes("image") || anchorHref.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
            rawUrl = anchorHref;
          }
        }
      }
    }
    return getCleanOriginalUrl(rawUrl);
  }
  function isDcIconOrUiAsset(img, url) {
    if (!url) return true;
    if (url.includes("/dcicon/") || url.includes("/emoticon/") || url.includes("/dccon") || url.includes("dccon.php") || url.includes("nik.gif") || url.includes("fix_nik.gif") || url.includes("bestcon") || url.includes("/btn_") || url.includes("icon_") || url.includes("logo") || url.includes("banner") || url.includes("gallview_loading") || url.includes("nstatic.dcinside.com")) {
      return true;
    }
    if (img) {
      if (img.classList?.contains("written_dccon") || img.classList?.contains("dccon") || img.hasAttribute?.("conalt") || img.hasAttribute?.("detail") || img.dataset && img.dataset.dcconoverstatus !== void 0 || img.title && img.title.includes("\uAC24\uB85C\uADF8")) {
        return true;
      }
    }
    return false;
  }
  function isPostBodyImage(img) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.closest && img.closest(EXCLUDED_CONTAINER_SELECTORS)) return false;
    const url = getBestImgUrl(img);
    if (isDcIconOrUiAsset(img, url)) return false;
    if (img.closest && img.closest(POST_BODY_CONTAINER_SELECTORS)) return true;
    const isKnownPhotoUrl = url.includes("viewimage.php") || url.includes("dcimg") || url.includes("dccdn") || url.includes("upload") || url.includes("image.dcinside") || url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return !!isKnownPhotoUrl;
  }
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
          alt: img.alt || "\uB514\uC2DC \uAC24\uB7EC\uB9AC \uBCF8\uBB38 \uC774\uBBF8\uC9C0"
        });
      }
    });
    return results;
  }
  function extractPostImages(root = typeof document !== "undefined" ? document : null) {
    if (!root || !root.querySelectorAll) return [];
    const seenUrls = /* @__PURE__ */ new Set();
    const collected = [];
    let containers = Array.from(root.querySelectorAll(POST_BODY_CONTAINER_SELECTORS));
    containers = containers.filter((c) => !c.closest || !c.closest(EXCLUDED_CONTAINER_SELECTORS));
    containers.forEach((container) => {
      collected.push(...extractImagesFromElements(container.querySelectorAll("img"), seenUrls));
    });
    if (collected.length === 0) {
      collected.push(...extractImagesFromElements(root.querySelectorAll("img"), seenUrls));
    }
    return collected;
  }

  // src/parser/post_navigator.js
  function extractPostNo(url, origin = typeof window !== "undefined" ? window.location?.origin : "https://gall.dcinside.com") {
    if (!url) return null;
    try {
      const parsed = new URL(url, origin);
      const no = parsed.searchParams.get("no");
      if (no) return no;
      const match = parsed.pathname.match(/\/(\d+)(?:\/|\?|$)/);
      if (match) return match[1];
    } catch (e) {
      const match = url.match(/[?&]no=(\d+)/) || url.match(/\/(\d+)(?:\/|\?|$)/);
      if (match) return match[1];
    }
    return null;
  }
  function isDesktopPostRowValid(tr, currentPostNo) {
    if (!tr) return false;
    const titLink = tr.querySelector?.(".gall_tit a:not(.reply_numbox)") || tr.querySelector?.("a");
    if (!titLink || !titLink.href) return false;
    const hrefAttr = titLink.getAttribute && titLink.getAttribute("href") || titLink.href || "";
    if (hrefAttr.startsWith("javascript:")) return false;
    const isCurrentPost = tr.classList && tr.classList.contains("crt") || tr.className && tr.className.includes("crt") || !!(tr.querySelector && tr.querySelector(".crt_icon")) || currentPostNo && (tr.innerHTML && tr.innerHTML.includes(currentPostNo) || extractPostNo(titLink.href) === currentPostNo);
    if (isCurrentPost) return true;
    const numEl = tr.querySelector?.(".gall_num");
    const subjectEl = tr.querySelector?.(".gall_subject");
    const numText = numEl ? numEl.textContent.trim() : "";
    const subjectText = subjectEl ? subjectEl.textContent.trim() : "";
    if (numText === "-" || !numText || isNaN(Number(numText))) return false;
    if (subjectText === "\uACF5\uC9C0" || subjectText === "AD" || subjectText === "\uC124\uBB38") return false;
    if (numText === "\uACF5\uC9C0" || numText === "\uC124\uBB38") return false;
    if (tr.classList && tr.classList.contains("notice")) return false;
    return true;
  }
  function isMobilePostItemValid(li) {
    if (!li) return false;
    const link = li.querySelector?.("a");
    if (!link || !link.href) return false;
    const hrefAttr = link.getAttribute && link.getAttribute("href") || link.href || "";
    if (hrefAttr.startsWith("javascript:")) return false;
    if (li.classList && li.classList.contains("notice") || li.querySelector && li.querySelector(".sp-notice")) return false;
    return true;
  }
  function getValidPostRows(currentPostNo, root = typeof document !== "undefined" ? document : null) {
    if (!root || !root.querySelectorAll) return [];
    const tableRows = Array.from(root.querySelectorAll("table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content"));
    if (tableRows.length > 0) {
      return tableRows.filter((tr) => isDesktopPostRowValid(tr, currentPostNo));
    }
    const mobileItems = Array.from(root.querySelectorAll(".gall-detail-lst li, .gall-thum-btm li"));
    return mobileItems.filter(isMobilePostItemValid);
  }
  function findCurrentPostRowIndex(validRows, currentPostNo) {
    return validRows.findIndex((row) => {
      if (row.classList && row.classList.contains("crt") || row.className && row.className.includes("crt") || !!row.querySelector?.(".crt_icon")) {
        return true;
      }
      if (currentPostNo) {
        const numEl = row.querySelector?.(".gall_num");
        if (numEl && numEl.textContent.trim() === currentPostNo) return true;
        const titLink = row.querySelector?.(".gall_tit a:not(.reply_numbox)") || row.querySelector?.("a");
        if (titLink && extractPostNo(titLink.href) === currentPostNo) return true;
      }
      return false;
    });
  }
  function hasPhotoAttachment(row) {
    if (!row) return false;
    const subjectEl = row.querySelector?.(".gall_subject");
    if (subjectEl) {
      const subj = subjectEl.textContent.trim();
      if (subj.includes("\uC0AC\uC9C4")) return true;
    }
    const photoIcon = row.querySelector?.(
      '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg'
    );
    if (photoIcon) return true;
    const mobilePhotoIcon = row.querySelector?.('.sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]');
    if (mobilePhotoIcon) return true;
    const anyImgIcon = row.querySelector?.(".icon_img");
    if (anyImgIcon) {
      const cls = anyImgIcon.className || "";
      if (!cls.includes("icon_txt") && !cls.includes("survey") && !cls.includes("notice") && !cls.includes("ad")) {
        return true;
      }
    }
    return false;
  }
  function getAdjacentPostUrl(direction, preferPhotos = true, currentUrl = typeof window !== "undefined" ? window.location?.href : "") {
    const currentPostNo = extractPostNo(currentUrl);
    const validRows = getValidPostRows(currentPostNo);
    if (validRows.length === 0) {
      return null;
    }
    const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
    if (currentIdx === -1) {
      return null;
    }
    const step = direction === "up" ? -1 : 1;
    let targetIdx = -1;
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
    if (targetIdx === -1) {
      const fallbackIdx = currentIdx + step;
      if (fallbackIdx >= 0 && fallbackIdx < validRows.length) {
        targetIdx = fallbackIdx;
      }
    }
    if (targetIdx < 0) {
      return { error: "top", message: "\uBAA9\uB85D\uC758 \uAC00\uC7A5 \uCD5C\uC2E0 \uAE00\uC785\uB2C8\uB2E4." };
    }
    if (targetIdx >= validRows.length) {
      return { error: "bottom", message: "\uBAA9\uB85D\uC758 \uB9C8\uC9C0\uB9C9 \uAE00\uC785\uB2C8\uB2E4." };
    }
    const targetRow = validRows[targetIdx];
    const targetLink = targetRow.querySelector?.(".gall_tit a:not(.reply_numbox)") || targetRow.querySelector?.("a");
    const targetTitle = targetLink ? (targetLink.textContent || "").trim().replace(/\s+/g, " ") : "";
    return {
      url: targetLink ? targetLink.href : null,
      title: targetTitle,
      hasPhoto: hasPhotoAttachment(targetRow)
    };
  }

  // src/ui/overlay.js
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
          \uB514\uC2DC \uC0AC\uC9C4 \uBDF0\uC5B4
        </div>
        <div class="disagall-counter" id="disagall-counter">1 / 1</div>
        <div class="disagall-info-badge" id="disagall-info-badge">\uD654\uBA74 \uB9DE\uCDA4</div>
      </div>

      <div class="disagall-header-center">
        <div class="disagall-padding-control">
          <span class="disagall-slider-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <rect x="7" y="7" width="10" height="10" rx="1" ry="1"></rect>
            </svg>
            \uC5EC\uBC31(\uD328\uB529):
          </span>
          <input type="range" class="disagall-slider" id="disagall-slider" min="0" max="100" value="${state.currentPadding}">
          <span class="disagall-padding-val" id="disagall-slider-val">${state.currentPadding}px</span>
        </div>
      </div>

      <div class="disagall-header-right">
        <button class="disagall-btn disagall-btn-recommend" id="disagall-btn-recommend" title="\uAC1C\uB150\uAE00 \uCD94\uCC9C (\uB2E8\uCD95\uD0A4: R)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span>\uAC1C\uCD94</span>
        </button>
        <button class="disagall-btn disagall-btn-close" id="disagall-close-btn" title="\uB2EB\uAE30 (ESC)">\u2715 \uB2EB\uAE30</button>
      </div>
    </div>

    <div class="disagall-stage" id="disagall-stage">
      <div class="disagall-nav-btn disagall-nav-btn-prev" id="disagall-prev-btn" title="\uC774\uC804 \uC774\uBBF8\uC9C0 (\u2190)">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        <span class="disagall-nav-hint">\u2190</span>
      </div>

      <div class="disagall-loader" id="disagall-loader">
        <div class="disagall-spinner"></div>
        <span>\uACE0\uD654\uC9C8 \uC6D0\uBCF8 \uB85C\uB529 \uC911...</span>
      </div>

      <div class="disagall-img-wrapper" id="disagall-img-wrapper">
        <img class="disagall-img" id="disagall-main-img" src="" alt="\uD655\uB300 \uBDF0\uC5B4 \uC774\uBBF8\uC9C0" />
      </div>

      <div class="disagall-nav-btn disagall-nav-btn-next" id="disagall-next-btn" title="\uB2E4\uC74C \uC774\uBBF8\uC9C0 (\u2192)">
        <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        <span class="disagall-nav-hint">\u2192</span>
      </div>
    </div>

    <div class="disagall-toast" id="disagall-toast"></div>

    <div class="disagall-footer">
      <div class="disagall-keyhints">
        <div class="disagall-keyhint"><span class="disagall-kbd">R</span> \uAC1C\uCD94</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\u2191</span> <span class="disagall-kbd">\u2193</span> \uC774\uC804/\uB2E4\uC74C \uAE00</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\u2190</span> <span class="disagall-kbd">\u2192</span> \uC774\uC804/\uB2E4\uC74C \uC0AC\uC9C4</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB9C8\uC6B0\uC2A4 \uD720 / \uD2B8\uB799\uD328\uB4DC</span> \uD655\uB300/\uCD95\uC18C</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB4DC\uB798\uADF8</span> \uC0AC\uC9C4 \uC774\uB3D9</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB354\uBE14\uD074\uB9AD</span> \uD655\uB300 \uB9AC\uC14B</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> \uB2EB\uAE30</div>
      </div>
    </div>
  `;
  }
  function cacheOverlayElements() {
    state.elements.overlayEl = document.getElementById("disagall-viewer-overlay");
    state.elements.mainImgEl = document.getElementById("disagall-main-img");
    state.elements.counterEl = document.getElementById("disagall-counter");
    state.elements.infoBadgeEl = document.getElementById("disagall-info-badge");
    state.elements.sliderEl = document.getElementById("disagall-slider");
    state.elements.sliderValEl = document.getElementById("disagall-slider-val");
    state.elements.prevBtnEl = document.getElementById("disagall-prev-btn");
    state.elements.nextBtnEl = document.getElementById("disagall-next-btn");
    state.elements.loaderEl = document.getElementById("disagall-loader");
    state.elements.toastEl = document.getElementById("disagall-toast");
    state.elements.recommendBtnEl = document.getElementById("disagall-btn-recommend");
  }
  function applyFittingAndPadding() {
    const { mainImgEl, overlayEl, infoBadgeEl } = state.elements;
    if (!mainImgEl || !mainImgEl.naturalWidth || !mainImgEl.naturalHeight) return;
    const nw = mainImgEl.naturalWidth;
    const nh = mainImgEl.naturalHeight;
    const isPortrait = nh >= nw;
    const headerEl = overlayEl ? overlayEl.querySelector(".disagall-header") : null;
    const footerEl = overlayEl ? overlayEl.querySelector(".disagall-footer") : null;
    const headerHeight = headerEl ? headerEl.offsetHeight : 52;
    const footerHeight = footerEl ? footerEl.offsetHeight : 38;
    const availableHeight = Math.max(100, window.innerHeight - headerHeight - footerHeight - state.currentPadding * 2);
    const availableWidth = Math.max(100, window.innerWidth - state.currentPadding * 2);
    const widthRatio = availableWidth / nw;
    const heightRatio = availableHeight / nh;
    const scale = Math.min(widthRatio, heightRatio);
    const targetWidth = Math.round(nw * scale);
    const targetHeight = Math.round(nh * scale);
    mainImgEl.style.maxWidth = `${targetWidth}px`;
    mainImgEl.style.maxHeight = `${targetHeight}px`;
    mainImgEl.style.width = "100%";
    mainImgEl.style.height = "100%";
    const orientationText = isPortrait ? `\uC138\uB85C \uC0AC\uC9C4 (${nw}x${nh})` : `\uAC00\uB85C \uC0AC\uC9C4 (${nw}x${nh})`;
    if (infoBadgeEl) {
      infoBadgeEl.textContent = orientationText;
    }
    if (isPortrait) {
      mainImgEl.classList.add("portrait");
      mainImgEl.classList.remove("landscape");
    } else {
      mainImgEl.classList.add("landscape");
      mainImgEl.classList.remove("portrait");
    }
  }
  function showViewerToast(message, duration = CONFIG.TOAST_DURATION) {
    const { toastEl } = state.elements;
    if (!toastEl) return;
    if (state.toastTimer) clearTimeout(state.toastTimer);
    toastEl.textContent = message;
    toastEl.classList.add("show");
    state.toastTimer = setTimeout(() => {
      if (toastEl) toastEl.classList.remove("show");
    }, duration);
  }
  function showNoPhotoNotice(onNavigatePost) {
    let noticeEl = document.getElementById("disagall-no-photo-notice");
    if (noticeEl) noticeEl.remove();
    noticeEl = document.createElement("div");
    noticeEl.id = "disagall-no-photo-notice";
    noticeEl.className = "disagall-no-photo-notice";
    noticeEl.innerHTML = `
    <div class="disagall-notice-content">
      <span class="disagall-notice-icon">\u{1F4F7}</span>
      <span class="disagall-notice-text">\uBCF8\uBB38\uC5D0 \uC0AC\uC9C4\uC774 \uC5C6\uB294 \uAE00\uC785\uB2C8\uB2E4. (\uC0AC\uC9C4 \uD0ED \uBBF8\uC801\uC6A9)</span>
    </div>
    <div class="disagall-notice-btns">
      <button id="disagall-notice-prev" class="disagall-notice-btn" title="\uC774\uC804 \uAE00 (\u2191 / W)">\u2191 \uC774\uC804 \uAE00</button>
      <button id="disagall-notice-next" class="disagall-notice-btn" title="\uB2E4\uC74C \uAE00 (\u2193 / S)">\u2193 \uB2E4\uC74C \uAE00</button>
      <button id="disagall-notice-close" class="disagall-notice-btn close" title="\uB2EB\uAE30 (ESC)">\u2715</button>
    </div>
  `;
    document.body.appendChild(noticeEl);
    const prevBtn = noticeEl.querySelector("#disagall-notice-prev");
    const nextBtn = noticeEl.querySelector("#disagall-notice-next");
    const closeBtn = noticeEl.querySelector("#disagall-notice-close");
    if (prevBtn) prevBtn.addEventListener("click", () => onNavigatePost("up"));
    if (nextBtn) nextBtn.addEventListener("click", () => onNavigatePost("down"));
    if (closeBtn) closeBtn.addEventListener("click", () => noticeEl.remove());
    const handleNoticeKey = (e) => {
      if (["ArrowUp", "w", "W"].includes(e.key)) {
        e.preventDefault();
        window.removeEventListener("keydown", handleNoticeKey);
        onNavigatePost("up");
      } else if (["ArrowDown", "s", "S"].includes(e.key)) {
        e.preventDefault();
        window.removeEventListener("keydown", handleNoticeKey);
        onNavigatePost("down");
      } else if (e.key === "Escape") {
        noticeEl.remove();
        window.removeEventListener("keydown", handleNoticeKey);
      }
    };
    window.addEventListener("keydown", handleNoticeKey);
    setTimeout(() => {
      if (noticeEl && noticeEl.parentNode) {
        noticeEl.remove();
        window.removeEventListener("keydown", handleNoticeKey);
      }
    }, CONFIG.NO_PHOTO_NOTICE_DURATION);
  }

  // src/ui/zoom_pan.js
  function onWindowMouseMove(e) {
    if (!state.zoom.isDragging) return;
    state.zoom.panX = e.clientX - state.zoom.startX;
    state.zoom.panY = e.clientY - state.zoom.startY;
    updateImgTransform();
  }
  function onWindowMouseUp() {
    if (state.zoom.isDragging) {
      state.zoom.isDragging = false;
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
      updateImgTransform();
    }
  }
  function updateImgTransform() {
    const { mainImgEl, infoBadgeEl } = state.elements;
    if (!mainImgEl) return;
    if (state.zoom.transformRafId) cancelAnimationFrame(state.zoom.transformRafId);
    state.zoom.transformRafId = requestAnimationFrame(() => {
      if (state.zoom.scale <= 1.001) {
        state.zoom.scale = 1;
        state.zoom.panX = 0;
        state.zoom.panY = 0;
        mainImgEl.style.transform = `translate(0px, 0px) scale(1)`;
        mainImgEl.style.cursor = "default";
        if (infoBadgeEl && mainImgEl.naturalWidth) {
          const isPortrait = mainImgEl.naturalHeight >= mainImgEl.naturalWidth;
          infoBadgeEl.textContent = isPortrait ? `\uC138\uB85C \uC0AC\uC9C4 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})` : `\uAC00\uB85C \uC0AC\uC9C4 (${mainImgEl.naturalWidth}x${mainImgEl.naturalHeight})`;
        }
      } else {
        mainImgEl.style.cursor = state.zoom.isDragging ? "grabbing" : "grab";
        mainImgEl.style.transform = `translate(${state.zoom.panX}px, ${state.zoom.panY}px) scale(${state.zoom.scale.toFixed(2)})`;
        if (infoBadgeEl) {
          infoBadgeEl.textContent = `\u{1F50D} \uD655\uB300: ${(state.zoom.scale * 100).toFixed(0)}% (\uB4DC\uB798\uADF8\uB85C \uC774\uB3D9 / \uB354\uBE14\uD074\uB9AD \uCD08\uAE30\uD654)`;
        }
      }
    });
  }
  function resetZoom() {
    state.zoom.scale = 1;
    state.zoom.panX = 0;
    state.zoom.panY = 0;
    if (state.zoom.isDragging) {
      state.zoom.isDragging = false;
      window.removeEventListener("mousemove", onWindowMouseMove);
      window.removeEventListener("mouseup", onWindowMouseUp);
    }
    updateImgTransform();
  }
  function setupZoomEvents(mainImgEl) {
    if (!mainImgEl) return;
    mainImgEl.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
      const oldScale = state.zoom.scale;
      state.zoom.scale = Math.min(Math.max(1, state.zoom.scale + zoomDelta), 5);
      if (state.zoom.scale === 1) {
        state.zoom.panX = 0;
        state.zoom.panY = 0;
      } else if (oldScale === 1 && state.zoom.scale > 1) {
        state.zoom.panX = 0;
        state.zoom.panY = 0;
      }
      updateImgTransform();
    }, { passive: false });
    mainImgEl.addEventListener("mousedown", (e) => {
      if (state.zoom.scale > 1 && e.button === 0) {
        e.preventDefault();
        state.zoom.isDragging = true;
        state.zoom.startX = e.clientX - state.zoom.panX;
        state.zoom.startY = e.clientY - state.zoom.panY;
        window.addEventListener("mousemove", onWindowMouseMove);
        window.addEventListener("mouseup", onWindowMouseUp);
        updateImgTransform();
      }
    });
    mainImgEl.addEventListener("dblclick", (e) => {
      e.preventDefault();
      if (state.zoom.scale > 1) {
        resetZoom();
      } else {
        state.zoom.scale = 2;
        state.zoom.panX = 0;
        state.zoom.panY = 0;
        updateImgTransform();
      }
    });
  }

  // src/parser/recommend_parser.js
  var RECOMMEND_BUTTON_SELECTORS = [
    "button.btn_recom_up",
    ".btn_recommend_box button.btn_recom_up",
    ".btn_recommend_box button",
    ".btn_recom_up",
    ".btn-recom",
    ".btn_recommend",
    'button[data-action="recommend"]',
    'button[data-type="recommend"]',
    'button[onclick*="recom"]',
    'a[onclick*="recom"]',
    "button.recom_btn",
    'button[id*="recommend"]',
    "button[data-no]",
    "a.btn_recom_up",
    "div.btn_recom_up"
  ].join(", ");
  function getPostRecommendCount(root = typeof document !== "undefined" ? document : null) {
    if (!root || !root.querySelector) return null;
    const countEl = root.querySelector('[id^="recommend_view_up_"], .up_num_box .up_num, .btn_recommend_box .up_num, .recom_num');
    if (countEl) {
      const text = (countEl.textContent || "").trim();
      const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) return num;
    }
    return null;
  }
  function getNativeRecommendButton(root = typeof document !== "undefined" ? document : null) {
    if (!root || !root.querySelector) return null;
    return root.querySelector(RECOMMEND_BUTTON_SELECTORS);
  }
  function isUserLoggedIn(root = typeof document !== "undefined" ? document : null) {
    if (!root) return false;
    const isLoginInput = (root.getElementById ? root.getElementById("is_login") : null) || (root.querySelector ? root.querySelector('input[name="is_login"]') : null);
    if (isLoginInput && isLoginInput.value) {
      return isLoginInput.value.trim().toUpperCase() === "Y";
    }
    const loginOutBtn = root.querySelector?.('.btn_top_loginout, .login_info a, .user_info .logout, a[href*="logout"]');
    if (loginOutBtn) {
      const text = (loginOutBtn.textContent || "").trim();
      if (text.includes("\uB85C\uADF8\uC544\uC6C3")) return true;
      if (text.includes("\uB85C\uADF8\uC778")) return false;
    }
    if (root.querySelector?.(".my_nick, .user_name, .btn_logout, .user_info_box")) {
      return true;
    }
    return false;
  }
  function isGalleryCodeEnforced(root = typeof document !== "undefined" ? document : null) {
    if (!root) return false;
    const kcaptchaInput = (root.getElementById ? root.getElementById("kcaptcha_use") : null) || (root.querySelector ? root.querySelector('input[name="kcaptcha_use"]') : null);
    if (kcaptchaInput && kcaptchaInput.value) {
      return kcaptchaInput.value.trim().toUpperCase() === "Y";
    }
    return !!root.querySelector?.('#kcaptcha, [id*="kcaptcha"], .captcha_box');
  }
  function dispatchRecommendClick(btn) {
    if (!btn) return false;
    if (typeof btn.click === "function") {
      try {
        btn.click();
        return true;
      } catch (e) {
      }
    }
    try {
      const mouseEvt = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: typeof window !== "undefined" ? window : null,
        buttons: 1
      });
      return btn.dispatchEvent(mouseEvt);
    } catch (err) {
      return false;
    }
  }

  // src/controller/recommend_controller.js
  var lastRecommendTime = 0;
  var isRecommending = false;
  var hasVotedCurrentPost = false;
  function updateRecommendButtonUi() {
    const { recommendBtnEl } = state.elements;
    if (!recommendBtnEl) return;
    const count = getPostRecommendCount();
    const countText = count !== null ? ` (${count})` : "";
    const isLoggedIn = isUserLoggedIn();
    const isCodeEnforced = isGalleryCodeEnforced();
    const lockIcon = !isLoggedIn && isCodeEnforced ? " \u{1F512}" : "";
    const hintTitle = !isLoggedIn && isCodeEnforced ? "\uAC1C\uB150\uAE00 \uCD94\uCC9C (\uBE44\uD68C\uC6D0 \uCF54\uB4DC/\uB85C\uADF8\uC778 \uC81C\uD55C \uAC24\uB7EC\uB9AC - \uB2E8\uCD95\uD0A4: R)" : "\uAC1C\uB150\uAE00 \uCD94\uCC9C (\uB2E8\uCD95\uD0A4: R)";
    recommendBtnEl.title = hintTitle;
    recommendBtnEl.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
    <span>\uAC1C\uCD94${countText}${lockIcon}</span>
  `;
  }
  function triggerPostRecommend() {
    const { recommendBtnEl } = state.elements;
    if (isRecommending) return false;
    const now = Date.now();
    if (now - lastRecommendTime < CONFIG.RECOMMEND_THROTTLE_MS) {
      showViewerToast("\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      return false;
    }
    const btn = getNativeRecommendButton();
    if (!btn) {
      showViewerToast("\uBCF8\uBB38\uC758 \uCD94\uCC9C \uBC84\uD2BC\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return false;
    }
    const isAlreadyVoted = hasVotedCurrentPost || btn.disabled || recommendBtnEl && recommendBtnEl.classList.contains("voted");
    if (isAlreadyVoted) {
      showViewerToast("\uC774\uBBF8 \uAC1C\uB150\uAE00 \uCD94\uCC9C\uC744 \uC644\uB8CC\uD55C \uAC8C\uC2DC\uAE00\uC785\uB2C8\uB2E4. \u{1F44D}");
      return true;
    }
    const isLoggedIn = isUserLoggedIn();
    const isCodeEnforced = isGalleryCodeEnforced();
    const beforeCount = getPostRecommendCount();
    lastRecommendTime = now;
    isRecommending = true;
    try {
      dispatchRecommendClick(btn);
      if (!isLoggedIn && isCodeEnforced) {
        showViewerToast("\uAC1C\uCD94 \uC2DC\uB3C4 \uC911... (\uBE44\uD68C\uC6D0 \uCF54\uB4DC \uC81C\uD55C \uAC00\uB2A5 \u{1F512})");
      } else {
        showViewerToast("\uAC1C\uB150\uAE00 \uCD94\uCC9C\uC744 \uB20C\uB800\uC2B5\uB2C8\uB2E4! \u{1F44D}");
      }
      setTimeout(() => {
        const midCount = getPostRecommendCount();
        updateRecommendButtonUi();
        if (midCount !== null && beforeCount !== null && midCount > beforeCount) {
          hasVotedCurrentPost = true;
          if (recommendBtnEl) recommendBtnEl.classList.add("voted");
          showViewerToast("\uAC1C\uB150\uAE00 \uCD94\uCC9C\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4! \u{1F44D}");
        }
      }, CONFIG.RECOMMEND_SYNC_DELAYS[0]);
      setTimeout(() => {
        const afterCount = getPostRecommendCount();
        updateRecommendButtonUi();
        if (afterCount !== null && beforeCount !== null) {
          if (afterCount > beforeCount) {
            hasVotedCurrentPost = true;
            if (recommendBtnEl) recommendBtnEl.classList.add("voted");
          } else {
            hasVotedCurrentPost = false;
            if (!isLoggedIn) {
              if (recommendBtnEl) recommendBtnEl.classList.remove("voted");
              showViewerToast("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD55C \uAC24\uB7EC\uB9AC\uC785\uB2C8\uB2E4. (\uBE44\uD68C\uC6D0 \uCD94\uCC9C \uC81C\uD55C \u{1F512})", 2500);
            } else {
              showViewerToast("\uCD94\uCC9C\uC774 \uBC18\uC601\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. (\uC774\uBBF8 \uCD94\uCC9C\uD588\uAC70\uB098 \uC81C\uD55C\uB428)");
            }
          }
        }
      }, CONFIG.RECOMMEND_SYNC_DELAYS[1]);
      return true;
    } catch (e) {
      showViewerToast("\uCD94\uCC9C \uC2E4\uD589 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      return false;
    } finally {
      setTimeout(() => {
        isRecommending = false;
      }, 500);
    }
  }

  // src/controller/viewer_controller.js
  function forcePreloadPostImages() {
    const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
    imgs.forEach((img) => {
      if (!isPostBodyImage(img)) return;
      const orig = img.getAttribute("data-original") || img.getAttribute("data-src") || img.getAttribute("data-url") || (img.dataset ? img.dataset.original || img.dataset.src || img.dataset.url : null);
      if (orig && (img.src.includes("loading") || img.src.includes("blank.gif") || img.classList.contains("lazy"))) {
        img.src = orig;
        img.classList.remove("lazy");
      }
    });
    try {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("resize"));
    } catch (e) {
    }
  }
  function collectPostImages() {
    state.postImages = extractPostImages(document);
    return state.postImages;
  }
  function showImage(index) {
    if (state.postImages.length === 0) return;
    resetZoom();
    state.currentIndex = (index + state.postImages.length) % state.postImages.length;
    const imgData = state.postImages[state.currentIndex];
    const { counterEl, prevBtnEl, nextBtnEl, loaderEl, mainImgEl } = state.elements;
    if (counterEl) {
      counterEl.textContent = `${state.currentIndex + 1} / ${state.postImages.length}`;
    }
    if (prevBtnEl) {
      prevBtnEl.classList.toggle("disabled", state.postImages.length <= 1);
    }
    if (nextBtnEl) {
      nextBtnEl.classList.toggle("disabled", state.postImages.length <= 1);
    }
    if (loaderEl) loaderEl.style.display = "flex";
    if (mainImgEl) {
      mainImgEl.style.opacity = "0";
      mainImgEl.referrerPolicy = "no-referrer-when-downgrade";
    }
    const tempImg = new Image();
    tempImg.referrerPolicy = "no-referrer-when-downgrade";
    tempImg.onload = () => {
      if (mainImgEl) {
        mainImgEl.src = tempImg.src;
        mainImgEl.alt = imgData.alt;
        if (loaderEl) loaderEl.style.display = "none";
        mainImgEl.style.opacity = "1";
        applyFittingAndPadding();
      }
    };
    tempImg.onerror = () => {
      if (mainImgEl) {
        const fallbackSrc = imgData.element && (imgData.element.currentSrc || imgData.element.src) || imgData.url;
        mainImgEl.src = fallbackSrc;
        mainImgEl.alt = imgData.alt;
        if (loaderEl) loaderEl.style.display = "none";
        mainImgEl.style.opacity = "1";
        applyFittingAndPadding();
      }
    };
    tempImg.src = imgData.url;
  }
  function navigate(direction) {
    showImage(state.currentIndex + direction);
  }
  function navigatePost(direction) {
    const result = getAdjacentPostUrl(direction);
    if (!result) {
      showViewerToast("\uC774\uB3D9\uD560 \uC218 \uC788\uB294 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    if (result.error) {
      showViewerToast(result.message);
      return;
    }
    if (result.url) {
      const label = direction === "up" ? "\uC704\uCABD \uCD5C\uC2E0 \uAE00" : "\uC544\uB798\uCABD \uC774\uC804 \uAE00";
      const photoHint = result.hasPhoto ? " \u{1F4F7}" : "";
      const titleHint = result.title ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + "..." : result.title})` : "";
      showViewerToast(`${label}\uB85C \uC774\uB3D9 \uC911...${photoHint}${titleHint}`);
      try {
        sessionStorage.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, "1");
      } catch (e) {
      }
      setTimeout(() => {
        window.location.href = result.url;
      }, CONFIG.POST_NAV_DELAY);
    }
  }
  var KEY_ACTIONS = {
    "Escape": () => closeViewer(),
    "ArrowLeft": () => navigate(-1),
    "a": () => navigate(-1),
    "A": () => navigate(-1),
    "ArrowRight": () => navigate(1),
    "d": () => navigate(1),
    "D": () => navigate(1),
    "ArrowUp": () => navigatePost("up"),
    "w": () => navigatePost("up"),
    "W": () => navigatePost("up"),
    "ArrowDown": () => navigatePost("down"),
    "s": () => navigatePost("down"),
    "S": () => navigatePost("down"),
    "r": () => triggerPostRecommend(),
    "R": () => triggerPostRecommend(),
    "c": () => triggerPostRecommend(),
    "C": () => triggerPostRecommend()
  };
  function handleKeyDown(e) {
    const { overlayEl } = state.elements;
    if (!overlayEl || !overlayEl.classList.contains("active")) return;
    if (e.repeat) return;
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.isContentEditable)) {
      if (e.key === "Escape") {
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
  function createOverlay() {
    if (state.elements.overlayEl) return;
    const overlay = document.createElement("div");
    overlay.id = "disagall-viewer-overlay";
    overlay.innerHTML = buildOverlayHtml();
    document.body.appendChild(overlay);
    cacheOverlayElements();
    const { overlayEl, mainImgEl, prevBtnEl, nextBtnEl, sliderEl, sliderValEl, recommendBtnEl } = state.elements;
    document.getElementById("disagall-close-btn").addEventListener("click", closeViewer);
    if (recommendBtnEl) {
      recommendBtnEl.addEventListener("click", (e) => {
        e.stopPropagation();
        triggerPostRecommend();
      });
    }
    if (prevBtnEl) {
      prevBtnEl.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(-1);
      });
    }
    if (nextBtnEl) {
      nextBtnEl.addEventListener("click", (e) => {
        e.stopPropagation();
        navigate(1);
      });
    }
    if (sliderEl) {
      sliderEl.addEventListener("input", (e) => {
        state.currentPadding = parseInt(e.target.value, 10);
        if (sliderValEl) sliderValEl.textContent = state.currentPadding + "px";
        applyFittingAndPadding();
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
          chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: state.currentPadding });
        } else if (typeof GM_setValue !== "undefined") {
          GM_setValue(CONFIG.STORAGE_KEY_PADDING, state.currentPadding);
        }
      });
    }
    overlayEl.addEventListener("click", (e) => {
      if (e.target === overlayEl || e.target.id === "disagall-stage" || e.target.id === "disagall-img-wrapper") {
        closeViewer();
      }
    });
    setupZoomEvents(mainImgEl);
    window.addEventListener("keydown", handleKeyDown, true);
  }
  function openViewer(targetSrc, isAuto = false) {
    forcePreloadPostImages();
    collectPostImages();
    if (state.postImages.length === 0) {
      if (!isAuto) {
        alert("\uB514\uC2DC \uC0AC\uC9C4 \uBDF0\uC5B4: \uAC8C\uC2DC\uAE00 \uBCF8\uBB38\uC5D0\uC11C \uAC10\uC0C1 \uAC00\uB2A5\uD55C \uC774\uBBF8\uC9C0\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      }
      return;
    }
    createOverlay();
    let targetIndex = 0;
    const searchUrl = targetSrc ? getCleanOriginalUrl(targetSrc) : state.lastRightClickedImgSrc;
    if (searchUrl) {
      const foundIdx = state.postImages.findIndex((item) => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl));
      if (foundIdx !== -1) {
        targetIndex = foundIdx;
      }
    }
    const { overlayEl } = state.elements;
    overlayEl.classList.add("active");
    state.previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    updateRecommendButtonUi();
    showImage(targetIndex);
  }
  function closeViewer() {
    const { overlayEl } = state.elements;
    if (overlayEl) {
      overlayEl.classList.remove("active");
      document.body.style.overflow = state.previousBodyOverflow;
    }
  }
  function checkAutoOpen() {
    try {
      const autoOpen = sessionStorage.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN);
      if (autoOpen === "1") {
        sessionStorage.removeItem(CONFIG.STORAGE_KEY_AUTO_OPEN);
        let attempts = 0;
        const maxAttempts = CONFIG.AUTO_OPEN_MAX_ATTEMPTS;
        const pollTimer = setInterval(() => {
          attempts++;
          forcePreloadPostImages();
          collectPostImages();
          if (state.postImages.length > 0) {
            clearInterval(pollTimer);
            openViewer(null, true);
          } else if (attempts >= maxAttempts) {
            clearInterval(pollTimer);
            showNoPhotoNotice((dir) => navigatePost(dir));
          }
        }, CONFIG.AUTO_OPEN_POLL_INTERVAL);
      }
    } catch (e) {
    }
  }
  function initViewerBase() {
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;
      if (target && target.tagName === "IMG" && isPostBodyImage(target)) {
        state.lastRightClickedImgSrc = getCleanOriginalUrl(target.src);
      } else {
        state.lastRightClickedImgSrc = null;
      }
    }, true);
    let resizeRafId = null;
    window.addEventListener("resize", () => {
      const { overlayEl } = state.elements;
      if (overlayEl && overlayEl.classList.contains("active")) {
        if (resizeRafId) cancelAnimationFrame(resizeRafId);
        resizeRafId = requestAnimationFrame(() => {
          applyFittingAndPadding();
          resizeRafId = null;
        });
      }
    });
    window.addEventListener("message", (event) => {
      if (event.origin && event.origin !== window.location.origin && window.location.origin !== "null") return;
      if (event.data && event.data.action === "disagall_test_open") {
        openViewer();
      }
    });
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", checkAutoOpen);
    } else {
      checkAutoOpen();
    }
  }

  // src/extension.js
  (function() {
    "use strict";
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get([CONFIG.STORAGE_KEY_PADDING], (result) => {
        if (result && typeof result[CONFIG.STORAGE_KEY_PADDING] === "number") {
          state.currentPadding = result[CONFIG.STORAGE_KEY_PADDING];
          const { sliderEl, sliderValEl } = state.elements;
          if (sliderEl) {
            sliderEl.value = state.currentPadding;
            if (sliderValEl) sliderValEl.textContent = state.currentPadding + "px";
          }
        }
      });
    }
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === "open_viewer") {
          openViewer(message.srcUrl);
          sendResponse({ success: true });
        }
      });
    }
    initViewerBase();
  })();
})();
