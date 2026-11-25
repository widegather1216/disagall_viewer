# 🧪 [post-recommend] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`0건 OPEN DEFECT` · `🧐 2건 OPEN REFACTOR` — 2026-11-25 전수 클린코드 감사)
- **인수 조건 통과율**: `4 / 4 (100%)` · 테스트 매트릭스 `6 / 6 PASS`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건`

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
- **심각도**: 🔴 Must Fix (즉시 조치·릴리즈 차단)
- **위치**: [`src/controller/recommend_controller.js#L18-L21`](../../../src/controller/recommend_controller.js#L18-L21), [`#L58-L67`](../../../src/controller/recommend_controller.js#L58-L67), [`tests/recommend.test.js#L7-L82`](../../../tests/recommend.test.js#L7-L82), [`#L86-L268`](../../../tests/recommend.test.js#L86-L268), [`#L203-L211`](../../../tests/recommend.test.js#L203-L211)
- **위반 규칙**: 스펙 가드 계약 위반(`post-recommend/spec.md` §3.1) / 단위 테스트 실효성(자체 복제 스텁 허수 테스트)
- **발견된 문제**:
  - `triggerPostRecommend()` 진입부에 `isOverlayActiveNow()` 체크가 없어 뷰어 비활성(`!active`) 상태에서도 호출 시 `dispatchRecommendClick(btn)`가 실행됨(타이머 콜백 내부에만 존재). 또한 `isOverlayActiveNow()`는 `immersion_controller.js`의 `isOverlayActive()`와 중복 구현됨.
  - `tests/recommend.test.js` Tests 1–7이 파일 상단의 로컬 문자열 정규식 복제 함수만 검증하고 있으며, Test 8에서도 실모듈 `isUserLoggedIn`, `isGalleryCodeEnforced`, `updateRecommendButtonUi`, `RECOMMEND_THROTTLE_MS`, `alreadyVoted`, 500ms/1200ms `midTimer`/`afterTimer` 콜백 검증이 누락됨. Test 4 `catch`의 `AssertionError` 삼킴 및 `dc_sample.html` CWD 의존 존재.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // 1. recommend_controller.js: triggerPostRecommend() 최상단에 `if (!isOverlayActive() || isRecommending) return false;` 추가
  // 2. tests/recommend.test.js: 로컬 복제 함수 제거 후 recommend_parser.js / recommend_controller.js 실모듈 전수 검증으로 교체
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)

### [REFACTOR-02] `triggerPostRecommend()`(105줄·7-depth) 분할 및 `recommend_parser.js` 방어·중첩 개선
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`src/controller/recommend_controller.js#L58-L162`](../../../src/controller/recommend_controller.js#L58-L162), [`src/parser/recommend_parser.js#L64-L84`](../../../src/parser/recommend_parser.js#L64-L84), [`#L139-L143`](../../../src/parser/recommend_parser.js#L139-L143)
- **위반 규칙**: 함수 길이(30줄)·중첩 깊이(3-depth) / 중복 로직 / 빈 `catch` 블록
- **발견된 문제**:
  - `triggerPostRecommend()`가 105줄·7-depth 중첩으로 비대하며 `midTimer`/`afterTimer` 간 `.voted` 상태 갱신 로직과 매직 넘버(`500`, `2500`)가 중복/산재됨.
  - `recommend_parser.js`: `findFirstValidMatch()`가 5-depth 중첩이며 `dispatchRecommendClick()`에 빈 `catch (e) {}` 블록(`L142`)이 존재함.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // 1. recommend_controller.js: validateRecommendPreconditions(), markCurrentPostVoted(), scheduleRecommendSyncTimers(), releaseRecommendLockAsync() 분리
  // 2. recommend_parser.js: findFirstValidMatch() 헬퍼 평탄화 및 dispatchRecommendClick() catch 폴백 사유 주석/로깅 정리
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)
