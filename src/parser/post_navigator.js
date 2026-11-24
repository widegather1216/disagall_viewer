// Post Navigation Parser for DC Inside

export function extractPostNo(url, origin = (typeof window !== 'undefined' ? window.location?.origin : 'https://gall.dcinside.com')) {
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

const ALLOWED_NAV_SCHEMES = new Set(['http', 'https', 'file']);
const EXCLUDED_CLASS_TOKENS = ['notice', 'ad', 'adv', 'ads', 'adsense', 'survey'];
const EXCLUDED_MARKER_SELECTOR = '.sp-notice, .sp-ad, .sp-survey, .icon_notice, .icon_ad, .icon_survey';
const EXCLUDED_NUM_TEXTS = new Set(['-', '공지', '설문']);
const EXCLUDED_SUBJECT_TEXTS = new Set(['공지', 'AD', '설문']);

export function isSafeNavigationHref(rawHref) {
  if (typeof rawHref !== 'string') return false;
  const trimmed = rawHref.trim();
  if (!trimmed || trimmed === '#') return false;
  // Strip ASCII control characters and whitespace to defeat scheme obfuscation (e.g. " JavaScript:", "java\tscript:")
  const normalized = trimmed.replace(/[\u0000-\u0020]+/g, '');
  const schemeMatch = normalized.match(/^([a-z][a-z0-9+.-]*):/i);
  if (schemeMatch) {
    return ALLOWED_NAV_SCHEMES.has(schemeMatch[1].toLowerCase());
  }
  return true;
}

function isSafePostLink(link) {
  if (!link || !link.href) return false;
  const rawAttr = typeof link.getAttribute === 'function' ? link.getAttribute('href') : null;
  if (rawAttr !== null && rawAttr !== undefined && !isSafeNavigationHref(rawAttr)) {
    return false;
  }
  return isSafeNavigationHref(link.href);
}

function hasClassToken(el, token) {
  if (!el) return false;
  if (el.classList && typeof el.classList.contains === 'function' && el.classList.contains(token)) {
    return true;
  }
  if (typeof el.className === 'string') {
    return el.className.split(/[\s>]+/).includes(token);
  }
  return false;
}

function isExcludedPostElement(el, numText = '', subjectText = '') {
  if (!el) return true;
  if (typeof el.className === 'string' && el.className.toLowerCase().includes('notice')) {
    return true;
  }
  if (EXCLUDED_CLASS_TOKENS.some((token) => hasClassToken(el, token))) {
    return true;
  }
  if (el.querySelector && el.querySelector(EXCLUDED_MARKER_SELECTOR)) {
    return true;
  }
  if (EXCLUDED_NUM_TEXTS.has(numText) || EXCLUDED_SUBJECT_TEXTS.has(subjectText)) {
    return true;
  }
  return false;
}

export function isDesktopPostRowValid(tr, currentPostNo) {
  if (!tr) return false;
  const titLink = tr.querySelector?.('.gall_tit a:not(.reply_numbox)') || tr.querySelector?.('a');
  if (!isSafePostLink(titLink)) return false;

  const numEl = tr.querySelector?.('.gall_num');
  const subjectEl = tr.querySelector?.('.gall_subject');
  const numText = numEl ? numEl.textContent.trim() : '';
  const subjectText = subjectEl ? subjectEl.textContent.trim() : '';

  if (isExcludedPostElement(tr, numText, subjectText)) return false;

  const isCurrentPost = hasClassToken(tr, 'crt') ||
                        (typeof tr.className === 'string' && tr.className.includes('crt')) ||
                        !!(tr.querySelector && tr.querySelector('.crt_icon')) ||
                        (currentPostNo && (
                          (tr.dataset && tr.dataset.no === currentPostNo) ||
                          extractPostNo(titLink.href) === currentPostNo
                        ));

  if (isCurrentPost) return true;

  if (!numText || isNaN(Number(numText))) return false;

  return true;
}

export function isMobilePostItemValid(li) {
  if (!li) return false;
  const link = li.querySelector?.('a');
  if (!isSafePostLink(link)) return false;

  const numEl = li.querySelector?.('.gall_num');
  const subjectEl = li.querySelector?.('.gall_subject, .subject-txt');
  const numText = numEl ? numEl.textContent.trim() : '';
  const subjectText = subjectEl ? subjectEl.textContent.trim() : '';

  if (isExcludedPostElement(li, numText, subjectText)) return false;

  return true;
}

export function getValidPostRows(currentPostNo, root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return [];
  const tableRows = Array.from(root.querySelectorAll('table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content'));
  if (tableRows.length > 0) {
    return tableRows.filter(tr => isDesktopPostRowValid(tr, currentPostNo));
  }
  const mobileItems = Array.from(root.querySelectorAll('.gall-detail-lst li, .gall-thum-btm li'));
  return mobileItems.filter(isMobilePostItemValid);
}

export function findCurrentPostRowIndex(validRows, currentPostNo) {
  return validRows.findIndex(row => {
    if (hasClassToken(row, 'crt') || (typeof row.className === 'string' && row.className.includes('crt')) || !!row.querySelector?.('.crt_icon')) {
      return true;
    }

    if (currentPostNo) {
      if (row.dataset && row.dataset.no === currentPostNo) return true;

      const numEl = row.querySelector?.('.gall_num');
      if (numEl && numEl.textContent.trim() === currentPostNo) return true;

      const titLink = row.querySelector?.('.gall_tit a:not(.reply_numbox)') || row.querySelector?.('a');
      if (titLink && extractPostNo(titLink.href) === currentPostNo) return true;
    }
    return false;
  });
}

export function hasPhotoAttachment(row) {
  if (!row) return false;

  // 1. Check subject text (e.g. '사진' category)
  const subjectEl = row.querySelector?.('.gall_subject');
  if (subjectEl) {
    const subj = subjectEl.textContent.trim();
    if (subj.includes('사진')) return true;
  }

  // 2. Check desktop DC title photo icon (.icon_pic, .icon_recomimg)
  const photoIcon = row.querySelector?.(
    '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg'
  );
  if (photoIcon) return true;

  // 3. Check mobile DC photo icon
  const mobilePhotoIcon = row.querySelector?.('.sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]');
  if (mobilePhotoIcon) return true;

  // 4. Check general image icon excluding text/survey/ad icons
  const anyImgIcon = row.querySelector?.('.icon_img');
  if (anyImgIcon) {
    const cls = anyImgIcon.className || '';
    if (!cls.includes('icon_txt') && !cls.includes('survey') && !cls.includes('notice') && !cls.includes('ad')) {
      return true;
    }
  }

  return false;
}

const NAV_UNAVAILABLE_MESSAGE = '이동할 수 있는 게시글 목록을 찾을 수 없습니다.';

function createUnavailableResult(error) {
  return {
    ok: false,
    status: 'unavailable',
    error,
    message: NAV_UNAVAILABLE_MESSAGE,
  };
}

export function getAdjacentPostUrl(
  direction,
  preferPhotos = true,
  currentUrl = (typeof window !== 'undefined' ? window.location?.href : ''),
  root = (typeof document !== 'undefined' ? document : null)
) {
  const currentPostNo = extractPostNo(currentUrl);
  const validRows = getValidPostRows(currentPostNo, root);

  if (validRows.length === 0) {
    return createUnavailableResult('no_list');
  }

  const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
  if (currentIdx === -1) {
    return createUnavailableResult('current_not_found');
  }

  const step = direction === 'up' ? -1 : 1;
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

  if (targetIdx < 0 || targetIdx >= validRows.length) {
    return direction === 'up'
      ? { ok: false, status: 'boundary', error: 'top', message: '목록의 가장 최신 글입니다.' }
      : { ok: false, status: 'boundary', error: 'bottom', message: '목록의 마지막 글입니다.' };
  }

  const targetRow = validRows[targetIdx];
  const targetLink = targetRow.querySelector?.('.gall_tit a:not(.reply_numbox)') || targetRow.querySelector?.('a');
  if (!targetLink || !isSafePostLink(targetLink)) {
    return createUnavailableResult('unsafe_url');
  }

  const targetTitle = (targetLink.textContent || '').trim().replace(/\s+/g, ' ');

  return {
    ok: true,
    status: 'found',
    url: targetLink.href,
    title: targetTitle,
    hasPhoto: hasPhotoAttachment(targetRow),
  };
}
