// End-to-End Integration Tests for viewer-immersion (Actual built content.js, content.css, popup.js, popup.html, test_page.html)
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');

function createFakeTimerEnv() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const rafTimers = new Map();

  function setTimeoutFn(cb, delay = 0) {
    const id = nextId++;
    timers.set(id, { id, cb, runAt: now + Number(delay), interval: null });
    return id;
  }

  function clearTimeoutFn(id) {
    timers.delete(id);
  }

  function setIntervalFn(cb, delay = 0) {
    const id = nextId++;
    timers.set(id, { id, cb, runAt: now + Number(delay), interval: Number(delay) });
    return id;
  }

  function clearIntervalFn(id) {
    timers.delete(id);
  }

  function requestAnimationFrameFn(cb) {
    const id = nextId++;
    rafTimers.set(id, { id, cb, runAt: now + 16 });
    return id;
  }

  function cancelAnimationFrameFn(id) {
    rafTimers.delete(id);
  }

  function advanceBy(ms) {
    const target = now + ms;
    while (true) {
      let nextTask = null;
      let nextMap = null;
      for (const task of timers.values()) {
        if (task.runAt <= target && (!nextTask || task.runAt < nextTask.runAt)) {
          nextTask = task;
          nextMap = timers;
        }
      }
      for (const task of rafTimers.values()) {
        if (task.runAt <= target && (!nextTask || task.runAt < nextTask.runAt)) {
          nextTask = task;
          nextMap = rafTimers;
        }
      }
      if (!nextTask) break;
      now = nextTask.runAt;
      if (nextTask.interval !== null && nextTask.interval !== undefined) {
        nextTask.runAt = now + nextTask.interval;
      } else {
        nextMap.delete(nextTask.id);
      }
      nextTask.cb();
    }
    now = target;
  }

  return {
    setTimeoutFn,
    clearTimeoutFn,
    setIntervalFn,
    clearIntervalFn,
    requestAnimationFrameFn,
    cancelAnimationFrameFn,
    advanceBy,
    timers,
  };
}

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
          const closeBtn = createElement('button', 'disagall-close-btn', 'disagall-btn disagall-btn-close');
          header.appendChild(counter);
          header.appendChild(infoBadge);
          header.appendChild(slider);
          header.appendChild(sliderVal);
          header.appendChild(recBtn);
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

function loadContentBundle(env, timers) {
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

    // Press 'h' -> immediate .disagall-ui-hidden
    env.win.dispatchEvent({ type: 'keydown', key: 'h' });
    assert.strictEqual(overlay.classList.contains('disagall-ui-hidden'), true, 'TC-HP-02: h must immediately add .disagall-ui-hidden');

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

    // Simulate popup.js interacting with shared chrome.storage.sync
    const popup = require('../popup.js');
    let toggleChecked = true;
    const toggleListeners = [];
    const mockPopupDoc = {
      getElementById(id) {
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

    // Open viewer initially (autoHideUi=true)
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay = env.doc.getElementById('disagall-viewer-overlay');

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
    console.log('✅ TC-HP-04 PASS: Popup toggle, chrome.storage.sync persistence & live content.js sync verified');
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

    console.log('✅ TC-NG-02 PASS: closeViewer (closeBtn/Escape/backdrop/fullscreen) timer cleanup & ghost-callback defense verified');
  }

  console.log('\n🎉 ALL VIEWER IMMERSION E2E TESTS (HAPPY PATH + BOUNDARY & NEGATIVE) PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ E2E test failed:', err);
  process.exit(1);
});
