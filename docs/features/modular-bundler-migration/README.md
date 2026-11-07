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

- **직전 완료 작업**: 2026-11-07 / `interactive-feature-planner` / `modular-bundler-migration` 5대 도메인 위키 표준화 및 문서 정비 완료
- **생성/수정된 핵심 파일**:
  - `build.js`: `esbuild` 기반 멀티 타겟 번들링 스크립트
  - `package.json`: 빌드/테스트/패키징 스크립트 SSOT
- **검증 완료된 테스트 실행 명령어**:
  - `npm run build`: 100ms 내 번들 생성 확인
  - `npm test`: 전체 3개 테스트 스위트 PASS 확인
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `content.js` 및 `disagall_viewer.user.js`는 빌드 산출물이므로 절대로 직접 수정하지 말고, 반드시 `src/`와 `content.css`를 수정한 뒤 `npm run build`를 실행할 것.
