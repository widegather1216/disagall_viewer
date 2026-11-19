# 🧪 [viewer-immersion] Verification & Ticket Logs

- **검증 상태**: `🧪 QA Testing` (QA 시나리오 `8/8 PASS` 완료; 잔여 보류 티켓 `REFACTOR-02`, `REFACTOR-03` 해결 대기)
- **인수 조건 통과율**: `4 / 4 (100% — 8/8 Scenarios PASS)`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건`

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

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 마우스 2.5초 미조작 시 UI 및 커서 자동 페이드아웃 후 마우스 이동 시 즉시 복원 | `AC-01` | `✅ PASS` | Chrome 157 CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`2500ms` 후 `.disagall-idle`, `opacity:0`/`cursor:none`, `mousemove` 즉시 복귀; [`tc-hp-01-idle-hidden.png`](./evidence/tc-hp-01-idle-hidden.png)) |
| `TC-HP-02` | Happy | 단축키 `H`를 누를 때마다 UI 즉시 숨김/표시 토글 | `AC-02` | `✅ PASS` | Chrome 157 CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`h`/`H` 토글 및 `ADR-04` `←`/`→` 숨김 유지 확인; [`tc-hp-02-manual-hidden.png`](./evidence/tc-hp-02-manual-hidden.png)) |
| `TC-HP-03` | Happy | 단축키 `F`를 눌러 브라우저 전체화면 전환 및 해제 | `AC-03` | `✅ PASS` | Chrome 157 CDP `requestFullscreen` 호출/안전예외 처리 + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) `fullscreenElement` 진입·해제 검증 ([`happy-path-qa.log`](./evidence/happy-path-qa.log)) |
| `TC-HP-04` | Happy | 팝업 토글 변경 시 스토리지 저장 및 `autoHideUi === false` 시 자동 숨김 방지 | `AC-04` | `✅ PASS` | Chrome 157 CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`autoHideUi:false` 저장·2.8초 미숨김·`onChanged` 복원; [`tc-hp-04-popup-toggle.png`](./evidence/tc-hp-04-popup-toggle.png)) |
| `TC-BD-01` | Boundary | 패딩 슬라이더 드래그 중이거나 헤더 호버 중 2.5초 경과 시 숨김 유예 | `AC-01` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`header` 호버·`#disagall-slider` 드래그 중 2.7s `opacity:1` 유예, 이탈 후 2.95s 숨김 확인; [`tc-bd-01-slider-deferred.png`](./evidence/tc-bd-01-slider-deferred.png)) |
| `TC-BD-02` | Boundary | 사진 확대(Zoom > 1.0) 후 드래그 팬(Pan) 조작 중 마우스 커서 정상 유지 | `AC-01` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (200% 팬 드래그 중 2.7s 숨김 유예 및 `.disagall-ui-hidden` 상태 `:not([style*="grabbing"])` `grabbing` 커서 보존 확인; [`tc-bd-02-zoom-pan-dragging.png`](./evidence/tc-bd-02-zoom-pan-dragging.png)) |
| `TC-NG-01` | Negative | 뷰어 비활성(`!active`) 상태에서 마우스 이동 또는 H/F 키 입력 시 오동작 방지 | `AC-02` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`!active` `mousemove`/H/F 무시, `INPUT`/`TEXTAREA`/`contentEditable`/조합키/외부 `<dialog open>` 차단 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |
| `TC-NG-02` | Negative | 뷰어 닫기(`closeViewer`) 시 타이머 미해제로 인한 백그라운드 콜백 발생 방지 | `AC-01` | `✅ PASS` | Chrome CDP + [`immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (Escape/닫기 버튼/배경 클릭·전체화면 중 `closeViewer` 후 2.8s 경과 시 유령 `.disagall-idle` 및 콘솔 에러 0건 확인; [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log)) |

---

## 🚨 3. 결함 리포트 (Defect Logs - by `user-journey-tester`)

*(현재 등록된 결함 없음)*

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs - by `clean-code-auditor`)

### [REFACTOR-01] `keydown` 및 비종료 `click` 입력 시 유휴 타이머 리셋·복원 누락 (Spec Drift)
- **현재 상태**: 🟢 RESOLVED — 사용자 컨펌([`ADR-04`](./decisions.md))으로 마우스 이동(`mousemove`) 외 키보드·클릭 입력 시 숨김 상태 유지를 의도된 스펙으로 확정하고 `spec.md` 역갱신 완료.

### [REFACTOR-02] `viewer_controller.js` 단일 파일 630줄·함수 길이 초과 및 슬라이더 스토리지 쓰기 디바운스/빈 `catch` 정리
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`src/controller/viewer_controller.js#L1-L630`](../../../src/controller/viewer_controller.js#L1-L630) (`createOverlay` L451-L513 [63줄], `bindImmersionEvents` L411-L449 [39줄], `initViewerBase` L590-L630 [41줄], `initImmersionSettings` L311-L341 [31줄], 슬라이더 저장 L496-L500, 빈 `catch` L38·L124·L587)
- **위반 규칙**: Single Responsibility Principle / File Size ≤ 300줄 / Function Length ≤ 30줄 / `00_core_foundation` §3 스토리지 I/O 최소화 / 빈 `catch` 금지
- **발견된 문제**:
  - 단일 컨트롤러 파일이 630줄로 비대해졌으며 뷰어 생명주기·이미지 로딩·몰입 모드 타이머/전체화면·단축키 디스패치가 혼재되어 있습니다.
  - `sliderEl` `input` 핸들러가 드래그 매 틱마다 `chrome.storage.sync.set`을 호출하여 Chrome sync 쓰기 쿼터(`MAX_WRITE_OPERATIONS_PER_MINUTE`) 초과 위험이 있고, 기존 `catch (e) {}` 3곳이 주석/처리 없이 비어 있습니다.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // Before: viewer_controller.js (630L) 내 immersion 타이머/전체화면/스토리지 및 이벤트 바인딩 일체 포함
  // After:
  // 1) immersion 로직을 src/controller/immersion_controller.js로 분리(또는 re-export 유지)하고
  //    createOverlay/bindImmersionEvents를 30줄 이하 단일 책임 헬퍼로 분할
  // 2) 패딩 슬라이더 storage.sync.set은 change 이벤트 또는 디바운스로 통합
  // 3) 빈 catch (e) {} 3곳에 의도 주석 또는 방어적 로깅 추가
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)

