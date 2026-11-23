# 🧪 [viewer-immersion] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`1건 OPEN DEFECT` — `DEFECT-01~02` 해결 완료, `DEFECT-03` 잔여 · 감사 티켓 `REFACTOR-01~03` 완료)
- **인수 조건 통과율**: `13 / 15 Scenarios PASS (87%)` (`DEFECT-01~02` 해결, `DEFECT-03` OPEN)
- **미해결 티켓**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (유휴 자동 숨김 및 복원)**:
  - **Given** 뷰어가 활성화되어 있고 `state.autoHideUi`가 `true`일 때,
  - **When** 2.5초(`CONFIG.UI_IDLE_TIMEOUT`) 동안 마우스 이동 및 키 입력이 없으면,
  - **Then** 오버레이에 `.disagall-idle`이 적용되어 헤더, 푸터, 내비게이션 버튼이 숨겨지고 커서가 감춰지며, 마우스 이동 시 즉시 복귀한다.
- **AC-02 (수동 UI 토글 단축키 `H`)**:
  - **Given** 뷰어가 활성화되어 있을 때,
  - **When** 사용자가 키보드 `H` 또는 `h`를 누르면,
  - **Then** 타이머 대기 시간과 무관하게 즉시 UI 표시 여부가 토글(`showUi` / `hideUi`)된다.
- **AC-03 (브라우저 전체화면 단축키 `F`)**:
  - **Given** 뷰어가 활성화되어 있을 때,
  - **When** 사용자가 키보드 `F` 또는 `f`를 누르면,
  - **Then** 브라우저 전체화면 API(`requestFullscreen` / `exitFullscreen`)가 호출되어 화면이 전체화면으로 전환/해제된다.
- **AC-04 (설정창 토글 및 스토리지 연동)**:
  - **Given** 사용자가 확장 프로그램 팝업(`popup.html`)을 열었을 때,
  - **When** `몰입 모드 (UI 자동 숨김)` 토글 스위치를 변경하면,
  - **Then** `chrome.storage.sync`에 `autoHideUi` 값이 즉시 저장되고 뷰어 동작에 반영된다.
- **AC-05 (UI 숨김 시 사진 영역 확장 및 줌 보호)**:
  - **Given** 뷰어가 활성화되고 이미지(`1.0x`)가 로드된 상태에서,
  - **When** 자동 유휴(`.disagall-idle`) 또는 수동(`H`, `.disagall-ui-hidden`)으로 UI가 숨겨지면,
  - **Then** 헤더·푸터 높이를 제외한 여백(`state.currentPadding`)만 유지한 채 이미지 `maxWidth`/`maxHeight`와 `.disagall-stage` 상하 패딩이 확장·중앙 정렬되고, UI 복원 시 원상 복구된다. 단, `state.zoom.scale > 1.001` 확대 중에는 크기를 고정했다가 `1.0x` 복귀 시 즉시 동기화한다.
- **AC-06 (전체화면 모드 버튼·여백 0px·자동 전체화면 및 폴백)**:
  - **Given** 뷰어가 활성화되어 있거나 팝업에서 `뷰어 열 때 자동 전체화면`(`autoFullscreen`)이 켜져 있을 때,
  - **When** 헤더 `#disagall-btn-fullscreen` 클릭·`F` 키로 전체화면에 진입하거나 `autoFullscreen === true` 상태로 뷰어를 열면,
  - **Then** OS 전체화면 진입 시(및 `requestFullscreen` 차단 시 폴백으로) `state.currentPadding` 저장값을 훼손하지 않고 임시 여백 `0px` + UI 즉시 숨김을 적용하며, `fullscreenchange`/`ESC`/`F`/버튼 해제로 종료 시 원래 여백과 UI로 복원된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 마우스 2.5초 미조작 시 UI 및 커서 자동 페이드아웃 후 마우스 이동 시 즉시 복원 | `AC-01` | `✅ PASS` | Chrome 157 CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`2500ms` 후 `.disagall-idle`, `opacity:0`/`cursor:none`, `mousemove` 즉시 복귀; [`tc-hp-01-idle-hidden.png`](./evidence/tc-hp-01-idle-hidden.png)) |
