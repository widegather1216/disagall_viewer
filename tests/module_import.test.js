// Unit test verifying direct imports from src/ modules
const assert = require('assert');

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

  console.log('🎉 ALL MODULAR IMPORT TESTS PASSED SUCCESSFULLY! 🎉');
}

run().catch((err) => {
  console.error('❌ Modular test failed:', err);
  process.exit(1);
});
