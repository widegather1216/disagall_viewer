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
    NO_PHOTO_NOTICE_DURATION: 8e3,
    // Immersion & UI Auto-Hide
    UI_IDLE_TIMEOUT: 2500,
    STORAGE_KEY_AUTO_HIDE_UI: "autoHideUi",
    STORAGE_KEY_AUTO_FULLSCREEN: "autoFullscreen",
    PADDING_MIN: 0,
    PADDING_MAX: 100,
    PADDING_SAVE_DEBOUNCE_MS: 250,
    ZOOM_EPSILON: 1.001
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
      stageEl: null,
      mainImgEl: null,
      counterEl: null,
      infoBadgeEl: null,
      sliderEl: null,
      sliderValEl: null,
      prevBtnEl: null,
      nextBtnEl: null,
      loaderEl: null,
      toastEl: null,
      recommendBtnEl: null,
      fullscreenBtnEl: null
    },
    toastTimer: null,
    noPhotoNoticeTimer: null,
    postNavTimer: null,
    autoOpenPollTimer: null,
    quickLauncherTimer: null,
    resizeRafId: null,
    recommendTimers: [],
    recommendUnlockTimer: null,
    // Immersion & UI Auto-Hide
    idleTimer: null,
    paddingSaveTimer: null,
    autoHideUi: true,
    autoFullscreen: false,
    isUiHidden: false,
    isFullscreenMode: false,
    isFullscreenPaddingZero: false,
    // Zoom & Pan
    zoom: {
      scale: 1,
      panX: 0,
      panY: 0,
      isDragging: false,
      pendingDragRelease: false,
      startX: 0,
      startY: 0,
      transformRafId: null,
      suppressNextBackdropClick: false,
      suppressClickTimer: null
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
    ".lnb",
    "#disagall-viewer-overlay"
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
  var DEFAULT_ORIGIN = "https://gall.dcinside.com";
  var LAZY_ATTRS = ["data-original", "data-src", "data-url", "data-lazy-src"];
  var LAZY_DATASET_KEYS = ["original", "src", "url"];
  var PLACEHOLDER_URL_SUBSTRINGS = ["gallview_loading", "loading", "blank.gif", "nstatic.dcinside.com"];
  var DC_ICON_URL_SUBSTRINGS = [
    "/dcicon/",
    "/emoticon/",
    "/dccon",
    "dccon.php",
    "nik.gif",
    "fix_nik.gif",
    "bestcon",
    "/btn_",
    "icon_",
    "logo",
    "banner",
    "gallview_loading",
    "nstatic.dcinside.com"
  ];
  var IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i;
  function resolveBaseOrigin() {
    const origin = typeof window !== "undefined" ? window.location?.origin : "";
    if (origin && origin !== "null" && (origin.startsWith("http://") || origin.startsWith("https://"))) {
      return origin;
    }
    return DEFAULT_ORIGIN;
  }
  function getCleanOriginalUrl(url, baseProtocol = typeof window !== "undefined" ? window.location?.protocol : "https:") {
    if (typeof url !== "string" || !url.trim()) return "";
    const trimmed = url.trim();
    const normalized = trimmed.startsWith("//") ? `${baseProtocol || "https:"}${trimmed}` : trimmed;
    try {
      const parsed = new URL(normalized, resolveBaseOrigin());
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return "";
      parsed.searchParams.delete("s");
      parsed.searchParams.delete("type");
      return parsed.toString();
    } catch (e) {
      return "";
    }
  }
  function isPlaceholderImageUrl(url) {
    return !url || PLACEHOLDER_URL_SUBSTRINGS.some((sub) => url.includes(sub));
  }
  function isImageCandidateUrl(url) {
    return Boolean(url && (url.includes("viewimage.php") || url.includes("dcimg") || url.includes("image") || IMAGE_EXT_REGEX.test(url)));
  }
  function collectImgUrlCandidates(img) {
    const candidates = [];
    for (const attr of LAZY_ATTRS) {
      const val = img.getAttribute?.(attr);
      if (val) candidates.push(val);
    }
    if (img.dataset) {
      for (const key of LAZY_DATASET_KEYS) {
        if (img.dataset[key]) candidates.push(img.dataset[key]);
      }
    }
    if (img.src) candidates.push(img.src);
    return candidates;
  }
  function getAnchorImageUrl(img) {
    const parentAnchor = img.closest ? img.closest("a") : null;
    if (!parentAnchor || !parentAnchor.href) return "";
    const cleanHref = getCleanOriginalUrl(parentAnchor.href);
    return isImageCandidateUrl(cleanHref) ? cleanHref : "";
  }
  function getBestImgUrl(img) {
    if (!img) return "";
    const cleaned = collectImgUrlCandidates(img).map((raw) => getCleanOriginalUrl(raw)).filter(Boolean);
    const validUrl = cleaned.find((u) => !isPlaceholderImageUrl(u));
    if (validUrl) return validUrl;
    const anchorUrl = getAnchorImageUrl(img);
    if (anchorUrl) return anchorUrl;
    return cleaned[0] || "";
  }
  function hasDcIconAttributes(img) {
    if (!img) return false;
    return Boolean(
      img.classList?.contains("written_dccon") || img.classList?.contains("dccon") || img.hasAttribute?.("conalt") || img.hasAttribute?.("detail") || img.dataset?.dcconoverstatus !== void 0 || img.title?.includes("\uAC24\uB85C\uADF8")
    );
  }
  function isDcIconOrUiAsset(img, url) {
    if (!url) return true;
    if (DC_ICON_URL_SUBSTRINGS.some((sub) => url.includes(sub))) return true;
    return hasDcIconAttributes(img);
  }
  function isPostBodyImage(img, resolvedUrl = null) {
    if (!img || img.tagName !== "IMG") return false;
    if (img.closest && img.closest(EXCLUDED_CONTAINER_SELECTORS)) return false;
    const url = resolvedUrl ?? getBestImgUrl(img);
    if (isDcIconOrUiAsset(img, url)) return false;
    if (img.closest && img.closest(POST_BODY_CONTAINER_SELECTORS)) return true;
    return Boolean(
      url.includes("viewimage.php") || url.includes("dcimg") || url.includes("dccdn") || url.includes("upload") || url.includes("image.dcinside") || IMAGE_EXT_REGEX.test(url)
    );
  }
  function extractImagesFromElements(imageElements = [], seenUrls = /* @__PURE__ */ new Set()) {
    const results = [];
    for (const img of imageElements) {
      const cleanUrl = getBestImgUrl(img);
      if (!cleanUrl || seenUrls.has(cleanUrl) || !isPostBodyImage(img, cleanUrl)) continue;
      seenUrls.add(cleanUrl);
      results.push({ url: cleanUrl, element: img, alt: img.alt || "\uB514\uC2DC \uAC24\uB7EC\uB9AC \uBCF8\uBB38 \uC774\uBBF8\uC9C0" });
    }
    return results;
  }
  function isNestedContainer(container, containerSet) {
    let parent = container.parentElement;
    while (parent) {
      if (containerSet.has(parent)) return true;
      parent = parent.parentElement;
    }
    return false;
  }
  function extractPostImages(root = typeof document !== "undefined" ? document : null) {
    if (!root || !root.querySelectorAll) return [];
    const seenUrls = /* @__PURE__ */ new Set();
    const collected = [];
    const rawContainers = Array.from(root.querySelectorAll(POST_BODY_CONTAINER_SELECTORS)).filter((c) => !c.closest || !c.closest(EXCLUDED_CONTAINER_SELECTORS));
    const containerSet = new Set(rawContainers);
    const containers = rawContainers.filter((c) => !isNestedContainer(c, containerSet));
    for (const container of containers) {
      collected.push(...extractImagesFromElements(container.querySelectorAll("img"), seenUrls));
    }
    if (collected.length === 0) {
      collected.push(...extractImagesFromElements(root.querySelectorAll("img"), seenUrls));
    }
    return collected;
  }

  // src/ui/dom_guards.js
  var NON_TEXT_INPUT_TYPES = /* @__PURE__ */ new Set([
    "range",
    "checkbox",
    "radio",
    "button",
    "submit",
    "reset",
    "color",
    "file",
    "hidden"
  ]);
  function isEditableTarget(target) {
    if (!target) return false;
    const tag = typeof target.tagName === "string" ? target.tagName.toUpperCase() : "";
    if (tag === "INPUT") {
      const inputType = typeof target.type === "string" ? target.type.toLowerCase() : "text";
      return !NON_TEXT_INPUT_TYPES.has(inputType);
    }
    return tag === "TEXTAREA" || tag === "SELECT" || Boolean(target.isContentEditable);
  }
  function isExternalModalOpen() {
    if (typeof document === "undefined" || typeof document.querySelector !== "function") {
      return false;
    }
    const openModal = document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]');
    if (!openModal) return false;
    const { overlayEl } = state.elements;
    return !overlayEl || typeof overlayEl.contains === "function" && !overlayEl.contains(openModal);
  }

  // src/ui/no_photo_notice.js
  var activeNoticeCleanup = null;
  function clearNoPhotoNoticeTimer() {
    if (state.noPhotoNoticeTimer === null) return;
    clearTimeout(state.noPhotoNoticeTimer);
    state.noPhotoNoticeTimer = null;
  }
  function buildNoPhotoNoticeHtml() {
    return `
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
  }
  function shouldIgnoreNoticeKey(e) {
    if (!e || e.repeat) return true;
    if (e.ctrlKey || e.metaKey || e.altKey) return true;
    const { overlayEl } = state.elements;
    if (overlayEl?.classList?.contains("active")) return true;
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    if (isEditableTarget(e.target) || isEditableTarget(activeEl)) return true;
    return isExternalModalOpen();
  }
  function resolveNoticeKeyAction(e) {
    if (["ArrowUp", "w", "W"].includes(e.key) || e.code === "KeyW") return "up";
    if (["ArrowDown", "s", "S"].includes(e.key) || e.code === "KeyS") return "down";
    if (e.key === "Escape") return "dismiss";
    return null;
  }
  function createNoticeKeyHandler(dismissNotice, onNavigatePost) {
    return (e) => {
      if (shouldIgnoreNoticeKey(e)) return;
      const action = resolveNoticeKeyAction(e);
      if (!action) return;
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
      dismissNotice();
      if (action !== "dismiss" && typeof onNavigatePost === "function") {
        onNavigatePost(action);
      }
    };
  }
  function bindNoticeButtons(noticeEl, dismissNotice, onNavigatePost) {
    const navigateFromNotice = (direction) => {
      dismissNotice();
      if (typeof onNavigatePost === "function") {
        onNavigatePost(direction);
      }
    };
    const prevBtn = noticeEl.querySelector?.("#disagall-notice-prev");
    const nextBtn = noticeEl.querySelector?.("#disagall-notice-next");
    const closeBtn = noticeEl.querySelector?.("#disagall-notice-close");
    if (prevBtn) prevBtn.addEventListener("click", () => navigateFromNotice("up"));
    if (nextBtn) nextBtn.addEventListener("click", () => navigateFromNotice("down"));
    if (closeBtn) closeBtn.addEventListener("click", dismissNotice);
  }
  function scheduleNoPhotoNoticeTimer(dismissNotice) {
    let fired = false;
    const timerId = setTimeout(() => {
      fired = true;
      dismissNotice();
    }, CONFIG.NO_PHOTO_NOTICE_DURATION);
    state.noPhotoNoticeTimer = fired ? null : timerId;
  }
  function dismissNoPhotoNotice() {
    if (activeNoticeCleanup) {
      const cleanup = activeNoticeCleanup;
      activeNoticeCleanup = null;
      cleanup();
    }
    clearNoPhotoNoticeTimer();
    if (typeof document !== "undefined" && typeof document.getElementById === "function") {
      const existingEl = document.getElementById("disagall-no-photo-notice");
      if (existingEl && typeof existingEl.remove === "function") {
        existingEl.remove();
      }
    }
  }
  function showNoPhotoNotice(onNavigatePost) {
    dismissNoPhotoNotice();
    if (typeof document === "undefined" || typeof document.createElement !== "function" || !document.body || typeof document.body.appendChild !== "function") {
      return;
    }
    const noticeEl = document.createElement("div");
    noticeEl.id = "disagall-no-photo-notice";
    noticeEl.className = "disagall-no-photo-notice";
    noticeEl.innerHTML = buildNoPhotoNoticeHtml();
    document.body.appendChild(noticeEl);
    let isDismissed = false;
    let handleNoticeKey = null;
    const dismissNotice = () => {
      if (isDismissed) return;
      isDismissed = true;
      if (activeNoticeCleanup === dismissNotice) activeNoticeCleanup = null;
      clearNoPhotoNoticeTimer();
      if (handleNoticeKey && typeof window !== "undefined" && typeof window.removeEventListener === "function") {
        window.removeEventListener("keydown", handleNoticeKey);
      }
      if (noticeEl && typeof noticeEl.remove === "function") noticeEl.remove();
    };
    handleNoticeKey = createNoticeKeyHandler(dismissNotice, onNavigatePost);
    activeNoticeCleanup = dismissNotice;
    bindNoticeButtons(noticeEl, dismissNotice, onNavigatePost);
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("keydown", handleNoticeKey);
    }
    scheduleNoPhotoNoticeTimer(dismissNotice);
  }

  // src/ui/overlay_template.js
  function buildHeaderLeftHtml() {
    return `
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
      </div>`;
  }
  function buildHeaderCenterHtml() {
    return `
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
      </div>`;
  }
  function buildHeaderRightHtml() {
    return `
      <div class="disagall-header-right">
        <button class="disagall-btn disagall-btn-recommend" id="disagall-btn-recommend" title="\uAC1C\uB150\uAE00 \uCD94\uCC9C (\uB2E8\uCD95\uD0A4: R)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span>\uAC1C\uCD94</span>
        </button>
        <button class="disagall-btn disagall-btn-fullscreen" id="disagall-btn-fullscreen" title="\uC804\uCCB4\uD654\uBA74 \uC804\uD658 (\uB2E8\uCD95\uD0A4: F)" aria-pressed="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span>\uC804\uCCB4\uD654\uBA74</span>
        </button>
        <button class="disagall-btn disagall-btn-close" id="disagall-close-btn" title="\uB2EB\uAE30 (ESC)">\u2715 \uB2EB\uAE30</button>
      </div>`;
  }
  function buildOverlayHeaderHtml() {
    return `
    <div class="disagall-header">
${buildHeaderLeftHtml()}
${buildHeaderCenterHtml()}
${buildHeaderRightHtml()}
    </div>`;
  }
  function buildOverlayStageHtml() {
    return `
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
    </div>`;
  }
  function buildOverlayFooterHtml() {
    return `
    <div class="disagall-footer">
      <div class="disagall-keyhints">
        <div class="disagall-keyhint"><span class="disagall-kbd">R</span> \uAC1C\uCD94</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\u2191</span> <span class="disagall-kbd">\u2193</span> \uC774\uC804/\uB2E4\uC74C \uAE00</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\u2190</span> <span class="disagall-kbd">\u2192</span> \uC774\uC804/\uB2E4\uC74C \uC0AC\uC9C4</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB9C8\uC6B0\uC2A4 \uD720 / \uD2B8\uB799\uD328\uB4DC</span> \uD655\uB300/\uCD95\uC18C</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB4DC\uB798\uADF8</span> \uC0AC\uC9C4 \uC774\uB3D9</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">\uB354\uBE14\uD074\uB9AD</span> \uD655\uB300 \uB9AC\uC14B</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">H</span> UI\uC228\uAE40</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">F</span> \uC804\uCCB4\uD654\uBA74</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> \uB2EB\uAE30</div>
      </div>
    </div>`;
  }
  function buildOverlayHtml() {
    return `${buildOverlayHeaderHtml()}
${buildOverlayStageHtml()}

    <div class="disagall-toast" id="disagall-toast"></div>
${buildOverlayFooterHtml()}
  `;
  }

  // src/ui/overlay.js
  var MIN_VIEWPORT_SIZE = 100;
  var DEFAULT_HEADER_HEIGHT = 52;
  var DEFAULT_FOOTER_HEIGHT = 38;
  function formatImageOrientationLabel(nw, nh) {
    return nh >= nw ? `\uC138\uB85C \uC0AC\uC9C4 (${nw}x${nh})` : `\uAC00\uB85C \uC0AC\uC9C4 (${nw}x${nh})`;
  }
  function cacheOverlayElements() {
    state.elements.overlayEl = document.getElementById("disagall-viewer-overlay");
    state.elements.stageEl = document.getElementById("disagall-stage");
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
    state.elements.fullscreenBtnEl = document.getElementById("disagall-btn-fullscreen");
  }
  function isUiHiddenState(overlayEl) {
    if (state.isUiHidden) return true;
    if (!overlayEl || !overlayEl.classList) return false;
    return overlayEl.classList.contains("disagall-idle") || overlayEl.classList.contains("disagall-ui-hidden");
  }
  function getOverlayChromeHeights(overlayEl) {
    if (isUiHiddenState(overlayEl)) {
      return { headerHeight: 0, footerHeight: 0 };
    }
    const hasQuery = overlayEl && typeof overlayEl.querySelector === "function";
    const headerEl = hasQuery ? overlayEl.querySelector(".disagall-header") : null;
    const footerEl = hasQuery ? overlayEl.querySelector(".disagall-footer") : null;
    return {
      headerHeight: headerEl && headerEl.offsetHeight ? headerEl.offsetHeight : DEFAULT_HEADER_HEIGHT,
      footerHeight: footerEl && footerEl.offsetHeight ? footerEl.offsetHeight : DEFAULT_FOOTER_HEIGHT
    };
  }
  function resolveStageElement(overlayEl) {
    if (state.elements.stageEl) return state.elements.stageEl;
    if (overlayEl && typeof overlayEl.querySelector === "function") {
      return overlayEl.querySelector("#disagall-stage") || overlayEl.querySelector(".disagall-stage");
    }
    return typeof document !== "undefined" ? document.getElementById("disagall-stage") : null;
  }
  function applyStageChromePadding(overlayEl) {
    const heights = getOverlayChromeHeights(overlayEl);
    const stageEl = resolveStageElement(overlayEl);
    if (stageEl && stageEl.style) {
      stageEl.style.paddingTop = `${heights.headerHeight}px`;
      stageEl.style.paddingBottom = `${heights.footerHeight}px`;
    }
    return heights;
  }
  function getEffectivePadding() {
    return state.isFullscreenMode && state.isFullscreenPaddingZero ? 0 : state.currentPadding;
  }
  function syncPaddingSliderUi() {
    const displayPadding = getEffectivePadding();
    const { sliderEl, sliderValEl } = state.elements;
    if (sliderEl) sliderEl.value = displayPadding;
    if (sliderValEl) sliderValEl.textContent = `${displayPadding}px`;
  }
  function applyFittedImageDimensions(mainImgEl, nw, nh, headerHeight, footerHeight) {
    const effectivePadding = getEffectivePadding();
    const availableHeight = Math.max(MIN_VIEWPORT_SIZE, window.innerHeight - headerHeight - footerHeight - effectivePadding * 2);
    const availableWidth = Math.max(MIN_VIEWPORT_SIZE, window.innerWidth - effectivePadding * 2);
    const scale = Math.min(availableWidth / nw, availableHeight / nh);
    mainImgEl.style.maxWidth = `${Math.round(nw * scale)}px`;
    mainImgEl.style.maxHeight = `${Math.round(nh * scale)}px`;
    mainImgEl.style.width = "100%";
    mainImgEl.style.height = "100%";
  }
  function updateOrientationUi(mainImgEl, infoBadgeEl, nw, nh) {
    const isPortrait = nh >= nw;
    if (infoBadgeEl) {
      infoBadgeEl.textContent = formatImageOrientationLabel(nw, nh);
    }
    mainImgEl.classList.toggle("portrait", isPortrait);
    mainImgEl.classList.toggle("landscape", !isPortrait);
  }
  function applyFittingAndPadding() {
    const { mainImgEl, overlayEl, infoBadgeEl } = state.elements;
    if (!mainImgEl || !mainImgEl.naturalWidth || !mainImgEl.naturalHeight) return;
    const nw = mainImgEl.naturalWidth;
    const nh = mainImgEl.naturalHeight;
    const { headerHeight, footerHeight } = applyStageChromePadding(overlayEl);
    applyFittedImageDimensions(mainImgEl, nw, nh, headerHeight, footerHeight);
    updateOrientationUi(mainImgEl, infoBadgeEl, nw, nh);
  }
  var toastSeq = 0;
  function dismissViewerToast() {
    toastSeq += 1;
    if (state.toastTimer !== null) {
      clearTimeout(state.toastTimer);
      state.toastTimer = null;
    }
    const { toastEl } = state.elements;
    if (toastEl && toastEl.classList) {
      toastEl.classList.remove("show");
    }
  }
  function showViewerToast(message, duration = CONFIG.TOAST_DURATION) {
    const { toastEl } = state.elements;
    if (!toastEl) return;
    if (state.toastTimer !== null) clearTimeout(state.toastTimer);
    const seq = ++toastSeq;
    let fired = false;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    const timerId = setTimeout(() => {
      fired = true;
      if (seq !== toastSeq) return;
      state.toastTimer = null;
      if (toastEl && toastEl.classList) toastEl.classList.remove("show");
    }, duration);
    state.toastTimer = fired ? null : timerId;
  }

  // src/parser/post_navigator.js
  var ALLOWED_NAV_SCHEMES = /* @__PURE__ */ new Set(["http", "https", "file"]);
  var EXCLUDED_CLASS_TOKENS = ["notice", "ad", "adv", "ads", "adsense", "survey"];
  var EXCLUDED_MARKER_SELECTOR = ".sp-notice, .sp-ad, .sp-survey, .icon_notice, .icon_ad, .icon_survey";
  var EXCLUDED_NUM_TEXTS = /* @__PURE__ */ new Set(["-", "\uACF5\uC9C0", "\uC124\uBB38"]);
  var EXCLUDED_SUBJECT_TEXTS = /* @__PURE__ */ new Set(["\uACF5\uC9C0", "AD", "\uC124\uBB38"]);
  var PHOTO_ICON_SELECTOR = '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg, .sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]';
  var NON_PHOTO_ICON_TOKENS = ["icon_txt", "survey", "notice", "ad"];
  var NAV_UNAVAILABLE_MESSAGE = "\uC774\uB3D9\uD560 \uC218 \uC788\uB294 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.";
  function getClassNameString(el) {
    return typeof el?.className === "string" ? el.className : "";
  }
  function getTrimmedText(el) {
    return typeof el?.textContent === "string" ? el.textContent.trim() : "";
  }
  function queryPostTitleLink(row) {
    return row?.querySelector?.(".gall_tit a:not(.reply_numbox)") || row?.querySelector?.("a") || null;
  }
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
  function isSafeNavigationHref(rawHref) {
    if (typeof rawHref !== "string") return false;
    const trimmed = rawHref.trim();
    if (!trimmed || trimmed === "#") return false;
    const normalized = trimmed.replace(/[\u0000-\u0020]+/g, "");
    const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
    if (schemeMatch) {
      return ALLOWED_NAV_SCHEMES.has(schemeMatch[1].toLowerCase());
    }
    return true;
  }
  function isSafePostLink(link) {
    if (!link || !link.href) return false;
    const rawAttr = typeof link.getAttribute === "function" ? link.getAttribute("href") : null;
    if (rawAttr !== null && rawAttr !== void 0 && !isSafeNavigationHref(rawAttr)) {
      return false;
    }
    return isSafeNavigationHref(link.href);
  }
  function hasClassToken(el, token) {
    if (!el) return false;
    if (el.classList && typeof el.classList.contains === "function" && el.classList.contains(token)) {
      return true;
    }
    const cls = getClassNameString(el);
    return cls ? cls.split(/[\s>]+/).includes(token) : false;
  }
  function isExcludedPostElement(el, numText = "", subjectText = "") {
    if (!el) return true;
    if (getClassNameString(el).toLowerCase().includes("notice")) return true;
    if (EXCLUDED_CLASS_TOKENS.some((token) => hasClassToken(el, token))) return true;
    if (el.querySelector && el.querySelector(EXCLUDED_MARKER_SELECTOR)) return true;
    return EXCLUDED_NUM_TEXTS.has(numText) || EXCLUDED_SUBJECT_TEXTS.has(subjectText);
  }
  function isDesktopPostRowValid(tr, currentPostNo) {
    if (!tr) return false;
    const titLink = queryPostTitleLink(tr);
    if (!isSafePostLink(titLink)) return false;
    const numText = getTrimmedText(tr.querySelector?.(".gall_num"));
    const subjectText = getTrimmedText(tr.querySelector?.(".gall_subject"));
    if (isExcludedPostElement(tr, numText, subjectText)) return false;
    const isCurrentPost = hasClassToken(tr, "crt") || getClassNameString(tr).includes("crt") || Boolean(tr.querySelector?.(".crt_icon")) || Boolean(currentPostNo && (tr.dataset?.no === currentPostNo || extractPostNo(titLink.href) === currentPostNo));
    if (isCurrentPost) return true;
    return Boolean(numText) && !isNaN(Number(numText));
  }
  function isMobilePostItemValid(li) {
    if (!li) return false;
    const link = li.querySelector?.("a");
    if (!isSafePostLink(link)) return false;
    const numText = getTrimmedText(li.querySelector?.(".gall_num"));
    const subjectText = getTrimmedText(li.querySelector?.(".gall_subject, .subject-txt"));
    return !isExcludedPostElement(li, numText, subjectText);
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
      if (hasClassToken(row, "crt") || getClassNameString(row).includes("crt") || row.querySelector?.(".crt_icon")) {
        return true;
      }
      if (!currentPostNo) return false;
      if (row.dataset?.no === currentPostNo) return true;
      if (getTrimmedText(row.querySelector?.(".gall_num")) === currentPostNo) return true;
      const titLink = queryPostTitleLink(row);
      return Boolean(titLink && extractPostNo(titLink.href) === currentPostNo);
    });
  }
  function hasPhotoAttachment(row) {
    if (!row) return false;
    if (getTrimmedText(row.querySelector?.(".gall_subject")).includes("\uC0AC\uC9C4")) {
      return true;
    }
    if (row.querySelector?.(PHOTO_ICON_SELECTOR)) {
      return true;
    }
    const anyImgIcon = row.querySelector?.(".icon_img");
    if (!anyImgIcon) return false;
    const cls = getClassNameString(anyImgIcon);
    return !NON_PHOTO_ICON_TOKENS.some((token) => cls.includes(token));
  }
  function createUnavailableResult(error) {
    return {
      ok: false,
      status: "unavailable",
      error,
      message: NAV_UNAVAILABLE_MESSAGE
    };
  }
  function findTargetPostIndex(validRows, currentIdx, step, preferPhotos) {
    const nextIdx = currentIdx + step;
    if (nextIdx < 0 || nextIdx >= validRows.length) {
      return { targetIdx: -1, hasPhoto: false };
    }
    if (preferPhotos) {
      for (let idx = nextIdx; idx >= 0 && idx < validRows.length; idx += step) {
        if (hasPhotoAttachment(validRows[idx])) {
          return { targetIdx: idx, hasPhoto: true };
        }
      }
      return { targetIdx: nextIdx, hasPhoto: false };
    }
    return { targetIdx: nextIdx, hasPhoto: hasPhotoAttachment(validRows[nextIdx]) };
  }
  function buildFoundPostResult(targetRow, hasPhoto = hasPhotoAttachment(targetRow)) {
    const targetLink = queryPostTitleLink(targetRow);
    if (!targetLink || !isSafePostLink(targetLink)) {
      return createUnavailableResult("unsafe_url");
    }
    const targetTitle = getTrimmedText(targetLink).replace(/\s+/g, " ");
    return {
      ok: true,
      status: "found",
      url: targetLink.href,
      title: targetTitle,
      hasPhoto
    };
  }
  function getAdjacentPostUrl(direction, preferPhotos = true, currentUrl = typeof window !== "undefined" ? window.location?.href : "", root = typeof document !== "undefined" ? document : null) {
    if (direction !== "up" && direction !== "down") {
      return createUnavailableResult("invalid_direction");
    }
    const currentPostNo = extractPostNo(currentUrl);
    const validRows = getValidPostRows(currentPostNo, root);
    if (validRows.length === 0) return createUnavailableResult("no_list");
    const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
    if (currentIdx === -1) return createUnavailableResult("current_not_found");
    const step = direction === "up" ? -1 : 1;
    const { targetIdx, hasPhoto } = findTargetPostIndex(validRows, currentIdx, step, preferPhotos);
    if (targetIdx < 0 || targetIdx >= validRows.length) {
      return direction === "up" ? { ok: false, status: "boundary", error: "top", message: "\uBAA9\uB85D\uC758 \uAC00\uC7A5 \uCD5C\uC2E0 \uAE00\uC785\uB2C8\uB2E4." } : { ok: false, status: "boundary", error: "bottom", message: "\uBAA9\uB85D\uC758 \uB9C8\uC9C0\uB9C9 \uAE00\uC785\uB2C8\uB2E4." };
    }
    return buildFoundPostResult(validRows[targetIdx], hasPhoto);
  }

  // src/controller/post_nav_controller.js
  var postNavSeq = 0;
  var autoOpenPollSeq = 0;
  var postNavCallbacks = {
    onOpenViewer: () => {
    },
    onPreloadAndCollect: () => state.postImages
  };
  function setPostNavCallbacks(callbacks = {}) {
    postNavCallbacks = { ...postNavCallbacks, ...callbacks };
  }
  function withAutoOpenStorage(method, ...args) {
    try {
      if (typeof sessionStorage !== "undefined" && typeof sessionStorage[method] === "function") {
        return sessionStorage[method](CONFIG.STORAGE_KEY_AUTO_OPEN, ...args);
      }
    } catch (e) {
    }
    return null;
  }
  function cancelPendingPostNavigation() {
    postNavSeq += 1;
    if (state.postNavTimer === null) return false;
    clearTimeout(state.postNavTimer);
    state.postNavTimer = null;
    withAutoOpenStorage("removeItem");
    return true;
  }
  function clearAutoOpenPollTimer() {
    autoOpenPollSeq += 1;
    if (state.autoOpenPollTimer === null) return false;
    clearInterval(state.autoOpenPollTimer);
    state.autoOpenPollTimer = null;
    return true;
  }
  function buildNavigateToastMessage(direction, result) {
    const label = direction === "up" ? "\uC704\uCABD \uCD5C\uC2E0 \uAE00" : "\uC544\uB798\uCABD \uC774\uC804 \uAE00";
    const photoHint = result.hasPhoto ? " \u{1F4F7}" : "";
    const titleHint = result.title ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + "..." : result.title})` : "";
    return `${label}\uB85C \uC774\uB3D9 \uC911...${photoHint}${titleHint}`;
  }
  function navigatePost(direction) {
    cancelPendingPostNavigation();
    const result = getAdjacentPostUrl(direction);
    if (!result || !result.ok || result.status !== "found") {
      showViewerToast(result?.message || "\uC774\uB3D9\uD560 \uC218 \uC788\uB294 \uAC8C\uC2DC\uAE00 \uBAA9\uB85D\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return;
    }
    if (!result.url || !isSafeNavigationHref(result.url)) return;
    showViewerToast(buildNavigateToastMessage(direction, result));
    withAutoOpenStorage("setItem", "1");
    const token = postNavSeq;
    let fired = false;
    const timerId = setTimeout(() => {
      fired = true;
      if (token !== postNavSeq) return;
      state.postNavTimer = null;
      if (typeof window !== "undefined" && window.location) {
        window.location.href = result.url;
      }
    }, CONFIG.POST_NAV_DELAY);
    state.postNavTimer = fired ? null : timerId;
  }
  function stopPollInterval(pollCtx) {
    pollCtx.stopped = true;
    if (pollCtx.timerId !== null) clearInterval(pollCtx.timerId);
  }
  function runAutoOpenPollTick(pollCtx, callbacks) {
    if (pollCtx.token !== autoOpenPollSeq) {
      stopPollInterval(pollCtx);
      return;
    }
    pollCtx.attempts += 1;
    callbacks.onPreloadAndCollect();
    if (state.postImages.length > 0) {
      stopPollInterval(pollCtx);
      clearAutoOpenPollTimer();
      callbacks.onOpenViewer(null, true);
      return;
    }
    if (pollCtx.attempts >= pollCtx.maxAttempts) {
      stopPollInterval(pollCtx);
      clearAutoOpenPollTimer();
      showNoPhotoNotice((dir) => navigatePost(dir));
    }
  }
  function startAutoOpenPolling(callbacks = postNavCallbacks) {
    clearAutoOpenPollTimer();
    const pollCtx = {
      attempts: 0,
      maxAttempts: CONFIG.AUTO_OPEN_MAX_ATTEMPTS,
      token: autoOpenPollSeq,
      stopped: false,
      timerId: null
    };
    pollCtx.timerId = setInterval(() => runAutoOpenPollTick(pollCtx, callbacks), CONFIG.AUTO_OPEN_POLL_INTERVAL);
    state.autoOpenPollTimer = pollCtx.stopped ? null : pollCtx.timerId;
  }
  function checkAutoOpen(callbacks = postNavCallbacks) {
    if (withAutoOpenStorage("getItem") !== "1") return;
    withAutoOpenStorage("removeItem");
    startAutoOpenPolling(callbacks);
  }

  // src/ui/zoom_pan.js
  var ZOOM_MIN = 1;
  var ZOOM_MAX = 5;
  var ZOOM_STEP = 0.15;
  var ZOOM_DBLCLICK_SCALE = 2;
  var boundZoomImgEls = /* @__PURE__ */ new WeakSet();
  var isViewerActive = () => Boolean(state.elements.overlayEl?.classList?.contains("active"));
  function cancelZoomRaf() {
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
  function consumeSuppressedBackdropClick() {
    if (!state.zoom.suppressNextBackdropClick) return false;
    clearSuppressBackdropClick();
    return true;
  }
  function clearWindowDragListeners(includeMouseUp = true) {
    window.removeEventListener("mousemove", onWindowMouseMove);
    if (includeMouseUp) window.removeEventListener("mouseup", onWindowMouseUp);
  }
  function resetMainImgStyle(mainImgEl) {
    if (!mainImgEl) return;
    mainImgEl.style.transform = "translate(0px, 0px) scale(1)";
    mainImgEl.style.cursor = "default";
  }
  function onWindowMouseMove(e) {
    if (!state.zoom.isDragging) return;
    state.zoom.panX = e.clientX - state.zoom.startX;
    state.zoom.panY = e.clientY - state.zoom.startY;
    updateImgTransform();
  }
  function onWindowMouseUp(e) {
    if (e && typeof e.button === "number" && e.button !== 0) return;
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
    mainImgEl.style.cursor = state.zoom.isDragging ? "grabbing" : "grab";
    mainImgEl.style.transform = `translate(${state.zoom.panX}px, ${state.zoom.panY}px) scale(${state.zoom.scale.toFixed(2)})`;
    if (infoBadgeEl) {
      infoBadgeEl.textContent = `\u{1F50D} \uD655\uB300: ${(state.zoom.scale * 100).toFixed(0)}% (\uB4DC\uB798\uADF8\uB85C \uC774\uB3D9 / \uB354\uBE14\uD074\uB9AD \uCD08\uAE30\uD654)`;
    }
  }
  function updateImgTransform() {
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
  function resetZoom(preservePendingRelease = false) {
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
    window.addEventListener("mousemove", onWindowMouseMove);
    window.addEventListener("mouseup", onWindowMouseUp);
    updateImgTransform();
  }
  function handleZoomDblClick(e) {
    if (!isViewerActive()) return;
    e.preventDefault();
    if (state.zoom.scale > ZOOM_MIN) return resetZoom();
    Object.assign(state.zoom, { scale: ZOOM_DBLCLICK_SCALE, panX: 0, panY: 0 });
    updateImgTransform();
  }
  function setupZoomEvents(mainImgEl) {
    if (!mainImgEl || boundZoomImgEls.has(mainImgEl)) return;
    boundZoomImgEls.add(mainImgEl);
    mainImgEl.addEventListener("wheel", handleZoomWheel, { passive: false });
    mainImgEl.addEventListener("mousedown", handleZoomMouseDown);
    mainImgEl.addEventListener("dblclick", handleZoomDblClick);
  }

  // src/parser/recommend_parser.js
  var RECOMMEND_BUTTON_PRIORITY_SELECTORS = [
    ".btn_recommend_box button.btn_recom_up",
    "button.btn_recom_up",
    "a.btn_recom_up",
    "div.btn_recom_up",
    ".btn_recom_up",
    ".btn_recommend_up",
    "button.btn-recom",
    ".btn-recom",
    ".btn_recom",
    ".btn_recommend",
    'button[data-action="recommend"]',
    'button[data-type="recommend"]',
    "button.recom_btn"
  ];
  var RECOMMEND_BUTTON_SELECTORS = RECOMMEND_BUTTON_PRIORITY_SELECTORS.join(", ");
  var RECOMMEND_COUNT_PRIORITY_SELECTORS = [
    '[id^="recommend_view_up_"]',
    ".up_num_box .up_num",
    ".btn_recommend_box .up_num",
    ".recom_num",
    ".btn-recom .recom-num"
  ];
  function isExcludedRecommendElement(el) {
    if (!el) return true;
    if (typeof el.closest === "function") {
      if (el.closest("#disagall-viewer-overlay") || el.closest("#disagall-no-photo-notice") || el.closest("#disagall-quick-launcher")) {
        return true;
      }
    }
    let cur = el;
    while (cur) {
      if (typeof cur.id === "string" && cur.id.startsWith("disagall-")) {
        return true;
      }
      cur = cur.parentElement;
    }
    return false;
  }
  function isRecommendButtonDisabled(btn) {
    if (!btn) return true;
    if (btn.disabled === true) return true;
    if (typeof btn.getAttribute === "function") {
      const disabledAttr = btn.getAttribute("disabled");
      if (disabledAttr !== null && disabledAttr !== void 0) return true;
      if (btn.getAttribute("aria-disabled") === "true") return true;
    }
    if (typeof btn.closest === "function" && btn.closest("fieldset[disabled]")) {
      return true;
    }
    return false;
  }
  function findValidInSelector(root, selector, hasQueryAll) {
    if (!hasQueryAll) {
      const el = root.querySelector(selector);
      return el && !isExcludedRecommendElement(el) ? el : null;
    }
    const candidates = root.querySelectorAll(selector);
    if (!candidates) return null;
    for (const el of candidates) {
      if (!isExcludedRecommendElement(el)) return el;
    }
    return null;
  }
  function findFirstValidMatch(root, selectors) {
    if (!root) return null;
    const hasQueryAll = typeof root.querySelectorAll === "function";
    const hasQueryOne = typeof root.querySelector === "function";
    if (!hasQueryAll && !hasQueryOne) return null;
    for (const selector of selectors) {
      const matched = findValidInSelector(root, selector, hasQueryAll);
      if (matched) return matched;
    }
    return null;
  }
  function getPostRecommendCount(root = typeof document !== "undefined" ? document : null) {
    const countEl = findFirstValidMatch(root, RECOMMEND_COUNT_PRIORITY_SELECTORS);
    if (countEl) {
      const text = (countEl.textContent || "").trim();
      const num = parseInt(text.replace(/[^0-9]/g, ""), 10);
      if (!isNaN(num)) return num;
    }
    return null;
  }
  function getNativeRecommendButton(root = typeof document !== "undefined" ? document : null) {
    return findFirstValidMatch(root, RECOMMEND_BUTTON_PRIORITY_SELECTORS);
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
    if (!btn || isExcludedRecommendElement(btn) || btn.isConnected === false || isRecommendButtonDisabled(btn)) {
      return false;
    }
    if (typeof btn.click === "function") {
      try {
        btn.click();
        return true;
      } catch (e) {
      }
    }
    if (typeof btn.dispatchEvent !== "function") {
      return false;
    }
    try {
      const mouseEvt = new MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        view: typeof window !== "undefined" ? window : null,
        buttons: 1
      });
      return Boolean(btn.dispatchEvent(mouseEvt));
    } catch (err) {
      return false;
    }
  }

  // src/controller/storage_sync.js
  var MAX_SELF_PADDING_WRITE_HISTORY = 8;
  var paddingWriteSeq = 0;
  var pendingSelfPaddingWrites = [];
  var boundStorageOnChanged = null;
  var initialSettingsLoadSeq = 0;
  var hasLocalPaddingEditSinceLoad = false;
  var hasOnChangedSync = {
    padding: false,
    autoHideUi: false,
    autoFullscreen: false
  };
  var syncCallbacks = {
    onAutoHideChange: () => {
    },
    onAutoFullscreenChange: () => {
    },
    onRetroactiveAutoFullscreen: () => {
    },
    isOverlayActive: () => {
      const { overlayEl } = state.elements;
      return Boolean(overlayEl && overlayEl.classList && overlayEl.classList.contains("active"));
    },
    isOverlayFullscreenElement: () => false,
    isSliderInteracting: () => false,
    hasUserToggledFullscreenInSession: () => false
  };
  function setStorageSyncCallbacks(callbacks = {}) {
    syncCallbacks = {
      ...syncCallbacks,
      ...callbacks
    };
  }
  function isPaddingSavePending() {
    return Boolean(state.paddingSaveTimer);
  }
  function normalizePaddingValue(rawValue) {
    if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) return null;
    return Math.min(CONFIG.PADDING_MAX, Math.max(CONFIG.PADDING_MIN, Math.round(rawValue)));
  }
  function applyPaddingSetting(padding, { refit = true } = {}) {
    const normalized = normalizePaddingValue(padding);
    if (normalized === null) return false;
    state.currentPadding = normalized;
    syncPaddingSliderUi();
    const isLockedZero = state.isFullscreenMode && state.isFullscreenPaddingZero;
    if (refit && syncCallbacks.isOverlayActive() && !isLockedZero && state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
      applyFittingAndPadding();
    }
    return true;
  }
  function markLocalPaddingModified() {
    hasLocalPaddingEditSinceLoad = true;
  }
  function recordSelfPaddingWrite(padding) {
    const normalized = normalizePaddingValue(padding);
    if (normalized === null) return;
    paddingWriteSeq += 1;
    pendingSelfPaddingWrites.push({ seq: paddingWriteSeq, value: normalized });
    if (pendingSelfPaddingWrites.length > MAX_SELF_PADDING_WRITE_HISTORY) {
      pendingSelfPaddingWrites.shift();
    }
  }
  function persistPaddingSetting() {
    const valueToSave = state.currentPadding;
    recordSelfPaddingWrite(valueToSave);
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.set === "function") {
        chrome.storage.sync.set({ [CONFIG.STORAGE_KEY_PADDING]: valueToSave });
        return;
      }
      if (typeof GM_setValue === "function") {
        GM_setValue(CONFIG.STORAGE_KEY_PADDING, valueToSave);
      }
    } catch (err) {
    }
  }
  function clearPaddingSaveTimer() {
    if (!state.paddingSaveTimer) return false;
    clearTimeout(state.paddingSaveTimer);
    state.paddingSaveTimer = null;
    return true;
  }
  function schedulePaddingSave() {
    clearPaddingSaveTimer();
    state.paddingSaveTimer = setTimeout(() => {
      state.paddingSaveTimer = null;
      persistPaddingSetting();
    }, CONFIG.PADDING_SAVE_DEBOUNCE_MS);
  }
  function flushPaddingSave() {
    if (clearPaddingSaveTimer()) {
      persistPaddingSetting();
    }
  }
  function resetStorageSyncGuards() {
    clearPaddingSaveTimer();
    pendingSelfPaddingWrites = [];
  }
  function shouldApplyInitialPadding() {
    return !hasOnChangedSync.padding && !hasLocalPaddingEditSinceLoad && !syncCallbacks.isSliderInteracting() && !isPaddingSavePending();
  }
  function applyInitialAutoFullscreen(savedAutoFullscreen) {
    if (hasOnChangedSync.autoFullscreen || typeof savedAutoFullscreen !== "boolean") return;
    state.autoFullscreen = savedAutoFullscreen;
    if (savedAutoFullscreen && syncCallbacks.isOverlayActive() && !state.isFullscreenMode && !syncCallbacks.isOverlayFullscreenElement() && !syncCallbacks.hasUserToggledFullscreenInSession()) {
      syncCallbacks.onRetroactiveAutoFullscreen();
    }
  }
  function applyInitialSettingsResult(result) {
    if (!result) return;
    if (shouldApplyInitialPadding()) {
      applyPaddingSetting(result[CONFIG.STORAGE_KEY_PADDING]);
    }
    const savedAutoHide = result[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
    if (!hasOnChangedSync.autoHideUi && typeof savedAutoHide === "boolean") {
      syncCallbacks.onAutoHideChange(savedAutoHide);
    }
    applyInitialAutoFullscreen(result[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]);
  }
  function hasChromeSyncGet() {
    return typeof chrome !== "undefined" && chrome.storage && chrome.storage.sync && typeof chrome.storage.sync.get === "function";
  }
  function loadInitialSettings() {
    const seq = ++initialSettingsLoadSeq;
    hasLocalPaddingEditSinceLoad = false;
    hasOnChangedSync = { padding: false, autoHideUi: false, autoFullscreen: false };
    if (hasChromeSyncGet()) {
      chrome.storage.sync.get(
        {
          [CONFIG.STORAGE_KEY_PADDING]: CONFIG.DEFAULT_PADDING,
          [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: true,
          [CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]: false
        },
        (result) => {
          if (!result || seq !== initialSettingsLoadSeq) return;
          applyInitialSettingsResult(result);
        }
      );
      return;
    }
    if (typeof GM_getValue === "function") {
      applyInitialSettingsResult({
        [CONFIG.STORAGE_KEY_PADDING]: GM_getValue(CONFIG.STORAGE_KEY_PADDING, CONFIG.DEFAULT_PADDING),
        [CONFIG.STORAGE_KEY_AUTO_HIDE_UI]: GM_getValue(CONFIG.STORAGE_KEY_AUTO_HIDE_UI, true),
        [CONFIG.STORAGE_KEY_AUTO_FULLSCREEN]: GM_getValue(CONFIG.STORAGE_KEY_AUTO_FULLSCREEN, false)
      });
    }
  }
  function consumeSupersededSelfPaddingEcho(normalizedValue) {
    const matchIdx = pendingSelfPaddingWrites.findIndex((entry) => entry.value === normalizedValue);
    if (matchIdx === -1) return false;
    const matched = pendingSelfPaddingWrites[matchIdx];
    pendingSelfPaddingWrites = pendingSelfPaddingWrites.filter((entry) => entry.seq > matched.seq);
    return matched.seq < paddingWriteSeq;
  }
  function handleSyncPaddingChange(paddingChange) {
    if (!paddingChange) return;
    const normalized = normalizePaddingValue(paddingChange.newValue);
    if (normalized === null) return;
    if (syncCallbacks.isSliderInteracting() || isPaddingSavePending()) return;
    if (consumeSupersededSelfPaddingEcho(normalized)) return;
    hasOnChangedSync.padding = true;
    applyPaddingSetting(normalized);
  }
  function handleStorageSyncChanges(changes, areaName) {
    if (areaName !== "sync" || !changes) return;
    handleSyncPaddingChange(changes[CONFIG.STORAGE_KEY_PADDING]);
    const autoHideChange = changes[CONFIG.STORAGE_KEY_AUTO_HIDE_UI];
    if (autoHideChange && typeof autoHideChange.newValue === "boolean") {
      hasOnChangedSync.autoHideUi = true;
      syncCallbacks.onAutoHideChange(autoHideChange.newValue);
    }
    const autoFullscreenChange = changes[CONFIG.STORAGE_KEY_AUTO_FULLSCREEN];
    if (autoFullscreenChange && typeof autoFullscreenChange.newValue === "boolean") {
      hasOnChangedSync.autoFullscreen = true;
      syncCallbacks.onAutoFullscreenChange(autoFullscreenChange.newValue);
    }
  }
  function bindImmersionStorageListener() {
    const storageEvents = typeof chrome !== "undefined" && chrome.storage ? chrome.storage.onChanged : null;
    if (!storageEvents || boundStorageOnChanged === storageEvents || typeof storageEvents.addListener !== "function") {
      return;
    }
    boundStorageOnChanged = storageEvents;
    storageEvents.addListener(handleStorageSyncChanges);
  }
  function initStorageSync(callbacks) {
    if (callbacks) {
      setStorageSyncCallbacks(callbacks);
    }
    loadInitialSettings();
    bindImmersionStorageListener();
  }

  // src/controller/fullscreen_controller.js
  var FULLSCREEN_TRANSITION_MOUSE_GUARD_MS = 1e3;
  var boundFullscreenDoc = null;
  var fullscreenTransitionSeq = 0;
  var inFlightRequestSeq = 0;
  var inFlightExitSeq = 0;
  var asyncPendingRequestCount = 0;
  var osFullscreenWanted = false;
  var hasObservedOsFullscreen = false;
  var hasUserToggledFullscreenInSession = false;
  var fullscreenMouseGuardUntil = 0;
  var uiHooks = {
    isOverlayActive: () => Boolean(state.elements.overlayEl?.classList?.contains("active")),
    isAnyUiHiddenClass: (el) => Boolean(state.isUiHidden || el?.classList?.contains("disagall-idle") || el?.classList?.contains("disagall-ui-hidden")),
    showUi: () => {
    },
    hideUi: () => false,
    resetIdleTimer: () => {
    }
  };
  function setFullscreenUiHooks(hooks = {}) {
    uiHooks = { ...uiHooks, ...hooks };
  }
  function clearFullscreenMouseGuard() {
    fullscreenMouseGuardUntil = 0;
  }
  function hasUserToggledFullscreen() {
    return hasUserToggledFullscreenInSession;
  }
  function isFullscreenTransitionGuarded() {
    return (state.isFullscreenMode || inFlightRequestSeq !== 0) && Date.now() < fullscreenMouseGuardUntil;
  }
  function getFullscreenElement() {
    if (typeof document === "undefined") return null;
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }
  function isOverlayFullscreenElement() {
    const { overlayEl } = state.elements;
    return Boolean(overlayEl && getFullscreenElement() === overlayEl);
  }
  function updateFullscreenButtonUi(active) {
    const { fullscreenBtnEl } = state.elements;
    if (!fullscreenBtnEl) return;
    fullscreenBtnEl.classList.toggle("active", active);
    if (typeof fullscreenBtnEl.setAttribute === "function") {
      fullscreenBtnEl.setAttribute("aria-pressed", active ? "true" : "false");
    }
    fullscreenBtnEl.title = active ? "\uC804\uCCB4\uD654\uBA74 \uD574\uC81C (\uB2E8\uCD95\uD0A4: F / ESC)" : "\uC804\uCCB4\uD654\uBA74 \uC804\uD658 (\uB2E8\uCD95\uD0A4: F)";
    const labelEl = typeof fullscreenBtnEl.querySelector === "function" ? fullscreenBtnEl.querySelector("span") : null;
    if (labelEl) labelEl.textContent = active ? "\uC804\uCCB4\uD654\uBA74 \uD574\uC81C" : "\uC804\uCCB4\uD654\uBA74";
  }
  function enterFullscreenVisualState() {
    if (!uiHooks.isOverlayActive()) return;
    const { overlayEl } = state.elements;
    fullscreenMouseGuardUntil = Date.now() + FULLSCREEN_TRANSITION_MOUSE_GUARD_MS;
    if (state.isFullscreenMode && overlayEl.classList.contains("disagall-fullscreen")) {
      updateFullscreenButtonUi(true);
      syncPaddingSliderUi();
      if (!uiHooks.isAnyUiHiddenClass(overlayEl)) uiHooks.hideUi(true);
      return;
    }
    state.isFullscreenMode = true;
    state.isFullscreenPaddingZero = true;
    overlayEl.classList.add("disagall-fullscreen");
    updateFullscreenButtonUi(true);
    syncPaddingSliderUi();
    uiHooks.hideUi(true);
  }
  function exitFullscreenVisualState() {
    const { overlayEl } = state.elements;
    const wasActive = Boolean(state.isFullscreenMode || overlayEl?.classList?.contains("disagall-fullscreen"));
    clearFullscreenMouseGuard();
    state.isFullscreenMode = false;
    state.isFullscreenPaddingZero = false;
    if (overlayEl) overlayEl.classList.remove("disagall-fullscreen");
    updateFullscreenButtonUi(false);
    syncPaddingSliderUi();
    if (wasActive && uiHooks.isOverlayActive()) {
      uiHooks.showUi();
      uiHooks.resetIdleTimer();
    }
  }
  function resetFullscreenState() {
    fullscreenTransitionSeq += 1;
    inFlightRequestSeq = 0;
    inFlightExitSeq = 0;
    osFullscreenWanted = false;
    hasObservedOsFullscreen = false;
    hasUserToggledFullscreenInSession = false;
    clearFullscreenMouseGuard();
    state.isFullscreenMode = false;
    state.isFullscreenPaddingZero = false;
    if (state.elements.overlayEl) state.elements.overlayEl.classList.remove("disagall-fullscreen");
    updateFullscreenButtonUi(false);
    syncPaddingSliderUi();
  }
  function syncFullscreenState() {
    if (!uiHooks.isOverlayActive()) {
      if (isOverlayFullscreenElement()) exitFullscreenSafely();
      return;
    }
    if (isOverlayFullscreenElement()) {
      const isStaleOrExiting = !osFullscreenWanted && (asyncPendingRequestCount > 0 || inFlightExitSeq === fullscreenTransitionSeq);
      if (isStaleOrExiting) {
        exitFullscreenSafely();
        return;
      }
      hasObservedOsFullscreen = true;
      enterFullscreenVisualState();
      return;
    }
    if (hasObservedOsFullscreen && state.isFullscreenMode) {
      hasObservedOsFullscreen = false;
      osFullscreenWanted = false;
      exitFullscreenVisualState();
    }
  }
  function handleFullscreenError() {
    inFlightRequestSeq = 0;
    if (!isOverlayFullscreenElement()) {
      osFullscreenWanted = false;
      hasObservedOsFullscreen = false;
    }
  }
  function bindFullscreenChangeListener() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    if (boundFullscreenDoc === document) return;
    boundFullscreenDoc = document;
    ["fullscreenchange", "webkitfullscreenchange"].forEach((ev) => document.addEventListener(ev, syncFullscreenState));
    ["fullscreenerror", "webkitfullscreenerror"].forEach((ev) => document.addEventListener(ev, handleFullscreenError));
  }
  function handleFullscreenPromise(result, onSuccess, onFailure) {
    if (!result || typeof result.then !== "function") {
      if (typeof onSuccess === "function") onSuccess(false);
      return;
    }
    result.then(
      () => {
        if (typeof onSuccess === "function") onSuccess(true);
      },
      (err) => {
        if (typeof onFailure === "function") onFailure(err, true);
        return err;
      }
    );
  }
  function resolveMethod(target, primary, fallback) {
    if (!target) return null;
    if (typeof target[primary] === "function") return () => target[primary]();
    if (typeof target[fallback] === "function") return () => target[fallback]();
    return null;
  }
  function consumeRequestSeq(seq, isAsync) {
    if (isAsync) asyncPendingRequestCount = Math.max(0, asyncPendingRequestCount - 1);
    if (inFlightRequestSeq === seq) inFlightRequestSeq = 0;
  }
  function handleRequestSuccess(seq, isAsync, onSuccess) {
    consumeRequestSeq(seq, isAsync);
    if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) {
      if (!isOverlayFullscreenElement()) return;
      if (!uiHooks.isOverlayActive() || !osFullscreenWanted) {
        exitFullscreenSafely();
        return;
      }
      hasObservedOsFullscreen = true;
      enterFullscreenVisualState();
      return;
    }
    if (isOverlayFullscreenElement()) hasObservedOsFullscreen = true;
    if (typeof onSuccess === "function") onSuccess();
  }
  function handleRequestFailure(seq, isAsync, err, onFailure) {
    consumeRequestSeq(seq, isAsync);
    if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) return;
    if (isOverlayFullscreenElement()) {
      hasObservedOsFullscreen = true;
      enterFullscreenVisualState();
      return;
    }
    osFullscreenWanted = false;
    if (typeof onFailure === "function") onFailure(err);
  }
  function startFullscreenRequest(requestFn, seq, onSuccess, onFailure) {
    try {
      const result = requestFn();
      if (result && typeof result.then === "function") asyncPendingRequestCount += 1;
      handleFullscreenPromise(result, (isAsync) => handleRequestSuccess(seq, isAsync, onSuccess), (err, isAsync) => handleRequestFailure(seq, isAsync, err, onFailure));
      return true;
    } catch (err) {
      handleRequestFailure(seq, false, err, onFailure);
      return false;
    }
  }
  function requestOverlayFullscreen(overlayEl, { onSuccess, onFailure } = {}) {
    if (inFlightRequestSeq !== 0 && inFlightRequestSeq === fullscreenTransitionSeq) return false;
    const requestFn = resolveMethod(overlayEl, "requestFullscreen", "webkitRequestFullscreen");
    if (!requestFn) {
      osFullscreenWanted = false;
      if (typeof onFailure === "function") onFailure(new Error("Fullscreen API unavailable"));
      return false;
    }
    const seq = ++fullscreenTransitionSeq;
    inFlightRequestSeq = seq;
    osFullscreenWanted = true;
    fullscreenMouseGuardUntil = Date.now() + FULLSCREEN_TRANSITION_MOUSE_GUARD_MS;
    return startFullscreenRequest(requestFn, seq, onSuccess, onFailure);
  }
  function finishFullscreenExit(seq) {
    if (inFlightExitSeq === seq) inFlightExitSeq = 0;
    if (seq !== fullscreenTransitionSeq || !uiHooks.isOverlayActive()) return;
    if (!isOverlayFullscreenElement()) exitFullscreenVisualState();
  }
  function exitFullscreenSafely() {
    if (!getFullscreenElement()) return false;
    if (inFlightExitSeq !== 0 && inFlightExitSeq === fullscreenTransitionSeq) return false;
    const exitFn = resolveMethod(typeof document !== "undefined" ? document : null, "exitFullscreen", "webkitExitFullscreen");
    if (!exitFn) return false;
    const seq = ++fullscreenTransitionSeq;
    inFlightExitSeq = seq;
    osFullscreenWanted = false;
    hasObservedOsFullscreen = false;
    try {
      const onDone = () => finishFullscreenExit(seq);
      handleFullscreenPromise(exitFn(), onDone, onDone);
      return true;
    } catch (err) {
      if (inFlightExitSeq === seq) inFlightExitSeq = 0;
      return false;
    }
  }
  function engageFallbackFullscreen(toastMsg, toggleOffIfActive = false) {
    if (!uiHooks.isOverlayActive()) return;
    if (toggleOffIfActive) {
      exitFullscreenVisualState();
      return;
    }
    enterFullscreenVisualState();
    showViewerToast(toastMsg);
  }
  function toggleFullscreen() {
    if (!uiHooks.isOverlayActive()) return false;
    hasUserToggledFullscreenInSession = true;
    if (getFullscreenElement()) return exitFullscreenSafely();
    const wasFallback = state.isFullscreenMode;
    return requestOverlayFullscreen(state.elements.overlayEl, {
      onSuccess: enterFullscreenVisualState,
      onFailure: () => engageFallbackFullscreen("OS \uC804\uCCB4\uD654\uBA74\uC774 \uC81C\uD55C\uB418\uC5B4 \uCC3D \uC804\uCCB4 \uCC44\uC6C0 \uBAA8\uB4DC\uB85C \uC804\uD658\uD588\uC2B5\uB2C8\uB2E4.", wasFallback)
    });
  }
  function enterAutoFullscreenOnOpen() {
    if (!uiHooks.isOverlayActive()) return false;
    return requestOverlayFullscreen(state.elements.overlayEl, {
      onSuccess: enterFullscreenVisualState,
      onFailure: () => engageFallbackFullscreen("\uC5EC\uBC31 0px\xB7UI \uC228\uAE40\uC73C\uB85C \uC804\uCCB4 \uCC44\uC6C0 (F \uD0A4\uB85C OS \uC804\uCCB4\uD654\uBA74)")
    });
  }
  function handleAutoFullscreenDisabled() {
    if (!isOverlayFullscreenElement()) osFullscreenWanted = false;
    if (state.isFullscreenMode && !getFullscreenElement() && uiHooks.isOverlayActive()) exitFullscreenVisualState();
  }

  // src/controller/immersion_controller.js
  var isHeaderHovered = false;
  var isSliderInteracting = false;
  var lastPointerScreenX = null;
  var lastPointerScreenY = null;
  var lastPointerClientX = null;
  var lastPointerClientY = null;
  function isOverlayActive() {
    const { overlayEl } = state.elements;
    return Boolean(overlayEl && overlayEl.classList && overlayEl.classList.contains("active"));
  }
  function clearIdleTimer() {
    if (!state.idleTimer) return;
    clearTimeout(state.idleTimer);
    state.idleTimer = null;
  }
  function resetImmersionGuards() {
    isHeaderHovered = false;
    isSliderInteracting = false;
    resetStorageSyncGuards();
    clearFullscreenMouseGuard();
    lastPointerScreenX = null;
    lastPointerScreenY = null;
    lastPointerClientX = null;
    lastPointerClientY = null;
  }
  function isHeaderCursorHovering() {
    const { overlayEl } = state.elements;
    if (!overlayEl || typeof overlayEl.querySelector !== "function") return false;
    const headerEl = overlayEl.querySelector(".disagall-header");
    if (!headerEl || typeof headerEl.matches !== "function") return false;
    try {
      return headerEl.matches(":hover");
    } catch (err) {
      return false;
    }
  }
  function isIdleHideDeferred() {
    if (state.zoom.isDragging || isSliderInteracting || isHeaderHovered) return true;
    return isHeaderCursorHovering();
  }
  function isAnyUiHiddenClass(overlayEl) {
    return state.isUiHidden || overlayEl.classList.contains("disagall-idle") || overlayEl.classList.contains("disagall-ui-hidden");
  }
  function syncFittingIfUnzoomed() {
    if (state.zoom.scale > CONFIG.ZOOM_EPSILON) return;
    applyFittingAndPadding();
  }
  function showUi() {
    state.isUiHidden = false;
    const { overlayEl } = state.elements;
    if (!overlayEl) return;
    overlayEl.classList.remove("disagall-idle");
    overlayEl.classList.remove("disagall-ui-hidden");
    syncFittingIfUnzoomed();
  }
  function hideUi(isManual = false) {
    if (!isOverlayActive()) return false;
    const { overlayEl } = state.elements;
    if (isManual) {
      clearIdleTimer();
      state.isUiHidden = true;
      overlayEl.classList.remove("disagall-idle");
      overlayEl.classList.add("disagall-ui-hidden");
      syncFittingIfUnzoomed();
      return true;
    }
    if (!state.autoHideUi || state.isUiHidden) return false;
    if (isIdleHideDeferred()) {
      resetIdleTimer();
      return false;
    }
    overlayEl.classList.add("disagall-idle");
    syncFittingIfUnzoomed();
    return true;
  }
  function resetIdleTimer() {
    clearIdleTimer();
    if (!isOverlayActive()) return;
    const { overlayEl } = state.elements;
    if (isAnyUiHiddenClass(overlayEl)) showUi();
    if (!state.autoHideUi) return;
    state.idleTimer = setTimeout(() => {
      state.idleTimer = null;
      hideUi(false);
    }, CONFIG.UI_IDLE_TIMEOUT);
  }
  function toggleUiManual() {
    if (!isOverlayActive()) return false;
    const { overlayEl } = state.elements;
    if (isAnyUiHiddenClass(overlayEl)) {
      clearFullscreenMouseGuard();
      showUi();
      resetIdleTimer();
      return false;
    }
    return hideUi(true);
  }
  setFullscreenUiHooks({ isOverlayActive, isAnyUiHiddenClass, showUi, hideUi, resetIdleTimer });
  function applyAutoFullscreenSetting(enabled) {
    state.autoFullscreen = Boolean(enabled);
    if (state.autoFullscreen) return;
    handleAutoFullscreenDisabled();
  }
  function applyAutoHideUiSetting(enabled) {
    const prevAutoHide = state.autoHideUi;
    state.autoHideUi = Boolean(enabled);
    if (!isOverlayActive()) return;
    const { overlayEl } = state.elements;
    if (!state.autoHideUi) {
      clearIdleTimer();
      if (overlayEl.classList.contains("disagall-idle") && !state.isUiHidden) showUi();
      return;
    }
    const alreadyRunningOrHidden = Boolean(state.idleTimer) || isAnyUiHiddenClass(overlayEl);
    if (!state.isUiHidden && (!prevAutoHide || !alreadyRunningOrHidden)) resetIdleTimer();
  }
  function initImmersionSettings() {
    initStorageSync({
      onAutoHideChange: applyAutoHideUiSetting,
      onAutoFullscreenChange: applyAutoFullscreenSetting,
      onRetroactiveAutoFullscreen: enterAutoFullscreenOnOpen,
      isOverlayActive,
      isOverlayFullscreenElement,
      isSliderInteracting: () => isSliderInteracting,
      hasUserToggledFullscreenInSession: hasUserToggledFullscreen
    });
    bindFullscreenChangeListener();
  }
  function bindHeaderHoverEvents(overlayEl) {
    if (typeof overlayEl.querySelector !== "function") return;
    const headerEl = overlayEl.querySelector(".disagall-header");
    if (!headerEl) return;
    headerEl.addEventListener("mouseenter", () => {
      isHeaderHovered = true;
    });
    headerEl.addEventListener("mouseleave", () => {
      isHeaderHovered = false;
      if (!isOverlayActive() || isAnyUiHiddenClass(overlayEl)) return;
      resetIdleTimer();
    });
  }
  function bindSliderInteractionEvents(sliderEl) {
    if (!sliderEl) return;
    const startSliderInteraction = () => {
      isSliderInteracting = true;
      resetIdleTimer();
    };
    const endSliderInteraction = () => {
      if (!isSliderInteracting) return;
      isSliderInteracting = false;
      resetIdleTimer();
    };
    sliderEl.addEventListener("mousedown", startSliderInteraction);
    sliderEl.addEventListener("touchstart", startSliderInteraction, { passive: true });
    sliderEl.addEventListener("change", endSliderInteraction);
    sliderEl.addEventListener("mouseup", endSliderInteraction);
    sliderEl.addEventListener("touchend", endSliderInteraction);
    if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
      window.addEventListener("mouseup", endSliderInteraction);
    }
  }
  function updateLastPointerCoords(e) {
    if (!e) return;
    if (Number.isFinite(e.screenX) && Number.isFinite(e.screenY)) {
      lastPointerScreenX = e.screenX;
      lastPointerScreenY = e.screenY;
    }
    if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY)) {
      lastPointerClientX = e.clientX;
      lastPointerClientY = e.clientY;
    }
  }
  function isStationarySyntheticMouseMove(e) {
    if (!e) return false;
    const hasMovement = Number.isFinite(e.movementX) && Number.isFinite(e.movementY);
    if (hasMovement && (e.movementX !== 0 || e.movementY !== 0)) return false;
    if (Number.isFinite(e.screenX) && Number.isFinite(e.screenY) && lastPointerScreenX !== null) {
      return e.screenX === lastPointerScreenX && e.screenY === lastPointerScreenY;
    }
    if (Number.isFinite(e.clientX) && Number.isFinite(e.clientY) && lastPointerClientX !== null) {
      return e.clientX === lastPointerClientX && e.clientY === lastPointerClientY;
    }
    return false;
  }
  function handleOverlayMouseMove(overlayEl, e) {
    if (!isOverlayActive()) return;
    const suppressed = isAnyUiHiddenClass(overlayEl) && (isFullscreenTransitionGuarded() || isStationarySyntheticMouseMove(e));
    updateLastPointerCoords(e);
    if (suppressed) return;
    resetIdleTimer();
  }
  function bindImmersionEvents(overlayEl, sliderEl) {
    if (!overlayEl) return;
    bindFullscreenChangeListener();
    overlayEl.addEventListener("mousemove", (e) => handleOverlayMouseMove(overlayEl, e));
    bindHeaderHoverEvents(overlayEl);
    bindSliderInteractionEvents(sliderEl);
  }

  // src/controller/recommend_controller.js
  var RECOMMEND_UNLOCK_DELAY_MS = 500;
  var RECOMMEND_LOCK_TOAST_DURATION_MS = 2500;
  var lastRecommendTime = 0;
  var isRecommending = false;
  var hasVotedCurrentPost = false;
  function clearRecommendTimers() {
    if (Array.isArray(state.recommendTimers)) {
      state.recommendTimers.forEach((timerId) => clearTimeout(timerId));
      state.recommendTimers = [];
    }
    if (state.recommendUnlockTimer !== null) {
      clearTimeout(state.recommendUnlockTimer);
      state.recommendUnlockTimer = null;
    }
    isRecommending = false;
  }
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
  function markCurrentPostVoted(recommendBtnEl) {
    hasVotedCurrentPost = true;
    if (recommendBtnEl) recommendBtnEl.classList.add("voted");
  }
  function checkPreRecommendGuards(now, recommendBtnEl) {
    if (now - lastRecommendTime < CONFIG.RECOMMEND_THROTTLE_MS) {
      showViewerToast("\uC7A0\uC2DC \uD6C4 \uB2E4\uC2DC \uC2DC\uB3C4\uD574 \uC8FC\uC138\uC694.");
      return { proceed: false, returnValue: false };
    }
    const btn = getNativeRecommendButton();
    if (!btn) {
      showViewerToast("\uBCF8\uBB38\uC758 \uCD94\uCC9C \uBC84\uD2BC\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
      return { proceed: false, returnValue: false };
    }
    const isAlreadyVoted = hasVotedCurrentPost || isRecommendButtonDisabled(btn) || Boolean(recommendBtnEl && recommendBtnEl.classList.contains("voted"));
    if (isAlreadyVoted) {
      showViewerToast("\uC774\uBBF8 \uAC1C\uB150\uAE00 \uCD94\uCC9C\uC744 \uC644\uB8CC\uD55C \uAC8C\uC2DC\uAE00\uC785\uB2C8\uB2E4. \u{1F44D}");
      return { proceed: false, returnValue: true };
    }
    return { proceed: true, btn };
  }
  function handleMidRecommendCheck(beforeCount) {
    if (!isOverlayActive()) return;
    const midCount = getPostRecommendCount();
    updateRecommendButtonUi();
    if (midCount !== null && beforeCount !== null && midCount > beforeCount) {
      markCurrentPostVoted(state.elements.recommendBtnEl);
      showViewerToast("\uAC1C\uB150\uAE00 \uCD94\uCC9C\uC774 \uC644\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4! \u{1F44D}");
    }
  }
  function handleAfterRecommendCheck(beforeCount, isLoggedIn) {
    if (!isOverlayActive()) return;
    const afterCount = getPostRecommendCount();
    updateRecommendButtonUi();
    if (afterCount === null || beforeCount === null) return;
    const { recommendBtnEl } = state.elements;
    if (afterCount > beforeCount) {
      markCurrentPostVoted(recommendBtnEl);
      return;
    }
    hasVotedCurrentPost = false;
    if (!isLoggedIn) {
      if (recommendBtnEl) recommendBtnEl.classList.remove("voted");
      showViewerToast("\uB85C\uADF8\uC778\uC774 \uD544\uC694\uD55C \uAC24\uB7EC\uB9AC\uC785\uB2C8\uB2E4. (\uBE44\uD68C\uC6D0 \uCD94\uCC9C \uC81C\uD55C \u{1F512})", RECOMMEND_LOCK_TOAST_DURATION_MS);
      return;
    }
    showViewerToast("\uCD94\uCC9C\uC774 \uBC18\uC601\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. (\uC774\uBBF8 \uCD94\uCC9C\uD588\uAC70\uB098 \uC81C\uD55C\uB428)");
  }
  function scheduleRecommendSyncTimers(beforeCount, isLoggedIn) {
    if (Array.isArray(state.recommendTimers)) {
      state.recommendTimers.forEach((timerId) => clearTimeout(timerId));
    }
    state.recommendTimers = [
      setTimeout(() => handleMidRecommendCheck(beforeCount), CONFIG.RECOMMEND_SYNC_DELAYS[0]),
      setTimeout(() => handleAfterRecommendCheck(beforeCount, isLoggedIn), CONFIG.RECOMMEND_SYNC_DELAYS[1])
    ];
  }
  function finalizeRecommendLock(shouldUnlockAsync) {
    if (!shouldUnlockAsync) {
      isRecommending = false;
      return;
    }
    if (state.recommendUnlockTimer !== null) {
      clearTimeout(state.recommendUnlockTimer);
    }
    state.recommendUnlockTimer = setTimeout(() => {
      isRecommending = false;
      state.recommendUnlockTimer = null;
    }, RECOMMEND_UNLOCK_DELAY_MS);
  }
  function triggerPostRecommend() {
    if (!isOverlayActive() || isRecommending) return false;
    const now = Date.now();
    const guard = checkPreRecommendGuards(now, state.elements.recommendBtnEl);
    if (!guard.proceed) return guard.returnValue;
    const isLoggedIn = isUserLoggedIn();
    const isCodeEnforced = isGalleryCodeEnforced();
    const beforeCount = getPostRecommendCount();
    isRecommending = true;
    let shouldUnlockAsync = false;
    try {
      if (!dispatchRecommendClick(guard.btn)) {
        showViewerToast("\uCD94\uCC9C \uC2E4\uD589\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.");
        return false;
      }
      lastRecommendTime = now;
      showViewerToast(!isLoggedIn && isCodeEnforced ? "\uAC1C\uCD94 \uC2DC\uB3C4 \uC911... (\uBE44\uD68C\uC6D0 \uCF54\uB4DC \uC81C\uD55C \uAC00\uB2A5 \u{1F512})" : "\uAC1C\uB150\uAE00 \uCD94\uCC9C\uC744 \uB20C\uB800\uC2B5\uB2C8\uB2E4! \u{1F44D}");
      scheduleRecommendSyncTimers(beforeCount, isLoggedIn);
      shouldUnlockAsync = true;
      return true;
    } catch (e) {
      showViewerToast("\uCD94\uCC9C \uC2E4\uD589 \uC911 \uC624\uB958\uAC00 \uBC1C\uC0DD\uD588\uC2B5\uB2C8\uB2E4.");
      return false;
    } finally {
      finalizeRecommendLock(shouldUnlockAsync);
    }
  }

  // src/controller/image_loader.js
  var imageLoadSeq = 0;
  var renderedLoadSeq = -1;
  var boundMainImgEls = /* @__PURE__ */ new WeakSet();
  function resetImageLoadSeq() {
    imageLoadSeq += 1;
    renderedLoadSeq = -1;
  }
  function resolveLazyOriginalUrl(img) {
    const attrUrl = img.getAttribute("data-original") || img.getAttribute("data-src") || img.getAttribute("data-url");
    if (attrUrl) return attrUrl;
    if (!img.dataset) return null;
    return img.dataset.original || img.dataset.src || img.dataset.url || null;
  }
  function preloadSinglePostImage(img) {
    if (!isPostBodyImage(img)) return;
    const orig = resolveLazyOriginalUrl(img);
    const needsPreload = img.src.includes("loading") || img.src.includes("blank.gif") || img.classList.contains("lazy");
    if (orig && needsPreload) {
      img.src = orig;
      img.classList.remove("lazy");
    }
  }
  function forcePreloadPostImages() {
    const imgs = document.querySelectorAll(`${POST_BODY_CONTAINER_SELECTORS} img, img`);
    imgs.forEach(preloadSinglePostImage);
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
  function updateNavAndCounterUi() {
    const { counterEl, prevBtnEl, nextBtnEl } = state.elements;
    const total = state.postImages.length;
    if (counterEl) {
      counterEl.textContent = `${state.currentIndex + 1} / ${total}`;
    }
    if (prevBtnEl) prevBtnEl.classList.toggle("disabled", total <= 1);
    if (nextBtnEl) nextBtnEl.classList.toggle("disabled", total <= 1);
  }
  function handleMainImgLoad() {
    if (renderedLoadSeq !== imageLoadSeq || !isOverlayActive()) return;
    if (state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
      applyFittingAndPadding();
    }
  }
  function ensureMainImgLoadListener(mainImgEl) {
    if (!mainImgEl || typeof mainImgEl.addEventListener !== "function" || boundMainImgEls.has(mainImgEl)) {
      return;
    }
    mainImgEl.addEventListener("load", handleMainImgLoad);
    boundMainImgEls.add(mainImgEl);
  }
  function renderViewerImage(mainImgEl, loaderEl, src, alt, seq) {
    if (!mainImgEl || seq !== imageLoadSeq || !isOverlayActive()) return;
    ensureMainImgLoadListener(mainImgEl);
    renderedLoadSeq = seq;
    mainImgEl.src = src;
    mainImgEl.alt = alt;
    if (loaderEl) loaderEl.style.display = "none";
    mainImgEl.style.opacity = "1";
    if (state.zoom.scale <= CONFIG.ZOOM_EPSILON) {
      applyFittingAndPadding();
    }
  }
  function prepareImageLoadingUi() {
    const { loaderEl, mainImgEl } = state.elements;
    if (loaderEl) loaderEl.style.display = "flex";
    if (mainImgEl) {
      mainImgEl.style.opacity = "0";
      mainImgEl.referrerPolicy = "no-referrer-when-downgrade";
    }
    return { loaderEl, mainImgEl };
  }
  function attachTempImageHandlers(imgData, mainImgEl, loaderEl, seq) {
    const tempImg = new Image();
    tempImg.referrerPolicy = "no-referrer-when-downgrade";
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
      const fallbackSrc = imgData.element && (imgData.element.currentSrc || imgData.element.src) || imgData.url;
      renderViewerImage(mainImgEl, loaderEl, fallbackSrc, imgData.alt, seq);
    };
    tempImg.src = imgData.url;
  }
  function showImage(index) {
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
  function navigate(direction) {
    showImage(state.currentIndex + direction);
  }
  function findImageIndexByUrl(searchUrl) {
    if (!searchUrl) return -1;
    return state.postImages.findIndex(
      (item) => item.url === searchUrl || searchUrl.includes(item.url) || item.url.includes(searchUrl)
    );
  }
  function findTargetImageIndex(targetSrc) {
    if (targetSrc) {
      const directIdx = findImageIndexByUrl(getCleanOriginalUrl(targetSrc));
      if (directIdx !== -1) return directIdx;
    }
    const fallbackIdx = findImageIndexByUrl(state.lastRightClickedImgSrc);
    return fallbackIdx !== -1 ? fallbackIdx : 0;
  }

  // src/controller/overlay_bindings.js
  function bindStopPropagationClick(el, handler) {
    if (!el) return;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      handler();
    });
  }
  function bindOverlayButtons(onCloseViewer) {
    const { prevBtnEl, nextBtnEl, recommendBtnEl, fullscreenBtnEl } = state.elements;
    const closeBtnEl = document.getElementById("disagall-close-btn");
    if (closeBtnEl) closeBtnEl.addEventListener("click", onCloseViewer);
    bindStopPropagationClick(recommendBtnEl, triggerPostRecommend);
    bindStopPropagationClick(fullscreenBtnEl, toggleFullscreen);
    bindStopPropagationClick(prevBtnEl, () => navigate(-1));
    bindStopPropagationClick(nextBtnEl, () => navigate(1));
  }
  function applySliderPaddingInput(rawValue, sliderValEl) {
    const numeric = typeof rawValue === "string" && rawValue.trim() !== "" ? Number(rawValue) : rawValue;
    const nextPadding = normalizePaddingValue(numeric);
    if (nextPadding === null) return null;
    state.isFullscreenPaddingZero = false;
    state.currentPadding = nextPadding;
    syncPaddingSliderUi();
    if (sliderValEl && sliderValEl !== state.elements.sliderValEl) {
      sliderValEl.textContent = `${state.currentPadding}px`;
    }
    markLocalPaddingModified();
    applyFittingAndPadding();
    return state.currentPadding;
  }
  function bindPaddingSlider(sliderEl, sliderValEl) {
    if (!sliderEl) return;
    sliderEl.addEventListener("input", (e) => {
      if (applySliderPaddingInput(e.target.value, sliderValEl) === null) return;
      resetIdleTimer();
      schedulePaddingSave();
    });
    sliderEl.addEventListener("change", (e) => {
      if (e?.target?.value !== void 0) {
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
    overlayEl.addEventListener("click", (e) => {
      if (consumeSuppressedBackdropClick()) return;
      const target = e?.target;
      if (!target) return;
      if (target === overlayEl || target.id === "disagall-stage" || target.id === "disagall-img-wrapper") {
        onCloseViewer();
      }
    });
  }
  function bindOverlayControls(onCloseViewer) {
    const { overlayEl, sliderEl, sliderValEl } = state.elements;
    bindOverlayButtons(onCloseViewer);
    bindPaddingSlider(sliderEl, sliderValEl);
    bindOverlayBackdrop(overlayEl, onCloseViewer);
  }

  // src/controller/viewer_shortcuts.js
  var shortcutCallbacks = {
    onOpenViewer: () => {
    },
    onCloseViewer: () => {
    }
  };
  function setViewerShortcutCallbacks(callbacks = {}) {
    shortcutCallbacks = { ...shortcutCallbacks, ...callbacks };
  }
  var KEY_ACTIONS = {
    "Escape": () => getFullscreenElement() ? exitFullscreenSafely() : shortcutCallbacks.onCloseViewer(),
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
    "C": () => triggerPostRecommend(),
    "h": () => toggleUiManual(),
    "H": () => toggleUiManual(),
    "f": () => toggleFullscreen(),
    "F": () => toggleFullscreen()
  };
  var CODE_ACTIONS = {
    "KeyA": () => navigate(-1),
    "KeyD": () => navigate(1),
    "KeyW": () => navigatePost("up"),
    "KeyS": () => navigatePost("down"),
    "KeyR": () => triggerPostRecommend(),
    "KeyC": () => triggerPostRecommend(),
    "KeyH": () => toggleUiManual(),
    "KeyF": () => toggleFullscreen()
  };
  function handleKeyDown(e) {
    if (!isOverlayActive() || !e || e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (isEditableTarget(e.target)) {
      if (e.key === "Escape" && typeof e.target.blur === "function") e.target.blur();
      return;
    }
    if (isExternalModalOpen()) return;
    const action = KEY_ACTIONS[e.key] || (e.code ? CODE_ACTIONS[e.code] : null);
    if (!action) return;
    if (typeof e.preventDefault === "function") e.preventDefault();
    if (typeof e.stopPropagation === "function") e.stopPropagation();
    action();
  }

  // src/controller/viewer_controller.js
  var boundPageHideWin = null;
  var boundContextMenuDoc = null;
  var boundResizeWin = null;
  var boundMessageWin = null;
  function createOverlay() {
    if (state.elements.overlayEl) return;
    const overlay = document.createElement("div");
    overlay.id = "disagall-viewer-overlay";
    overlay.innerHTML = buildOverlayHtml();
    document.body.appendChild(overlay);
    cacheOverlayElements();
    const { overlayEl, mainImgEl, sliderEl } = state.elements;
    bindOverlayControls(closeViewer);
    bindImmersionEvents(overlayEl, sliderEl);
    ensureMainImgLoadListener(mainImgEl);
    setupZoomEvents(mainImgEl);
    window.addEventListener("keydown", handleKeyDown, true);
  }
  function blurActiveEditable() {
    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    if (isEditableTarget(activeEl) && typeof activeEl.blur === "function") activeEl.blur();
  }
  function activateOverlayDom(overlayEl) {
    blurActiveEditable();
    const wasActive = isOverlayActive();
    if (!wasActive) {
      resetFullscreenState();
      state.previousBodyOverflow = document.body.style.overflow;
    }
    overlayEl.classList.add("active");
    document.body.style.overflow = "hidden";
    return wasActive;
  }
  function syncInitialViewerMode(overlayEl, wasActive) {
    if (state.autoFullscreen) {
      hideUi(true);
      enterAutoFullscreenOnOpen();
      return;
    }
    showUi();
    resetIdleTimer();
    if (!wasActive && getFullscreenElement() === overlayEl) exitFullscreenSafely();
  }
  function openViewer(targetSrc, isAuto = false) {
    forcePreloadPostImages();
    collectPostImages();
    if (state.postImages.length === 0) {
      if (!isAuto) alert("\uB514\uC2DC \uC0AC\uC9C4 \uBDF0\uC5B4: \uAC8C\uC2DC\uAE00 \uBCF8\uBB38\uC5D0\uC11C \uAC10\uC0C1 \uAC00\uB2A5\uD55C \uC774\uBBF8\uC9C0\uB97C \uCC3E\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4.");
      return;
    }
    cancelPendingPostNavigation();
    clearAutoOpenPollTimer();
    dismissNoPhotoNotice();
    createOverlay();
    const { overlayEl } = state.elements;
    if (!overlayEl) return;
    const targetIndex = findTargetImageIndex(targetSrc);
    const wasActive = activateOverlayDom(overlayEl);
    updateRecommendButtonUi();
    showImage(targetIndex);
    syncInitialViewerMode(overlayEl, wasActive);
  }
  function closeViewer() {
    resetImageLoadSeq();
    cancelPendingPostNavigation();
    clearAutoOpenPollTimer();
    dismissNoPhotoNotice();
    dismissViewerToast();
    clearRecommendTimers();
    clearIdleTimer();
    cancelResizeRaf();
    const { overlayEl } = state.elements;
    if (overlayEl) {
      overlayEl.classList.remove("active");
      document.body.style.overflow = state.previousBodyOverflow;
    }
    flushPaddingSave();
    resetImmersionGuards();
    resetFullscreenState();
    showUi();
    resetZoom();
    cancelZoomRaf();
    cancelResizeRaf();
    exitFullscreenSafely();
  }
  setPostNavCallbacks({
    onOpenViewer: (targetSrc, isAuto) => openViewer(targetSrc, isAuto),
    onPreloadAndCollect: () => {
      forcePreloadPostImages();
      collectPostImages();
      return state.postImages;
    }
  });
  setViewerShortcutCallbacks({
    onOpenViewer: () => openViewer(),
    onCloseViewer: () => closeViewer()
  });
  function clearQuickLauncherTimer() {
    if (state.quickLauncherTimer === null) return;
    clearTimeout(state.quickLauncherTimer);
    state.quickLauncherTimer = null;
  }
  function bindContextMenuTracker() {
    if (typeof document === "undefined" || typeof document.addEventListener !== "function") return;
    if (boundContextMenuDoc === document) return;
    boundContextMenuDoc = document;
    document.addEventListener("contextmenu", (e) => {
      const target = e.target;
      state.lastRightClickedImgSrc = target && target.tagName === "IMG" && isPostBodyImage(target) ? getBestImgUrl(target) : null;
    }, true);
  }
  function cancelResizeRaf() {
    if (state.resizeRafId === null) return;
    cancelAnimationFrame(state.resizeRafId);
    state.resizeRafId = null;
  }
  function bindResizeHandler() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    if (boundResizeWin === window) return;
    boundResizeWin = window;
    window.addEventListener("resize", () => {
      if (!isOverlayActive()) return;
      cancelResizeRaf();
      let fired = false;
      const rafId = requestAnimationFrame(() => {
        fired = true;
        state.resizeRafId = null;
        if (isOverlayActive()) applyFittingAndPadding();
      });
      state.resizeRafId = fired ? null : rafId;
    });
  }
  function bindTestOpenListener() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    if (boundMessageWin === window) return;
    boundMessageWin = window;
    window.addEventListener("message", (event) => {
      if (event.origin && event.origin !== window.location.origin && window.location.origin !== "null") return;
      if (event.data && event.data.action === "disagall_test_open") openViewer();
    });
  }
  function handlePageHideCleanup() {
    cancelPendingPostNavigation();
    clearAutoOpenPollTimer();
    clearQuickLauncherTimer();
    flushPaddingSave();
  }
  function bindPageHideCleanup() {
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;
    if (boundPageHideWin === window) return;
    boundPageHideWin = window;
    window.addEventListener("pagehide", handlePageHideCleanup);
  }
  function initViewerBase() {
    initImmersionSettings();
    bindContextMenuTracker();
    bindResizeHandler();
    bindTestOpenListener();
    bindPageHideCleanup();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", checkAutoOpen);
    } else {
      checkAutoOpen();
    }
  }

  // src/extension.js
  (function() {
    "use strict";
    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message && message.action === "open_viewer") {
          openViewer(message.srcUrl);
          sendResponse({ success: true });
        }
      });
    }
    initViewerBase();
  })();
})();
