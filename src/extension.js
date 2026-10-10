// Disagall Viewer - Chrome Extension Content Script Entry
import { CONFIG } from './config.js';
import { state } from './state.js';
import { openViewer, initViewerBase } from './controller/viewer_controller.js';

(function () {
  'use strict';

  // Load saved padding setting from chrome.storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get([CONFIG.STORAGE_KEY_PADDING], (result) => {
      if (result && typeof result[CONFIG.STORAGE_KEY_PADDING] === 'number') {
        state.currentPadding = result[CONFIG.STORAGE_KEY_PADDING];
        const { sliderEl, sliderValEl } = state.elements;
        if (sliderEl) {
          sliderEl.value = state.currentPadding;
          if (sliderValEl) sliderValEl.textContent = state.currentPadding + 'px';
        }
      }
    });
  }

  // Listen for messages from background script (Context Menu)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'open_viewer') {
        openViewer(message.srcUrl);
        sendResponse({ success: true });
      }
    });
  }

  // Initialize base listeners and auto-open
  initViewerBase();
})();
