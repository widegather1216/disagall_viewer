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

- **직전 완료 작업**: 2026-11-27 / `viewer-immersion` `ADR-08` 구현 및 검증 완료 — 전체화면 진입 시 임시 `0px` 패딩 및 슬라이더 UI `0px` 표시 동기화, 전체화면 도중 슬라이더 조작 시 오버라이드 즉시 해제·실시간 리피팅·`defaultPadding` 저장 적용
- **생성/수정된 핵심 파일**:
  - `src/state.js`, `src/ui/overlay.js`: `state.isFullscreenPaddingZero` 플래그 및 `getEffectivePadding()`/`syncPaddingSliderUi()` 추가
  - `src/controller/fullscreen_controller.js`, `src/controller/overlay_bindings.js`, `src/controller/storage_sync.js`: 전체화면 진입/해제/리셋 시 임시 `0px` 슬라이더 UI 동기화, 슬라이더 입력 시 오버라이드 즉시 해제 및 리피팅 가드(`isLockedZero`) 정합화
  - `tests/immersion.test.js`, `tests/immersion_e2e.test.js`: Test 24/29.1/TC-BD-05b 갱신 및 Test 32/`TC-HP-07` 추가, `npm run pack` 번들·ZIP 동기화
- **Recent Commits**:
  - `e9d6215` - `test(immersion): verify fullscreen 0px slider sync and live unlock`
  - `68d93f0` - `feat(immersion): allow live padding slider override in fullscreen mode`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **실행 검증 명령 및 결과**:
  - `npm run pack` (`PASS`), `npm test` (7개 테스트 스위트·`immersion.test.js` 32/32·`immersion_e2e.test.js` 17/17 `PASS`), `node --check popup.js build.js` (`PASS`)
  - 미해결 티켓 (`0 / 0` — `🚨 DEFECT: 0건`, `🧐 REFACTOR: 0건`)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `viewer-immersion` 포함 전 도메인 구현/QA/감사 티켓 `0건`으로 `🟢 Sign-Off` 확정 상태.
  - 참고: 실제 오버레이 패딩 슬라이더의 DOM ID는 `#disagall-slider`(스펙 표기 `#disagall-padding-slider` 대신 실제 마크업 `src/ui/overlay_template.js#L31`)임.
