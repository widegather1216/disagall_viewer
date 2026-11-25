# 📦 [post-navigation] 위/아래 방향키 게시글 탐색 (Post Navigation)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-25 / `clean-code-auditor` / 전 도메인 클린코드 전수 감사 완료 — `post-navigation` `REFACTOR-14`(🔴 Must Fix)·`REFACTOR-15`(🟡 Should Fix) 발행 및 `spec.md` 셀렉터 역동기화 (`🩹 Debugging` 전환)
- **생성/수정된 핵심 파일**:
  - `docs/features/post-navigation/verification.md`: `REFACTOR-14` (`tests/post_navigation.test.js` Tests 1~7 로컬 복제 스텁 제거 및 실모듈 검증 전환), `REFACTOR-15` (`post_navigator.js` SVG `className` 가드·함수 길이/중첩 정리, `showNoPhotoNotice` 분리, `post_nav_controller.js` 분리) 등록
  - `docs/features/post-navigation/spec.md`: `.gall_listwrap`·`.gall-thum-btm li`·사진 아이콘 셀렉터 역동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm test` (`5개 스위트 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node --check` (`PASS`)
- **Working Tree State**: 🟡 Docs Modified (위키 감사 리포트/스펙 역동기화 반영 중)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - 최우선 해결 대상: `post-navigation` 도메인 `REFACTOR-14` (`tests/post_navigation.test.js` Tests 1~7 실모듈 검증 전환, `systematic-debugger` 연결).
