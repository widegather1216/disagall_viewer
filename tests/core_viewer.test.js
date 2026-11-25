// Unit & Regression tests for core-viewer (Disagall Viewer)
const assert = require('assert');
const esbuild = require('esbuild');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function createMockDom() {
  const docListeners = { capture: {}, bubble: {} };
  const winListeners = {};
  const allElements = [];

  function matchesSingleSelector(el, sel) {
    const s = sel.trim();
    if (!s || !el) return false;
    if (s.startsWith('#')) {
      return el.id === s.slice(1);
    }
    if (s.startsWith('.')) {
      return el.classList.contains(s.slice(1));
    }
    if (s.startsWith('[') && s.endsWith(']')) {
      return false;
    }
    if (s.includes(' ')) {
      const parts = s.trim().split(/\s+/);
      const last = parts[parts.length - 1];
      if (!matchesSingleSelector(el, last)) return false;
      let cur = el.parentElement;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (cur && !matchesSingleSelector(cur, parts[i])) {
          cur = cur.parentElement;
        }
        if (!cur) return false;
        cur = cur.parentElement;
      }
      return true;
    }
    return el.tagName === s.toUpperCase();
  }

  function matchesSelectorList(el, selectorList) {
    if (!selectorList) return false;
    return selectorList.split(',').some((part) => matchesSingleSelector(el, part));
  }

  function createClassList(el) {
    const classes = new Set(el._initialClasses || []);
    return {
      add: (...names) => names.forEach((n) => classes.add(n)),
      remove: (...names) => names.forEach((n) => classes.delete(n)),
      toggle: (name, force) => {
        if (force === undefined) {
          if (classes.has(name)) {
            classes.delete(name);
            return false;
          }
          classes.add(name);
          return true;
        }
        if (force) classes.add(name);
        else classes.delete(name);
        return Boolean(force);
      },
      contains: (name) => classes.has(name),
    };
  }

  function createElement(tagName, id = '', classNames = []) {
    const elListeners = {};
    const attrs = {};
    const el = {
      tagName: tagName.toUpperCase(),
      id,
      _initialClasses: classNames,
      _listeners: elListeners,
      children: [],
      parentElement: null,
      style: {},
      dataset: {},
      src: '',
      currentSrc: '',
      alt: '',
      value: '24',
      textContent: '',
      title: '',
      naturalWidth: 1200,
      naturalHeight: 900,
      offsetHeight: 50,
      addEventListener: (ev, fn) => {
        if (!elListeners[ev]) elListeners[ev] = [];
        elListeners[ev].push(fn);
      },
      dispatchEvent: (evObj) => {
        const ev = typeof evObj === 'string' ? { type: evObj } : evObj;
        let stopped = false;
        const origStop = ev.stopPropagation;
        ev.stopPropagation = () => {
          stopped = true;
          if (typeof origStop === 'function') origStop.call(ev);
        };
        if (!ev.target) ev.target = el;
        let cur = el;
        while (cur && !stopped) {
          (cur._listeners?.[ev.type] || []).forEach((fn) => fn(ev));
          cur = ev.bubbles ? cur.parentElement : null;
        }
      },
      setAttribute: (k, v) => {
        attrs[k] = String(v);
        if (k === 'id') el.id = String(v);
      },
      getAttribute: (k) => (Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null),
      hasAttribute: (k) => Object.prototype.hasOwnProperty.call(attrs, k),
      appendChild: (child) => {
        child.parentElement = el;
        el.children.push(child);
        return child;
      },
      closest: (selectorList) => {
        let cur = el;
        while (cur) {
          if (matchesSelectorList(cur, selectorList)) return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      querySelector: (selectorList) => {
        const found = [];
        const walk = (node) => {
          for (const child of node.children) {
            if (matchesSelectorList(child, selectorList)) found.push(child);
            walk(child);
          }
        };
        walk(el);
        return found[0] || null;
      },
      querySelectorAll: (selectorList) => {
        const found = [];
        const walk = (node) => {
          for (const child of node.children) {
            if (matchesSelectorList(child, selectorList)) found.push(child);
            walk(child);
          }
        };
        walk(el);
        return found;
      },
      blur: () => {},
      matches: () => false,
    };
    el.classList = createClassList(el);
    allElements.push(el);
    return el;
  }

  const head = createElement('head');
  const body = createElement('body');
  body.style.overflow = 'auto';

  const doc = {
    readyState: 'complete',
    activeElement: body,
    head,
    body,
    createElement: (tag) => {
      const node = createElement(tag);
      let htmlCache = '';
      Object.defineProperty(node, 'innerHTML', {
        get: () => htmlCache,
        set: (html) => {
          htmlCache = html;
          if (html.includes('disagall-header')) {
            const header = createElement('div', '', ['disagall-header']);
            const counter = createElement('div', 'disagall-counter', ['disagall-counter']);
            const infoBadge = createElement('div', 'disagall-info-badge', ['disagall-info-badge']);
            const slider = createElement('input', 'disagall-slider', ['disagall-slider']);
            const sliderVal = createElement('span', 'disagall-slider-val', ['disagall-padding-val']);
            const recBtn = createElement('button', 'disagall-btn-recommend', ['disagall-btn']);
            const fsBtn = createElement('button', 'disagall-btn-fullscreen', ['disagall-btn']);
            const closeBtn = createElement('button', 'disagall-close-btn', ['disagall-btn']);
            header.appendChild(counter);
            header.appendChild(infoBadge);
            header.appendChild(slider);
            header.appendChild(sliderVal);
            header.appendChild(recBtn);
            header.appendChild(fsBtn);
            header.appendChild(closeBtn);

            const stage = createElement('div', 'disagall-stage', ['disagall-stage']);
            const prevBtn = createElement('div', 'disagall-prev-btn', ['disagall-nav-btn']);
            const loader = createElement('div', 'disagall-loader', ['disagall-loader']);
            const wrapper = createElement('div', 'disagall-img-wrapper', ['disagall-img-wrapper']);
            const mainImg = createElement('img', 'disagall-main-img', ['disagall-img']);
            const nextBtn = createElement('div', 'disagall-next-btn', ['disagall-nav-btn']);
            wrapper.appendChild(mainImg);
            stage.appendChild(prevBtn);
            stage.appendChild(loader);
            stage.appendChild(wrapper);
            stage.appendChild(nextBtn);

            const toast = createElement('div', 'disagall-toast', ['disagall-toast']);
            const footer = createElement('div', '', ['disagall-footer']);
            node.appendChild(header);
            node.appendChild(stage);
            node.appendChild(toast);
            node.appendChild(footer);
          }
        },
      });
      return node;
    },
    getElementById: (id) => allElements.find((el) => el.id === id) || null,
    querySelector: (selectorList) => allElements.find((el) => matchesSelectorList(el, selectorList)) || null,
    querySelectorAll: (selectorList) => allElements.filter((el) => matchesSelectorList(el, selectorList)),
    addEventListener: (ev, fn, useCapture = false) => {
      const bucket = useCapture ? docListeners.capture : docListeners.bubble;
      if (!bucket[ev]) bucket[ev] = [];
      bucket[ev].push(fn);
    },
    dispatchClick: (target) => {
      const ev = {
        type: 'click',
        target,
        preventDefault() {},
        stopPropagation() {},
      };
      (docListeners.capture.click || []).forEach((fn) => fn(ev));
      if (target && typeof target.dispatchEvent === 'function') {
        target.dispatchEvent(ev);
      }
      (docListeners.bubble.click || []).forEach((fn) => fn(ev));
    },
    dispatchContextMenu: (target) => {
      const ev = {
        type: 'contextmenu',
        target,
        preventDefault() {},
        stopPropagation() {},
      };
      (docListeners.capture.contextmenu || []).forEach((fn) => fn(ev));
      (docListeners.bubble.contextmenu || []).forEach((fn) => fn(ev));
    },
  };

  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    location: { protocol: 'https:', origin: 'https://gall.dcinside.com', href: 'https://gall.dcinside.com/board/view/?id=test&no=1' },
    addEventListener: (ev, fn) => {
      if (!winListeners[ev]) winListeners[ev] = [];
      winListeners[ev].push(fn);
    },
    removeEventListener: (ev, fn) => {
      if (!winListeners[ev]) return;
      winListeners[ev] = winListeners[ev].filter((item) => item !== fn);
    },
    dispatchEvent: (evObj) => {
      const ev = typeof evObj === 'string' ? { type: evObj } : evObj;
      (winListeners[ev.type] || []).slice().forEach((fn) => fn(ev));
    },
  };

  return { doc, win, body, createElement };
}

