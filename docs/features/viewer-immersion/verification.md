# 🧪 [viewer-immersion] Verification & Ticket Logs

- **검증 상태**: `🟢 Sign-Off` (QA 시나리오 `8/8 PASS` · 감사 티켓 `REFACTOR-01~03` 전량 해결 완료)
- **인수 조건 통과율**: `4 / 4 (100% — 8/8 Scenarios PASS)`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건`

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
