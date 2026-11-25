# 📦 [modular-bundler-migration] 모듈화 및 esbuild 번들러 파이프라인 (Modular Bundler)

- **현재 상태 (Lifecycle)**: `🟢 Sign-Off`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
기존 단일 거대 스크립트로 얽혀 있던 `content.js`와 `disagall_viewer.user.js`를 단일 책임 원칙(SRP)에 따라 계층별 ES Module(`src/`) 구조로 분리하고, 초경량 번들러 `esbuild`를 통해 단 한 번의 빌드로 Chrome 확장 프로그램과 Tampermonkey/Safari 유저스크립트를 동시 자동 생성하는 빌드/아키텍처 파이프라인입니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `package.json` 및 `esbuild` 환경 구축, 전역 상수(`CONFIG`) 및 런타임 상태 구조체 분리
  - 📂 구현: [`package.json`](../../../package.json), [`src/config.js`](../../../src/config.js), [`src/state.js`](../../../src/state.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Pure Domain Parsers]**: `src/parser/` 하위로 DOM 파서 순수 함수 분리(`image_parser`, `post_navigator`, `recommend_parser`)
  - 📂 구현: [`src/parser/image_parser.js`](../../../src/parser/image_parser.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / UI & Controllers]**: `src/ui/` 줌앤팬 엔진/오버레이 분리 및 `src/controller/` 네비게이션/추천 컨트롤러 오케스트레이션
  - 📂 구현: [`src/ui/zoom_pan.js`](../../../src/ui/zoom_pan.js), [`src/controller/viewer_controller.js`](../../../src/controller/viewer_controller.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Bundler & Packaging]**: `build.js` 파이프라인 구축 (배너 삽입, CSS 인라인 define 주입), `npm run pack` ZIP 생성 및 전체 테스트 PASS
  - 📂 구현: [`build.js`](../../../build.js) | 🧪 테스트: [`tests/module_import.test.js`](../../../tests/module_import.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-25 / `systematic-debugger` / `REFACTOR-01` 해결 — `tests/helpers/fake_timer_env.js` 공용화, 무단언 스크래치 2종 삭제, `build.js` 헬퍼 분리(`<= 25`줄), `package.json` `npm test` 7개 스위트(단위 5+E2E 2) 연동 및 `🟢 Sign-Off` 확정
- **생성/수정/삭제된 핵심 파일**:
  - `tests/helpers/fake_timer_env.js` (신규), `tests/immersion_e2e.test.js`, `tests/post_navigation_e2e.test.js`: `createFakeTimerEnv()` 공용화
  - `tests/test_dc_sample.js`, `tests/test_rows_dc.js`: 삭제
  - `build.js`: `buildExtensionBundle()`, `buildUserscriptBundle()`, `build()` 각 `<= 25`줄 분리
  - `package.json`, `docs/features/modular-bundler-migration/spec.md`: `npm test` 7개 스위트 연동 및 문서 동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm run pack` (`PASS`), `npm test` (`7개 스위트 전량 PASS`), `for f in src/*.js src/*/*.js popup.js background.js build.js; do node --check "$f"; done` (`PASS`)
- **Recent Commits**:
  - `c70cc78` - `docs(bundler): mark REFACTOR-01 resolved and sign off all domains`
  - `bfc05ff` - `test(e2e): wire E2E suites into npm test, share fake timer env, and remove scratch scripts`
  - `ad9dc77` - `refactor(bundler): modularize build steps and update release bundle artifacts`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - 전 도메인 잔여 미해결 티켓 없음(`0건`). 릴리즈 배포 준비 완료.
