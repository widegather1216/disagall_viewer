// Unit Tests for Post Navigation logic (Disagall Viewer)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const DC_SAMPLE_PATH = path.join(__dirname, '..', 'dc_sample.html');

function createPostNavMockDom() {
  function makeClassList(classNameStr = '') {
    const tokens = new Set(String(classNameStr).split(/\s+/).filter(Boolean));
    return {
      contains: (c) => tokens.has(c),
      add: (...cs) => cs.forEach((c) => tokens.add(c)),
      remove: (...cs) => cs.forEach((c) => tokens.delete(c)),
    };
  }

  function makeDesktopRow({
    className = 'ub-content',
    numText = '',
    subjectText = '',
    href = '/mgallery/board/view/?id=digitalpicture&no=100',
    rawHref = href,
    title = '게시글',
    hasCrtIcon = false,
    hasPicIcon = false,
    extraSelectorMatches = [],
    innerHTML = '',
    dataset = {},
  } = {}) {
    const titLink = href !== null ? {
      href,
      textContent: title,
      getAttribute: (name) => (name === 'href' ? rawHref : null),
    } : null;
    const numEl = { textContent: numText };
    const subjectEl = { textContent: subjectText };
    const selectorMap = new Map();
    for (const entry of extraSelectorMatches) {
      if (typeof entry === 'string') {
        selectorMap.set(entry, { className: entry.replace(/^\./, '') });
      } else if (entry && entry.selector) {
        selectorMap.set(entry.selector, entry.el || { className: entry.selector.replace(/^\./, '') });
      }
    }
    if (hasCrtIcon) selectorMap.set('.crt_icon', { className: 'crt_icon' });
    if (hasPicIcon) selectorMap.set('.icon_pic', { className: 'icon_pic' });

    return {
      className,
      classList: makeClassList(className),
      innerHTML,
      dataset,
      querySelector(sel) {
        if (sel.includes('.gall_tit a')) return titLink;
        if (sel === 'a') return titLink;
        if (sel === '.gall_num') return numEl;
        if (sel === '.gall_subject') return subjectEl;
        for (const [token, el] of selectorMap.entries()) {
          if (sel.split(',').some((part) => part.trim() === token)) return el;
        }
        return null;
      },
    };
  }

  function makeMobileItem({
    className = '',
    href = 'https://m.dcinside.com/board/digitalpicture/100',
    rawHref = href,
    title = '모바일 글',
    numText = '',
    subjectText = '',
    extraSelectorMatches = [],
  } = {}) {
    const link = href !== null ? {
      href,
      textContent: title,
      getAttribute: (name) => (name === 'href' ? rawHref : null),
    } : null;
    const selectorMap = new Map();
    for (const entry of extraSelectorMatches) {
      if (typeof entry === 'string') {
        selectorMap.set(entry, { className: entry.replace(/^\./, '') });
      } else if (entry && entry.selector) {
        selectorMap.set(entry.selector, entry.el || { className: entry.selector.replace(/^\./, '') });
      }
    }

    return {
      className,
      classList: makeClassList(className),
      querySelector(sel) {
        if (sel === 'a' || sel.includes('a:not')) return link;
        if (numText && sel === '.gall_num') return { textContent: numText };
        if (subjectText && sel.includes('.gall_subject')) return { textContent: subjectText };
        for (const [token, el] of selectorMap.entries()) {
          if (sel.split(',').some((part) => part.trim() === token)) return el;
        }
        return null;
      },
    };
  }

  function createRoot({ desktopRows = [], mobileItems = [] } = {}) {
    return {
      querySelectorAll(sel) {
        if (sel.includes('table.gall_list')) return desktopRows;
        if (sel.includes('.gall-detail-lst')) return mobileItems;
        return [];
      },
    };
  }

  function parseHtmlRowsToMockDom(html) {
    const trMatches = [...html.matchAll(/<tr\s+class="ub-content\s*([^"]*)"[\s\S]*?<\/tr>/g)];
    const rows = trMatches.map((m) => {
      const trHtml = m[0];
      const trClass = `ub-content ${m[1]}`.trim();
      const numMatch = trHtml.match(/<td\s+class="gall_num"[^>]*>([\s\S]*?)<\/td>/);
      const numText = numMatch ? numMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const subMatch = trHtml.match(/<td\s+class="gall_subject"[^>]*>([\s\S]*?)<\/td>/);
      const subjectText = subMatch ? subMatch[1].replace(/<[^>]+>/g, '').trim() : '';
      const linkMatch = trHtml.match(/<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      const rawHref = linkMatch ? linkMatch[1] : '';
      const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : '';
      const hasCrtIcon = trHtml.includes('crt_icon');
      const hasPicIcon = trHtml.includes('icon_pic') || trHtml.includes('icon_recomimg');
      const extraSelectorMatches = [];
      for (const marker of ['.icon_ad', '.icon_notice', '.icon_survey', '.sp-ad', '.sp-notice', '.sp-survey']) {
        if (trHtml.includes(marker.slice(1))) extraSelectorMatches.push(marker);
      }

      return makeDesktopRow({
        className: trClass,
        numText,
        subjectText,
        href: rawHref || null,
        rawHref,
        title,
        hasCrtIcon,
        hasPicIcon,
        extraSelectorMatches,
        innerHTML: trHtml,
      });
    });
    return { rows, root: createRoot({ desktopRows: rows }) };
  }

  return { makeClassList, makeDesktopRow, makeMobileItem, createRoot, parseHtmlRowsToMockDom };
}

// --- Test Suite ---
console.log('🧪 Starting Post Navigation Unit Tests...\n');

// Tests 1–7: Real src/parser/post_navigator.js unit & fixture integration tests
async function runParserUnitTests() {
  const {
    extractPostNo,
    isDesktopPostRowValid,
    isMobilePostItemValid,
    getValidPostRows,
    findCurrentPostRowIndex,
    hasPhotoAttachment,
    getAdjacentPostUrl,
  } = await import('../src/parser/post_navigator.js');

  const {
    makeDesktopRow,
    makeMobileItem,
    createRoot,
    parseHtmlRowsToMockDom,
  } = createPostNavMockDom();

  // Test 1: extractPostNo
  {
    assert.strictEqual(
      extractPostNo('https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506&page=1'),
      '1968506',
      'Test 1.1 failed: standard DC view URL'
    );
    assert.strictEqual(
      extractPostNo('https://m.dcinside.com/board/digitalpicture/1968506'),
      '1968506',
      'Test 1.2 failed: mobile DC URL path format'
    );
    assert.strictEqual(
      extractPostNo('test_page_2.html?no=1002'),
      '1002',
      'Test 1.3 failed: relative URL query'
    );
    assert.strictEqual(
      extractPostNo('https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1'),
      '2041711',
      'Test 1.4 failed: live DC view URL with search_head'
    );
    assert.strictEqual(
      extractPostNo('https://gall.dcinside.com/mgallery/board/lists/?id=digitalpicture'),
      null,
      'Test 1.5 failed: non-post list URL should return null'
    );
    assert.strictEqual(extractPostNo(''), null, 'Test 1.6 failed: empty URL should return null');
    console.log('✅ Test 1: extractPostNo passed all cases');
  }

  // Test 2: Actual DC behavior where current post numText is empty (DEFECT-01) & mobile row validation
  {
    const surveyRow = makeDesktopRow({ numText: '-', subjectText: '설문', href: 'javascript:;', title: '설문' });
    const adRow = makeDesktopRow({ numText: '-', subjectText: 'AD', href: 'https://coupang.com', title: '광고' });
    const upRow = makeDesktopRow({ numText: '2041719', subjectText: '사진', href: '/view/?id=digitalpicture&no=2041719', title: '위쪽 최신 글', hasPicIcon: true });
    // In real DC, current post row has NO numeric text, class may be "crt>" and has crt_icon
    const crtRow = makeDesktopRow({
      className: 'ub-content crt>',
      numText: '',
      subjectText: '사진',
      href: '/view/?id=digitalpicture&no=2041711&search_head=10&page=1',
      title: '현재 열람 중인 글',
      hasCrtIcon: true,
      hasPicIcon: true,
    });
    const downRow = makeDesktopRow({ numText: '2041707', subjectText: '사진', href: '/view/?id=digitalpicture&no=2041707', title: '아래쪽 이전 글', hasPicIcon: true });

    const currentPostNo = '2041711';
    const currentUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1';
    assert.strictEqual(isDesktopPostRowValid(surveyRow, currentPostNo), false, 'Survey row must be excluded');
    assert.strictEqual(isDesktopPostRowValid(adRow, currentPostNo), false, 'AD row must be excluded');
    assert.strictEqual(isDesktopPostRowValid(crtRow, currentPostNo), true, 'DEFECT-01: Empty numText current row must remain valid');

    const desktopRoot = createRoot({ desktopRows: [surveyRow, adRow, upRow, crtRow, downRow] });
    const validRows = getValidPostRows(currentPostNo, desktopRoot);
    assert.strictEqual(validRows.length, 3, 'Valid rows must retain current post and exclude AD & 설문');
    assert.strictEqual(findCurrentPostRowIndex(validRows, currentPostNo), 1, 'Current post index must be 1');

    const upResult = getAdjacentPostUrl('up', true, currentUrl, desktopRoot);
    assert.strictEqual(upResult.ok, true);
    assert.strictEqual(upResult.url, '/view/?id=digitalpicture&no=2041719');
    assert.strictEqual(upResult.title, '위쪽 최신 글');

    const downResult = getAdjacentPostUrl('down', true, currentUrl, desktopRoot);
    assert.strictEqual(downResult.ok, true);
    assert.strictEqual(downResult.url, '/view/?id=digitalpicture&no=2041707');
    assert.strictEqual(downResult.title, '아래쪽 이전 글');

    // Mobile list validation & fallback via getValidPostRows / getAdjacentPostUrl
    const mobileAd = makeMobileItem({ className: 'ad', href: 'https://ad.example.com', title: '광고' });
    const mobileUp = makeMobileItem({
      href: 'https://m.dcinside.com/board/digitalpicture/2041719',
      title: '모바일 최신 사진 글',
      extraSelectorMatches: ['.sp-lst-img'],
    });
    const mobileCrt = makeMobileItem({
      href: 'https://m.dcinside.com/board/digitalpicture/2041711',
      title: '모바일 현재 글',
    });
    assert.strictEqual(isMobilePostItemValid(mobileAd), false, 'Mobile AD item must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileUp), true, 'Mobile photo item must be valid');

    const mobileRoot = createRoot({ mobileItems: [mobileAd, mobileUp, mobileCrt] });
    const validMobileRows = getValidPostRows(currentPostNo, mobileRoot);
    assert.strictEqual(validMobileRows.length, 2, 'Mobile getValidPostRows must retain valid items');
    assert.strictEqual(findCurrentPostRowIndex(validMobileRows, currentPostNo), 1);
    const mobileUpResult = getAdjacentPostUrl('up', true, 'https://m.dcinside.com/board/digitalpicture/2041711', mobileRoot);
    assert.strictEqual(mobileUpResult.ok, true);
    assert.strictEqual(mobileUpResult.url, 'https://m.dcinside.com/board/digitalpicture/2041719');
    assert.strictEqual(mobileUpResult.hasPhoto, true);

    console.log('✅ Test 2: Real DC empty-numText current row & mobile handling (DEFECT-01) passed');
  }

  // Test 3: Top & Bottom boundaries
  {
    const boundaryRoot = createRoot({
      desktopRows: [
        makeDesktopRow({ className: 'ub-content crt>', numText: '', subjectText: '사진', href: '/view/?no=2', title: '최신 글', hasCrtIcon: true, hasPicIcon: true }),
        makeDesktopRow({ numText: '1', subjectText: '사진', href: '/view/?no=1', title: '이전 글', hasPicIcon: true }),
      ],
    });
    const currentUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2';

    const topRes = getAdjacentPostUrl('up', true, currentUrl, boundaryRoot);
    assert.strictEqual(topRes.ok, false);
    assert.strictEqual(topRes.status, 'boundary');
    assert.strictEqual(topRes.error, 'top');

    const downRes = getAdjacentPostUrl('down', true, currentUrl, boundaryRoot);
    assert.strictEqual(downRes.ok, true);
    assert.strictEqual(downRes.url, '/view/?no=1');

    console.log('✅ Test 3: Boundaries passed');
  }

  // Test 4: Live HTML Regression Test (optional fixture if present)
  const localLivePostPath = path.join(__dirname, 'fixtures/live_post.html');
  if (fs.existsSync(localLivePostPath)) {
    try {
      const liveHtml = fs.readFileSync(localLivePostPath, 'utf-8');
      const liveUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1';
      const { root } = parseHtmlRowsToMockDom(liveHtml);
      const validRows = getValidPostRows('2041711', root);

      assert.strictEqual(validRows.length, 50, 'Live HTML should have exactly 50 valid post rows');
      assert.strictEqual(findCurrentPostRowIndex(validRows, '2041711'), 5, 'Current post (2041711) must be at index 5');

      const up = getAdjacentPostUrl('up', true, liveUrl, root);
      assert.strictEqual(up.ok, true);
      assert.strictEqual(up.url, '/mgallery/board/view/?id=digitalpicture&no=2041719&search_head=10&page=1');
      assert.strictEqual(up.title, '4pic) 오늘은 사진이 찍고싶었어');

      const down = getAdjacentPostUrl('down', true, liveUrl, root);
      assert.strictEqual(down.ok, true);
      assert.strictEqual(down.url, '/mgallery/board/view/?id=digitalpicture&no=2041707&search_head=10&page=1');
      assert.strictEqual(down.title, '사진입문전 폰카로 찍은 홋카이도 - 11pic');

      console.log('✅ Test 4: Live HTML integration test (post 2041711) passed');
    } catch (e) {
      if (e && (e.code === 'ENOENT' || e.code === 'EACCES')) {
        console.log('⚠️ Test 4: Skipped live fixture due to access restrictions');
      } else {
        throw e;
      }
    }
  } else {
    console.log('ℹ️ Test 4: Optional live_post.html fixture not found, skipping');
  }

  // Test 5: Sample DC HTML Regression Test (dc_sample.html)
  if (fs.existsSync(DC_SAMPLE_PATH)) {
    const sampleHtml = fs.readFileSync(DC_SAMPLE_PATH, 'utf-8');
    const sampleUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506';
    const { root } = parseHtmlRowsToMockDom(sampleHtml);
    const validRows = getValidPostRows('1968506', root);

    assert.strictEqual(validRows.length, 50, 'Sample HTML should have 50 valid post rows');
    assert.strictEqual(findCurrentPostRowIndex(validRows, '1968506'), 18, 'Current post (1968506) must be at index 18');

    const up = getAdjacentPostUrl('up', true, sampleUrl, root);
    assert.strictEqual(up.ok, true);
    assert.strictEqual(up.url, '/mgallery/board/view/?id=digitalpicture&no=1968509&search_head=10&page=1');
    assert.strictEqual(up.title, '니가타 1일차');

    const down = getAdjacentPostUrl('down', true, sampleUrl, root);
    assert.strictEqual(down.ok, true);
    assert.strictEqual(down.url, '/mgallery/board/view/?id=digitalpicture&no=1968505&search_head=10&page=1');
    assert.strictEqual(down.title, '베짱이 한 장(징그러움주의)');

    console.log('✅ Test 5: Sample HTML integration test (post 1968506) passed');
  }

  // Test 6: hasPhotoAttachment() & Boards WITHOUT a photo tab - Smart Photo Navigation
  {
    assert.strictEqual(hasPhotoAttachment(null), false, 'null row must return false');
    assert.strictEqual(hasPhotoAttachment(makeDesktopRow({ subjectText: '사진' })), true, 'subject 사진 must return true');
    assert.strictEqual(hasPhotoAttachment(makeDesktopRow({ hasPicIcon: true })), true, '.icon_pic must return true');
    assert.strictEqual(hasPhotoAttachment(makeMobileItem({ extraSelectorMatches: ['.sp-lst-img'] })), true, 'mobile .sp-lst-img must return true');
    assert.strictEqual(
      hasPhotoAttachment(makeDesktopRow({ extraSelectorMatches: [{ selector: '.icon_img', el: { className: 'icon_img' } }] })),
      true,
      'generic .icon_img must return true'
    );
    assert.strictEqual(
      hasPhotoAttachment(makeDesktopRow({ extraSelectorMatches: [{ selector: '.icon_img', el: { className: 'icon_img icon_txt' } }] })),
      false,
      '.icon_img.icon_txt must return false'
    );

    const mixedBoardRoot = createRoot({
      desktopRows: [
        makeDesktopRow({ numText: '105', subjectText: '잡담', hasPicIcon: true, href: '/view/?no=105', title: '출사 다녀왔음 (사진)' }),
        makeDesktopRow({ numText: '104', subjectText: '잡담', hasPicIcon: false, href: '/view/?no=104', title: '렌즈 추천 좀 해주라' }),
        makeDesktopRow({ className: 'ub-content crt>', numText: '', subjectText: '일반', hasCrtIcon: true, hasPicIcon: true, href: '/view/?no=103', title: '오늘 찍은 풍경 (현재 글)' }),
        makeDesktopRow({ numText: '102', subjectText: '질문', hasPicIcon: false, href: '/view/?no=102', title: '질문) 조리개 값 어떻게 둠?' }),
        makeDesktopRow({ numText: '101', subjectText: '일반', hasPicIcon: false, href: '/view/?no=101', title: '오늘 날씨 좋네' }),
        makeDesktopRow({ numText: '100', subjectText: '일반', hasPicIcon: true, href: '/view/?no=100', title: '제주도 노을 스냅 (사진)' }),
      ],
    });
    const currentUrl = 'https://gall.dcinside.com/board/view/?id=camera&no=103';
    const validRows = getValidPostRows('103', mixedBoardRoot);
    assert.strictEqual(findCurrentPostRowIndex(validRows, '103'), 2, 'Current post index must be 2');

    // DOWN navigation with preferPhotos = true (should skip 102, 101 text posts and jump directly to 100)
    const downPhotoResult = getAdjacentPostUrl('down', true, currentUrl, mixedBoardRoot);
    assert.strictEqual(downPhotoResult.ok, true);
    assert.strictEqual(downPhotoResult.url, '/view/?no=100', 'Should skip text posts and land on photo post 100');
    assert.strictEqual(downPhotoResult.hasPhoto, true);
    assert.strictEqual(downPhotoResult.title, '제주도 노을 스냅 (사진)');

    // UP navigation with preferPhotos = true (should skip 104 text post and jump to 105)
    const upPhotoResult = getAdjacentPostUrl('up', true, currentUrl, mixedBoardRoot);
    assert.strictEqual(upPhotoResult.ok, true);
    assert.strictEqual(upPhotoResult.url, '/view/?no=105', 'Should skip text post 104 and land on photo post 105');
    assert.strictEqual(upPhotoResult.hasPhoto, true);

    console.log('✅ Test 6: Boards without photo tab - Smart Photo Navigation (auto-skipping text posts) passed');
  }

  // Test 7: Fallback to regular post when no photo post remains in that direction
  {
    const textOnlyAheadRoot = createRoot({
      desktopRows: [
        makeDesktopRow({ className: 'ub-content crt>', numText: '', subjectText: '일반', hasCrtIcon: true, hasPicIcon: true, href: '/view/?no=202', title: '현재 글' }),
        makeDesktopRow({ numText: '201', subjectText: '잡담', hasPicIcon: false, href: '/view/?no=201', title: '텍스트 글 1' }),
        makeDesktopRow({ numText: '200', subjectText: '잡담', hasPicIcon: false, href: '/view/?no=200', title: '텍스트 글 2' }),
      ],
    });

    const fallbackResult = getAdjacentPostUrl('down', true, 'https://gall.dcinside.com/board/view/?id=camera&no=202', textOnlyAheadRoot);
    assert.strictEqual(fallbackResult.ok, true);
    assert.strictEqual(fallbackResult.url, '/view/?no=201', 'Should fallback to immediate next row when no photo posts remain');
    assert.strictEqual(fallbackResult.hasPhoto, false);

    console.log('✅ Test 7: Fallback to adjacent post when no photo posts remain passed');
  }
}

// Test 8: DEFECT-02 showNoPhotoNotice() listener/timer leak & input/modifier shortcut guard
async function runDefect02Tests() {
  const { showNoPhotoNotice, dismissNoPhotoNotice } = await import('../src/ui/overlay.js');
  const { state } = await import('../src/state.js');
  const { closeViewer } = await import('../src/controller/viewer_controller.js');

  function createNoticeTestEnv() {
    const winListeners = new Map();
    const timers = new Map();
    let nextTimerId = 1;
    let bodyChildren = [];
    let openModal = null;

    function createNode(tagName, id = '', className = '') {
      const listeners = {};
      const node = {
        tagName: tagName.toUpperCase(),
        id,
        className,
        children: [],
        parentNode: null,
        addEventListener(ev, fn) {
          if (!listeners[ev]) listeners[ev] = [];
          listeners[ev].push(fn);
        },
        dispatchEvent(evObj) {
          (listeners[evObj.type] || []).forEach((fn) => fn(evObj));
        },
        querySelector(sel) {
          if (sel.startsWith('#')) {
            const targetId = sel.slice(1);
            return node.children.find((c) => c.id === targetId) || null;
          }
          return null;
        },
        remove() {
          if (node.parentNode) {
            bodyChildren = bodyChildren.filter((c) => c !== node);
            node.parentNode = null;
          }
        },
      };
      return node;
    }

    const body = {
      appendChild(child) {
        child.parentNode = body;
        bodyChildren.push(child);
        return child;
      },
    };

    const doc = {
      activeElement: null,
      body,
      getElementById(id) {
        return bodyChildren.find((c) => c.id === id) || null;
      },
      querySelector(sel) {
        if (sel.includes('dialog[open]')) return openModal;
        return null;
      },
      createElement(tag) {
        const node = createNode(tag);
        let htmlCache = '';
        Object.defineProperty(node, 'innerHTML', {
          get: () => htmlCache,
          set: (html) => {
            htmlCache = html;
            if (html.includes('disagall-notice-close')) {
              const prevBtn = createNode('button', 'disagall-notice-prev');
              const nextBtn = createNode('button', 'disagall-notice-next');
              const closeBtn = createNode('button', 'disagall-notice-close');
              node.children.push(prevBtn, nextBtn, closeBtn);
            }
          },
        });
        return node;
      },
    };

    const win = {
      addEventListener(ev, fn) {
        if (!winListeners.has(ev)) winListeners.set(ev, new Set());
        winListeners.get(ev).add(fn);
      },
      removeEventListener(ev, fn) {
        if (winListeners.has(ev)) winListeners.get(ev).delete(fn);
      },
      dispatchKey(evProps) {
        let prevented = false;
        const ev = {
          type: 'keydown',
          ctrlKey: false,
          metaKey: false,
          altKey: false,
          repeat: false,
          target: { tagName: 'BODY' },
          preventDefault() { prevented = true; },
          stopPropagation() {},
          ...evProps,
        };
        const listeners = Array.from(winListeners.get('keydown') || []);
        listeners.forEach((fn) => fn(ev));
        return { prevented };
      },
    };

    const fakeSetTimeout = (fn) => {
      const id = nextTimerId++;
      timers.set(id, fn);
      return id;
    };
    const fakeClearTimeout = (id) => {
      timers.delete(id);
    };

    return {
      doc,
      win,
      fakeSetTimeout,
      fakeClearTimeout,
      setOpenModal: (modal) => { openModal = modal; },
      getKeyListenerCount: () => (winListeners.get('keydown') || new Set()).size,
      getActiveTimerCount: () => timers.size,
      getBodyChildCount: () => bodyChildren.length,
      runAllTimers: () => {
        const pending = Array.from(timers.entries());
        timers.clear();
        pending.forEach(([, fn]) => fn());
      },
    };
  }

  const origWindow = global.window;
  const origDocument = global.document;
  const origSetTimeout = global.setTimeout;
  const origClearTimeout = global.clearTimeout;

  const env = createNoticeTestEnv();
  global.window = env.win;
  global.document = env.doc;
  global.setTimeout = env.fakeSetTimeout;
  global.clearTimeout = env.fakeClearTimeout;

  try {
    // 8.1 Close button click must remove DOM, keydown listener, and timer
    let navCalls = [];
    showNoPhotoNotice((dir) => navCalls.push(dir));
    assert.strictEqual(env.getBodyChildCount(), 1, 'Notice element must be mounted');
    assert.strictEqual(env.getKeyListenerCount(), 1, 'One keydown listener must be attached');
    assert.strictEqual(env.getActiveTimerCount(), 1, 'One timeout must be scheduled');

    const closeBtn = env.doc.getElementById('disagall-no-photo-notice').querySelector('#disagall-notice-close');
    closeBtn.dispatchEvent({ type: 'click' });
    assert.strictEqual(env.getBodyChildCount(), 0, 'Close button must remove notice element');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'DEFECT-02: Close button must remove keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'DEFECT-02: Close button must clear pending timeout');
    env.win.dispatchKey({ key: 'w' });
    assert.strictEqual(navCalls.length, 0, 'DEFECT-02: Keydown after close must not trigger navigation');

    // 8.2 Duplicate showNoPhotoNotice() must clean up previous listener and timer
    const firstCalls = [];
    const secondCalls = [];
    showNoPhotoNotice((dir) => firstCalls.push(dir));
    showNoPhotoNotice((dir) => secondCalls.push(dir));
    assert.strictEqual(env.getBodyChildCount(), 1, 'Duplicate call must keep only 1 notice element');
    assert.strictEqual(env.getKeyListenerCount(), 1, 'DEFECT-02: Duplicate call must not leak prior keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 1, 'DEFECT-02: Duplicate call must clear prior timeout');
    env.win.dispatchKey({ key: 'w' });
    assert.deepStrictEqual(firstCalls, [], 'DEFECT-02: Stale notice callback must not fire after duplicate call');
    assert.deepStrictEqual(secondCalls, ['up'], 'Active notice callback must fire once');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'Navigation key must clean up listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'Navigation key must clear timeout');

    // 8.3 Editable targets (INPUT/TEXTAREA/SELECT/contentEditable) must be ignored
    navCalls = [];
    showNoPhotoNotice((dir) => navCalls.push(dir));
    const editableTargets = [
      { tagName: 'INPUT', type: 'text' },
      { tagName: 'TEXTAREA' },
      { tagName: 'SELECT' },
      { tagName: 'DIV', isContentEditable: true },
    ];
    for (const target of editableTargets) {
      for (const key of ['w', 's', 'ArrowUp', 'ArrowDown']) {
        const res = env.win.dispatchKey({ key, target });
        assert.strictEqual(res.prevented, false, `DEFECT-02: Editable target (${target.tagName}) must not call preventDefault for ${key}`);
      }
    }
    assert.strictEqual(navCalls.length, 0, 'DEFECT-02: Typing in editable targets must not trigger navigation');
    assert.strictEqual(env.getKeyListenerCount(), 1, 'Editable target guard must keep notice active');

    // 8.4 Modifier keys (Cmd+W / Ctrl+W / Alt+S / Ctrl+ArrowUp) must be ignored
    const modifierCombos = [
      { key: 'w', metaKey: true },
      { key: 'w', ctrlKey: true },
      { key: 's', altKey: true },
      { key: 'ArrowUp', ctrlKey: true },
      { key: 'ArrowDown', metaKey: true },
    ];
    for (const combo of modifierCombos) {
      const res = env.win.dispatchKey(combo);
      assert.strictEqual(res.prevented, false, `DEFECT-02: Modifier combo (${JSON.stringify(combo)}) must not call preventDefault`);
    }
    assert.strictEqual(navCalls.length, 0, 'DEFECT-02: Modifier shortcuts (e.g. Cmd+W) must not trigger navigation');
    assert.strictEqual(env.getKeyListenerCount(), 1, 'Modifier guard must keep notice active');

    // 8.5 Escape key must dismiss DOM, listener, and timer
    env.win.dispatchKey({ key: 'Escape' });
    assert.strictEqual(env.getBodyChildCount(), 0, 'Escape must remove notice element');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'Escape must remove keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'Escape must clear pending timeout');

    // 8.6 Auto-timeout & prev/next button click cleanup
    showNoPhotoNotice((dir) => navCalls.push(dir));
    env.runAllTimers();
    assert.strictEqual(env.getBodyChildCount(), 0, 'Timeout must remove notice element');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'Timeout must remove keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'Timeout must leave 0 active timers');

    showNoPhotoNotice((dir) => navCalls.push(dir));
    const prevBtn = env.doc.getElementById('disagall-no-photo-notice').querySelector('#disagall-notice-prev');
    prevBtn.dispatchEvent({ type: 'click' });
    assert.deepStrictEqual(navCalls, ['up'], 'Prev button must invoke navigation callback');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'Prev button click must clean up keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'Prev button click must clear pending timeout');
    assert.strictEqual(state.noPhotoNoticeTimer, null, 'state.noPhotoNoticeTimer must be cleared to null');

    // 8.7 Repeat, external modal, active overlay, Korean IME KeyS, re-entrancy & closeViewer() cleanup
    navCalls = [];
    showNoPhotoNotice((dir) => navCalls.push(dir));
    assert(state.noPhotoNoticeTimer !== null, 'Timer ID must be registered on state.noPhotoNoticeTimer');

    // Repeat event guard
    assert.strictEqual(env.win.dispatchKey({ key: 'w', repeat: true }).prevented, false);
    // External modal guard
    env.setOpenModal({ tagName: 'DIALOG' });
    assert.strictEqual(env.win.dispatchKey({ key: 'w' }).prevented, false);
    env.setOpenModal(null);
    // Active overlay guard
    const prevOverlayEl = state.elements.overlayEl;
    state.elements.overlayEl = { classList: { contains: (c) => c === 'active', remove() {} }, contains: () => false };
    assert.strictEqual(env.win.dispatchKey({ key: 'w' }).prevented, false);
    state.elements.overlayEl = prevOverlayEl;
    assert.strictEqual(navCalls.length, 0, 'Repeat/modal/active-overlay guards must block navigation');

    // Korean IME e.code ('KeyS') fallback
    const imeRes = env.win.dispatchKey({ key: 'ㄴ', code: 'KeyS' });
    assert.strictEqual(imeRes.prevented, true, 'Korean IME KeyS must trigger down navigation');
    assert.deepStrictEqual(navCalls, ['down']);

    // Re-entrant callback spawning another notice must keep new notice active
    showNoPhotoNotice(() => {
      showNoPhotoNotice(() => {});
    });
    env.win.dispatchKey({ key: 'w' });
    assert.strictEqual(env.getBodyChildCount(), 1, 'Re-entrant notice must remain mounted');
    assert.strictEqual(env.getKeyListenerCount(), 1, 'Re-entrant notice listener must remain attached');
    assert.strictEqual(env.getActiveTimerCount(), 1, 'Re-entrant notice timer must remain scheduled');

    // closeViewer() must clean up active notice DOM, listener, and state timer
    closeViewer();
    assert.strictEqual(env.getBodyChildCount(), 0, 'closeViewer() must dismiss active notice');
    assert.strictEqual(env.getKeyListenerCount(), 0, 'closeViewer() must remove notice keydown listener');
    assert.strictEqual(env.getActiveTimerCount(), 0, 'closeViewer() must clear notice timeout');
    assert.strictEqual(state.noPhotoNoticeTimer, null, 'closeViewer() must clear state.noPhotoNoticeTimer');
    dismissNoPhotoNotice();

    console.log('✅ Test 8: DEFECT-02 showNoPhotoNotice() cleanup & shortcut guardrails passed');
  } finally {
    global.window = origWindow;
    global.document = origDocument;
    global.setTimeout = origSetTimeout;
    global.clearTimeout = origClearTimeout;
  }
}

// Test 9: DEFECT-03 bottom boundary, AD/notice/survey innerHTML bypass, and javascript: URL sanitization (real src/ modules)
async function runDefect03Tests() {
  const {
    extractPostNo: realExtractPostNo,
    isSafeNavigationHref,
    isDesktopPostRowValid,
    isMobilePostItemValid,
    getValidPostRows,
    findCurrentPostRowIndex,
    getAdjacentPostUrl,
  } = await import('../src/parser/post_navigator.js');
  const { navigatePost } = await import('../src/controller/viewer_controller.js');
  const { CONFIG } = await import('../src/config.js');

  function makeClassList(classNameStr = '') {
    const tokens = new Set(classNameStr.split(/\s+/).filter(Boolean));
    return {
      contains: (c) => tokens.has(c),
      add: (c) => tokens.add(c),
      remove: (c) => tokens.delete(c),
    };
  }

  function makeDesktopRow({
    className = 'ub-content',
    numText = '',
    subjectText = '사진',
    href = '/mgallery/board/view/?id=digitalpicture&no=100',
    rawHref = href,
    title = '게시글',
    hasCrtIcon = false,
    hasPicIcon = true,
    extraSelectorMatches = [],
    innerHTML = '',
    dataset = {},
  }) {
    const titLink = {
      href,
      textContent: title,
      getAttribute: (name) => (name === 'href' ? rawHref : null),
    };
    const numEl = { textContent: numText };
    const subjectEl = { textContent: subjectText };
    const selectorSet = new Set(extraSelectorMatches);
    if (hasCrtIcon) selectorSet.add('.crt_icon');
    if (hasPicIcon) selectorSet.add('.icon_pic');

    return {
      className,
      classList: makeClassList(className),
      innerHTML,
      dataset,
      querySelector(sel) {
        if (sel.includes('.gall_tit a')) return titLink;
        if (sel === 'a') return titLink;
        if (sel === '.gall_num') return numEl;
        if (sel === '.gall_subject') return subjectEl;
        for (const token of selectorSet) {
          if (sel.includes(token)) return { className: token.replace(/^\./, '') };
        }
        return null;
      },
    };
  }

  function makeMobileItem({
    className = '',
    href = 'https://m.dcinside.com/board/digitalpicture/100',
    rawHref = href,
    title = '모바일 글',
    subjectText = '',
    extraSelectorMatches = [],
  }) {
    const link = {
      href,
      textContent: title,
      getAttribute: (name) => (name === 'href' ? rawHref : null),
    };
    const selectorSet = new Set(extraSelectorMatches);
    return {
      className,
      classList: makeClassList(className),
      querySelector(sel) {
        if (sel === 'a' || sel.includes('a:not')) return link;
        if (subjectText && sel.includes('.gall_subject')) return { textContent: subjectText };
        for (const token of selectorSet) {
          if (sel.includes(token)) return { className: token.replace(/^\./, '') };
        }
        return null;
      },
    };
  }

  const origWindow = global.window;
  const origDocument = global.document;
  const origSessionStorage = global.sessionStorage;
  const origSetTimeout = global.setTimeout;

  try {
    // 9.1 Bottom boundary must return error: 'bottom' (not 'top')
    const boundaryRows = [
      makeDesktopRow({ numText: '202', href: '/mgallery/board/view/?id=pic&no=202', title: '최신 글', hasPicIcon: true }),
      makeDesktopRow({
        className: 'ub-content crt>',
        numText: '',
        href: '/mgallery/board/view/?id=pic&no=201',
        title: '마지막 현재 글',
        hasCrtIcon: true,
        hasPicIcon: true,
      }),
      // Trailing AD row after last valid row must be filtered out
      makeDesktopRow({ numText: '-', subjectText: 'AD', href: 'https://coupang.com/ad', title: '광고' }),
    ];

    global.document = {
      querySelectorAll(sel) {
        if (sel.includes('table.gall_list')) return boundaryRows;
        return [];
      },
      getElementById: () => null,
    };
    global.window = {
      location: {
        origin: 'https://gall.dcinside.com',
        href: 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=201',
      },
    };

    const bottomPreferPhoto = getAdjacentPostUrl('down', true);
    assert.strictEqual(bottomPreferPhoto?.error, 'bottom', 'DEFECT-03: Last row down (preferPhotos=true) must return bottom error');
    assert.strictEqual(bottomPreferPhoto?.message, '목록의 마지막 글입니다.');

    const bottomNoPhoto = getAdjacentPostUrl('down', false);
    assert.strictEqual(bottomNoPhoto?.error, 'bottom', 'DEFECT-03: Last row down (preferPhotos=false) must return bottom error');

    // Top boundary check on first row
    const singleOrTopRows = [
      makeDesktopRow({
        className: 'ub-content crt>',
        numText: '',
        href: '/mgallery/board/view/?id=pic&no=300',
        title: '단일/첫 글',
        hasCrtIcon: true,
      }),
    ];
    global.document.querySelectorAll = (sel) => (sel.includes('table.gall_list') ? singleOrTopRows : []);
    global.window.location.href = 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=300';
    assert.strictEqual(getAdjacentPostUrl('up', true)?.error, 'top', 'First row up must return top error');
    assert.strictEqual(getAdjacentPostUrl('down', true)?.error, 'bottom', 'Single row down must return bottom error');

    // 9.2 AD / Notice / Survey must NOT bypass via innerHTML.includes(currentPostNo)
    const currentPostNo = '25';
    const adWith25InHtml = makeDesktopRow({
      numText: '-',
      subjectText: 'AD',
      href: 'https://ad.example.com/click?id=999',
      title: '광고',
      innerHTML: '<td class="gall_num" style="height:25px;">-</td><td class="gall_subject"><b>AD</b></td>',
    });
    const noticeWith25InHtml = makeDesktopRow({
      className: 'ub-content notice',
      numText: '공지',
      subjectText: '공지',
      href: '/mgallery/board/view/?id=pic&no=250',
      title: '필독 공지 25',
      innerHTML: '<td>공지 25</td>',
    });
    const surveyWith25InHtml = makeDesktopRow({
      numText: '-',
      subjectText: '설문',
      href: 'https://event.dcinside.com/survey/25',
      title: '설문조사',
      innerHTML: '<td>설문 25</td>',
    });
    const siblingWith25InTitle = makeDesktopRow({
      numText: '26',
      subjectText: '일반',
      href: '/mgallery/board/view/?id=pic&no=26',
      title: '25살 기념 사진',
      innerHTML: '<td class="gall_num">26</td><td>25살 기념 사진</td>',
    });
    const realCurrentRow = makeDesktopRow({
      className: 'ub-content crt>',
      numText: '',
      subjectText: '사진',
      href: '/mgallery/board/view/?id=pic&no=25',
      title: '진짜 현재 글',
      hasCrtIcon: true,
      innerHTML: '<td class="gall_num"><span class="crt_icon"></span></td>',
    });

    assert.strictEqual(isDesktopPostRowValid(adWith25InHtml, currentPostNo), false, 'DEFECT-03: AD row containing currentPostNo in innerHTML must be excluded');
    assert.strictEqual(isDesktopPostRowValid(noticeWith25InHtml, currentPostNo), false, 'DEFECT-03: Notice row containing currentPostNo in innerHTML must be excluded');
    assert.strictEqual(isDesktopPostRowValid(surveyWith25InHtml, currentPostNo), false, 'DEFECT-03: Survey row containing currentPostNo in innerHTML must be excluded');
    assert.strictEqual(isDesktopPostRowValid(siblingWith25InTitle, currentPostNo), true, 'Sibling post 26 must remain valid');
    assert.strictEqual(isDesktopPostRowValid(realCurrentRow, currentPostNo), true, 'Real current post row with empty numText must remain valid');

    const validRows = [siblingWith25InTitle, realCurrentRow];
    assert.strictEqual(findCurrentPostRowIndex(validRows, currentPostNo), 1, 'findCurrentPostRowIndex must find index 1, not sibling 26');

    // Mobile AD / Notice / Survey pre-filtering
    const mobileNotice = makeMobileItem({ className: 'notice', href: 'https://m.dcinside.com/board/pic/1' });
    const mobileNoticeIcon = makeMobileItem({ extraSelectorMatches: ['.sp-notice'], href: 'https://m.dcinside.com/board/pic/2' });
    const mobileAd = makeMobileItem({ className: 'ad', href: 'https://ad.example.com' });
    const mobileAdIcon = makeMobileItem({ extraSelectorMatches: ['.icon_ad'], href: 'https://ad.example.com' });
    const mobileSurvey = makeMobileItem({ subjectText: '설문', href: 'https://event.dcinside.com/survey' });
    const mobileNormal = makeMobileItem({ className: 'gall-detail-head', href: 'https://m.dcinside.com/board/pic/200' });

    assert.strictEqual(isMobilePostItemValid(mobileNotice), false, 'Mobile notice class must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileNoticeIcon), false, 'Mobile .sp-notice must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileAd), false, 'DEFECT-03: Mobile ad class must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileAdIcon), false, 'DEFECT-03: Mobile .icon_ad must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileSurvey), false, 'DEFECT-03: Mobile survey must be excluded');
    assert.strictEqual(isMobilePostItemValid(mobileNormal), true, 'Mobile normal post with "head" class must remain valid');

    // 9.3 Normalized javascript:/data:/vbscript: URL blocking (Desktop, Mobile, and navigatePost)
    const unsafePayloads = [
      ' JavaScript:alert(1)',
      '\tjavascript:void(0)',
      'java\nscript:alert(1)',
      'javascript:;',
      'DATA:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      '#',
      '   ',
    ];
    for (const payload of unsafePayloads) {
      const badDesktop = makeDesktopRow({ numText: '500', href: payload, rawHref: payload });
      const badMobile = makeMobileItem({ href: payload, rawHref: payload });
      assert.strictEqual(
        isDesktopPostRowValid(badDesktop, currentPostNo),
        false,
        `DEFECT-03: Desktop must block unsafe href: ${JSON.stringify(payload)}`
      );
      assert.strictEqual(
        isMobilePostItemValid(badMobile),
        false,
        `DEFECT-03: Mobile must block unsafe href: ${JSON.stringify(payload)}`
      );
    }

    // Defense-in-depth: navigatePost must never assign window.location.href or set sessionStorage for unsafe URL
    let assignedHref = null;
    let storedAutoOpen = null;
    const navMockRows = [
      makeDesktopRow({ className: 'ub-content crt>', numText: '', href: '/mgallery/board/view/?id=pic&no=10', hasCrtIcon: true }),
      makeDesktopRow({ numText: '9', href: ' JavaScript:alert(1)', rawHref: ' JavaScript:alert(1)', title: '악성 링크' }),
    ];
    global.document.querySelectorAll = (sel) => (sel.includes('table.gall_list') ? navMockRows : []);
    global.window = {
      location: {
        origin: 'https://gall.dcinside.com',
        get href() { return 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=10'; },
        set href(val) { assignedHref = val; },
      },
    };
    global.sessionStorage = {
      setItem(k, v) { if (k === CONFIG.STORAGE_KEY_AUTO_OPEN) storedAutoOpen = v; },
      getItem() { return null; },
      removeItem() {},
    };
    global.setTimeout = (fn) => { fn(); return 1; };

    navigatePost('down');
    assert.strictEqual(assignedHref, null, 'DEFECT-03: navigatePost must not navigate to javascript: URL');
    assert.strictEqual(storedAutoOpen, null, 'DEFECT-03: navigatePost must not set auto_open for blocked URL');
    assert.strictEqual(realExtractPostNo('https://gall.dcinside.com/mgallery/board/view/?id=pic&no=10'), '10');

    // Positive path & helper checks
    assert.strictEqual(isSafeNavigationHref('https://gall.dcinside.com/mgallery/board/view/?id=pic&no=9'), true);
    assert.strictEqual(isSafeNavigationHref('/mgallery/board/view/?id=pic&no=9'), true);
    assert.strictEqual(isSafeNavigationHref(' JavaScript:alert(1)'), false);

    const emptyNonCurrentRow = makeDesktopRow({ numText: '', href: '/mgallery/board/view/?id=pic&no=99' });
    assert.strictEqual(isDesktopPostRowValid(emptyNonCurrentRow, currentPostNo), false, 'Empty numText non-current row must be excluded');
    const datasetCurrentRow = makeDesktopRow({ numText: '', href: '/mgallery/board/view/?id=pic&no=25', dataset: { no: '25' } });
    assert.strictEqual(isDesktopPostRowValid(datasetCurrentRow, currentPostNo), true, 'dataset.no matching currentPostNo must remain valid');

    navMockRows.push(makeDesktopRow({ numText: '8', href: '/mgallery/board/view/?id=pic&no=8', title: '정상 다음 글' }));
    navigatePost('down');
    assert.strictEqual(storedAutoOpen, '1', 'navigatePost must set auto_open for safe adjacent URL');
    assert.strictEqual(assignedHref, '/mgallery/board/view/?id=pic&no=8', 'navigatePost must navigate to safe adjacent URL');

    // 9.4 Real src/parser/post_navigator.js integration against dc_sample.html
    if (fs.existsSync(DC_SAMPLE_PATH)) {
      const sampleHtml = fs.readFileSync(DC_SAMPLE_PATH, 'utf-8');
      const trMatches = [...sampleHtml.matchAll(/<tr\s+class="ub-content\s*([^"]*)"[\s\S]*?<\/tr>/g)];
      const sampleDomRows = trMatches.map((m) => {
        const trHtml = m[0];
        const trClass = `ub-content ${m[1]}`.trim();
        const numMatch = trHtml.match(/<td\s+class="gall_num"[^>]*>([\s\S]*?)<\/td>/);
        const numText = numMatch ? numMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const subMatch = trHtml.match(/<td\s+class="gall_subject"[^>]*>([\s\S]*?)<\/td>/);
        const subjectText = subMatch ? subMatch[1].replace(/<[^>]+>/g, '').trim() : '';
        const linkMatch = trHtml.match(/<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
        const rawHref = linkMatch ? linkMatch[1] : '';
        const title = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : '';
        const hasCrtIcon = trHtml.includes('crt_icon');
        const hasPic = trHtml.includes('icon_pic') || trHtml.includes('icon_recomimg') || subjectText.includes('사진');
        const hasAdIcon = trHtml.includes('icon_ad');

        return makeDesktopRow({
          className: trClass,
          numText,
          subjectText,
          href: rawHref,
          rawHref,
          title,
          hasCrtIcon,
          hasPicIcon: hasPic,
          extraSelectorMatches: hasAdIcon ? ['.icon_ad'] : [],
          innerHTML: trHtml,
        });
      });

      const sampleUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506';
      global.document.querySelectorAll = (sel) => (sel.includes('table.gall_list') ? sampleDomRows : []);
      global.window.location = { origin: 'https://gall.dcinside.com', href: sampleUrl };

      const sampleValid = getValidPostRows('1968506', global.document);
      assert.strictEqual(sampleValid.length, 50, 'Real post_navigator must retain 50 valid rows from dc_sample.html (excluding 설문/AD)');
      assert.strictEqual(findCurrentPostRowIndex(sampleValid, '1968506'), 18);
      assert.strictEqual(getAdjacentPostUrl('up', true, sampleUrl).url, '/mgallery/board/view/?id=digitalpicture&no=1968509&search_head=10&page=1');
      assert.strictEqual(getAdjacentPostUrl('down', true, sampleUrl).url, '/mgallery/board/view/?id=digitalpicture&no=1968505&search_head=10&page=1');

      // Last row in dc_sample.html (1968384) navigating down must hit 'bottom'
      const lastUrl = 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968384';
      const lastRows = sampleDomRows.map((r, idx) => {
        if (idx === sampleDomRows.length - 1) {
          return makeDesktopRow({
            className: 'ub-content crt>',
            numText: '',
            subjectText: '사진',
            href: '/mgallery/board/view/?id=digitalpicture&no=1968384',
            hasCrtIcon: true,
            hasPicIcon: true,
          });
        }
        // Clear crt marker from the original current post row (1968506)
        return r.className.includes('crt')
          ? makeDesktopRow({
              className: 'ub-content',
              numText: '1968506',
              subjectText: '사진',
              href: '/mgallery/board/view/?id=digitalpicture&no=1968506',
              hasCrtIcon: false,
              hasPicIcon: true,
            })
          : r;
      });
      global.document.querySelectorAll = (sel) => (sel.includes('table.gall_list') ? lastRows : []);
      global.window.location = { origin: 'https://gall.dcinside.com', href: lastUrl };
      assert.strictEqual(getAdjacentPostUrl('down', true, lastUrl)?.error, 'bottom');
    }

    console.log('✅ Test 9: DEFECT-03 bottom boundary, AD/notice/survey pre-filter & javascript: guard passed');
  } finally {
    global.window = origWindow;
    global.document = origDocument;
    global.sessionStorage = origSessionStorage;
    global.setTimeout = origSetTimeout;
  }
}

// Test 10: DEFECT-04 navigatePost() pending timer/sessionStorage cancellation & startAutoOpenPolling() orphan interval guard
async function runDefect04Tests() {
  const { state } = await import('../src/state.js');
  const { CONFIG } = await import('../src/config.js');
  const {
    navigatePost,
    openViewer,
    closeViewer,
    checkAutoOpen,
    initViewerBase,
  } = await import('../src/controller/viewer_controller.js');

  const origWindow = global.window;
  const origDocument = global.document;
  const origSessionStorage = global.sessionStorage;
  const origSetTimeout = global.setTimeout;
  const origClearTimeout = global.clearTimeout;
  const origSetInterval = global.setInterval;
  const origClearInterval = global.clearInterval;
  const origRequestAnimationFrame = global.requestAnimationFrame;
  const origCancelAnimationFrame = global.cancelAnimationFrame;
  const origImage = global.Image;
  const origAlert = global.alert;

  const prevStateSnapshot = {
    postImages: state.postImages,
    currentIndex: state.currentIndex,
    lastRightClickedImgSrc: state.lastRightClickedImgSrc,
    previousBodyOverflow: state.previousBodyOverflow,
    toastTimer: state.toastTimer,
    noPhotoNoticeTimer: state.noPhotoNoticeTimer,
    postNavTimer: state.postNavTimer,
    autoOpenPollTimer: state.autoOpenPollTimer,
    idleTimer: state.idleTimer,
    elements: { ...state.elements },
  };

  function makeClassList(initial = []) {
    const set = new Set(initial);
    return {
      add: (...c) => c.forEach((n) => set.add(n)),
      remove: (...c) => c.forEach((n) => set.delete(n)),
      toggle: (n, force) => {
        if (force === undefined) {
          if (set.has(n)) { set.delete(n); return false; }
          set.add(n); return true;
        }
        if (force) set.add(n); else set.delete(n);
        return Boolean(force);
      },
      contains: (n) => set.has(n),
    };
  }

  function createDefect04Env() {
    const timeouts = new Map();
    const intervals = new Map();
    let nextTimerId = 1;
    let nextIntervalId = 1;
    const winListeners = new Map();
    const docListeners = new Map();
    const storageMap = new Map();
    const navHistory = [];
    let currentHref = 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=10';
    let alertMessages = [];
    let bodyImages = [];
    let boardRows = [];
    let bodyChildren = [];

    function makeNode(tagName, id = '', classes = []) {
      const attrs = {};
      const listeners = {};
      let htmlCache = '';
      const node = {
        tagName: tagName.toUpperCase(),
        id,
        className: classes.join(' '),
        classList: makeClassList(classes),
        style: {},
        dataset: {},
        children: [],
        parentElement: null,
        parentNode: null,
        textContent: '',
        src: '',
        currentSrc: '',
        alt: '',
        title: '',
        value: '24',
        offsetHeight: 40,
        naturalWidth: 1200,
        naturalHeight: 900,
        addEventListener(ev, fn) {
          if (!listeners[ev]) listeners[ev] = [];
          listeners[ev].push(fn);
        },
        dispatchEvent(evObj) {
          (listeners[evObj.type] || []).forEach((fn) => fn(evObj));
        },
        setAttribute(k, v) {
          attrs[k] = String(v);
          if (k === 'id') node.id = String(v);
        },
        getAttribute(k) {
          return Object.prototype.hasOwnProperty.call(attrs, k) ? attrs[k] : null;
        },
        hasAttribute(k) {
          return Object.prototype.hasOwnProperty.call(attrs, k);
        },
        appendChild(child) {
          child.parentElement = node;
          child.parentNode = node;
          node.children.push(child);
          return child;
        },
        remove() {
          if (node.parentNode) {
            bodyChildren = bodyChildren.filter((c) => c !== node);
            node.parentNode = null;
          }
        },
        closest() { return null; },
        matches() { return false; },
        contains(other) {
          if (other === node) return true;
          return node.children.some((c) => c.contains && c.contains(other));
        },
        querySelector(sel) {
          return node.querySelectorAll(sel)[0] || null;
        },
        querySelectorAll(sel) {
          const idMatches = [];
          const walk = (cur) => {
            for (const c of cur.children) {
              if (sel.startsWith('#') && c.id === sel.slice(1)) idMatches.push(c);
              else if (sel.startsWith('.') && c.classList.contains(sel.slice(1))) idMatches.push(c);
              walk(c);
            }
          };
          walk(node);
          return idMatches;
        },
      };
      Object.defineProperty(node, 'innerHTML', {
        get: () => htmlCache,
        set: (html) => {
          htmlCache = html;
          node.children = [];
          if (html.includes('disagall-stage')) {
            const header = makeNode('div', '', ['disagall-header']);
            const counter = makeNode('span', 'disagall-counter');
            const infoBadge = makeNode('span', 'disagall-info-badge');
            const slider = makeNode('input', 'disagall-padding-slider');
            const sliderVal = makeNode('span', 'disagall-padding-val');
            const recBtn = makeNode('button', 'disagall-btn-recommend');
            const fsBtn = makeNode('button', 'disagall-btn-fullscreen');
            const closeBtn = makeNode('button', 'disagall-close-btn');
            header.appendChild(counter);
            header.appendChild(infoBadge);
            header.appendChild(slider);
            header.appendChild(sliderVal);
            header.appendChild(recBtn);
            header.appendChild(fsBtn);
            header.appendChild(closeBtn);

            const stage = makeNode('div', 'disagall-stage');
            const wrapper = makeNode('div', 'disagall-img-wrapper');
            const mainImg = makeNode('img', 'disagall-main-img');
            const loader = makeNode('div', 'disagall-loader');
            const prevBtn = makeNode('button', 'disagall-prev');
            const nextBtn = makeNode('button', 'disagall-next');
            const toast = makeNode('div', 'disagall-toast');
            wrapper.appendChild(mainImg);
            stage.appendChild(wrapper);
            stage.appendChild(loader);
            stage.appendChild(prevBtn);
            stage.appendChild(nextBtn);
            stage.appendChild(toast);

            node.appendChild(header);
            node.appendChild(stage);
          } else if (html.includes('disagall-notice-close')) {
            node.appendChild(makeNode('button', 'disagall-notice-prev'));
            node.appendChild(makeNode('button', 'disagall-notice-next'));
            node.appendChild(makeNode('button', 'disagall-notice-close'));
          }
        },
      });
      return node;
    }

    const body = makeNode('body');
    body.style.overflow = 'auto';
    body.appendChild = (child) => {
      child.parentElement = body;
      child.parentNode = body;
      bodyChildren.push(child);
      return child;
    };

    function findById(id) {
      const walk = (list) => {
        for (const item of list) {
          if (item.id === id) return item;
          const nested = walk(item.children || []);
          if (nested) return nested;
        }
        return null;
      };
      return walk(bodyChildren);
    }

    const doc = {
      readyState: 'complete',
      activeElement: body,
      body,
      addEventListener(ev, fn) {
        if (!docListeners.has(ev)) docListeners.set(ev, []);
        docListeners.get(ev).push(fn);
      },
      createElement(tag) {
        return makeNode(tag);
      },
      getElementById(id) {
        return findById(id);
      },
      querySelector() { return null; },
      querySelectorAll(sel) {
        if (sel.includes('table.gall_list')) return boardRows;
        if (sel.includes('img')) return bodyImages;
        return [];
      },
    };

    const win = {
      innerWidth: 1280,
      innerHeight: 800,
      location: {
        origin: 'https://gall.dcinside.com',
        protocol: 'https:',
        get href() { return currentHref; },
        set href(val) {
          currentHref = val;
          navHistory.push(val);
        },
      },
      addEventListener(ev, fn) {
        if (!winListeners.has(ev)) winListeners.set(ev, new Set());
        winListeners.get(ev).add(fn);
      },
      removeEventListener(ev, fn) {
        if (winListeners.has(ev)) winListeners.get(ev).delete(fn);
      },
      dispatchWindowEvent(evObj) {
        const ev = typeof evObj === 'string' ? { type: evObj } : evObj;
        Array.from(winListeners.get(ev.type) || []).forEach((fn) => fn(ev));
      },
    };

    const sess = {
      getItem(k) { return storageMap.has(k) ? storageMap.get(k) : null; },
      setItem(k, v) { storageMap.set(k, String(v)); },
      removeItem(k) { storageMap.delete(k); },
    };

    function makeBodyImage(src) {
      const img = makeNode('img');
      img.src = src;
      img.currentSrc = src;
      img.clientWidth = 800;
      img.naturalWidth = 1200;
      img.naturalHeight = 900;
      img.closest = (sel) => {
        if (sel.includes('.write_div')) return { tagName: 'DIV' };
        return null;
      };
      return img;
    }

    function makeBoardRow({ numText, href, title, isCurrent = false }) {
      const link = {
        href,
        textContent: title,
        getAttribute: (n) => (n === 'href' ? href : null),
      };
      return {
        className: isCurrent ? 'ub-content crt>' : 'ub-content',
        classList: makeClassList(isCurrent ? ['ub-content', 'crt>'] : ['ub-content']),
        dataset: {},
        querySelector(sel) {
          if (sel.includes('.gall_tit a')) return link;
          if (sel === '.gall_num') return { textContent: numText };
          if (sel === '.gall_subject') return { textContent: '사진' };
          if (sel.includes('.crt_icon') && isCurrent) return { className: 'crt_icon' };
          if (sel.includes('.icon_pic')) return { className: 'icon_pic' };
          return null;
        },
      };
    }

    return {
      doc,
      win,
      sess,
      timeouts,
      intervals,
      navHistory,
      alertMessages,
      setBodyImages: (urls) => { bodyImages = urls.map(makeBodyImage); },
      setBoardRows: (rows) => { boardRows = rows.map(makeBoardRow); },
      fakeSetTimeout: (fn, delay) => {
        const id = nextTimerId++;
        timeouts.set(id, { fn, delay });
        return id;
      },
      fakeClearTimeout: (id) => {
        timeouts.delete(id);
      },
      fakeSetInterval: (fn, delay) => {
        const id = nextIntervalId++;
        intervals.set(id, { fn, delay });
        return id;
      },
      fakeClearInterval: (id) => {
        intervals.delete(id);
      },
      flushTimeouts: (targetDelay = null) => {
        const entries = Array.from(timeouts.entries());
        for (const [id, entry] of entries) {
          if (targetDelay === null || entry.delay === targetDelay) {
            timeouts.delete(id);
            entry.fn();
          }
        }
      },
      tickIntervals: () => {
        const entries = Array.from(intervals.entries());
        for (const [, entry] of entries) {
          entry.fn();
        }
      },
    };
  }

  function resetControllerState() {
    state.postImages = [];
    state.currentIndex = 0;
    state.lastRightClickedImgSrc = null;
    state.previousBodyOverflow = 'auto';
    state.toastTimer = null;
    state.noPhotoNoticeTimer = null;
    state.idleTimer = null;
    state.postNavTimer = null;
    state.autoOpenPollTimer = null;
    state.elements = {
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
      fullscreenBtnEl: null,
    };
  }

  try {
    const env = createDefect04Env();
    global.window = env.win;
    global.document = env.doc;
    global.sessionStorage = env.sess;
    global.setTimeout = env.fakeSetTimeout;
    global.clearTimeout = env.fakeClearTimeout;
    global.setInterval = env.fakeSetInterval;
    global.clearInterval = env.fakeClearInterval;
    global.requestAnimationFrame = (fn) => 1;
    global.cancelAnimationFrame = () => {};
    global.alert = (msg) => env.alertMessages.push(msg);
    global.Image = function MockImage() {
      return { onload: null, onerror: null, src: '' };
    };

    resetControllerState();
    initViewerBase();

    // 10.1 navigatePost() followed by closeViewer() within 150ms must cancel navigation & clear auto_open
    env.setBodyImages(['https://dcimg.example.com/1.jpg']);
    env.setBoardRows([
      { numText: '11', href: '/mgallery/board/view/?id=pic&no=11', title: '최신 글' },
      { numText: '', href: '/mgallery/board/view/?id=pic&no=10', title: '현재 글', isCurrent: true },
      { numText: '9', href: '/mgallery/board/view/?id=pic&no=9', title: '이전 글' },
    ]);
    openViewer(null, false);
    navigatePost('down');
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), '1');
    closeViewer();
    assert.strictEqual(state.postNavTimer, null, 'DEFECT-04: closeViewer() must clear state.postNavTimer');
    assert.strictEqual(state.toastTimer, null, 'DEFECT-04: closeViewer() must clear state.toastTimer');
    assert.strictEqual(state.elements.toastEl.classList.contains('show'), false, 'DEFECT-04: closeViewer() must hide toast');
    assert.strictEqual(env.timeouts.size, 0, 'DEFECT-04: closeViewer() must leave 0 pending timeouts');
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), null, 'DEFECT-04: closeViewer() must remove disagall_auto_open when cancelling pending nav');
    env.flushTimeouts(CONFIG.POST_NAV_DELAY);
    assert.deepStrictEqual(env.navHistory, [], 'DEFECT-04: Cancelled navigatePost() timer must NOT navigate after closeViewer()');

    // 10.2 Rapid double-tap navigatePost('down') -> navigatePost('up'), then 'down' -> boundary 'top'
    openViewer(null, false);
    navigatePost('down');
    navigatePost('up');
    const navTimersAfterDoubleTap = Array.from(env.timeouts.values()).filter((t) => t.delay === CONFIG.POST_NAV_DELAY);
    assert.strictEqual(navTimersAfterDoubleTap.length, 1, 'DEFECT-04: Rapid navigatePost() must replace previous pending timer');
    env.flushTimeouts(CONFIG.POST_NAV_DELAY);
    assert.deepStrictEqual(env.navHistory, ['/mgallery/board/view/?id=pic&no=11'], 'DEFECT-04: Last-wins navigatePost() must navigate only to latest target');
    env.navHistory.length = 0;

    // Boundary error after pending valid navigatePost() must cancel stale navigation
    env.setBoardRows([
      { numText: '', href: '/mgallery/board/view/?id=pic&no=10', title: '현재 최상단', isCurrent: true },
      { numText: '9', href: '/mgallery/board/view/?id=pic&no=9', title: '이전 글' },
    ]);
    navigatePost('down');
    navigatePost('up'); // hits 'top' error
    assert.strictEqual(state.postNavTimer, null, 'DEFECT-04: Boundary navigatePost() must cancel prior pending nav timer');
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), null, 'DEFECT-04: Boundary cancel must remove pending auto_open flag');
    env.flushTimeouts(CONFIG.POST_NAV_DELAY);
    assert.deepStrictEqual(env.navHistory, [], 'DEFECT-04: Cancelled nav must not fire after boundary error');
    closeViewer();

    // 10.3 startAutoOpenPolling() + manual openViewer(src2) must stop interval and NOT reset currentIndex to 0
    env.setBodyImages([]);
    env.sess.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    checkAutoOpen();
    assert.strictEqual(env.intervals.size, 1, 'checkAutoOpen() must start polling interval');

    env.setBodyImages(['https://dcimg.example.com/1.jpg', 'https://dcimg.example.com/2.jpg']);
    openViewer('https://dcimg.example.com/2.jpg', false);
    assert.strictEqual(state.currentIndex, 1, 'Manual openViewer(src2) must open index 1');
    assert.strictEqual(env.intervals.size, 0, 'DEFECT-04: Manual openViewer() must clear autoOpenPollTimer');
    assert.strictEqual(state.autoOpenPollTimer, null, 'DEFECT-04: state.autoOpenPollTimer must be null after manual openViewer()');
    env.tickIntervals();
    assert.strictEqual(state.currentIndex, 1, 'DEFECT-04: Polling tick must NOT reset active viewer index to 0');
    closeViewer();

    // 10.4 startAutoOpenPolling() + closeViewer() must stop interval (no ghost reopen & no orphan no-photo notice)
    env.setBodyImages([]);
    env.sess.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    checkAutoOpen();
    assert.strictEqual(env.intervals.size, 1);
    closeViewer();
    assert.strictEqual(env.intervals.size, 0, 'DEFECT-04: closeViewer() must clear autoOpenPollTimer');
    assert.strictEqual(state.autoOpenPollTimer, null);

    // Even if images appear or 15 ticks pass, overlay stays closed and notice stays absent
    env.setBodyImages(['https://dcimg.example.com/late.jpg']);
    env.tickIntervals();
    assert.strictEqual(state.elements.overlayEl.classList.contains('active'), false, 'DEFECT-04: Closed viewer must not be ghost-reopened');
    env.setBodyImages([]);
    for (let i = 0; i < CONFIG.AUTO_OPEN_MAX_ATTEMPTS; i++) env.tickIntervals();
    assert.strictEqual(env.doc.getElementById('disagall-no-photo-notice'), null, 'DEFECT-04: Orphan no-photo notice must not mount after closeViewer()');

    // 10.5 Manual openViewer() failing with 0 images during polling must keep polling alive
    env.setBodyImages([]);
    env.sess.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    checkAutoOpen();
    openViewer(null, false); // fails with alert
    assert.strictEqual(env.alertMessages.length, 1);
    assert.strictEqual(env.intervals.size, 1, 'DEFECT-04: Failed openViewer(0 images) must NOT kill active auto-open polling');
    env.setBodyImages(['https://dcimg.example.com/lazy.jpg']);
    env.tickIntervals();
    assert.strictEqual(state.elements.overlayEl.classList.contains('active'), true, 'Polling should still auto-open once lazy image appears');
    assert.strictEqual(env.intervals.size, 0);
    closeViewer();

    // 10.6 Duplicate checkAutoOpen() & pagehide lifecycle cleanup
    env.setBodyImages([]);
    env.sess.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    checkAutoOpen();
    env.sess.setItem(CONFIG.STORAGE_KEY_AUTO_OPEN, '1');
    checkAutoOpen();
    assert.strictEqual(env.intervals.size, 1, 'DEFECT-04: Duplicate checkAutoOpen() must not spawn parallel intervals');
    env.win.dispatchWindowEvent({ type: 'pagehide' });
    assert.strictEqual(env.intervals.size, 0, 'DEFECT-04: pagehide must clear autoOpenPollTimer');

    // pagehide cancels un-fired navigatePost timer + auto_open, but preserves auto_open if nav already fired
    env.setBodyImages(['https://dcimg.example.com/1.jpg']);
    openViewer(null, false);
    navigatePost('down');
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), '1');
    env.win.dispatchWindowEvent({ type: 'pagehide' });
    assert.strictEqual(state.postNavTimer, null, 'DEFECT-04: pagehide must cancel pending postNavTimer');
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), null, 'DEFECT-04: pagehide must remove auto_open if nav timer had not fired');

    navigatePost('down');
    env.flushTimeouts(CONFIG.POST_NAV_DELAY); // fires navigation -> sets window.location.href
    env.win.dispatchWindowEvent({ type: 'pagehide' });
    assert.strictEqual(env.sess.getItem(CONFIG.STORAGE_KEY_AUTO_OPEN), '1', 'DEFECT-04: pagehide after navigation already fired must preserve auto_open for destination page');

    console.log('✅ Test 10: DEFECT-04 navigatePost & autoOpenPolling timer lifecycle tests passed');
  } finally {
    global.window = origWindow;
    global.document = origDocument;
    global.sessionStorage = origSessionStorage;
    global.setTimeout = origSetTimeout;
    global.clearTimeout = origClearTimeout;
    global.setInterval = origSetInterval;
    global.clearInterval = origClearInterval;
    global.requestAnimationFrame = origRequestAnimationFrame;
    global.cancelAnimationFrame = origCancelAnimationFrame;
    global.Image = origImage;
    global.alert = origAlert;

    state.postImages = prevStateSnapshot.postImages;
    state.currentIndex = prevStateSnapshot.currentIndex;
    state.lastRightClickedImgSrc = prevStateSnapshot.lastRightClickedImgSrc;
    state.previousBodyOverflow = prevStateSnapshot.previousBodyOverflow;
    state.toastTimer = prevStateSnapshot.toastTimer;
    state.noPhotoNoticeTimer = prevStateSnapshot.noPhotoNoticeTimer;
    state.postNavTimer = prevStateSnapshot.postNavTimer;
    state.autoOpenPollTimer = prevStateSnapshot.autoOpenPollTimer;
    state.idleTimer = prevStateSnapshot.idleTimer;
    state.elements = prevStateSnapshot.elements;
  }
}

