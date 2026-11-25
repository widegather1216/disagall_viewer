// HTML Template Builders for Disagall Viewer Overlay
import { state } from '../state.js';

function buildHeaderLeftHtml() {
  return `
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
      </div>`;
}

function buildHeaderCenterHtml() {
  return `
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
      </div>`;
}

function buildHeaderRightHtml() {
  return `
      <div class="disagall-header-right">
        <button class="disagall-btn disagall-btn-recommend" id="disagall-btn-recommend" title="개념글 추천 (단축키: R)">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
          </svg>
          <span>개추</span>
        </button>
        <button class="disagall-btn disagall-btn-fullscreen" id="disagall-btn-fullscreen" title="전체화면 전환 (단축키: F)" aria-pressed="false">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
          <span>전체화면</span>
        </button>
        <button class="disagall-btn disagall-btn-close" id="disagall-close-btn" title="닫기 (ESC)">✕ 닫기</button>
      </div>`;
}

export function buildOverlayHeaderHtml() {
  return `
    <div class="disagall-header">
${buildHeaderLeftHtml()}
${buildHeaderCenterHtml()}
${buildHeaderRightHtml()}
    </div>`;
}

export function buildOverlayStageHtml() {
  return `
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
    </div>`;
}

export function buildOverlayFooterHtml() {
  return `
    <div class="disagall-footer">
      <div class="disagall-keyhints">
        <div class="disagall-keyhint"><span class="disagall-kbd">R</span> 개추</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">↑</span> <span class="disagall-kbd">↓</span> 이전/다음 글</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">←</span> <span class="disagall-kbd">→</span> 이전/다음 사진</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">마우스 휠 / 트랙패드</span> 확대/축소</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">드래그</span> 사진 이동</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">더블클릭</span> 확대 리셋</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">H</span> UI숨김</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">F</span> 전체화면</div>
        <div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> 닫기</div>
      </div>
    </div>`;
}

export function buildOverlayHtml() {
  return `${buildOverlayHeaderHtml()}
${buildOverlayStageHtml()}

    <div class="disagall-toast" id="disagall-toast"></div>
${buildOverlayFooterHtml()}
  `;
}
