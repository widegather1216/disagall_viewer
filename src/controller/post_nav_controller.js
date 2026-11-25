// Post Navigation & Auto-Open Polling Controller for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { getAdjacentPostUrl, isSafeNavigationHref } from '../parser/post_navigator.js';
import { showViewerToast } from '../ui/overlay.js';
import { showNoPhotoNotice } from '../ui/no_photo_notice.js';

let postNavSeq = 0;
let autoOpenPollSeq = 0;

let postNavCallbacks = {
  onOpenViewer: () => {},
  onPreloadAndCollect: () => state.postImages,
};

export function setPostNavCallbacks(callbacks = {}) {
  postNavCallbacks = { ...postNavCallbacks, ...callbacks };
}

function withAutoOpenStorage(method, ...args) {
  try {
    if (typeof sessionStorage !== 'undefined' && typeof sessionStorage[method] === 'function') {
      return sessionStorage[method](CONFIG.STORAGE_KEY_AUTO_OPEN, ...args);
    }
  } catch (e) {
    // Non-fatal: sessionStorage access may be blocked under browser privacy or sandbox policies
  }
  return null;
}

export function cancelPendingPostNavigation() {
  postNavSeq += 1;
  if (state.postNavTimer === null) return false;
  clearTimeout(state.postNavTimer);
  state.postNavTimer = null;
  withAutoOpenStorage('removeItem');
  return true;
}

export function clearAutoOpenPollTimer() {
  autoOpenPollSeq += 1;
  if (state.autoOpenPollTimer === null) return false;
  clearInterval(state.autoOpenPollTimer);
  state.autoOpenPollTimer = null;
  return true;
}

function buildNavigateToastMessage(direction, result) {
  const label = direction === 'up' ? '위쪽 최신 글' : '아래쪽 이전 글';
  const photoHint = result.hasPhoto ? ' 📷' : '';
  const titleHint = result.title
    ? ` (${result.title.length > 12 ? result.title.slice(0, 12) + '...' : result.title})`
    : '';
  return `${label}로 이동 중...${photoHint}${titleHint}`;
}

export function navigatePost(direction) {
  cancelPendingPostNavigation();
  const result = getAdjacentPostUrl(direction);
  if (!result || !result.ok || result.status !== 'found') {
    showViewerToast(result?.message || '이동할 수 있는 게시글 목록을 찾을 수 없습니다.');
    return;
  }
  if (!result.url || !isSafeNavigationHref(result.url)) return;

  showViewerToast(buildNavigateToastMessage(direction, result));
  withAutoOpenStorage('setItem', '1');

  const token = postNavSeq;
  let fired = false;
  const timerId = setTimeout(() => {
    fired = true;
    if (token !== postNavSeq) return;
    state.postNavTimer = null;
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = result.url;
    }
  }, CONFIG.POST_NAV_DELAY);
  state.postNavTimer = fired ? null : timerId;
}

function stopPollInterval(pollCtx) {
  pollCtx.stopped = true;
  if (pollCtx.timerId !== null) clearInterval(pollCtx.timerId);
}

function runAutoOpenPollTick(pollCtx, callbacks) {
  if (pollCtx.token !== autoOpenPollSeq) {
    stopPollInterval(pollCtx);
    return;
  }
  pollCtx.attempts += 1;
  callbacks.onPreloadAndCollect();

  if (state.postImages.length > 0) {
    stopPollInterval(pollCtx);
    clearAutoOpenPollTimer();
    callbacks.onOpenViewer(null, true);
    return;
  }
  if (pollCtx.attempts >= pollCtx.maxAttempts) {
    stopPollInterval(pollCtx);
    clearAutoOpenPollTimer();
    showNoPhotoNotice((dir) => navigatePost(dir));
  }
}

function startAutoOpenPolling(callbacks = postNavCallbacks) {
  clearAutoOpenPollTimer();
  const pollCtx = {
    attempts: 0,
    maxAttempts: CONFIG.AUTO_OPEN_MAX_ATTEMPTS,
    token: autoOpenPollSeq,
    stopped: false,
    timerId: null,
  };
  pollCtx.timerId = setInterval(() => runAutoOpenPollTick(pollCtx, callbacks), CONFIG.AUTO_OPEN_POLL_INTERVAL);
  state.autoOpenPollTimer = pollCtx.stopped ? null : pollCtx.timerId;
}

export function checkAutoOpen(callbacks = postNavCallbacks) {
  if (withAutoOpenStorage('getItem') !== '1') return;
  withAutoOpenStorage('removeItem');
  startAutoOpenPolling(callbacks);
}