// Test 11: REFACTOR-05 getAdjacentPostUrl() Discriminated Result contract (found / boundary / unavailable)
async function runRefactor05Tests() {
  const { getAdjacentPostUrl } = await import('../src/parser/post_navigator.js');
  const { navigatePost } = await import('../src/controller/viewer_controller.js');
  const { state } = await import('../src/state.js');
  const { CONFIG } = await import('../src/config.js');

  const origWindow = global.window;
  const origDocument = global.document;
  const origSessionStorage = global.sessionStorage;
  const origSetTimeout = global.setTimeout;
  const origClearTimeout = global.clearTimeout;
  const prevElements = { ...state.elements };
  const prevToastTimer = state.toastTimer;

  function makeClassList(classNameStr = '') {
    const tokens = new Set(classNameStr.split(/\s+/).filter(Boolean));
    return {
      contains: (c) => tokens.has(c),
      add: (c) => tokens.add(c),
      remove: (c) => tokens.delete(c),
    };
  }

  function makeRow({ numText = '', href, title = '게시글', isCurrent = false, hasPic = true }) {
    const link = {
      href,
      textContent: title,
      getAttribute: (name) => (name === 'href' ? href : null),
    };
    return {
      className: isCurrent ? 'ub-content crt>' : 'ub-content',
      classList: makeClassList(isCurrent ? 'ub-content crt>' : 'ub-content'),
      dataset: {},
      querySelector(sel) {
        if (sel.includes('.gall_tit a') || sel === 'a') return link;
        if (sel === '.gall_num') return { textContent: numText };
        if (sel === '.gall_subject') return { textContent: '일반' };
        if (sel.includes('.crt_icon') && isCurrent) return { className: 'crt_icon' };
        if (sel.includes('.icon_pic') && hasPic) return { className: 'icon_pic' };
        return null;
      },
    };
  }

  let toastMessages = [];
  let assignedHref = null;
  let storedAutoOpen = null;

  try {
    state.elements.toastEl = {
      textContent: '',
      classList: makeClassList(),
    };
    // Monkey-patch showViewerToast observation via toastEl.textContent
    Object.defineProperty(state.elements.toastEl, 'textContent', {
      get: () => toastMessages[toastMessages.length - 1] || '',
      set: (val) => { toastMessages.push(val); },
    });

    global.sessionStorage = {
      setItem(k, v) { if (k === CONFIG.STORAGE_KEY_AUTO_OPEN) storedAutoOpen = v; },
      getItem() { return null; },
      removeItem() {},
    };
    global.setTimeout = (fn) => { fn(); return 1; };
    global.clearTimeout = () => {};

    // 11.1 unavailable: no_list (empty board / null root)
    global.document = { querySelectorAll: () => [] };
    global.window = {
      location: {
        origin: 'https://gall.dcinside.com',
        get href() { return 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=100'; },
        set href(val) { assignedHref = val; },
      },
    };

    const noListResult = getAdjacentPostUrl('down', true);
    assert.strictEqual(noListResult.ok, false, 'REFACTOR-05: empty board must return ok: false');
    assert.strictEqual(noListResult.status, 'unavailable', 'REFACTOR-05: empty board must return status: unavailable');
    assert.strictEqual(noListResult.error, 'no_list', 'REFACTOR-05: empty board must return error: no_list');
    assert.strictEqual(noListResult.message, '이동할 수 있는 게시글 목록을 찾을 수 없습니다.');

    const nullRootResult = getAdjacentPostUrl('up', true, 'https://gall.dcinside.com/mgallery/board/view/?id=pic&no=100', null);
    assert.deepStrictEqual(nullRootResult, {
      ok: false,
      status: 'unavailable',
      error: 'no_list',
      message: '이동할 수 있는 게시글 목록을 찾을 수 없습니다.',
    });

    toastMessages = [];
    navigatePost('down');
    assert.deepStrictEqual(toastMessages, ['이동할 수 있는 게시글 목록을 찾을 수 없습니다.']);
    assert.strictEqual(assignedHref, null);
    assert.strictEqual(storedAutoOpen, null);

    // 11.2 unavailable: current_not_found
    const rowsWithoutCurrent = [
      makeRow({ numText: '200', href: '/mgallery/board/view/?id=pic&no=200', title: '다른 글 1' }),
      makeRow({ numText: '199', href: '/mgallery/board/view/?id=pic&no=199', title: '다른 글 2' }),
    ];
    global.document = { querySelectorAll: (sel) => (sel.includes('table.gall_list') ? rowsWithoutCurrent : []) };
    const notFoundResult = getAdjacentPostUrl('down', true);
    assert.deepStrictEqual(notFoundResult, {
      ok: false,
      status: 'unavailable',
      error: 'current_not_found',
      message: '이동할 수 있는 게시글 목록을 찾을 수 없습니다.',
    });

    toastMessages = [];
    navigatePost('up');
    assert.deepStrictEqual(toastMessages, ['이동할 수 있는 게시글 목록을 찾을 수 없습니다.']);
    assert.strictEqual(assignedHref, null);

    // 11.3 unavailable: unsafe_url (defense-in-depth if href mutates after row validation)
    let readCount = 0;
    const mutatingLink = {
      get href() {
        readCount += 1;
        return readCount <= 3 ? '/mgallery/board/view/?id=pic&no=99' : 'javascript:alert(1)';
      },
      textContent: '변조 링크',
      getAttribute: (name) => (name === 'href' ? (readCount <= 3 ? '/mgallery/board/view/?id=pic&no=99' : 'javascript:alert(1)') : null),
    };
    const mutatingRows = [
      makeRow({ numText: '', href: '/mgallery/board/view/?id=pic&no=100', title: '현재 글', isCurrent: true }),
      {
        className: 'ub-content',
        classList: makeClassList('ub-content'),
        dataset: {},
        querySelector(sel) {
          if (sel.includes('.gall_tit a') || sel === 'a') return mutatingLink;
          if (sel === '.gall_num') return { textContent: '99' };
          if (sel === '.gall_subject') return { textContent: '일반' };
          if (sel.includes('.icon_pic')) return { className: 'icon_pic' };
          return null;
        },
      },
    ];
    global.document = { querySelectorAll: (sel) => (sel.includes('table.gall_list') ? mutatingRows : []) };
    const unsafeResult = getAdjacentPostUrl('down', true);
    assert.deepStrictEqual(unsafeResult, {
      ok: false,
      status: 'unavailable',
      error: 'unsafe_url',
      message: '이동할 수 있는 게시글 목록을 찾을 수 없습니다.',
    });

    readCount = 0;
    toastMessages = [];
    navigatePost('down');
    assert.deepStrictEqual(toastMessages, ['이동할 수 있는 게시글 목록을 찾을 수 없습니다.']);
    assert.strictEqual(assignedHref, null);
    assert.strictEqual(storedAutoOpen, null);

    // 11.4 boundary: top & bottom
    const singleRows = [
      makeRow({ numText: '', href: '/mgallery/board/view/?id=pic&no=100', title: '단일 현재 글', isCurrent: true }),
    ];
    global.document = { querySelectorAll: (sel) => (sel.includes('table.gall_list') ? singleRows : []) };
    assert.deepStrictEqual(getAdjacentPostUrl('up', true), {
      ok: false,
      status: 'boundary',
      error: 'top',
      message: '목록의 가장 최신 글입니다.',
    });
    assert.deepStrictEqual(getAdjacentPostUrl('down', true), {
      ok: false,
      status: 'boundary',
      error: 'bottom',
      message: '목록의 마지막 글입니다.',
    });

    // 11.5 found: normal target result
    const normalRows = [
      makeRow({ numText: '101', href: '/mgallery/board/view/?id=pic&no=101', title: '  최신   글  ', hasPic: true }),
      makeRow({ numText: '', href: '/mgallery/board/view/?id=pic&no=100', title: '현재 글', isCurrent: true }),
      makeRow({ numText: '99', href: '/mgallery/board/view/?id=pic&no=99', title: '이전 일반 글', hasPic: false }),
    ];
    global.document = { querySelectorAll: (sel) => (sel.includes('table.gall_list') ? normalRows : []) };
    assert.deepStrictEqual(getAdjacentPostUrl('up', true), {
      ok: true,
      status: 'found',
      url: '/mgallery/board/view/?id=pic&no=101',
      title: '최신 글',
      hasPhoto: true,
    });
    assert.deepStrictEqual(getAdjacentPostUrl('down', false), {
      ok: true,
      status: 'found',
      url: '/mgallery/board/view/?id=pic&no=99',
      title: '이전 일반 글',
      hasPhoto: false,
    });

    toastMessages = [];
    navigatePost('up');
    assert.strictEqual(storedAutoOpen, '1');
    assert.strictEqual(assignedHref, '/mgallery/board/view/?id=pic&no=101');

    console.log('✅ Test 11: REFACTOR-05 getAdjacentPostUrl() Discriminated Result contract passed');
  } finally {
    global.window = origWindow;
    global.document = origDocument;
    global.sessionStorage = origSessionStorage;
    global.setTimeout = origSetTimeout;
    global.clearTimeout = origClearTimeout;
    state.elements = prevElements;
    state.toastTimer = prevToastTimer;
  }
}

Promise.resolve()
  .then(() => runParserUnitTests())
  .then(() => runDefect02Tests())
  .then(() => runDefect03Tests())
  .then(() => runDefect04Tests())
  .then(() => runRefactor05Tests())
  .then(() => {
    console.log('\n🎉 ALL UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
  })
  .catch((err) => {
    console.error('❌ Post navigation test failed:', err);
    process.exit(1);
  });
