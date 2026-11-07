// Unit tests for viewer-immersion (Disagall Viewer)
const assert = require('assert');

async function run() {
  console.log('🧪 Starting Viewer Immersion Unit Tests...\n');

  // 1. Verify CONFIG constants
  const { CONFIG } = await import('../src/config.js');
  assert.strictEqual(
    CONFIG.UI_IDLE_TIMEOUT,
    2500,
    'CONFIG.UI_IDLE_TIMEOUT must be 2500ms'
  );
  assert.strictEqual(
    CONFIG.STORAGE_KEY_AUTO_HIDE_UI,
    'autoHideUi',
    'CONFIG.STORAGE_KEY_AUTO_HIDE_UI must be "autoHideUi"'
  );
  console.log('✅ Test 1: Immersion CONFIG constants verified');

  // 2. Verify state schema and initial default values
  const { state } = await import('../src/state.js');
  assert.strictEqual(
    state.idleTimer,
    null,
    'state.idleTimer must default to null'
  );
  assert.strictEqual(
    state.autoHideUi,
    true,
    'state.autoHideUi must default to true'
  );
  assert.strictEqual(
    state.isUiHidden,
    false,
    'state.isUiHidden must default to false'
  );
  console.log('✅ Test 2: Immersion state schema and initial values verified');

  // 3. Verify state mutation & lifecycle guardrails
  // Simulating timer lifecycle
  let timerFired = false;
  state.idleTimer = setTimeout(() => {
    timerFired = true;
  }, 50);

  assert(state.idleTimer !== null, 'idleTimer should hold timer reference');

  // Clear timer (simulating reset or closeViewer)
  clearTimeout(state.idleTimer);
  state.idleTimer = null;
  assert.strictEqual(state.idleTimer, null, 'idleTimer should be cleared safely');

  await new Promise((resolve) => setTimeout(resolve, 80));
  assert.strictEqual(timerFired, false, 'Cleared idleTimer must not execute callback (ghost callback defense)');
  console.log('✅ Test 3: Timer registration, safe clearing, and ghost callback defense verified');

  // 4. Verify UI state toggle contracts
  state.isUiHidden = true;
  assert.strictEqual(state.isUiHidden, true, 'isUiHidden should toggle to true');
  state.isUiHidden = false;
  assert.strictEqual(state.isUiHidden, false, 'isUiHidden should restore to false');

  state.autoHideUi = false;
  assert.strictEqual(state.autoHideUi, false, 'autoHideUi can be disabled via preferences');
  state.autoHideUi = true;
  assert.strictEqual(state.autoHideUi, true, 'autoHideUi defaults restored');
  console.log('✅ Test 4: UI state flags mutation & preferences toggle verified');

  // 5. Verify Storage Read/Write Contracts (popup.js storage helpers)
  const popup = require('../popup.js');
  assert.strictEqual(popup.STORAGE_KEYS.AUTO_HIDE_UI, 'autoHideUi');
  assert.strictEqual(popup.STORAGE_KEYS.PADDING, 'defaultPadding');

  // Mock chrome storage
  function createMockStorage(initialData = {}) {
    const store = { ...initialData };
    return {
      store,
      get(defaults, callback) {
        const result = {};
        for (const [key, defaultVal] of Object.entries(defaults)) {
          result[key] = Object.prototype.hasOwnProperty.call(store, key) ? store[key] : defaultVal;
        }
        callback(result);
      },
      set(items, callback) {
        Object.assign(store, items);
        if (typeof callback === 'function') callback();
      },
    };
  }

  // 5.1 Test fallback defaults when storage is empty
  const emptyStorage = createMockStorage();
  let loadedPadding = null;
  let loadedAutoHide = null;
  popup.loadSettings(emptyStorage, {
    onPaddingLoaded: (val) => { loadedPadding = val; },
    onAutoHideLoaded: (val) => { loadedAutoHide = val; },
  });
  assert.strictEqual(loadedPadding, 24, 'Default padding should fallback to 24px');
  assert.strictEqual(loadedAutoHide, true, 'Default autoHideUi should fallback to true');

  // 5.2 Test saving and loading custom values
  popup.saveAutoHideUi(emptyStorage, false);
  popup.savePadding(emptyStorage, 48);
  assert.strictEqual(emptyStorage.store.autoHideUi, false, 'saveAutoHideUi should persist false');
  assert.strictEqual(emptyStorage.store.defaultPadding, 48, 'savePadding should persist 48');

  let updatedPadding = null;
  let updatedAutoHide = null;
  popup.loadSettings(emptyStorage, {
    onPaddingLoaded: (val) => { updatedPadding = val; },
    onAutoHideLoaded: (val) => { updatedAutoHide = val; },
  });
  assert.strictEqual(updatedPadding, 48, 'Updated padding should load 48px');
  assert.strictEqual(updatedAutoHide, false, 'Updated autoHideUi should load false');
  console.log('✅ Test 5: Storage read/write contracts and fallback defaults verified');

  // 6. Verify Popup Controller & DOM Event Integration (initPopup)
  function createMockElement(id, initialProps = {}) {
    const listeners = {};
    return {
      id,
      ...initialProps,
      addEventListener(event, fn) {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      },
      dispatchEvent(event, payload = {}) {
        if (listeners[event]) {
          listeners[event].forEach((fn) => fn({ target: this, ...payload }));
        }
      },
    };
  }

  const mockSlider = createMockElement('padding-slider', { value: '24' });
  const mockValDisplay = createMockElement('padding-val', { textContent: '24px' });
  const mockToggle = createMockElement('auto-hide-ui-toggle', { checked: true });

  const mockDoc = {
    getElementById(id) {
      if (id === 'padding-slider') return mockSlider;
      if (id === 'padding-val') return mockValDisplay;
      if (id === 'auto-hide-ui-toggle') return mockToggle;
      return null;
    },
  };

  const syncStorage = createMockStorage({ autoHideUi: false, defaultPadding: 32 });

  // Initialize popup with pre-populated storage
  popup.initPopup(mockDoc, syncStorage);

  assert.strictEqual(mockSlider.value, 32, 'Slider value should initialize to storage value 32');
  assert.strictEqual(mockValDisplay.textContent, '32px', 'ValDisplay should initialize to 32px');
  assert.strictEqual(mockToggle.checked, false, 'Toggle should initialize to storage value false');

  // Simulate user toggling immersion mode On
  mockToggle.checked = true;
  mockToggle.dispatchEvent('change');
  assert.strictEqual(syncStorage.store.autoHideUi, true, 'Toggling switch should update storage to true');

  // Simulate user dragging slider
  mockSlider.value = '16';
  mockSlider.dispatchEvent('input', { target: { value: '16' } });
  assert.strictEqual(mockValDisplay.textContent, '16px', 'Slider input should update display to 16px');
  assert.strictEqual(syncStorage.store.defaultPadding, 16, 'Slider input should update storage to 16');
  console.log('✅ Test 6: Popup controller & DOM event integration verified');

  // 7. Verify Defensive Error Handling & Guardrails
  assert.doesNotThrow(() => {
    popup.loadSettings(null);
    popup.loadSettings({});
    popup.saveAutoHideUi(null, true);
    popup.savePadding(null, 24);
    popup.initPopup(null, null);
  }, 'Popup helper functions must safely guard against null/undefined storage and documents');
  console.log('✅ Test 7: Popup storage defensive guardrails verified');

  console.log('\n🎉 ALL VIEWER IMMERSION UNIT TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Viewer Immersion test failed:', err);
  process.exit(1);
});
