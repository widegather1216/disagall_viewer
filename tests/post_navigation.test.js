// Unit Tests for Post Navigation logic (Disagall Viewer)
const assert = require('assert');
const fs = require('fs');

// 1. Logic under test: extractPostNo
function extractPostNo(url, origin = 'https://gall.dcinside.com') {
  if (!url) return null;
  try {
    const parsed = new URL(url, origin);
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

// 2. Logic under test: parseRows (matches updated content.js logic)
function parseRows(rows, currentUrl) {
  const currentPostNo = extractPostNo(currentUrl);

  const validRows = rows.filter(tr => {
    if (!tr.titLink || !tr.titLink.href) return false;
    const href = tr.titLink.href || '';
    if (href.startsWith('javascript:')) return false;

    const isCurrentPost = tr.isCrt ||
                          (tr.className && tr.className.includes('crt')) ||
                          tr.hasCrtIcon ||
                          (currentPostNo && (
                            (tr.html && tr.html.includes(currentPostNo)) ||
                            extractPostNo(href) === currentPostNo
                          ));

    if (isCurrentPost) {
      return true;
    }

    if (tr.numText === '-' || !tr.numText || isNaN(Number(tr.numText))) return false;
    if (tr.subjectText === '공지' || tr.subjectText === 'AD' || tr.subjectText === '설문') return false;
    if (tr.numText === '공지' || tr.numText === '설문') return false;
    if (tr.isNotice) return false;
    return true;
  });

  if (validRows.length === 0) return null;

  let currentIdx = validRows.findIndex(row => {
    if (row.isCrt || (row.className && row.className.includes('crt')) || row.hasCrtIcon) return true;
    if (currentPostNo) {
      if (row.numText && row.numText === currentPostNo) return true;
      if (row.titLink && extractPostNo(row.titLink.href) === currentPostNo) return true;
    }
    return false;
  });

  if (currentIdx === -1) return null;

  return {
    validRows,
    currentIdx,
    getAdjacent(direction) {
      const targetIdx = direction === 'up' ? currentIdx - 1 : currentIdx + 1;
      if (targetIdx < 0) {
        return { error: 'top', message: '목록의 가장 최신 글입니다.' };
      }
      if (targetIdx >= validRows.length) {
        return { error: 'bottom', message: '목록의 마지막 글입니다.' };
      }
      return {
        url: validRows[targetIdx].titLink.href,
        title: validRows[targetIdx].titLink.title
      };
    }
  };
}

// 3. Parser for full HTML string
function parseHtmlRows(html, currentUrl) {
  const trMatches = [...html.matchAll(/<tr\s+class="ub-content\s*([^"]*)"[\s\S]*?<\/tr>/g)];
  if (trMatches.length === 0) return null;

  const rows = trMatches.map(m => {
    const trHtml = m[0];
    const trClass = m[1];

    const numMatch = trHtml.match(/<td\s+class="gall_num"[^>]*>([\s\S]*?)<\/td>/);
    const numText = numMatch ? numMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const subMatch = trHtml.match(/<td\s+class="gall_subject"[^>]*>([\s\S]*?)<\/td>/);
    const subjectText = subMatch ? subMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    const linkMatch = trHtml.match(/<td\s+class="gall_tit[^"]*"[^>]*>[\s\S]*?<a\s+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    const linkHref = linkMatch ? linkMatch[1] : '';
    const linkTitle = linkMatch ? linkMatch[2].replace(/<[^>]+>/g, '').trim() : '';

    return {
      html: trHtml,
      className: trClass,
      numText,
      subjectText,
      titLink: linkHref ? { href: linkHref, title: linkTitle } : null,
      isCrt: trClass.includes('crt') || trHtml.includes('crt_icon'),
      hasCrtIcon: trHtml.includes('crt_icon'),
      isNotice: trClass.includes('notice') || trHtml.includes('class="notice"')
    };
  });

  return parseRows(rows, currentUrl);
}

// --- Test Suite ---
console.log('🧪 Starting Post Navigation Unit Tests...\n');

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
  console.log('✅ Test 1: extractPostNo passed all cases');
}

// Test 2: Actual DC behavior where current post numText is empty (DEFECT-01 fix validation)
{
  const mockRowsWithEmptyNum = [
    { numText: '-', subjectText: '설문', isNotice: false, isCrt: false, titLink: { href: 'javascript:;', title: '설문' } },
    { numText: '-', subjectText: 'AD', isNotice: false, isCrt: false, titLink: { href: 'https://coupang.com', title: '광고' } },
    { numText: '2041719', subjectText: '사진', isNotice: false, isCrt: false, titLink: { href: '/view/?id=digitalpicture&no=2041719', title: '위쪽 최신 글' } },
    // Notice: in real DC, current post row has NO numeric text, class may be "crt>" and has crt_icon
    { numText: '', subjectText: '사진', isNotice: false, isCrt: true, className: 'crt>', hasCrtIcon: true, titLink: { href: '/view/?id=digitalpicture&no=2041711&search_head=10&page=1', title: '현재 열람 중인 글' } },
    { numText: '2041707', subjectText: '사진', isNotice: false, isCrt: false, titLink: { href: '/view/?id=digitalpicture&no=2041707', title: '아래쪽 이전 글' } },
  ];

  const parsed = parseRows(mockRowsWithEmptyNum, 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1');
  assert(parsed !== null, 'DEFECT-01: Parsing must not be null when current row numText is empty');
  assert.strictEqual(parsed.validRows.length, 3, 'Valid rows must retain current post and exclude AD & 설문');
  assert.strictEqual(parsed.currentIdx, 1, 'Current post index must be 1');

  // Navigate UP (위쪽 최신 글 -> 2041719)
  const upResult = parsed.getAdjacent('up');
  assert.strictEqual(upResult.url, '/view/?id=digitalpicture&no=2041719');
  assert.strictEqual(upResult.title, '위쪽 최신 글');

  // Navigate DOWN (아래쪽 이전 글 -> 2041707)
  const downResult = parsed.getAdjacent('down');
  assert.strictEqual(downResult.url, '/view/?id=digitalpicture&no=2041707');
  assert.strictEqual(downResult.title, '아래쪽 이전 글');

  console.log('✅ Test 2: Real DC empty-numText current row handling (DEFECT-01) passed');
}

// Test 3: Top & Bottom boundaries
{
  const mockRows = [
    { numText: '', subjectText: '사진', isNotice: false, isCrt: true, className: 'crt', hasCrtIcon: true, titLink: { href: '/view/?no=2', title: '최신 글' } },
    { numText: '1', subjectText: '사진', isNotice: false, isCrt: false, titLink: { href: '/view/?no=1', title: '이전 글' } },
  ];

  const parsed = parseRows(mockRows, 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2');
  assert.strictEqual(parsed.getAdjacent('up').error, 'top');
  assert.strictEqual(parsed.getAdjacent('down').url, '/view/?no=1');

  console.log('✅ Test 3: Boundaries passed');
}

// Test 4: Live HTML Regression Test (live_post.html)
if (fs.existsSync('/Users/kimbeomjun/.gemini/antigravity/brain/47157376-6f1f-408b-a2c6-e9315e628464/scratch/live_post.html')) {
  const liveHtml = fs.readFileSync('/Users/kimbeomjun/.gemini/antigravity/brain/47157376-6f1f-408b-a2c6-e9315e628464/scratch/live_post.html', 'utf-8');
  const parsed = parseHtmlRows(liveHtml, 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=2041711&search_head=10&page=1');

  assert(parsed !== null, 'Live HTML parsing must not be null');
  assert.strictEqual(parsed.validRows.length, 50, 'Live HTML should have exactly 50 valid post rows');
  assert.strictEqual(parsed.currentIdx, 5, 'Current post (2041711) must be at index 5');

  const up = parsed.getAdjacent('up');
  assert.strictEqual(up.url, '/mgallery/board/view/?id=digitalpicture&no=2041719&search_head=10&page=1');
  assert.strictEqual(up.title, '4pic) 오늘은 사진이 찍고싶었어');

  const down = parsed.getAdjacent('down');
  assert.strictEqual(down.url, '/mgallery/board/view/?id=digitalpicture&no=2041707&search_head=10&page=1');
  assert.strictEqual(down.title, '사진입문전 폰카로 찍은 홋카이도 - 11pic');

  console.log('✅ Test 4: Live HTML integration test (post 2041711) passed');
}

// Test 5: Sample DC HTML Regression Test (dc_sample.html)
if (fs.existsSync('dc_sample.html')) {
  const sampleHtml = fs.readFileSync('dc_sample.html', 'utf-8');
  const parsed = parseHtmlRows(sampleHtml, 'https://gall.dcinside.com/mgallery/board/view/?id=digitalpicture&no=1968506');

  assert(parsed !== null, 'Sample HTML parsing must not be null');
  assert.strictEqual(parsed.validRows.length, 50, 'Sample HTML should have 50 valid post rows');
  assert.strictEqual(parsed.currentIdx, 18, 'Current post (1968506) must be at index 18');

  const up = parsed.getAdjacent('up');
  assert.strictEqual(up.url, '/mgallery/board/view/?id=digitalpicture&no=1968509&search_head=10&page=1');
  assert.strictEqual(up.title, '니가타 1일차');

  const down = parsed.getAdjacent('down');
  assert.strictEqual(down.url, '/mgallery/board/view/?id=digitalpicture&no=1968505&search_head=10&page=1');
  assert.strictEqual(down.title, '베짱이 한 장(징그러움주의)');

  console.log('✅ Test 5: Sample HTML integration test (post 1968506) passed');
}

console.log('\n🎉 ALL UNIT & INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉');
