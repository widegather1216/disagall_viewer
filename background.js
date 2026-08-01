// Chrome Service Worker for Disagall Viewer
chrome.runtime.onInstalled.addListener(() => {
  // Create context menu item for images and pages on DC Inside
  chrome.contextMenus.create({
    id: "open_dc_photo_viewer",
    title: "📷 디시 사진 뷰어로 화면 맞춤 보기",
    contexts: ["image", "page"]
  });
});

// Handle context menu click
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "open_dc_photo_viewer" && tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, {
      action: "open_viewer",
      srcUrl: info.srcUrl || null
    }).catch((err) => {
      console.warn("Disagall Viewer: Content script message sending failed:", err);
    });
  }
});
