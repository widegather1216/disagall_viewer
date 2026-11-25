// End-to-End Integration Tests for post-navigation (Actual built content.js, content.css, test_page*.html, dc_sample.html)
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

function createPostNavDomEnvironment({
  currentUrl = 'http://127.0.0.1:18080/test_page.html?no=1003',
  images = [
    { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80', alt: 'Sample 1' },
    { src: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=1200&q=80', alt: 'Sample 2' },
  ],
  listRows = [],
  mobileItems = [],
  noList = false,
  initialSession = {},
  readyState = 'complete',
} = {}) {
  const sessionStore = new Map(Object.entries(initialSession));
  const windowListeners = {};
  const documentListeners = {};
  const navigatedUrls = [];

  function makeClassList(initial = '') {
    const set = new Set(String(initial).split(/[\s>]+/).filter(Boolean));
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
      _className: className,
      get className() { return this._className; },
      set className(val) {
        this._className = val;
        this.classList = makeClassList(val);
      },
      style: {},
      dataset: {},
      children: [],
      parentNode: null,
      _textContent: '',
      get textContent() {
        if (this._textContent) return this._textContent;
        if (this.children.length > 0) {
          return this.children.map((c) => c.textContent).join(' ');
        }
        return '';
      },
      set textContent(val) {
        this._textContent = val === null || val === undefined ? '' : String(val);
      },
      _innerHTML: '',
      value: '24',
      checked: true,
      src: '',
      href: '',
      alt: '',
      naturalWidth: 1600,
      naturalHeight: 1000,
      offsetHeight: 50,
      classList: makeClassList(className),
      getAttribute: (k) => (k in attrs ? attrs[k] : (k === 'href' && el.href ? el.href : null)),
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
      closest: (sel) => {
        let cur = el;
        while (cur) {
          if (matchesSelectorGroup(cur, sel)) return cur;
          cur = cur.parentNode;
        }
        return null;
      },
      matches: (sel) => matchesSelectorGroup(el, sel),
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
      blur: () => {
        if (doc.activeElement === el) doc.activeElement = body;
      },
    };
    return el;
  }

  function matchesCompound(el, compound) {
    if (!el || !el.tagName) return false;
    let rest = compound.trim();
    if (!rest) return false;

    const notMatch = rest.match(/:not\(([^)]+)\)/);
    if (notMatch) {
      const inner = notMatch[1].trim();
      rest = rest.replace(notMatch[0], '').trim();
      if (matchesCompound(el, inner)) return false;
      if (!rest) return true;
    }

    const attrRegex = /\[([^\]]+)\]/g;
    let m;
    const attrChecks = [];
    while ((m = attrRegex.exec(rest)) !== null) {
      attrChecks.push(m[1]);
    }
    rest = rest.replace(attrRegex, '');

    for (const ac of attrChecks) {
      if (ac.includes('*=')) {
        const [k, rawV] = ac.split('*=');
        const v = rawV.replace(/^['"]|['"]$/g, '');
        const actual = k === 'class' ? el.className : (el.getAttribute(k) || '');
        if (!actual.includes(v)) return false;
      } else if (ac.includes('=')) {
        const [k, rawV] = ac.split('=');
        const v = rawV.replace(/^['"]|['"]$/g, '');
        if (el.getAttribute(k) !== v) return false;
      } else if (!el.hasAttribute(ac)) {
        return false;
      }
    }

    const tokens = rest.match(/(#[\w-]+|\.[\w-]+|[a-zA-Z0-9_-]+)/g) || [];
    for (const tok of tokens) {
      if (tok.startsWith('#')) {
        if (el.id !== tok.slice(1)) return false;
      } else if (tok.startsWith('.')) {
        if (!el.classList.contains(tok.slice(1))) return false;
      } else {
        if (el.tagName !== tok.toUpperCase()) return false;
      }
    }
    return tokens.length > 0 || attrChecks.length > 0;
  }

  function matchesChain(el, selectorChain) {
    const parts = selectorChain.trim().split(/\s+/);
    if (!matchesCompound(el, parts[parts.length - 1])) return false;
    let cur = el.parentNode;
    for (let i = parts.length - 2; i >= 0; i--) {
      while (cur && !matchesCompound(cur, parts[i])) {
        cur = cur.parentNode;
      }
      if (!cur) return false;
      cur = cur.parentNode;
    }
    return true;
  }

  function matchesSelectorGroup(el, selector) {
    if (!selector) return false;
    return selector.split(',').some((part) => matchesChain(el, part));
  }

  function findBySelector(root, selector) {
    const parts = selector.split(',').map((s) => s.trim()).filter(Boolean);
    const out = [];
    function walk(node) {
      for (const child of node.children) {
        if (parts.some((p) => matchesChain(child, p))) {
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
  images.forEach((item) => {
    const img = createElement('img');
    img.src = item.src;
    img.alt = item.alt || '';
    writeDiv.appendChild(img);
  });
  body.appendChild(writeDiv);

  if (!noList && listRows.length > 0) {
    const gallList = createElement('table', '', 'gall_list');
    const tbody = createElement('tbody');
    listRows.forEach((r) => {
      const tr = createElement('tr', '', `ub-content ${r.className || ''}`.trim());
      if (r.no !== undefined && r.no !== null && r.no !== '') tr.dataset.no = String(r.no);

      const tdNum = createElement('td', '', 'gall_num');
      if (r.hasCrtIcon) {
        const crtSpan = createElement('span', '', 'sp_img crt_icon');
        tdNum.appendChild(crtSpan);
      }
      tdNum.textContent = r.numText !== undefined ? r.numText : (r.no ? String(r.no) : '');

      const tdSubj = createElement('td', '', 'gall_subject');
      tdSubj.textContent = r.subjectText || '';

      const tdTit = createElement('td', '', 'gall_tit ub-word');
      if (r.href !== undefined) {
        const a = createElement('a');
        a.href = r.href;
        a.setAttribute('href', r.href);
        if (r.hasPhotoIcon) {
          const em = createElement('em', '', r.photoIconClass || 'icon_img icon_pic');
          a.appendChild(em);
        }
        a.textContent = r.title || '';
        if (r.markerClass) {
          const marker = createElement('span', '', r.markerClass);
          tdTit.appendChild(marker);
        }
        tdTit.appendChild(a);
      }

      tr.appendChild(tdNum);
      tr.appendChild(tdSubj);
      tr.appendChild(tdTit);
      tbody.appendChild(tr);
    });
    gallList.appendChild(tbody);
    body.appendChild(gallList);
  }

  if (!noList && mobileItems.length > 0) {
    const ul = createElement('ul', '', 'gall-detail-lst');
    mobileItems.forEach((item) => {
      const li = createElement('li', '', item.className || '');
      if (item.no !== undefined && item.no !== null && item.no !== '') li.dataset.no = String(item.no);
      if (item.subjectText) {
        const subj = createElement('span', '', 'gall_subject');
        subj.textContent = item.subjectText;
        li.appendChild(subj);
      }
      if (item.href !== undefined) {
        const a = createElement('a');
        a.href = item.href;
        a.setAttribute('href', item.href);
        if (item.hasPhotoIcon) {
          const em = createElement('span', '', item.photoIconClass || 'sp-lst-img');
          a.appendChild(em);
        }
        a.textContent = item.title || '';
        li.appendChild(a);
      }
      ul.appendChild(li);
    });
    body.appendChild(ul);
  }

  const doc = {
    readyState,
    body,
    fullscreenElement: null,
    activeElement: body,
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

  // Hydrate innerHTML for overlay and no-photo notice
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
          slider.type = 'range';
          const sliderVal = createElement('span', 'disagall-slider-val', 'disagall-padding-val');
          const recBtn = createElement('button', 'disagall-btn-recommend', 'disagall-btn disagall-btn-recommend');
          const fullscreenBtn = createElement('button', 'disagall-btn-fullscreen', 'disagall-btn disagall-btn-fullscreen');
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
          const keyhints = createElement('div', '', 'disagall-keyhints');
          if (html.includes('이전/다음 글')) {
            const postNavHint = createElement('div', '', 'disagall-keyhint');
            postNavHint.textContent = '↑ ↓ 이전/다음 글';
            keyhints.appendChild(postNavHint);
          }
          footer.appendChild(keyhints);

          node.appendChild(header);
          node.appendChild(stage);
          node.appendChild(toast);
          node.appendChild(footer);
        } else if (html.includes('disagall-notice-prev')) {
          const prevBtn = createElement('button', 'disagall-notice-prev', 'disagall-notice-btn');
          const nextBtn = createElement('button', 'disagall-notice-next', 'disagall-notice-btn');
          const closeBtn = createElement('button', 'disagall-notice-close', 'disagall-notice-btn close');
          node.appendChild(prevBtn);
          node.appendChild(nextBtn);
          node.appendChild(closeBtn);
        }
      },
    });
    return node;
  };

  const parsedCurrent = new URL(currentUrl);
  let hrefValue = currentUrl;
  const locationObj = {
    origin: parsedCurrent.origin,
    protocol: parsedCurrent.protocol,
    get href() { return hrefValue; },
    set href(next) {
      hrefValue = next;
      navigatedUrls.push(next);
    },
  };

  const win = {
    innerWidth: 1280,
    innerHeight: 800,
    location: locationObj,
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
    postMessage: (data) => {
      (windowListeners['message'] || []).forEach((fn) => fn({ origin: win.location.origin, data }));
    },
  };

  const sessionStorage = {
    getItem: (k) => (sessionStore.has(k) ? sessionStore.get(k) : null),
    setItem: (k, v) => { sessionStore.set(k, String(v)); },
    removeItem: (k) => { sessionStore.delete(k); },
  };

  const chrome = {
    storage: {
      sync: {
        get: (keys, cb) => cb({ autoHideUi: true, autoFullscreen: false, defaultPadding: 24 }),
        set: () => {},
      },
      onChanged: { addListener: () => {} },
    },
    runtime: { onMessage: { addListener: () => {} } },
  };

  return { doc, win, writeDiv, sessionStorage, sessionStore, chrome, navigatedUrls, windowListeners, createElement };
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
      if (typeof this.onload === 'function') this.onload();
    }
    get src() { return this._src; }
  }

  const sandbox = {
    window: env.win,
    document: env.doc,
    chrome: env.chrome,
    Image: MockImage,
    Event: function Event(type) { this.type = type; },
    sessionStorage: env.sessionStorage,
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

function parseDcSampleRows() {
  const html = fs.readFileSync(path.join(ROOT, 'dc_sample.html'), 'utf8');
  const trMatches = [...html.matchAll(/<tr\s+class="ub-content\s*([^"]*)"[\s\S]*?<\/tr>/g)];
  return trMatches.map((m) => {
    const trHtml = m[0];
    const trClass = m[1];
    const numMatch = trHtml.match(/<td\s+class="gall_num"[^>]*>([\s\S]*?)<\/td>/);
    const numText = numMatch ? numMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const subMatch = trHtml.match(/<td\s+class="gall_subject"[^>]*>([\s\S]*?)<\/td>/);
    const subjectText = subMatch ? subMatch[1].replace(/<[^>]+>/g, '').trim() : '';
    const linkMatch = trHtml.match(/<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const href = linkMatch ? linkMatch[1] : '';
    const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : '';
    const hasPhotoIcon = trHtml.includes('icon_pic') || trHtml.includes('icon_recomimg');
    return {
      className: trClass,
      numText,
      subjectText,
      href,
      title,
      hasCrtIcon: trHtml.includes('crt_icon'),
      hasPhotoIcon,
      photoIconClass: trHtml.includes('icon_recomimg') ? 'icon_img icon_recomimg' : 'icon_img icon_pic',
    };
  });
}

async function run() {
  console.log('🧪 Starting Post Navigation Built-Bundle E2E Tests (Dimension A: Happy Path)...\n');

  // Verify test_page*.html fixture wiring
  for (const file of ['test_page.html', 'test_page_2.html', 'test_page_3.html']) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    assert(html.includes('<script src="content.js"></script>'), `${file} must load content.js`);
  }

  // --- TC-HP-01: Sequential ArrowDown/S -> sessionStorage -> auto-open on page 2 -> ArrowUp/W return ---
  {
    const page1Rows = [
      { numText: '-', subjectText: '공지', href: '#', title: '공지사항' },
      { numText: '1003', subjectText: '사진', href: 'test_page.html?no=1003', title: '1번 글: 최신 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '2번 글: 골목길 스냅', hasPhotoIcon: true },
      { numText: '-', subjectText: 'AD', href: '#', title: '광고 배너' },
      { numText: '1001', subjectText: '사진', href: 'test_page_3.html?no=1001', title: '3번 글: 마지막 글', hasPhotoIcon: true },
    ];
    const timers1 = createFakeTimerEnv();
    const env1 = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page.html?no=1003',
      listRows: page1Rows,
    });
    loadContentBundle(env1, timers1);

    env1.win.postMessage({ action: 'disagall_test_open' }, '*');
    const overlay1 = env1.doc.getElementById('disagall-viewer-overlay');
    assert(overlay1 && overlay1.classList.contains('active'), 'TC-HP-01: Overlay must activate on test_page.html');
    const keyhintsText = overlay1.querySelector('.disagall-keyhints')?.textContent || '';
    assert(keyhintsText.includes('이전/다음 글'), 'TC-HP-01: Footer keyhints must include ↑ ↓ 이전/다음 글');

    env1.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    const toast1 = env1.doc.getElementById('disagall-toast');
    assert(toast1.classList.contains('show'), 'TC-HP-01: Toast must appear on ArrowDown');
    assert(toast1.textContent.includes('아래쪽 이전 글로 이동 중'), 'TC-HP-01: Toast must announce down navigation');
    assert.strictEqual(env1.sessionStore.get('disagall_auto_open'), '1', 'TC-HP-01: sessionStorage must persist disagall_auto_open=1');
    assert.strictEqual(env1.navigatedUrls.length, 0, 'TC-HP-01: Navigation must wait for 150ms POST_NAV_DELAY');

    timers1.advanceBy(150);
    assert.deepStrictEqual(env1.navigatedUrls, ['test_page_2.html?no=1002'], 'TC-HP-01: Must navigate to page 2 after 150ms');

    // Simulate page 2 load with carried sessionStorage flag
    const page2Rows = [
      { numText: '-', subjectText: '공지', href: '#', title: '공지사항' },
      { numText: '1003', subjectText: '사진', href: 'test_page.html?no=1003', title: '1번 글: 최신 글', hasPhotoIcon: true },
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '2번 글: 골목길 스냅', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '1001', subjectText: '사진', href: 'test_page_3.html?no=1001', title: '3번 글: 마지막 글', hasPhotoIcon: true },
    ];
    const timers2 = createFakeTimerEnv();
    const env2 = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page_2.html?no=1002',
      listRows: page2Rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(env2, timers2);
    assert.strictEqual(env2.sessionStore.has('disagall_auto_open'), false, 'TC-HP-01: checkAutoOpen must consume disagall_auto_open immediately');
    timers2.advanceBy(150);
    const overlay2 = env2.doc.getElementById('disagall-viewer-overlay');
    assert(overlay2 && overlay2.classList.contains('active'), 'TC-HP-01: Viewer must auto-open on page 2');

    // Press W to navigate back up to page 1
    env2.win.dispatchEvent({ type: 'keydown', key: 'w' });
    assert.strictEqual(env2.sessionStore.get('disagall_auto_open'), '1');
    timers2.advanceBy(150);
    assert.deepStrictEqual(env2.navigatedUrls, ['test_page.html?no=1003'], 'TC-HP-01: W key must navigate up to page 1');
    console.log('✅ TC-HP-01 PASS: Built content.js sequential ArrowDown/W navigation, keyhints & sessionStorage auto-open verified');
  }

  // --- TC-HP-02: Delayed image rendering auto-open polling ---
  {
    const timers = createFakeTimerEnv();
    const env = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/delayed_post.html?no=2001',
      images: [],
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(env, timers);
    assert.strictEqual(env.sessionStore.has('disagall_auto_open'), false);

    // First 2 polls (300ms): no image yet -> overlay must not open
    timers.advanceBy(300);
    assert.strictEqual(env.doc.getElementById('disagall-viewer-overlay'), null, 'TC-HP-02: Overlay must stay closed before delayed image renders');

    // Inject delayed image at ~300ms, next poll (450ms) finds it and opens viewer
    const delayedImg = env.doc.createElement('img');
    delayedImg.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
    delayedImg.alt = 'Delayed Sample';
    env.writeDiv.appendChild(delayedImg);

    timers.advanceBy(150);
    const overlay = env.doc.getElementById('disagall-viewer-overlay');
    assert(overlay && overlay.classList.contains('active'), 'TC-HP-02: Polling must auto-open viewer once delayed image mounts');
    assert.strictEqual(env.doc.getElementById('disagall-no-photo-notice'), null, 'TC-HP-02: No-photo notice must not mount when image appears');
    console.log('✅ TC-HP-02 PASS: Built content.js delayed-image auto-open polling & 1-shot sessionStorage consumption verified');
  }

  // --- TC-HP-03: Real dc_sample.html parsing (crt_icon empty num, AD/survey skip) & Smart Photo Skip ---
  {
    const dcRows = parseDcSampleRows();
    const timersDc = createFakeTimerEnv();
    const envDc = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506&search_head=10&page=1',
      listRows: dcRows,
    });
    loadContentBundle(envDc, timersDc);
    envDc.win.postMessage({ action: 'disagall_test_open' }, '*');

    envDc.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    assert(envDc.doc.getElementById('disagall-toast').textContent.includes('니가타 1일차'), 'TC-HP-03: dc_sample ArrowUp must target 1968509');
    timersDc.advanceBy(150);
    assert.strictEqual(envDc.navigatedUrls[0], '/mgallery/board/view/?id=digitalpicture&no=1968509&search_head=10&page=1');

    const timersDcDown = createFakeTimerEnv();
    const envDcDown = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506&search_head=10&page=1',
      listRows: dcRows,
    });
    loadContentBundle(envDcDown, timersDcDown);
    envDcDown.win.postMessage({ action: 'disagall_test_open' }, '*');
    envDcDown.win.dispatchEvent({ type: 'keydown', key: 's' });
    assert(envDcDown.doc.getElementById('disagall-toast').textContent.includes('베짱이 한 장'), 'TC-HP-03: dc_sample S must target 1968505');
    timersDcDown.advanceBy(150);
    assert.strictEqual(envDcDown.navigatedUrls[0], '/mgallery/board/view/?id=digitalpicture&no=1968505&search_head=10&page=1');

    // Smart photo skip over text-only rows
    const mixedRows = [
      { numText: '3001', subjectText: '일반', href: '/view/?no=3001', title: '현재 사진글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '3000', subjectText: '잡담', href: '/view/?no=3000', title: '텍스트 잡담글', hasPhotoIcon: false },
      { numText: '2999', subjectText: '일반', href: '/view/?no=2999', title: '다음 사진글', hasPhotoIcon: true },
    ];
    const timersMix = createFakeTimerEnv();
    const envMix = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=test&no=3001',
      listRows: mixedRows,
    });
    loadContentBundle(envMix, timersMix);
    envMix.win.postMessage({ action: 'disagall_test_open' }, '*');
    envMix.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timersMix.advanceBy(150);
    assert.deepStrictEqual(envMix.navigatedUrls, ['/view/?no=2999'], 'TC-HP-03: Smart photo navigation must skip text-only row 3000');
    console.log('✅ TC-HP-03 PASS: Built content.js dc_sample.html crt_icon/AD/survey filtering & smart photo skip verified');
  }

  // --- TC-HP-04: No-photo notice floating bar mount & continuation via button and S/W keys ---
  {
    const rows = [
      { numText: '2003', subjectText: '사진', href: 'test_page.html?no=1003', title: '이전 사진글', hasPhotoIcon: true },
      { numText: '2002', subjectText: '잡담', href: 'no_photo.html?no=2002', title: '사진 없는 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: false },
      { numText: '2001', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '다음 사진글', hasPhotoIcon: true },
    ];
    const timers = createFakeTimerEnv();
    const env = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/no_photo.html?no=2002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(env, timers);

    // Advance 15 * 150ms = 2250ms to exhaust auto-open polling
    timers.advanceBy(15 * 150);
    const notice = env.doc.getElementById('disagall-no-photo-notice');
    assert(notice, 'TC-HP-04: #disagall-no-photo-notice must mount after 15 empty polls');
    assert(notice._innerHTML.includes('본문에 사진이 없는 글입니다.'), 'TC-HP-04: Notice message must match spec');

    // Click next button -> dismisses notice & navigates down with disagall_auto_open=1
    env.doc.getElementById('disagall-notice-next').dispatchEvent('click');
    assert.strictEqual(env.doc.getElementById('disagall-no-photo-notice'), null, 'TC-HP-04: Clicking notice next must dismiss notice');
    assert.strictEqual(env.sessionStore.get('disagall_auto_open'), '1');
    timers.advanceBy(150);
    assert.deepStrictEqual(env.navigatedUrls, ['test_page_2.html?no=1002'], 'TC-HP-04: Notice next button must navigate to 2001');

    // Also verify W key on a fresh notice navigates up
    const timers2 = createFakeTimerEnv();
    const env2 = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/no_photo.html?no=2002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(env2, timers2);
    timers2.advanceBy(15 * 150);
    assert(env2.doc.getElementById('disagall-no-photo-notice'));
    env2.win.dispatchEvent({ type: 'keydown', key: 'w' });
    assert.strictEqual(env2.doc.getElementById('disagall-no-photo-notice'), null, 'TC-HP-04: W key must dismiss notice');
    timers2.advanceBy(150);
    assert.deepStrictEqual(env2.navigatedUrls, ['test_page.html?no=1003'], 'TC-HP-04: W key on notice must navigate up to 2003');
    console.log('✅ TC-HP-04 PASS: Built content.js no-photo notice mount & button/keyboard recovery verified');
  }

  console.log('\n🧪 Continuing Post Navigation Built-Bundle E2E Tests (Dimension B & C: Boundary & Negative)...\n');

  // --- TC-BD-01: Top & Bottom boundary toast without page navigation ---
  {
    const topRows = [
      { numText: '-', subjectText: '공지', href: '#', title: '공지사항' },
      { numText: '1003', subjectText: '사진', href: 'test_page.html?no=1003', title: '1번 글: 최신 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '2번 글: 골목길 스냅', hasPhotoIcon: true },
    ];
    const timersTop = createFakeTimerEnv();
    const envTop = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page.html?no=1003',
      listRows: topRows,
    });
    loadContentBundle(envTop, timersTop);
    envTop.win.postMessage({ action: 'disagall_test_open' }, '*');
    envTop.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    const toastTop = envTop.doc.getElementById('disagall-toast');
    assert(toastTop.classList.contains('show') && toastTop.textContent.includes('목록의 가장 최신 글입니다.'), 'TC-BD-01: Top boundary toast required');
    assert.strictEqual(envTop.sessionStore.has('disagall_auto_open'), false);
    timersTop.advanceBy(300);
    assert.strictEqual(envTop.navigatedUrls.length, 0, 'TC-BD-01: Top boundary must not navigate');

    const bottomRows = [
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '2번 글: 골목길 스냅', hasPhotoIcon: true },
      { numText: '-', subjectText: 'AD', href: '#', title: '광고 배너' },
      { numText: '1001', subjectText: '사진', href: 'test_page_3.html?no=1001', title: '3번 글: 마지막 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
    ];
    const timersBot = createFakeTimerEnv();
    const envBot = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page_3.html?no=1001',
      listRows: bottomRows,
    });
    loadContentBundle(envBot, timersBot);
    envBot.win.postMessage({ action: 'disagall_test_open' }, '*');
    envBot.win.dispatchEvent({ type: 'keydown', key: 's' });
    const toastBot = envBot.doc.getElementById('disagall-toast');
    assert(toastBot.classList.contains('show') && toastBot.textContent.includes('목록의 마지막 글입니다.'), 'TC-BD-01: Bottom boundary toast required');
    assert.strictEqual(envBot.sessionStore.has('disagall_auto_open'), false);
    timersBot.advanceBy(300);
    assert.strictEqual(envBot.navigatedUrls.length, 0, 'TC-BD-01: Bottom boundary must not navigate');
    console.log('✅ TC-BD-01 PASS: Top & bottom boundaries show toast without navigating');
  }

  // --- TC-BD-02: Non-photo fallback & mobile list (.gall-detail-lst li) navigation ---
  {
    const fallbackRows = [
      { numText: '4003', subjectText: '잡담', href: '/post?no=4003', title: '위쪽 일반 글', hasPhotoIcon: false },
      { numText: '4002', subjectText: '사진', href: '/post?no=4002', title: '현재 사진 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '4001', subjectText: '잡담', href: '/post?no=4001', title: '아래쪽 일반 글', hasPhotoIcon: false },
    ];
    const timersFb = createFakeTimerEnv();
    const envFb = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=test&no=4002',
      listRows: fallbackRows,
    });
    loadContentBundle(envFb, timersFb);
    envFb.win.postMessage({ action: 'disagall_test_open' }, '*');
    envFb.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    const fbToast = envFb.doc.getElementById('disagall-toast').textContent;
    assert(fbToast.includes('아래쪽 일반 글') && !fbToast.includes('📷'), 'TC-BD-02: Non-photo fallback toast must omit camera icon');
    timersFb.advanceBy(150);
    assert.deepStrictEqual(envFb.navigatedUrls, ['/post?no=4001'], 'TC-BD-02: Must fall back to adjacent non-photo post 4001');

    const mobileItems = [
      { className: 'notice', subjectText: '공지', href: '/m/9999', title: '모바일 공지' },
      { subjectText: 'AD', href: '/m/9998', title: '모바일 광고' },
      { href: '/m/5003', title: '모바일 위 사진글', hasPhotoIcon: true },
      { className: 'crt', href: '/m/5002', title: '모바일 현재글', hasPhotoIcon: true },
      { href: '/m/5001', title: '모바일 텍스트글', hasPhotoIcon: false },
      { href: '/m/5000', title: '모바일 아래 사진글', hasPhotoIcon: true },
    ];
    const timersMob = createFakeTimerEnv();
    const envMob = createPostNavDomEnvironment({
      currentUrl: 'https://m.dcinside.com/board/test/5002',
      mobileItems,
    });
    loadContentBundle(envMob, timersMob);
    envMob.win.postMessage({ action: 'disagall_test_open' }, '*');
    envMob.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timersMob.advanceBy(150);
    assert.deepStrictEqual(envMob.navigatedUrls, ['/m/5000'], 'TC-BD-02: Mobile .gall-detail-lst must skip AD/text and target 5000');
    console.log('✅ TC-BD-02 PASS: Adjacent non-photo fallback & mobile .gall-detail-lst navigation verified');
  }

  // --- TC-BD-03: Korean IME (KeyW/KeyS) & focused range slider pass-through ---
  {
    const rows = [
      { numText: '1003', subjectText: '사진', href: 'test_page.html?no=1003', title: '이전 글', hasPhotoIcon: true },
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '현재 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '1001', subjectText: '사진', href: 'test_page_3.html?no=1001', title: '다음 글', hasPhotoIcon: true },
    ];
    const timers = createFakeTimerEnv();
    const env = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page_2.html?no=1002',
      listRows: rows,
    });
    loadContentBundle(env, timers);
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const slider = env.doc.getElementById('disagall-slider');
    env.doc.activeElement = slider;

    // Korean IME 'ㄴ' (KeyS) while range slider is focused
    env.win.dispatchEvent({ type: 'keydown', key: 'ㄴ', code: 'KeyS', target: slider });
    timers.advanceBy(150);
    assert.deepStrictEqual(env.navigatedUrls, ['test_page_3.html?no=1001'], 'TC-BD-03: Korean IME KeyS on range slider must navigate down');

    // Korean IME 'ㅈ' (KeyW) on no-photo notice while range-like non-text focus
    const timersNotice = createFakeTimerEnv();
    const envNotice = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page_2.html?no=1002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(envNotice, timersNotice);
    timersNotice.advanceBy(15 * 150);
    assert(envNotice.doc.getElementById('disagall-no-photo-notice'));
    envNotice.win.dispatchEvent({ type: 'keydown', key: 'ㅈ', code: 'KeyW' });
    assert.strictEqual(envNotice.doc.getElementById('disagall-no-photo-notice'), null);
    timersNotice.advanceBy(150);
    assert.deepStrictEqual(envNotice.navigatedUrls, ['test_page.html?no=1003'], 'TC-BD-03: Korean IME KeyW on no-photo notice must navigate up');
    console.log('✅ TC-BD-03 PASS: Korean IME KeyW/KeyS & focused range slider pass-through verified');
  }

  // --- TC-BD-04: No-photo notice 8000ms auto-close & ESC/close button listener cleanup ---
  {
    const rows = [
      { numText: '6003', subjectText: '사진', href: 'test_page.html?no=1003', title: '이전 글', hasPhotoIcon: true },
      { numText: '6002', subjectText: '잡담', href: 'no_photo.html?no=6002', title: '현재 글', className: 'crt', hasCrtIcon: true },
      { numText: '6001', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '다음 글', hasPhotoIcon: true },
    ];

    // 1) 8000ms auto-close
    const timersAuto = createFakeTimerEnv();
    const envAuto = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/no_photo.html?no=6002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(envAuto, timersAuto);
    timersAuto.advanceBy(15 * 150);
    assert(envAuto.doc.getElementById('disagall-no-photo-notice'), 'TC-BD-04: Notice must mount');
    const keyCountWithNotice = (envAuto.windowListeners.keydown || []).length;
    timersAuto.advanceBy(7999);
    assert(envAuto.doc.getElementById('disagall-no-photo-notice'), 'TC-BD-04: Notice must stay visible at 7999ms');
    timersAuto.advanceBy(1);
    assert.strictEqual(envAuto.doc.getElementById('disagall-no-photo-notice'), null, 'TC-BD-04: Notice must auto-dismiss at 8000ms');
    assert.strictEqual((envAuto.windowListeners.keydown || []).length, keyCountWithNotice - 1, 'TC-BD-04: keydown listener must detach after 8000ms auto-dismiss');
    envAuto.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timersAuto.advanceBy(200);
    assert.strictEqual(envAuto.navigatedUrls.length, 0, 'TC-BD-04: Keys after 8s dismiss must not navigate');

    // 2) Escape dismiss
    const timersEsc = createFakeTimerEnv();
    const envEsc = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/no_photo.html?no=6002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(envEsc, timersEsc);
    timersEsc.advanceBy(15 * 150);
    const keyCountEsc = (envEsc.windowListeners.keydown || []).length;
    envEsc.win.dispatchEvent({ type: 'keydown', key: 'Escape' });
    assert.strictEqual(envEsc.doc.getElementById('disagall-no-photo-notice'), null, 'TC-BD-04: ESC must dismiss notice');
    assert.strictEqual((envEsc.windowListeners.keydown || []).length, keyCountEsc - 1, 'TC-BD-04: ESC must detach keydown listener');
    timersEsc.advanceBy(8500);
    envEsc.win.dispatchEvent({ type: 'keydown', key: 'w' });
    timersEsc.advanceBy(200);
    assert.strictEqual(envEsc.navigatedUrls.length, 0);

    // 3) Close button dismiss
    const timersBtn = createFakeTimerEnv();
    const envBtn = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/no_photo.html?no=6002',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(envBtn, timersBtn);
    timersBtn.advanceBy(15 * 150);
    const keyCountBtn = (envBtn.windowListeners.keydown || []).length;
    envBtn.doc.getElementById('disagall-notice-close').dispatchEvent('click');
    assert.strictEqual(envBtn.doc.getElementById('disagall-no-photo-notice'), null, 'TC-BD-04: Close button must dismiss notice');
    assert.strictEqual((envBtn.windowListeners.keydown || []).length, keyCountBtn - 1, 'TC-BD-04: Close button must detach keydown listener');
    timersBtn.advanceBy(8500);
    envBtn.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    timersBtn.advanceBy(200);
    assert.strictEqual(envBtn.navigatedUrls.length, 0);
    console.log('✅ TC-BD-04 PASS: 8000ms auto-dismiss & ESC/close button keydown listener cleanup verified');
  }

  // --- TC-NG-01: Negative shortcut guards (inactive, inputs, modifiers, repeat, external modal) ---
  {
    const rows = [
      { numText: '7003', subjectText: '사진', href: 'test_page.html?no=1003', title: '이전 글', hasPhotoIcon: true },
      { numText: '7002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '현재 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '7001', subjectText: '사진', href: 'test_page_3.html?no=1001', title: '다음 글', hasPhotoIcon: true },
    ];
    const timers = createFakeTimerEnv();
    const env = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page_2.html?no=1002',
      listRows: rows,
    });
    loadContentBundle(env, timers);

    // Inactive viewer -> create overlay then close -> ArrowDown ignored
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    env.doc.getElementById('disagall-close-btn').dispatchEvent('click');
    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timers.advanceBy(200);
    assert.strictEqual(env.navigatedUrls.length, 0, 'TC-NG-01: Inactive viewer must ignore navigation keys');

    // Re-open viewer for active guards
    env.win.postMessage({ action: 'disagall_test_open' }, '*');
    const textInput = env.createElement('input');
    textInput.type = 'text';
    const textArea = env.createElement('textarea');
    const selectEl = env.createElement('select');
    const ceDiv = env.createElement('div');
    ceDiv.isContentEditable = true;
    [textInput, textArea, selectEl, ceDiv].forEach((target) => {
      env.doc.activeElement = target;
      env.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown', target });
      env.win.dispatchEvent({ type: 'keydown', key: 'w', target });
    });
    env.doc.activeElement = env.doc.body;

    // Modifiers & repeat
    env.win.dispatchEvent({ type: 'keydown', key: 'w', ctrlKey: true });
    env.win.dispatchEvent({ type: 'keydown', key: 'w', metaKey: true });
    env.win.dispatchEvent({ type: 'keydown', key: 's', altKey: true });
    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown', repeat: true });

    // External modal
    const modal = env.createElement('dialog');
    modal.setAttribute('open', '');
    env.doc.body.appendChild(modal);
    env.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    modal.remove();

    timers.advanceBy(300);
    assert.strictEqual(env.navigatedUrls.length, 0, 'TC-NG-01: Editable, modifier, repeat, and modal guards must block navigation');
    assert.strictEqual(env.sessionStore.has('disagall_auto_open'), false);
    console.log('✅ TC-NG-01 PASS: Inactive, input, modifier, repeat & external modal guards verified');
  }

  // --- TC-NG-02: Disguised notice/AD/survey & unsafe schemes + Unavailable result ---
  {
    const maliciousRows = [
      { numText: '8005', subjectText: '일반', href: '/safe?no=8005', title: '위장 공지', className: 'notice_custom' },
      { numText: '8004', subjectText: '일반', href: 'javascript:alert(1)', title: 'JS XSS' },
      { numText: '8003', subjectText: '일반', href: 'java\tscript:alert(2)', title: 'Tab JS XSS' },
      { numText: '8002', subjectText: '사진', href: '/safe?no=8002', title: '현재 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '8001', subjectText: '일반', href: '/safe?no=8001', title: '마커 광고', markerClass: 'sp-ad' },
      { numText: '8000', subjectText: '일반', href: 'data:text/html,<script>alert(3)</script>', title: 'Data URI' },
      { numText: '7999', subjectText: '일반', href: '#', title: 'Hash' },
    ];
    const timersMal = createFakeTimerEnv();
    const envMal = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=test&no=8002',
      listRows: maliciousRows,
    });
    loadContentBundle(envMal, timersMal);
    envMal.win.postMessage({ action: 'disagall_test_open' }, '*');
    envMal.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    assert(envMal.doc.getElementById('disagall-toast').textContent.includes('목록의 가장 최신 글입니다.'), 'TC-NG-02: Disguised notice & JS hrefs must be filtered');
    envMal.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    assert(envMal.doc.getElementById('disagall-toast').textContent.includes('목록의 마지막 글입니다.'), 'TC-NG-02: Marker AD, data:, and # must be filtered');
    timersMal.advanceBy(300);
    assert.strictEqual(envMal.navigatedUrls.length, 0);

    // No list -> unavailable
    const timersNoList = createFakeTimerEnv();
    const envNoList = createPostNavDomEnvironment({
      currentUrl: 'https://gall.dcinside.com/mgallery/board/view/?id=test&no=9001',
      noList: true,
    });
    loadContentBundle(envNoList, timersNoList);
    envNoList.win.postMessage({ action: 'disagall_test_open' }, '*');
    envNoList.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    assert(envNoList.doc.getElementById('disagall-toast').textContent.includes('이동할 수 있는 게시글 목록을 찾을 수 없습니다.'));
    assert.strictEqual(envNoList.sessionStore.has('disagall_auto_open'), false);
    console.log('✅ TC-NG-02 PASS: Disguised notice/AD, unsafe schemes & unavailable handling verified');
  }

  // --- TC-NG-03: 150ms cancel (closeViewer / double-tap / pagehide) & polling vs manual openViewer ---
  {
    const rows = [
      { numText: '1003', subjectText: '사진', href: 'test_page.html?no=1003', title: '1번 글', className: 'crt', hasCrtIcon: true, hasPhotoIcon: true },
      { numText: '1002', subjectText: '사진', href: 'test_page_2.html?no=1002', title: '2번 글', hasPhotoIcon: true },
    ];

    // 1) closeViewer during 150ms delay
    const timersClose = createFakeTimerEnv();
    const envClose = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page.html?no=1003',
      listRows: rows,
    });
    loadContentBundle(envClose, timersClose);
    envClose.win.postMessage({ action: 'disagall_test_open' }, '*');
    envClose.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    assert.strictEqual(envClose.sessionStore.get('disagall_auto_open'), '1');
    timersClose.advanceBy(50);
    envClose.doc.getElementById('disagall-close-btn').dispatchEvent('click');
    assert.strictEqual(envClose.sessionStore.has('disagall_auto_open'), false, 'TC-NG-03: closeViewer must clear disagall_auto_open');
    timersClose.advanceBy(200);
    assert.strictEqual(envClose.navigatedUrls.length, 0, 'TC-NG-03: closeViewer must cancel pending 150ms navigation');

    // 2) Rapid double-tap (ArrowDown -> ArrowUp boundary at 50ms)
    const timersFlip = createFakeTimerEnv();
    const envFlip = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page.html?no=1003',
      listRows: rows,
    });
    loadContentBundle(envFlip, timersFlip);
    envFlip.win.postMessage({ action: 'disagall_test_open' }, '*');
    envFlip.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timersFlip.advanceBy(50);
    envFlip.win.dispatchEvent({ type: 'keydown', key: 'ArrowUp' });
    assert.strictEqual(envFlip.sessionStore.has('disagall_auto_open'), false, 'TC-NG-03: Second boundary tap must cancel first navigation');
    timersFlip.advanceBy(200);
    assert.strictEqual(envFlip.navigatedUrls.length, 0);

    // 3) pagehide during 150ms delay
    const timersHide = createFakeTimerEnv();
    const envHide = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/test_page.html?no=1003',
      listRows: rows,
    });
    loadContentBundle(envHide, timersHide);
    envHide.win.postMessage({ action: 'disagall_test_open' }, '*');
    envHide.win.dispatchEvent({ type: 'keydown', key: 'ArrowDown' });
    timersHide.advanceBy(50);
    envHide.win.dispatchEvent({ type: 'pagehide' });
    assert.strictEqual(envHide.sessionStore.has('disagall_auto_open'), false, 'TC-NG-03: pagehide must clear disagall_auto_open');
    timersHide.advanceBy(200);
    assert.strictEqual(envHide.navigatedUrls.length, 0, 'TC-NG-03: pagehide must cancel pending navigation');

    // 4) Polling vs manual openViewer race
    const timersRace = createFakeTimerEnv();
    const envRace = createPostNavDomEnvironment({
      currentUrl: 'http://127.0.0.1:18080/delayed.html?no=1003',
      images: [],
      listRows: rows,
      initialSession: { disagall_auto_open: '1' },
    });
    loadContentBundle(envRace, timersRace);
    timersRace.advanceBy(300);
    const raceImg = envRace.doc.createElement('img');
    raceImg.src = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1600&q=80';
    envRace.writeDiv.appendChild(raceImg);
    envRace.win.postMessage({ action: 'disagall_test_open' }, '*');
    assert(envRace.doc.getElementById('disagall-viewer-overlay').classList.contains('active'));
    timersRace.advanceBy(15 * 150);
    assert.strictEqual(envRace.doc.getElementById('disagall-no-photo-notice'), null, 'TC-NG-03: Manual openViewer must clear auto-open poll timer');
    console.log('✅ TC-NG-03 PASS: 150ms cancel (closeViewer/double-tap/pagehide) & polling vs manual openViewer race defended');
  }

  console.log('\n🎉 ALL POST NAVIGATION E2E TESTS (11/11: HAPPY PATH + BOUNDARY & NEGATIVE) PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ E2E test failed:', err);
  process.exit(1);
});
