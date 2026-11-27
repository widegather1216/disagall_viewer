// End-to-End Integration Tests for viewer-immersion (Actual built content.js, content.css, popup.js, popup.html, test_page.html)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

const { createFakeTimerEnv } = require('./helpers/fake_timer_env');

function createDomEnvironment(initialSyncData = { autoHideUi: true, defaultPadding: 24 }) {
  const syncStore = { ...initialSyncData };
  const storageListeners = [];
  const runtimeListeners = [];
  const windowListeners = {};
  const documentListeners = {};
  const allElements = [];

  function makeClassList(el) {
    const set = new Set();
    return {
      add: (...names) => names.forEach((n) => set.add(n)),
      remove: (...names) => names.forEach((n) => set.delete(n)),
      toggle: (name, force) => {
        if (force === undefined) {
          if (set.has(name)) { set.delete(name); return false; }
          set.add(name); return true;
        }
        if (force) set.add(name); else set.delete(name);
        return Boolean(force);
      },
      contains: (name) => set.has(name),
      toArray: () => Array.from(set),
    };
  }

  function createElement(tagName, id = '', className = '') {
    const listeners = {};
    const attrs = {};
    const el = {
      tagName: tagName.toUpperCase(),
      id,
      className,
      style: {},
      dataset: {},
      children: [],
      parentNode: null,
      textContent: '',
      _innerHTML: '',
      value: '24',
      checked: true,
      src: '',
      alt: '',
      naturalWidth: 1600,
      naturalHeight: 1000,
      offsetHeight: 50,
      classList: makeClassList(),
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      setAttribute: (k, v) => { attrs[k] = String(v); },
      hasAttribute: (k) => k in attrs,
      appendChild: (child) => {
        child.parentNode = el;
        el.children.push(child);
        return child;
      },
      remove: () => {
        if (el.parentNode) {
          el.parentNode.children = el.parentNode.children.filter((c) => c !== el);
          el.parentNode = null;
        }
      },
      addEventListener: (ev, fn) => {
        if (!listeners[ev]) listeners[ev] = [];
        listeners[ev].push(fn);
      },
      removeEventListener: (ev, fn) => {
        if (listeners[ev]) listeners[ev] = listeners[ev].filter((f) => f !== fn);
      },
      dispatchEvent: (evObj) => {
        const type = typeof evObj === 'string' ? evObj : evObj.type;
        const payload = typeof evObj === 'string' ? { type } : evObj;
        const event = { target: el, preventDefault() {}, stopPropagation() {}, ...payload };
        (listeners[type] || []).forEach((fn) => fn(event));
      },
      closest: () => null,
      matches: () => false,
      contains: (other) => {
        if (other === el) return true;
        return el.children.some((c) => c.contains && c.contains(other));
      },
      querySelector: (sel) => findBySelector(el, sel)[0] || null,
      querySelectorAll: (sel) => findBySelector(el, sel),
      requestFullscreen: () => {
        doc.fullscreenElement = el;
        return Promise.resolve();
      },
    };
    if (className) {
      className.split(/\s+/).filter(Boolean).forEach((c) => el.classList.add(c));
    }
    allElements.push(el);
    return el;
  }

  function matchesSingleSelector(el, sel) {
    if (sel.startsWith('#')) return el.id === sel.slice(1);
    if (sel.startsWith('.')) return el.classList.contains(sel.slice(1));
    if (sel === 'img') return el.tagName === 'IMG';
    if (sel === 'dialog[open]') return el.tagName === 'DIALOG' && el.hasAttribute('open');
    if (sel === '[role="dialog"][aria-modal="true"]') {
      return el.getAttribute('role') === 'dialog' && el.getAttribute('aria-modal') === 'true';
    }
    return false;
  }

  function findBySelector(root, selector) {
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
    const out = [];
    function walk(node) {
      for (const child of node.children) {
        if (parts.some((p) => {
          const tokens = p.split(/\s+/);
          return matchesSingleSelector(child, tokens[tokens.length - 1]);
        })) {
          out.push(child);
        }
        walk(child);
      }
    }
    walk(root);
    return out;
  }

  const body = createElement('body');
  const writeDiv = createElement('div', '', 'write_div');
  const img1 = createElement('img');
  img1.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
  img1.alt = 'Sample 1';
  img1.closest = (sel) => (sel.includes('.write_div') ? writeDiv : null);
  const img2 = createElement('img');
  img2.src = 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&q=80';
  img2.alt = 'Sample 2';
  img2.closest = (sel) => (sel.includes('.write_div') ? writeDiv : null);
  writeDiv.appendChild(img1);
  writeDiv.appendChild(img2);
  body.appendChild(writeDiv);

  const doc = {
    readyState: 'complete',
    body,
    fullscreenElement: null,
    createElement: (tag) => createElement(tag),
    getElementById: (id) => {
      function find(node) {
        if (node.id === id) return node;
        for (const c of node.children) {
          const found = find(c);
          if (found) return found;
        }
        return null;
      }
      return find(body);
    },
    querySelector: (sel) => findBySelector(body, sel)[0] || null,
    querySelectorAll: (sel) => findBySelector(body, sel),
    addEventListener: (ev, fn) => {
      if (!documentListeners[ev]) documentListeners[ev] = [];
      documentListeners[ev].push(fn);
    },
    dispatchEvent: (evObj) => {
      const type = typeof evObj === 'string' ? evObj : evObj.type;
      const payload = typeof evObj === 'string' ? { type } : evObj;
      const event = { target: doc, preventDefault() {}, stopPropagation() {}, ...payload };
      (documentListeners[type] || []).forEach((fn) => fn(event));
    },
    exitFullscreen: () => {
      doc.fullscreenElement = null;
      return Promise.resolve();
    },
  };

  // Patch overlay innerHTML setter so buildOverlayHtml() creates real queryable child nodes
  const origCreateElement = doc.createElement;
  doc.createElement = (tag) => {
    const node = origCreateElement(tag);
    Object.defineProperty(node, 'innerHTML', {
      get: () => node._innerHTML,
      set: (html) => {
        node._innerHTML = html;
        if (html.includes('disagall-header')) {
          const header = createElement('div', '', 'disagall-header');
          const counter = createElement('div', 'disagall-counter', 'disagall-counter');
          const infoBadge = createElement('div', 'disagall-info-badge', 'disagall-info-badge');
          const slider = createElement('input', 'disagall-slider', 'disagall-slider');
          const sliderVal = createElement('span', 'disagall-slider-val', 'disagall-padding-val');
          const recBtn = createElement('button', 'disagall-btn-recommend', 'disagall-btn disagall-btn-recommend');
          const fullscreenBtn = createElement('button', 'disagall-btn-fullscreen', 'disagall-btn disagall-btn-fullscreen');
          const fullscreenLabel = createElement('span', '', 'disagall-fullscreen-label');
          fullscreenLabel.textContent = '전체화면';
          fullscreenBtn.appendChild(fullscreenLabel);
          fullscreenBtn.querySelector = (sel) => (sel === 'span' ? fullscreenLabel : null);
          const closeBtn = createElement('button', 'disagall-close-btn', 'disagall-btn disagall-btn-close');
          header.appendChild(counter);
          header.appendChild(infoBadge);
          header.appendChild(slider);
          header.appendChild(sliderVal);
          header.appendChild(recBtn);
          header.appendChild(fullscreenBtn);
          header.appendChild(closeBtn);

          const stage = createElement('div', 'disagall-stage', 'disagall-stage');
          const prevBtn = createElement('div', 'disagall-prev-btn', 'disagall-nav-btn disagall-nav-btn-prev');
          const loader = createElement('div', 'disagall-loader', 'disagall-loader');
          const wrapper = createElement('div', 'disagall-img-wrapper', 'disagall-img-wrapper');
          const mainImg = createElement('img', 'disagall-main-img', 'disagall-img');
          const nextBtn = createElement('div', 'disagall-next-btn', 'disagall-nav-btn disagall-nav-btn-next');
          wrapper.appendChild(mainImg);
          stage.appendChild(prevBtn);
          stage.appendChild(loader);
          stage.appendChild(wrapper);
          stage.appendChild(nextBtn);

          const toast = createElement('div', 'disagall-toast', 'disagall-toast');
          const footer = createElement('div', '', 'disagall-footer');

          node.appendChild(header);
          node.appendChild(stage);
          node.appendChild(toast);
          node.appendChild(footer);
        }
      },
    });
    return node;
  };

  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    location: { origin: 'http://127.0.0.1:18080', protocol: 'http:', href: 'http://127.0.0.1:18080/test_page.html' },
    addEventListener: (ev, fn) => {
      if (!windowListeners[ev]) windowListeners[ev] = [];
      windowListeners[ev].push(fn);
    },
    removeEventListener: (ev, fn) => {
      if (windowListeners[ev]) windowListeners[ev] = windowListeners[ev].filter((f) => f !== fn);
    },
    dispatchEvent: (evObj) => {
      const type = typeof evObj === 'string' ? evObj : evObj.type;
      const payload = typeof evObj === 'string' ? { type } : evObj;
      const event = { preventDefault() {}, stopPropagation() {}, ...payload };
      (windowListeners[type] || []).forEach((fn) => fn(event));
    },
    postMessage: (data, targetOrigin) => {
      (windowListeners['message'] || []).forEach((fn) => fn({ origin: win.location.origin, data }));
    },
  };

  const chrome = {
    storage: {
      sync: {
        get(keys, cb) {
          const out = {};
          if (Array.isArray(keys)) {
            keys.forEach((k) => { if (k in syncStore) out[k] = syncStore[k]; });
          } else if (keys && typeof keys === 'object') {
            for (const [k, def] of Object.entries(keys)) {
              out[k] = k in syncStore ? syncStore[k] : def;
            }
          }
          cb(out);
        },
        set(items, cb) {
          const changes = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: syncStore[k], newValue: v };
            syncStore[k] = v;
          }
          if (typeof cb === 'function') cb();
          storageListeners.forEach((fn) => fn(changes, 'sync'));
        },
      },
      onChanged: {
        addListener: (fn) => storageListeners.push(fn),
      },
    },
    runtime: {
      onMessage: {
        addListener: (fn) => runtimeListeners.push(fn),
      },
    },
  };

  return { doc, win, chrome, syncStore };
}

