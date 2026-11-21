# 📦 [core-viewer] 코어 뷰어 및 이미지 피팅 엔진 (Core Viewer)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 3건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시인사이드 게시글 본문의 고화질 원본 사진들을 자동으로 탐색/필터링하고, 우클릭 컨텍스트 메뉴나 단축키로 활성화되어 화면 잘림 없는 맞춤 피팅(Aspect Ratio Fitting), 자유 줌앤팬(1.0x~5.0x Zoom & Pan), 실시간 여백(패딩) 조절을 제공하는 디시 사진 뷰어의 핵심 기반 엔진입니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)

- [x] **Step 1 [Schema & Types / Config & Constants]**: 기본 패딩(24px), 스토리지 키(`defaultPadding`), 줌 상태 구조체 및 엘리먼트 캐시 정의
  - 📂 구현: [`src/config.js`](../../../src/config.js), [`src/state.js`](../../../src/state.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Parser & ContextMenu]**: `background.js` 우클릭 메뉴 등록, 본문 15종 컨테이너 탐색, 디시콘/광고 필터링, 다운스케일 쿼리 제거 원본 URL 추출
  - 📂 구현: [`background.js`](../../../background.js), [`src/parser/image_parser.js`](../../../src/parser/image_parser.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Zoom & Pan & Controller]**: 가용 영역 비율 수학 계산(`applyFittingAndPadding`), 휠/핀치 줌, 드래그 팬 오프셋 연산, RAF 렌더러 최적화, 스크롤 잠금
  - 📂 구현: [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: `#disagall-viewer-overlay` 풀스크린 마크업, 패딩 슬라이더, 카운터, 인포 뱃지, 좌우 네비게이션 버튼, `content.css` 스타일 완성
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-21 / `systematic-debugger` / `core-viewer` [`DEFECT-01`](./verification.md#defect-01-userscript-%EC%BA%A1%EC%B2%98-click-%EC%9E%90%EA%B0%80-%EC%9E%AC%EC%A7%84%EC%9E%85-%EB%B0%8F-openviewer-%EC%A4%91%EB%B3%B5-%ED%98%B8%EC%B6%9C-%EC%8B%9C-%EC%8A%A4%ED%81%AC%EB%A1%A4-%EC%98%81%EA%B5%AC-%EC%9E%A0%EA%B8%88) 해결 완료 (Userscript 캡처 `click` 자가 재진입 차단 및 `openViewer()` `previousBodyOverflow` 덮어쓰기 방지)
- **생성/수정된 핵심 파일**:
  - `src/parser/image_parser.js`: `EXCLUDED_CONTAINER_SELECTORS`에 `#disagall-viewer-overlay` 추가
  - `src/userscript.js`: `isOverlayActive()`, `typeof target.closest !== 'function'`, `#disagall-viewer-overlay` 가드 적용
  - `src/controller/viewer_controller.js`: `isOverlayActive` re-export 및 `openViewer()` `!wasActive`일 때만 `previousBodyOverflow` 저장
  - `tests/core_viewer.test.js` & `package.json`: `DEFECT-01` 회귀 테스트 3종 추가 및 `npm test` 연동
- **검증 완료된 테스트 실행 명령어**:
  - `npm run build` (`PASS` — `content.js`, `disagall_viewer.user.js` 번들 생성)
  - `npm test` (`PASS` — `module_import`, `core_viewer` 3/3, `post_navigation`, `recommend`, `immersion` 26/26)
  - `node tests/immersion_e2e.test.js` (`PASS` — 15/15)
- **Recent Commits**:
  - `ca063d3` - `fix(core-viewer): guard userscript click re-entry and duplicate openViewer overflow lock`
  - `eff67f6` - `test(core-viewer): add unit and userscript regression tests for DEFECT-01`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `systematic-debugger`로 잔여 `DEFECT-02`(비동기 `tempImg` 스테일 콜백 덮어쓰기 및 `onerror` 폴백 피팅 누락)부터 `DEFECT-04`까지 순차 수정 필요.
