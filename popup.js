// Disagall Viewer Popup Script
document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('padding-slider');
  const valDisplay = document.getElementById('padding-val');

  // Load stored padding setting
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(['defaultPadding'], (result) => {
      if (result && typeof result.defaultPadding === 'number') {
        slider.value = result.defaultPadding;
        valDisplay.textContent = `${result.defaultPadding}px`;
      }
    });
  }

  // Update padding when slider moves
  slider.addEventListener('input', (e) => {
    const newVal = parseInt(e.target.value, 10);
    valDisplay.textContent = `${newVal}px`;

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ defaultPadding: newVal });
    }
  });
});
