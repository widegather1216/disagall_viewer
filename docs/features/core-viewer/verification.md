# 🧪 [core-viewer] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`0건 OPEN DEFECT` · `🧐 1건 OPEN REFACTOR` — 2026-11-25 전수 클린코드 감사)
- **인수 조건 통과율**: `9 / 9 Scenarios PASS (100%)`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 1건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (우클릭 컨텍스트 메뉴 및 뷰어 오픈)**:
  - **Given** 사용자가 디시인사이드 게시글 본문 사진 위에서 우클릭할 때,
  - **When** "📷 디시 사진 뷰어로 화면 맞춤 보기" 메뉴를 클릭하면,
  - **Then** 클릭한 사진이 기본 선택된 상태로 뷰어 오버레이가 열리고 배경 스크롤이 차단된다.
- **AC-02 (비율 맞춤 피팅 및 패딩 조절)**:
  - **Given** 뷰어가 활성화되어 이미지가 렌더링될 때,
  - **When** 원본 이미지의 가로/세로 비율과 현재 패딩 슬라이더 값을 대입하면,
  - **Then** 잘림 없이 가용 화면에 최대 크기로 맞춤 렌더링되며, 슬라이더 변경 시 실시간 반영 및 저장된다.
- **AC-03 (마우스 휠 줌 및 드래그 팬)**:
  - **Given** 사진이 뷰어에 표시되어 있을 때,
  - **When** 마우스 휠을 굴려 1.0x~5.0x로 확대하고 마우스 좌클릭으로 드래그하면,
  - **Then** RAF 기반으로 부드럽게 확대 및 이동되며 뱃지에 확대 퍼센트가 표시된다.
- **AC-04 (사진 넘기기 및 순환 탐색)**:
  - **Given** 게시글에 2장 이상의 사진이 있을 때,
  - **When** 좌우 화살표 버튼 또는 키보드 `←`/`→`(A/D)를 누르면,
  - **Then** 이전/다음 사진으로 순환 전환되며 상단 카운터가 업데이트된다.
