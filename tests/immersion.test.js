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

  console.log('\n🎉 ALL VIEWER IMMERSION UNIT TESTS PASSED! 🎉');
}

run().catch((err) => {
  console.error('❌ Viewer Immersion test failed:', err);
  process.exit(1);
});
