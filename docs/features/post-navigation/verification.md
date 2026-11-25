# 🧪 [post-navigation] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`Happy Path 4/4 + Boundary & Negative 7/7 PASS` · `0건 OPEN DEFECT` · `🧐 2건 OPEN REFACTOR` — 2026-11-25 전수 클린코드 감사)
- **인수 조건 통과율**: `11 / 11 Scenarios PASS (100%)`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (방향키/단축키 게시글 이동 & 하단 키힌트)**:
  - **Given** 뷰어가 활성화(`.active`)되어 있을 때,
  - **When** 푸터 `.disagall-keyhints`를 확인하고 `ArrowUp`/`W` 또는 `ArrowDown`/`S`를 입력하면,
  - **Then** 푸터에 `↑ ↓ 이전/다음 글` 배지가 노출되며, 위쪽 최신 글(`up`) 또는 아래쪽 이전 글(`down`) 안내 토스트 출력 후 `150ms`(`CONFIG.POST_NAV_DELAY`) 뒤 대상 URL로 이동한다.
- **AC-02 (`sessionStorage` 연속 감상 & 자동 오픈 폴링)**:
  - **Given** `navigatePost()`로 `sessionStorage['disagall_auto_open'] = '1'`이 설정된 상태에서 새 게시글이 로드될 때,
  - **When** `checkAutoOpen()`이 실행되면,
  - **Then** `disagall_auto_open`을 즉시 1회성 소비(`removeItem`)하고 최대 15회(`150ms` 간격) 본문 이미지를 폴링해 사진 발견 시 `openViewer(null, true)`로 뷰어를 자동 오픈한다.
- **AC-03 (실제 DC 목록 파싱 및 스마트 사진글 우선 탐색)**:
  - **Given** 공지/설문/AD/광고 행 및 텍스트 전용 글·사진글이 혼재하고 현재 행 번호가 빈칸(`crt_icon`)인 DC 목록에서 탐색할 때,
  - **When** `getAdjacentPostUrl()`이 실행되면,
  - **Then** 제외 행과 비안전 URL을 걸러내고 현재 글을 정확히 식별한 뒤, `preferPhotos=true`일 때 텍스트 글을 자동 스킵해 가장 가까운 사진글을 `AdjacentPostResult`(`ok: true, status: 'found'`)로 반환한다(잔여 사진글이 없으면 인접 일반 글로 폴백).
- **AC-04 (사진 없는 글 안내 바 & 연속 감상 복구)**:
  - **Given** 연속 감상(`disagall_auto_open='1'`)으로 진입한 게시글 본문에 이미지가 0장일 때,
  - **When** 15회 폴링이 종료되면,
  - **Then** `#disagall-no-photo-notice` 상단 플로팅 바가 마운트되고, 버튼(`#disagall-notice-prev`/`next`/`close`) 또는 `↑`/`↓`/`W`/`S`/`ESC`로 연속 이동 및 닫기(8초 자동 닫힘 및 리스너/타이머 완전 해제)가 가능하다.
- **AC-05 (목록 경계·안전 URL·타이머/가드 방어)**:
  - **Given** 최상단/최하단 경계, 비활성/입력창/모달/수정자 키 입력, 또는 150ms 이동 예약·폴링 중 경합이 발생할 때,
  - **When** 탐색 또는 단축키 입력이 시도되면,
  - **Then** 경계 토스트(`top`/`bottom`) 출력 후 페이지 유지, 비안전 스킴(`javascript:`/`data:`) 차단, 비정상 컨텍스트 단축키 무시, 미발화 타이머 및 고아 폴링 인터벌이 즉시 정리된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (증적 / 티켓 링크) |
