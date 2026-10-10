// Overlay UI and Notice for Disagall Viewer
import { CONFIG } from '../config.js';
import { state } from '../state.js';

export function buildOverlayHtml() {
  return `
    <div class="disagall-header">
      <div class="disagall-header-left">
        <div class="disagall-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" ry="3"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          디시 사진 뷰어
        </div>
        <div class="disagall-counter" id="disagall-counter">1 / 1</div>
        <div class="disagall-info-badge" id="disagall-info-badge">화면 맞춤</div>
      </div>

      <div class="disagall-header-center">
        <div class="disagall-padding-control">
          <span class="disagall-slider-label">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <rect x="7" y="7" width="10" height="10" rx="1" ry="1"></rect>
            </svg>
            여백(패딩):
          </span>
          <input type="range" class="disagall-slider" id="disagall-slider" min="0" max="100" value="${state.currentPadding}">
          <span class="disagall-padding-val" id="disagall-slider-val">${state.currentPadding}px</span>
        </div>
      </div>

      <div class="disagall-header-right">
        <button class="disagall-btn disagall-btn-recommend" id="disagall-btn-recommend" title="개념글 추천 (단축키: R)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span>개추</span>
        </button>
        <button class="disagall-btn disagall-btn-close" id="disagall-close-btn" title="닫기 (ESC)">✕ 닫기</button>
      </div>
    </div>

    <div class="disagall-stage" id="disagall-stage">
      <div class="disagall-nav-btn disagall-nav-btn-prev" id="disagall-prev-btn" title="이전 이미지 (←)">
        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
        <span class="disagall-nav-hint">←</span>
      </div>

      <div class="disagall-loader" id="disagall-loader">
        <div class="disagall-spinner"></div>
        <span>고화질 원본 로딩 중...</span>
      </div>

      <div class="disagall-img-wrapper" id="disagall-img-wrapper">
        <img class="disagall-img" id="disagall-main-img" src="" alt="확대 뷰어 이미지" />
      </div>

      <div class="disagall-nav-btn disagall-nav-btn-next" id="disagall-next-btn" title="다음 이미지 (→)">
        <svg viewBox="0 0 24 24"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
        <span class="disagall-nav-hint">→</span>
      </div>
    </div>

    <div class="disagall-toast" id="disagall-toast"></div>

    <div class="disagall-footer">
      <div class="disagall-keyhints">
        <div class="disagall-keyhint"><span class="disagall-kbd">R</span> 개추</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">↑</span> <span class="disagall-kbd">↓</span> 이전/다음 글</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">마우스 휠 / 트랙패드</span> 확대/축소</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 사진 이동</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> 닫기</div>
      </div>
    </div>
  `;
}

export function cacheOverlayElements() {
  state.elements.overlayEl = document.getElementById('disagall-viewer-overlay');
  state.elements.mainImgEl = document.getElementById('disagall-main-img');
  state.elements.counterEl = document.getElementById('disagall-counter');
  state.elements.infoBadgeEl = document.getElementById('disagall-info-badge');
  state.elements.sliderEl = document.getElementById('disagall-slider');
  state.elements.sliderValEl = document.getElementById('disagall-slider-val');
  state.elements.prevBtnEl = document.getElementById('disagall-prev-btn');
  state.elements.nextBtnEl = document.getElementById('disagall-next-btn');
  state.elements.loaderEl = document.getElementById('disagall-loader');
  state.elements.toastEl = document.getElementById('disagall-toast');
  state.elements.recommendBtnEl = document.getElementById('disagall-btn-recommend');
}

export function applyFittingAndPadding() {
  const { mainImgEl, overlayEl, infoBadgeEl } = state.elements;
  if (!mainImgEl || !mainImgEl.naturalWidth || !mainImgEl.naturalHeight) return;

  const nw = mainImgEl.naturalWidth;
  const nh = mainImgEl.naturalHeight;
  const isPortrait = nh >= nw;

  const headerEl = overlayEl ? overlayEl.querySelector('.disagall-header') : null;
  const footerEl = overlayEl ? overlayEl.querySelector('.disagall-footer') : null;
  const headerHeight = headerEl ? headerEl.offsetHeight : 52;
  const footerHeight = footerEl ? footerEl.offsetHeight : 38;
  const availableHeight = Math.max(100, window.innerHeight - headerHeight - footerHeight - (state.currentPadding * 2));
  const availableWidth = Math.max(100, window.innerWidth - (state.currentPadding * 2));

  const widthRatio = availableWidth / nw;
  const heightRatio = availableHeight / nh;
  const scale = Math.min(widthRatio, heightRatio);

  const targetWidth = Math.round(nw * scale);
  const targetHeight = Math.round(nh * scale);

  mainImgEl.style.maxWidth = `${targetWidth}px`;
  mainImgEl.style.maxHeight = `${targetHeight}px`;
  mainImgEl.style.width = '100%';
  mainImgEl.style.height = '100%';

  const orientationText = isPortrait ? `세로 사진 (${nw}x${nh})` : `가로 사진 (${nw}x${nh})`;
  if (infoBadgeEl) {
    infoBadgeEl.textContent = orientationText;
  }

  if (isPortrait) {
    mainImgEl.classList.add('portrait');
    mainImgEl.classList.remove('landscape');
  } else {
    mainImgEl.classList.add('landscape');
    mainImgEl.classList.remove('portrait');
  }
}

export function showViewerToast(message, duration = CONFIG.TOAST_DURATION) {
  const { toastEl } = state.elements;
  if (!toastEl) return;
  if (state.toastTimer) clearTimeout(state.toastTimer);

  toastEl.textContent = message;
  toastEl.classList.add('show');

  state.toastTimer = setTimeout(() => {
    if (toastEl) toastEl.classList.remove('show');
  }, duration);
}

export function showNoPhotoNotice(onNavigatePost) {
  let noticeEl = document.getElementById('disagall-no-photo-notice');
  if (noticeEl) noticeEl.remove();

  noticeEl = document.createElement('div');
  noticeEl.id = 'disagall-no-photo-notice';
  noticeEl.className = 'disagall-no-photo-notice';
  noticeEl.innerHTML = `
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

  document.body.appendChild(noticeEl);

  const prevBtn = noticeEl.querySelector('#disagall-notice-prev');
  const nextBtn = noticeEl.querySelector('#disagall-notice-next');
  const closeBtn = noticeEl.querySelector('#disagall-notice-close');

  if (prevBtn) prevBtn.addEventListener('click', () => onNavigatePost('up'));
  if (nextBtn) nextBtn.addEventListener('click', () => onNavigatePost('down'));
  if (closeBtn) closeBtn.addEventListener('click', () => noticeEl.remove());

  const handleNoticeKey = (e) => {
    if (['ArrowUp', 'w', 'W'].includes(e.key)) {
      e.preventDefault();
      window.removeEventListener('keydown', handleNoticeKey);
      onNavigatePost('up');
    } else if (['ArrowDown', 's', 'S'].includes(e.key)) {
      e.preventDefault();
      window.removeEventListener('keydown', handleNoticeKey);
      onNavigatePost('down');
    } else if (e.key === 'Escape') {
      noticeEl.remove();
      window.removeEventListener('keydown', handleNoticeKey);
    }
  };
  window.addEventListener('keydown', handleNoticeKey);

  setTimeout(() => {
    if (noticeEl && noticeEl.parentNode) {
      noticeEl.remove();
      window.removeEventListener('keydown', handleNoticeKey);
    }
  }, CONFIG.NO_PHOTO_NOTICE_DURATION);
}
