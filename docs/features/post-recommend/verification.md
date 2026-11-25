# 🧪 [post-recommend] Verification & Ticket Logs

- **검증 상태**: `🟢 Sign-Off` (`0건 OPEN DEFECT` · `🧐 0건 OPEN REFACTOR` — `REFACTOR-01~02` 해결 완료)
- **인수 조건 통과율**: `4 / 4 (100%)` · 테스트 매트릭스 `6 / 6 PASS`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (헤더 추천 버튼 클릭 및 단축키 R/C)**:
  - **Given** 사진 뷰어가 활성화되어 있을 때,
  - **When** 헤더의 [개추] 버튼을 누르거나 키보드 `R`/`C`를 누르면,
  - **Then** 본문 추천 버튼이 단 1회 클릭 디스패치되고 즉시 확인 토스트가 출력된다.
- **AC-02 (실시간 카운트 업 동기화)**:
  - **Given** 추천 디스패치가 성공적으로 완료되었을 때,
  - **When** 500ms 및 1200ms 후 DOM에서 최신 추천 수를 조회하여 카운트가 증가하면,
  - **Then** 버튼 라벨이 증가된 수치로 갱신되고 `.voted` 클래스가 부여된다.
- **AC-03 (중복 추천 및 광클릭 쓰로틀링 방어)**:
  - **Given** 사용자가 1.5초 이내에 연속으로 개추 버튼을 누르거나 이미 투표한 글인 경우,
  - **When** 추가 입력을 시도하면,
  - **Then** 디스패치를 차단하고 안내 토스트를 띄워 디시 서버 차단을 방지한다.