| :--- | :---: | :--- | :---: | :---: | :--- |
| `TC-HP-01` | Happy | `test_page` ➔ `test_page_2` ➔ `test_page` 연속 이동(`↓`/`W`), 하단 키힌트(`↑ ↓ 이전/다음 글`), `sessionStorage` 1회성 소비 및 뷰어 자동 오픈 | `AC-01`, `AC-02` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`ArrowDown` ➔ `test_page_2.html?no=1002` 자동 오픈, `disagall_auto_open=null`, `W` 복귀; [`tc-hp-01-viewer-keyhints.png`](./evidence/tc-hp-01-viewer-keyhints.png), [`tc-hp-01-auto-opened-page2.png`](./evidence/tc-hp-01-auto-opened-page2.png)) |
| `TC-HP-02` | Happy | 지연 렌더링 게시글에서 `checkAutoOpen()` 150ms 폴링으로 동적 이미지 포착 후 자동 오픈 | `AC-02` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`350ms` 지연 삽입 이미지 포착 후 `openViewer(null, true)` 자동 오픈 및 `#disagall-no-photo-notice` 미노출; [`happy-path-qa.log`](./evidence/happy-path-qa.log)) |
| `TC-HP-03` | Happy | 실제 DC HTML(`dc_sample.html`) `crt_icon` 빈 번호 식별·설문/AD 스킵 및 텍스트 글 스킵(`preferPhotos=true`) | `AC-03` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`dc_sample` `1968506` ➔ `↑` `1968509` 니가타 / `S` `1968505` 베짱이 및 `3001`➔`2999` 텍스트 스킵 자동 오픈; [`tc-hp-03-dc-sample-nav.png`](./evidence/tc-hp-03-dc-sample-nav.png)) |
| `TC-HP-04` | Happy | 사진 0장 글 진입 시 `#disagall-no-photo-notice` 마운트 및 버튼(`↓ 다음 글`)·단축키(`W`) 연속 감상 복구 | `AC-04` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (15회 폴링 종료 후 안내 바 마운트, `#disagall-notice-next` 클릭 ➔ `test_page_2` 자동 오픈 및 `W` ➔ `test_page` 복귀; [`tc-hp-04-no-photo-notice.png`](./evidence/tc-hp-04-no-photo-notice.png)) |
| `TC-BD-01` | Boundary | 목록 최상단(`top`) / 최하단(`bottom`) 경계 도달 시 페이지 이동 없이 경계 토스트 출력 | `AC-05` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`test_page` `↑` `'목록의 가장 최신 글입니다.'`, `test_page_3` `↓`/`s` `'목록의 마지막 글입니다.'`, `disagall_auto_open=null`; [`tc-bd-01-bottom-boundary-toast.png`](./evidence/tc-bd-01-bottom-boundary-toast.png)) |
| `TC-BD-02` | Boundary | 잔여 사진글 부재 시 인접 일반 글 폴백 및 모바일 목록(`.gall-detail-lst li`) 탐색 검증 | `AC-03` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (사진글 부재 시 `4002`➔`4001` 폴백 및 `.gall-detail-lst` `공지`/`AD`·텍스트 스킵 `5002`➔`5000` 자동 오픈; [`tc-bd-02-mobile-list-auto-open.png`](./evidence/tc-bd-02-mobile-list-auto-open.png)) |
| `TC-BD-03` | Boundary | 한글 IME(`code='KeyW'`/`'KeyS'`) 및 레인지 슬라이더 포커스 상태에서 단축키 통과 | `AC-01`, `AC-04` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`#disagall-slider` 포커스 상태 `ㄴ`/`KeyS` 및 `ArrowUp` 통과, 안내 바 `ㅈ`/`KeyW` 이동 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |
| `TC-BD-04` | Boundary | `#disagall-no-photo-notice` 8초 자동 닫힘 및 `ESC`/닫기 버튼 클릭 후 리스너 완전 해제 | `AC-04` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (실제 8000ms 자동 닫힘/`ESC`/`#disagall-notice-close` 닫기 후 `keydown` 리스너 해제 및 후속 단축키 차단 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |
| `TC-NG-01` | Negative | 비활성(`!active`), 입력창(`INPUT`/`TEXTAREA`/`SELECT`/`contentEditable`), 수정자 키, `repeat`, 외부 모달에서 `↑`/`↓`/`W`/`S` 차단 | `AC-05` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (뷰어 10종 + 안내 바 5종 입력창/수정자/`repeat`/`dialog[open]`/`aria-modal` 차단 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |
| `TC-NG-02` | Negative | `공지`/`설문`/`AD` 위장 및 비안전 스킴(`javascript:`, `data:`, `#`) 이중 차단·`AdjacentPostResult`(`unavailable`) 처리 | `AC-05` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (`notice_custom`/`.sp-ad`/`java\tscript:`/`data:`/`#` 차단 및 `no_list`/`current_not_found` 안내 토스트 확인; [`tc-ng-02-unavailable-toast.png`](./evidence/tc-ng-02-unavailable-toast.png)) |
| `TC-NG-03` | Negative | 150ms 이동 지연 중 `closeViewer()`/`navigatePost()` 연타/`pagehide` 취소 및 폴링 vs 수동 `openViewer()` 경합 방어 | `AC-05` | `✅ PASS` | Chrome 158 CDP + [`post_navigation_e2e.test.js`](../../../tests/post_navigation_e2e.test.js) (150ms 지연 중 닫기/역전 연타/`pagehide` 취소 및 `disagall_auto_open` 정리, 수동 `openViewer()` 폴링 중단 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] 실 서비스 DC 게시판에서 위/아래 방향키 이동 실패 (현재 글 행 필터링 탈락)
- **현재 상태**: 🟢 RESOLVED — `isCurrentPost` 선행 판별(`crt`/`crt_icon`/`currentPostNo`) 적용 및 `tests/post_navigation.test.js` 회귀 테스트 `PASS`.

### [DEFECT-02] `showNoPhotoNotice()` `keydown` 리스너 영구 누수 및 입력창/`Cmd+W` 단축키 가로채기
- **현재 상태**: 🟢 RESOLVED — `state.noPhotoNoticeTimer`·`dismissNoPhotoNotice()` 멱등 정리 및 입력창·수정자 키·`repeat`·외부 모달·한글 IME 가드 적용 (`tests/post_navigation.test.js` Test 8 `PASS`).

### [DEFECT-03] `post_navigator.js` 하단 경계 `'bottom'` 도달 불가, 공지/AD `innerHTML` 우회 및 `javascript:` 통과
- **현재 상태**: 🟢 RESOLVED — 하단 경계 `'bottom'` 교정, `isExcludedPostElement()` 선행 필터링 및 `isSafeNavigationHref()` 이중 차단 적용 (`tests/post_navigation.test.js` Test 9 `PASS`).

### [DEFECT-04] `navigatePost()` 미취소 `setTimeout` 및 `startAutoOpenPolling()` 고아 `setInterval` 충돌
- **현재 상태**: 🟢 RESOLVED — `state.postNavTimer`·자동 폴링 타이머·세대 토큰 및 `cancelPendingPostNavigation()`·`pagehide` 수명주기 정리 적용 (`tests/post_navigation.test.js` Test 10 `PASS`).

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

### [REFACTOR-01] `getAdjacentPostUrl` SRP 위반 및 100라인 단일 거대 함수 분해
- **현재 상태**: 🟢 RESOLVED — `isDesktopPostRowValid`, `isMobilePostItemValid`, `getValidPostRows`, `findCurrentPostRowIndex`, `getAdjacentPostUrl` 5개 함수로 분해 완료 (`PASS`).

### [REFACTOR-02] 본문 컨테이너 셀렉터 3중 중복 및 `isPostBodyImage` 내 런타임 배열 할당/조인 오버헤드
- **현재 상태**: 🟢 RESOLVED — `POST_BODY_CONTAINER_SELECTORS`, `EXCLUDED_CONTAINER_SELECTORS` 불변 상수 SSOT 통일 완료.

### [REFACTOR-03] `collectPostImages` 내 중복 순회 로직 및 전역 상태 직접 변이 부수효과
- **현재 상태**: 🟢 RESOLVED — `extractImagesFromElements` 및 순수 함수 `extractPostImages` 분리 완료.

### [REFACTOR-04] 단위 테스트 내 외부 임시 파일 하드코딩 의존성 (`EPERM` 중단 오류)
- **현재 상태**: 🟢 RESOLVED — 프로젝트 내 로컬 픽스처 경로 및 안전 가드 적용 (`PASS`).

### [REFACTOR-05] `getAdjacentPostUrl`의 반환 타입 다형성(Discriminated Result 계약 불일치)
- **현재 상태**: 🟢 RESOLVED — Option A 하위 호환 `AdjacentPostResult`(`found`/`boundary`/`unavailable`) 계약 통일 및 `ADR-005`·`Test 11` 회귀 검증 완료 (`PASS`).

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

### [REFACTOR-14] `tests/post_navigation.test.js` Tests 1–7 로컬 복제 모의 함수 제거 및 실모듈 검증 전환
- **심각도**: 🔴 Must Fix (즉시 조치·릴리즈 차단)
- **위치**: [`tests/post_navigation.test.js#L7-L164`](../../../tests/post_navigation.test.js#L7-L164), [`#L169-L343`](../../../tests/post_navigation.test.js#L169-L343), [`#L262-L270`](../../../tests/post_navigation.test.js#L262-L270), [`#L908`](../../../tests/post_navigation.test.js#L908)
- **위반 규칙**: 단위 테스트 실효성 (자체 복제 스텁 허수 테스트 금지)
- **발견된 문제**:
  - `tests/post_navigation.test.js` Tests 1–7이 `src/parser/post_navigator.js`를 임포트하지 않고 파일 상단의 로컬 정규식 복제 함수(`extractPostNo`, `hasPhotoAttachment`, `parseRows`)만 검증함(실모듈 테스트는 Test 8부터 시작).
  - Test 4의 `catch (e)`가 `AssertionError`까지 삼키며, `dc_sample.html` 존재 확인(`L270, L908`)이 실행 CWD에 의존함.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // Tests 1~7을 src/parser/post_navigator.js 실제 export 호출(경량 DOM 목업)로 전환하고,
  // catch에서 ENOENT만 스킵하며 path.join(__dirname, '..', 'dc_sample.html') 사용
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)

### [REFACTOR-15] `post_navigator.js`·`showNoPhotoNotice()`·`startAutoOpenPolling()` 복잡도/방어 코드 개선 및 탐색 컨트롤러 분리
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`src/parser/post_navigator.js#L81-L248`](../../../src/parser/post_navigator.js#L81-L248), [`src/ui/overlay.js#L270-L359`](../../../src/ui/overlay.js#L270-L359), [`src/controller/viewer_controller.js#L186-L246`](../../../src/controller/viewer_controller.js#L186-L246), [`#L504-L537`](../../../src/controller/viewer_controller.js#L504-L537)
- **위반 규칙**: 방어 코드 / 함수 길이(30줄)·중첩 깊이(3-depth) / 컨트롤러 SRP 분리
- **발견된 문제**:
  - `post_navigator.js#L167-L171`: `anyImgIcon.className`에 `typeof === 'string'` 가드가 없어 SVG(`SVGAnimatedString`)일 때 `TypeError` 위험, `L81/108/136/151` `textContent` null 가드 및 `direction` 유효성 검증 누락, `hasPhotoAttachment`(31줄)·`getAdjacentPostUrl`(61줄·3-depth·중복 `hasPhotoAttachment`/제목 셀렉터 조회) 초과.
  - `overlay.js#L270-L359`: `showNoPhotoNotice`(90줄·3-depth)에 `typeof onNavigatePost === 'function'`, `window`/`document.body` null 가드 및 타이머 `fired` 가드 누락.
  - `viewer_controller.js`: `navigatePost`/`startAutoOpenPolling`(34줄·4-depth)을 전용 탐색 하위 컨트롤러(예: `post_nav_controller.js`)로 분리 필요(`viewer_controller.js` re-export 호환 유지).
- **권장 개선안 (Suggested Diff)**:
  ```text
  // 1. post_navigator.js: getElementClassName() 헬퍼 + findTargetPostIndex()/selectAdjacentTarget() 추출로 30줄 이하 평탄화
  // 2. overlay.js: showNoPhotoNotice 내부 핸들러/마크업/타이머 가드 분리
  // 3. src/controller/post_nav_controller.js 분리 및 viewer_controller.js re-export 유지
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)