### [REFACTOR-03] `popup.js` `initPopup` 복잡도(58줄·4-depth 중첩), `onChanged` 타입 가드 누락 및 슬라이더 쓰기 디바운스 미적용
- **심각도**: 🟡 Should Fix (권장 조치)
- **위치**: [`popup.js#L62-L119`](../../../popup.js#L62-L119) (`initPopup` 58줄, `input` L84-L90, `onChanged` L104-L116)
- **위반 규칙**: Function Length ≤ 30줄 / Nesting Depth ≤ 2 / Defensive Type Guard / `00_core_foundation` §3 스토리지 I/O 최소화
- **발견된 문제**:
  - `initPopup()`이 58줄이며 `chrome.storage.onChanged.addListener` 내부가 4-depth 중첩입니다.
  - `loadSettings()`(L24-L30)와 달리 `onChanged` 리스너(L107-L113)에는 `typeof change.newValue` 검증이 없어 스토리지 키 삭제(`newValue === undefined`) 시 `valDisplay.textContent`가 `'undefinedpx'`로 오염될 수 있습니다.
  - 패딩 슬라이더 `input` 리스너(L84-L90)가 매 드래그 이벤트마다 `savePadding()`을 호출하며 `parseInt` `NaN` 가드가 없습니다.
- **권장 개선안 (Suggested Diff)**:
  ```text
  // Before: initPopup 내 DOM 바인딩·storage.onChanged 4-depth 인라인 처리 및 newValue 무검증 대입
  // After:
  // 1) bindPopupSlider / bindPopupToggle / bindStorageSync 헬퍼로 30줄 이하·Early Return 분리
  // 2) onChanged에서 typeof newValue === 'boolean' / 'number' 검증 후 UI 반영
  // 3) 패딩 슬라이더 스토리지 저장에 디바운스 또는 change 이벤트 적용
  ```
- **현재 상태**: 🟡 OPEN (`systematic-debugger` 위임 대기)
