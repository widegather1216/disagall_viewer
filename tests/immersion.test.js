// Unit tests for viewer-immersion (Disagall Viewer)
const assert = require('assert');
const fs = require('fs');
const path = require('path');

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

  // Helper: Fake timer harness for deterministic timeout & debounce testing
  async function withFakeTimers(fn) {
    const origSetTimeout = global.setTimeout;
    const origClearTimeout = global.clearTimeout;
    let nextId = 1;
    const tasks = new Map();

    global.setTimeout = (cb, delay) => {
      const id = nextId++;
      tasks.set(id, { id, cb, delay });
      return id;
    };

    global.clearTimeout = (id) => {
      tasks.delete(id);
    };

    const timerApi = {
      get count() {
        return tasks.size;
      },
      getAll() {
        return Array.from(tasks.values());
      },
      runNext() {
        const next = tasks.values().next().value;
        if (!next) return false;
        tasks.delete(next.id);
        next.cb();
        return true;
      },
      clearAll() {
        tasks.clear();
      }
    };

    try {
      await fn(timerApi);
    } finally {
      global.setTimeout = origSetTimeout;
      global.clearTimeout = origClearTimeout;
    }
  }

  // 6. Verify Popup Controller, Slider Debounce/Change Commit & NaN Guard (initPopup)
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

  function createPopupDoc(slider, valDisplay, toggle) {
    return {
      getElementById(id) {
        if (id === 'padding-slider') return slider;
        if (id === 'padding-val') return valDisplay;
        if (id === 'auto-hide-ui-toggle') return toggle;
        return null;
      },
    };
  }

  await withFakeTimers(async (timers) => {
    const mockSlider = createMockElement('padding-slider', { value: '24' });
    const mockValDisplay = createMockElement('padding-val', { textContent: '24px' });
    const mockToggle = createMockElement('auto-hide-ui-toggle', { checked: true });
    const mockDoc = createPopupDoc(mockSlider, mockValDisplay, mockToggle);

    const syncStorage = createMockStorage({ autoHideUi: false, defaultPadding: 32 });
    const paddingWrites = [];
    const origSet = syncStorage.set;
    syncStorage.set = (items, cb) => {
      if (Object.prototype.hasOwnProperty.call(items, 'defaultPadding')) {
        paddingWrites.push(items.defaultPadding);
      }
      origSet(items, cb);
    };

    // Initialize popup with pre-populated storage
    popup.initPopup(mockDoc, syncStorage);

    assert.strictEqual(mockSlider.value, 32, 'Slider value should initialize to storage value 32');
    assert.strictEqual(mockValDisplay.textContent, '32px', 'ValDisplay should initialize to 32px');
    assert.strictEqual(mockToggle.checked, false, 'Toggle should initialize to storage value false');

    // Simulate user toggling immersion mode On
    mockToggle.checked = true;
    mockToggle.dispatchEvent('change');
    assert.strictEqual(syncStorage.store.autoHideUi, true, 'Toggling switch should update storage to true');

    // Simulate rapid user dragging slider -> immediate UI preview, debounced storage write
    mockSlider.value = '12';
    mockSlider.dispatchEvent('input', { target: { value: '12' } });
    mockSlider.value = '20';
    mockSlider.dispatchEvent('input', { target: { value: '20' } });
    mockSlider.value = '16';
    mockSlider.dispatchEvent('input', { target: { value: '16' } });
    assert.strictEqual(mockValDisplay.textContent, '16px', 'Slider input should update display immediately to 16px');
    assert.strictEqual(syncStorage.store.defaultPadding, 32, 'Rapid slider input must debounce storage writes');
    assert.strictEqual(paddingWrites.length, 0, 'Rapid slider input must not write on every tick');
    assert.strictEqual(timers.count, 1, 'Rapid slider input must coalesce into one debounce timer');
    assert.strictEqual(timers.getAll()[0].delay, popup.PADDING_SAVE_DEBOUNCE_MS);

    // Debounce timer fires -> persists final value once
    timers.runNext();
    assert.strictEqual(syncStorage.store.defaultPadding, 16, 'Debounce timer must persist final padding 16');
    assert.deepStrictEqual(paddingWrites, [16], 'Debounced slider input must write once');

    // Invalid NaN slider input must be ignored safely
    mockSlider.dispatchEvent('input', { target: { value: 'not-a-number' } });
    assert.strictEqual(mockValDisplay.textContent, '16px', 'NaN slider input must not overwrite display');
    assert.strictEqual(timers.count, 0, 'NaN slider input must not schedule storage write');

    // Slider change event cancels pending debounce and commits immediately
    mockSlider.value = '48';
    mockSlider.dispatchEvent('input', { target: { value: '48' } });
    assert.strictEqual(timers.count, 1);
    mockSlider.dispatchEvent('change', { target: { value: '48' } });
    assert.strictEqual(timers.count, 0, 'Slider change must cancel pending debounce timer');
    assert.strictEqual(syncStorage.store.defaultPadding, 48, 'Slider change must commit padding immediately');
    assert.deepStrictEqual(paddingWrites, [16, 48]);
  });
  console.log('✅ Test 6: Popup controller, slider debounce/change commit & NaN guard verified');

  // 7. Verify Defensive Error Handling, NaN Guard & onChanged Key-Deletion/Type Guardrails
  assert.doesNotThrow(() => {
    popup.loadSettings(null);
    popup.loadSettings({});
    popup.saveAutoHideUi(null, true);
    popup.savePadding(null, 24);
    popup.savePadding(emptyStorage, NaN);
    popup.savePadding(emptyStorage, 'bad-value');
    popup.initPopup(null, null);
  }, 'Popup helper functions must safely guard against null/undefined/NaN inputs');
  assert.strictEqual(emptyStorage.store.defaultPadding, 48, 'Invalid savePadding(NaN) must not corrupt storage');

  const origGlobalChrome = global.chrome;
  try {
    let registeredPopupOnChanged = null;
    global.chrome = {
      storage: {
        onChanged: {
          addListener(fn) {
            registeredPopupOnChanged = fn;
          },
        },
      },
    };

    const syncSlider = createMockElement('padding-slider', { value: '24' });
    const syncValDisplay = createMockElement('padding-val', { textContent: '24px' });
    const syncToggle = createMockElement('auto-hide-ui-toggle', { checked: true });
    const syncDoc = createPopupDoc(syncSlider, syncValDisplay, syncToggle);
    const localStore = createMockStorage({ autoHideUi: true, defaultPadding: 24 });

    popup.initPopup(syncDoc, localStore);
    assert.strictEqual(typeof registeredPopupOnChanged, 'function', 'initPopup must register chrome.storage.onChanged listener');

    // Valid sync update
    registeredPopupOnChanged(
      {
        autoHideUi: { oldValue: true, newValue: false },
        defaultPadding: { oldValue: 24, newValue: 40 },
      },
      'sync'
    );
    assert.strictEqual(syncToggle.checked, false, 'Valid sync boolean must update toggle');
    assert.strictEqual(syncSlider.value, 40, 'Valid sync number must update slider');
    assert.strictEqual(syncValDisplay.textContent, '40px', 'Valid sync number must update display');

    // Key deletion (newValue === undefined) must NOT pollute UI with 'undefinedpx' or undefined
    registeredPopupOnChanged(
      {
        autoHideUi: { oldValue: false, newValue: undefined },
        defaultPadding: { oldValue: 40, newValue: undefined },
      },
      'sync'
    );
    assert.strictEqual(syncToggle.checked, false, 'Deleted autoHideUi key must not overwrite toggle with undefined');
    assert.strictEqual(syncSlider.value, 40, 'Deleted padding key must not overwrite slider');
    assert.strictEqual(syncValDisplay.textContent, '40px', 'Deleted padding key must not produce undefinedpx');

    // Wrong types / NaN / non-sync area must be ignored
    registeredPopupOnChanged(
      {
        autoHideUi: { newValue: 'true' },
        defaultPadding: { newValue: Number.NaN },
      },
      'sync'
    );
    registeredPopupOnChanged({ defaultPadding: { newValue: '12' } }, 'sync');
    registeredPopupOnChanged({ autoHideUi: { newValue: true }, defaultPadding: { newValue: 10 } }, 'local');
    assert.strictEqual(syncToggle.checked, false, 'Invalid type or non-sync area must not mutate toggle');
    assert.strictEqual(syncSlider.value, 40, 'Invalid type, NaN, or non-sync area must not mutate slider');
    assert.strictEqual(syncValDisplay.textContent, '40px', 'Invalid type, NaN, or non-sync area must not mutate display');
  } finally {
    global.chrome = origGlobalChrome;
  }
  console.log('✅ Test 7: Popup defensive guardrails & onChanged type/key-deletion defense verified');

  // Helper: Lightweight DOM/Browser harness for controller tests
  function createMockDomNode(id = '') {
    const classes = new Set();
    const listeners = {};
    const attrs = {};
    const node = {
      id,
      style: {},
      value: '24',
      textContent: '',
      innerHTML: '',
      children: [],
      setAttribute: (k, v) => { attrs[k] = String(v); },
      getAttribute: (k) => (k in attrs ? attrs[k] : null),
      classList: {
        add: (...names) => names.forEach((n) => classes.add(n)),
        remove: (...names) => names.forEach((n) => classes.delete(n)),
        toggle: (name, force) => {
          if (force === undefined) {
            if (classes.has(name)) {
              classes.delete(name);
              return false;
            }
            classes.add(name);
            return true;
          }
          if (force) classes.add(name);
          else classes.delete(name);
          return Boolean(force);
        },
        contains: (name) => classes.has(name),
      },
      addEventListener: (event, fn) => {
        if (!listeners[event]) listeners[event] = [];
        listeners[event].push(fn);
      },
      removeEventListener: (event, fn) => {
        if (!listeners[event]) return;
        listeners[event] = listeners[event].filter((h) => h !== fn);
      },
      dispatchEvent: (event, payload = {}) => {
        const handlers = listeners[event] || [];
        handlers.forEach((fn) => fn({ target: node, preventDefault() {}, stopPropagation() {}, ...payload }));
      },
      appendChild: (child) => {
        node.children.push(child);
        return child;
      },
      contains: () => false,
      querySelector: () => null,
    };
    return node;
  }

  async function withControllerHarness(fn) {
    const origDocument = global.document;
    const origWindow = global.window;
    const origRaf = global.requestAnimationFrame;
    const origCancelRaf = global.cancelAnimationFrame;
    const origChrome = global.chrome;
    const origGmGetValue = global.GM_getValue;
    const origGmSetValue = global.GM_setValue;

    const overlayNode = createMockDomNode('disagall-viewer-overlay');
    const headerNode = createMockDomNode('disagall-header');
    headerNode.offsetHeight = 52;
    const footerNode = createMockDomNode('disagall-footer');
    footerNode.offsetHeight = 38;
    const stageNode = createMockDomNode('disagall-stage');
    const sliderNode = createMockDomNode('disagall-slider');
    const sliderValNode = createMockDomNode('disagall-slider-val');
    const mainImgNode = createMockDomNode('disagall-main-img');
    const fullscreenBtnNode = createMockDomNode('disagall-btn-fullscreen');
    const fullscreenLabelNode = createMockDomNode('disagall-fullscreen-label');
    fullscreenBtnNode.querySelector = (sel) => (sel === 'span' ? fullscreenLabelNode : null);
    const toastNode = createMockDomNode('disagall-toast');
    const closeBtnNode = createMockDomNode('disagall-close-btn');
    const bodyNode = createMockDomNode('body');
    const windowListeners = {};
    const documentListeners = {};

    let fullscreenCalls = 0;
    let exitFullscreenCalls = 0;
    let rejectFullscreen = false;
    let openModalNode = null;

    overlayNode.querySelector = (selector) => {
      if (selector === '.disagall-header') return headerNode;
      if (selector === '.disagall-footer') return footerNode;
      if (selector === '#disagall-stage' || selector === '.disagall-stage') return stageNode;
      return null;
    };
    overlayNode.requestFullscreen = () => {
      fullscreenCalls++;
      if (rejectFullscreen) {
        return Promise.reject(new Error('Fullscreen blocked'));
      }
      mockDocument.fullscreenElement = overlayNode;
      return Promise.resolve();
    };

    const elementMap = {
      'disagall-viewer-overlay': overlayNode,
      'disagall-stage': stageNode,
      'disagall-main-img': mainImgNode,
      'disagall-slider': sliderNode,
      'disagall-slider-val': sliderValNode,
      'disagall-btn-fullscreen': fullscreenBtnNode,
      'disagall-toast': toastNode,
      'disagall-close-btn': closeBtnNode,
    };

    const mockDocument = {
      readyState: 'complete',
      body: bodyNode,
      fullscreenElement: null,
      createElement: () => overlayNode,
      getElementById: (id) => elementMap[id] || null,
      querySelector: (selector) => {
        if (selector.includes('dialog[open]')) return openModalNode;
        return null;
      },
      addEventListener: (event, fn) => {
        if (!documentListeners[event]) documentListeners[event] = [];
        documentListeners[event].push(fn);
      },
      removeEventListener: (event, fn) => {
        if (!documentListeners[event]) return;
        documentListeners[event] = documentListeners[event].filter((h) => h !== fn);
      },
      dispatchEvent: (event, payload = {}) => {
        const handlers = documentListeners[event] || [];
        handlers.forEach((fn) => fn({ target: mockDocument, preventDefault() {}, stopPropagation() {}, ...payload }));
      },
      exitFullscreen: () => {
        exitFullscreenCalls++;
        if (rejectFullscreen) {
          return Promise.reject(new Error('Exit fullscreen blocked'));
        }
        mockDocument.fullscreenElement = null;
        return Promise.resolve();
      },
    };

    const mockWindow = {
      innerWidth: 1280,
      innerHeight: 800,
      location: { origin: 'https://gall.dcinside.com' },
      addEventListener: (event, fn) => {
        if (!windowListeners[event]) windowListeners[event] = [];
        windowListeners[event].push(fn);
      },
      removeEventListener: (event, fn) => {
        if (!windowListeners[event]) return;
        windowListeners[event] = windowListeners[event].filter((h) => h !== fn);
      },
      dispatchEvent: (event, payload = {}) => {
        const handlers = windowListeners[event] || [];
        handlers.forEach((fn) => fn({ preventDefault() {}, stopPropagation() {}, ...payload }));
      },
    };

    global.document = mockDocument;
    global.window = mockWindow;
    global.requestAnimationFrame = () => 1;
    global.cancelAnimationFrame = () => {};

    // Reset state before running scenario
    state.idleTimer = null;
    state.autoHideUi = true;
    state.autoFullscreen = false;
    state.isUiHidden = false;
    state.isFullscreenMode = false;
    state.zoom.isDragging = false;
    state.zoom.scale = 1.0;
    state.elements.overlayEl = null;
    state.elements.stageEl = null;
    state.elements.mainImgEl = null;
    state.elements.sliderEl = null;
    state.elements.sliderValEl = null;
    state.elements.fullscreenBtnEl = null;
    state.elements.toastEl = null;

    const controller = await import('../src/controller/viewer_controller.js');

    try {
      await fn({
        controller,
        overlayNode,
        headerNode,
        footerNode,
        stageNode,
        mainImgNode,
        fullscreenBtnNode,
        fullscreenLabelNode,
        toastNode,
        sliderNode,
        sliderValNode,
        mockDocument,
        mockWindow,
        getFullscreenCalls: () => fullscreenCalls,
        getExitFullscreenCalls: () => exitFullscreenCalls,
        setRejectFullscreen: (val) => { rejectFullscreen = val; },
        setOpenModalNode: (node) => { openModalNode = node; },
      });
    } finally {
      controller.clearIdleTimer();
      state.elements.overlayEl = null;
      state.elements.stageEl = null;
      state.elements.fullscreenBtnEl = null;
      state.elements.toastEl = null;
      state.autoHideUi = true;
      state.autoFullscreen = false;
      state.isUiHidden = false;
      state.isFullscreenMode = false;
      state.currentPadding = CONFIG.DEFAULT_PADDING;
      state.zoom.isDragging = false;
      global.document = origDocument;
      global.window = origWindow;
      global.requestAnimationFrame = origRaf;
      global.cancelAnimationFrame = origCancelRaf;
      global.chrome = origChrome;
      global.GM_getValue = origGmGetValue;
      global.GM_setValue = origGmSetValue;
    }
  }

  // 8. Verify idle timer registration (2500ms), expiration (.disagall-idle), and mousemove restoration
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode }) => {
      controller.createOverlay();
      overlayNode.classList.add('active');
      controller.resetIdleTimer();

      assert.strictEqual(timers.count, 1, 'Active viewer must register exactly 1 idle timer');
      assert.strictEqual(timers.getAll()[0].delay, 2500, 'Idle timer delay must equal CONFIG.UI_IDLE_TIMEOUT (2500ms)');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'UI must remain visible before timeout');

      // Expire idle timer -> UI fades out
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'Overlay must gain .disagall-idle after timeout');
      assert.strictEqual(state.idleTimer, null, 'state.idleTimer must clear after firing');

      // Mousemove restores UI immediately and reschedules timer
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'Mousemove must immediately restore UI');
      assert.strictEqual(timers.count, 1, 'Mousemove must reschedule idle timer');

      // autoHideUi === false disables automatic timer scheduling
      state.autoHideUi = false;
      controller.resetIdleTimer();
      assert.strictEqual(timers.count, 0, 'No idle timer should be scheduled when autoHideUi is false');
    });
  });
  console.log('✅ Test 8: Idle timer 2500ms lifecycle, expiration, and mousemove restoration verified');

  // 9. Verify manual UI toggle via H / h shortcut
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode }) => {
      controller.createOverlay();
      overlayNode.classList.add('active');
      controller.resetIdleTimer();
      assert.strictEqual(timers.count, 1);

      // Press 'h' -> immediate manual hide and clear idle timer
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, true, 'Pressing h must set state.isUiHidden to true');
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true, 'Manual hide must add .disagall-ui-hidden');
      assert.strictEqual(timers.count, 0, 'Manual hide must clear pending idle timer');

      // Press 'H' -> immediate restore and restart idle timer
      controller.handleKeyDown({ key: 'H', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'Pressing H must restore state.isUiHidden to false');
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), false, 'Restoring UI must remove .disagall-ui-hidden');
      assert.strictEqual(timers.count, 1, 'Restoring UI with autoHideUi=true must restart idle timer');

      // Manual toggle still works when autoHideUi === false
      state.autoHideUi = false;
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, true, 'Manual hide must work even when autoHideUi is false');
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'Manual restore must work even when autoHideUi is false');
      assert.strictEqual(timers.count, 0, 'Restoring UI with autoHideUi=false must not schedule idle timer');
    });
  });
  console.log('✅ Test 9: Manual UI toggle shortcut (H/h) verified');

  // 10. Verify browser fullscreen toggle (F/f), Escape in fullscreen, and promise rejection safety
  await withControllerHarness(async ({
    controller,
    overlayNode,
    mockDocument,
    getFullscreenCalls,
    getExitFullscreenCalls,
    setRejectFullscreen
  }) => {
    controller.createOverlay();
    overlayNode.classList.add('active');

    // Press 'f' to enter fullscreen
    controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(getFullscreenCalls(), 1, 'Pressing f must call overlayEl.requestFullscreen()');
    assert.strictEqual(mockDocument.fullscreenElement, overlayNode, 'fullscreenElement must be set to overlayEl');

    // Press 'Escape' while in fullscreen -> exit fullscreen, keep viewer active
    controller.handleKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(getExitFullscreenCalls(), 1, 'Escape in fullscreen must exit fullscreen first');
    assert.strictEqual(mockDocument.fullscreenElement, null, 'fullscreenElement must be cleared');
    assert.strictEqual(overlayNode.classList.contains('active'), true, 'Viewer must stay open after Escape exits fullscreen');

    // Press 'F' to re-enter fullscreen, then press 'F' again to exit
    controller.handleKeyDown({ key: 'F', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(getFullscreenCalls(), 2);
    controller.handleKeyDown({ key: 'F', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(getExitFullscreenCalls(), 2, 'Pressing F while fullscreen must call document.exitFullscreen()');

    // Rejected promise must not throw or cause unhandled rejection
    setRejectFullscreen(true);
    assert.doesNotThrow(() => {
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
    }, 'Rejected requestFullscreen promise must be safely caught');
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
  console.log('✅ Test 10: Browser fullscreen toggle (F/f) & Escape-in-fullscreen guardrail verified');

  // 11. Verify keyboard guardrails (inactive overlay, input fields, modifier keys, open modal)
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode, getFullscreenCalls, setOpenModalNode }) => {
      controller.createOverlay();

      // 11.1 Inactive (!active) guard
      controller.resetIdleTimer();
      assert.strictEqual(timers.count, 0, 'Inactive overlay must not schedule idle timer');
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(timers.count, 0, 'Mousemove on inactive overlay must be ignored');
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'H key on inactive overlay must be ignored');
      assert.strictEqual(getFullscreenCalls(), 0, 'F key on inactive overlay must be ignored');

      // Activate overlay for remaining guards
      overlayNode.classList.add('active');

      // 11.2 Input / Textarea / ContentEditable guard
      controller.handleKeyDown({ key: 'h', target: { tagName: 'INPUT' }, preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'f', target: { tagName: 'TEXTAREA' }, preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'h', target: { tagName: 'DIV', isContentEditable: true }, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'Editable targets must block H shortcut');
      assert.strictEqual(getFullscreenCalls(), 0, 'Editable targets must block F shortcut');

      // 11.3 Modifier key guard (Ctrl+F, Meta+F, Alt+H)
      controller.handleKeyDown({ key: 'f', ctrlKey: true, preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'f', metaKey: true, preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'h', altKey: true, preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'Modifier combos must not trigger H');
      assert.strictEqual(getFullscreenCalls(), 0, 'Modifier combos must not trigger F');

      // 11.4 External open modal guard
      setOpenModalNode(createMockDomNode('external-dialog'));
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, false, 'Open external modal must block H');
      assert.strictEqual(getFullscreenCalls(), 0, 'Open external modal must block F');
    });
  });
  console.log('✅ Test 11: Inactive, editable input, modifier, and modal guardrails verified');

  // 12. Verify drag, slider interaction, and header hover deferral guardrails
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode, headerNode, sliderNode }) => {
      controller.createOverlay();
      overlayNode.classList.add('active');

      // 12.1 Image zoom drag deferral
      state.zoom.isDragging = true;
      controller.resetIdleTimer();
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'UI/cursor must NOT hide while dragging image');
      assert.strictEqual(timers.count, 1, 'Deferred idle check must reschedule timer');

      state.zoom.isDragging = false;
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'UI must hide once dragging ends and timer expires');

      // Restore UI
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false);

      // 12.2 Header hover deferral
      headerNode.dispatchEvent('mouseenter');
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'UI must NOT hide while hovering header');
      headerNode.dispatchEvent('mouseleave');
      assert.strictEqual(timers.count, 1, 'Leaving header must reset idle timer');
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'UI must hide after leaving header and waiting timeout');

      // Restore UI
      overlayNode.dispatchEvent('mousemove');

      // 12.3 Slider interaction deferral
      sliderNode.dispatchEvent('mousedown');
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'UI must NOT hide while dragging padding slider');
      sliderNode.dispatchEvent('mouseup');
      assert.strictEqual(timers.count, 1, 'Releasing slider must reset idle timer');
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'UI must hide after releasing slider and waiting timeout');
    });
  });
  console.log('✅ Test 12: Dragging, header hover, and slider interaction deferral guardrails verified');

  // 13. Verify closeViewer() cleanup (idleTimer, classes, flags, fullscreen exit)
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode, mockDocument, getExitFullscreenCalls }) => {
      controller.createOverlay();
      overlayNode.classList.add('active');
      overlayNode.classList.add('disagall-idle');
      state.isUiHidden = true;
      mockDocument.fullscreenElement = overlayNode;
      state.previousBodyOverflow = 'auto';
      mockDocument.body.style.overflow = 'hidden';

      controller.resetIdleTimer();
      assert.strictEqual(timers.count, 1);

      controller.closeViewer();

      assert.strictEqual(timers.count, 0, 'closeViewer() must clear pending idle timer');
      assert.strictEqual(state.idleTimer, null, 'closeViewer() must reset state.idleTimer to null');
      assert.strictEqual(state.isUiHidden, false, 'closeViewer() must reset state.isUiHidden to false');
      assert.strictEqual(overlayNode.classList.contains('active'), false, 'closeViewer() must deactivate overlay');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'closeViewer() must remove .disagall-idle');
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), false, 'closeViewer() must remove .disagall-ui-hidden');
      assert.strictEqual(mockDocument.body.style.overflow, 'auto', 'closeViewer() must restore body overflow');
      assert.strictEqual(getExitFullscreenCalls(), 1, 'closeViewer() must exit fullscreen if active');
      assert.strictEqual(mockDocument.fullscreenElement, null, 'fullscreenElement must be cleared on closeViewer()');
    });
  });
  console.log('✅ Test 13: closeViewer() timer, flag, class, and fullscreen cleanup verified');

  // 14. Verify controller storage initialization & live chrome.storage.onChanged sync
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode }) => {
      let onChangedListener = null;
      global.chrome = {
        storage: {
          sync: {
            get(defaults, cb) {
              cb({ ...defaults, autoHideUi: false });
            }
          },
          onChanged: {
            addListener(fn) {
              onChangedListener = fn;
            }
          }
        }
      };

      controller.createOverlay();
      overlayNode.classList.add('active');
      controller.initImmersionSettings();
      assert.strictEqual(state.autoHideUi, false, 'initImmersionSettings must load autoHideUi=false from chrome.storage.sync');

      // Live toggle back to true while overlay is active
      assert.strictEqual(typeof onChangedListener, 'function', 'chrome.storage.onChanged listener must be registered');
      onChangedListener({ autoHideUi: { newValue: true } }, 'sync');
      assert.strictEqual(state.autoHideUi, true, 'onChanged must update state.autoHideUi to true');
      assert.strictEqual(timers.count, 1, 'Enabling autoHideUi while active must start idle timer');

      // Live toggle to false while UI is idle-hidden -> restores UI and clears timer
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true);
      onChangedListener({ autoHideUi: { newValue: false } }, 'sync');
      assert.strictEqual(state.autoHideUi, false);
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false, 'Disabling autoHideUi must restore idle-hidden UI');
      assert.strictEqual(timers.count, 0, 'Disabling autoHideUi must clear pending idle timer');

      // GM_getValue fallback check
      global.chrome = undefined;
      global.GM_getValue = (key, def) => (key === 'autoHideUi' ? false : def);
      state.autoHideUi = true;
      controller.initImmersionSettings();
      assert.strictEqual(state.autoHideUi, false, 'GM_getValue fallback must load autoHideUi=false');
    });
  });
  console.log('✅ Test 14: Controller storage init & chrome.storage.onChanged live sync verified');

  // 15. Verify overlay.js buildOverlayHtml() keyhints include H (UI숨김) and F (전체화면)
  const { buildOverlayHtml } = await import('../src/ui/overlay.js');
  const overlayHtml = buildOverlayHtml();
  assert(
    overlayHtml.includes('<div class="disagall-keyhint"><span class="disagall-kbd">H</span> UI숨김</div>'),
    'Overlay keyhints must include H UI숨김 badge'
  );
  assert(
    overlayHtml.includes('<div class="disagall-keyhint"><span class="disagall-kbd">F</span> 전체화면</div>'),
    'Overlay keyhints must include F 전체화면 badge'
  );
  assert(
    overlayHtml.includes('<div class="disagall-keyhint"><span class="disagall-kbd">ESC</span> 닫기</div>'),
    'Overlay keyhints must preserve ESC 닫기 badge'
  );
  console.log('✅ Test 15: Overlay HTML keyhints (H UI숨김, F 전체화면) verified');

  // 16. Verify content.css immersion rules (.disagall-idle, .disagall-ui-hidden, transitions, drag-cursor guard)
  const cssContent = fs.readFileSync(path.join(__dirname, '../content.css'), 'utf8');
  assert(
    cssContent.includes('#disagall-viewer-overlay.disagall-idle') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-ui-hidden'),
    'content.css must define #disagall-viewer-overlay.disagall-idle and .disagall-ui-hidden selectors'
  );
  assert(
    /\#disagall-viewer-overlay\.disagall-idle,\s*\#disagall-viewer-overlay\.disagall-ui-hidden\s*\{[^}]*cursor:\s*none;/s.test(cssContent),
    'content.css must hide cursor (cursor: none;) on .disagall-idle and .disagall-ui-hidden'
  );
  assert(
    cssContent.includes(':not([style*="grabbing"])'),
    'content.css must preserve grabbing cursor while zoom-pan dragging'
  );
  assert(
    cssContent.includes('#disagall-viewer-overlay.disagall-idle .disagall-header') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-ui-hidden .disagall-header') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-idle .disagall-footer') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-ui-hidden .disagall-footer') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-idle .disagall-nav-btn') &&
      cssContent.includes('#disagall-viewer-overlay.disagall-ui-hidden .disagall-nav-btn'),
    'content.css must target header, footer, and nav-btn for both .disagall-idle and .disagall-ui-hidden'
  );
  assert(
    /opacity:\s*0;\s*pointer-events:\s*none;\s*transition:\s*opacity\s+0\.3s\s+ease;/s.test(cssContent),
    'content.css hidden rule must apply opacity: 0; pointer-events: none; transition: opacity 0.3s ease;'
  );
  assert(
    /\.disagall-header\s*\{[^}]*opacity:\s*1;\s*pointer-events:\s*auto;\s*transition:\s*opacity\s+0\.15s\s+ease;/s.test(cssContent),
    '.disagall-header must restore opacity: 1 and pointer-events: auto within 0.15s'
  );
  assert(
    /\.disagall-footer\s*\{[^}]*opacity:\s*1;\s*pointer-events:\s*auto;\s*transition:\s*opacity\s+0\.15s\s+ease;/s.test(cssContent),
    '.disagall-footer must restore opacity: 1 and pointer-events: auto within 0.15s'
  );
  assert(
    /\.disagall-nav-btn\s*\{[^}]*opacity:\s*1;\s*pointer-events:\s*auto;[^}]*opacity\s+0\.15s\s+ease;/s.test(cssContent),
    '.disagall-nav-btn must restore opacity: 1 and pointer-events: auto with 0.15s opacity transition'
  );
  console.log('✅ Test 16: content.css immersion cursor, fade-out/restore transitions, and drag guard verified');

  // 17. Verify popup.html immersion shortcut & timeout guidance consistency
  const popupHtml = fs.readFileSync(path.join(__dirname, '../popup.html'), 'utf8');
  assert(popupHtml.includes('id="auto-hide-ui-toggle"'), 'popup.html must include auto-hide-ui-toggle');
  assert(popupHtml.includes('2.5초'), 'popup.html must describe 2.5s auto-hide timeout');
  assert(
    popupHtml.includes('>H<') && popupHtml.includes('>F<'),
    'popup.html must document H and F immersion shortcuts'
  );
  console.log('✅ Test 17: popup.html immersion toggle and 2.5s/H/F guidance verified');

  // 18. Verify immersion_controller.js separation and viewer_controller.js backward-compatible re-exports
  const immersionCtrl = await import('../src/controller/immersion_controller.js');
  const viewerCtrl = await import('../src/controller/viewer_controller.js');
  const expectedImmersionExports = [
    'clearIdleTimer',
    'showUi',
    'hideUi',
    'resetIdleTimer',
    'toggleUiManual',
    'exitFullscreenSafely',
    'toggleFullscreen',
    'applyAutoHideUiSetting',
    'initImmersionSettings',
  ];
  for (const fnName of expectedImmersionExports) {
    assert.strictEqual(typeof immersionCtrl[fnName], 'function', `immersion_controller must export ${fnName}`);
    assert.strictEqual(
      viewerCtrl[fnName],
      immersionCtrl[fnName],
      `viewer_controller must re-export ${fnName} from immersion_controller`
    );
  }
  console.log('✅ Test 18: immersion_controller.js separation & viewer_controller.js re-exports verified');

  // 19. Verify padding slider storage I/O optimization (debounce + change + closeViewer flush + NaN/GM fallback)
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode, sliderNode, sliderValNode }) => {
      const chromeSaves = [];
      global.chrome = {
        storage: {
          sync: {
            set(payload) {
              chromeSaves.push(payload);
            }
          }
        }
      };

      controller.createOverlay();
      overlayNode.classList.add('active');
      state.autoHideUi = false;

      // Rapid drag ticks must NOT trigger storage writes per tick
      sliderNode.dispatchEvent('input', { target: { value: '12' } });
      sliderNode.dispatchEvent('input', { target: { value: '20' } });
      sliderNode.dispatchEvent('input', { target: { value: '36' } });
      assert.strictEqual(state.currentPadding, 36, 'Slider input must update state.currentPadding immediately');
      assert.strictEqual(sliderValNode.textContent, '36px', 'Slider input must update display immediately');
      assert.strictEqual(chromeSaves.length, 0, 'Rapid slider input must not write to chrome.storage.sync on each tick');
      assert.strictEqual(timers.count, 1, 'Slider input must coalesce into a single debounced save timer');

      // Firing debounce timer commits once with final value
      timers.runNext();
      assert.deepStrictEqual(chromeSaves, [{ [CONFIG.STORAGE_KEY_PADDING]: 36 }], 'Debounce must persist final padding once');

      // Invalid NaN input must be ignored safely
      sliderNode.dispatchEvent('input', { target: { value: 'not-a-number' } });
      assert.strictEqual(state.currentPadding, 36, 'NaN slider input must be ignored');
      assert.strictEqual(timers.count, 0, 'NaN slider input must not schedule storage write');

      // change event cancels pending debounce and writes immediately
      sliderNode.dispatchEvent('input', { target: { value: '48' } });
      assert.strictEqual(timers.count, 1);
      sliderNode.dispatchEvent('change', { target: { value: '48' } });
      assert.strictEqual(timers.count, 0, 'Slider change must cancel pending debounce timer');
      assert.strictEqual(chromeSaves.length, 2);
      assert.deepStrictEqual(chromeSaves[1], { [CONFIG.STORAGE_KEY_PADDING]: 48 });

      // closeViewer() flushes pending debounced save (GM_setValue fallback) and leaves 0 timers
      const gmSaves = [];
      global.chrome = undefined;
      global.GM_setValue = (key, val) => gmSaves.push([key, val]);
      state.autoHideUi = true;
      sliderNode.dispatchEvent('input', { target: { value: '64' } });
      assert.strictEqual(timers.count, 2, 'Active viewer with autoHideUi=true has idle + debounce timers');
      controller.closeViewer();
      assert.strictEqual(timers.count, 0, 'closeViewer() must clear both idle and padding debounce timers');
      assert.deepStrictEqual(gmSaves, [[CONFIG.STORAGE_KEY_PADDING, 64]], 'closeViewer() must flush pending padding via GM_setValue');
    });
  });
  console.log('✅ Test 19: Padding slider debounce, change commit, closeViewer flush, and NaN/GM guard verified');

  // 20. Verify UI-hidden stage expansion (idle & manual) while preserving user padding, plus 0px full-bleed
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({ controller, overlayNode, stageNode, mainImgNode }) => {
      const { applyFittingAndPadding } = await import('../src/ui/overlay.js');
      controller.createOverlay();
      overlayNode.classList.add('active');

      // Portrait image (1000x2000) in 1280x800 viewport with header=52, footer=38, padding=24
      mainImgNode.naturalWidth = 1000;
      mainImgNode.naturalHeight = 2000;
      state.currentPadding = 24;
      state.autoHideUi = true;

      applyFittingAndPadding();
      assert.strictEqual(mainImgNode.style.maxHeight, '662px', 'Visible UI must reserve header(52)+footer(38)+padding(48)');
      assert.strictEqual(mainImgNode.style.maxWidth, '331px', 'Visible UI portrait width must match aspect ratio');
      assert.strictEqual(stageNode.style.paddingTop, '52px', 'Visible UI stage must reserve headerHeight top padding');
      assert.strictEqual(stageNode.style.paddingBottom, '38px', 'Visible UI stage must reserve footerHeight bottom padding');

      // Idle auto-hide -> reclaims header+footer height while keeping 24px user padding
      controller.resetIdleTimer();
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true);
      assert.strictEqual(mainImgNode.style.maxHeight, '752px', 'Idle-hidden UI must expand portrait height to 800-48=752px');
      assert.strictEqual(mainImgNode.style.maxWidth, '376px', 'Idle-hidden UI portrait width must expand proportionally');
      assert.strictEqual(stageNode.style.paddingTop, '0px', 'Idle-hidden stage must clear top padding');
      assert.strictEqual(stageNode.style.paddingBottom, '0px', 'Idle-hidden stage must clear bottom padding');

      // Mousemove -> restores UI and shrinks image back to header/footer bounds
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false);
      assert.strictEqual(mainImgNode.style.maxHeight, '662px', 'Restoring UI must re-apply header+footer height reservation');
      assert.strictEqual(stageNode.style.paddingTop, '52px');
      assert.strictEqual(stageNode.style.paddingBottom, '38px');

      // 0px user padding -> UI visible avoids overlap, manual hide (H) expands full-bleed 800px
      state.currentPadding = 0;
      applyFittingAndPadding();
      assert.strictEqual(mainImgNode.style.maxHeight, '710px', '0px padding with visible UI must fit 800-52-38=710px');
      assert.strictEqual(stageNode.style.paddingTop, '52px');
      assert.strictEqual(stageNode.style.paddingBottom, '38px');

      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true);
      assert.strictEqual(mainImgNode.style.maxHeight, '800px', '0px padding with hidden UI must fill full 800px height');
      assert.strictEqual(mainImgNode.style.maxWidth, '400px');
      assert.strictEqual(stageNode.style.paddingTop, '0px');
      assert.strictEqual(stageNode.style.paddingBottom, '0px');

      controller.handleKeyDown({ key: 'H', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(mainImgNode.style.maxHeight, '710px', 'H restore must re-reserve header+footer height');
    });
  });
  console.log('✅ Test 20: UI-hidden stage expansion (idle & manual), padding preservation, and 0px full-bleed verified');

  // 21. Verify zoom > 1.0 size lock during UI toggle and immediate refit upon returning to 1.0x
  await withFakeTimers(async () => {
    await withControllerHarness(async ({ controller, overlayNode, stageNode, mainImgNode }) => {
      const { applyFittingAndPadding } = await import('../src/ui/overlay.js');
      const { resetZoom } = await import('../src/ui/zoom_pan.js');

      global.requestAnimationFrame = (cb) => {
        cb();
        return 1;
      };

      controller.createOverlay();
      overlayNode.classList.add('active');
      mainImgNode.naturalWidth = 1000;
      mainImgNode.naturalHeight = 2000;
      state.currentPadding = 24;
      applyFittingAndPadding();
      assert.strictEqual(mainImgNode.style.maxHeight, '662px');

      // Zoom in to 2.0x and hide UI manually -> must NOT resize image or shift stage padding while zoomed
      state.zoom.scale = 2.0;
      state.zoom.panX = 120;
      state.zoom.panY = -80;
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true);
      assert.strictEqual(mainImgNode.style.maxHeight, '662px', 'Zoomed image must keep base maxHeight while UI hides');
      assert.strictEqual(stageNode.style.paddingTop, '52px', 'Zoomed stage must keep paddingTop while UI hides');

      // Reset zoom back to 1.0x while UI is still hidden -> immediately syncs to expanded 752px
      resetZoom();
      assert.strictEqual(state.zoom.scale, 1.0);
      assert.strictEqual(mainImgNode.style.maxHeight, '752px', 'Returning to 1.0x while UI hidden must sync expanded size');
      assert.strictEqual(stageNode.style.paddingTop, '0px');
      assert.strictEqual(stageNode.style.paddingBottom, '0px');

      // Zoom in via double-click while hidden, restore UI via mousemove -> must keep 752px while zoomed
      mainImgNode.dispatchEvent('dblclick');
      assert.strictEqual(state.zoom.scale, 2.0);
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), false);
      assert.strictEqual(mainImgNode.style.maxHeight, '752px', 'Zoomed image must keep base maxHeight while UI restores');

      // Wheel zoom out back to 1.0x -> immediately syncs to visible-UI 662px
      for (let i = 0; i < 8; i++) {
        mainImgNode.dispatchEvent('wheel', { deltaY: 120 });
      }
      assert.strictEqual(state.zoom.scale, 1.0);
      assert.strictEqual(mainImgNode.style.maxHeight, '662px', 'Wheeling back to 1.0x with UI visible must sync visible-UI size');
      assert.strictEqual(stageNode.style.paddingTop, '52px');
      assert.strictEqual(stageNode.style.paddingBottom, '38px');
    });
  });
  console.log('✅ Test 21: Zoom > 1.0 size-lock on UI toggle & 1.0x refit sync verified');

  // 22. Verify content.css absolute overlay header/footer and stage height/padding transitions
  assert(
    /\.disagall-header\s*\{[^}]*position:\s*absolute;[^}]*top:\s*0;[^}]*left:\s*0;/s.test(cssContent),
    'content.css .disagall-header must use position: absolute; top: 0; left: 0;'
  );
  assert(
    /\.disagall-footer\s*\{[^}]*position:\s*absolute;[^}]*bottom:\s*0;[^}]*left:\s*0;/s.test(cssContent),
    'content.css .disagall-footer must use position: absolute; bottom: 0; left: 0;'
  );
  assert(
    /\.disagall-stage\s*\{[^}]*height:\s*100%;[^}]*transition:\s*padding-top[^;}]*padding-bottom/s.test(cssContent),
    'content.css .disagall-stage must define height: 100% and padding-top/padding-bottom transition'
  );
  console.log('✅ Test 22: content.css absolute overlay header/footer and stage padding transitions verified');

  // 23. Verify autoFullscreen CONFIG/state/popup.html/popup.js schema and storage sync
  assert.strictEqual(CONFIG.STORAGE_KEY_AUTO_FULLSCREEN, 'autoFullscreen', 'CONFIG.STORAGE_KEY_AUTO_FULLSCREEN must be "autoFullscreen"');
  assert.strictEqual(state.autoFullscreen, false, 'state.autoFullscreen must default to false');
  assert.strictEqual(state.isFullscreenMode, false, 'state.isFullscreenMode must default to false');
  assert.strictEqual(popup.STORAGE_KEYS.AUTO_FULLSCREEN, 'autoFullscreen');
  assert.strictEqual(popup.DEFAULT_SETTINGS.autoFullscreen, false);
  assert.strictEqual(typeof popup.saveAutoFullscreen, 'function', 'popup.js must export saveAutoFullscreen');
  assert(popupHtml.includes('id="auto-fullscreen-toggle"'), 'popup.html must include auto-fullscreen-toggle switch');

  await withFakeTimers(async () => {
    const fsSlider = createMockElement('padding-slider', { value: '24' });
    const fsValDisplay = createMockElement('padding-val', { textContent: '24px' });
    const fsAutoHide = createMockElement('auto-hide-ui-toggle', { checked: true });
    const fsAutoFullscreen = createMockElement('auto-fullscreen-toggle', { checked: false });
    const fsPopupDoc = {
      getElementById(id) {
        if (id === 'padding-slider') return fsSlider;
        if (id === 'padding-val') return fsValDisplay;
        if (id === 'auto-hide-ui-toggle') return fsAutoHide;
        if (id === 'auto-fullscreen-toggle') return fsAutoFullscreen;
        return null;
      },
    };
    const fsStorage = createMockStorage({ autoHideUi: true, autoFullscreen: true, defaultPadding: 24 });
    popup.initPopup(fsPopupDoc, fsStorage);
    assert.strictEqual(fsAutoFullscreen.checked, true, 'autoFullscreen toggle must initialize from storage');

    fsAutoFullscreen.checked = false;
    fsAutoFullscreen.dispatchEvent('change');
    assert.strictEqual(fsStorage.store.autoFullscreen, false, 'Changing auto-fullscreen-toggle must persist false');

    popup.handleStorageChange({ autoFullscreen: { newValue: true } }, 'sync', {
      slider: fsSlider,
      valDisplay: fsValDisplay,
      autoHideToggle: fsAutoHide,
      autoFullscreenToggle: fsAutoFullscreen,
    });
    assert.strictEqual(fsAutoFullscreen.checked, true, 'handleStorageChange must sync valid boolean autoFullscreen');

    popup.handleStorageChange({ autoFullscreen: { newValue: undefined } }, 'sync', {
      slider: fsSlider,
      valDisplay: fsValDisplay,
      autoHideToggle: fsAutoHide,
      autoFullscreenToggle: fsAutoFullscreen,
    });
    assert.strictEqual(fsAutoFullscreen.checked, true, 'Deleted autoFullscreen key must not overwrite boolean toggle');
  });
  console.log('✅ Test 23: autoFullscreen CONFIG/state/popup.html/popup.js storage sync verified');

  // 24. Verify header fullscreen button, 0px temporary padding, immediate UI hide, and fullscreenchange restore
  await withControllerHarness(async ({
    controller,
    overlayNode,
    stageNode,
    mainImgNode,
    fullscreenBtnNode,
    fullscreenLabelNode,
    mockDocument,
  }) => {
    const { applyFittingAndPadding } = await import('../src/ui/overlay.js');
    assert(overlayHtml.includes('id="disagall-btn-fullscreen"'), 'Overlay HTML must include #disagall-btn-fullscreen button');

    controller.initViewerBase();
    controller.createOverlay();
    overlayNode.classList.add('active');
    mainImgNode.naturalWidth = 1000;
    mainImgNode.naturalHeight = 2000;
    state.currentPadding = 36;
    applyFittingAndPadding();
    assert.strictEqual(mainImgNode.style.maxHeight, '638px', 'Normal UI with 36px padding fits 800-52-38-72=638px');

    // Click header fullscreen button -> enters OS fullscreen, sets 0px temp padding, hides UI immediately
    fullscreenBtnNode.dispatchEvent('click');
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(mockDocument.fullscreenElement, overlayNode);
    assert.strictEqual(state.isFullscreenMode, true, 'Entering fullscreen must set state.isFullscreenMode=true');
    assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), true);
    assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true, 'Entering fullscreen must immediately hide UI');
    assert.strictEqual(fullscreenBtnNode.classList.contains('active'), true);
    assert.strictEqual(fullscreenBtnNode.getAttribute('aria-pressed'), 'true');
    assert.strictEqual(fullscreenLabelNode.textContent, '전체화면 해제');
    assert.strictEqual(mainImgNode.style.maxHeight, '800px', 'Fullscreen mode must temporarily apply 0px padding (800px)');
    assert.strictEqual(stageNode.style.paddingTop, '0px');
    assert.strictEqual(state.currentPadding, 36, 'Fullscreen temporary 0px must NOT mutate saved state.currentPadding');

    // Native OS ESC exit -> browser clears fullscreenElement and fires fullscreenchange
    mockDocument.fullscreenElement = null;
    mockDocument.dispatchEvent('fullscreenchange');
    assert.strictEqual(state.isFullscreenMode, false, 'fullscreenchange exit must clear state.isFullscreenMode');
    assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), false);
    assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), false, 'Exiting fullscreen must restore UI');
    assert.strictEqual(fullscreenBtnNode.classList.contains('active'), false);
    assert.strictEqual(fullscreenBtnNode.getAttribute('aria-pressed'), 'false');
    assert.strictEqual(fullscreenLabelNode.textContent, '전체화면');
    assert.strictEqual(mainImgNode.style.maxHeight, '638px', 'Exiting fullscreen must restore saved 36px padding fitting');
    assert.strictEqual(stageNode.style.paddingTop, '52px');
    assert.strictEqual(stageNode.style.paddingBottom, '38px');
  });
  console.log('✅ Test 24: Header fullscreen button, 0px temp padding, immediate UI hide & fullscreenchange restore verified');

  // 25. Verify autoFullscreen on openViewer (OS allowed vs rejected fallback) & closeViewer cleanup
  await withControllerHarness(async ({
    controller,
    overlayNode,
    mainImgNode,
    toastNode,
    mockDocument,
    getFullscreenCalls,
    setRejectFullscreen,
  }) => {
    // Prepare a body image in mockDocument for openViewer()
    const origQuerySelectorAll = mockDocument.querySelectorAll;
    const sampleBodyImg = createMockDomNode('sample-body-img');
    sampleBodyImg.tagName = 'IMG';
    sampleBodyImg.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=123';
    sampleBodyImg.currentSrc = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=123';
    sampleBodyImg.alt = 'sample';
    sampleBodyImg.naturalWidth = 1000;
    sampleBodyImg.naturalHeight = 2000;
    const writeDiv = { querySelectorAll: () => [sampleBodyImg] };
    sampleBodyImg.closest = (sel) => (sel.includes('.write_div') ? writeDiv : null);
    sampleBodyImg.getAttribute = () => null;
    mockDocument.querySelectorAll = (sel) => (sel.endsWith('img') ? [sampleBodyImg] : [writeDiv]);
    const origImage = global.Image;
    global.Image = class {
      set src(val) {
        this._src = val;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    try {
      mainImgNode.naturalWidth = 1000;
      mainImgNode.naturalHeight = 2000;
      state.currentPadding = 24;
      state.autoFullscreen = true;

      // Case A: requestFullscreen allowed on openViewer()
      controller.initViewerBase();
      controller.openViewer();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(getFullscreenCalls(), 1, 'autoFullscreen=true must attempt requestFullscreen on openViewer');
      assert.strictEqual(state.isFullscreenMode, true);
      assert.strictEqual(mockDocument.fullscreenElement, overlayNode);
      assert.strictEqual(mainImgNode.style.maxHeight, '800px');

      controller.closeViewer();
      assert.strictEqual(state.isFullscreenMode, false, 'closeViewer must reset isFullscreenMode');
      assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), false);

      // Case B: requestFullscreen rejected (e.g. Chrome context menu) -> fallback viewport-fill + toast
      setRejectFullscreen(true);
      controller.openViewer();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(mockDocument.fullscreenElement, null);
      assert.strictEqual(state.isFullscreenMode, true, 'Rejected autoFullscreen must engage 0px+hidden fallback');
      assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), true);
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true);
      assert.strictEqual(mainImgNode.style.maxHeight, '800px');
      assert.strictEqual(state.currentPadding, 24, 'Fallback must preserve saved padding 24');
      assert(toastNode.textContent.includes('전체화면'), 'Fallback must show guidance toast');

      // Pressing F while in fallback when gesture is now allowed -> enters OS fullscreen
      setRejectFullscreen(false);
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(mockDocument.fullscreenElement, overlayNode, 'Pressing F in fallback must retry OS fullscreen');
      assert.strictEqual(state.isFullscreenMode, true);
    } finally {
      mockDocument.querySelectorAll = origQuerySelectorAll;
      global.Image = origImage;
    }
  });
  console.log('✅ Test 25: autoFullscreen on openViewer (OS allowed + rejected fallback) & closeViewer cleanup verified');

  // 26. Verify Korean IME (e.code fallback: KeyF/KeyH), range slider focus pass-through & manual F fallback toggle
  await withControllerHarness(async ({
    controller,
    overlayNode,
    mainImgNode,
    toastNode,
    mockDocument,
    setRejectFullscreen,
  }) => {
    controller.initViewerBase();
    controller.createOverlay();
    overlayNode.classList.add('active');
    mainImgNode.naturalWidth = 1000;
    mainImgNode.naturalHeight = 2000;
    state.currentPadding = 24;

    // 26.1 Korean IME: pressing F key produces key='ㄹ', code='KeyF'
    controller.handleKeyDown({ key: 'ㄹ', code: 'KeyF', preventDefault() {}, stopPropagation() {} });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(mockDocument.fullscreenElement, overlayNode, 'Korean IME key="ㄹ" + code="KeyF" must enter fullscreen');
    assert.strictEqual(state.isFullscreenMode, true);

    // Exit fullscreen via Korean IME KeyF
    controller.handleKeyDown({ key: 'ㄹ', code: 'KeyF', preventDefault() {}, stopPropagation() {} });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(mockDocument.fullscreenElement, null);
    assert.strictEqual(state.isFullscreenMode, false);

    // 26.2 Range slider focus (<input type="range">) must NOT block shortcuts, while text input still blocks
    controller.handleKeyDown({
      key: 'ㅗ',
      code: 'KeyH',
      target: { tagName: 'INPUT', type: 'range' },
      preventDefault() {},
      stopPropagation() {},
    });
    assert.strictEqual(state.isUiHidden, true, 'Focused range slider must allow KeyH shortcut');
    controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
    assert.strictEqual(state.isUiHidden, false);

    controller.handleKeyDown({
      key: 'f',
      code: 'KeyF',
      target: { tagName: 'INPUT', type: 'text' },
      preventDefault() {},
      stopPropagation() {},
    });
    assert.strictEqual(state.isFullscreenMode, false, 'Focused text input must still block KeyF shortcut');

    // 26.3 Manual F when requestFullscreen() is rejected -> enters fallback, second F exits fallback
    setRejectFullscreen(true);
    controller.handleKeyDown({ key: 'f', code: 'KeyF', preventDefault() {}, stopPropagation() {} });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(state.isFullscreenMode, true, 'Manual F fallback must activate when requestFullscreen rejects');
    assert.strictEqual(mainImgNode.style.maxHeight, '800px');
    assert(toastNode.textContent.includes('창 전체 채움'));

    controller.handleKeyDown({ key: 'f', code: 'KeyF', preventDefault() {}, stopPropagation() {} });
    await Promise.resolve();
    await Promise.resolve();
    assert.strictEqual(state.isFullscreenMode, false, 'Second F in fallback must exit fallback mode');
    assert.strictEqual(mainImgNode.style.maxHeight, '662px');
  });
  console.log('✅ Test 26: Korean IME KeyF/KeyH, range slider focus pass-through & manual F fallback toggle verified');

  // 27. DEFECT-01: Async requestFullscreen/exitFullscreen Promise race vs closeViewer/openViewer & rapid toggle
  await withControllerHarness(async ({
    controller,
    overlayNode,
    mainImgNode,
    toastNode,
    mockDocument,
  }) => {
    const origQuerySelectorAll = mockDocument.querySelectorAll;
    const sampleBodyImg = createMockDomNode('defect01-body-img');
    sampleBodyImg.tagName = 'IMG';
    sampleBodyImg.src = 'https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=456';
    sampleBodyImg.currentSrc = sampleBodyImg.src;
    sampleBodyImg.alt = 'defect01';
    sampleBodyImg.naturalWidth = 1000;
    sampleBodyImg.naturalHeight = 2000;
    const writeDiv = { querySelectorAll: () => [sampleBodyImg] };
    sampleBodyImg.closest = (sel) => (sel.includes('.write_div') ? writeDiv : null);
    sampleBodyImg.getAttribute = () => null;
    mockDocument.querySelectorAll = (sel) => (sel.endsWith('img') ? [sampleBodyImg] : [writeDiv]);
    const origImage = global.Image;
    global.Image = class {
      set src(val) {
        this._src = val;
        if (typeof this.onload === 'function') this.onload();
      }
      get src() { return this._src; }
    };

    const createDeferred = () => {
      let resolve;
      let reject;
      const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };

    try {
      mainImgNode.naturalWidth = 1000;
      mainImgNode.naturalHeight = 2000;
      controller.initViewerBase();

      // Case A: Pending requestFullscreen() resolves AFTER closeViewer() -> must NOT leave hidden overlay trapped in OS fullscreen
      let pendingReqA = null;
      overlayNode.requestFullscreen = () => {
        pendingReqA = createDeferred();
        return pendingReqA.promise;
      };
      state.autoFullscreen = true;
      controller.openViewer();
      assert(pendingReqA !== null, 'Case A: requestFullscreen must be called');
      controller.closeViewer();
      assert.strictEqual(overlayNode.classList.contains('active'), false);

      mockDocument.fullscreenElement = overlayNode;
      pendingReqA.resolve();
      mockDocument.dispatchEvent('fullscreenchange');
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(
        mockDocument.fullscreenElement,
        null,
        'Case A: Late requestFullscreen resolve after closeViewer must immediately exit OS fullscreen'
      );
      assert.strictEqual(state.isFullscreenMode, false);
      assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), false);

      // Case B: Pending requestFullscreen() from Session 1 rejects AFTER closeViewer() -> openViewer() Session 2 (autoFullscreen=false)
      let pendingReqB = null;
      overlayNode.requestFullscreen = () => {
        pendingReqB = createDeferred();
        return pendingReqB.promise;
      };
      state.autoFullscreen = true;
      controller.openViewer();
      controller.closeViewer();

      state.autoFullscreen = false;
      toastNode.textContent = '';
      controller.openViewer();
      pendingReqB.reject(new Error('Gesture blocked'));
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(
        state.isFullscreenMode,
        false,
        'Case B: Stale Session 1 reject must NOT force Session 2 into fallback fullscreen'
      );
      assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), false);
      assert.strictEqual(toastNode.textContent, '', 'Case B: Stale Session 1 reject must NOT show fallback toast in Session 2');
      controller.closeViewer();

      // Case C: Pending requestFullscreen() from Session 1 resolves AFTER closeViewer() -> openViewer() Session 2 (autoFullscreen=false)
      let pendingReqC = null;
      overlayNode.requestFullscreen = () => {
        pendingReqC = createDeferred();
        return pendingReqC.promise;
      };
      state.autoFullscreen = true;
      controller.openViewer();
      controller.closeViewer();

      state.autoFullscreen = false;
      controller.openViewer();
      mockDocument.fullscreenElement = overlayNode;
      pendingReqC.resolve();
      mockDocument.dispatchEvent('fullscreenchange');
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(
        mockDocument.fullscreenElement,
        null,
        'Case C: Stale Session 1 resolve in Session 2 must exit stale OS fullscreen'
      );
      assert.strictEqual(
        state.isFullscreenMode,
        false,
        'Case C: Session 2 with autoFullscreen=false must NOT become fullscreen from Session 1'
      );
      controller.closeViewer();

      // Case D: Delayed exitFullscreen() from Session 1 resolves AFTER Session 2 enters fallback fullscreen
      const pendingExitD = createDeferred();
      const origExit = mockDocument.exitFullscreen;
      mockDocument.fullscreenElement = overlayNode;
      state.isFullscreenMode = true;
      overlayNode.classList.add('active', 'disagall-fullscreen', 'disagall-ui-hidden');
      mockDocument.exitFullscreen = () => {
        mockDocument.fullscreenElement = null;
        return pendingExitD.promise;
      };

      controller.closeViewer();

      overlayNode.requestFullscreen = () => Promise.reject(new Error('Permissions check failed'));
      state.autoFullscreen = true;
      controller.openViewer();
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(state.isFullscreenMode, true, 'Case D: Session 2 must be in fallback fullscreen');

      pendingExitD.resolve();
      mockDocument.dispatchEvent('fullscreenchange');
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(
        state.isFullscreenMode,
        true,
        'Case D: Stale Session 1 exitFullscreen/fullscreenchange must NOT overwrite Session 2 fallback fullscreen'
      );
      assert.strictEqual(overlayNode.classList.contains('disagall-fullscreen'), true);
      mockDocument.exitFullscreen = origExit;
      controller.closeViewer();

      // Case E: Rapid double toggleFullscreen() while requestFullscreen is pending -> no duplicate call / false-positive toast
      let callCountE = 0;
      let pendingReqE1 = null;
      overlayNode.requestFullscreen = () => {
        callCountE++;
        if (callCountE === 1) {
          pendingReqE1 = createDeferred();
          return pendingReqE1.promise;
        }
        return Promise.reject(new Error('Duplicate request rejected'));
      };
      state.autoFullscreen = false;
      toastNode.textContent = '';
      controller.openViewer();
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
      controller.handleKeyDown({ key: 'f', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(callCountE, 1, 'Case E: In-flight requestFullscreen must ignore duplicate toggleFullscreen');

      mockDocument.fullscreenElement = overlayNode;
      pendingReqE1.resolve();
      mockDocument.dispatchEvent('fullscreenchange');
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(state.isFullscreenMode, true);
      assert.strictEqual(toastNode.textContent, '', 'Case E: Successful OS fullscreen must NOT show fallback toast');
      controller.closeViewer();

      // Case F: Session 1 pending requestFullscreen resolves AFTER Session 2 (autoFullscreen=true) fires P2 which rejects
      let callCountF = 0;
      let pendingReqF1 = null;
      let pendingReqF2 = null;
      overlayNode.requestFullscreen = () => {
        callCountF++;
        if (callCountF === 1) {
          pendingReqF1 = createDeferred();
          return pendingReqF1.promise;
        }
        pendingReqF2 = createDeferred();
        return pendingReqF2.promise;
      };
      state.autoFullscreen = true;
      toastNode.textContent = '';
      controller.openViewer();
      controller.closeViewer();
      controller.openViewer();
      assert.strictEqual(callCountF, 2);

      mockDocument.fullscreenElement = overlayNode;
      pendingReqF1.resolve();
      mockDocument.dispatchEvent('fullscreenchange');
      await Promise.resolve();
      await Promise.resolve();

      pendingReqF2.reject(new Error('Already fullscreen'));
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(mockDocument.fullscreenElement, overlayNode, 'Case F: Session 2 must remain in OS fullscreen');
      assert.strictEqual(state.isFullscreenMode, true);
      assert.strictEqual(toastNode.textContent, '', 'Case F: P2 reject when already fullscreen must NOT show fallback toast');
      controller.closeViewer();
    } finally {
      mockDocument.querySelectorAll = origQuerySelectorAll;
      global.Image = origImage;
    }
  });
  console.log('✅ Test 27: DEFECT-01 async fullscreen Promise vs closeViewer/openViewer & rapid toggle races verified');

  // 28. DEFECT-02: pointer-events: none synthetic header mouseleave must not cancel UI hide
  await withFakeTimers(async (timers) => {
    await withControllerHarness(async ({
      controller,
      overlayNode,
      headerNode,
      fullscreenBtnNode,
    }) => {
      controller.createOverlay();
      overlayNode.classList.add('active');

      // 28.1 Hover header -> press 'h' -> synthetic mouseleave from pointer-events: none
      headerNode.dispatchEvent('mouseenter');
      controller.handleKeyDown({ key: 'h', preventDefault() {}, stopPropagation() {} });
      assert.strictEqual(state.isUiHidden, true, 'Pressing h on header must hide UI');
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true);
      assert.strictEqual(timers.count, 0);

      headerNode.dispatchEvent('mouseleave');
      assert.strictEqual(
        state.isUiHidden,
        true,
        'DEFECT-02: Synthetic header mouseleave after H hide must NOT reset state.isUiHidden'
      );
      assert.strictEqual(
        overlayNode.classList.contains('disagall-ui-hidden'),
        true,
        'DEFECT-02: Synthetic header mouseleave must keep .disagall-ui-hidden'
      );
      assert.strictEqual(timers.count, 0, 'DEFECT-02: Synthetic header mouseleave must NOT start idle timer');

      // Moving mouse on overlay restores UI and resets isHeaderHovered cleanly
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(state.isUiHidden, false);
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), false);
      assert.strictEqual(timers.count, 1);

      // Verify auto-hide still works after mousemove (isHeaderHovered was cleared on mouseleave)
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'Auto-hide must not stay blocked after synthetic mouseleave');

      // Restore UI via mousemove
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false);

      // 28.2 Hover header -> click fullscreen button -> synthetic mouseleave must keep UI hidden
      headerNode.dispatchEvent('mouseenter');
      fullscreenBtnNode.dispatchEvent('click');
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(state.isFullscreenMode, true);
      assert.strictEqual(state.isUiHidden, true);
      assert.strictEqual(overlayNode.classList.contains('disagall-ui-hidden'), true);

      headerNode.dispatchEvent('mouseleave');
      assert.strictEqual(
        state.isUiHidden,
        true,
        'DEFECT-02: Synthetic header mouseleave after fullscreen button click must NOT show UI'
      );
      assert.strictEqual(
        overlayNode.classList.contains('disagall-ui-hidden'),
        true,
        'DEFECT-02: Fullscreen UI hidden class must persist after synthetic header mouseleave'
      );
      assert.strictEqual(timers.count, 0);

      // Exit fullscreen -> UI restores normally
      controller.handleKeyDown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
      await Promise.resolve();
      await Promise.resolve();
      assert.strictEqual(state.isFullscreenMode, false);
      assert.strictEqual(state.isUiHidden, false);

      // 28.3 Even if .disagall-idle is active when mouseleave fires, it must not cancel idle hide
      overlayNode.classList.add('disagall-idle');
      headerNode.dispatchEvent('mouseleave');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true, 'Header mouseleave must not cancel .disagall-idle');

      // 28.4 Normal mouseleave while UI is visible must still schedule idle timer
      overlayNode.dispatchEvent('mousemove');
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), false);
      headerNode.dispatchEvent('mouseenter');
      headerNode.dispatchEvent('mouseleave');
      assert.strictEqual(timers.count, 1, 'Normal header mouseleave while UI visible must schedule idle timer');
      timers.runNext();
      assert.strictEqual(overlayNode.classList.contains('disagall-idle'), true);
    });
  });
  console.log('✅ Test 28: DEFECT-02 synthetic header mouseleave after UI hide verified');

  console.log('\n🎉 ALL VIEWER IMMERSION UNIT TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Viewer Immersion test failed:', err);
  process.exit(1);
});