| `TC-HP-02` | Happy | 단축키 `H`를 누를 때마다 UI 즉시 숨김/표시 토글 | `AC-02` | `PASS (Fixed in DEFECT-02)` | [`DEFECT-02`](#defect-02-pointer-events-none-%EC%A0%84%ED%99%98-%EC%8B%9C-disagall-header-mouseleave%EA%B0%80-ui-%EC%88%A8%EA%B9%80%EC%9D%84-%EC%A6%89%EC%8B%9C-%EC%B7%A8%EC%86%8C) (헤더 위 `H` 입력·합성 `mouseleave` 방어 확인) |
| `TC-HP-03` | Happy | 단축키 `F`를 눌러 브라우저 전체화면 전환 및 해제 | `AC-03` | `✅ PASS` | Chrome 157 CDP `requestFullscreen` 호출/안전예외 처리 + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) `fullscreenElement` 진입·해제 검증 ([`happy-path-qa.log`](./evidence/happy-path-qa.log)) |
| `TC-HP-04` | Happy | 팝업 토글 변경 시 스토리지 저장 및 `autoHideUi === false` 시 자동 숨김 방지 | `AC-04` | `FAIL` | [`DEFECT-03`](#defect-03-chromestoragesync-%EC%84%A4%EC%A0%95-%EB%8F%99%EA%B8%B0%ED%99%94-%EB%8B%A8%EC%A0%88defaultpadding-%EB%B0%8F-%EB%B9%84%EB%8F%99%EA%B8%B0-%EC%B4%88%EA%B8%B0%ED%99%94-%EB%A0%88%EC%9D%B4%EC%8A%A4) (`defaultPadding` live sync 누락) |
| `TC-BD-01` | Boundary | 패딩 슬라이더 드래그 중이거나 헤더 호버 중 2.5초 경과 시 숨김 유예 | `AC-01` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`header` 호버·`#disagall-slider` 드래그 중 2.7s `opacity:1` 유예, 이탈 후 2.95s 숨김 확인; [`tc-bd-01-slider-deferred.png`](./evidence/tc-bd-01-slider-deferred.png)) |
| `TC-BD-02` | Boundary | 사진 확대(Zoom > 1.0) 후 드래그 팬(Pan) 조작 중 마우스 커서 정상 유지 | `AC-01` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (200% 팬 드래그 중 2.7s 숨김 유예 및 `.disagall-ui-hidden` 상태 `:not([style*="grabbing"])` `grabbing` 커서 보존 확인; [`tc-bd-02-zoom-pan-dragging.png`](./evidence/tc-bd-02-zoom-pan-dragging.png)) |
| `TC-NG-01` | Negative | 뷰어 비활성(`!active`) 상태에서 마우스 이동 또는 H/F 키 입력 시 오동작 방지 | `AC-02` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`!active` `mousemove`/H/F 무시, `INPUT`/`TEXTAREA`/`contentEditable`/조합키/외부 `<dialog open>` 차단 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |
| `TC-NG-02` | Negative | 뷰어 닫기(`closeViewer`) 시 타이머 미해제로 인한 백그라운드 콜백 발생 방지 | `AC-01` | `PASS (Fixed in DEFECT-01)` | [`DEFECT-01`](#defect-01-requestfullscreen--exitfullscreen-promise-vs-closevieweropenviewer-%EB%A0%88%EC%9D%B4%EC%8A%A4) (`closeViewer`/`openViewer` 세대 토큰 격리 및 고아 OS 전체화면 즉시 해제) |
| `TC-HP-05` | Happy | UI 자동/수동 숨김 시 헤더·푸터 높이를 회수해 이미지 크기·스테이지 패딩 확장 및 복원 시 축소 | `AC-05` | `✅ PASS` | [`immersion.test.js`](../../../tests/immersion.test.js) (Test 20) + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`662px`→`752px` 확장, `paddingTop/Bottom: 0px`, `←`/`→` 숨김 연속 탐색 확장 및 복원 검증) |
| `TC-BD-03` | Boundary | 사용자 여백 `0px` 설정 시 UI 표시 중 겹침 방지 및 숨김 시 풀블리드(`window.innerHeight`) 확장 | `AC-05` | `✅ PASS` | [`immersion.test.js`](../../../tests/immersion.test.js) (Test 20) + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`padding=0` 표시 `710px` / `stage.paddingTop=52px`·`Bottom=38px` 비겹침, 숨김 `800px` 풀블리드 검증) |
| `TC-BD-04` | Boundary | `scale > 1.0` 확대 중 UI 숨김/복원 시 이미지 크기 고정 및 `1.0x` 복귀 시 즉시 리피팅 동기화 | `AC-05` | `✅ PASS` | [`immersion.test.js`](../../../tests/immersion.test.js) (Test 21) + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`2.0x` 확대 중 `H`/유휴 숨김 시 `662px` 고정, `resetZoom`/휠·더블클릭 `1.0x` 복귀 시 `752px` 즉시 동기화 검증) |
| `TC-HP-06` | Happy | 헤더 전체화면 버튼(`#disagall-btn-fullscreen`)·`F` 전환 및 `fullscreenchange` 해제 시 여백 `0px`↔원래 여백/UI 동기화 | `AC-06` | `PASS (Fixed in DEFECT-02)` | [`DEFECT-02`](#defect-02-pointer-events-none-%EC%A0%84%ED%99%98-%EC%8B%9C-disagall-header-mouseleave%EA%B0%80-ui-%EC%88%A8%EA%B9%80%EC%9D%84-%EC%A6%89%EC%8B%9C-%EC%B7%A8%EC%86%8C) (버튼 클릭 직후 합성 `mouseleave` 유지 검증) |
| `TC-BD-05` | Boundary | 팝업 `autoFullscreen` 토글 연동 및 `openViewer` 시 OS 전체화면 진입(허용 시) · `0px`+UI숨김 폴백(거부 시) | `AC-06` | `FAIL` | [`DEFECT-03`](#defect-03-chromestoragesync-%EC%84%A4%EC%A0%95-%EB%8F%99%EA%B8%B0%ED%99%94-%EB%8B%A8%EC%A0%88defaultpadding-%EB%B0%8F-%EB%B9%84%EB%8F%99%EA%B8%B0-%EC%B4%88%EA%B8%B0%ED%99%94-%EB%A0%88%EC%9D%B4%EC%8A%A4) (`autoFullscreen` 초기화 동기화 누락) |
| `TC-NG-03` | Negative | 전체화면 진입·해제 반복 및 `closeViewer` 호출 시 사용자 저장 여백(`state.currentPadding`) 훼손 방지 | `AC-06` | `✅ PASS` | [`immersion.test.js`](../../../tests/immersion.test.js) (Test 24~25) + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`defaultPadding=44` 보존 및 해제 후 `622px` 복원·`closeViewer` 정리 검증) |
| `TC-BD-06` | Boundary | 한글 IME(`key='ㄹ'`, `code='KeyF'`) 및 패딩 슬라이더(`type="range"`) 포커스 상태에서 `F` 전체화면 토글 검증 | `AC-06` | `✅ PASS` | [`immersion.test.js`](../../../tests/immersion.test.js) (Test 26) + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (한글 IME `KeyF`/`KeyH`·슬라이더 포커스 통과·텍스트 `<input>` 차단 유지·수동 `F` 폴백 토글 검증) |

---

## 🚨 3. 결함 리포트 (Defect Logs - by `deep-bug-hunter`)

### [DEFECT-01] `requestFullscreen()` / `exitFullscreen()` Promise vs `closeViewer()`/`openViewer()` 레이스
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🔴 P0 Critical | [`src/controller/immersion_controller.js#L136-L397`](../../../src/controller/immersion_controller.js#L136-L397), [`src/controller/viewer_controller.js#L357-L393`](../../../src/controller/viewer_controller.js#L357-L393)
- **원인 및 실증**: `requestFullscreen()` 대기 중 `closeViewer()` 호출 시 아직 `fullscreenElement`가 `null`이라 `exitFullscreenSafely()`가 무반응 종료된 뒤, Promise resolve 시 `.active`가 제거된(`visibility: hidden`) 오버레이가 OS 전체화면으로 진입해 검은 화면에 갇힘(`Empirical Probe Reproduced`: `overlayActive: false`, `fullscreenElementIsOverlay: true`). 또한 `closeViewer()`➔`openViewer()` 재오픈 또는 `toggleFullscreen()` 연타 시 이전 세션의 지연된 `requestFullscreen`/`exitFullscreen` resolve/reject 및 `fullscreenchange`가 새 세션의 `isFullscreenMode`/UI/토스트를 덮어씀(`tests/immersion.test.js` Test 27 Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js#L10-L433), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L357-L374), [`tests/immersion.test.js`](../../../tests/immersion.test.js#L1346-L1570), [`tests/immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js#L750-L767)
  - **원인 및 조치**: Competing Hypotheses(`Tracer A/B`) 및 Devil's Advocate 교차 검증을 반영해 물리적 in-flight 추적(`inFlightRequestSeq`, `inFlightExitSeq`, `asyncPendingRequestCount`)과 세션 의도(`fullscreenTransitionSeq` 단조 증가, `osFullscreenWanted`, `hasObservedOsFullscreen`)를 분리함. `resetFullscreenState()` 및 `openViewer()`(`!wasActive`)에서 세대 토큰을 무효화하고, `!isOverlayActive() && isOverlayFullscreenElement()` 또는 구 세션 지연 resolve 감지 시 즉시 `exitFullscreenSafely()`로 고아 OS 전체화면을 해제함. `fullscreenerror`/`webkitfullscreenerror` 리스너 추가, `exitFullscreenSafely()` 실패 정리, `toggleFullscreen()` 연타 가드 적용 후 `npm run build`로 `content.js`/`disagall_viewer.user.js`를 동기화함.
  - **회귀 테스트 결과**: `node tests/immersion.test.js` (`27/27 PASS`), `npm test` (`5개 스위트 전량 PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-02] `pointer-events: none` 전환 시 `.disagall-header` `mouseleave`가 UI 숨김을 즉시 취소
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/immersion_controller.js#L532-L547`](../../../src/controller/immersion_controller.js#L532-L547), [`content.css#L541-L550`](../../../content.css#L541-L550)
- **원인 및 실증**: 헤더 버튼 클릭이나 헤더 위 `H` 입력으로 `hideUi(true)`가 `.disagall-ui-hidden`(`pointer-events: none`)을 적용하면 `mouseleave`가 발생하고 `resetIdleTimer()`가 `state.isUiHidden`을 무시하고 `showUi()`를 호출함(`tests/immersion.test.js` Test 28 및 `tests/immersion_e2e.test.js` `TC-HP-02` Red 재현 확인).
- **해결 내역**:
  - **수정 파일**: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js#L540-L546), [`tests/immersion.test.js`](../../../tests/immersion.test.js#L1569-L1656), [`tests/immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js#L455-L462), [`tests/immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js#L914-L926)
  - **원인 및 조치**: `bindHeaderHoverEvents()`의 `mouseleave` 핸들러에서 `isHeaderHovered = false`는 정확히 해제하되, `!isOverlayActive() || isAnyUiHiddenClass(overlayEl)`인 경우 조기 반환하여 `pointer-events: none`으로 유발된 합성 `mouseleave`가 `resetIdleTimer()`/`showUi()`를 호출하지 않도록 차단함. `npm run build`로 `content.js`/`disagall_viewer.user.js` 번들을 동기화함.
  - **회귀 테스트 결과**: `node tests/immersion.test.js` (`28/28 PASS`), `npm test` (`5개 스위트 전량 PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)

### [DEFECT-03] `chrome.storage.sync` 설정 동기화 단절(`defaultPadding`) 및 비동기 초기화 레이스
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/immersion_controller.js#L328-L345`](../../../src/controller/immersion_controller.js#L328-L345), [`#L370-L380`](../../../src/controller/immersion_controller.js#L370-L380), [`src/extension.js#L10-L21`](../../../src/extension.js#L10-L21)
- **원인 및 실증**: `onChanged` 리스너가 `defaultPadding` 변경을 무시하고, 비동기 `storage.sync.get` 응답 전에 뷰어가 먼저 열리면 `defaultPadding` 리피팅 및 `autoFullscreen` 진입이 누락됨(`Deterministic Trace Verified`).
- **최소 수정 설계**: `onChanged`와 초기 `defaultPadding`/`autoFullscreen` 콜백에서 슬라이더·`applyFittingAndPadding()`·`enterAutoFullscreenOnOpen()` 동기화.

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs - by `clean-code-auditor`)

### [REFACTOR-01] `keydown` 및 비종료 `click` 입력 시 유휴 타이머 리셋·복원 누락 (Spec Drift)
- **현재 상태**: 🟢 RESOLVED — 사용자 컨펌([`ADR-04`](./decisions.md))으로 마우스 이동(`mousemove`) 외 키보드·클릭 입력 시 숨김 상태 유지를 의도된 스펙으로 확정하고 `spec.md` 역갱신 완료.

### [REFACTOR-02] `viewer_controller.js` 단일 파일 630줄·함수 길이 초과 및 슬라이더 스토리지 쓰기 디바운스/빈 `catch` 정리
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **해결 내역**:
  - **수정 파일**: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js), [`tests/immersion.test.js`](../../../tests/immersion.test.js)
  - **원인 및 조치**: 몰입 모드 타이머·가드·전체화면·스토리지 동기화 책임을 `src/controller/immersion_controller.js`(279줄)로 분리하고 `viewer_controller.js`에 하위 호환 re-export를 유지했으며, `createOverlay`·`bindImmersionEvents`·`initViewerBase`·`initImmersionSettings` 등을 30줄 이하·2-depth 이내 Guard Clause 헬퍼로 분할함. 패딩 슬라이더(`#disagall-slider`) 저장을 250ms 디바운스(`input`) + `change` 즉시 커밋 + `closeViewer()` flush/해제로 최적화하고, 빈 `catch` 3곳에 비치명적 방어 주석을 보강함(`ADR-04` 숨김 유지 정책 준수).
  - **회귀 테스트 결과**: `npm test` (19개 immersion 테스트 포함 4개 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`8/8 PASS`), `npm run build` (`PASS`)

### [REFACTOR-03] `popup.js` `initPopup` 복잡도(58줄·4-depth 중첩), `onChanged` 타입 가드 누락 및 슬라이더 쓰기 디바운스 미적용
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **해결 내역**:
  - **수정 파일**: [`popup.js`](../../../popup.js#L13-L220), [`tests/immersion.test.js`](../../../tests/immersion.test.js#L123-L300)
  - **원인 및 조치**: `initPopup`과 `chrome.storage.onChanged` 4-depth 인라인 로직을 `applyInitialSettings`, `bindPopupSlider`, `bindPopupToggle`, `handleStorageChange`, `bindStorageSync` 등 단일 책임 헬퍼(≤ 27줄, Early Return 기반 ≤ 2-depth)로 분할함. `onChanged` 및 `loadSettings`/`savePadding`에 `typeof === 'boolean'`/`'number'`·`!Number.isNaN` 가드를 추가해 키 삭제(`newValue === undefined`) 시 `'undefinedpx'` 오염을 차단했고, 패딩 슬라이더 `input`은 250ms 디바운스(`PADDING_SAVE_DEBOUNCE_MS`) + `change` 즉시 커밋 + `parseInt` `NaN` 가드로 `00_core_foundation` §3을 준수하도록 리팩토링함.
  - **회귀 테스트 결과**: `node --check popup.js && node --check tests/immersion.test.js` (`PASS`), `npm test` (19개 immersion 테스트 포함 4개 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`8/8 PASS`), `npm run build` (`PASS`)
