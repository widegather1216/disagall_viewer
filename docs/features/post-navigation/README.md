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

- **직전 완료 작업**: 2026-11-07 / `interactive-feature-planner` / `post-navigation` 도메인 위키 표준화 및 5대 문서군(`architecture.md`, `spec.md` 등) 정비 완료
- **생성/수정된 핵심 파일**:
  - `src/parser/post_navigator.js`: 게시판 목록 파싱 및 스마트 사진글 스킵 알고리즘
  - `src/controller/viewer_controller.js`: 세션 플래그 설정 및 연속 감상 부트스트랩
  - `tests/post_navigation.test.js`: 통합 단위 테스트 7종 검증
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/post_navigation.test.js`: 전 케이스 PASS
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - 디시 목록에서 현재 글(`crt`)은 글 번호가 빈 문자열(`""`)일 수 있으므로 번호 대신 `crt_icon`이나 `className`으로 판별해야 함.
  - `sessionStorage` 키는 읽은 직후 `removeItem`하여 새로고침 시 무한 뷰어 오픈 루프를 방지할 것.
