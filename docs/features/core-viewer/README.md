# 📦 [core-viewer] 코어 뷰어 및 이미지 피팅 엔진 (Core Viewer)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-25 / `systematic-debugger` / `core-viewer` [`REFACTOR-01`](./verification.md#refactor-01-closeviewer-동기-스토리지-예외-중단-resizerafidupdateimgtransform-raf-누수-및-active-가드-누락) 해결 (`closeViewer()` 스토리지 예외 내성, `state.resizeRafId`/`transformRafId` 취소, `zoom_pan.js` `!active`·`WeakSet` 가드 및 번들 동기화)
- **생성/수정된 핵심 파일**:
  - [`src/state.js`](../../../src/state.js): `state.resizeRafId: null` 등록
  - [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js): `persistPaddingSetting()` `catch` 추가, `cancelResizeRaf()` 추출, `closeViewer()` `.active`/스크롤 복원 및 `cancelResizeRaf()`·`cancelZoomRaf()` 정리
  - [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js): `isViewerActive()`, `cancelZoomRaf()`, `resetZoom()` 동기 스타일 초기화, `WeakSet` 중복 방지 및 `!active` 리스너 가드 추가
  - [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js): Test 8 (`REFACTOR-01`) 회귀 테스트 추가 및 `content.js`/`disagall_viewer.user.js` 빌드 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm run build` (`PASS`), `npm test` (`core_viewer` 8/8 포함 5개 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node --check` (`PASS`)
- **Working Tree State**: 🟡 Uncommitted Fix & Docs (`REFACTOR-01` 수정·테스트·번들·위키 반영 완료, 커밋 전)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `core-viewer` 잔여 티켓: [`REFACTOR-02`](./verification.md#refactor-02-viewer_controllerjs610줄overlayjs359줄-책임-분리-userscriptjs-계층-우회-및-image_parserjs-방어중복-정리) (🟡 Should Fix), [`REFACTOR-03`](./verification.md#refactor-03-testscore_viewertestjs-줌-변환가로-피팅토스트-타이머-테스트-커버리지-보강-및-위생-정리) (🟡 Should Fix). 전역 최우선 Must Fix는 `post-recommend` `REFACTOR-01` / `post-navigation` `REFACTOR-14`.
