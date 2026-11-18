# 📦 [viewer-immersion] 몰입 모드 및 UI 클린 감상 패키지

- **현재 상태 (Lifecycle)**: `🧐 Auditing`
- **구현 진척도**: `[■■■■] 4/4 Steps`
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

- **직전 완료 작업**: 2026-11-18 / `clean-code-developer` / Step 4 `[UI & Integration / Overlay & Styling]` 구현, 3단 검증(신규 단위 테스트 + 전역 회귀 + 번들 빌드 + 위키 헬스체크) 통과 및 최종 Step 완료에 따른 스펙/아키텍처 승격 병합 완료
- **Recent Commits**:
  - `f491117`: `feat(immersion): add idle fade-out styles, overlay keyhints, and popup shortcut guide`
  - `e7f3748`: `test(immersion): add tests for overlay keyhints, css immersion rules, and popup hints`
  - `90b47c1`: `docs(immersion): complete step 3 roadmap and advance control tower to step 4`
  - `a76071f`: `feat(immersion): implement idle timer, shortcut handlers, and storage sync in controller`
  - `42f57e5`: `test(immersion): add unit tests for controller timer, shortcuts, and guardrails`
- **생성/수정된 핵심 파일**:
  - `content.css`: `#disagall-viewer-overlay.disagall-idle` / `.disagall-ui-hidden` 커서 숨김(`cursor: none`, 드래그 중 `style*="grabbing"` 예외 보존) 및 `.disagall-header`/`.disagall-footer`/`.disagall-nav-btn` 숨김(`opacity: 0; pointer-events: none; transition: opacity 0.3s ease;`)·복귀(`0.15s ease`) 스타일 추가, `.disagall-keyhints` 반응형 줄바꿈(`flex-wrap: wrap`) 적용
  - `src/ui/overlay.js`: `buildOverlayHtml()` 내 `.disagall-keyhints` 바에 `H UI숨김`, `F 전체화면` 배지 추가
  - `popup.html`: `몰입 모드 (UI 자동 숨김)` 카드 내 `H` UI 숨김 토글 · `F` 전체화면 전환 단축키 안내 추가
  - `tests/immersion.test.js`: Step 4 오버레이 키힌트 배지, `content.css` 규칙/트랜지션/드래그 커서 가드, `popup.html` 안내 검증 테스트(Test 15~17) 추가
  - `content.js`, `disagall_viewer.user.js`: `npm run build`를 통한 Chrome Extension 및 유저스크립트(CSS 인라인 포함) 번들 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/immersion.test.js`: Step 1~4 전체 17개 단위/통합 테스트 PASS
  - `npm test`: `immersion.test.js` 포함 4개 테스트 스위트 전원 PASS
  - `npm run build`: esbuild 기반 Chrome Extension 및 유저스크립트 번들링 완료
  - `python3 -B ~/.gemini/config/skills/interactive-feature-planner/scripts/check_wiki_health.py docs`: exit code 0 확인
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `viewer-immersion` 도메인 4/4 Steps 구현이 모두 완료되었으므로, 다음 표준 파이프라인은 `clean-code-auditor` 기반 클린코드 품질 감사(`"viewer-immersion 도메인 클린코드 품질 감사 진행해줘"`) 이후 `user-journey-tester` QA 검증 순으로 진행할 것.
  - `zoom_pan.js`가 `#disagall-main-img`에 인라인 `style.cursor`를 직접 할당하므로, `content.css`의 `*:not([style*="grabbing"])` 커서 숨김 예외 규칙이 유지되어야 확대 이미지 위 유휴 숨김과 드래그 팬 커서 유지가 동시에 정상 동작함.
