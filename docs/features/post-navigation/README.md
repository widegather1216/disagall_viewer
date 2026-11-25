# 📦 [post-navigation] 위/아래 방향키 게시글 탐색 (Post Navigation)

- **현재 상태 (Lifecycle)**: `🟢 Sign-Off`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시 사진 뷰어가 열려 있는 상태에서 `↑` / `↓` 방향키를 눌러 하단 글 목록의 이전/다음 게시글로 이동하고, 연속 감상 모드(`sessionStorage`)를 통해 새 게시글에서도 뷰어가 자동으로 열려 끊김 없이 사진을 감상할 수 있는 2차원 내비게이션 기능입니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `CONFIG.STORAGE_KEY_AUTO_OPEN`, `CONFIG.POST_NAV_DELAY`, 행 정보 구조체 정의
  - 📂 구현: [`src/config.js`](../../../src/config.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / DOM Parser]**: `getAdjacentPostUrl()`, 데스크톱/모바일 테이블 크롤링, 공지/광고 필터링, `crt_icon` 현재 글 식별(DEFECT-01 해결)
  - 📂 구현: [`src/parser/post_navigator.js`](../../../src/parser/post_navigator.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Navigation Controller]**: `navigatePost('up'|'down')`, `sessionStorage` 기반 연속 감상 모드 전환, 경계 도달 토스트 안내
  - 📂 구현: [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Shortcuts & Notice Bar]**: `handleKeyDown`에 `↑`/`↓`/`W`/`S` 바인딩, 하단 키힌트 바 업데이트, 사진 없는 글 알림 바(`#disagall-no-photo-notice`) 마운트
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-25 / `user-journey-tester` / **Dimension B & C: Boundary & Negative QA (`TC-BD-01` ~ `TC-NG-03`)** 검증 완료 (`7/7 PASS`, 누적 `11/11 100% PASS`, 신규 결함 `0건`, **`🟢 Sign-Off`** 확정)
- **생성/수정된 핵심 파일**:
  - `tests/post_navigation_e2e.test.js`: 빌드된 `content.js` 번들 기반 전체 E2E 스위트 (`TC-HP-01`~`TC-HP-04`, `TC-BD-01`~`TC-BD-04`, `TC-NG-01`~`TC-NG-03` 11/11 PASS) 확장
  - `docs/features/post-navigation/evidence/`: Chrome 158 Headless CDP B&N 스크린샷 3건(`tc-bd-01-bottom-boundary-toast.png`, `tc-bd-02-mobile-list-auto-open.png`, `tc-ng-02-unavailable-toast.png`) 및 `boundary-negative-qa.log` 추가
  - `docs/features/post-navigation/verification.md`: 11개 테스트 시나리오 매트릭스 전량 `✅ PASS` (`100%`) 및 `🟢 Sign-Off` 갱신
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/post_navigation_e2e.test.js`: Happy Path + Boundary & Negative `11/11 PASS` (빌드 번들 `content.js` VM E2E)
  - Chrome 158 Headless CDP E2E (`test_page*.html`, `dc_sample.html`, 모바일/경계/비안전 URL/8초 타이머/경합 시나리오): `TC-HP-01~04` + `TC-BD-01~04` + `TC-NG-01~03` 전량 `PASS`, `content.js` 런타임 예외 `0건`
  - `npm test` && `node tests/immersion_e2e.test.js`: 단위 5개 스위트 전량 PASS & E2E 15/15 PASS
- **Recent Commits**:
  - `7dd3656` - `test(post-navigation): add built-bundle E2E QA suite for Happy Path and Boundary/Negative`
  - `849a3d4` - `refactor(post-navigation): return backward-compatible discriminated result from getAdjacentPostUrl`
  - `d0bc853` - `test(post-navigation): add regression tests for REFACTOR-05 discriminated result contract`
  - `40ec587` - `fix(post-navigation): track and cancel navigation timeout and auto-open polling timers`
  - `f55f8b3` - `test(post-navigation): add regression tests for DEFECT-04 timer and polling conflicts`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `post-navigation` 포함 전 도메인 QA `🟢 Sign-Off` 완료 (신규 기능 기획/릴리즈 패키징 대기).
