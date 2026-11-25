// Recommend Controller for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import {
  getPostRecommendCount,
  getNativeRecommendButton,
  isRecommendButtonDisabled,
  isUserLoggedIn,
  isGalleryCodeEnforced,
  dispatchRecommendClick
} from '../parser/recommend_parser.js';
import { showViewerToast } from '../ui/overlay.js';
import { isOverlayActive } from './immersion_controller.js';

const RECOMMEND_UNLOCK_DELAY_MS = 500;
const RECOMMEND_LOCK_TOAST_DURATION_MS = 2500;

let lastRecommendTime = 0;
let isRecommending = false;
let hasVotedCurrentPost = false;

export function clearRecommendTimers() {
  if (Array.isArray(state.recommendTimers)) {
    state.recommendTimers.forEach((timerId) => clearTimeout(timerId));
    state.recommendTimers = [];
  }
  if (state.recommendUnlockTimer !== null) {
    clearTimeout(state.recommendUnlockTimer);
    state.recommendUnlockTimer = null;
  }
  isRecommending = false;
}

export function resetRecommendSessionState() {
  lastRecommendTime = 0;
  isRecommending = false;
  hasVotedCurrentPost = false;
  clearRecommendTimers();
}

export function updateRecommendButtonUi() {
  const { recommendBtnEl } = state.elements;
  if (!recommendBtnEl) return;
  const count = getPostRecommendCount();
  const countText = count !== null ? ` (${count})` : '';

  const isLoggedIn = isUserLoggedIn();
  const isCodeEnforced = isGalleryCodeEnforced();

  const lockIcon = (!isLoggedIn && isCodeEnforced) ? ' 🔒' : '';
  const hintTitle = (!isLoggedIn && isCodeEnforced)
    ? '개념글 추천 (비회원 코드/로그인 제한 갤러리 - 단축키: R)'
    : '개념글 추천 (단축키: R)';

  recommendBtnEl.title = hintTitle;
  recommendBtnEl.innerHTML = `
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
    </svg>
    <span>개추${countText}${lockIcon}</span>
  `;
}

function markCurrentPostVoted(recommendBtnEl) {
  hasVotedCurrentPost = true;
  if (recommendBtnEl) recommendBtnEl.classList.add('voted');
}

function checkPreRecommendGuards(now, recommendBtnEl) {
  if (now - lastRecommendTime < CONFIG.RECOMMEND_THROTTLE_MS) {
    showViewerToast('잠시 후 다시 시도해 주세요.');
    return { proceed: false, returnValue: false };
  }

  const btn = getNativeRecommendButton();
  if (!btn) {
    showViewerToast('본문의 추천 버튼을 찾을 수 없습니다.');
    return { proceed: false, returnValue: false };
  }

  const isAlreadyVoted = hasVotedCurrentPost ||
    isRecommendButtonDisabled(btn) ||
    Boolean(recommendBtnEl && recommendBtnEl.classList.contains('voted'));

  if (isAlreadyVoted) {
    showViewerToast('이미 개념글 추천을 완료한 게시글입니다. 👍');
    return { proceed: false, returnValue: true };
  }

  return { proceed: true, btn };
}

function handleMidRecommendCheck(beforeCount) {
  if (!isOverlayActive()) return;
  const midCount = getPostRecommendCount();
  updateRecommendButtonUi();

  if (midCount !== null && beforeCount !== null && midCount > beforeCount) {
    markCurrentPostVoted(state.elements.recommendBtnEl);
    showViewerToast('개념글 추천이 완료되었습니다! 👍');
  }
}

function handleAfterRecommendCheck(beforeCount, isLoggedIn) {
  if (!isOverlayActive()) return;
  const afterCount = getPostRecommendCount();
  updateRecommendButtonUi();
  if (afterCount === null || beforeCount === null) return;

  const { recommendBtnEl } = state.elements;
  if (afterCount > beforeCount) {
    markCurrentPostVoted(recommendBtnEl);
    return;
  }

  hasVotedCurrentPost = false;
  if (!isLoggedIn) {
    if (recommendBtnEl) recommendBtnEl.classList.remove('voted');
    showViewerToast('로그인이 필요한 갤러리입니다. (비회원 추천 제한 🔒)', RECOMMEND_LOCK_TOAST_DURATION_MS);
    return;
  }
  showViewerToast('추천이 반영되지 않았습니다. (이미 추천했거나 제한됨)');
}

function scheduleRecommendSyncTimers(beforeCount, isLoggedIn) {
  if (Array.isArray(state.recommendTimers)) {
    state.recommendTimers.forEach((timerId) => clearTimeout(timerId));
  }
  state.recommendTimers = [
    setTimeout(() => handleMidRecommendCheck(beforeCount), CONFIG.RECOMMEND_SYNC_DELAYS[0]),
    setTimeout(() => handleAfterRecommendCheck(beforeCount, isLoggedIn), CONFIG.RECOMMEND_SYNC_DELAYS[1])
  ];
}

function finalizeRecommendLock(shouldUnlockAsync) {
  if (!shouldUnlockAsync) {
    isRecommending = false;
    return;
  }
  if (state.recommendUnlockTimer !== null) {
    clearTimeout(state.recommendUnlockTimer);
  }
  state.recommendUnlockTimer = setTimeout(() => {
    isRecommending = false;
    state.recommendUnlockTimer = null;
  }, RECOMMEND_UNLOCK_DELAY_MS);
}

export function triggerPostRecommend() {
  if (!isOverlayActive() || isRecommending) return false;
  const now = Date.now();
  const guard = checkPreRecommendGuards(now, state.elements.recommendBtnEl);
  if (!guard.proceed) return guard.returnValue;
  const isLoggedIn = isUserLoggedIn();
  const isCodeEnforced = isGalleryCodeEnforced();
  const beforeCount = getPostRecommendCount();
  isRecommending = true;
  let shouldUnlockAsync = false;
  try {
    if (!dispatchRecommendClick(guard.btn)) {
      showViewerToast('추천 실행에 실패했습니다.');
      return false;
    }
    lastRecommendTime = now;
    showViewerToast((!isLoggedIn && isCodeEnforced)
      ? '개추 시도 중... (비회원 코드 제한 가능 🔒)'
      : '개념글 추천을 눌렀습니다! 👍');
    scheduleRecommendSyncTimers(beforeCount, isLoggedIn);
    shouldUnlockAsync = true;
    return true;
  } catch (e) {
    showViewerToast('추천 실행 중 오류가 발생했습니다.');
    return false;
  } finally {
    finalizeRecommendLock(shouldUnlockAsync);
  }
}
