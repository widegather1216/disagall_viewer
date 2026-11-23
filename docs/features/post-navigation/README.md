# 📦 [post-navigation] 위/아래 방향키 게시글 탐색 (Post Navigation)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 1건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-23 / `systematic-debugger` / `DEFECT-03` (`post_navigator.js` 하단 경계 `'bottom'` 도달 불가, 공지/AD `innerHTML` 우회 및 `javascript:` URL 통과) 해결 및 회귀 검증 완료
- **생성/수정된 핵심 파일**:
  - `src/parser/post_navigator.js`: `isSafeNavigationHref()`·`isSafePostLink()`·`isExcludedPostElement()` 도입, `isDesktopPostRowValid()`/`isMobilePostItemValid()` `공지`/`AD`/`설문` 선행 필터링 및 `innerHTML.includes` 제거, `getAdjacentPostUrl()` `'top'`/`'bottom'` 경계 분기 교정
  - `src/controller/viewer_controller.js`: `navigatePost()` 내 `isSafeNavigationHref(result.url)` 이중 가드 추가
  - `tests/post_navigation.test.js`: Test 9 (`DEFECT-03` 실제 `src/parser/post_navigator.js`·`navigatePost`·`dc_sample.html` 연동 회귀 테스트) 추가
  - `content.js`, `disagall_viewer.user.js`: `npm run build` 번들 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/post_navigation.test.js`: 9/9 PASS (Test 4 선택적 `live_post.html` 미존재로 skip)
  - `npm test` && `node tests/immersion_e2e.test.js`: 5개 단위 스위트 전량 PASS & E2E 15/15 PASS
  - `npm run build` && `node --check`: PASS
- **Recent Commits**:
  - `22a5e6d` - `fix(post-navigation): fix bottom boundary return, notice/ad filtering, and unsafe href schemes`
  - `a52567b` - `test(post-navigation): add regression tests for DEFECT-03 boundaries, filters, and URL sanitization`
  - `0db8e14` - `fix(post-navigation): prevent no-photo notice keydown leak and input interception`
  - `f97ae7a` - `test(post-navigation): add regression tests for DEFECT-02 notice lifecycle and key guards`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `DEFECT-04`(`navigatePost()` 미취소 `setTimeout` 및 `startAutoOpenPolling()` 고아 `setInterval` 충돌) 및 `REFACTOR-05` 잔여.
