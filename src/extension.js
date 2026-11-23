// Disagall Viewer - Chrome Extension Content Script Entry
import { openViewer, initViewerBase } from './controller/viewer_controller.js';

(function () {
  'use strict';

  // Listen for messages from background script (Context Menu)
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.action === 'open_viewer') {
        openViewer(message.srcUrl);
        sendResponse({ success: true });
      }
    });
  }

  // Initialize base listeners, unified immersion/padding storage sync, and auto-open
  initViewerBase();
})();
