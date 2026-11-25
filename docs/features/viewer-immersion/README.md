# 📦 [viewer-immersion] 몰입 모드 및 UI 클린 감상 패키지

- **현재 상태 (Lifecycle)**: `🟢 Sign-Off`
- **구현 진척도**: `[■■■■■■■■] 8/8 Steps` (기본 4/4 + 확장 피팅 2/2 + 전체화면 모드 2/2)
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시 사진 뷰어의 헤더, 패딩 슬라이더, 개추 버튼, 카운터, 안내창, 하단 힌트 등 모든 UI 요소를 사용자가 사진 감상에만 집중할 수 있도록 숨겨주는 몰입형 편의 기능 패키지입니다.
마우스 미조작(2.5초) 시 UI와 커서를 자동 페이드아웃하고, 단축키 `H`(수동 숨김), `F`(브라우저 전체화면) 및 확장 프로그램 팝업 설정(자동 숨김 On/Off)을 제공합니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)
- [x] 오버레이 기본 렌더링, 패딩 조절, 줌/팬 제스처, 방향키 네비게이션, 개추 버튼

### ✅ Completed Iteration: 전체화면 모드 UX & 자동 전체화면 (`ADR-06` As-Is)

- [x] **Step 7 [Config/Popup/UI / Settings & Fullscreen Button]**: `CONFIG.STORAGE_KEY_AUTO_FULLSCREEN`, `state.autoFullscreen`/`isFullscreenMode`, `popup.html` `#auto-fullscreen-toggle` & `popup.js` 양방향 동기화, `overlay.js` 헤더 `#disagall-btn-fullscreen` 버튼 및 임시 `0px` 여백 피팅 완료
  - 📂 구현: [`src/config.js`](../../../src/config.js), [`src/state.js`](../../../src/state.js), [`popup.html`](../../../popup.html), [`popup.js`](../../../popup.js), [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS` — Test 23~24)
- [x] **Step 8 [Controller & E2E / Fullscreen Sync & Auto-Enter Fallback]**: `immersion_controller.js` `fullscreenchange` 동기화·여백 `0px`/즉시 숨김·`openViewer` 자동 전체화면 시도 및 차단 폴백, `viewer_controller.js` 버튼 바인딩, `npm run build` 및 `tests/immersion_e2e.test.js` 검증 완료
  - 📂 구현: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js), [`content.js`](../../../content.js), [`disagall_viewer.user.js`](../../../disagall_viewer.user.js) | 🧪 테스트: [`tests/immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`PASS` — `TC-HP-06`, `TC-BD-05`, `TC-NG-03`)

### ✅ Completed Iteration: UI 숨김 시 사진 영역 확장 (`ADR-05` As-Is)

