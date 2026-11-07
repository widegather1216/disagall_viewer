# 📦 [viewer-immersion] 몰입 모드 및 UI 클린 감상 패키지

- **현재 상태 (Lifecycle)**: `🛠️ Implementing`
- **구현 진척도**: `[■■□□] 2/4 Steps`
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
- [ ] **Step 3 [Domain Service & State / Controller & Timer]**: 마우스 이동(`mousemove`) 감지 기반 2.5초 유휴 타이머 라이프사이클 관리, 수동 숨김 토글(`H`), 브라우저 전체화면 토글(`F`), 드래그/호버 유예 가드레일 구현
  - 📂 구현: [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: `tests/immersion.test.js` (`⏳ 대기`)
- [ ] **Step 4 [UI & Integration / Overlay & Styling]**: `content.css`에 `.disagall-idle` 및 `.disagall-ui-hidden` 페이드아웃/커서 숨김 스타일 추가, 하단 키힌트 바 및 팝업 안내 업데이트, `npm run build` 번들 동기화
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: `tests/immersion.test.js` (`⏳ 대기`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-07 / `clean-code-developer` / Step 2 `[Data Access & API / Storage & Popup]` 구현 및 3단 검증(신규 단위 테스트 + 전역 회귀 + 번들 빌드 + 위키 헬스체크) 통과
- **Recent Commits**:
  - `ba1f51e`: `feat(immersion): add auto hide ui toggle and storage sync in popup`
  - `249468e`: `test(immersion): add unit tests for popup storage contracts and dom events`
  - `62e7e6e`: `docs(immersion): complete step 1 roadmap and sync master control tower`
  - `2790e49`: `feat(immersion): define idle timeout config and runtime state`
- **생성/수정된 핵심 파일**:
  - `popup.html`: 몰입 모드 (UI 자동 숨김) 토글 스위치 마크업 및 switch CSS 스타일 추가
  - `popup.js`: `autoHideUi` 설정 로드, 저장(`saveAutoHideUi`), `chrome.storage.onChanged` 동기화 리스너 구현
  - `tests/immersion.test.js`: 스토리지 읽기/쓰기, 팝업 컨트롤러 초기화 및 이벤트 디스패치, 방어적 에러 핸들링 유닛 테스트 추가
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/immersion.test.js`: 유휴 타이머, 스토리지 및 팝업 연동 7개 단위 테스트 PASS
  - `npm test`: 신규 `immersion.test.js` 포함 4개 테스트 스위트 전원 PASS
  - `npm run build`: esbuild 기반 Chrome Extension 및 유저스크립트 번들링 완료
  - `python3 -B ~/.gemini/config/skills/interactive-feature-planner/scripts/check_wiki_health.py docs`: exit code 0 확인
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `Step 3 [Domain Service & State / Controller & Timer]` 구현 진행
  - `src/controller/viewer_controller.js`에서 마우스 이동(`mousemove`) 시 2.5초 유휴 타이머 리셋/등록 (`CONFIG.UI_IDLE_TIMEOUT`), 수동 숨김 토글(`H`), 브라우저 전체화면(`F`) 로직 구현
  - 뷰어가 닫힐 때(`closeViewer`) `state.idleTimer`를 반드시 `clearTimeout`하여 유령 콜백을 방지할 것.
