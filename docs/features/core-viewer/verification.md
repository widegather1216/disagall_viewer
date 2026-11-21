# 🧪 [core-viewer] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`3건 OPEN DEFECT` — `DEFECT-01` 해결 완료, `DEFECT-02~04` 잔여)
- **인수 조건 통과율**: `5 / 9 Scenarios PASS (56%)` (`DEFECT-01` 해결, `DEFECT-02~04` OPEN)
- **미해결 티켓**: `🚨 DEFECT: 3건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (우클릭 컨텍스트 메뉴 및 뷰어 오픈)**:
  - **Given** 사용자가 디시인사이드 게시글 본문 사진 위에서 우클릭할 때,
  - **When** "📷 디시 사진 뷰어로 화면 맞춤 보기" 메뉴를 클릭하면,
  - **Then** 클릭한 사진이 기본 선택된 상태로 뷰어 오버레이가 열리고 배경 스크롤이 차단된다.
- **AC-02 (비율 맞춤 피팅 및 패딩 조절)**:
  - **Given** 뷰어가 활성화되어 이미지가 렌더링될 때,
  - **When** 원본 이미지의 가로/세로 비율과 현재 패딩 슬라이더 값을 대입하면,
  - **Then** 잘림 없이 가용 화면에 최대 크기로 맞춤 렌더링되며, 슬라이더 변경 시 실시간 반영 및 저장된다.
- **AC-03 (마우스 휠 줌 및 드래그 팬)**:
  - **Given** 사진이 뷰어에 표시되어 있을 때,
  - **When** 마우스 휠을 굴려 1.0x~5.0x로 확대하고 마우스 좌클릭으로 드래그하면,
  - **Then** RAF 기반으로 부드럽게 확대 및 이동되며 뱃지에 확대 퍼센트가 표시된다.
- **AC-04 (사진 넘기기 및 순환 탐색)**:
  - **Given** 게시글에 2장 이상의 사진이 있을 때,
  - **When** 좌우 화살표 버튼 또는 키보드 `←`/`→`(A/D)를 누르면,
  - **Then** 이전/다음 사진으로 순환 전환되며 상단 카운터가 업데이트된다.
- **AC-05 (뷰어 닫기 및 상태 복원)**:
  - **Given** 뷰어가 열려 있을 때,
  - **When** 닫기 버튼 클릭, 배경 빈 영역 클릭, 또는 `ESC` 키를 누르면,
  - **Then** 뷰어가 닫히고 `document.body.style.overflow`가 이전 값으로 완벽히 복원된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 우클릭 메뉴로 정확한 클릭 위치 사진 뷰어 즉시 활성화 | `AC-01` | `FAIL` | [`DEFECT-04`](#defect-04-bindcontextmenutracker-%EC%A7%80%EC%97%B0-%EB%A1%9C%EB%94%A9-%EC%9D%B4%EB%AF%B8%EC%A7%80-url-%EC%A0%80%EC%9E%A5%EC%9C%BC%EB%A1%9C-%EC%9A%B0%ED%81%B4%EB%A6%AD-%EB%8C%80%EC%83%81-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%A7%A4%EC%B9%AD-%EC%8B%A4%ED%8C%A8) |
| `TC-HP-02` | Happy | 가로/세로 사진 화면 맞춤 렌더링 및 패딩 슬라이더 0~100px 실시간 반영 | `AC-02` | `PASS` | - |
| `TC-HP-03` | Happy | 마우스 휠 1.0x~5.0x 확대, 더블클릭 2.0x 토글, 드래그 팬 동작 | `AC-03` | `FAIL` | [`DEFECT-03`](#defect-03-%EC%A4%8C-%EC%83%81%ED%83%9C-%EC%9D%B4%EB%AF%B8%EC%A7%80-%EB%B0%96-%EB%93%9C%EB%9E%98%EA%B7%B8-%EC%A2%85%EB%A3%8C-%EC%8B%9C-%EB%B0%B1%EB%93%9C%EB%A1%AD-%ED%81%B4%EB%A6%AD-%EC%98%A4%EC%9D%B8-%EB%B7%B0%EC%96%B4-%EB%8B%AB%ED%9E%98) |
| `TC-HP-04` | Happy | 방향키 `←`/`→` 사진 이동 및 카운터 동기화 | `AC-04` | `FAIL` | [`DEFECT-02`](#defect-02-showimage-%EB%B9%84%EB%8F%99%EA%B8%B0-tempimg-%EC%8A%A4%ED%85%8C%EC%9D%BC-%EC%BD%9C%EB%B0%B1-%EB%8D%AE%EC%96%B4%EC%93%B0%EA%B8%B0-%EB%B0%8F-onerror-%ED%8F%B4%EB%B0%B1-%ED%94%BC%ED%8C%85-%EB%88%84%EB%9D%BD) |
| `TC-HP-05` | Happy | `ESC` 및 배경 클릭 시 뷰어 닫힘 및 바디 스크롤 복원 | `AC-05` | `PASS (Fixed in DEFECT-01)` | [`DEFECT-01`](#defect-01-userscript-%EC%BA%A1%EC%B2%98-click-%EC%9E%90%EA%B0%80-%EC%9E%AC%EC%A7%84%EC%9E%85-%EB%B0%8F-openviewer-%EC%A4%91%EB%B3%B5-%ED%98%B8%EC%B6%9C-%EC%8B%9C-%EC%8A%A4%ED%81%AC%EB%A1%A4-%EC%98%81%EA%B5%AC-%EC%9E%A0%EA%B8%88) |
| `TC-BD-01` | Boundary | 본문 사진 1장 이하일 때 좌우 내비게이션 버튼 `.disabled` 비활성화 | `AC-04` | `PASS` | - |
| `TC-BD-02` | Boundary | 지연 로딩(`data-original`) 사진 사전 강제 로드 및 다운스케일 쿼리 제거 | `AC-01` | `FAIL` | [`DEFECT-02`](#defect-02-showimage-%EB%B9%84%EB%8F%99%EA%B8%B0-tempimg-%EC%8A%A4%ED%85%8C%EC%9D%BC-%EC%BD%9C%EB%B0%B1-%EB%8D%AE%EC%96%B4%EC%93%B0%EA%B8%B0-%EB%B0%8F-onerror-%ED%8F%B4%EB%B0%B1-%ED%94%BC%ED%8C%85-%EB%88%84%EB%9D%BD), [`DEFECT-04`](#defect-04-bindcontextmenutracker-%EC%A7%80%EC%97%B0-%EB%A1%9C%EB%94%A9-%EC%9D%B4%EB%AF%B8%EC%A7%80-url-%EC%A0%80%EC%9E%A5%EC%9C%BC%EB%A1%9C-%EC%9A%B0%ED%81%B4%EB%A6%AD-%EB%8C%80%EC%83%81-%EC%9D%B8%EB%8D%B1%EC%8A%A4-%EB%A7%A4%EC%B9%AD-%EC%8B%A4%ED%8C%A8) |
| `TC-NG-01` | Negative | 본문 사진 0장일 때 조기 리턴 및 알림 표시 | `AC-01` | `PASS` | - |
| `TC-NG-02` | Negative | 댓글창 디시콘, 사이드바 배너 등 비본문 이미지 오탐 배제 | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] Userscript 캡처 `click` 자가 재진입 및 `openViewer()` 중복 호출 시 스크롤 영구 잠금
- **현재 상태**: 🟢 RESOLVED (수정 및 회귀 검증 완료)
- **심각도 & 위치**: 🔴 P0 Critical | [`src/userscript.js#L65-L76`](../../../src/userscript.js#L65-L76), [`src/parser/image_parser.js#L3-L27`](../../../src/parser/image_parser.js#L3-L27), [`src/controller/viewer_controller.js#L385-L390`](../../../src/controller/viewer_controller.js#L385-L390)
- **원인 및 실증**: `#disagall-viewer-overlay`가 `EXCLUDED_CONTAINER_SELECTORS`에 없어 Userscript 캡처 리스너가 `#disagall-main-img` 클릭·더블클릭·드래그 종료 시 `openViewer()`를 재호출함(또한 non-Element `e.target.closest` 시 `TypeError`). `openViewer()`가 활성 가드 없이 `state.previousBodyOverflow`를 `'hidden'`으로 덮어써 `closeViewer()` 후에도 스크롤이 영구 잠금됨(`Empirical Probe Reproduced`: `bodyOverflowAfterClose === 'hidden'`).
- **해결 내역**:
  - **수정 파일**: [`src/parser/image_parser.js`](../../../src/parser/image_parser.js#L26), [`src/userscript.js`](../../../src/userscript.js#L65-L76), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js#L385-L390), [`tests/core_viewer.test.js`](../../../tests/core_viewer.test.js)
  - **원인 및 조치**: `EXCLUDED_CONTAINER_SELECTORS`에 `#disagall-viewer-overlay`를 추가해 뷰어 이미지 오탐을 차단하고, `userscript.js` 캡처 `click` 리스너에 `isOverlayActive()`·`typeof target.closest !== 'function'`·`#disagall-viewer-overlay` 내부 클릭 차단 가드를 적용(Devil's Advocate 교차 검증 완료). `openViewer()`에서 `!isOverlayActive()`일 때만 `state.previousBodyOverflow`를 백업하도록 수정하고 `npm run build`로 `content.js`/`disagall_viewer.user.js` 동기화.
  - **회귀 테스트 결과**: `npm test` (`tests/core_viewer.test.js` 3/3 포함 전 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`)

### [DEFECT-02] `showImage()` 비동기 `tempImg` 스테일 콜백 덮어쓰기 및 `onerror` 폴백 피팅 누락
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L99-L131`](../../../src/controller/viewer_controller.js#L99-L131), [`src/ui/overlay.js#L140-L143`](../../../src/ui/overlay.js#L140-L143)
- **원인 및 실증**: `tempImg.onload`/`onerror`에 세대 토큰 및 `isOverlayActive()` 검증이 없어 느린 이전 이미지가 현재 `mainImgEl.src`를 덮어씀(`Empirical Probe Reproduced`: `counter: '2 / 2'`, `src: ...&no=abc`). 또한 `onerror` 폴백 URL이 미캐시 상태일 때 `naturalWidth === 0`으로 `applyFittingAndPadding()`이 조기 반환되어 리피팅이 누락됨.
- **최소 수정 설계**: `imageLoadSeq` 세대 토큰으로 스테일 콜백 폐기 및 `mainImgEl.onload`에서 `applyFittingAndPadding()` 재실행.

### [DEFECT-03] 줌 상태 이미지 밖 드래그 종료 시 백드롭 클릭 오인 뷰어 닫힘
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/ui/zoom_pan.js#L86-L97`](../../../src/ui/zoom_pan.js#L86-L97), [`src/controller/viewer_controller.js#L330-L336`](../../../src/controller/viewer_controller.js#L330-L336)
- **원인 및 실증**: `scale > 1.0` 상태에서 `mainImgEl` 위 `mousedown` 후 이미지 밖(`#disagall-img-wrapper`/`#disagall-stage`)에서 `mouseup`하면 공통 조상에 `click`이 발생해 `bindOverlayBackdrop()`이 뷰어를 닫음(`Deterministic Trace Verified`).
- **최소 수정 설계**: 드래그 시작/이동 시 직후 1회 백드롭 `click` 무시 플래그(`suppressNextBackdropClick`) 적용.

### [DEFECT-04] `bindContextMenuTracker()` 지연 로딩 이미지 URL 저장으로 우클릭 대상 인덱스 매칭 실패
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🟠 P1 High | [`src/controller/viewer_controller.js#L356-L364`](../../../src/controller/viewer_controller.js#L356-L364), [`src/controller/viewer_controller.js#L445-L454`](../../../src/controller/viewer_controller.js#L445-L454)
- **원인 및 실증**: `bindContextMenuTracker()`가 `getBestImgUrl(target)` 대신 `getCleanOriginalUrl(target.src)`를 저장해 미로딩 이미지(`gallview_loading_ori.gif`) 우클릭 시 `findTargetImageIndex()`가 매칭 실패로 항상 `0`번을 엶(`Deterministic Trace Verified`).
- **최소 수정 설계**: `state.lastRightClickedImgSrc = getBestImgUrl(target)`로 변경.

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

*(현재 등록된 미해결 리팩토링 티켓 없음)*
