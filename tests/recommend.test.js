// Unit & Integration Tests for Post Recommend feature (Disagall Viewer)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

function createRecommendMockDom() {
  const allElements = [];

  function matchesSimpleSelector(el, sel) {
    if (!el || !sel) return false;
    const trimmed = sel.trim();
    if (!trimmed) return false;

    // Handle descendant combinator (e.g., '.btn_recommend_box button.btn_recom_up')
    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/);
      const targetPart = parts[parts.length - 1];
      if (!matchesSimpleSelector(el, targetPart)) return false;
      let cur = el.parentElement;
      for (let i = parts.length - 2; i >= 0; i--) {
        while (cur && !matchesSimpleSelector(cur, parts[i])) {
          cur = cur.parentElement;
        }
        if (!cur) return false;
        cur = cur.parentElement;
      }
      return true;
    }

    // Parse compound selector: tag, #id, .class, [attr], [attr="val"], [attr*="val"], [attr^="val"]
    let rest = trimmed;
    const tagMatch = rest.match(/^[a-zA-Z][a-zA-Z0-9_-]*/);
    if (tagMatch) {
      if (el.tagName !== tagMatch[0].toUpperCase()) return false;
      rest = rest.slice(tagMatch[0].length);
    }

    while (rest.length > 0) {
      if (rest.startsWith('#')) {
        const m = rest.match(/^#([a-zA-Z0-9_-]+)/);
        if (!m || el.id !== m[1]) return false;
        rest = rest.slice(m[0].length);
      } else if (rest.startsWith('.')) {
        const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
        if (!m || !el.classList.contains(m[1])) return false;
        rest = rest.slice(m[0].length);
      } else if (rest.startsWith('[')) {
        const m = rest.match(/^\[([a-zA-Z0-9_-]+)(?:(\*|\^)?="([^"]*)")?\]/);
        if (!m) return false;
        const [, attrName, op, attrVal] = m;
        const actual = el.getAttribute(attrName);
        if (actual === null || actual === undefined) return false;
        if (op === '*') {
          if (!String(actual).includes(attrVal)) return false;
        } else if (op === '^') {
          if (!String(actual).startsWith(attrVal)) return false;
        } else if (attrVal !== undefined) {
          if (String(actual) !== attrVal) return false;
        }
        rest = rest.slice(m[0].length);
      } else {
        return false;
      }
    }
    return true;
  }

  function matchesSelectorList(el, selectorList) {
    if (!selectorList) return false;
    const list = Array.isArray(selectorList) ? selectorList : String(selectorList).split(',');
    return list.some((part) => matchesSimpleSelector(el, part));
  }

  function createElement(tagName, { id = '', classes = [], attrs = {}, textContent = '' } = {}) {
    const attrMap = { ...attrs };
    if (id) attrMap.id = id;
    const classSet = new Set(classes);
    const contentParts = [];
    if (textContent) contentParts.push(String(textContent));

    const el = {
      tagName: tagName.toUpperCase(),
      id,
      value: attrs.value !== undefined ? String(attrs.value) : '',
      disabled: Boolean(attrs.disabled) || Object.prototype.hasOwnProperty.call(attrs, 'disabled'),
      title: '',
      innerHTML: '',
      style: {},
      parentElement: null,
      children: [],
      get textContent() {
        return contentParts.map((part) => (typeof part === 'string' ? part : part.textContent)).join('');
      },
      set textContent(v) {
        contentParts.length = 0;
        el.children.length = 0;
        if (v !== null && v !== undefined && v !== '') {
          contentParts.push(String(v));
        }
      },
      appendText: (str) => {
        if (str) contentParts.push(String(str));
      },
      classList: {
        add: (...names) => names.forEach((n) => classSet.add(n)),
        remove: (...names) => names.forEach((n) => classSet.delete(n)),
        contains: (name) => classSet.has(name),
      },
      setAttribute: (k, v) => {
        attrMap[k] = String(v);
        if (k === 'id') el.id = String(v);
        if (k === 'disabled') el.disabled = true;
      },
      getAttribute: (k) => (Object.prototype.hasOwnProperty.call(attrMap, k) ? attrMap[k] : null),
      appendChild: (child) => {
        child.parentElement = el;
        el.children.push(child);
        contentParts.push(child);
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
    };
    allElements.push(el);
    return el;
  }

  const root = createElement('div', { id: 'mock-root' });

  function collectMatches(node, selectorList, out = []) {
    for (const child of node.children) {
      if (matchesSelectorList(child, selectorList)) out.push(child);
      collectMatches(child, selectorList, out);
    }
    return out;
  }

  const doc = {
    body: root,
    createElement: (tag) => createElement(tag),
    getElementById: (id) => allElements.find((el) => el.id === id) || null,
    querySelector: (selectorList) => collectMatches(root, selectorList)[0] || null,
    querySelectorAll: (selectorList) => collectMatches(root, selectorList),
  };

  return { doc, root, createElement };
}

const VOID_HTML_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
]);

