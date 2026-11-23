# 📦 [core-viewer] 코어 뷰어 및 이미지 피팅 엔진 (Core Viewer)

- **현재 상태 (Lifecycle)**: `🟢 Sign-Off`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-23 / `systematic-debugger` / `core-viewer` [`DEFECT-04`](./verification.md#defect-04-bindcontextmenutracker-%EC%A7%80%EC%97%B0-%EB%A1%9C%EB%94%A9-%EC%9D%B4%EB%AF%B8%EC%A7%80-url-%EC%A0%80%EC%9E%A5%EC%9C%BC%EB%A1%9C-%EC%9A%B0%ED%81%B4%EB%A6%AD-%EB%8C%80%EC%83%81-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%A7%A4%EC%B9%AD-%EC%8B%A4%ED%8C%A8) 해결 완료 및 `🟢 Sign-Off` 확정 (`bindContextMenuTracker()` `getBestImgUrl(target)` 전환 및 `findTargetImageIndex()` 플레이스홀더 `srcUrl` 폴백 보완)
- **생성/수정된 핵심 파일**:
  - `src/controller/viewer_controller.js`: `getBestImgUrl` 임포트, `findImageIndexByUrl()` 헬퍼 추출, `findTargetImageIndex()`의 `state.lastRightClickedImgSrc` 폴백 및 `bindContextMenuTracker()`의 `getBestImgUrl(target)` 적용
  - `tests/core_viewer.test.js`: `dispatchContextMenu()` 모의 헬퍼 및 `DEFECT-04` 회귀 테스트(Test 7: `gallview_loading_ori.gif`/`blank.gif`+`data-src`/`&s=1` 우클릭·Chrome `info.srcUrl` 플레이스홀더 폴백·비본문 `contextmenu` 초기화) 추가
  - `content.js` & `disagall_viewer.user.js`: `npm run build` 번들 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm run build` (`PASS` — `content.js`, `disagall_viewer.user.js` 번들 생성)
  - `npm test` (`PASS` — `module_import`, `core_viewer` 7/7, `post_navigation` 8/8, `recommend` 8/8, `immersion` 27/27)
  - `node tests/immersion_e2e.test.js` (`PASS` — 15/15)
  - `node --check` (`src/controller/viewer_controller.js`, `tests/core_viewer.test.js`, `content.js`, `disagall_viewer.user.js` `PASS`)
- **Recent Commits**:
  - `e70e62f` - `fix(core-viewer): resolve lazy-loaded contextmenu URLs to target image index`
  - `3d147a1` - `test(core-viewer): add regression tests for DEFECT-04 lazy-loaded contextmenu tracking`
  - `1b001e6` - `fix(core-viewer): suppress backdrop click after zoomed pan drag release`
  - `2fb2576` - `test(core-viewer): add regression tests for DEFECT-03 pan drag backdrop suppression`
  - `e5def17` - `fix(core-viewer): guard stale showImage callbacks and refit fallback image load`
  - `4f72617` - `test(core-viewer): add regression tests for DEFECT-02 stale load and fallback refit`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `core-viewer` 도메인 미해결 티켓 0건 및 9/9 시나리오 `PASS`로 **`🟢 Sign-Off`** 완료; 다음 잔여 결함은 `viewer-immersion` 도메인의 `DEFECT-02` 티켓부터 순차 해결.
