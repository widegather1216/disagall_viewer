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
  - 📂 구현: [`src/controller/post_nav_controller.js`](../../../src/controller/post_nav_controller.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Shortcuts & Notice Bar]**: `handleKeyDown`에 `↑`/`↓`/`W`/`S` 바인딩, 하단 키힌트 바 업데이트, 사진 없는 글 알림 바(`#disagall-no-photo-notice`) 마운트
  - 📂 구현: [`src/ui/no_photo_notice.js`](../../../src/ui/no_photo_notice.js), [`src/ui/dom_guards.js`](../../../src/ui/dom_guards.js), [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/post_navigation.test.js`](../../../tests/post_navigation.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-25 / `systematic-debugger` / `post-navigation` `REFACTOR-15` 해결 (`post_navigator.js` 방어·평탄화, `no_photo_notice.js`·`dom_guards.js`·`post_nav_controller.js` 단방향 SRP 분리 및 re-export 호환 유지, **`🟢 Sign-Off` 확정**)
- **생성/수정된 핵심 파일**:
  - `src/parser/post_navigator.js`: `getClassNameString()`/`getTrimmedText()`/`queryPostTitleLink()`/`findTargetPostIndex()`/`buildFoundPostResult()` 추출, `direction` 검증 및 `SVGAnimatedString`/null 방어 적용
  - `src/ui/no_photo_notice.js`, `src/ui/dom_guards.js`, `src/ui/overlay.js`: `showNoPhotoNotice`/`dismissNoPhotoNotice` 및 공용 가드 단방향 분리·콜백/DOM/window/타이머 `fired` 가드 보강(`overlay.js` re-export 유지)
  - `src/controller/post_nav_controller.js`, `src/controller/viewer_controller.js`: `navigatePost`/`checkAutoOpen`/`runAutoOpenPollTick` 분리 및 `setPostNavCallbacks()` 콜백 주입(`viewer_controller.js` re-export 유지)
  - `tests/post_navigation.test.js`, `content.js`, `disagall_viewer.user.js`, Safari Resources: `<svg class="icon_img">`·null 텍스트·무콜백 알림 바·비정상 방향 단언 추가 및 번들 동기화
  - `docs/features/post-navigation/architecture.md`, `verification.md`, `README.md`, `00_core_foundation/architecture.md`, `docs/README.md`: `REFACTOR-15` `🟢 RESOLVED` 및 **`🟢 Sign-Off`** 반영
- **검증 완료된 테스트 실행 명령어**:
  - `node --check` (`PASS`), `npm run build` (`PASS`), `npm test` (`5개 스위트 PASS` · `post_navigation.test.js` 11/11 `PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`)
- **Working Tree State**: 🟡 Modified (미커밋: `REFACTOR-15` 리팩토링·테스트·번들·위키 동기화, 커밋은 부모 코디네이터가 수행)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `post-navigation` 도메인은 `0 DEFECT / 0 REFACTOR` **`🟢 Sign-Off`** 상태입니다. 잔여 전체 도메인 우선순위는 `core-viewer` `REFACTOR-02`입니다.
