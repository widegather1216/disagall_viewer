# 🧭 Disagall Viewer Master Control Tower (Living Wiki Hub)

> **최종 업데이트**: 2026-11-19 (by `atomic-commit-crafter`)

## 🎯 1. Current Spotlight (현재 포커스 & 다음 추천 액션)

- **Active 도메인**: [`viewer-immersion`](./features/viewer-immersion/README.md)
- **현재 단계 (Stage)**: `🟢 Sign-Off` (`구현 4/4`, `QA 4/4 (100% — 8/8 Scenarios PASS)`, 감사 티켓 `0건` 완료)
- **직전 완료 작업**: `viewer-immersion` `REFACTOR-03` 해결·원자적 커밋 완료(`bd57dbd`, `0cf815f`) 및 최종 **`🟢 Sign-Off`** 확정 (`node --check`·`npm test`·`immersion_e2e.test.js` 8/8·`npm run build` PASS)
- **👉 다음 추천 프롬프트 (복사해서 바로 실행)**:
  > `npm run pack`으로 배포용 ZIP 패키징 또는 신규 기능 기획(`"새 기능 기획해줘"`)

---

## 📊 2. 전체 도메인 진행 현황판 (Master Progress Matrix)

| 도메인 (Bounded Context) | 생명주기 상태 | 구현 진척도 (Step 1~4) | QA 인수 통과율 | 미해결 티켓 (`🚨D` / `🧐R`) | 최근 작업 요약 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [`00_core_foundation`](./features/00_core_foundation/architecture.md) | 🟢 Stable | `[■■■■] 4/4` | - | `0 / 0` | 전역 아키텍처 헌법 및 기술 스택/동시성 제약 확립 |
| [`core-viewer`](./features/core-viewer/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `5/5 (100%)` | `0 / 0` | 본문 이미지 파싱, 화면 맞춤 피팅, 줌앤팬 엔진 문서화 완료 |
| [`post-navigation`](./features/post-navigation/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `5/5 (100%)` | `0 / 0` | 위/아래 방향키 게시글 탐색 및 연속 감상 모드 문서화 완료 |
| [`post-recommend`](./features/post-recommend/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `4/4 (100%)` | `0 / 0` | 뷰어 내 개념글 추천(개추) 연동 및 실시간 카운트 업 문서화 완료 |
| [`modular-bundler-migration`](./features/modular-bundler-migration/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `3/3 (100%)` | `0 / 0` | esbuild 기반 멀티 플랫폼 번들러 파이프라인 문서화 완료 |
| [`viewer-immersion`](./features/viewer-immersion/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `4/4 (100%)` | `0 / 0` | 전체 QA `8/8 PASS`, `REFACTOR-01~03` 전량 해결 및 최종 Sign-Off 완료 |

*(※ 상태 범례: `📐 Planning` | `🛠️ Implementing` | `🧐 Auditing` | `🧪 QA Testing` | `🩹 Debugging` | `🟢 Sign-Off`)*
*(※ 미해결 티켓: `🚨D` = Open `DEFECT-xx` 개수, `🧐R` = Open `REFACTOR-xx` 개수)*

---

## 🕒 3. 최근 세션 타임라인 (Recent Session Changelog)

- **`[2026-11-19]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `bd57dbd`, `0cf815f` 커밋 완료 — `REFACTOR-03` (`popup.js` 분할·디바운스·타입 가드) 반영 및 최종 **`🟢 Sign-Off`** 확정.
- **`[2026-11-19]` `[systematic-debugger]` [`viewer-immersion`]**: `REFACTOR-03` 해결 및 최종 **`🟢 Sign-Off`** 전환 — `popup.js` 헬퍼 분할·`onChanged` 타입/키 삭제 가드·슬라이더 250ms 디바운스/`change` 저장 보강 (`node --check`·`npm test`·`immersion_e2e.test.js` 8/8·`npm run build` PASS).
- **`[2026-11-19]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `955fc2e`, `8f52787` 커밋 완료 — `REFACTOR-02` (`immersion_controller.js` 분리·디바운스) 및 회귀 테스트 반영.
- **`[2026-11-19]` `[systematic-debugger]` [`viewer-immersion`]**: `REFACTOR-02` 해결 — `immersion_controller.js` 분리, 패딩 슬라이더 디바운스/`change` 저장 최적화 및 빈 `catch` 3곳 보강 (`npm test`·`immersion_e2e.test.js` 8/8·`npm run build` PASS).

- **`[2026-11-19]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `addff3a` 커밋 완료 — 번들 E2E QA 스위트(`tests/immersion_e2e.test.js`), `ADR-04` 스펙 역갱신 및 8/8 QA 증적·위키 반영.
- **`[2026-11-18]` `[user-journey-tester]` [`viewer-immersion`]**: Boundary & Negative (`TC-BD-01`, `TC-BD-02`, `TC-NG-01`, `TC-NG-02`) Chrome CDP·번들 E2E(`tests/immersion_e2e.test.js`) 검증 `4/4 PASS` (전체 QA `8/8 PASS`, `DEFECT 0건`, `REFACTOR-02~03` 2건 잔여).
- **`[2026-11-18]` `[user-journey-tester]` [`viewer-immersion`]**: Happy Path (`TC-HP-01`~`TC-HP-04`) Chrome 157 CDP·번들 E2E(`tests/immersion_e2e.test.js`) 검증 `4/4 PASS` (`DEFECT 0건`, 증적 확보).
- **`[2026-11-18]` `[clean-code-auditor]` [`viewer-immersion`]**: 8개 대상 파일 7대 매트릭스 클린코드 품질 감사 완료 (`🟡 Should Fix` `REFACTOR-01~03` 발행, `npm test` 4/4 PASS).

- **`[2026-11-18]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `f491117`, `e7f3748` 커밋 완료 — Step 4 [UI & Integration / Overlay & Styling] 및 단위 테스트 반영.
- **`[2026-11-18]` `[clean-code-developer]` [`viewer-immersion`]**: Step 4 [UI & Integration / Overlay & Styling] 구현, CSS/오버레이/팝업 연동, `tests/immersion.test.js` 17개 테스트·빌드 검증 및 스펙 `[As-Is]` 승격 병합 완료.
- **`[2026-11-18]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `a76071f`, `42f57e5` 커밋 완료 — Step 3 [Domain Service & State / Controller & Timer] 및 단위 테스트 반영.
- **`[2026-11-18]` `[clean-code-developer]` [`viewer-immersion`]**: Step 3 [Domain Service & State / Controller & Timer] 구현, 유휴 타이머·단축키 H/F·가드레일 연동 및 `tests/immersion.test.js` 14개 테스트 검증 완료.
- **`[2026-11-07]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `ba1f51e`, `249468e` 커밋 완료 — Step 2 [Data Access & API / Storage & Popup] 및 단위 테스트 반영.
- **`[2026-11-07]` `[clean-code-developer]` [`viewer-immersion`]**: Step 2 [Data Access & API / Storage & Popup] 구현, `popup.html`/`popup.js` 스토리지 동기화 및 `tests/immersion.test.js` 검증 완료.
- **`[2026-11-07]` `[atomic-commit-crafter]` [`viewer-immersion`]**: `2790e49`, `a6bb1a1` 커밋 완료 — Step 1 [Schema & Types / Config & Constants] 및 단위 테스트 반영.
- **`[2026-11-07]` `[clean-code-developer]` [`viewer-immersion`]**: Step 1 [Schema & Types / Config & Constants] 구현, `tests/immersion.test.js` 작성, 전역 회귀 및 번들 빌드 검증 완료.
- **`[2026-11-07]` `[atomic-commit-crafter]` [전 도메인]**: `ecd1d6d`, `6e91e93` 커밋 완료 — 기존 코드베이스(`core-viewer`, `post-navigation`, `post-recommend`, `modular-bundler-migration`) 및 `viewer-immersion` Living Wiki 표준화.
- **`[2026-11-07]` `[interactive-feature-planner]` [`viewer-immersion`]**: 몰입 모드 풀패키지(2.5초 자동 숨김, 단축키 H/F, 팝업 On/Off 토글) 기획 및 도메인 위키 산출물 작성 완료.
- **`[2026-10-10]` `[clean-code-developer]` [`modular-bundler-migration`]**: `src/` 디렉토리 모듈화 및 `esbuild` 번들링 파이프라인 구축 완료.
- **`[2026-10-09]` `[clean-code-developer]` [`post-recommend`]**: 헤더 개추 버튼 마크업, DOM 연동, `r`/`c` 단축키 바인딩 및 단위 테스트 완료.
- **`[2026-10-08]` `[clean-code-developer]` [`post-navigation`]**: 상하 방향키(`↑`/`↓`) 기반 연속 감상 모드(`sessionStorage`) 및 게시판 탐색기 구현 완료.

---

## 📚 4. 전역 규칙 및 도메인 위키 가이드

- **전역 아키텍처 헌법**: [`docs/features/00_core_foundation/architecture.md`](./features/00_core_foundation/architecture.md)
- **문서 관리 원칙**:
  1. 모든 단일 마크다운 문서는 에이전트 컨텍스트 집중력을 위해 **최대 250줄 이내**를 유지합니다.
  2. 기구현 스펙(`[As-Is]`)과 신규 개발 스펙(`[To-Be]`)을 엄격히 분리하고, 구현 완료 시 `[As-Is]`로 승격합니다.
