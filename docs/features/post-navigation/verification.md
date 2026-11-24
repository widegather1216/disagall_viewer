# Verification & Defect Log - Post Navigation

- **검증 상태**: `🧪 QA Testing` (`0건 OPEN` — `DEFECT-01~04` 및 `REFACTOR-01~13` 전건 해결 완료, 동적 QA 검증 대기)
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건`

---

## 🚨 결함 리포트 (Defect Logs)

### [DEFECT-01] 실 서비스 DC 게시판에서 위/아래 방향키 이동 실패 (현재 글 행 필터링 탈락)
- **현재 상태**: 🟢 RESOLVED — `isCurrentPost` 선행 판별(`crt`/`crt_icon`/`currentPostNo`) 적용 및 `tests/post_navigation.test.js` 라이브/샘플 픽스처 회귀 테스트 `PASS`.

### [DEFECT-02] `showNoPhotoNotice()` `keydown` 리스너 영구 누수 및 입력창/`Cmd+W` 단축키 가로채기
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🔴 P0 Critical | [`src/ui/overlay.js#L198-L339`](../../../src/ui/overlay.js#L198-L339), [`src/state.js#L28`](../../../src/state.js#L28), [`src/controller/viewer_controller.js#L349-L375`](../../../src/controller/viewer_controller.js#L349-L375)
- **원인 및 실증**: `closeBtn` 클릭·중복 호출 시 `noticeEl.remove()`만 실행하고 `window.removeEventListener('keydown', handleNoticeKey)`와 `setTimeout` 타이머를 해제하지 않아 리스너/타이머가 영구 누수됨. 또한 `handleNoticeKey`에 `e.repeat`, 입력창(`INPUT`/`TEXTAREA`/`SELECT`/`isContentEditable`), 수정자 키(`ctrlKey`/`metaKey`/`altKey`), 외부 모달(`isExternalModalOpen`), 활성 뷰어(`overlayEl.active`) 가드가 없어 공지 닫은 후에도 댓글 입력 `w`/`s`나 `Cmd+W`가 `onNavigatePost`로 가로채짐(`tests/post_navigation.test.js` Test 8 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/state.js`](../../../src/state.js#L28), [`src/ui/overlay.js`](../../../src/ui/overlay.js#L198-L339), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L11-L20), [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js#L345-L625)
  - **원인 및 조치**: Devil's Advocate 교차 검증을 반영해 `state.noPhotoNoticeTimer` 등록 및 `dismissNoPhotoNotice()`/`dismissNotice()` 멱등 정리(DOM 제거·`clearTimeout`·`window.removeEventListener` 완료 후 콜백 실행으로 재진입 레이스 차단) 구현. `isEditableTarget`/`isExternalModalOpen`을 `src/ui/overlay.js`로 단일화(중복 제거)하고 `handleNoticeKey`에 입력창·수정자 키·`repeat`·외부 모달·활성 오버레이 가드 및 한글 IME(`KeyW`/`KeyS`) 폴백을 추가했으며 `openViewer()`/`closeViewer()`에서 `dismissNoPhotoNotice()`를 호출해 잔존 배너/타이머를 차단하고 `npm run build`로 `content.js`/`disagall_viewer.user.js` 동기화.
  - **회귀 테스트 결과**: `node tests/post_navigation.test.js` (8/8 PASS), `npm test` (5개 스위트 전량 PASS), `node tests/immersion_e2e.test.js` (15/15 PASS), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-03] `post_navigator.js` 하단 경계 `'bottom'` 도달 불가, 공지/AD `innerHTML` 우회 및 `javascript:` 통과
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/parser/post_navigator.js#L18-L230`](../../../src/parser/post_navigator.js#L18-L230), [`src/controller/viewer_controller.js#L189`](../../../src/controller/viewer_controller.js#L189)
- **원인 및 실증**: `targetIdx = -1` 초기값으로 마지막 행에서 `direction === 'down'` 시 `'top'`(`가장 최신 글입니다.`)을 반환해 `'bottom'`이 dead code였으며, `isDesktopPostRowValid()`가 `AD`/`공지`/`설문` 필터 전에 `tr.innerHTML.includes(currentPostNo)`를 평가해 공지/AD 행이 통과하고, `hrefAttr.startsWith('javascript:')`가 `.trim().toLowerCase()`를 누락해 `" JavaScript:alert(1)"`이 통과함(`tests/post_navigation.test.js` Test 9 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/parser/post_navigator.js`](../../../src/parser/post_navigator.js#L18-L230), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L11-L189), [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js#L624-L988)
  - **원인 및 조치**: `getAdjacentPostUrl()`의 경계 분기(`targetIdx < 0 || targetIdx >= validRows.length`)를 `direction === 'up'` 기반 `'top'`/`'bottom'` 반환으로 교정. `isSafeNavigationHref()`/`isSafePostLink()`를 도입해 제어문자/공백 제거 후 `http`/`https`/`file`/상대경로 외 `javascript:`/`data:`/`vbscript:` 스킴과 `#`/빈 주소를 데스크톱·모바일 파서와 `navigatePost()` 양쪽에서 이중 차단. `isExcludedPostElement()`로 `공지`/`AD`/`설문` 및 `.sp-notice`/`.icon_ad`/`.icon_survey` 선행 필터링(모바일 포함) 적용 및 `tr.innerHTML.includes(currentPostNo)` 제거(`dataset.no`/`extractPostNo` 기반 식별 유지).
  - **회귀 테스트 결과**: `node tests/post_navigation.test.js` (9/9 PASS, 실제 `src/parser/post_navigator.js` 및 `dc_sample.html` 연동 검증 포함), `npm test` (5개 스위트 전량 PASS), `node tests/immersion_e2e.test.js` (15/15 PASS), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-04] `navigatePost()` 미취소 `setTimeout` 및 `startAutoOpenPolling()` 고아 `setInterval` 충돌
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L183-L239`](../../../src/controller/viewer_controller.js#L183-L239), [`#L440-L610`](../../../src/controller/viewer_controller.js#L440-L610), [`src/state.js#L27-L30`](../../../src/state.js#L27-L30), [`src/ui/overlay.js#L185-L216`](../../../src/ui/overlay.js#L185-L216)
- **원인 및 실증**: `navigatePost()`가 `disagall_auto_open='1'` 기록 후 미추적 `setTimeout(..., 150)`을 예약해 150ms 내 `closeViewer()`/재호출/`openViewer()` 시에도 유령 이동·이중 이동 경합이 발생하며, `startAutoOpenPolling()`의 지역 `pollTimer`가 수동 `openViewer()`/`closeViewer()`/`checkAutoOpen()` 중복 시 중단되지 않아 닫힌 뷰어를 재오픈하거나 활성 뷰어 인덱스를 `0`으로 리셋하고 고아 `showNoPhotoNotice`를 마운트함(`tests/post_navigation.test.js` Test 10 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/state.js`](../../../src/state.js#L27-L30), [`src/ui/overlay.js`](../../../src/ui/overlay.js#L185-L216), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L65-L71), [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js#L988-L1520)
  - **원인 및 조치**: Competing Hypotheses(Tracer A/B) 및 Devil's Advocate 검증을 반영해 `state.postNavTimer`·`state.autoOpenPollTimer` 및 `postNavSeq`·`autoOpenPollSeq` 세대 토큰을 도입하고 `cancelPendingPostNavigation()`·`clearAutoOpenPollTimer()`를 구현. `cancelPendingPostNavigation()`은 실제 미발화 `state.postNavTimer !== null` 취소 시에만 `disagall_auto_open`을 제거해 이미 출발한 이동·조기 로드를 보존하고, `openViewer()`에서는 `state.postImages.length > 0` 확정 직후 호출해 0장 `alert` 실패 시 기존 폴링/이동을 보호함. `navigatePost()` 진입 시 선행 예약을 Last-Wins로 취소(경계 에러 포함)하고, `closeViewer()`·`initViewerBase()`의 `pagehide` 리스너로 잔여 타이머 및 `dismissViewerToast()`(널 가드 및 `toastSeq` 포함)를 일괄 정리했으며 동기 타이머 모킹(TDZ/`fired`·`stopped`)을 방어하고 `npm run build`로 번들을 동기화함.
  - **회귀 테스트 결과**: `node tests/post_navigation.test.js` (10/10 PASS), `npm test` (5개 스위트 전량 PASS), `node tests/immersion_e2e.test.js` (15/15 PASS), `npm run build` (`PASS`), `node --check` (`PASS`)

---

## 🧐 코드 품질 감사 리포트 (Audit & Refactoring Logs)

### [REFACTOR-01] `getAdjacentPostUrl` SRP 위반 및 100라인 단일 거대 함수 분해
- **현재 상태**: 🟢 RESOLVED — `isDesktopPostRowValid`, `isMobilePostItemValid`, `getValidPostRows`, `findCurrentPostRowIndex`, `getAdjacentPostUrl` 5개 함수로 분해 완료 (`PASS`).

### [REFACTOR-02] 본문 컨테이너 셀렉터 3중 중복 및 `isPostBodyImage` 내 런타임 배열 할당/조인 오버헤드
- **현재 상태**: 🟢 RESOLVED — `POST_BODY_CONTAINER_SELECTORS`, `EXCLUDED_CONTAINER_SELECTORS` 불변 상수 SSOT 통일 완료.

### [REFACTOR-03] `collectPostImages` 내 중복 순회 로직 및 전역 상태 직접 변이 부수효과
- **현재 상태**: 🟢 RESOLVED — `extractImagesFromElements` 및 순수 함수 `extractPostImages` 분리 완료.

### [REFACTOR-04] 단위 테스트 내 외부 임시 파일 하드코딩 의존성 (`EPERM` 중단 오류)
- **현재 상태**: 🟢 RESOLVED — 프로젝트 내 로컬 픽스처 경로 및 안전 가드 적용 (`PASS`).

### [REFACTOR-05] `getAdjacentPostUrl`의 반환 타입 다형성(Discriminated Result 계약 불일치)
- **심각도**: 🟢 Nitpick (사소함) | **위치**: [`src/parser/post_navigator.js#L177-L248`](../../../src/parser/post_navigator.js#L177-L248), [`src/controller/viewer_controller.js#L206-L213`](../../../src/controller/viewer_controller.js#L206-L213)
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료 — Option A 하위 호환 Discriminated Result 적용)
- **해결 내역**:
  - **수정 파일**: [`src/parser/post_navigator.js`](../../../src/parser/post_navigator.js#L177-L248), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L206-L213), [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js#L1516-L1729), [`docs/features/post-navigation/spec.md`](./spec.md#L10-L50), [`docs/features/post-navigation/decisions.md`](./decisions.md#L33-L38)
  - **원인 및 조치**: 기존 `getAdjacentPostUrl()`이 `null` / `{ error, message }` / `{ url, title, hasPhoto }` 3가지 형태로 다형 반환되던 계약을 사용자 컨펌(Option A)에 따라 단일 `AdjacentPostResult` Discriminated Result로 통일(`createUnavailableResult()` 헬퍼 도입: `no_list`/`current_not_found`/`unsafe_url` ➔ `{ ok: false, status: 'unavailable', error, message }`, 경계 ➔ `{ ok: false, status: 'boundary', error: 'top' | 'bottom', message }`, 성공 ➔ `{ ok: true, status: 'found', url, title, hasPhoto }`). `navigatePost()`는 `!result || !result.ok || result.status !== 'found'` 단일 가드로 정리했고, `Test 11` Red-to-Green 및 기존 `Test 9` 하위 호환성을 검증했으며 `npm run build`로 번들을 동기화함.
  - **회귀 테스트 결과**: `node tests/post_navigation.test.js` (`11/11 PASS`), `npm test` (5개 스위트 전량 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

### [REFACTOR-06] `window.onmessage` 출처(Origin) 및 신뢰성 검증 부재 (보안 위생)
- **현재 상태**: 🟢 RESOLVED — 동일 출처(`window.location.origin`) 및 로컬 테스트 페이지 허용 가드 적용 완료.

### [REFACTOR-07] 전역 `mousemove` / `mouseup` 상시 바인딩에 따른 이벤트 위생 결함
- **현재 상태**: 🟢 RESOLVED — `mousedown` 시 동적 바인딩 및 `mouseup`/`resetZoom()` 시 해제 패턴 적용 완료.

### [REFACTOR-08] `handleKeyDown`의 조건문 사다리 및 액션 매핑 분리
- **현재 상태**: 🟢 RESOLVED — `KEY_ACTIONS` 딕셔너리 매핑 분리 완료.

### [REFACTOR-09] 세션/스토리지 키 및 타이머 매직 넘버 상수화 부재
- **현재 상태**: 🟢 RESOLVED — `CONFIG` 불변 설정 객체로 단일화 완료.

### [REFACTOR-10] `window.onresize` 쓰로틀링 부재로 인한 레이아웃 스래싱(Layout Thrashing)
- **현재 상태**: 🟢 RESOLVED — `requestAnimationFrame` 1프레임 쓰로틀링 적용 완료.

### [REFACTOR-11] 뷰어 On/Off 시 `document.body` 원본 오버플로우 스타일 복원 누락
- **현재 상태**: 🟢 RESOLVED — `previousBodyOverflow` 백업 및 복원 구현 완료.

### [REFACTOR-12] `applyFittingAndPadding` 내 헤더/푸터 높이 하드코딩 매직 넘버
- **현재 상태**: 🟢 RESOLVED — `offsetHeight` 동적 조회 및 폴백, `naturalWidth`/`Height` 방어 추가 완료.

### [REFACTOR-13] `createOverlay()` 내 단일 거대 함수(120줄) SRP 분해
- **현재 상태**: 🟢 RESOLVED — `buildOverlayHtml`, `cacheOverlayElements`, `bindOverlayButtons` 등으로 책임 분리 완료.