- **AC-04 (미추천 글 `on` 클래스 오탐 방어)**:
  - **Given** 디시 데스크톱 본문 버튼에 기본 클래스로 `on`이 포함되어 있을 때,
  - **When** 사용자가 첫 추천을 시도하면,
  - **Then** 미추천 글로 정상 인식되어 추천이 정상 디스패치된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 추천 수 파싱 및 헤더 버튼 라벨 정상 동기화 | `AC-01` | `PASS (Fixed in DEFECT-03)` | [`DEFECT-03`](#defect-03-recommend_button_selectors-%EC%9E%90%EA%B0%80-%EB%A7%A4%EC%B9%AD-%EB%B9%84%EC%B6%94%EC%B2%9C-%EB%B2%84%ED%8A%BC-%EC%98%A4%ED%81%B4%EB%A6%AD-%EB%B0%8F-%EC%B6%94%EC%B2%9C-%EC%8B%A4%ED%8C%A8-%EC%9D%80%ED%8F%90) |
| `TC-HP-02` | Happy | `r`/`c` 단축키 및 클릭 시 1회성 단일 디스패치 | `AC-01` | `PASS (Fixed in DEFECT-03)` | [`DEFECT-03`](#defect-03-recommend_button_selectors-%EC%9E%90%EA%B0%80-%EB%A7%A4%EC%B9%AD-%EB%B9%84%EC%B6%94%EC%B2%9C-%EB%B2%84%ED%8A%BC-%EC%98%A4%ED%81%B4%EB%A6%AD-%EB%B0%8F-%EC%B6%94%EC%B2%9C-%EC%8B%A4%ED%8C%A8-%EC%9D%80%ED%8F%90) |
| `TC-HP-03` | Happy | 투표 후 500ms/1200ms 비동기 카운트 업 반영 | `AC-02` | `PASS` | - |
| `TC-BD-01` | Boundary | 기본 `on` 클래스가 존재하는 데스크톱 추천 버튼 정상 투표 | `AC-04` | `PASS` | [DEFECT-02] |
| `TC-NG-01` | Negative | 1.5초 이내 광클릭 시 쓰로틀링 차단 | `AC-03` | `PASS` | - |
| `TC-NG-02` | Negative | 뷰어 비활성(`!active`) 상태 시 R/C 단축키 인터셉트 차단 | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] 추천 1회 실행 시 디시인사이드 "추천은 1일 1회만 가능합니다" 알림 발생
- **현재 상태**: 🟢 RESOLVED — 수정: `btn.click()` 단일 디스패치 분기 처리 | 회귀 테스트: `PASS`

### [DEFECT-02] 미추천 게시글인데도 "이미 추천을 했다"고 뜨며 추천 실행이 차단되는 현상
- **현재 상태**: 🟢 RESOLVED — 수정: `on` 클래스 사전 가드 제거 및 세션 카운트 증분 판별 | 회귀 테스트: `PASS`

### [DEFECT-03] `RECOMMEND_BUTTON_SELECTORS` 자가 매칭, 비추천 버튼 오클릭 및 추천 실패 은폐
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🔴 P0 Critical | [`src/parser/recommend_parser.js#L3-L98`](../../../src/parser/recommend_parser.js#L3-L98), [`src/controller/recommend_controller.js#L23-L162`](../../../src/controller/recommend_controller.js#L23-L162), [`src/ui/overlay.js#L36`](../../../src/ui/overlay.js#L36)
- **원인 및 실증**: `button[id*="recommend"]`가 뷰어 자체 버튼 `#disagall-btn-recommend`와 일치하고, `querySelector` 문서 순서 특성상 `button[data-no]`·`button[onclick*="recom"]`·`.btn_recommend_box button`이 실베추(`btn_silbechu`), 신고(`btn_report`), 스크랩 닫기(`#scrapdone_non_recom`), 개념글 목록 이동(`goList`) 등을 오클릭함(`dc_sample.html` 내 `button[data-no]` 14건·`onclick*="recom"` 3건 확인). 또한 `dispatchRecommendClick()`이 `false`를 반환해도 무조건 `"개념글 추천을 눌렀습니다! 👍"` 토스트를 출력하고 동기화 타이머가 `state`에 등록되지 않아 `closeViewer()` 시 해제되지 않음을 확인함(`tests/recommend.test.js` Test 8 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/parser/recommend_parser.js`](../../../src/parser/recommend_parser.js#L3-L160), [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js#L18-L162), [`src/state.js`](../../../src/state.js#L29-L30), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L22), [`tests/recommend.test.js`](../../../tests/recommend.test.js#L271-L654)
  - **원인 및 조치**: Devil's Advocate 교차 검증을 반영해 `RECOMMEND_BUTTON_PRIORITY_SELECTORS` / `RECOMMEND_COUNT_PRIORITY_SELECTORS` 우선순위 배열을 도입(`RECOMMEND_BUTTON_SELECTORS` 문자열 호환 유지)하고 `button[data-no]`·`[onclick*="recom"]`·`button[id*="recommend"]`·`.btn_recommend_box button`을 제거했으며, `isExcludedRecommendElement()`로 `#disagall-viewer-overlay`·`#disagall-no-photo-notice`·`#disagall-quick-launcher`·`[id^="disagall-"]` 내부 요소를 전수 배제함. `dispatchRecommendClick()`에는 분리(`isConnected === false`)·비활성(`isRecommendButtonDisabled`: `disabled`/`aria-disabled`/`fieldset[disabled]`) 가드를 추가하고, `triggerPostRecommend()`가 `dispatched === false`일 때 실패 토스트(`"추천 실행에 실패했습니다."`) 후 조기 반환(쓰로틀 미갱신·타이머 미예약·락 즉시 해제)하도록 수정했으며 `state.recommendTimers`/`state.recommendUnlockTimer`를 `closeViewer()`의 `clearRecommendTimers()`와 연동하고 `npm run build`로 번들을 동기화함.
  - **회귀 테스트 결과**: `node tests/recommend.test.js` (8/8 PASS), `npm test` (5개 스위트 전량 PASS), `node tests/immersion_e2e.test.js` (15/15 PASS), `npm run build` (`PASS`), `node --check` (`PASS`)

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

### [REFACTOR-01] `triggerPostRecommend()` `!active` 진입 가드 누락 및 `tests/recommend.test.js` Tests 1–7 실모듈 전환
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도**: 🔴 Must Fix (즉시 조치·릴리즈 차단)
- **해결 내역**:
  - **수정 파일**: [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js#L13-L165), [`tests/recommend.test.js`](../../../tests/recommend.test.js#L1-L677)
  - **원인 및 조치**: `recommend_controller.js`에서 중복 `isOverlayActiveNow()`를 제거하고 `immersion_controller.js`의 `isOverlayActive()`를 import하여 진입부(`if (!isOverlayActive() || isRecommending) return false;`) 및 `midTimer`/`afterTimer` 콜백에 통합 적용했으며, 테스트 세션 초기화를 위한 `resetRecommendSessionState()`를 export함. `tests/recommend.test.js`에서는 로컬 정규식/스텁 복제 함수를 전량 제거하고 `recommend_parser.js`/`recommend_controller.js` 실모듈(`getPostRecommendCount`, `getNativeRecommendButton`, `isRecommendButtonDisabled`, `isUserLoggedIn`, `isGalleryCodeEnforced`, `dispatchRecommendClick`, `updateRecommendButtonUi`, `triggerPostRecommend`, `clearRecommendTimers`, `resetRecommendSessionState`)로 Tests 1~8을 재작성(비활성 차단, 1200ms 쓰로틀, `alreadyVoted`, 500ms/1200ms `.voted`·UI 동기화, 비회원 `🔒` 토스트 폴백, `AssertionError` 비삼킴, `path.join(__dirname, '..', 'dc_sample.html')` HTML-to-MockDOM 연동)함.
  - **회귀 테스트 결과**: `npm run build` (`PASS`), `npm test` (5개 스위트·`recommend.test.js` 8/8 `PASS`), `node tests/immersion_e2e.test.js` (16/16 `PASS`), `node tests/post_navigation_e2e.test.js` (11/11 `PASS`), `node --check` (`PASS`)

### [REFACTOR-02] `triggerPostRecommend()`(105줄·7-depth) 분할 및 `recommend_parser.js` 방어·중첩 개선
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도**: 🟡 Should Fix (권장 조치)
- **해결 내역**:
  - **수정 파일**: [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js#L15-L177), [`src/parser/recommend_parser.js`](../../../src/parser/recommend_parser.js#L64-L90) ([`L139-L166`](../../../src/parser/recommend_parser.js#L139-L166))
  - **원인 및 조치**: `recommend_controller.js`에 모듈 상수 `RECOMMEND_UNLOCK_DELAY_MS = 500`·`RECOMMEND_LOCK_TOAST_DURATION_MS = 2500`을 추출하고, `triggerPostRecommend()`를 `markCurrentPostVoted(recommendBtnEl)`, `checkPreRecommendGuards(now, recommendBtnEl)`, `handleMidRecommendCheck(beforeCount)`, `handleAfterRecommendCheck(beforeCount, isLoggedIn)`, `scheduleRecommendSyncTimers(beforeCount, isLoggedIn)`, `finalizeRecommendLock(shouldUnlockAsync)` 헬퍼로 분할해 모든 함수가 30줄 이하·2-depth 이내를 준수하도록 개선함. `recommend_parser.js`에서는 `findFirstValidMatch(root, selectors)`를 `findValidInSelector(root, selector, hasQueryAll)`로 평탄화(최대 2-depth)하고 `dispatchRecommendClick()`의 `catch` 폴백 사유 주석을 명시함.
  - **회귀 테스트 결과**: `npm run build` (`PASS`), `npm test` (5개 스위트 전량 `PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node --check src/controller/recommend_controller.js src/parser/recommend_parser.js` (`PASS`)
