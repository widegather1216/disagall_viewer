# 📦 [viewer-immersion] 몰입 모드 및 UI 클린 감상 패키지

- **현재 상태 (Lifecycle)**: `🧪 QA Testing`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시 사진 뷰어의 헤더, 패딩 슬라이더, 개추 버튼, 카운터, 안내창, 하단 힌트 등 모든 UI 요소를 사용자가 사진 감상에만 집중할 수 있도록 숨겨주는 몰입형 편의 기능 패키지입니다.
마우스 미조작(2.5초) 시 UI와 커서를 자동 페이드아웃하고, 단축키 `H`(수동 숨김), `F`(브라우저 전체화면) 및 확장 프로그램 팝업 설정(자동 숨김 On/Off)을 제공합니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)
- [x] 오버레이 기본 렌더링, 패딩 조절, 줌/팬 제스처, 방향키 네비게이션, 개추 버튼

### 🚀 Active Iteration: 몰입 모드 & UI 클린 감상 (To-Be)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `CONFIG.UI_IDLE_TIMEOUT`(2500ms), `CONFIG.STORAGE_KEY_AUTO_HIDE_UI` 상수 및 `state.idleTimer`, `state.autoHideUi`, `state.isUiHidden` 런타임 상태 정의 완료
  - 📂 구현: [`src/config.js`](../../../src/config.js), [`src/state.js`](../../../src/state.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Storage & Popup]**: 팝업창 UI(`popup.html`)에 자동 숨김 On/Off 토글 스위치 마크업 추가 및 `popup.js` / `chrome.storage.sync` 동기화 로직 구현 완료
  - 📂 구현: [`popup.html`](../../../popup.html), [`popup.js`](../../../popup.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Controller & Timer]**: 마우스 이동(`mousemove`) 감지 기반 2.5초 유휴 타이머 라이프사이클 관리, 수동 숨김 토글(`H`), 브라우저 전체화면 토글(`F`), 드래그/호버 유예 가드레일 및 `closeViewer` 정리 구현 완료
  - 📂 구현: [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: `content.css`에 `.disagall-idle` 및 `.disagall-ui-hidden` 페이드아웃/커서 숨김(드래그 커서 유지 포함) 스타일 추가, 하단 키힌트 바(`H UI숨김`, `F 전체화면`) 및 팝업 안내 업데이트, `npm run build` 번들 동기화 완료
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css), [`popup.html`](../../../popup.html) | 🧪 테스트: [`tests/immersion.test.js`](../../../tests/immersion.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-18 / `user-journey-tester` / `viewer-immersion` 도메인 Boundary & Negative (`TC-BD-01`, `TC-BD-02`, `TC-NG-01`, `TC-NG-02`) QA 검증 완료 (`4/4 PASS` — 전체 QA `8/8 Scenarios PASS`, `AC 4/4 (100%)`, `DEFECT 0건`)
- **Recent Commits**:
  - `addff3a`: `test(immersion): add built-bundle E2E QA suite for immersion mode`
  - `bd69c19`: `docs(immersion): promote spec/architecture to as-is and mark step 4 complete`
  - `f491117`: `feat(immersion): add idle fade-out styles, overlay keyhints, and popup shortcut guide`
  - `e7f3748`: `test(immersion): add tests for overlay keyhints, css immersion rules, and popup hints`
  - `90b47c1`: `docs(immersion): complete step 3 roadmap and advance control tower to step 4`
- **실행 검증 명령 및 결과**:
  - `npm test`: 4개 테스트 스위트(`module_import`, `post_navigation`, `recommend`, `immersion` 17개 테스트) 전원 PASS
  - `node tests/immersion_e2e.test.js`: 실제 번들(`content.js`, `content.css`, `popup.js`, `test_page.html`) 기반 Happy Path 4건(`TC-HP-01`~`TC-HP-04`) + Boundary/Negative 4건(`TC-BD-01`~`TC-NG-02`) 총 8개 시나리오 전원 PASS
  - Chrome Headless CDP E2E (`test_page.html`, `content.js`, `content.css`): Boundary & Negative 4건 실브라우저 DOM/computed style(`opacity`, `cursor: grabbing` 보존, `header:hover`)·타이머 정리·콘솔 에러 0건 PASS (증적: [`boundary-negative-qa.log`](./evidence/boundary-negative-qa.log), [`tc-bd-01-slider-deferred.png`](./evidence/tc-bd-01-slider-deferred.png), [`tc-bd-02-zoom-pan-dragging.png`](./evidence/tc-bd-02-zoom-pan-dragging.png); 기존 HP 증적: [`happy-path-qa.log`](./evidence/happy-path-qa.log))
  - 미해결 감사 티켓 (`0 / 2` — `🚨 DEFECT: 0건`, `🧐 REFACTOR: 2건` 보류 중): `REFACTOR-02` (`viewer_controller.js` 리팩토링), `REFACTOR-03` (`popup.js` 리팩토링)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - QA 인수 조건은 `4/4 (100% — 8/8 Scenarios PASS)` 통과했으나, 보류된 클린코드 개선 티켓 2건(`REFACTOR-02`, `REFACTOR-03`)이 남아 있어 `🟢 Sign-Off` 전 처리가 필요함: `"viewer-immersion 도메인의 REFACTOR-02 티켓 해결해줘"` (또는 보류 티켓 처리 선택)
  - 참고: 실제 오버레이 패딩 슬라이더의 DOM ID는 `#disagall-slider`(스펙 표기 `#disagall-padding-slider` 대신 실제 마크업 `src/ui/overlay.js#L30`)임.
  - Chrome `--headless=new` 환경은 OS 전체화면 권한 제약(`TypeError: not granted`)이 있으므로, 전체화면 중 `closeViewer` 해제 경로는 `tests/immersion_e2e.test.js`의 Fullscreen API 계약 시뮬레이션과 실브라우저 `closeViewer` 경로를 병행해 검증함.
