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

- **직전 완료 작업**: 2026-11-23 / `systematic-debugger` / `DEFECT-01` 해결 (`content.css` `#disagall-quick-launcher` 플로팅 스타일 복구, `build.js` `syncSafariResources()` 9종 자동 동기화 통합, `disagall_viewer.zip` 재생성 및 `🟢 Sign-Off` 전환)
- **생성/수정된 핵심 파일**:
  - `content.css`: `#disagall-quick-launcher` 및 `:hover` 스타일 복구 (Userscript `__INJECTED_CSS__` 반영)
  - `build.js`: `EXTENSION_ASSETS` 9종을 `safari_extension/DisagallViewerSafari/DisagallViewerSafari Extension/Resources/`로 복사하는 `syncSafariResources()` 추가
  - `tests/module_import.test.js`: Test 4 (`DEFECT-01` 런처 CSS 인라인 주입 및 Safari 9종 에셋 바이트 일치 검증) 추가
  - 산출물 동기화: `content.js`, `disagall_viewer.user.js`, `disagall_viewer.zip`, `safari_extension/.../Resources/` 9종
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/module_import.test.js` (`4/4 PASS`), `npm test` (5개 스위트 전량 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `npm run pack` (`PASS`), `node --check` (`PASS`)
- **Recent Commits**:
  - `e7f1fcd` - `fix(bundler): restore quick-launcher CSS and sync Safari extension resources`
  - `f7e5eb8` - `test(bundler): add regression test for quick-launcher CSS and Safari asset parity`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `modular-bundler-migration` 도메인 미해결 티켓 `0건` (`🟢 Sign-Off`). 잔여 타 도메인 티켓(`post-navigation/REFACTOR-05`) 진행 가능.
