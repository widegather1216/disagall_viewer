// Disagall Viewer - Safari / Tampermonkey Userscript Entry
import { CONFIG } from './config.js';
import { state } from './state.js';
import { isPostBodyImage, getBestImgUrl } from './parser/image_parser.js';
import { openViewer, initViewerBase } from './controller/viewer_controller.js';

(function () {
  'use strict';

  // Injected CSS Styles (will be injected at build time or fallback)
  if (typeof __INJECTED_CSS__ !== 'undefined') {
    if (typeof GM_addStyle !== 'undefined') {
      GM_addStyle(__INJECTED_CSS__);
    } else {
      const style = document.createElement('style');
      style.textContent = __INJECTED_CSS__;
      document.head.appendChild(style);
    }
  }

  // Load saved padding setting from Tampermonkey GM storage
  if (typeof GM_getValue !== 'undefined') {
    const savedPadding = GM_getValue(CONFIG.STORAGE_KEY_PADDING, CONFIG.DEFAULT_PADDING);
    if (typeof savedPadding === 'number') {
      state.currentPadding = savedPadding;
    }
  }

  // Floating Quick Launcher Button
  function initQuickLauncher() {
    const isPostPage = document.querySelector('.writing_view_box, .thum-txtin, .usertxt, .gallview_contents, #dc_contents');
    if (!isPostPage) return;

    if (document.getElementById('disagall-quick-launcher')) return;

    const launcher = document.createElement('button');
    launcher.id = 'disagall-quick-launcher';
    launcher.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
        <circle cx="12" cy="13" r="4"></circle>
      </svg>
      📷 뷰어 열기 (V)
    `;
    launcher.title = '디시 사진 뷰어로 화면 맞춤 원본 감상 (단축키: V)';
    launcher.addEventListener('click', () => openViewer());
    document.body.appendChild(launcher);
  }

  // Press V key to open viewer
  window.addEventListener('keydown', (e) => {
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
      return;
    }
    if ((e.key === 'v' || e.key === 'V') && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const { overlayEl } = state.elements;
      if (!overlayEl || !overlayEl.classList.contains('active')) {
        openViewer();
      }
    }
  });

  // Direct image click listener
  document.addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (img && isPostBodyImage(img)) {
      const url = getBestImgUrl(img);
      openViewer(url);
    }
  }, true);

  // GM Menu Command
  if (typeof GM_registerMenuCommand !== 'undefined') {
    GM_registerMenuCommand('📷 디시 사진 뷰어 실행', () => openViewer());
  }

  window.addEventListener('DOMContentLoaded', initQuickLauncher);
  setTimeout(initQuickLauncher, 1000);

  // Initialize base listeners and auto-open
  initViewerBase();
})();
