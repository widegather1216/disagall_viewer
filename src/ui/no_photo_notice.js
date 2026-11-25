// No-Photo Notice Bar UI & Lifecycle for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';
import { isEditableTarget, isExternalModalOpen } from './dom_guards.js';

let activeNoticeCleanup = null;

function clearNoPhotoNoticeTimer() {
  if (state.noPhotoNoticeTimer === null) return;
  clearTimeout(state.noPhotoNoticeTimer);
  state.noPhotoNoticeTimer = null;
}

function buildNoPhotoNoticeHtml() {
  return `
    <div class="disagall-notice-content">
      <span class="disagall-notice-icon">📷</span>
      <span class="disagall-notice-text">본문에 사진이 없는 글입니다. (사진 탭 미적용)</span>
    </div>
    <div class="disagall-notice-btns">
      <button id="disagall-notice-prev" class="disagall-notice-btn" title="이전 글 (↑ / W)">↑ 이전 글</button>
      <button id="disagall-notice-next" class="disagall-notice-btn" title="다음 글 (↓ / S)">↓ 다음 글</button>
      <button id="disagall-notice-close" class="disagall-notice-btn close" title="닫기 (ESC)">✕</button>
    </div>
  `;
}

function shouldIgnoreNoticeKey(e) {
  if (!e || e.repeat) return true;
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const { overlayEl } = state.elements;
  if (overlayEl?.classList?.contains('active')) return true;
  const activeEl = typeof document !== 'undefined' ? document.activeElement : null;
  if (isEditableTarget(e.target) || isEditableTarget(activeEl)) return true;
  return isExternalModalOpen();
}

function resolveNoticeKeyAction(e) {
  if (['ArrowUp', 'w', 'W'].includes(e.key) || e.code === 'KeyW') return 'up';
  if (['ArrowDown', 's', 'S'].includes(e.key) || e.code === 'KeyS') return 'down';
  if (e.key === 'Escape') return 'dismiss';
  return null;
}

function createNoticeKeyHandler(dismissNotice, onNavigatePost) {
  return (e) => {
    if (shouldIgnoreNoticeKey(e)) return;
    const action = resolveNoticeKeyAction(e);
    if (!action) return;
    if (typeof e.preventDefault === 'function') e.preventDefault();
    if (typeof e.stopPropagation === 'function') e.stopPropagation();
    dismissNotice();
    if (action !== 'dismiss' && typeof onNavigatePost === 'function') {
      onNavigatePost(action);
    }
  };
}

function bindNoticeButtons(noticeEl, dismissNotice, onNavigatePost) {
  const navigateFromNotice = (direction) => {
    dismissNotice();
    if (typeof onNavigatePost === 'function') {
      onNavigatePost(direction);
    }
  };
  const prevBtn = noticeEl.querySelector?.('#disagall-notice-prev');
  const nextBtn = noticeEl.querySelector?.('#disagall-notice-next');
  const closeBtn = noticeEl.querySelector?.('#disagall-notice-close');
  if (prevBtn) prevBtn.addEventListener('click', () => navigateFromNotice('up'));
  if (nextBtn) nextBtn.addEventListener('click', () => navigateFromNotice('down'));
  if (closeBtn) closeBtn.addEventListener('click', dismissNotice);
}

function scheduleNoPhotoNoticeTimer(dismissNotice) {
  let fired = false;
  const timerId = setTimeout(() => {
    fired = true;
    dismissNotice();
  }, CONFIG.NO_PHOTO_NOTICE_DURATION);
  state.noPhotoNoticeTimer = fired ? null : timerId;
}

export function dismissNoPhotoNotice() {
  if (activeNoticeCleanup) {
    const cleanup = activeNoticeCleanup;
    activeNoticeCleanup = null;
    cleanup();
  }
  clearNoPhotoNoticeTimer();
  if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
    const existingEl = document.getElementById('disagall-no-photo-notice');
    if (existingEl && typeof existingEl.remove === 'function') {
      existingEl.remove();
    }
  }
}

export function showNoPhotoNotice(onNavigatePost) {
  dismissNoPhotoNotice();
  if (
    typeof document === 'undefined' ||
    typeof document.createElement !== 'function' ||
    !document.body ||
    typeof document.body.appendChild !== 'function'
  ) {
    return;
  }

  const noticeEl = document.createElement('div');
  noticeEl.id = 'disagall-no-photo-notice';
  noticeEl.className = 'disagall-no-photo-notice';
  noticeEl.innerHTML = buildNoPhotoNoticeHtml();
  document.body.appendChild(noticeEl);

  let isDismissed = false;
  let handleNoticeKey = null;

  const dismissNotice = () => {
    if (isDismissed) return;
    isDismissed = true;
    if (activeNoticeCleanup === dismissNotice) activeNoticeCleanup = null;
    clearNoPhotoNoticeTimer();
    if (handleNoticeKey && typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('keydown', handleNoticeKey);
    }
    if (noticeEl && typeof noticeEl.remove === 'function') noticeEl.remove();
  };

  handleNoticeKey = createNoticeKeyHandler(dismissNotice, onNavigatePost);
  activeNoticeCleanup = dismissNotice;
  bindNoticeButtons(noticeEl, dismissNotice, onNavigatePost);
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('keydown', handleNoticeKey);
  }
  scheduleNoPhotoNoticeTimer(dismissNotice);
}
