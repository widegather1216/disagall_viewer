# 🧭 Disagall Viewer Master Control Tower (Living Wiki Hub)

> **최종 업데이트**: 2026-11-07 (by `atomic-commit-crafter`)

## 🎯 1. Current Spotlight (현재 포커스 & 다음 추천 액션)

- **Active 도메인**: [`viewer-immersion`](./features/viewer-immersion/README.md)
- **현재 단계 (Stage)**: `🛠️ Implementing` (Step 1 완료, Step 2 스토리지 & 팝업 연동 개발 대기)
- **직전 완료 작업**: `viewer-immersion` 도메인 Step 1 [Schema & Types / Config & Constants] 구현 및 3단 검증(신규 단위 테스트 + 전역 회귀 + 빌드) 통과
- **👉 다음 추천 프롬프트 (복사해서 바로 실행)**:
  > `"viewer-immersion 도메인 Step 2 개발 진행해줘"`

---

## 📊 2. 전체 도메인 진행 현황판 (Master Progress Matrix)

| 도메인 (Bounded Context) | 생명주기 상태 | 구현 진척도 (Step 1~4) | QA 인수 통과율 | 미해결 티켓 (`🚨D` / `🧐R`) | 최근 작업 요약 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [`00_core_foundation`](./features/00_core_foundation/architecture.md) | 🟢 Stable | `[■■■■] 4/4` | - | `0 / 0` | 전역 아키텍처 헌법 및 기술 스택/동시성 제약 확립 |
| [`core-viewer`](./features/core-viewer/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `5/5 (100%)` | `0 / 0` | 본문 이미지 파싱, 화면 맞춤 피팅, 줌앤팬 엔진 문서화 완료 |
| [`post-navigation`](./features/post-navigation/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `5/5 (100%)` | `0 / 0` | 위/아래 방향키 게시글 탐색 및 연속 감상 모드 문서화 완료 |
| [`post-recommend`](./features/post-recommend/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `4/4 (100%)` | `0 / 0` | 뷰어 내 개념글 추천(개추) 연동 및 실시간 카운트 업 문서화 완료 |
| [`modular-bundler-migration`](./features/modular-bundler-migration/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `3/3 (100%)` | `0 / 0` | esbuild 기반 멀티 플랫폼 번들러 파이프라인 문서화 완료 |
| [`viewer-immersion`](./features/viewer-immersion/README.md) | 🛠️ Implementing | `[■□□□] 1/4` | `⏳ Pending (0/4)` | `0 / 0` | CONFIG 상수 및 state 런타임 상태 정의, 유닛 테스트 통과 |

*(※ 상태 범례: `📐 Planning` | `🛠️ Implementing` | `🧐 Auditing` | `🧪 QA Testing` | `🩹 Debugging` | `🟢 Sign-Off`)*
*(※ 미해결 티켓: `🚨D` = Open `DEFECT-xx` 개수, `🧐R` = Open `REFACTOR-xx` 개수)*

---

## 🕒 3. 최근 세션 타임라인 (Recent Session Changelog)

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