- [x] **Step 5 [UI & Fitting / CSS Overlay & Stage Expansion]**: `.disagall-header`/`.disagall-footer` 절대 배치(`content.css`), `.disagall-stage` 안전 패딩 트랜지션, `applyFittingAndPadding()` UI 숨김 시 헤더·푸터 높이(`0px`) 회수 확장(사용자 `currentPadding` 유지) 및 `zoom_pan.js` `1.0x` 복귀 리피팅 동기화 완료
  - 📂 구현: [`content.css`](../../../content.css), [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js), [`src/state.js`](../../../src/state.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS` — Test 20~22)
- [x] **Step 6 [Controller & Build / Immersion Fitting Sync & E2E]**: `immersion_controller.js` `showUi()`/`hideUi()` 상태 전이 시 확대 중(`scale > 1.001`) 크기 고정 및 `1.0x` 리피팅 연동, `npm run build` 번들 동기화 및 `tests/immersion_e2e.test.js` 검증 완료
  - 📂 구현: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js), [`content.js`](../../../content.js), [`disagall_viewer.user.js`](../../../disagall_viewer.user.js) | 🧪 테스트: [`tests/immersion_e2e.test.js`](../../../tests/immersion_e2e.test.js) (`PASS` — `TC-HP-05`, `TC-BD-03`, `TC-BD-04`)

### ✅ Completed Iteration: 몰입 모드 & UI 클린 감상 (As-Is)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `CONFIG.UI_IDLE_TIMEOUT`(2500ms), `CONFIG.STORAGE_KEY_AUTO_HIDE_UI` 상수 및 `state.idleTimer`, `state.autoHideUi`, `state.isUiHidden` 런타임 상태 정의 완료
  - 📂 구현: [`src/config.js`](../../../src/config.js), [`src/state.js`](../../../src/state.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Storage & Popup]**: 팝업창 UI(`popup.html`)에 자동 숨김 On/Off 토글 스위치 마크업 추가 및 `popup.js` / `chrome.storage.sync` 동기화 로직 구현 완료
  - 📂 구현: [`popup.html`](../../../popup.html), [`popup.js`](../../../popup.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Controller & Timer]**: 마우스 이동(`mousemove`) 감지 기반 2.5초 유휴 타이머 라이프사이클 관리, 수동 숨김 토글(`H`), 브라우저 전체화면 토글(`F`), 드래그/호버 유예 가드레일 및 `closeViewer` 정리 구현 완료
  - 📂 구현: [`src/controller/immersion_controller.js`](../../../src/controller/immersion_controller.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: `content.css`에 `.disagall-idle` 및 `.disagall-ui-hidden` 페이드아웃/커서 숨김(드래그 커서 유지 포함) 스타일 추가, 하단 키힌트 바(`H UI숨김`, `F 전체화면`) 및 팝업 안내 업데이트, `npm run build` 번들 동기화 완료
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css), [`popup.html`](../../../popup.html) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-25 / `atomic-commit-crafter` / 전체화면 진입 시 OS 전환 애니메이션·창 크기 변경 `mousemove`로 인한 UI 깜빡임(사라짐→재표시→재숨김) 방지 가드(`FULLSCREEN_TRANSITION_MOUSE_GUARD_MS = 1000ms` 전환 억제 + 정지 합성 `mousemove` 필터링 + `autoFullscreen` 오픈 시 즉시 숨김) 구현 및 단위/E2E 회귀 테스트(`Test 30`, `TC-BD-07`) 커밋 완료 (`src/controller/immersion_controller.js`, `src/controller/viewer_controller.js`, `tests/immersion.test.js`, `tests/immersion_e2e.test.js`, `content.js`, `disagall_viewer.user.js`, Safari Extension 리소스)
- **Recent Commits**:
  - `9e6e693`: `test(immersion): add unit and E2E tests for fullscreen transition mouse guard`
  - `f8e8887`: `fix(immersion): suppress mousemove UI wake flicker during fullscreen transition`
  - `317de54`: `fix(immersion): unify defaultPadding sync and guard async storage init races`
  - `cd985b0`: `test(immersion): add unit and E2E tests for DEFECT-03 padding sync and async init races`
  - `b4bf989`: `fix(immersion): ignore synthetic header mouseleave when UI is already hidden`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **실행 검증 명령 및 결과**:
  - `npm run build`: `content.js`, `disagall_viewer.user.js` 및 Safari Extension 리소스 동기화 PASS
  - `npm test`: 5개 테스트 스위트(`module_import`, `core_viewer`, `post_navigation`, `recommend`, `immersion` 30개 테스트) 전원 PASS
  - `node tests/immersion_e2e.test.js`: 실제 번들(`content.js`, `content.css`, `popup.js`, `test_page.html`) 기반 16개 시나리오(`TC-BD-07` 포함) 전원 PASS
  - `node --check`: `src/controller/immersion_controller.js`, `src/controller/viewer_controller.js` 구문 검사 PASS
  - 미해결 티켓 (`0 / 0` — `🚨 DEFECT: 0건`, `🧐 REFACTOR: 0건`)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `viewer-immersion` 도메인 모든 시나리오 `15/15 (100%) PASS` 및 `DEFECT-01~03`·`REFACTOR-01~03` 전건 해결로 `🟢 Sign-Off` 완료.
  - 다음 미해결 도메인(`post-navigation/DEFECT-03` 등) 디버깅 진행 가능 (`atomic-commit-crafter`로 현재 변경사항 커밋 후 진행 권장).
  - 참고: 실제 오버레이 패딩 슬라이더의 DOM ID는 `#disagall-slider`(스펙 표기 `#disagall-padding-slider` 대신 실제 마크업 `src/ui/overlay.js#L30`)임.
  - Chrome `--headless=new` 환경은 OS 전체화면 권한 제약(`TypeError: not granted`)이 있으므로, 전체화면 중 `closeViewer` 해제 경로는 `tests/immersion_e2e.test.js`의 Fullscreen API 계약 시뮬레이션과 실브라우저 `closeViewer` 경로를 병행해 검증함.
