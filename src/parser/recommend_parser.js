// Recommend Parser & DOM detector for DC Inside

export const RECOMMEND_BUTTON_SELECTORS = [
  'button.btn_recom_up',
  '.btn_recommend_box button.btn_recom_up',
  '.btn_recommend_box button',
  '.btn_recom_up',
  '.btn-recom',
  '.btn_recommend',
  'button[data-action="recommend"]',
  'button[data-type="recommend"]',
  'button[onclick*="recom"]',
  'a[onclick*="recom"]',
  'button.recom_btn',
  'button[id*="recommend"]',
  'button[data-no]',
  'a.btn_recom_up',
  'div.btn_recom_up'
].join(', ');

export function getPostRecommendCount(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelector) return null;
  const countEl = root.querySelector('[id^="recommend_view_up_"], .up_num_box .up_num, .btn_recommend_box .up_num, .recom_num');
  if (countEl) {
    const text = (countEl.textContent || '').trim();
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

export function getNativeRecommendButton(root = (typeof document !== 'undefined' ? document : null)) {
  if (!root || !root.querySelector) return null;
  return root.querySelector(RECOMMEND_BUTTON_SELECTORS);
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
  if (!btn) return false;

  if (typeof btn.click === 'function') {
    try {
      btn.click();
      return true;
    } catch (e) {}
  }

  try {
    const mouseEvt = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      view: (typeof window !== 'undefined' ? window : null),
      buttons: 1
    });
    return btn.dispatchEvent(mouseEvt);
  } catch (err) {
    return false;
  }
}