- **AC-05 (뷰어 닫기 및 상태 복원)**:
  - **Given** 뷰어가 열려 있을 때,
  - **When** 닫기 버튼 클릭, 배경 빈 영역 클릭, 또는 `ESC` 키를 누르면,
  - **Then** 뷰어가 닫히고 `document.body.style.overflow`가 이전 값으로 완벽히 복원된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 우클릭 메뉴로 정확한 클릭 위치 사진 뷰어 즉시 활성화 | `AC-01` | `PASS (Fixed in DEFECT-04)` | [`DEFECT-04`](#defect-04-bindcontextmenutracker-%EC%A7%80%EC%97%B0-%EB%A1%9C%EB%94%A9-%EC%9D%B4%EB%AF%B8%EC%A7%80-url-%EC%A0%80%EC%9E%A5%EC%9C%BC%EB%A1%9C-%EC%9A%B0%ED%81%B4%EB%A6%AD-%EB%8C%80%EC%83%81-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%A7%A4%EC%B9%AD-%EC%8B%A4%ED%8C%A8) |
| `TC-HP-02` | Happy | 가로/세로 사진 화면 맞춤 렌더링 및 패딩 슬라이더 0~100px 실시간 반영 | `AC-02` | `PASS` | - |
| `TC-HP-03` | Happy | 마우스 휠 1.0x~5.0x 확대, 더블클릭 2.0x 토글, 드래그 팬 동작 | `AC-03` | `PASS (Fixed in DEFECT-03)` | [`DEFECT-03`](#defect-03-%EC%A4%8C-%EC%83%81%ED%83%9C-%EC%9D%B4%EB%AF%B8%EC%A7%80-%EB%B0%96-%EB%93%9C%EB%9E%98%EA%B7%B8-%EC%A2%85%EB%A3%8C-%EC%8B%9C-%EB%B0%B1%EB%93%9C%EB%A1%AD-%ED%81%B4%EB%A6%AD-%EC%98%A4%EC%9D%B8-%EB%B7%B0%EC%96%B4-%EB%8B%AB%ED%9E%98) |
| `TC-HP-04` | Happy | 방향키 `←`/`→` 사진 이동 및 카운터 동기화 | `AC-04` | `PASS (Fixed in DEFECT-02)` | [`DEFECT-02`](#defect-02-showimage-%EB%B9%84%EB%8F%99%EA%B8%B0-tempimg-%EC%8A%A4%ED%85%8C%EC%9D%BC-%EC%BD%9C%EB%B0%B1-%EB%8D%AE%EC%96%B4%EC%93%B0%EA%B8%B0-%EB%B0%8F-onerror-%ED%8F%B4%EB%B0%B1-%ED%94%BC%ED%8C%85-%EB%88%84%EB%9D%BD) |
| `TC-HP-05` | Happy | `ESC` 및 배경 클릭 시 뷰어 닫힘 및 바디 스크롤 복원 | `AC-05` | `PASS (Fixed in DEFECT-01)` | [`DEFECT-01`](#defect-01-userscript-%EC%BA%A1%EC%B2%98-click-%EC%9E%90%EA%B0%80-%EC%9E%AC%EC%A7%84%EC%9E%85-%EB%B0%8F-openviewer-%EC%A4%91%EB%B3%B5-%ED%98%B8%EC%B6%9C-%EC%8B%9C-%EC%8A%A4%ED%81%AC%EB%A1%A4-%EC%98%81%EA%B5%AC-%EC%9E%A0%EA%B8%88) |
| `TC-BD-01` | Boundary | 본문 사진 1장 이하일 때 좌우 내비게이션 버튼 `.disabled` 비활성화 | `AC-04` | `PASS` | - |
| `TC-BD-02` | Boundary | 지연 로딩(`data-original`) 사진 사전 강제 로드 및 다운스케일 쿼리 제거 | `AC-01` | `PASS (Fixed in DEFECT-04)` | [`DEFECT-04`](#defect-04-bindcontextmenutracker-%EC%A7%80%EC%97%B0-%EB%A1%9C%EB%94%A9-%EC%9D%B4%EB%AF%B8%EC%A7%80-url-%EC%A0%80%EC%9E%A5%EC%9C%BC%EB%A1%9C-%EC%9A%B0%ED%81%B4%EB%A6%AD-%EB%8C%80%EC%83%81-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%A7%A4%EC%B9%AD-%EC%8B%A4%ED%8C%A8) |
| `TC-NG-01` | Negative | 본문 사진 0장일 때 조기 리턴 및 알림 표시 | `AC-01` | `PASS` | - |
| `TC-NG-02` | Negative | 댓글창 디시콘, 사이드바 배너 등 비본문 이미지 오탐 배제 | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] Userscript 캡처 `click` 자가 재진입 및 `openViewer()` 중복 호출 시 스크롤 영구 잠금
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🔴 P0 Critical | [`src/userscript.js#L65-L76`](../../../src/userscript.js#L65-L76), [`src/parser/image_parser.js#L3-L27`](../../../src/parser/image_parser.js#L3-L27), [`src/controller/viewer_controller.js#L385-L390`](../../../src/controller/viewer_controller.js#L385-L390)
- **원인 및 실증**: `#disagall-viewer-overlay`가 `EXCLUDED_CONTAINER_SELECTORS`에 없어 Userscript 캡처 리스너가 `#disagall-main-img` 클릭·더블클릭·드래그 종료 시 `openViewer()`를 재호출함(또한 non-Element `e.target.closest` 시 `TypeError`). `openViewer()`가 활성 가드 없이 `state.previousBodyOverflow`를 `'hidden'`으로 덮어써 `closeViewer()` 후에도 스크롤이 영구 잠금됨(`Empirical Probe Reproduced`: `bodyOverflowAfterClose === 'hidden'`).
- **해결 내역**:
  - **수정 파일**: [`src/parser/image_parser.js`](../../../src/parser/image_parser.js#L26), [`src/userscript.js`](../../../src/userscript.js#L65-L76), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L385-L390), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js)
  - **원인 및 조치**: `EXCLUDED_CONTAINER_SELECTORS`에 `#disagall-viewer-overlay`를 추가해 뷰어 이미지 오탐을 차단하고, `userscript.js` 캡처 `click` 리스너에 `isOverlayActive()`·`typeof target.closest !== 'function'`·`#disagall-viewer-overlay` 내부 클릭 차단 가드를 적용(Devil's Advocate 교차 검증 완료). `openViewer()`에서 `!isOverlayActive()`일 때만 `state.previousBodyOverflow`를 백업하도록 수정하고 `npm run build`로 `content.js`/`disagall_viewer.user.js` 동기화.
  - **회귀 테스트 결과**: `npm test` (`tests/core_viewer.test.js` 3/3 포함 전 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`)

### [DEFECT-02] `showImage()` 비동기 `tempImg` 스테일 콜백 덮어쓰기 및 `onerror` 폴백 피팅 누락
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L60-L167`](../../../src/controller/viewer_controller.js#L60-L167), [`src/ui/overlay.js#L140-L143`](../../../src/ui/overlay.js#L140-L143)
- **원인 및 실증**: `tempImg.onload`/`onerror`에 세대 토큰 및 `isOverlayActive()` 검증이 없어 느린 이전 이미지가 현재 `mainImgEl.src`를 덮어씀(`Empirical Probe Reproduced`: `counter: '2 / 2'`, `src: ...&no=abc`). 또한 `onerror` 폴백 URL이 미캐시 상태일 때 `naturalWidth === 0`으로 `applyFittingAndPadding()`이 조기 반환되어 리피팅이 누락됨.
- **해결 내역**:
  - **수정 파일**: [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L60-L167), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js#L430-L638)
  - **원인 및 조치**: Devil's Advocate 교차 검증(`WeakSet` 기반 단일 리스너 등록 및 `null` 요소 가드 포함)을 거쳐 `imageLoadSeq`/`renderedLoadSeq` 세대 토큰과 `isOverlayActive()` 가드를 `showImage()`/`renderViewerImage()`/`closeViewer()`에 적용하여 빠른 탐색·닫기·재오픈 시 스테일 `tempImg` 콜백을 폐기함. 또한 `ensureMainImgLoadListener()`로 `mainImgEl` `load` 이벤트를 바인딩해 미캐시 폴백 로드 완료 후(`renderedLoadSeq === imageLoadSeq && isOverlayActive() && state.zoom.scale <= 1.001`) `applyFittingAndPadding()`을 재실행하고 `npm run build`로 번들(`content.js`, `disagall_viewer.user.js`)을 동기화함.
  - **회귀 테스트 결과**: `node tests/core_viewer.test.js` (`5/5 PASS`), `npm test` (`PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-03] 줌 상태 이미지 밖 드래그 종료 시 백드롭 클릭 오인 뷰어 닫힘
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/state.js#L40-L51`](../../../src/state.js#L40-L51), [`src/ui/zoom_pan.js#L5-L136`](../../../src/ui/zoom_pan.js#L5-L136), [`src/controller/viewer_controller.js#L334-L341`](../../../src/controller/viewer_controller.js#L334-L341)
- **원인 및 실증**: `scale > 1.0` 상태에서 `mainImgEl` 위 `mousedown` 후 이미지 밖(`#disagall-img-wrapper`/`#disagall-stage`/`#disagall-viewer-overlay`)에서 `mouseup`하면 공통 조상에 `click`이 발생해 `bindOverlayBackdrop()`이 뷰어를 닫음(`Red` 테스트 재현: `overlay.classList.contains('active') === false`).
- **해결 내역**:
  - **수정 파일**: [`src/state.js`](../../../src/state.js#L40-L51), [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js#L5-L136), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L21-L341), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js#L653-L820)
  - **원인 및 조치**: Devil's Advocate 교차 검증(우클릭 `button: 2` 간섭 및 드래그 중 `navigate()` `resetZoom()` 반례 포함)을 반영하여, `state.zoom`에 `suppressNextBackdropClick`/`suppressClickTimer`/`pendingDragRelease`를 추가하고 `onWindowMouseUp(e)`(좌클릭 `button === 0` 가드)에서 1회 백드롭 클릭 억제 및 `setTimeout(..., 0)` 폴백 만료 타이머를 등록함. `bindOverlayBackdrop()` 최상단 `consumeSuppressedBackdropClick()`으로 드래그 직후 오인 닫힘만 차단하고 `resetZoom(true)`/`closeViewer()`로 타이머·리스너 수명주기를 정리한 뒤 `npm run build`로 `content.js`/`disagall_viewer.user.js`를 동기화함.
  - **회귀 테스트 결과**: `node tests/core_viewer.test.js` (`6/6 PASS`), `npm test` (`PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-04] `bindContextMenuTracker()` 지연 로딩 이미지 URL 저장으로 우클릭 대상 인덱스 매칭 실패
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L363-L378`](../../../src/controller/viewer_controller.js#L363-L378), [`src/controller/viewer_controller.js#L470-L479`](../../../src/controller/viewer_controller.js#L470-L479)
- **원인 및 실증**: `bindContextMenuTracker()`가 `getBestImgUrl(target)` 대신 `getCleanOriginalUrl(target.src)`를 저장해 미로딩 이미지(`gallview_loading_ori.gif`, `blank.gif`) 우클릭 시 `state.lastRightClickedImgSrc`에 플레이스홀더 URL이 저장되었고, 또한 Chrome 컨텍스트 메뉴가 `info.srcUrl`로 플레이스홀더 `src`를 전달할 경우 `findTargetImageIndex(targetSrc)`가 `state.lastRightClickedImgSrc`로 폴백하지 않아 항상 `0`번 인덱스를 열었음(`Red` 테스트 재현: `lastRightClickedImgSrc === '...gallview_loading_ori.gif'`).
- **해결 내역**:
  - **수정 파일**: [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L4-L479), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js#L841-L960)
  - **원인 및 조치**: `bindContextMenuTracker()`에서 `getBestImgUrl(target)`을 사용해 지연 로딩 원본 URL(`data-original`/`data-src`/`data-url`/`data-lazy-src`) 및 다운스케일 파라미터 제거 결과를 저장하도록 수정하고, `findTargetImageIndex(targetSrc)`를 `findImageIndexByUrl()` 헬퍼로 정리해 전달된 `targetSrc`가 `state.postImages`에 매칭되지 않을 때(예: Chrome `info.srcUrl` 플레이스홀더) `state.lastRightClickedImgSrc`로 폴백하도록 보완함. 이후 `npm run build`로 `content.js`/`disagall_viewer.user.js`를 동기화함.
  - **회귀 테스트 결과**: `node tests/core_viewer.test.js` (`7/7 PASS`), `npm test` (`PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

### [REFACTOR-01] `closeViewer()` 동기 스토리지 예외 중단, `resizeRafId`/`updateImgTransform()` `rAF` 누수 및 `!active` 가드 누락
- **심각도**: 🔴 Must Fix (즉시 조치·릴리즈 차단)
- **위치**: [`src/controller/viewer_controller.js#L300-L315`](../../../src/controller/viewer_controller.js#L300-L315), [`#L480-L502`](../../../src/controller/viewer_controller.js#L480-L502), [`#L561-L572`](../../../src/controller/viewer_controller.js#L561-L572), [`src/ui/zoom_pan.js#L50-L76`](../../../src/ui/zoom_pan.js#L50-L76), [`#L97-L149`](../../../src/ui/zoom_pan.js#L97-L149)
- **위반 규칙**: 동시성·리소스 수명주기 제약 (`00_core_foundation/architecture.md` §3) / 방어 코드 / 멱등성
- **발견된 문제**:
  - `persistPaddingSetting()`에 `catch` 블록이 없어 `chrome.storage.sync.set()`이 확장 재로드 등으로 동기 예외를 던지면 `closeViewer()`(`L489`)가 `resetZoom()`·`.active` 제거·스크롤/전체화면 해제를 실행하지 못한 채 중단됨.
  - `closeViewer()`가 `.active` 제거(`L497`) 전에 `resetZoom()`(`L493`)을 호출해 `updateImgTransform()`의 `requestAnimationFrame`이 재예약된 채 해제되지 않음. `updateImgTransform()` 콜백은 `state.zoom.transformRafId = null` 초기화 및 `!active` 가드가 없음.
  - `bindResizeHandler()`의 `resizeRafId`가 클로저 지역 변수로 고립되어 `closeViewer()`에서 취소되지 않으며 `rAF` 콜백 내 `isOverlayActive()` 재검증이 없음. `setupZoomEvents()` 리스너(`wheel`/`mousedown`/`dblclick`)는 `!active` 조기 리턴 및 `WeakSet` 중복 바인딩 가드가 누락됨.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // 1. persistPaddingSetting(): catch 블록 추가 및 closeViewer()에서 overlayEl.classList.remove('active')·transformRafId/resizeRafId 취소를 안전 순서로 보장
  // 2. state.resizeRafId 등록 + closeViewer() cancelAnimationFrame + rAF 콜백 내 isOverlayActive() 체크
  // 3. zoom_pan.js: transformRafId = null 초기화, !isOverlayActive() 가드, WeakSet(boundZoomEls) 중복 바인딩 방어
  ```
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **해결 내역**:
  - **수정 파일**: [`src/state.js`](../../../src/state.js#L31), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L23-L580), [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js#L5-L170), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js#L964-L1115)
  - **원인 및 조치**: `persistPaddingSetting()`에 `catch` 블록을 추가하고 `closeViewer()`에서 `.active` 제거·`body.style.overflow` 복원 후 `cancelResizeRaf()`·`cancelZoomRaf()`로 `state.resizeRafId`/`state.zoom.transformRafId`를 전량 해제함. `zoom_pan.js`에 로컬 `isViewerActive()`·`cancelZoomRaf()`·`WeakSet` 중복 바인딩 가드를 적용하고 `resetZoom()`의 인라인 스타일 동기 초기화 및 `!isViewerActive()` 조기 리턴을 보강한 뒤 `npm run build`로 번들을 동기화함.
  - **회귀 테스트 결과**: `npm run build` (`PASS`), `npm test` (`tests/core_viewer.test.js` 8/8 포함 전 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node --check` (`PASS`)

### [REFACTOR-02] `viewer_controller.js`(610줄)·`overlay.js`(359줄) 책임 분리, `userscript.js` 계층 우회 및 `image_parser.js` 방어·중복 정리
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`src/controller/viewer_controller.js#L1-L610`](../../../src/controller/viewer_controller.js#L1-L610), [`src/ui/overlay.js#L5-L183`](../../../src/ui/overlay.js#L5-L183), [`src/userscript.js#L2-L75`](../../../src/userscript.js#L2-L75), [`src/extension.js#L9-L14`](../../../src/extension.js#L9-L14), [`src/parser/image_parser.js#L48-L189`](../../../src/parser/image_parser.js#L48-L189), [`content.css#L269-L279`](../../../content.css#L269-L279)
- **위반 규칙**: SRP·단방향 레이어 경계 / 함수·파일 길이(30줄·300줄) / 방어 코드 / 중복 로직
- **발견된 문제**:
  - `viewer_controller.js`(610줄)가 이미지 프리로드/오버레이 수명주기·게시글 탐색 폴링·패딩 영속화·단축키를 모두 담당하며 `openViewer`(43줄)·`showImage`(34줄) 초과, `bindOverlayBackdrop` null 가드 및 `bindContextMenuTracker`/`bindResizeHandler`/`bindTestOpenListener` 멱등 가드, `paddingSaveTimer` `state` 이관·`pagehide` flush 누락.
  - `overlay.js`(359줄)의 `buildOverlayHtml`(88줄)·`applyFittingAndPadding`(44줄) 초과 및 `zoom_pan.js#L62-L67`과 orientation/크기 배지 포맷 중복(`content.css#L269-L279` 데드 규칙 및 매직 넘버 정리 포함).
  - `userscript.js`가 `state`/`image_parser` 직접 임포트·셀렉터 중복·`e.repeat`/`SELECT`/`readyState` 가드 및 미추적 `setTimeout` 사용; `extension.js#L10` `message` null 가드 누락.
  - `image_parser.js`: `getCleanOriginalUrl` 상대 URL/스킴(`http:`/`https:`) 미검증(`parentAnchor.href` `javascript:` 차단 누락), `getBestImgUrl` 4-depth 중첩·속성 재조회, `isDcIconOrUiAsset` 36줄 초과, `extractImagesFromElements` `getBestImgUrl` 2회 호출 및 `extractPostImages` 중첩 컨테이너 재탐색.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // 1. viewer_controller.js에서 게시글 탐색/스토리지 영속화 책임을 하위 모듈로 분리(re-export 호환 유지) 및 30줄 초과 함수 분할
  // 2. overlay.js 마크업/피팅 헬퍼 분할 및 formatImageOrientationLabel() 공용화
  // 3. userscript.js controller 경유 위임(이미지 클릭 판별·isOverlayActive·isEditableTarget 재사용) 및 extension.js message 가드
  // 4. image_parser.js URL base/스킴 검증, getBestImgUrl/isDcIconOrUiAsset 평탄화 및 단일 패스 추출
  ```
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **해결 내역**:
  - **수정 파일**: [`src/state.js`](../../../src/state.js#L31), [`src/controller/image_loader.js`](../../../src/controller/image_loader.js), [`src/controller/overlay_bindings.js`](../../../src/controller/overlay_bindings.js), [`src/controller/viewer_shortcuts.js`](../../../src/controller/viewer_shortcuts.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js), [`src/ui/overlay_template.js`](../../../src/ui/overlay_template.js), [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js), [`src/userscript.js`](../../../src/userscript.js), [`src/extension.js`](../../../src/extension.js), [`src/parser/image_parser.js`](../../../src/parser/image_parser.js), [`content.css`](../../../content.css)
  - **원인 및 조치**: `viewer_controller.js`(267줄)에서 이미지 로더(`image_loader.js` 157줄)·단축키(`viewer_shortcuts.js` 83줄)·오버레이 컨트롤 바인딩(`overlay_bindings.js` 79줄)을 분리하고 기존 re-export 호환성 유지, `bindOverlayBackdrop`·`openViewer` null 가드, `contextmenu`/`resize`/`message` 멱등 가드, `state.quickLauncherTimer`·`pagehide` `flushPaddingSave()` 정리를 추가함. `overlay.js`(151줄) 마크업(`overlay_template.js` 116줄) 및 피팅 헬퍼 분할·`formatImageOrientationLabel()` 공용화·`zoom_pan.js`(159줄) `CONFIG.ZOOM_EPSILON`·중복 팬 초기화 제거·`content.css` 데드 규칙 정리를 반영함. `userscript.js`의 `state`/`image_parser` 직접 임포트 제거 및 `extension.js` `message` null 가드를 추가하고, `image_parser.js`(175줄) `http:`/`https:` 스킴·상대 URL·`javascript:` 앵커 차단, 단일 속성 패스·`DC_ICON_URL_SUBSTRINGS`·중첩 컨테이너 제외를 적용한 뒤 `npm run build`로 번들을 동기화함.
  - **회귀 테스트 결과**: `npm run build` (`PASS`), `npm test` (`core_viewer` 8/8 포함 5개 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node --check` (`PASS`)

### [REFACTOR-03] `tests/core_viewer.test.js` 줌 변환·가로 피팅·토스트 타이머 테스트 커버리지 보강 및 위생 정리
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`tests/core_viewer.test.js#L321`](../../../tests/core_viewer.test.js#L321), [`#L380`](../../../tests/core_viewer.test.js#L380), [`#L422-L424`](../../../tests/core_viewer.test.js#L422-L424), [`#L728-L731`](../../../tests/core_viewer.test.js#L728-L731)
- **위반 규칙**: 단위 테스트 실효성 & 커버리지 / 코드 위생
- **발견된 문제**:
  - `global.requestAnimationFrame = () => 1;` no-op 스텁으로 `updateImgTransform()`의 `style.transform`·`panX`/`panY`·상한 `5.0x` 클램핑이 미검증되며, 가로 이미지(`.landscape`, `가로 사진`) 피팅 및 `showViewerToast`/`dismissViewerToast` 타이머 레이스 단위 테스트가 부재함. 미사용 변수(`openCount`, `origSetAttr`, `origSrcDesc`) 잔존.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // rAF 큐 스텁 기반 panX/panY/transform/5.0x 테스트, 가로 이미지 피팅 및 toast 타이머 경합 테스트 추가 + 미사용 변수 제거
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)
