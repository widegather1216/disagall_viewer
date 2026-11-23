// Unit test verifying direct imports from src/ modules
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SAFARI_RESOURCES_DIR = path.join(
  ROOT,
  'safari_extension/DisagallViewerSafari/DisagallViewerSafari Extension/Resources'
);
const EXTENSION_ASSETS = [
  'manifest.json',
  'background.js',
  'content.js',
  'content.css',
  'popup.html',
  'popup.js',
  'icon16.png',
  'icon48.png',
  'icon128.png',
];

async function run() {
  console.log('🧪 Starting Modular src/ Import & Unit Tests...');

  // 1. Test image_parser
  const imageParser = await import('../src/parser/image_parser.js');
  assert.strictEqual(
    imageParser.getCleanOriginalUrl('https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=123&s=thumb&type=view'),
    'https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=123'
  );
  assert.strictEqual(imageParser.isDcIconOrUiAsset(null, 'https://nstatic.dcinside.com/dc/w/images/nik.gif'), true);
  assert.strictEqual(imageParser.isDcIconOrUiAsset(null, 'https://dcimg7.dcinside.co.kr/viewimage.php?id=hit&no=123'), false);
  console.log('✅ image_parser module functions verified');

  // 2. Test post_navigator
  const postNavigator = await import('../src/parser/post_navigator.js');
  assert.strictEqual(postNavigator.extractPostNo('https://gall.dcinside.com/board/view/?id=superheroes&no=12345'), '12345');
  assert.strictEqual(postNavigator.extractPostNo('https://m.dcinside.com/board/superheroes/67890'), '67890');
  console.log('✅ post_navigator module functions verified');

  // 3. Test recommend_parser
  const recommendParser = await import('../src/parser/recommend_parser.js');
  assert(recommendParser.RECOMMEND_BUTTON_SELECTORS.includes('button.btn_recom_up'));
  console.log('✅ recommend_parser module functions verified');

  // 4. DEFECT-01: Quick-launcher CSS & Safari Extension Resources bundle parity
  const contentCss = fs.readFileSync(path.join(ROOT, 'content.css'), 'utf8');
  assert(
    /#disagall-quick-launcher\s*\{[\s\S]*?position:\s*fixed;/.test(contentCss),
    'content.css must define #disagall-quick-launcher with fixed positioning'
  );
  assert(
    /#disagall-quick-launcher:hover\s*\{/.test(contentCss),
    'content.css must define #disagall-quick-launcher:hover styles'
  );

  const userscript = fs.readFileSync(path.join(ROOT, 'disagall_viewer.user.js'), 'utf8');
  assert(
    userscript.includes('#disagall-quick-launcher {') || userscript.includes('#disagall-quick-launcher{'),
    'disagall_viewer.user.js must include injected #disagall-quick-launcher CSS'
  );

  for (const asset of EXTENSION_ASSETS) {
    const rootAsset = fs.readFileSync(path.join(ROOT, asset));
    const safariAsset = fs.readFileSync(path.join(SAFARI_RESOURCES_DIR, asset));
    assert(
      rootAsset.equals(safariAsset),
      `Safari Extension Resources/${asset} must be synced identically with root ${asset}`
    );
  }
  console.log('✅ DEFECT-01 quick-launcher CSS and Safari Extension Resources parity verified');

  console.log('🎉 ALL MODULAR IMPORT TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Modular test failed:', err);
  process.exit(1);
});