function createDomFromHtml(html) {
  const { doc, root, createElement } = createRecommendMockDom();
  const cleaned = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  const stack = [root];
  const tagRegex = /<(\/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?)\s*(\/?)>/g;
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      stack[stack.length - 1].appendText(cleaned.slice(lastIndex, match.index));
    }
    lastIndex = tagRegex.lastIndex;

    const [, isClosing, rawTagName, rawAttrs = '', explicitSelfClose] = match;
    const tagName = rawTagName.toLowerCase();

    if (isClosing) {
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tagName.toLowerCase() === tagName) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    const attrSource = rawAttrs.replace(/\/\s*$/, '');
    const isSelfClosing = Boolean(explicitSelfClose) || /\/\s*$/.test(rawAttrs) || VOID_HTML_TAGS.has(tagName);
    const attrs = {};
    const attrRegex = /([a-zA-Z_:][a-zA-Z0-9_.:-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`/]+)))?/g;
    let attrMatch;
    while ((attrMatch = attrRegex.exec(attrSource)) !== null) {
      const [, attrName, dblVal, sglVal, bareVal] = attrMatch;
      const val = dblVal !== undefined ? dblVal : (sglVal !== undefined ? sglVal : (bareVal !== undefined ? bareVal : ''));
      attrs[attrName] = val;
    }

    const id = attrs.id || '';
    const classes = attrs.class ? attrs.class.trim().split(/\s+/).filter(Boolean) : [];
    const el = createElement(tagName, { id, classes, attrs });
    stack[stack.length - 1].appendChild(el);

    if (!isSelfClosing) {
      stack.push(el);
    }
  }

  if (lastIndex < cleaned.length) {
    stack[stack.length - 1].appendText(cleaned.slice(lastIndex));
  }

  return { doc, root };
}

function withMockedGlobals({ doc, initialNow = 1000000 } = {}, fn) {
  const origDoc = global.document;
  const origWindow = global.window;
  const origSetTimeout = global.setTimeout;
  const origClearTimeout = global.clearTimeout;
  const origNow = Date.now;
  const origMouseEvent = global.MouseEvent;

  let currentNow = initialNow;
  let nextTimerId = 1;
  const activeTimers = new Map();
  const scheduledTimers = [];

  global.document = doc;
  global.window = doc;
  Date.now = () => currentNow;
  global.setTimeout = (cb, delay) => {
    const id = nextTimerId++;
    const entry = { id, cb, delay };
    activeTimers.set(id, entry);
    scheduledTimers.push(entry);
    return id;
  };
  global.clearTimeout = (id) => {
    activeTimers.delete(id);
  };

  const helpers = {
    advanceTime: (ms) => { currentNow += ms; },
    setTime: (ms) => { currentNow = ms; },
    runTimerByDelay: (delay) => {
      const entries = Array.from(activeTimers.values()).filter((entry) => entry.delay === delay);
      for (const entry of entries) {
        activeTimers.delete(entry.id);
        entry.cb();
      }
      return entries.length;
    },
    activeTimers,
    scheduledTimers,
  };

  try {
    return fn(helpers);
  } finally {
    global.document = origDoc;
    global.window = origWindow;
    global.setTimeout = origSetTimeout;
    global.clearTimeout = origClearTimeout;
    Date.now = origNow;
    global.MouseEvent = origMouseEvent;
  }
}

console.log('🧪 Starting Post Recommend Unit & Integration Tests...\n');

async function runAllRecommendTests() {
  const {
    RECOMMEND_BUTTON_SELECTORS,
    RECOMMEND_BUTTON_PRIORITY_SELECTORS,
    getPostRecommendCount,
    getNativeRecommendButton,
    isRecommendButtonDisabled,
    isUserLoggedIn,
    isGalleryCodeEnforced,
    dispatchRecommendClick,
  } = await import('../src/parser/recommend_parser.js');
  const {
    triggerPostRecommend,
    updateRecommendButtonUi,
    clearRecommendTimers,
    resetRecommendSessionState,
  } = await import('../src/controller/recommend_controller.js');
  const { closeViewer } = await import('../src/controller/viewer_controller.js');
  const { CONFIG } = await import('../src/config.js');
  const { state } = await import('../src/state.js');

  function setupControllerScene({
    active = true,
    count = 7,
    hasNativeBtn = true,
    nativeDisabled = false,
    isLoggedIn = true,
    isCodeEnforced = false,
    viewerBtnVoted = false,
  } = {}) {
    const { doc, root, createElement } = createRecommendMockDom();
    const overlay = createElement('div', {
      id: 'disagall-viewer-overlay',
      classes: active ? ['active'] : [],
    });
    const viewerRecommendBtn = createElement('button', {
      id: 'disagall-btn-recommend',
      classes: viewerBtnVoted
        ? ['disagall-btn', 'disagall-btn-recommend', 'voted']
        : ['disagall-btn', 'disagall-btn-recommend'],
    });
    const toastEl = createElement('div', { id: 'disagall-toast' });
    overlay.appendChild(viewerRecommendBtn);
    overlay.appendChild(toastEl);
    root.appendChild(overlay);

    const loginInput = createElement('input', {
      id: 'is_login',
      attrs: { type: 'hidden', name: 'is_login', value: isLoggedIn ? 'Y' : 'N' },
    });
    const kcaptchaInput = createElement('input', {
      id: 'kcaptcha_use',
      attrs: { type: 'hidden', name: 'kcaptcha_use', value: isCodeEnforced ? 'Y' : 'N' },
    });
    root.appendChild(loginInput);
    root.appendChild(kcaptchaInput);

    let countEl = null;
    if (count !== null) {
      countEl = createElement('p', {
        id: 'recommend_view_up_2041711',
        classes: ['up_num', 'font_red'],
        textContent: String(count),
      });
      root.appendChild(countEl);
    }

    let nativeBtn = null;
    let nativeClicks = 0;
    if (hasNativeBtn) {
      const recomBox = createElement('div', { classes: ['btn_recommend_box'] });
      nativeBtn = createElement('button', {
        classes: ['btn_recom_up', 'on'],
        attrs: {
          'data-no': '2041711',
          ...(nativeDisabled ? { disabled: '' } : {}),
        },
      });
      nativeBtn.click = () => { nativeClicks++; };
      recomBox.appendChild(nativeBtn);
      root.appendChild(recomBox);
    }

    const prevElements = { ...state.elements };
    state.elements.overlayEl = overlay;
    state.elements.recommendBtnEl = viewerRecommendBtn;
    state.elements.toastEl = toastEl;

    return {
      doc,
      overlay,
      viewerRecommendBtn,
      toastEl,
      countEl,
      nativeBtn,
      getNativeClicks: () => nativeClicks,
      restoreElements: () => {
        resetRecommendSessionState();
        state.elements = prevElements;
        state.toastTimer = null;
      },
    };
  }

  // Test 1: Real getPostRecommendCount(doc)
  {
    assert.strictEqual(
      getPostRecommendCount(createDomFromHtml('<p class="up_num font_red" id="recommend_view_up_2041711">7</p>').doc),
      7,
      'Test 1.1 failed: standard desktop recommend count'
    );
    assert.strictEqual(
      getPostRecommendCount(createDomFromHtml('<span class="recom_num">42</span>').doc),
      42,
      'Test 1.2 failed: mobile recommend count'
    );
    assert.strictEqual(
      getPostRecommendCount(createDomFromHtml('<div class="up_num_box"><p class="up_num"> 0 </p></div>').doc),
      0,
      'Test 1.3 failed: zero recommend count'
    );
    assert.strictEqual(
      getPostRecommendCount(createDomFromHtml('<div>no counts here</div>').doc),
      null,
      'Test 1.4 failed: non-existent count should return null'
    );
    assert.strictEqual(
      getPostRecommendCount(createDomFromHtml('<div id="disagall-viewer-overlay"><span class="recom_num">99</span></div>').doc),
      null,
      'Test 1.5 failed: overlay-internal count must be excluded'
    );

    console.log('✅ Test 1: real getPostRecommendCount() passed all cases');
  }

  // Test 2: Real getNativeRecommendButton(doc) & isRecommendButtonDisabled(btn)
  {
    const desktopDoc = createDomFromHtml(
      '<button type="button" class="btn_recom_up on" data-no="2041711"><span class="blind">개념 추천</span></button>'
    ).doc;
    assert(getNativeRecommendButton(desktopDoc), 'Desktop recommend button match failed');

    const mobileDoc = createDomFromHtml('<button type="button" class="btn-recom">추천</button>').doc;
    assert(getNativeRecommendButton(mobileDoc), 'Mobile recommend button match failed');

    const anchorDoc = createDomFromHtml('<a href="javascript:;" onclick="recom_up(\'123\')" class="btn_recommend">추천</a>').doc;
    assert(getNativeRecommendButton(anchorDoc), 'Anchor tag recommend match failed');

    const divDoc = createDomFromHtml('<div class="btn_recom_up" role="button">추천</div>').doc;
    assert(getNativeRecommendButton(divDoc), 'Div tag recommend match failed');

    const dataActionDoc = createDomFromHtml('<button data-action="recommend">개추</button>').doc;
    assert(getNativeRecommendButton(dataActionDoc), 'data-action recommend match failed');

    const regularDoc = createDomFromHtml('<button type="button" class="btn_close">닫기</button>').doc;
    assert.strictEqual(getNativeRecommendButton(regularDoc), null, 'Regular button should not match');

    const fieldsetDisabledDoc = createDomFromHtml('<fieldset disabled><button class="btn_recom_up">추천</button></fieldset>').doc;
    const disabledBtn = getNativeRecommendButton(fieldsetDisabledDoc);
    assert.strictEqual(isRecommendButtonDisabled(disabledBtn), true, 'Button inside disabled fieldset must be disabled');

    console.log('✅ Test 2: real getNativeRecommendButton() & isRecommendButtonDisabled() passed all cases');
  }

  // Test 3: Real triggerPostRecommend() — !active guard, throttle, alreadyVoted, midTimer & afterTimer UI sync
  {
    // 3.1 Inactive viewer (!active) must return false without clicking native button
    {
      const scene = setupControllerScene({ active: false, count: 7 });
      try {
        withMockedGlobals({ doc: scene.doc }, ({ scheduledTimers }) => {
          const result = triggerPostRecommend();
          assert.strictEqual(result, false, 'Inactive viewer (!active) must return false');
          assert.strictEqual(scene.getNativeClicks(), 0, 'Inactive viewer must NOT click native recommend button');
          assert.strictEqual(scene.toastEl.textContent, '', 'Inactive viewer must NOT show toast');
          assert.strictEqual(scheduledTimers.length, 0, 'Inactive viewer must NOT schedule timers');
        });
      } finally {
        scene.restoreElements();
      }
    }

    // 3.2 Missing native button guard
    {
      const scene = setupControllerScene({ active: true, hasNativeBtn: false });
      try {
        withMockedGlobals({ doc: scene.doc }, () => {
          const result = triggerPostRecommend();
          assert.strictEqual(result, false, 'Missing native button must return false');
          assert.strictEqual(scene.toastEl.textContent, '본문의 추천 버튼을 찾을 수 없습니다.');
        });
      } finally {
        scene.restoreElements();
      }
    }

    // 3.3 midTimer (500ms) & afterTimer (1200ms) count-up .voted UI sync + hasVotedCurrentPost guard
    {
      const scene = setupControllerScene({ active: true, count: 7 });
      try {
        withMockedGlobals({ doc: scene.doc }, ({ advanceTime, runTimerByDelay, scheduledTimers }) => {
          const result = triggerPostRecommend();
          assert.strictEqual(result, true, 'First valid recommend must return true');
          assert.strictEqual(scene.getNativeClicks(), 1, 'Native button must be clicked once');
          assert.strictEqual(scene.toastEl.textContent, '개념글 추천을 눌렀습니다! 👍');

          const syncDelays = scheduledTimers.map((t) => t.delay);
          assert(syncDelays.includes(CONFIG.RECOMMEND_SYNC_DELAYS[0]), '500ms midTimer must be scheduled');
          assert(syncDelays.includes(CONFIG.RECOMMEND_SYNC_DELAYS[1]), '1200ms afterTimer must be scheduled');
          assert(syncDelays.includes(500), '500ms unlockTimer must be scheduled');

          // While isRecommending is true (before unlock timer), re-trigger returns false immediately
          assert.strictEqual(triggerPostRecommend(), false, 'Concurrent call while isRecommending must return false');
          assert.strictEqual(scene.getNativeClicks(), 1, 'Concurrent call must NOT click native button');

          // Simulate DC DOM count increment at 500ms and fire midTimer + unlockTimer
          scene.countEl.textContent = '8';
          advanceTime(500);
          runTimerByDelay(CONFIG.RECOMMEND_SYNC_DELAYS[0]);

          assert(scene.viewerRecommendBtn.classList.contains('voted'), 'midTimer must add .voted class on count increase');
          assert(scene.viewerRecommendBtn.innerHTML.includes('개추 (8)'), 'midTimer must sync button UI count to 8');
          assert.strictEqual(scene.toastEl.textContent, '개념글 추천이 완료되었습니다! 👍');

          // Fire afterTimer at 1200ms
          advanceTime(700);
          runTimerByDelay(CONFIG.RECOMMEND_SYNC_DELAYS[1]);
          assert(scene.viewerRecommendBtn.classList.contains('voted'), 'afterTimer must keep .voted class');

          // After throttle window passes, hasVotedCurrentPost blocks duplicate click
          advanceTime(CONFIG.RECOMMEND_THROTTLE_MS);
          const alreadyRes = triggerPostRecommend();
          assert.strictEqual(alreadyRes, true, 'Already voted call returns true with guidance toast');
          assert.strictEqual(scene.toastEl.textContent, '이미 개념글 추천을 완료한 게시글입니다. 👍');
          assert.strictEqual(scene.getNativeClicks(), 1, 'Already voted call must NOT click native button again');
        });
      } finally {
        scene.restoreElements();
      }
    }

    // 3.4 .voted class & disabled button alreadyVoted guards
    {
      const votedScene = setupControllerScene({ active: true, viewerBtnVoted: true });
      try {
        withMockedGlobals({ doc: votedScene.doc }, () => {
          assert.strictEqual(triggerPostRecommend(), true);
          assert.strictEqual(votedScene.toastEl.textContent, '이미 개념글 추천을 완료한 게시글입니다. 👍');
          assert.strictEqual(votedScene.getNativeClicks(), 0);
        });
      } finally {
        votedScene.restoreElements();
      }

      const disabledScene = setupControllerScene({ active: true, nativeDisabled: true });
      try {
        withMockedGlobals({ doc: disabledScene.doc }, () => {
          assert.strictEqual(triggerPostRecommend(), true);
          assert.strictEqual(disabledScene.toastEl.textContent, '이미 개념글 추천을 완료한 게시글입니다. 👍');
          assert.strictEqual(disabledScene.getNativeClicks(), 0);
        });
      } finally {
        disabledScene.restoreElements();
      }
    }

    // 3.5 CONFIG.RECOMMEND_THROTTLE_MS (1200ms) throttling guard
    {
      const scene = setupControllerScene({ active: true, count: 7 });
      try {
        withMockedGlobals({ doc: scene.doc }, ({ advanceTime, runTimerByDelay }) => {
          assert.strictEqual(triggerPostRecommend(), true);
          assert.strictEqual(scene.getNativeClicks(), 1);

          // Advance 600ms (< 1200ms) and run 500ms unlockTimer so isRecommending is false, only throttle applies
          advanceTime(600);
          runTimerByDelay(500);

          const throttled = triggerPostRecommend();
          assert.strictEqual(throttled, false, 'Call within CONFIG.RECOMMEND_THROTTLE_MS (1200ms) must be throttled');
          assert.strictEqual(scene.toastEl.textContent, '잠시 후 다시 시도해 주세요.');
          assert.strictEqual(scene.getNativeClicks(), 1, 'Throttled call must NOT click native button');

          // Advance past 1200ms -> throttle lifted
          advanceTime(CONFIG.RECOMMEND_THROTTLE_MS);
          assert.strictEqual(triggerPostRecommend(), true, 'Call after CONFIG.RECOMMEND_THROTTLE_MS should proceed');
          assert.strictEqual(scene.getNativeClicks(), 2);
        });
      } finally {
        scene.restoreElements();
      }
    }

    console.log('✅ Test 3: real triggerPostRecommend() guards, throttling, and timer UI sync passed');
  }

  // Test 4: Real isUserLoggedIn(), isGalleryCodeEnforced(), updateRecommendButtonUi(), and non-member lock toast fallback
  {
    const loggedInDoc = createDomFromHtml(
      '<input type="hidden" id="is_login" value="Y"><input type="hidden" id="kcaptcha_use" value="N"><p class="up_num">10</p>'
    ).doc;
    assert.strictEqual(isUserLoggedIn(loggedInDoc), true, 'User with is_login=Y should be logged in');
    assert.strictEqual(isGalleryCodeEnforced(loggedInDoc), false, 'Gallery with kcaptcha_use=N should not enforce code');

    const nonMemberDoc = createDomFromHtml(
      '<input type="hidden" id="is_login" value="N"><input type="hidden" id="kcaptcha_use" value="Y"><a class="btn_top_loginout">로그인</a><p class="up_num">10</p>'
    ).doc;
    assert.strictEqual(isUserLoggedIn(nonMemberDoc), false, 'User with is_login=N should be non-member');
    assert.strictEqual(isGalleryCodeEnforced(nonMemberDoc), true, 'Gallery with kcaptcha_use=Y must enforce code');

    // Verify updateRecommendButtonUi() count & 🔒 rendering
    {
      const scene = setupControllerScene({ active: true, count: 10, isLoggedIn: true, isCodeEnforced: false });
      try {
        withMockedGlobals({ doc: scene.doc }, () => {
          updateRecommendButtonUi();
          assert(scene.viewerRecommendBtn.innerHTML.includes('개추 (10)'), 'Logged-in UI must render count');
          assert(!scene.viewerRecommendBtn.innerHTML.includes('🔒'), 'Logged-in UI must NOT render lock icon');
          assert.strictEqual(scene.viewerRecommendBtn.title, '개념글 추천 (단축키: R)');
        });
      } finally {
        scene.restoreElements();
      }

      const lockedScene = setupControllerScene({ active: true, count: 10, isLoggedIn: false, isCodeEnforced: true });
      try {
        withMockedGlobals({ doc: lockedScene.doc }, () => {
          updateRecommendButtonUi();
          assert(lockedScene.viewerRecommendBtn.innerHTML.includes('개추 (10) 🔒'), 'Non-member code-enforced UI must render count + 🔒');
          assert(lockedScene.viewerRecommendBtn.title.includes('비회원 코드/로그인 제한 갤러리'));

          // Trigger recommend without count increase -> immediate notice + afterTimer non-member lock toast fallback
          lockedScene.viewerRecommendBtn.classList.add('voted');
          const res = triggerPostRecommend();
          assert.strictEqual(res, true);
          assert.strictEqual(lockedScene.toastEl.textContent, '이미 개념글 추천을 완료한 게시글입니다. 👍');
        });
      } finally {
        lockedScene.restoreElements();
      }

      // Fresh non-member code-enforced recommend with unchanged count on afterTimer (1200ms)
      const fallbackScene = setupControllerScene({ active: true, count: 10, isLoggedIn: false, isCodeEnforced: true });
      try {
        withMockedGlobals({ doc: fallbackScene.doc }, ({ advanceTime, runTimerByDelay }) => {
          const ok = triggerPostRecommend();
          assert.strictEqual(ok, true);
          assert.strictEqual(fallbackScene.toastEl.textContent, '개추 시도 중... (비회원 코드 제한 가능 🔒)');

          // Pre-mark voted to verify afterTimer rolls back .voted when count doesn't increase
          fallbackScene.viewerRecommendBtn.classList.add('voted');
          advanceTime(CONFIG.RECOMMEND_SYNC_DELAYS[1]);
          runTimerByDelay(CONFIG.RECOMMEND_SYNC_DELAYS[1]);

          assert(!fallbackScene.viewerRecommendBtn.classList.contains('voted'), 'afterTimer must remove .voted when non-member recommend fails');
          assert.strictEqual(
            fallbackScene.toastEl.textContent,
            '로그인이 필요한 갤러리입니다. (비회원 추천 제한 🔒)'
          );
        });
      } finally {
        fallbackScene.restoreElements();
      }
    }

    console.log('✅ Test 4: real login/code detection, updateRecommendButtonUi() 🔒 rendering, and non-member lock fallback passed');
  }

  // Test 5: Integration Test on live_post.html (optional fixture if present)
  const localLivePostPath = path.join(__dirname, 'fixtures', 'live_post.html');
  if (fs.existsSync(localLivePostPath)) {
    try {
      const liveHtml = fs.readFileSync(localLivePostPath, 'utf-8');
      const { doc } = createDomFromHtml(liveHtml);
      const count = getPostRecommendCount(doc);
      const hasBtn = Boolean(getNativeRecommendButton(doc));

      assert.strictEqual(count, 7, 'Live HTML recommend count must be 7');
      assert.strictEqual(hasBtn, true, 'Live HTML must contain native recommend button');

      console.log(`✅ Test 5: Live HTML integration (count: ${count}, hasButton: ${hasBtn}) passed`);
    } catch (e) {
      if (e && (e.code === 'ENOENT' || e.code === 'EACCES')) {
        console.log('⚠️ Test 5: Skipped live fixture due to access restrictions');
      } else {
        throw e;
      }
    }
  } else {
    console.log('ℹ️ Test 5: Optional live_post.html fixture not found, skipping');
  }

  // Test 6: Integration Test on dc_sample.html (1968506) via real parser + DOM mock
  const dcSamplePath = path.join(__dirname, '..', 'dc_sample.html');
  if (fs.existsSync(dcSamplePath)) {
    const sampleHtml = fs.readFileSync(dcSamplePath, 'utf-8');
    const { doc } = createDomFromHtml(sampleHtml);
    const count = getPostRecommendCount(doc);
    const nativeBtn = getNativeRecommendButton(doc);

    assert.strictEqual(count, 6, 'Sample HTML recommend count must be 6');
    assert(nativeBtn, 'Sample HTML must contain native recommend button');
    assert.strictEqual(nativeBtn.getAttribute('data-no'), '1968506', 'Sample HTML must match real recommend button');

    // Verify dc_sample.html login and code status (non-member + kcaptcha_use=Y)
    assert.strictEqual(isUserLoggedIn(doc), false, 'Sample HTML should be non-member');
    assert.strictEqual(isGalleryCodeEnforced(doc), true, 'Sample HTML has kcaptcha_use=Y enforced');

    console.log(`✅ Test 6: Sample HTML integration (count: ${count}, hasButton: ${Boolean(nativeBtn)}, nonMember: true, codeEnforced: true) passed`);
  } else {
    assert.fail(`Required fixture missing: ${dcSamplePath}`);
  }

  // Test 7: Real dispatchRecommendClick(btn) single-dispatch & fallback verification
  {
    let clickCount = 0;
    let dispatchEventCount = 0;
    const mockBtn = {
      click: () => { clickCount++; },
      dispatchEvent: () => { dispatchEventCount++; return true; },
    };

    const dispatched = dispatchRecommendClick(mockBtn);
    assert.strictEqual(dispatched, true);
    assert.strictEqual(clickCount, 1, 'Native click must be called exactly once');
    assert.strictEqual(dispatchEventCount, 0, 'dispatchEvent must NOT be called when native click succeeds (prevents double-click 1일 1회 duplicate alert)');

    // Fallback branch test: when click throws, MouseEvent dispatchEvent is used
    const origMouseEvent = global.MouseEvent;
    let fallbackDispatchCount = 0;
    let capturedEventType = null;
    try {
      global.MouseEvent = class MockMouseEvent {
        constructor(type, init) {
          this.type = type;
          this.init = init;
        }
      };
      const brokenBtn = {
        click: () => { throw new Error('Click failed'); },
        dispatchEvent: (evt) => {
          fallbackDispatchCount++;
          capturedEventType = evt && evt.type;
          return true;
        },
      };

      const fallbackResult = dispatchRecommendClick(brokenBtn);
      assert.strictEqual(fallbackResult, true);
      assert.strictEqual(fallbackDispatchCount, 1, 'dispatchEvent fallback must be called exactly once when click throws');
      assert.strictEqual(capturedEventType, 'click', 'Fallback must dispatch click MouseEvent');
    } finally {
      global.MouseEvent = origMouseEvent;
    }

    assert.strictEqual(dispatchRecommendClick({ isConnected: false, click: () => {} }), false, 'Disconnected button must return false');

    console.log('✅ Test 7: real dispatchRecommendClick() single-dispatch verification passed');
  }

  // Test 8: DEFECT-03 Red-to-Green regression tests against real src/ modules
  {
    // 8.1 Must NOT self-match #disagall-btn-recommend inside #disagall-viewer-overlay
    {
      const { doc, root, createElement } = createRecommendMockDom();
      const overlay = createElement('div', { id: 'disagall-viewer-overlay' });
      const viewerBtn = createElement('button', {
        id: 'disagall-btn-recommend',
        classes: ['disagall-btn', 'disagall-btn-recommend'],
      });
      overlay.appendChild(viewerBtn);
      root.appendChild(overlay);

      const matched = getNativeRecommendButton(doc);
      assert.strictEqual(
        matched,
        null,
        'DEFECT-03: getNativeRecommendButton must NOT self-match #disagall-btn-recommend'
      );
    }

    // 8.2 Must NOT match non-recommend buttons (scrap close, silbechu, report, goList, downvote)
    {
      const { doc, root, createElement } = createRecommendMockDom();
      const scrapCloseBtn = createElement('button', {
        classes: ['poply_bgblueclose'],
        attrs: { onclick: "$(this).closest('#scrapdone_non_recom').remove();" },
      });
      const recomBox = createElement('div', { classes: ['btn_recommend_box'] });
      const downBtn = createElement('button', { classes: ['btn_recom_down'], attrs: { 'data-no': '1968506' } });
      const silbechuBtn = createElement('button', { classes: ['btn_silbechu'], attrs: { 'data-no': '1968506' } });
      const reportBtn = createElement('button', { classes: ['btn_report'], attrs: { 'data-no': '1968506' } });
      const goListBtn = createElement('button', {
        classes: ['btn_white', 'concept'],
        attrs: { onclick: "goList('/mgallery/board/lists/?id=digitalpicture&exception_mode=recommend')" },
      });
      recomBox.appendChild(downBtn);
      recomBox.appendChild(silbechuBtn);
      recomBox.appendChild(reportBtn);
      root.appendChild(scrapCloseBtn);
      root.appendChild(recomBox);
      root.appendChild(goListBtn);

      assert.strictEqual(
        getNativeRecommendButton(doc),
        null,
        'DEFECT-03: Must NOT falsely match scrap close, downvote, silbechu, report, or goList buttons'
      );
      assert(
        !RECOMMEND_BUTTON_PRIORITY_SELECTORS.includes('button[data-no]') &&
        !RECOMMEND_BUTTON_PRIORITY_SELECTORS.includes('button[onclick*="recom"]') &&
        !RECOMMEND_BUTTON_PRIORITY_SELECTORS.includes('a[onclick*="recom"]') &&
        !RECOMMEND_BUTTON_PRIORITY_SELECTORS.includes('button[id*="recommend"]') &&
        !RECOMMEND_BUTTON_PRIORITY_SELECTORS.includes('.btn_recommend_box button'),
        'DEFECT-03: Overly broad selectors must be removed from RECOMMEND_BUTTON_PRIORITY_SELECTORS'
      );
    }

    // 8.3 Must match in selector priority order, not document order, and skip #disagall-viewer-overlay
    {
      const { doc, root, createElement } = createRecommendMockDom();
      const overlay = createElement('div', { id: 'disagall-viewer-overlay' });
      const viewerBtn = createElement('button', {
        id: 'disagall-btn-recommend',
        classes: ['btn_recom_up'],
      });
      overlay.appendChild(viewerBtn);

      const lowerPriorityBtn = createElement('a', { classes: ['btn_recommend'] });
      const recomBox = createElement('div', { classes: ['btn_recommend_box'] });
      const nativeBtn = createElement('button', {
        classes: ['btn_recom_up', 'on'],
        attrs: { 'data-no': '1968506' },
      });
      recomBox.appendChild(nativeBtn);

      root.appendChild(overlay);
      root.appendChild(lowerPriorityBtn);
      root.appendChild(recomBox);

      assert(
        Array.isArray(RECOMMEND_BUTTON_PRIORITY_SELECTORS),
        'DEFECT-03: RECOMMEND_BUTTON_PRIORITY_SELECTORS must be an ordered priority array'
      );
      assert.strictEqual(
        typeof RECOMMEND_BUTTON_SELECTORS,
        'string',
        'RECOMMEND_BUTTON_SELECTORS string export must remain backwards-compatible'
      );
      assert.strictEqual(
        getNativeRecommendButton(doc),
        nativeBtn,
        'DEFECT-03: Must skip overlay and select highest-priority native button over earlier lower-priority match'
      );
    }

    // 8.4 getPostRecommendCount exclusion & dispatchRecommendClick guards
    {
      const { doc, root, createElement } = createRecommendMockDom();
      const overlay = createElement('div', { id: 'disagall-viewer-overlay' });
      const fakeCount = createElement('span', { classes: ['recom_num'], textContent: '999' });
      overlay.appendChild(fakeCount);
      const realCount = createElement('p', {
        id: 'recommend_view_up_1968506',
        classes: ['up_num'],
        textContent: '6',
      });
      root.appendChild(overlay);
      root.appendChild(realCount);

      assert.strictEqual(
        getPostRecommendCount(doc),
        6,
        'getPostRecommendCount must exclude overlay elements and use priority order'
      );

      const viewerBtn = createElement('button', { id: 'disagall-btn-recommend' });
      overlay.appendChild(viewerBtn);
      assert.strictEqual(
        dispatchRecommendClick(viewerBtn),
        false,
        'dispatchRecommendClick must reject viewer-internal buttons'
      );
      const disabledAnchor = createElement('a', {
        classes: ['btn_recom_up'],
        attrs: { 'aria-disabled': 'true' },
      });
      assert.strictEqual(
        dispatchRecommendClick(disabledAnchor),
        false,
        'dispatchRecommendClick must reject aria-disabled elements'
      );
    }

    // 8.5 triggerPostRecommend must NOT conceal dispatchRecommendClick() failure & closeViewer cleans timers
    {
      const { doc, root, createElement } = createRecommendMockDom();
      const overlay = createElement('div', { id: 'disagall-viewer-overlay', classes: ['active'] });
      const viewerRecommendBtn = createElement('button', {
        id: 'disagall-btn-recommend',
        classes: ['disagall-btn', 'disagall-btn-recommend'],
      });
      const toastEl = createElement('div', { id: 'disagall-toast' });
      overlay.appendChild(viewerRecommendBtn);
      overlay.appendChild(toastEl);

      const countEl = createElement('p', {
        id: 'recommend_view_up_1968506',
        classes: ['up_num'],
        textContent: '6',
      });
      const failingNativeBtn = createElement('button', {
        classes: ['btn_recom_up'],
        attrs: { 'data-no': '1968506' },
      });
      failingNativeBtn.dispatchEvent = () => false;

      root.appendChild(overlay);
      root.appendChild(countEl);
      root.appendChild(failingNativeBtn);

      const prevElements = { ...state.elements };
      state.elements.overlayEl = overlay;
      state.elements.recommendBtnEl = viewerRecommendBtn;
      state.elements.toastEl = toastEl;

      try {
        resetRecommendSessionState();
        withMockedGlobals({ doc }, ({ scheduledTimers }) => {
          const failResult = triggerPostRecommend();
          assert.strictEqual(
            failResult,
            false,
            'DEFECT-03: triggerPostRecommend must return false when dispatchRecommendClick returns false'
          );
          assert(
            !toastEl.textContent.includes('개념글 추천을 눌렀습니다'),
            `DEFECT-03: Must NOT display success toast when dispatch failed (got: "${toastEl.textContent}")`
          );
          assert(
            CONFIG.RECOMMEND_SYNC_DELAYS.every((delay) => !scheduledTimers.some((t) => t.delay === delay)),
            'DEFECT-03: Must NOT schedule 500ms/1200ms sync timers when dispatch failed'
          );

          // Verify normal success path immediately after failed attempt (must not be stuck throttled/locked)
          scheduledTimers.length = 0;
          let clicked = 0;
          failingNativeBtn.click = () => { clicked++; };
          const okResult = triggerPostRecommend();
          assert.strictEqual(okResult, true, 'Successful dispatch after failure must return true');
          assert.strictEqual(clicked, 1, 'Native button click must fire once');
          assert(
            toastEl.textContent.includes('개념글 추천을 눌렀습니다'),
            'Success path must display recommend toast'
          );
          assert(
            CONFIG.RECOMMEND_SYNC_DELAYS.every((delay) => scheduledTimers.some((t) => t.delay === delay)),
            'Success path must schedule 500ms and 1200ms count sync timers'
          );
          assert.strictEqual(state.recommendTimers.length, 2, 'Sync timers must be registered in state.recommendTimers');

          // Verify closeViewer() cancels pending recommend timers & unlock lock
          closeViewer();
          assert.strictEqual(state.recommendTimers.length, 0, 'closeViewer() must clear state.recommendTimers');
          assert.strictEqual(state.recommendUnlockTimer, null, 'closeViewer() must clear state.recommendUnlockTimer');
        });
      } finally {
        clearRecommendTimers();
        resetRecommendSessionState();
        state.elements = prevElements;
        state.toastTimer = null;
      }
    }

    console.log('✅ Test 8: DEFECT-03 selector exclusion, priority order, dispatch failure & timer cleanup passed');
  }
}

runAllRecommendTests()
  .then(() => {
    console.log('\n🎉 ALL RECOMMEND UNIT & INTEGRATION TESTS PASSED! 🎉');
  })
  .catch((err) => {
    console.error('❌ Recommend test failed:', err);
    process.exit(1);
  });