async function bundleUserscript() {
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/userscript.js')],
    bundle: true,
    format: 'iife',
    target: ['chrome100', 'firefox100', 'safari15'],
    define: { __INJECTED_CSS__: JSON.stringify('') },
    write: false,
  });
  return result.outputFiles[0].text;
}

async function run() {
  console.log('🧪 Starting Core Viewer Unit & Regression Tests...\n');

  // Test 1 (DEFECT-01 Parser layer): #disagall-viewer-overlay images must be excluded by isPostBodyImage
  {
    const imageParser = await import('../src/parser/image_parser.js');
    const { body, createElement } = createMockDom();
    const overlay = createElement('div', 'disagall-viewer-overlay', ['active']);
    const mainImg = createElement('img', 'disagall-main-img', ['disagall-img']);
    mainImg.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=999';
    overlay.appendChild(mainImg);
    body.appendChild(overlay);

    assert.strictEqual(
      imageParser.isPostBodyImage(mainImg),
      false,
      'DEFECT-01: #disagall-main-img inside #disagall-viewer-overlay must not be classified as post body image'
    );
    console.log('✅ Test 1: DEFECT-01 parser exclusion (#disagall-viewer-overlay) verified');
  }

  // Test 2 (DEFECT-01 Controller layer): repeated openViewer() while active must preserve previousBodyOverflow
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const postImg = dom.createElement('img');
    postImg.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=101';
    writeDiv.appendChild(postImg);
    dom.body.appendChild(writeDiv);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;

    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};
    global.Image = class {
      set src(v) {
        this._src = v;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    try {
      const { state } = await import('../src/state.js');
      // Reset cached elements for clean test run
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';

      const controller = await import('../src/controller/viewer_controller.js');
      dom.body.style.overflow = 'auto';

      controller.openViewer();
      assert.strictEqual(dom.body.style.overflow, 'hidden');
      assert.strictEqual(state.previousBodyOverflow, 'auto');

      // Simulate duplicate openViewer() while already active
      controller.openViewer();
      assert.strictEqual(
        state.previousBodyOverflow,
        'auto',
        'DEFECT-01: duplicate openViewer() while active must not overwrite previousBodyOverflow with "hidden"'
      );

      controller.closeViewer();
      assert.strictEqual(
        dom.body.style.overflow,
        'auto',
        'DEFECT-01: closeViewer() must restore original body.style.overflow ("auto") after duplicate openViewer()'
      );
      console.log('✅ Test 2: DEFECT-01 openViewer() active guard & body overflow restoration verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
    }
  }

  // Test 3 (DEFECT-01 Userscript capture click re-entry & non-Element target guard)
  {
    const userscriptCode = await bundleUserscript();
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const postImg = dom.createElement('img');
    postImg.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=202';
    writeDiv.appendChild(postImg);
    dom.body.appendChild(writeDiv);
    dom.body.style.overflow = 'scroll';

    const sandbox = {
      window: dom.win,
      document: dom.doc,
      Event: class { constructor(type) { this.type = type; } },
      Image: class {
        set src(v) {
          this._src = v;
          if (typeof this.onload === 'function') this.onload();
        }
        get src() { return this._src; }
      },
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: () => {},
      setTimeout,
      clearTimeout,
      setInterval,
      clearInterval,
      alert: () => {},
      GM_addStyle: () => {},
      GM_getValue: (_k, def) => def,
      GM_setValue: () => {},
      GM_registerMenuCommand: () => {},
      URL,
      console,
    };
    vm.createContext(sandbox);
    vm.runInContext(userscriptCode, sandbox);

    // Clicking a non-Element target (no .closest) must not throw TypeError
    dom.doc.dispatchClick({ tagName: undefined });

    // First click on post body image opens viewer
    dom.doc.dispatchClick(postImg);
    const overlay = dom.doc.getElementById('disagall-viewer-overlay');
    const mainImg = dom.doc.getElementById('disagall-main-img');
    assert(overlay && overlay.classList.contains('active'), 'Viewer must open on post body image click');
    assert.strictEqual(dom.body.style.overflow, 'hidden');

    // Track if showImage/loader resets on re-click inside overlay
    const loader = dom.doc.getElementById('disagall-loader');
    loader.style.display = 'none';
    let srcWrites = 0;
    let currentSrcVal = mainImg.src;
    Object.defineProperty(mainImg, 'src', {
      get: () => currentSrcVal,
      set: (v) => {
        srcWrites++;
        currentSrcVal = v;
      },
      configurable: true,
    });

    // Click inside #disagall-viewer-overlay on #disagall-main-img (e.g. double-click / drag end)
    dom.doc.dispatchClick(mainImg);
    assert.strictEqual(
      srcWrites,
      0,
      'DEFECT-01: clicking #disagall-main-img inside overlay must NOT re-trigger openViewer()/showImage()'
    );

    // Close viewer via close button and ensure scroll is restored to 'scroll'
    const closeBtn = dom.doc.getElementById('disagall-close-btn');
    closeBtn.dispatchEvent({ type: 'click', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(overlay.classList.contains('active'), false, 'Viewer must close on close button click');
    assert.strictEqual(
      dom.body.style.overflow,
      'scroll',
      'DEFECT-01: body.style.overflow must restore to "scroll" after clicking #disagall-main-img and closing'
    );
    console.log('✅ Test 3: DEFECT-01 userscript capture click guard & non-Element safety verified');
  }

  // Test 4 (DEFECT-02): stale tempImg.onload/onerror must not overwrite newer navigation or closed viewer
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const img1 = dom.createElement('img');
    img1.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=101';
    img1.alt = 'First';
    const img2 = dom.createElement('img');
    img2.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=102';
    img2.alt = 'Second';
    writeDiv.appendChild(img1);
    writeDiv.appendChild(img2);
    dom.body.appendChild(writeDiv);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;

    const pendingImages = [];
    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};
    global.Image = class {
      set src(v) {
        this._src = v;
        pendingImages.push(this);
      }
      get src() { return this._src; }
    };

    try {
      const { state } = await import('../src/state.js');
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.zoom.scale = 1.0;

      const controller = await import('../src/controller/viewer_controller.js');
      controller.openViewer();
      assert.strictEqual(pendingImages.length, 1);

      // Rapidly navigate to 2nd image before 1st tempImg settles
      controller.navigate(1);
      assert.strictEqual(pendingImages.length, 2);
      assert.strictEqual(state.elements.counterEl.textContent, '2 / 2');

      // Fast 2nd image finishes first
      pendingImages[1].onload();
      assert.strictEqual(state.elements.mainImgEl.src, img2.src);
      assert.strictEqual(state.elements.loaderEl.style.display, 'none');

      // Slow 1st image settles late -> must be discarded!
      pendingImages[0].onload();
      assert.strictEqual(
        state.elements.mainImgEl.src,
        img2.src,
        'DEFECT-02: stale tempImg.onload from previous index must not overwrite current mainImgEl.src'
      );
      assert.strictEqual(state.elements.counterEl.textContent, '2 / 2');

      // Navigate back to 1st image, then close viewer before tempImg settles
      controller.navigate(-1);
      assert.strictEqual(pendingImages.length, 3);
      assert.strictEqual(state.elements.loaderEl.style.display, 'flex');
      assert.strictEqual(state.elements.mainImgEl.style.opacity, '0');

      controller.closeViewer();
      pendingImages[2].onerror();
      assert.strictEqual(
        state.elements.mainImgEl.src,
        img2.src,
        'DEFECT-02: tempImg.onerror firing after closeViewer() must not mutate mainImgEl.src'
      );
      assert.strictEqual(
        state.elements.mainImgEl.style.opacity,
        '0',
        'DEFECT-02: tempImg callback after closeViewer() must not reveal mainImgEl'
      );

      // Reopen viewer at index 0, close before settling, reopen at index 1, and ensure pre-close onload cannot leak
      controller.openViewer(img1.src);
      assert.strictEqual(pendingImages.length, 4);
      controller.closeViewer();

      controller.openViewer(img2.src);
      assert.strictEqual(pendingImages.length, 5);
      pendingImages[4].onload();
      pendingImages[3].onload();
      assert.strictEqual(
        state.elements.mainImgEl.src,
        img2.src,
        'DEFECT-02: pre-close tempImg callback must not leak into reopened viewer session'
      );
      controller.closeViewer();
      console.log('✅ Test 4: DEFECT-02 stale tempImg.onload/onerror & closeViewer race defense verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
    }
  }

  // Test 5 (DEFECT-02): onerror fallback with initially uncached naturalWidth=0 must refit on mainImgEl load
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const img1 = dom.createElement('img');
    img1.src = 'https://dcimg7.dcinside.co.kr/fallback_1.jpg';
    img1.setAttribute('data-original', 'https://dcimg7.dcinside.co.kr/original_1.jpg');
    img1.alt = 'Uncached Fallback';
    const img2 = dom.createElement('img');
    img2.src = 'https://dcimg7.dcinside.co.kr/fallback_2.jpg';
    img2.alt = 'Second';
    writeDiv.appendChild(img1);
    writeDiv.appendChild(img2);
    dom.body.appendChild(writeDiv);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;

    const pendingImages = [];
    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};
    global.Image = class {
      set src(v) {
        this._src = v;
        pendingImages.push(this);
      }
      get src() { return this._src; }
    };

    try {
      const { state } = await import('../src/state.js');
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.zoom.scale = 1.0;

      const controller = await import('../src/controller/viewer_controller.js');
      controller.openViewer();

      const { mainImgEl, infoBadgeEl } = state.elements;
      // Simulate uncached image: naturalWidth/naturalHeight are 0 when src is assigned
      mainImgEl.naturalWidth = 0;
      mainImgEl.naturalHeight = 0;
      infoBadgeEl.textContent = '화면 맞춤';

      pendingImages[0].onerror();
      assert.strictEqual(mainImgEl.src, img1.src, 'onerror must fall back to original img.src');
      assert.strictEqual(infoBadgeEl.textContent, '화면 맞춤', 'Before load, naturalWidth=0 returns early');

      // Browser finishes loading fallbackSrc into mainImgEl
      mainImgEl.naturalWidth = 800;
      mainImgEl.naturalHeight = 1600;
      mainImgEl.dispatchEvent({ type: 'load', preventDefault() {}, stopPropagation() {} });

      assert.strictEqual(
        infoBadgeEl.textContent,
        '세로 사진 (800x1600)',
        'DEFECT-02: mainImgEl load event must re-run applyFittingAndPadding() for uncached fallback URL'
      );
      assert.strictEqual(mainImgEl.classList.contains('portrait'), true);
      assert(mainImgEl.style.maxWidth && mainImgEl.style.maxHeight, 'Fallback image dimensions must be fitted');

      // Stale mainImgEl load event after navigating to next image must be ignored
      controller.navigate(1);
      mainImgEl.naturalWidth = 2000;
      mainImgEl.naturalHeight = 1000;
      mainImgEl.dispatchEvent({ type: 'load', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        infoBadgeEl.textContent,
        '세로 사진 (800x1600)',
        'DEFECT-02: stale mainImgEl load during next pending tempImg must not refit old dimensions'
      );

      controller.closeViewer();
      console.log('✅ Test 5: DEFECT-02 onerror uncached fallback refit & stale load guard verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
    }
  }

  // Test 6 (DEFECT-03): Releasing zoom pan drag outside mainImgEl must NOT close viewer as backdrop click,
  // while subsequent genuine backdrop clicks still close the viewer.
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const img1 = dom.createElement('img');
    img1.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=301';
    const img2 = dom.createElement('img');
    img2.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=302';
    writeDiv.appendChild(img1);
    writeDiv.appendChild(img2);
    dom.body.appendChild(writeDiv);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;

    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};
    global.Image = class {
      set src(v) {
        this._src = v;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    try {
      const { state } = await import('../src/state.js');
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.zoom.scale = 1.0;
      state.zoom.panX = 0;
      state.zoom.panY = 0;
      state.zoom.isDragging = false;
      state.zoom.pendingDragRelease = false;
      state.zoom.suppressNextBackdropClick = false;
      if (state.zoom.suppressClickTimer !== null) {
        clearTimeout(state.zoom.suppressClickTimer);
        state.zoom.suppressClickTimer = null;
      }

      const controller = await import('../src/controller/viewer_controller.js');
      controller.openViewer();

      const overlay = dom.doc.getElementById('disagall-viewer-overlay');
      const stage = dom.doc.getElementById('disagall-stage');
      const wrapper = dom.doc.getElementById('disagall-img-wrapper');
      const mainImg = dom.doc.getElementById('disagall-main-img');
      assert.strictEqual(overlay.classList.contains('active'), true);

      // 6.1 Zoom in > 1.0, start drag on mainImg, move, release on stage -> synthetic click on stage must NOT close viewer
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      assert(state.zoom.scale > 1.0, 'Wheel zoom must increase scale > 1.0');

      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 100, clientY: 100, preventDefault() {} });
      assert.strictEqual(state.zoom.isDragging, true);
      dom.win.dispatchEvent({ type: 'mousemove', clientX: 160, clientY: 140 });
      dom.win.dispatchEvent({ type: 'mouseup', clientX: 160, clientY: 140 });
      assert.strictEqual(state.zoom.isDragging, false);

      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        true,
        'DEFECT-03: Drag release outside zoomed image (#disagall-stage click) must NOT close viewer'
      );

      // 6.2 Subsequent genuine click on #disagall-stage without dragging MUST close viewer
      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        false,
        'DEFECT-03: Genuine backdrop click after drag must still close viewer'
      );

      // 6.3 Reopen, zoom, drag, release on #disagall-img-wrapper -> must NOT close; then genuine wrapper click MUST close
      controller.openViewer();
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 50, clientY: 50, preventDefault() {} });
      dom.win.dispatchEvent({ type: 'mouseup', clientX: 20, clientY: 20 });
      wrapper.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        true,
        'DEFECT-03: Drag release on #disagall-img-wrapper must NOT close viewer'
      );

      wrapper.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        false,
        'DEFECT-03: Subsequent genuine click on #disagall-img-wrapper must close viewer'
      );

      // 6.4 Reopen, zoom, drag, release on mainImg itself (click target=mainImg) -> subsequent genuine stage click MUST still close
      controller.openViewer();
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 10, clientY: 10, preventDefault() {} });
      dom.win.dispatchEvent({ type: 'mouseup', clientX: 15, clientY: 15 });
      mainImg.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(overlay.classList.contains('active'), true);

      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        false,
        'DEFECT-03: Click on mainImg after drag must consume suppression so next backdrop click closes viewer'
      );

      // 6.5 Reopen, zoom, drag, release outside overlay (no click reaches overlay) -> after macrotask turn, backdrop click MUST close
      controller.openViewer();
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 10, clientY: 10, preventDefault() {} });
      dom.win.dispatchEvent({ type: 'mouseup', clientX: 9999, clientY: 9999 });
      await new Promise((resolve) => setTimeout(resolve, 10));
      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        false,
        'DEFECT-03: Suppression flag must auto-expire if mouseup occurred outside overlay without reaching backdrop click'
      );

      // 6.6 Non-left mouseup (e.button === 2) during left drag must NOT terminate drag or consume suppression early
      controller.openViewer();
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 20, clientY: 20, preventDefault() {} });
      dom.win.dispatchEvent({ type: 'mouseup', button: 2, clientX: 30, clientY: 30 });
      assert.strictEqual(state.zoom.isDragging, true, 'DEFECT-03: Right-click mouseup must not cancel left-click drag');
      await new Promise((resolve) => setTimeout(resolve, 10));
      dom.win.dispatchEvent({ type: 'mouseup', button: 0, clientX: 200, clientY: 200 });
      assert.strictEqual(state.zoom.isDragging, false);
      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        true,
        'DEFECT-03: Left-click drag release on stage after right-click interference must still suppress backdrop close'
      );
      controller.closeViewer();

      // 6.7 Keyboard navigate() during zoomed drag resets zoom while preserving drag-release suppression until mouseup
      controller.openViewer();
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 30, clientY: 30, preventDefault() {} });
      controller.navigate(1);
      assert.strictEqual(state.zoom.scale, 1.0, 'navigate() must reset zoom to 1.0');
      assert.strictEqual(state.zoom.isDragging, false);
      assert.strictEqual(state.zoom.pendingDragRelease, true);
      await new Promise((resolve) => setTimeout(resolve, 10));
      dom.win.dispatchEvent({ type: 'mouseup', button: 0, clientX: 250, clientY: 250 });
      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(
        overlay.classList.contains('active'),
        true,
        'DEFECT-03: Mouseup on stage after navigate() during drag must NOT close viewer'
      );
      stage.dispatchEvent({ type: 'click', bubbles: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(overlay.classList.contains('active'), false, 'Subsequent genuine stage click closes viewer');

      console.log('✅ Test 6: DEFECT-03 zoomed drag-release backdrop click suppression verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
    }
  }

  // Test 7 (DEFECT-04): Right-clicking lazy-loaded images must store resolved best URL
  // and open the exact target index even when Chrome context menu sends placeholder info.srcUrl
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);

    const img1 = dom.createElement('img');
    img1.src = 'https://nstatic.dcinside.com/dc/w/images/gallview_loading_ori.gif';
    img1.setAttribute('data-original', 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=401');

    const img2 = dom.createElement('img');
    img2.src = 'https://nstatic.dcinside.com/dc/w/images/gallview_loading_ori.gif';
    img2.setAttribute('data-original', 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=402');

    const img3 = dom.createElement('img');
    img3.src = 'https://nstatic.dcinside.com/dc/w/images/blank.gif';
    img3.setAttribute('data-src', 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=403&s=1');

    const commentBox = dom.createElement('div', '', ['comment_box']);
    const dcconImg = dom.createElement('img');
    dcconImg.src = 'https://dcimg5.dcinside.com/dccon.php?no=999';
    commentBox.appendChild(dcconImg);

    writeDiv.appendChild(img1);
    writeDiv.appendChild(img2);
    writeDiv.appendChild(img3);
    dom.body.appendChild(writeDiv);
    dom.body.appendChild(commentBox);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;

    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};
    global.Image = class {
      set src(v) {
        this._src = v;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    try {
      const { state } = await import('../src/state.js');
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.lastRightClickedImgSrc = null;
      state.zoom.scale = 1.0;

      const controller = await import('../src/controller/viewer_controller.js');
      controller.initViewerBase();

      // 7.1 Right-click 2nd lazy image (gallview_loading_ori.gif) -> openViewer() without srcUrl
      dom.doc.dispatchContextMenu(img2);
      assert.strictEqual(
        state.lastRightClickedImgSrc,
        'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=402',
        'DEFECT-04: contextmenu must store resolved getBestImgUrl() instead of placeholder target.src'
      );

      controller.openViewer();
      assert.strictEqual(
        state.currentIndex,
        1,
        'DEFECT-04: openViewer() after right-clicking 2nd lazy image must open index 1'
      );
      assert.strictEqual(state.elements.counterEl.textContent, '2 / 3');
      assert.strictEqual(
        state.elements.mainImgEl.src,
        'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=402'
      );
      controller.closeViewer();

      // 7.2 Right-click 3rd lazy image (blank.gif + data-src with &s=1) -> Chrome context menu sends placeholder srcUrl
      const placeholderSrc3 = img3.src;
      dom.doc.dispatchContextMenu(img3);
      assert.strictEqual(
        state.lastRightClickedImgSrc,
        'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=403'
      );

      controller.openViewer(placeholderSrc3);
      assert.strictEqual(
        state.currentIndex,
        2,
        'DEFECT-04: openViewer(placeholderSrc) from Chrome context menu must fall back to lastRightClickedImgSrc (index 2)'
      );
      assert.strictEqual(state.elements.counterEl.textContent, '3 / 3');
      assert.strictEqual(
        state.elements.mainImgEl.src,
        'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=403'
      );
      controller.closeViewer();

      // 7.3 Right-click excluded dccon / non-image clears lastRightClickedImgSrc and opens index 0
      dom.doc.dispatchContextMenu(dcconImg);
      assert.strictEqual(state.lastRightClickedImgSrc, null);
      controller.openViewer('https://nstatic.dcinside.com/dc/w/images/gallview_loading_ori.gif');
      assert.strictEqual(state.currentIndex, 0);
      controller.closeViewer();

      console.log('✅ Test 7: DEFECT-04 lazy-loaded contextmenu tracking & target index matching verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
    }
  }

  // Test 8 (REFACTOR-01): closeViewer() storage exception resilience, rAF lifecycle cancellation,
  // inactive zoom event guards, and duplicate setupZoomEvents() idempotency
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const img1 = dom.createElement('img');
    img1.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=test&no=501';
    writeDiv.appendChild(img1);
    dom.body.appendChild(writeDiv);
    dom.body.style.overflow = 'auto';

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;
    const origChrome = global.chrome;

    const rafQueue = new Map();
    const cancelledRafIds = [];
    let nextRafId = 100;

    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = (cb) => {
      const id = nextRafId++;
      rafQueue.set(id, cb);
      return id;
    };
    global.cancelAnimationFrame = (id) => {
      cancelledRafIds.push(id);
      rafQueue.delete(id);
    };
    global.Image = class {
      set src(v) {
        this._src = v;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };
    global.chrome = {
      storage: {
        sync: {
          set: () => {
            throw new Error('Extension context invalidated');
          },
        },
      },
    };

    try {
      const { state } = await import('../src/state.js');
      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.resizeRafId = null;
      state.zoom.scale = 1.0;
      state.zoom.panX = 0;
      state.zoom.panY = 0;
      state.zoom.isDragging = false;
      state.zoom.pendingDragRelease = false;
      state.zoom.transformRafId = null;

      const controller = await import('../src/controller/viewer_controller.js');
      const { setupZoomEvents } = await import('../src/ui/zoom_pan.js');
      controller.initViewerBase();
      controller.openViewer();

      const overlay = dom.doc.getElementById('disagall-viewer-overlay');
      const slider = dom.doc.getElementById('disagall-slider');
      const mainImg = dom.doc.getElementById('disagall-main-img');
      const infoBadge = dom.doc.getElementById('disagall-info-badge');
      assert.strictEqual(overlay.classList.contains('active'), true);
      assert.strictEqual(dom.body.style.overflow, 'hidden');

      // (a) Trigger debounced padding save so closeViewer() flushes into throwing chrome.storage.sync.set
      slider.dispatchEvent({ type: 'input', target: { value: '48' } });

      // (b) Queue both resize rAF and zoom transform rAF before closing
      dom.win.dispatchEvent({ type: 'resize' });
      assert.notStrictEqual(state.resizeRafId, null, 'REFACTOR-01: resize must register state.resizeRafId');

      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      assert.notStrictEqual(state.zoom.transformRafId, null, 'REFACTOR-01: zoom must register state.zoom.transformRafId');
      assert(state.zoom.scale > 1.0);

      const capturedResizeRafId = state.resizeRafId;
      const capturedTransformRafId = state.zoom.transformRafId;
      const staleCallbacks = Array.from(rafQueue.values());

      // closeViewer() must survive storage exception, remove .active, restore overflow, and cancel both rAFs
      controller.closeViewer();
      assert.strictEqual(overlay.classList.contains('active'), false, 'REFACTOR-01: .active must be removed despite storage error');
      assert.strictEqual(dom.body.style.overflow, 'auto', 'REFACTOR-01: body.style.overflow must be restored despite storage error');
      assert.strictEqual(state.resizeRafId, null, 'REFACTOR-01: closeViewer() must cancel and null state.resizeRafId');
      assert.strictEqual(state.zoom.transformRafId, null, 'REFACTOR-01: closeViewer() must cancel and null state.zoom.transformRafId');
      assert(cancelledRafIds.includes(capturedResizeRafId), 'REFACTOR-01: cancelAnimationFrame must be called for resizeRafId');
      assert(cancelledRafIds.includes(capturedTransformRafId), 'REFACTOR-01: cancelAnimationFrame must be called for transformRafId');
      assert.strictEqual(rafQueue.size, 0, 'REFACTOR-01: no pending rAF may survive closeViewer()');
      assert.strictEqual(mainImg.style.transform, 'translate(0px, 0px) scale(1)');
      assert.strictEqual(mainImg.style.cursor, 'default');

      // Invoking stale captured rAF callbacks on closed DOM must be a complete no-op
      mainImg.style.transform = 'sentinel-transform';
      mainImg.style.maxWidth = 'sentinel-width';
      infoBadge.textContent = 'sentinel-badge';
      staleCallbacks.forEach((cb) => cb());
      assert.strictEqual(mainImg.style.transform, 'sentinel-transform', 'REFACTOR-01: stale zoom rAF must not touch closed DOM');
      assert.strictEqual(mainImg.style.maxWidth, 'sentinel-width', 'REFACTOR-01: stale resize rAF must not touch closed DOM');
      assert.strictEqual(infoBadge.textContent, 'sentinel-badge', 'REFACTOR-01: stale rAF must not mutate badge on closed DOM');

      // (c) setupZoomEvents must ignore wheel/mousedown/dblclick while !active
      state.zoom.scale = 1.0;
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      assert.strictEqual(state.zoom.scale, 1.0, 'REFACTOR-01: wheel must be ignored when overlay is inactive');
      assert.strictEqual(rafQueue.size, 0);

      mainImg.dispatchEvent({ type: 'dblclick', preventDefault() {} });
      assert.strictEqual(state.zoom.scale, 1.0, 'REFACTOR-01: dblclick must be ignored when overlay is inactive');
      assert.strictEqual(rafQueue.size, 0);

      state.zoom.scale = 2.0;
      mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 10, clientY: 10, preventDefault() {} });
      assert.strictEqual(state.zoom.isDragging, false, 'REFACTOR-01: mousedown must be ignored when overlay is inactive');
      state.zoom.scale = 1.0;

      // Duplicate setupZoomEvents(mainImg) must be guarded by WeakSet (wheel delta applies only once)
      setupZoomEvents(null);
      setupZoomEvents(mainImg);
      setupZoomEvents(mainImg);
      overlay.classList.add('active');
      mainImg.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      assert.strictEqual(
        Number(state.zoom.scale.toFixed(2)),
        1.15,
        'REFACTOR-01: duplicate setupZoomEvents(mainImg) must not attach duplicate wheel listeners'
      );
      controller.closeViewer();

      console.log('✅ Test 8: REFACTOR-01 storage fault tolerance, rAF cleanup, !active guard & WeakSet idempotency verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
      global.chrome = origChrome;
    }
  }

  // Test 9 (REFACTOR-03): Zoom upper clamp (5.0x), pan drag transform/cursor/badge with flushing rAF,
  // landscape image fitting, showViewerToast/dismissViewerToast timer race, and image_parser relative/javascript: URLs
  {
    const dom = createMockDom();
    const writeDiv = dom.createElement('div', '', ['write_div']);
    const landscapeImg = dom.createElement('img');
    landscapeImg.src = '/viewimage.php?id=hit&no=1&s=thumb';
    landscapeImg.alt = 'Landscape Photo';
    writeDiv.appendChild(landscapeImg);

    const jsAnchor = dom.createElement('a');
    jsAnchor.href = 'javascript:void(0)';
    const jsAnchorImg = dom.createElement('img');
    jsAnchorImg.src = 'https://nstatic.dcinside.com/dc/w/images/gallview_loading_ori.gif';
    jsAnchor.appendChild(jsAnchorImg);
    writeDiv.appendChild(jsAnchor);

    const jsDirectAnchor = dom.createElement('a');
    jsDirectAnchor.href = 'javascript:alert(1)';
    const jsDirectImg = dom.createElement('img');
    jsDirectImg.src = 'javascript:alert(2)';
    jsDirectAnchor.appendChild(jsDirectImg);
    writeDiv.appendChild(jsDirectAnchor);

    dom.body.appendChild(writeDiv);

    const origWindow = global.window;
    const origDocument = global.document;
    const origImage = global.Image;
    const origEvent = global.Event;
    const origRAF = global.requestAnimationFrame;
    const origCAF = global.cancelAnimationFrame;
    const origSetTimeout = global.setTimeout;
    const origClearTimeout = global.clearTimeout;

    const rafQueue = new Map();
    let nextRafId = 1;
    const flushRaf = () => {
      while (rafQueue.size > 0) {
        const entries = Array.from(rafQueue.entries());
        rafQueue.clear();
        for (const [, cb] of entries) {
          cb(0);
        }
      }
    };

    let fakeNow = 0;
    let nextTimerId = 1;
    const fakeTimers = new Map();
    const advanceTimersBy = (ms) => {
      const targetTime = fakeNow + ms;
      while (true) {
        let nextEntry = null;
        for (const entry of fakeTimers.values()) {
          if (entry.fireAt <= targetTime && (!nextEntry || entry.fireAt < nextEntry.fireAt || (entry.fireAt === nextEntry.fireAt && entry.id < nextEntry.id))) {
            nextEntry = entry;
          }
        }
        if (!nextEntry) break;
        fakeTimers.delete(nextEntry.id);
        fakeNow = nextEntry.fireAt;
        nextEntry.cb();
      }
      fakeNow = targetTime;
    };

    global.window = dom.win;
    global.document = dom.doc;
    global.Event = class { constructor(type) { this.type = type; } };
    global.requestAnimationFrame = (cb) => {
      const id = nextRafId++;
      rafQueue.set(id, cb);
      return id;
    };
    global.cancelAnimationFrame = (id) => {
      rafQueue.delete(id);
    };
    global.setTimeout = (cb, delay = 0) => {
      const id = nextTimerId++;
      fakeTimers.set(id, { id, cb, fireAt: fakeNow + Math.max(0, Number(delay) || 0) });
      return id;
    };
    global.clearTimeout = (id) => {
      fakeTimers.delete(id);
    };
    global.Image = class {
      set src(v) {
        this._src = v;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    try {
      const { CONFIG } = await import('../src/config.js');
      const { state } = await import('../src/state.js');
      const imageParser = await import('../src/parser/image_parser.js');
      const overlayUi = await import('../src/ui/overlay.js');
      const controller = await import('../src/controller/viewer_controller.js');

      Object.keys(state.elements).forEach((k) => { state.elements[k] = null; });
      state.previousBodyOverflow = '';
      state.postImages = [];
      state.currentIndex = 0;
      state.currentPadding = CONFIG.DEFAULT_PADDING;
      state.isFullscreenMode = false;
      state.isUiHidden = false;
      state.resizeRafId = null;
      state.toastTimer = null;
      state.zoom.scale = 1.0;
      state.zoom.panX = 0;
      state.zoom.panY = 0;
      state.zoom.isDragging = false;
      state.zoom.pendingDragRelease = false;
      state.zoom.transformRafId = null;
      state.zoom.suppressNextBackdropClick = false;
      state.zoom.suppressClickTimer = null;

      // (a) image_parser.js relative URL resolution & javascript: anchor rejection
      assert.strictEqual(
        imageParser.getCleanOriginalUrl('/viewimage.php?id=hit&no=1&s=thumb'),
        'https://gall.dcinside.com/viewimage.php?id=hit&no=1',
        'REFACTOR-03: relative URL must resolve against origin and strip thumb query params'
      );
      assert.strictEqual(
        imageParser.getBestImgUrl(landscapeImg),
        'https://gall.dcinside.com/viewimage.php?id=hit&no=1'
      );
      assert.strictEqual(imageParser.isPostBodyImage(landscapeImg), true);

      assert.strictEqual(imageParser.getCleanOriginalUrl('javascript:void(0)'), '');
      assert.strictEqual(imageParser.isPostBodyImage(jsAnchorImg), false);
      assert.strictEqual(imageParser.getBestImgUrl(jsDirectImg), '');
      assert.strictEqual(imageParser.isPostBodyImage(jsDirectImg), false);

      const extracted = imageParser.extractPostImages(dom.doc);
      assert.strictEqual(extracted.length, 1);
      assert.strictEqual(extracted[0].url, 'https://gall.dcinside.com/viewimage.php?id=hit&no=1');

      // (b) Landscape image fitting (1600x900)
      controller.createOverlay();
      state.elements.mainImgEl.naturalWidth = 1600;
      state.elements.mainImgEl.naturalHeight = 900;
      controller.openViewer();
      flushRaf();

      const { mainImgEl, infoBadgeEl, toastEl } = state.elements;
      assert.strictEqual(mainImgEl.classList.contains('landscape'), true);
      assert.strictEqual(mainImgEl.classList.contains('portrait'), false);
      assert.strictEqual(infoBadgeEl.textContent, '가로 사진 (1600x900)');

      // (c) Wheel zoom upper clamp (5.0x) & pan drag transform/cursor/badge via flushing rAF
      for (let i = 0; i < 35; i++) {
        mainImgEl.dispatchEvent({ type: 'wheel', deltaY: -120, preventDefault() {} });
      }
      flushRaf();
      assert.strictEqual(state.zoom.scale, 5.0);
      assert.strictEqual(mainImgEl.style.cursor, 'grab');
      assert.strictEqual(mainImgEl.style.transform, 'translate(0px, 0px) scale(5.00)');
      assert(infoBadgeEl.textContent.startsWith('🔍 확대: 500%'));

      mainImgEl.dispatchEvent({ type: 'mousedown', button: 0, clientX: 100, clientY: 100, preventDefault() {} });
      flushRaf();
      assert.strictEqual(state.zoom.isDragging, true);
      assert.strictEqual(mainImgEl.style.cursor, 'grabbing');

      dom.win.dispatchEvent({ type: 'mousemove', clientX: 160, clientY: 140 });
      flushRaf();
      assert.strictEqual(state.zoom.panX, 60);
      assert.strictEqual(state.zoom.panY, 40);
      assert.strictEqual(mainImgEl.style.transform, 'translate(60px, 40px) scale(5.00)');
      assert.strictEqual(mainImgEl.style.cursor, 'grabbing');

      dom.win.dispatchEvent({ type: 'mouseup', button: 0, clientX: 160, clientY: 140 });
      flushRaf();
      assert.strictEqual(state.zoom.isDragging, false);
      assert.strictEqual(mainImgEl.style.cursor, 'grab');
      assert.strictEqual(mainImgEl.style.transform, 'translate(60px, 40px) scale(5.00)');
      assert(infoBadgeEl.textContent.startsWith('🔍 확대: 500%'));

      // (d) showViewerToast auto-hide after CONFIG.TOAST_DURATION (1800ms) & dismissViewerToast race invalidation
      assert.strictEqual(CONFIG.TOAST_DURATION, 1800);
      overlayUi.showViewerToast('첫 번째 토스트');
      assert.strictEqual(toastEl.textContent, '첫 번째 토스트');
      assert.strictEqual(toastEl.classList.contains('show'), true);
      const staleToastTimer = Array.from(fakeTimers.values()).find((t) => t.fireAt === fakeNow + CONFIG.TOAST_DURATION);
      assert(staleToastTimer, 'Toast timer must be scheduled for CONFIG.TOAST_DURATION (1800ms)');

      advanceTimersBy(CONFIG.TOAST_DURATION - 1);
      assert.strictEqual(toastEl.classList.contains('show'), true, 'Toast must stay visible before 1800ms elapses');
      advanceTimersBy(1);
      assert.strictEqual(toastEl.classList.contains('show'), false, 'Toast must auto-hide after 1800ms');
      assert.strictEqual(state.toastTimer, null);

      overlayUi.showViewerToast('경합 토스트');
      const raceTimerEntry = Array.from(fakeTimers.values()).find((t) => t.fireAt === fakeNow + CONFIG.TOAST_DURATION);
      assert(raceTimerEntry);
      overlayUi.dismissViewerToast();
      assert.strictEqual(toastEl.classList.contains('show'), false);
      assert.strictEqual(state.toastTimer, null);

      overlayUi.showViewerToast('새 토스트');
      assert.strictEqual(toastEl.classList.contains('show'), true);
      assert.strictEqual(toastEl.textContent, '새 토스트');
      // Even if a stale pre-dismiss callback executes out-of-order, toastSeq invalidation must keep the new toast visible
      raceTimerEntry.cb();
      assert.strictEqual(toastEl.classList.contains('show'), true, 'dismissViewerToast must invalidate stale toast callbacks');
      assert.notStrictEqual(state.toastTimer, null);

      advanceTimersBy(CONFIG.TOAST_DURATION);
      assert.strictEqual(toastEl.classList.contains('show'), false);
      assert.strictEqual(state.toastTimer, null);

      controller.closeViewer();
      flushRaf();
      advanceTimersBy(0);

      console.log('✅ Test 9: REFACTOR-03 zoom clamp/pan rAF, landscape fit, toast timer race & relative/javascript: URLs verified');
    } finally {
      global.window = origWindow;
      global.document = origDocument;
      global.Image = origImage;
      global.Event = origEvent;
      global.requestAnimationFrame = origRAF;
      global.cancelAnimationFrame = origCAF;
      global.setTimeout = origSetTimeout;
      global.clearTimeout = origClearTimeout;
    }
  }

  console.log('\n🎉 ALL CORE VIEWER TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Core viewer test failed:', err);
  process.exit(1);
});
