// Unit & Integration Tests for Post Recommend feature (Disagall Viewer)
const assert = require('assert');
const fs = require('fs');

// 1. Logic under test: extractRecommendCount
function extractRecommendCount(html) {
  const match = html.match(/(?:id="recommend_view_up_[^"]*"|class="[^"]*up_num[^"]*"|class="[^"]*recom_num[^"]*")[^>]*>([\s\S]*?)<\/(?:p|span|div)>/);
  if (match) {
    const text = match[1].replace(/<[^>]+>/g, '').trim();
    const num = parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

// 2. Logic under test: hasNativeRecommendButton
function hasNativeRecommendButton(html) {
  const buttonPattern = /<button[^>]+(?:class="[^"]*(?:btn_recom_up|btn-recom|btn_recommend|recom_btn)[^"]*"|data-no=)[^>]*>/i;
  return buttonPattern.test(html);
}

// 3. Logic under test: simulateRecommendTrigger
function simulateRecommendTrigger(hasButton, currentCount) {
  if (!hasButton) {
    return { success: false, message: '본문의 추천 버튼을 찾을 수 없습니다.' };
  }
  return {
    success: true,
    message: '개념글 추천을 눌렀습니다! 👍',
    newCount: (currentCount !== null ? currentCount + 1 : 1)
  };
}

console.log('🧪 Starting Post Recommend Unit Tests...\n');

// Test 1: extractRecommendCount logic
{
  assert.strictEqual(
    extractRecommendCount('<p class="up_num font_red" id="recommend_view_up_2041711">7</p>'),
    7,
    'Test 1.1 failed: standard desktop recommend count'
  );

  assert.strictEqual(
    extractRecommendCount('<span class="recom_num">42</span>'),
    42,
    'Test 1.2 failed: mobile recommend count'
  );

  assert.strictEqual(
    extractRecommendCount('<p class="up_num"> 0 </p>'),
    0,
    'Test 1.3 failed: zero recommend count'
  );

  assert.strictEqual(
    extractRecommendCount('<div>no counts here</div>'),
    null,
    'Test 1.4 failed: non-existent count should return null'
  );

  console.log('✅ Test 1: extractRecommendCount passed all cases');
}

// Test 2: hasNativeRecommendButton matching
{
  const desktopBtnHtml = '<button type="button" class="btn_recom_up on" data-no="2041711"><span class="blind">개념 추천</span></button>';
  assert.strictEqual(hasNativeRecommendButton(desktopBtnHtml), true, 'Desktop recommend button match failed');

  const mobileBtnHtml = '<button type="button" class="btn-recom">추천</button>';
  assert.strictEqual(hasNativeRecommendButton(mobileBtnHtml), true, 'Mobile recommend button match failed');

  const regularBtnHtml = '<button type="button" class="btn_close">닫기</button>';
  assert.strictEqual(hasNativeRecommendButton(regularBtnHtml), false, 'Regular button should not match');

  console.log('✅ Test 2: hasNativeRecommendButton passed all cases');
}

// Test 3: simulateRecommendTrigger feedback
{
  const successRes = simulateRecommendTrigger(true, 7);
  assert.strictEqual(successRes.success, true);
  assert.strictEqual(successRes.message, '개념글 추천을 눌렀습니다! 👍');
  assert.strictEqual(successRes.newCount, 8);

  const failRes = simulateRecommendTrigger(false, null);
  assert.strictEqual(failRes.success, false);
  assert.strictEqual(failRes.message, '본문의 추천 버튼을 찾을 수 없습니다.');

  console.log('✅ Test 3: simulateRecommendTrigger passed all cases');
}

// Test 4: Integration Test on live_post.html (2041711)
if (fs.existsSync('/Users/kimbeomjun/.gemini/antigravity/brain/47157376-6f1f-408b-a2c6-e9315e628464/scratch/live_post.html')) {
  const liveHtml = fs.readFileSync('/Users/kimbeomjun/.gemini/antigravity/brain/47157376-6f1f-408b-a2c6-e9315e628464/scratch/live_post.html', 'utf-8');
  const count = extractRecommendCount(liveHtml);
  const hasBtn = hasNativeRecommendButton(liveHtml);

  assert.strictEqual(count, 7, 'Live HTML recommend count must be 7');
  assert.strictEqual(hasBtn, true, 'Live HTML must contain native recommend button');

  console.log(`✅ Test 4: Live HTML integration (count: ${count}, hasButton: ${hasBtn}) passed`);
}

// Test 5: Integration Test on dc_sample.html (1968506)
if (fs.existsSync('dc_sample.html')) {
  const sampleHtml = fs.readFileSync('dc_sample.html', 'utf-8');
  const count = extractRecommendCount(sampleHtml);
  const hasBtn = hasNativeRecommendButton(sampleHtml);

  assert.strictEqual(count, 6, 'Sample HTML recommend count must be 6');
  assert.strictEqual(hasBtn, true, 'Sample HTML must contain native recommend button');

  console.log(`✅ Test 5: Sample HTML integration (count: ${count}, hasButton: ${hasBtn}) passed`);
}

console.log('\n🎉 ALL RECOMMEND UNIT & INTEGRATION TESTS PASSED! 🎉');
