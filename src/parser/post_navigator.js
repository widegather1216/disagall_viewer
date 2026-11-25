// Post Navigation Parser for DC Inside

const ALLOWED_NAV_SCHEMES = new Set(['http', 'https', 'file']);
const EXCLUDED_CLASS_TOKENS = ['notice', 'ad', 'adv', 'ads', 'adsense', 'survey'];
const EXCLUDED_MARKER_SELECTOR = '.sp-notice, .sp-ad, .sp-survey, .icon_notice, .icon_ad, .icon_survey';
const EXCLUDED_NUM_TEXTS = new Set(['-', '공지', '설문']);
const EXCLUDED_SUBJECT_TEXTS = new Set(['공지', 'AD', '설문']);
const PHOTO_ICON_SELECTOR =
  '.icon_pic, .icon_recomimg, .icon_img.icon_pic, .icon_img.icon_recomimg, [class*="icon_pic"], em.icon_pic, em.icon_recomimg, .sp-lst-img, .sp-photo, [class*="sp-lst-img"], [class*="ico_pic"]';
const NON_PHOTO_ICON_TOKENS = ['icon_txt', 'survey', 'notice', 'ad'];
const NAV_UNAVAILABLE_MESSAGE = '이동할 수 있는 게시글 목록을 찾을 수 없습니다.';

function getClassNameString(el) {
  return typeof el?.className === 'string' ? el.className : '';
}

function getTrimmedText(el) {
  return typeof el?.textContent === 'string' ? el.textContent.trim() : '';
}

function queryPostTitleLink(row) {
  return row?.querySelector?.('.gall_tit a:not(.reply_numbox)') || row?.querySelector?.('a') || null;
}

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
  const cls = getClassNameString(el);
  return cls ? cls.split(/[\s>]+/).includes(token) : false;
}

function isExcludedPostElement(el, numText = '', subjectText = '') {
  if (!el) return true;
  if (getClassNameString(el).toLowerCase().includes('notice')) return true;
  if (EXCLUDED_CLASS_TOKENS.some((token) => hasClassToken(el, token))) return true;
  if (el.querySelector && el.querySelector(EXCLUDED_MARKER_SELECTOR)) return true;
  return EXCLUDED_NUM_TEXTS.has(numText) || EXCLUDED_SUBJECT_TEXTS.has(subjectText);
}

export function isDesktopPostRowValid(tr, currentPostNo) {
  if (!tr) return false;
  const titLink = queryPostTitleLink(tr);
  if (!isSafePostLink(titLink)) return false;

  const numText = getTrimmedText(tr.querySelector?.('.gall_num'));
  const subjectText = getTrimmedText(tr.querySelector?.('.gall_subject'));
  if (isExcludedPostElement(tr, numText, subjectText)) return false;

  const isCurrentPost =
    hasClassToken(tr, 'crt') ||
    getClassNameString(tr).includes('crt') ||
    Boolean(tr.querySelector?.('.crt_icon')) ||
    Boolean(currentPostNo && (tr.dataset?.no === currentPostNo || extractPostNo(titLink.href) === currentPostNo));

  if (isCurrentPost) return true;
  return Boolean(numText) && !isNaN(Number(numText));
}

export function isMobilePostItemValid(li) {
  if (!li) return false;
  const link = li.querySelector?.('a');
  if (!isSafePostLink(link)) return false;

  const numText = getTrimmedText(li.querySelector?.('.gall_num'));
  const subjectText = getTrimmedText(li.querySelector?.('.gall_subject, .subject-txt'));
  return !isExcludedPostElement(li, numText, subjectText);
}

export function getValidPostRows(currentPostNo, root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelectorAll) return [];
  const tableRows = Array.from(root.querySelectorAll('table.gall_list tbody tr.ub-content, .gall_listwrap table tbody tr.ub-content'));
  if (tableRows.length > 0) {
    return tableRows.filter((tr) => isDesktopPostRowValid(tr, currentPostNo));
  }
  const mobileItems = Array.from(root.querySelectorAll('.gall-detail-lst li, .gall-thum-btm li'));
  return mobileItems.filter(isMobilePostItemValid);
}

export function findCurrentPostRowIndex(validRows, currentPostNo) {
  return validRows.findIndex((row) => {
    if (hasClassToken(row, 'crt') || getClassNameString(row).includes('crt') || row.querySelector?.('.crt_icon')) {
      return true;
    }
    if (!currentPostNo) return false;
    if (row.dataset?.no === currentPostNo) return true;
    if (getTrimmedText(row.querySelector?.('.gall_num')) === currentPostNo) return true;
    const titLink = queryPostTitleLink(row);
    return Boolean(titLink && extractPostNo(titLink.href) === currentPostNo);
  });
}

export function hasPhotoAttachment(row) {
  if (!row) return false;
  if (getTrimmedText(row.querySelector?.('.gall_subject')).includes('사진')) {
    return true;
  }
  if (row.querySelector?.(PHOTO_ICON_SELECTOR)) {
    return true;
  }
  const anyImgIcon = row.querySelector?.('.icon_img');
  if (!anyImgIcon) return false;
  const cls = getClassNameString(anyImgIcon);
  return !NON_PHOTO_ICON_TOKENS.some((token) => cls.includes(token));
}

function createUnavailableResult(error) {
  return {
    ok: false,
    status: 'unavailable',
    error,
    message: NAV_UNAVAILABLE_MESSAGE,
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
    return createUnavailableResult('unsafe_url');
  }
  const targetTitle = getTrimmedText(targetLink).replace(/\s+/g, ' ');
  return {
    ok: true,
    status: 'found',
    url: targetLink.href,
    title: targetTitle,
    hasPhoto,
  };
}

export function getAdjacentPostUrl(
  direction,
  preferPhotos = true,
  currentUrl = (typeof window !== 'undefined' ? window.location?.href : ''),
  root = (typeof document !== 'undefined' ? document : null)
) {
  if (direction !== 'up' && direction !== 'down') {
    return createUnavailableResult('invalid_direction');
  }
  const currentPostNo = extractPostNo(currentUrl);
  const validRows = getValidPostRows(currentPostNo, root);
  if (validRows.length === 0) return createUnavailableResult('no_list');

  const currentIdx = findCurrentPostRowIndex(validRows, currentPostNo);
  if (currentIdx === -1) return createUnavailableResult('current_not_found');

  const step = direction === 'up' ? -1 : 1;
  const { targetIdx, hasPhoto } = findTargetPostIndex(validRows, currentIdx, step, preferPhotos);
  if (targetIdx < 0 || targetIdx >= validRows.length) {
    return direction === 'up'
      ? { ok: false, status: 'boundary', error: 'top', message: '목록의 가장 최신 글입니다.' }
      : { ok: false, status: 'boundary', error: 'bottom', message: '목록의 마지막 글입니다.' };
  }

  return buildFoundPostResult(validRows[targetIdx], hasPhoto);
}
