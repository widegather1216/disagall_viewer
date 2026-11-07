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
  - 📂 구현: [`background.js`](../../../background.js), [`src/parser/image_parser.js`](../../../src/parser/image_parser.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Zoom & Pan & Controller]**: 가용 영역 비율 수학 계산(`applyFittingAndPadding`), 휠/핀치 줌, 드래그 팬 오프셋 연산, RAF 렌더러 최적화, 스크롤 잠금
  - 📂 구현: [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: `#disagall-viewer-overlay` 풀스크린 마크업, 패딩 슬라이더, 카운터, 인포 뱃지, 좌우 네비게이션 버튼, `content.css` 스타일 완성
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-07 / `interactive-feature-planner` / 기존 코어 뷰어 구현 코드 전수 역공학 및 Living Wiki 표준화 완료
- **생성/수정된 핵심 파일**:
  - `src/parser/image_parser.js`: 15종 컨테이너 및 21종 제외 셀렉터 기반 본문 이미지 파서
  - `src/ui/overlay.js` & `src/ui/zoom_pan.js`: 종횡비 보존 피팅 및 RAF 줌앤팬 엔진
  - `src/controller/viewer_controller.js`: 뷰어 라이프사이클 및 단축키 제어
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/module_import.test.js`: 파서 및 모듈 무결성 테스트 PASS
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - 디시인사이드 지연 로딩(`data-original`) 이미지는 뷰어 오픈 전 `forcePreloadPostImages()`를 통해 미리 강제 로드되어야 함.
  - 마우스 휠 및 드래그 팬 시 `state.zoom.scale`이 1.001 이하로 내려가면 부동소수점 오차 방지를 위해 정확히 1.0 및 (0, 0)으로 리셋해야 함.
