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

  // Helper: Fake timer harness for deterministic idle timeout testing
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

  // Helper: Lightweight DOM/Browser harness for controller tests
  function createMockDomNode(id = '') {
    const classes = new Set();
    const listeners = {};
    const node = {
      id,
      style: {},
      value: '24',
      textContent: '',
      innerHTML: '',
      children: [],
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

    const overlayNode = createMockDomNode('disagall-viewer-overlay');
    const headerNode = createMockDomNode('disagall-header');
    const sliderNode = createMockDomNode('disagall-slider');
    const sliderValNode = createMockDomNode('disagall-slider-val');
    const mainImgNode = createMockDomNode('disagall-main-img');
    const closeBtnNode = createMockDomNode('disagall-close-btn');
    const bodyNode = createMockDomNode('body');
    const windowListeners = {};

    let fullscreenCalls = 0;
    let exitFullscreenCalls = 0;
    let rejectFullscreen = false;
    let openModalNode = null;

    overlayNode.querySelector = (selector) => {
      if (selector === '.disagall-header') return headerNode;
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
      'disagall-main-img': mainImgNode,
      'disagall-slider': sliderNode,
      'disagall-slider-val': sliderValNode,
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
      addEventListener: () => {},
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
    state.isUiHidden = false;
    state.zoom.isDragging = false;
    state.zoom.scale = 1.0;
    state.elements.overlayEl = null;
    state.elements.mainImgEl = null;
    state.elements.sliderEl = null;
    state.elements.sliderValEl = null;

    const controller = await import('../src/controller/viewer_controller.js');

    try {
      await fn({
        controller,
        overlayNode,
        headerNode,
        sliderNode,
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
      state.autoHideUi = true;
      state.isUiHidden = false;
      state.zoom.isDragging = false;
      global.document = origDocument;
      global.window = origWindow;
      global.requestAnimationFrame = origRaf;
      global.cancelAnimationFrame = origCancelRaf;
      global.chrome = origChrome;
      global.GM_getValue = origGmGetValue;
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

  console.log('\n🎉 ALL VIEWER IMMERSION UNIT TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Viewer Immersion test failed:', err);
  process.exit(1);
});
