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
        (elListeners[evObj.type] || []).forEach((fn) => fn(evObj));
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
  };

  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    location: { protocol: 'https:', origin: 'https://gall.dcinside.com', href: 'https://gall.dcinside.com/board/view/?id=test&no=1' },
    addEventListener: (ev, fn) => {
      if (!winListeners[ev]) winListeners[ev] = [];
      winListeners[ev].push(fn);
    },
    dispatchEvent: () => {},
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

    let openCount = 0;
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
    const origSetAttr = mainImg.style;
    let srcWrites = 0;
    const origSrcDesc = Object.getOwnPropertyDescriptor(mainImg, 'src') || {
      value: mainImg.src,
      writable: true,
      configurable: true,
    };
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

  console.log('\n🎉 ALL CORE VIEWER TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Core viewer test failed:', err);
  process.exit(1);
});