function loadContentBundle(env, timers, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, 'content.js'), 'utf8');
  class MockImage {
    constructor() {
      this._src = '';
      this.onload = null;
      this.onerror = null;
    }
    set src(val) {
      this._src = val;
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }
    get src() { return this._src; }
  }

  const sandbox = {
    window: env.win,
    document: env.doc,
    chrome: env.chrome,
    Image: MockImage,
    Event: function Event(type) { this.type = type; },
    sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    setTimeout: timers.setTimeoutFn,
    clearTimeout: timers.clearTimeoutFn,
    setInterval: timers.setIntervalFn,
    clearInterval: timers.clearIntervalFn,
    requestAnimationFrame: timers.requestAnimationFrameFn,
    cancelAnimationFrame: timers.cancelAnimationFrameFn,
    alert: () => {},
    console,
    URL,
    ...extraGlobals,
  };
  sandbox.window.document = env.doc;
  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

async function run() {
  console.log('🧪 Starting Viewer Immersion Built-Bundle E2E Tests (Happy Path + Boundary & Negative)...\n');

  // Verify test_page.html and content.css exist and wire content.js/content.css
  const testPageHtml = fs.readFileSync(path.join(ROOT, 'test_page.html'), 'utf8');
  assert(testPageHtml.includes('<link rel="stylesheet" href="content.css">'), 'test_page.html must link content.css');
  assert(testPageHtml.includes('<script src="content.js"></script>'), 'test_page.html must load content.js');
  assert(testPageHtml.includes("action: 'disagall_test_open'"), 'test_page.html must trigger disagall_test_open');

  // --- TC-HP-01: 2.5s idle fadeout & mousemove restore on built content.js ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    assert(overlay && overlay.classList.contains('active'), 'TC-HP-01: Viewer overlay must activate on test open');
    assert.strictEqual(env.doc.getElementById('disagall-counter').textContent, '1 / 2');

    // Before 2500ms (2400ms) -> still visible
    timers.advanceBy(2400);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-HP-01: Must remain visible before 2500ms');

    // At 2500ms -> .disagall-idle applied
    timers.advanceBy(100);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true, 'TC-HP-01: .disagall-idle must apply at 2500ms');

    // Mousemove -> immediately removes .disagall-idle
    overlay.dispatchEvent({ type: 'mousemove' });
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-HP-01: mousemove must immediately remove .disagall-idle');
    console.log('✅ TC-HP-01 PASS: Built content.js 2500ms idle auto-hide & mousemove immediate restore verified');
  }

  // --- TC-HP-02: H/h manual toggle & ADR-04 arrow key persistence ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');

    // Press 'h' while hovering header -> immediate .disagall-ui-hidden, synthetic mouseleave must NOT cancel
    header.dispatchEvent({ type: 'mouseenter' });
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-02: h must immediately add .disagall-ui-hidden');
    header.dispatchEvent({ type: 'mouseleave' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-02 (DEFECT-02): synthetic header mouseleave must keep .disagall-ui-hidden');
    assert.strictEqual(timers.timers.size, 0, 'TC-HP-02 (DEFECT-02): synthetic header mouseleave must not start idle timer');

    // ADR-04: ArrowRight & ArrowLeft navigate images while preserving .disagall-ui-hidden
    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowRight' });
    assert.strictEqual(env.doc.getElementById('disagall-counter').textContent, '2 / 2', 'TC-HP-02: ArrowRight must navigate to photo 2');
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-02 (ADR-04): ArrowRight must keep .disagall-ui-hidden');

    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowLeft' });
    assert.strictEqual(env.doc.getElementById('disagall-counter').textContent, '1 / 2', 'TC-HP-02: ArrowLeft must navigate back to photo 1');
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-02 (ADR-04): ArrowLeft must keep .disagall-ui-hidden');

    // Press 'H' -> immediate restore
    env.win.dispatchEvent({ type: 'keydown', key: 'H' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-HP-02: H must restore UI visibility');
    console.log('✅ TC-HP-02 PASS: Built content.js H/h manual toggle & ADR-04 arrow-key hidden persistence verified');
  }

  // --- TC-HP-03: F/f Fullscreen API toggle ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');

    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(env.doc.fullscreenElement, overlay, 'TC-HP-03: f must enter fullscreen on overlay');

    env.win.dispatchEvent({ type: 'keydown', key: 'F' });
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-HP-03: F must exit fullscreen');
    console.log('✅ TC-HP-03 PASS: Built content.js F/f Fullscreen API enter & exit verified');
  }

  // --- TC-HP-04: Popup toggle -> chrome.storage.sync -> content.js autoHideUi=false ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    // Simulate popup.js interacting with shared chrome.storage.sync (autoHideUi + padding-slider)
    const popup = require('../popup.js');
    let toggleChecked = true;
    const toggleListeners = [];
    const sliderListeners = {};
    const mockPopupSlider = {
      value: '24',
      addEventListener: (ev, fn) => {
        if (!sliderListeners[ev]) sliderListeners[ev] = [];
        sliderListeners[ev].push(fn);
      },
    };
    const mockPopupSliderVal = { textContent: '24px' };
    const mockPopupDoc = {
      getElementById(id) {
        if (id === 'padding-slider') return mockPopupSlider;
        if (id === 'padding-val') return mockPopupSliderVal;
        if (id === 'auto-hide-ui-toggle') {
          return {
            checked: toggleChecked,
            addEventListener: (ev, fn) => { if (ev === 'change') toggleListeners.push(fn); },
          };
        }
        return null;
      },
    };
    popup.initPopup(mockPopupDoc, env.chrome.storage.sync);

    // Open viewer initially (autoHideUi=true, defaultPadding=24)
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const viewerSlider = env.doc.getElementById('disagall-slider');
    const viewerSliderVal = env.doc.getElementById('disagall-slider-val');
    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '662px', 'TC-HP-04: Initial 24px padding fits 662px');

    // User changes padding in popup -> live onChanged updates viewer slider and refits image (800-52-38-120 = 590px)
    mockPopupSlider.value = '60';
    (sliderListeners.change || []).forEach((fn) => fn({ target: { value: '60' } }));
    assert.strictEqual(env.syncStore.defaultPadding, 60, 'TC-HP-04: Popup slider change must persist defaultPadding=60');
    assert.strictEqual(Number(viewerSlider.value), 60, 'TC-HP-04 (DEFECT-03): Live onChanged must update viewer slider value');
    assert.strictEqual(viewerSliderVal.textContent, '60px', 'TC-HP-04 (DEFECT-03): Live onChanged must update viewer slider label');
    assert.strictEqual(mainImg.style.maxHeight, '590px', 'TC-HP-04 (DEFECT-03): Live onChanged must refit active viewer image to 60px padding');

    // User unchecks immersion toggle in popup
    toggleChecked = false;
    toggleListeners.forEach((fn) => fn({ target: { checked: false } }));
    assert.strictEqual(env.syncStore.autoHideUi, false, 'TC-HP-04: Popup toggle must persist autoHideUi=false');

    // Even after >2500ms idle, UI must NOT auto-hide when autoHideUi === false
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-HP-04: autoHideUi=false must prevent idle auto-hide');

    // User re-enables toggle in popup -> live storage sync enables 2500ms auto-hide again
    toggleChecked = true;
    toggleListeners.forEach((fn) => fn({ target: { checked: true } }));
    assert.strictEqual(env.syncStore.autoHideUi, true, 'TC-HP-04: Popup toggle must persist autoHideUi=true');
    timers.advanceBy(2500);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true, 'TC-HP-04: Re-enabling autoHideUi must resume 2500ms auto-hide');
    console.log('✅ TC-HP-04 PASS: Popup toggle & padding live sync, chrome.storage.sync persistence & content.js refit verified');
  }

  // --- TC-BD-01: Padding slider drag & header hover defer auto-hide; resumes 2500ms after release/leave ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const slider = env.doc.getElementById('disagall-slider');
    const sliderVal = env.doc.getElementById('disagall-slider-val');

    // 1. Slider interaction deferral (mousedown + input -> 3000ms -> still visible)
    slider.dispatchEvent({ type: 'mousedown' });
    slider.value = '48';
    slider.dispatchEvent({ type: 'input', target: slider });
    assert.strictEqual(sliderVal.textContent, '48px', 'TC-BD-01: Slider input must update padding display');
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-BD-01: Must NOT auto-hide while slider is being dragged');

    // Release slider -> remains visible before 2500ms, hides after 2500ms
    slider.dispatchEvent({ type: 'mouseup' });
    timers.advanceBy(2400);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-BD-01: Must remain visible before 2500ms after slider release');
    timers.advanceBy(100);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true, 'TC-BD-01: Must auto-hide 2500ms after slider release');

    // Restore via mousemove
    overlay.dispatchEvent({ type: 'mousemove' });
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false);

    // 2. Header hover deferral (mouseenter -> 3000ms -> still visible -> mouseleave -> 2500ms -> hidden)
    header.dispatchEvent({ type: 'mouseenter' });
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-BD-01: Must NOT auto-hide while hovering header');

    header.dispatchEvent({ type: 'mouseleave' });
    timers.advanceBy(2400);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-BD-01: Must remain visible before 2500ms after header mouseleave');
    timers.advanceBy(100);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true, 'TC-BD-01: Must auto-hide 2500ms after leaving header');
    console.log('✅ TC-BD-01 PASS: Built content.js slider drag & header hover deferral + 2500ms post-release hide verified');
  }

  // --- TC-BD-02: Zoom > 1.0 + Pan drag (isDragging) defers auto-hide & preserves grabbing cursor ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const cssText = fs.readFileSync(path.join(ROOT, 'content.css'), 'utf8');
    assert(cssText.includes(':not([style*="grabbing"])'), 'TC-BD-02: content.css must keep :not([style*="grabbing"]) cursor exemption');

    // Zoom in via wheel (deltaY < 0 -> scale > 1.0), then start pan drag (button: 0)
    mainImg.dispatchEvent({ type: 'wheel', deltaY: -120 });
    timers.advanceBy(20); // flush requestAnimationFrame
    assert.strictEqual(mainImg.style.cursor, 'grab', 'TC-BD-02: Zoomed image must show grab cursor before drag');

    mainImg.dispatchEvent({ type: 'mousedown', button: 0, clientX: 100, clientY: 100 });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.cursor, 'grabbing', 'TC-BD-02: Panning zoomed image must set grabbing cursor');

    // Wait > 2500ms while still holding mouse down (isDragging === true)
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-BD-02: Must NOT auto-hide while pan dragging');
    assert.strictEqual(mainImg.style.cursor, 'grabbing', 'TC-BD-02: grabbing cursor must persist during pan drag');

    // End pan drag -> cursor returns to grab and auto-hide resumes within 2500ms
    env.win.dispatchEvent({ type: 'mouseup' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.cursor, 'grab', 'TC-BD-02: Cursor must return to grab after mouseup');
    timers.advanceBy(2500);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true, 'TC-BD-02: Auto-hide must resume after pan drag ends');
    console.log('✅ TC-BD-02 PASS: Zoom > 1.0 pan drag deferral & grabbing cursor preservation verified');
  }

  // --- TC-NG-01: Inactive (!active) mousemove/H/F safety & editable/modifier/modal negative guards ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    let fullscreenReqCount = 0;
    const origCreateEl = env.doc.createElement;
    env.doc.createElement = (tag) => {
      const node = origCreateEl(tag);
      const origReq = node.requestFullscreen;
      node.requestFullscreen = () => {
        fullscreenReqCount++;
        return origReq();
      };
      return node;
    };

    // 1. Before viewer ever opens: window keydown H/F & document mousemove do nothing
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(env.doc.getElementById('disagall-viewer-overlay'), null, 'TC-NG-01: Shortcuts before open must not create overlay');
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-NG-01: F before open must not enter fullscreen');
    assert.strictEqual(fullscreenReqCount, 0);

    // 2. Open then close -> !active state
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const origReqOverlay = overlay.requestFullscreen;
    overlay.requestFullscreen = () => {
      fullscreenReqCount++;
      return origReqOverlay();
    };
    env.doc.getElementById('disagall-close-btn').dispatchEvent('click');
    assert.strictEqual(overlay.classList.contains('active'), false);

    overlay.dispatchEvent({ type: 'mousemove' });
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    env.win.dispatchEvent({ type: 'keydown', key: 'H' });
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    env.win.dispatchEvent({ type: 'keydown', key: 'F' });
    timers.advanceBy(3000);

    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-NG-01: !active mousemove must not add .disagall-idle');
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-NG-01: !active H must not add .disagall-ui-hidden');
    assert.strictEqual(fullscreenReqCount, 0, 'TC-NG-01: !active F must not invoke requestFullscreen');
    assert.strictEqual(timers.timers.size, 0, 'TC-NG-01: !active mousemove must leave 0 idle timers');

    // 3. While active: editable targets, modifier combos, and external open modal block H/F
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    assert.strictEqual(overlay.classList.contains('active'), true);

    let blurred = false;
    const mockInput = { tagName: 'INPUT', blur: () => { blurred = true; } };
    const mockTextarea = { tagName: 'TEXTAREA' };
    const mockEditableDiv = { tagName: 'DIV', isContentEditable: true };

    env.win.dispatchEvent({ type: 'keydown', key: 'h', target: mockInput });
    env.win.dispatchEvent({ type: 'keydown', key: 'f', target: mockTextarea });
    env.win.dispatchEvent({ type: 'keydown', key: 'h', target: mockEditableDiv });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-NG-01: Editable targets must block H');
    assert.strictEqual(fullscreenReqCount, 0, 'TC-NG-01: Editable targets must block F');

    env.win.dispatchEvent({ type: 'keydown', key: 'Escape', target: mockInput });
    assert.strictEqual(blurred, true, 'TC-NG-01: Escape on focused input must blur input without closing viewer');
    assert.strictEqual(overlay.classList.contains('active'), true, 'TC-NG-01: Viewer must remain active after Escape blurs input');

    env.win.dispatchEvent({ type: 'keydown', key: 'f', ctrlKey: true });
    env.win.dispatchEvent({ type: 'keydown', key: 'f', metaKey: true });
    env.win.dispatchEvent({ type: 'keydown', key: 'h', altKey: true });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-NG-01: Modifier combos must not toggle UI');
    assert.strictEqual(fullscreenReqCount, 0, 'TC-NG-01: Modifier combos must not trigger fullscreen');

    const dialogEl = env.doc.createElement('dialog');
    dialogEl.setAttribute('open', '');
    env.doc.body.appendChild(dialogEl);
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-NG-01: External open <dialog> must block H');
    assert.strictEqual(fullscreenReqCount, 0, 'TC-NG-01: External open <dialog> must block F');
    dialogEl.remove();

    console.log('✅ TC-NG-01 PASS: Inactive (!active) safety & editable/modifier/modal negative guards verified');
  }

  // --- TC-NG-02: closeViewer (closeBtn / Escape / backdrop / fullscreen) cancels pending timers with 0 ghost callbacks ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    // 1. Close via close button mid-timer
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const stage = env.doc.getElementById('disagall-stage');
    const closeBtn = env.doc.getElementById('disagall-close-btn');
    assert(timers.timers.size >= 1, 'TC-NG-02: Active viewer must have pending idle timer');

    timers.advanceBy(1500);
    closeBtn.dispatchEvent('click');
    assert.strictEqual(overlay.classList.contains('active'), false);
    assert.strictEqual(timers.timers.size, 0, 'TC-NG-02: closeBtn must clear pending idle timer immediately');
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-NG-02: No ghost .disagall-idle after closeBtn');

    // 2. Close via Escape (fullscreen Escape exits fullscreen first, second Escape closes viewer)
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(env.doc.fullscreenElement, overlay);
    timers.advanceBy(1500);

    env.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-NG-02: First Escape exits fullscreen');
    assert.strictEqual(overlay.classList.contains('active'), true, 'TC-NG-02: Viewer stays open after Escape exits fullscreen');

    env.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.strictEqual(overlay.classList.contains('active'), false, 'TC-NG-02: Second Escape closes viewer');
    assert.strictEqual(timers.timers.size, 0, 'TC-NG-02: Escape close must clear all pending idle timers');
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-NG-02: No ghost .disagall-idle after Escape close');

    // 3. Close via backdrop (#disagall-stage) while fullscreen is active -> exits fullscreen & clears timer
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(env.doc.fullscreenElement, overlay);
    timers.advanceBy(1500);

    overlay.dispatchEvent({ type: 'click', target: stage });
    assert.strictEqual(overlay.classList.contains('active'), false, 'TC-NG-02: Backdrop click must close viewer');
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-NG-02: Backdrop closeViewer must exit active fullscreen');
    assert.strictEqual(timers.timers.size, 0, 'TC-NG-02: Backdrop closeViewer must clear pending idle timer');
    timers.advanceBy(3000);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false, 'TC-NG-02: No ghost .disagall-idle after backdrop close');

    // 4. DEFECT-01: Pending requestFullscreen resolves after closeViewer -> must exit OS fullscreen immediately
    let resolvePendingFs = null;
    const origReqFs = overlay.requestFullscreen;
    overlay.requestFullscreen = () => new Promise((resolve) => { resolvePendingFs = resolve; });
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    assert.strictEqual(typeof resolvePendingFs, 'function', 'TC-NG-02: requestFullscreen must be pending');
    closeBtn.dispatchEvent('click');
    assert.strictEqual(overlay.classList.contains('active'), false);
    env.doc.fullscreenElement = overlay;
    resolvePendingFs();
    env.doc.dispatchEvent('fullscreenchange');
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-NG-02 (DEFECT-01): Late resolve after closeViewer must exit OS fullscreen');
    assert.strictEqual(overlay.classList.contains('disagall-fullscreen'), false);
    overlay.requestFullscreen = origReqFs;

    console.log('✅ TC-NG-02 PASS: closeViewer (closeBtn/Escape/backdrop/fullscreen) timer cleanup & ghost-callback defense verified');
  }

  // --- TC-HP-05: UI idle/manual hide expands portrait fitting & stage padding, arrow navigation keeps expanded fit ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const stage = env.doc.getElementById('disagall-stage');
    const mainImg = env.doc.getElementById('disagall-main-img');

    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);

    assert.strictEqual(mainImg.style.maxHeight, '662px', 'TC-HP-05: Visible UI must reserve header(52)+footer(38)+padding(48)');
    assert.strictEqual(stage.style.paddingTop, '52px');
    assert.strictEqual(stage.style.paddingBottom, '38px');

    // Idle hide -> expands image and clears stage padding while preserving 24px user padding
    timers.advanceBy(2500);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true);
    assert.strictEqual(mainImg.style.maxHeight, '752px', 'TC-HP-05: Idle hide must expand portrait maxHeight to 752px');
    assert.strictEqual(mainImg.style.maxWidth, '376px');
    assert.strictEqual(stage.style.paddingTop, '0px');
    assert.strictEqual(stage.style.paddingBottom, '0px');

    // ADR-04: ArrowRight while hidden keeps expanded fit for next photo
    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowRight' });
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true);
    assert.strictEqual(mainImg.style.maxHeight, '752px', 'TC-HP-05: Next photo while hidden must keep expanded fit');

    // Mousemove -> restores UI and shrinks back to visible bounds
    overlay.dispatchEvent({ type: 'mousemove' });
    assert.strictEqual(overlay.classList.contains('disagall-idle'), false);
    assert.strictEqual(mainImg.style.maxHeight, '662px');
    assert.strictEqual(stage.style.paddingTop, '52px');
    assert.strictEqual(stage.style.paddingBottom, '38px');
    console.log('✅ TC-HP-05 PASS: Built content.js UI-hidden expansion, ADR-04 persistence & restore verified');
  }

  // --- TC-BD-03: 0px user padding avoids overlap when UI visible and fills full 800px when UI hidden ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: false, defaultPadding: 0 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const stage = env.doc.getElementById('disagall-stage');
    const mainImg = env.doc.getElementById('disagall-main-img');

    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);

    assert.strictEqual(mainImg.style.maxHeight, '710px', 'TC-BD-03: 0px padding visible UI must fit 800-52-38=710px');
    assert.strictEqual(stage.style.paddingTop, '52px');
    assert.strictEqual(stage.style.paddingBottom, '38px');

    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true);
    assert.strictEqual(mainImg.style.maxHeight, '800px', 'TC-BD-03: 0px padding hidden UI must fill full 800px');
    assert.strictEqual(mainImg.style.maxWidth, '400px');
    assert.strictEqual(stage.style.paddingTop, '0px');
    assert.strictEqual(stage.style.paddingBottom, '0px');
    console.log('✅ TC-BD-03 PASS: Built content.js 0px padding non-overlap & full-bleed expansion verified');
  }

  // --- TC-BD-04: Zoom > 1.0 locks base size during UI toggle and refits upon reset to 1.0x ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const stage = env.doc.getElementById('disagall-stage');
    const mainImg = env.doc.getElementById('disagall-main-img');

    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '662px');

    // Double-click to zoom 2.0x -> manual hide (H) must lock 662px base size
    mainImg.dispatchEvent({ type: 'dblclick' });
    timers.advanceBy(20);
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true);
    assert.strictEqual(mainImg.style.maxHeight, '662px', 'TC-BD-04: Zoomed image must not resize on H hide');
    assert.strictEqual(stage.style.paddingTop, '52px');

    // Double-click to reset zoom 1.0x while UI still hidden -> immediately syncs to expanded 752px
    mainImg.dispatchEvent({ type: 'dblclick' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '752px', 'TC-BD-04: Resetting zoom to 1.0x while hidden must sync expanded 752px');
    assert.strictEqual(stage.style.paddingTop, '0px');
    assert.strictEqual(stage.style.paddingBottom, '0px');
    console.log('✅ TC-BD-04 PASS: Built content.js zoom size-lock & 1.0x refit sync verified');
  }

  // --- TC-HP-06: Header fullscreen button, 0px temp padding, immediate UI hide & fullscreenchange restore ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: false, defaultPadding: 36 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const stage = env.doc.getElementById('disagall-stage');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const fullscreenBtn = env.doc.getElementById('disagall-btn-fullscreen');

    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '638px');

    // Click header fullscreen button while hovering header -> enters OS fullscreen, sets 0px temp padding, hides UI & synthetic mouseleave keeps UI hidden
    header.dispatchEvent({ type: 'mouseenter' });
    fullscreenBtn.dispatchEvent('click');
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, overlay, 'TC-HP-06: Fullscreen button click must enter OS fullscreen');
    assert.strictEqual(overlay.classList.contains('disagall-fullscreen'), true);
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true);
    header.dispatchEvent({ type: 'mouseleave' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-06 (DEFECT-02): synthetic header mouseleave must keep UI hidden');
    assert.strictEqual(fullscreenBtn.classList.contains('active'), true);
    assert.strictEqual(mainImg.style.maxHeight, '800px', 'TC-HP-06: Fullscreen must temporarily apply 0px padding');
    assert.strictEqual(stage.style.paddingTop, '0px');

    // OS ESC exit fires fullscreenchange -> restores 36px padding & UI
    env.doc.fullscreenElement = null;
    env.doc.dispatchEvent('fullscreenchange');
    assert.strictEqual(overlay.classList.contains('disagall-fullscreen'), false);
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false);
    assert.strictEqual(fullscreenBtn.classList.contains('active'), false);
    assert.strictEqual(mainImg.style.maxHeight, '638px', 'TC-HP-06: fullscreenchange exit must restore 36px padding');
    assert.strictEqual(stage.style.paddingTop, '52px');
    console.log('✅ TC-HP-06 PASS: Built content.js header fullscreen button, 0px temp padding & fullscreenchange restore verified');
  }

  // --- TC-BD-05: Popup autoFullscreen toggle -> openViewer OS fullscreen & blocked-gesture fallback ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: false, defaultPadding: 24 });
    loadContentBundle(env, timers);

    // Enable autoFullscreen via popup
    const popup = require('../popup.js');
    let autoFsChecked = false;
    const autoFsListeners = [];
    const mockPopupDoc = {
      getElementById(id) {
        if (id === 'auto-fullscreen-toggle') {
          return {
            checked: autoFsChecked,
            addEventListener: (ev, fn) => { if (ev === 'change') autoFsListeners.push(fn); },
          };
        }
        return null;
      },
    };
    popup.initPopup(mockPopupDoc, env.chrome.storage.sync);
    autoFsChecked = true;
    autoFsListeners.forEach((fn) => fn({ target: { checked: true } }));
    assert.strictEqual(env.syncStore.autoFullscreen, true, 'TC-BD-05: Popup must persist autoFullscreen=true');

    // Simulate blocked requestFullscreen (no user gesture in Chrome context menu) -> fallback engages
    const origCreateEl = env.doc.createElement;
    env.doc.createElement = (tag) => {
      const node = origCreateEl(tag);
      node.requestFullscreen = () => Promise.reject(new Error('Permissions check failed'));
      return node;
    };

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const toast = env.doc.getElementById('disagall-toast');
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;

    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-BD-05: Blocked requestFullscreen leaves fullscreenElement null');
    assert.strictEqual(overlay.classList.contains('disagall-fullscreen'), true, 'TC-BD-05: Fallback must activate .disagall-fullscreen');
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-BD-05: Fallback must hide UI');
    assert.strictEqual(mainImg.style.maxHeight, '800px', 'TC-BD-05: Fallback must apply 0px padding full-bleed');
    assert(toast.textContent.includes('전체화면'), 'TC-BD-05: Fallback must display guidance toast');
  }

  // --- TC-BD-05b (DEFECT-03): Async delayed chrome.storage.sync.get resolving AFTER openViewer() ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: true, defaultPadding: 44 });
    const pendingAsyncGets = [];
    const origGet = env.chrome.storage.sync.get;
    env.chrome.storage.sync.get = (keys, cb) => {
      pendingAsyncGets.push(() => origGet(keys, cb));
    };
    loadContentBundle(env, timers);

    // Open viewer BEFORE async storage.sync.get resolves
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const slider = env.doc.getElementById('disagall-slider');
    const sliderVal = env.doc.getElementById('disagall-slider-val');
    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '662px', 'TC-BD-05b: Before async get, viewer uses default 24px');

    // Resolve delayed storage.sync.get -> hydrates 44px padding & retroactively enters autoFullscreen
    assert.strictEqual(pendingAsyncGets.length, 1, 'TC-BD-05b: Single unified storage.sync.get must be issued');
    pendingAsyncGets.shift()();
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(Number(slider.value), 0, 'TC-BD-05b (ADR-08): Retroactive autoFullscreen displays 0 on slider UI');
    assert.strictEqual(sliderVal.textContent, '0px', 'TC-BD-05b (ADR-08): Retroactive autoFullscreen displays "0px" on slider label');
    assert.strictEqual(env.doc.fullscreenElement, overlay, 'TC-BD-05b: Delayed get must retroactively enter autoFullscreen');
    assert.strictEqual(mainImg.style.maxHeight, '800px', 'TC-BD-05b: Fullscreen applies 0px temporary padding');

    // Exit fullscreen -> restores delayed 44px padding (800 - 52 - 38 - 88 = 622px) & slider UI 44px
    env.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, null);
    assert.strictEqual(Number(slider.value), 44, 'TC-BD-05b: Exiting fullscreen must restore slider value to 44');
    assert.strictEqual(sliderVal.textContent, '44px', 'TC-BD-05b: Exiting fullscreen must restore slider label to 44px');
    assert.strictEqual(mainImg.style.maxHeight, '622px', 'TC-BD-05b: Exiting fullscreen must restore delayed 44px padding');
    console.log('✅ TC-BD-05 PASS: Popup autoFullscreen sync, blocked-gesture fallback & async init race verified');
  }

  // --- TC-NG-03: Fullscreen enter/exit & closeViewer must never overwrite saved user padding ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: true, defaultPadding: 44 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const mainImg = env.doc.getElementById('disagall-main-img');
    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    await Promise.resolve();
    await Promise.resolve();

    assert.strictEqual(mainImg.style.maxHeight, '800px');
    assert.strictEqual(env.syncStore.defaultPadding, 44, 'TC-NG-03: Sync store defaultPadding must remain 44');

    // Exit fullscreen via F -> must restore original 44px padding (800 - 52 - 38 - 88 = 622px)
    env.win.dispatchEvent({ type: 'keydown', key: 'F' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(mainImg.style.maxHeight, '622px', 'TC-NG-03: Exiting fullscreen must restore 44px padding fitting');

    // Re-enter fullscreen then closeViewer -> must clean up and preserve saved 44px padding
    env.win.dispatchEvent({ type: 'keydown', key: 'F' });
    await Promise.resolve();
    await Promise.resolve();
    env.doc.getElementById('disagall-close-btn').dispatchEvent('click');
    assert.strictEqual(overlay.classList.contains('disagall-fullscreen'), false);
    assert.strictEqual(env.syncStore.defaultPadding, 44, 'TC-NG-03: closeViewer must preserve saved defaultPadding 44');
    console.log('✅ TC-NG-03 PASS: Fullscreen enter/exit & closeViewer preserves saved user padding verified');
  }

  // --- TC-BD-06: Korean IME KeyF/KeyH & range slider focus pass-through on built content.js ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: false, defaultPadding: 24 });
    loadContentBundle(env, timers);

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const slider = env.doc.getElementById('disagall-slider');
    slider.type = 'range';

    // Korean IME 'ㄹ' + code 'KeyF' while range slider is focused -> enters fullscreen
    env.win.dispatchEvent({ type: 'keydown', key: 'ㄹ', code: 'KeyF', target: slider });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, overlay, 'TC-BD-06: Korean IME KeyF with focused range slider must enter fullscreen');

    env.win.dispatchEvent({ type: 'keydown', key: 'ㄹ', code: 'KeyF', target: slider });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, null, 'TC-BD-06: Korean IME KeyF must exit fullscreen');
    console.log('✅ TC-BD-06 PASS: Built content.js Korean IME KeyF & range slider pass-through verified');
  }

  // --- TC-BD-07: Fullscreen transition suppresses synthetic/jitter mousemove, wakes on real post-transition move ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: false, defaultPadding: 24 });
    let fakeNow = 200000;
    const FakeDate = class extends Date {
      static now() {
        return fakeNow;
      }
    };

    loadContentBundle(env, timers, { Date: FakeDate });

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const fullscreenBtn = env.doc.getElementById('disagall-btn-fullscreen');

    fullscreenBtn.dispatchEvent('click');
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, overlay);
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true);

    // Synthetic/transition mousemove within 1s guard must NOT flicker UI back on
    fakeNow += 400;
    overlay.dispatchEvent({ type: 'mousemove', screenX: 700, screenY: 100, clientX: 700, clientY: 100, movementX: 1, movementY: 0 });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-BD-07: Transition mousemove must not re-show UI');
    assert.strictEqual(timers.timers.size, 0, 'TC-BD-07: Transition mousemove must not start idle timer');

    // Stationary synthetic mousemove after guard expires must still stay hidden
    fakeNow += 800;
    overlay.dispatchEvent({ type: 'mousemove', screenX: 700, screenY: 100, clientX: 700, clientY: 100, movementX: 0, movementY: 0 });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-BD-07: Stationary synthetic mousemove after guard must stay hidden');

    // Real mouse move after guard wakes UI normally
    overlay.dispatchEvent({ type: 'mousemove', screenX: 760, screenY: 140, clientX: 760, clientY: 140, movementX: 60, movementY: 40 });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false, 'TC-BD-07: Real mousemove after transition must wake UI');
    assert.strictEqual(timers.timers.size, 1, 'TC-BD-07: Real mousemove must resume idle timer');
    console.log('✅ TC-BD-07 PASS: Built content.js fullscreen transition UI flicker suppression & post-transition wake verified');
  }

  // --- TC-HP-07 (ADR-08): Fullscreen temporary 0px slider display, live unlock refit & persistence across exit/re-enter ---
  {
    const timers = createFakeTimerEnv();
    const env = createDomEnvironment({ autoHideUi: true, autoFullscreen: false, defaultPadding: 24 });
    let fakeNow = 300000;
    const FakeDate = class extends Date {
      static now() {
        return fakeNow;
      }
    };
    loadContentBundle(env, timers, { Date: FakeDate });

    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    const header = overlay.querySelector('.disagall-header');
    const footer = overlay.querySelector('.disagall-footer');
    const mainImg = env.doc.getElementById('disagall-main-img');
    const slider = env.doc.getElementById('disagall-slider');
    const sliderVal = env.doc.getElementById('disagall-slider-val');

    header.offsetHeight = 52;
    footer.offsetHeight = 38;
    mainImg.naturalWidth = 1000;
    mainImg.naturalHeight = 2000;
    env.win.dispatchEvent({ type: 'resize' });
    timers.advanceBy(20);
    assert.strictEqual(mainImg.style.maxHeight, '662px');

    // Enter fullscreen -> slider displays 0 / '0px' and image fills 800px
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, overlay);
    assert.strictEqual(Number(slider.value), 0, 'TC-HP-07: Fullscreen entry must display 0 on slider');
    assert.strictEqual(sliderVal.textContent, '0px', 'TC-HP-07: Fullscreen entry must display "0px" label');
    assert.strictEqual(mainImg.style.maxHeight, '800px');

    // Wake UI after transition guard, then drag slider to 40px -> refits immediately & persists 40
    fakeNow += 1200;
    overlay.dispatchEvent({ type: 'mousemove', screenX: 420, screenY: 180, clientX: 420, clientY: 180, movementX: 20, movementY: 20 });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), false);
    assert.strictEqual(mainImg.style.maxHeight, '710px');

    slider.dispatchEvent({ type: 'mousedown' });
    slider.value = '40';
    slider.dispatchEvent({ type: 'input', target: slider });
    slider.dispatchEvent({ type: 'change', target: slider });
    slider.dispatchEvent({ type: 'mouseup' });
    assert.strictEqual(sliderVal.textContent, '40px', 'TC-HP-07: Fullscreen slider drag must update label to 40px');
    assert.strictEqual(mainImg.style.maxHeight, '630px', 'TC-HP-07: Fullscreen slider drag must immediately refit to 800-52-38-80=630px');
    assert.strictEqual(env.syncStore.defaultPadding, 40, 'TC-HP-07: Fullscreen slider edit must persist defaultPadding=40');

    // Wait 2500ms idle inside fullscreen -> expands to 720px (800 - 80) preserving 40px padding
    timers.advanceBy(2500);
    assert.strictEqual(overlay.classList.contains('disagall-idle'), true);
    assert.strictEqual(mainImg.style.maxHeight, '720px', 'TC-HP-07: Idle hide in fullscreen must preserve unlocked 40px padding');

    // Exit fullscreen -> keeps 40px / 630px
    env.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(env.doc.fullscreenElement, null);
    assert.strictEqual(Number(slider.value), 40);
    assert.strictEqual(sliderVal.textContent, '40px');
    assert.strictEqual(mainImg.style.maxHeight, '630px', 'TC-HP-07: Exiting fullscreen must keep newly saved 40px padding');

    // Re-enter fullscreen -> starts fresh at temporary 0px while keeping defaultPadding=40; exit untouched -> restores 40px
    env.win.dispatchEvent({ type: 'keydown', key: 'f' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(Number(slider.value), 0);
    assert.strictEqual(sliderVal.textContent, '0px');
    assert.strictEqual(mainImg.style.maxHeight, '800px');
    assert.strictEqual(env.syncStore.defaultPadding, 40);

    env.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(Number(slider.value), 40);
    assert.strictEqual(sliderVal.textContent, '40px');
    assert.strictEqual(mainImg.style.maxHeight, '630px');
    console.log('✅ TC-HP-07 PASS: Built content.js fullscreen temp 0px display, live slider unlock & persistence verified');
  }

  console.log('\n🎉 ALL VIEWER IMMERSION E2E TESTS (HAPPY PATH + BOUNDARY & NEGATIVE) PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ E2E test failed:', err);
  process.exit(1);
});
