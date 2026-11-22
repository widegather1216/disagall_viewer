# 📦 [core-viewer] 코어 뷰어 및 이미지 피팅 엔진 (Core Viewer)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-22 / `systematic-debugger` / `core-viewer` [`DEFECT-03`](./verification.md#defect-03-%EC%A4%8C-%EC%83%81%ED%83%9C-%EC%9D%B4%EB%AF%B8%EC%A7%80-%EB%B0%96-%EB%93%9C%EB%9E%98%EA%B7%B8-%EC%A2%85%EB%A3%8C-%EC%8B%9C-%EB%B0%B1%EB%93%9C%EB%A1%AD-%ED%81%B4%EB%A6%AD-%EC%98%A4%EC%9D%B8-%EB%B7%B0%EC%96%B4-%EB%8B%AB%ED%9E%98) 해결 완료 (줌 상태 팬 드래그 종료 시 백드롭 클릭 오인 닫힘 방지, 우클릭 간섭·드래그 중 `navigate()`·오버레이 외부 릴리즈 0ms 만료 가드 적용)
- **생성/수정된 핵심 파일**:
  - `src/state.js`: `state.zoom`에 `pendingDragRelease`, `suppressNextBackdropClick`, `suppressClickTimer` 상태 추가
  - `src/ui/zoom_pan.js`: `consumeSuppressedBackdropClick()`, `clearSuppressBackdropClick()`, `armSuppressBackdropClick()`, `onWindowMouseUp(e)` 좌클릭/드래그 억제 및 `resetZoom(preservePendingRelease)` 가드 적용
  - `src/controller/viewer_controller.js`: `bindOverlayBackdrop()` 최상단 `consumeSuppressedBackdropClick()` 가드 및 `showImage()` `resetZoom(true)` 연동
  - `tests/core_viewer.test.js`: `DEFECT-03` 회귀 테스트(Test 6.1~6.7: `#disagall-stage`/`#disagall-img-wrapper`/`#disagall-main-img`/오버레이 밖 릴리즈/우클릭 간섭/드래그 중 `navigate()`) 추가
  - `content.js` & `disagall_viewer.user.js`: `npm run build` 번들 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm run build` (`PASS` — `content.js`, `disagall_viewer.user.js` 번들 생성)
  - `npm test` (`PASS` — `module_import`, `core_viewer` 6/6, `post_navigation` 8/8, `recommend` 8/8, `immersion` 27/27)
  - `node tests/immersion_e2e.test.js` (`PASS` — 15/15)
  - `node --check` (`src/state.js`, `src/ui/zoom_pan.js`, `src/controller/viewer_controller.js`, `content.js`, `disagall_viewer.user.js`, `tests/core_viewer.test.js` `PASS`)
- **Recent Commits**:
  - `1b001e6` - `fix(core-viewer): suppress backdrop click after zoomed pan drag release`
  - `2fb2576` - `test(core-viewer): add regression tests for DEFECT-03 pan drag backdrop suppression`
  - `e5def17` - `fix(core-viewer): guard stale showImage callbacks and refit fallback image load`
  - `4f72617` - `test(core-viewer): add regression tests for DEFECT-02 stale load and fallback refit`
  - `ca063d3` - `fix(core-viewer): guard userscript click re-entry and duplicate openViewer overflow lock`
  - `eff67f6` - `test(core-viewer): add unit and userscript regression tests for DEFECT-01`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `systematic-debugger`로 잔여 `DEFECT-04`(지연 로딩 이미지 우클릭 인덱스 매칭 실패) 수정 필요.
