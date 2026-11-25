// Recommend Parser & DOM detector for DC Inside

export const RECOMMEND_BUTTON_PRIORITY_SELECTORS = [
  '.btn_recommend_box button.btn_recom_up',
  'button.btn_recom_up',
  'a.btn_recom_up',
  'div.btn_recom_up',
  '.btn_recom_up',
  '.btn_recommend_up',
  'button.btn-recom',
  '.btn-recom',
  '.btn_recom',
  '.btn_recommend',
  'button[data-action="recommend"]',
  'button[data-type="recommend"]',
  'button.recom_btn'
];

export const RECOMMEND_BUTTON_SELECTORS = RECOMMEND_BUTTON_PRIORITY_SELECTORS.join(', ');

export const RECOMMEND_COUNT_PRIORITY_SELECTORS = [
  '[id^="recommend_view_up_"]',
  '.up_num_box .up_num',
  '.btn_recommend_box .up_num',
  '.recom_num',
  '.btn-recom .recom-num'
];

function isExcludedRecommendElement(el) {
  if (!el) return true;
  if (typeof el.closest === 'function') {
    if (
      el.closest('#disagall-viewer-overlay') ||
      el.closest('#disagall-no-photo-notice') ||
      el.closest('#disagall-quick-launcher')
    ) {
      return true;
    }
  }
  let cur = el;
  while (cur) {
    if (typeof cur.id === 'string' && cur.id.startsWith('disagall-')) {
      return true;
    }
    cur = cur.parentElement;
  }
  return false;
}

export function isRecommendButtonDisabled(btn) {
  if (!btn) return true;
  if (btn.disabled === true) return true;
  if (typeof btn.getAttribute === 'function') {
    const disabledAttr = btn.getAttribute('disabled');
    if (disabledAttr !== null && disabledAttr !== undefined) return true;
    if (btn.getAttribute('aria-disabled') === 'true') return true;
  }
  if (typeof btn.closest === 'function' && btn.closest('fieldset[disabled]')) {
    return true;
  }
  return false;
}

function findValidInSelector(root, selector, hasQueryAll) {
  if (!hasQueryAll) {
    const el = root.querySelector(selector);
    return (el && !isExcludedRecommendElement(el)) ? el : null;
  }

  const candidates = root.querySelectorAll(selector);
  if (!candidates) return null;

  for (const el of candidates) {
    if (!isExcludedRecommendElement(el)) return el;
  }
  return null;
}

function findFirstValidMatch(root, selectors) {
  if (!root) return null;
  const hasQueryAll = typeof root.querySelectorAll === 'function';
  const hasQueryOne = typeof root.querySelector === 'function';
  if (!hasQueryAll && !hasQueryOne) return null;

  for (const selector of selectors) {
    const matched = findValidInSelector(root, selector, hasQueryAll);
    if (matched) return matched;
  }
  return null;
}

export function getPostRecommendCount(root = (typeof document !== 'undefined' ? document : null)) {
  const countEl = findFirstValidMatch(root, RECOMMEND_COUNT_PRIORITY_SELECTORS);
  if (countEl) {
    const text = (countEl.textContent || '').trim();
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

export function getNativeRecommendButton(root = (typeof document !== 'undefined' ? document : null)) {
  return findFirstValidMatch(root, RECOMMEND_BUTTON_PRIORITY_SELECTORS);
}

export function isUserLoggedIn(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return false;
  const isLoginInput = (root.getElementById ? root.getElementById('is_login') : null) ||
                       (root.querySelector ? root.querySelector('input[name="is_login"]') : null);
  if (isLoginInput && isLoginInput.value) {
    return isLoginInput.value.trim().toUpperCase() === 'Y';
  }

  const loginOutBtn = root.querySelector?.('.btn_top_loginout, .login_info a, .user_info .logout, a[href*="logout"]');
  if (loginOutBtn) {
    const text = (loginOutBtn.textContent || '').trim();
    if (text.includes('로그아웃')) return true;
    if (text.includes('로그인')) return false;
  }

  if (root.querySelector?.('.my_nick, .user_name, .btn_logout, .user_info_box')) {
    return true;
  }

  return false;
}

export function isGalleryCodeEnforced(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root) return false;
  const kcaptchaInput = (root.getElementById ? root.getElementById('kcaptcha_use') : null) ||
                        (root.querySelector ? root.querySelector('input[name="kcaptcha_use"]') : null);
  if (kcaptchaInput && kcaptchaInput.value) {
    return kcaptchaInput.value.trim().toUpperCase() === 'Y';
  }

  return !!root.querySelector?.('#kcaptcha, [id*="kcaptcha"], .captcha_box');
}

export function dispatchRecommendClick(btn) {
  if (!btn || isExcludedRecommendElement(btn) || btn.isConnected === false || isRecommendButtonDisabled(btn)) {
    return false;
  }

  if (typeof btn.click === 'function') {
    try {
      btn.click();
      return true;
    } catch (e) { /* Native .click() threw; fall through to synthetic MouseEvent dispatch */ }
  }

  if (typeof btn.dispatchEvent !== 'function') {
    return false;
  }

  try {
    const mouseEvt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: (typeof window !== 'undefined' ? window : null),
      buttons: 1
    });
    return Boolean(btn.dispatchEvent(mouseEvt));
  } catch (err) {
    return false;
  }
}
