# Verification & Defect Log - Post Navigation

- **검증 상태**: `🩹 Debugging` (`3건 OPEN DEFECT` — `deep-bug-hunter` 실증 등록 · `REFACTOR-05` 1건 유지)
- **미해결 티켓**: `🚨 DEFECT: 3건` | `🧐 REFACTOR: 1건`

---

## 🚨 결함 리포트 (Defect Logs)

### [DEFECT-01] 실 서비스 DC 게시판에서 위/아래 방향키 이동 실패 (현재 글 행 필터링 탈락)
- **현재 상태**: 🟢 RESOLVED — `isCurrentPost` 선행 판별(`crt`/`crt_icon`/`currentPostNo`) 적용 및 `tests/post_navigation.test.js` 라이브/샘플 픽스처 회귀 테스트 `PASS`.

### [DEFECT-02] `showNoPhotoNotice()` `keydown` 리스너 영구 누수 및 입력창/`Cmd+W` 단축키 가로채기
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🔴 P0 Critical | [`src/ui/overlay.js#L198-L249`](../../../src/ui/overlay.js#L198-L249)
- **원인 및 실증**: `closeBtn` 클릭(`#L225`)·중복 호출(`#L200`) 시 `noticeEl.remove()`만 실행하고 `window.removeEventListener('keydown', handleNoticeKey)`와 타이머를 해제하지 않아 리스너가 영구 누수됨. `handleNoticeKey`(`#L227-L240`)에 입력창(`INPUT`/`TEXTAREA`/`isContentEditable`) 및 수정자 키(`ctrlKey`/`metaKey`/`altKey`) 가드가 없어 공지 닫은 후에도 댓글 입력 `w`/`s`나 `Cmd+W`가 `onNavigatePost`로 가로채짐(`Empirical Probe Reproduced`).
- **최소 수정 설계**: `dismissNotice()` 헬퍼로 DOM 제거·타이머 해제·리스너 제거 통합 및 입력창/수정자 키 가드 추가.

### [DEFECT-03] `post_navigator.js` 하단 경계 `'bottom'` 도달 불가, 공지/AD `innerHTML` 우회 및 `javascript:` 통과
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/parser/post_navigator.js#L22-L56`](../../../src/parser/post_navigator.js#L22-L56), [`#L130-L156`](../../../src/parser/post_navigator.js#L130-L156), [`src/controller/viewer_controller.js#L160-L162`](../../../src/controller/viewer_controller.js#L160-L162)
- **원인 및 실증**: `targetIdx = -1` 초기값으로 마지막 행에서 `direction === 'down'` 시 `#L151`에서 `'top'`(`가장 최신 글입니다.`)을 반환해 `'bottom'`(`#L154`)이 dead code임. 또한 `isDesktopPostRowValid()`가 `AD`/`공지`/`설문` 필터 전에 `tr.innerHTML.includes(currentPostNo)`를 평가해 공지/AD 행이 통과하며, `hrefAttr.startsWith('javascript:')`가 `.trim().toLowerCase()`를 누락해 `" JavaScript:alert(1)"`이 통과함(`Empirical Probe Reproduced`).
- **최소 수정 설계**: `targetIdx === -1` 시 `direction` 기반 `'top'`/`'bottom'` 분기, `innerHTML.includes` 제거 및 `AD`/`공지`/`설문` 선행 필터링(모바일 포함), `javascript:` 정규화 차단.

### [DEFECT-04] `navigatePost()` 미취소 `setTimeout` 및 `startAutoOpenPolling()` 고아 `setInterval` 충돌
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L154-L163`](../../../src/controller/viewer_controller.js#L154-L163), [`#L366-L432`](../../../src/controller/viewer_controller.js#L366-L432)
- **원인 및 실증**: `navigatePost()`가 `disagall_auto_open='1'` 기록 후 미추적 `setTimeout(..., 150)`을 예약해 150ms 내 `closeViewer()` 호출 후에도 페이지가 강제 이동함. 또한 `startAutoOpenPolling()`의 지역 `pollTimer`가 수동 `openViewer()`/`closeViewer()` 시 중단되지 않아 닫힌 뷰어를 재오픈하거나 활성 뷰어 인덱스를 `0`으로 리셋함(`Deterministic Trace Verified`).
- **최소 수정 설계**: `postNavTimer` 및 `autoOpenPollTimer`를 모듈/state 스코프에 등록하고 `openViewer()`/`closeViewer()` 시 즉시 해제·`disagall_auto_open` 정리.

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
- **심각도**: 🟢 Nitpick (사소함) | **위치**: [`src/parser/post_navigator.js#L117-L167`](../../../src/parser/post_navigator.js#L117-L167)
- **현재 상태**: 🟡 OPEN (현재 인터페이스 호환성 유지 중)

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
