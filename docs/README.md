# 🧭 Disagall Viewer Master Control Tower (Living Wiki Hub)

> **최종 업데이트**: 2026-11-22 (by `systematic-debugger`)

## 🎯 1. Current Spotlight (현재 포커스 & 다음 추천 액션)

- **Active 도메인**: 전 도메인 (`core-viewer`, `post-navigation`, `post-recommend`, `viewer-immersion`, `modular-bundler-migration`)
- **현재 단계 (Stage)**: `🩹 Debugging` (`잔여 결함 9건 OPEN` — P0 1건 / P1 8건; `core-viewer/DEFECT-01`, `post-navigation/DEFECT-02`, `post-recommend/DEFECT-03` 해결 완료)
- **직전 완료 작업**: `systematic-debugger`로 `post-recommend/DEFECT-03` (셀렉터 자가 매칭·오클릭 제거, `dispatchRecommendClick` 실패 처리 및 `state` 타이머 정리) 해결, `tests/recommend.test.js`(8/8)·`npm test`·`immersion_e2e.test.js`(15/15)·`npm run build`·`node --check` PASS (`post-recommend` `🟢 Sign-Off`)
- **👉 다음 추천 프롬프트 (복사해서 바로 실행)**:
  > `viewer-immersion/DEFECT-01` (남은 P0 1건) 및 `core-viewer/DEFECT-02` 순차 디버깅해줘

---

## 📊 2. 전체 도메인 진행 현황판 (Master Progress Matrix)

| 도메인 (Bounded Context) | 생명주기 상태 | 구현 진척도 (Step 1~4) | QA 인수 통과율 | 미해결 티켓 (`🚨D` / `🧐R`) | 최근 작업 요약 |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [`00_core_foundation`](./features/00_core_foundation/architecture.md) | 🟢 Stable | `[■■■■] 4/4` | - | `0 / 0` | 전역 아키텍처 헌법 및 기술 스택/동시성 제약 확립 |
| [`core-viewer`](./features/core-viewer/README.md) | 🩹 Debugging | `[■■■■] 4/4` | `5/9 (56%)` | `3 / 0` | `DEFECT-01` 해결 완료, `DEFECT-02~04` 잔여 (이미지 레이스, 드래그 닫힘, 지연 로딩 우클릭) |
| [`post-navigation`](./features/post-navigation/README.md) | 🩹 Debugging | `[■■■■] 4/4` | `-` | `2 / 1` | `DEFECT-02` 해결 완료, `DEFECT-03~04` 잔여 (`'bottom'` dead code, 이동/폴링 타이머 충돌) |
| [`post-recommend`](./features/post-recommend/README.md) | 🟢 Sign-Off | `[■■■■] 4/4` | `6/6 (100%)` | `0 / 0` | `DEFECT-03` 해결 완료 (우선순위 셀렉터·뷰어 배제·디스패치 실패/타이머 정리) |
| [`modular-bundler-migration`](./features/modular-bundler-migration/README.md) | 🩹 Debugging | `[■■■■] 4/4` | `1/3 (33%)` | `1 / 0` | `DEFECT-01` 등록 (Safari v1.0.0 번들 미동기화 및 `#disagall-quick-launcher` CSS 누락) |
| [`viewer-immersion`](./features/viewer-immersion/README.md) | 🩹 Debugging | `[■■■■■■■■] 8/8` | `4/6 (67%)` | `3 / 0` | `DEFECT-01~03` 등록 (전체화면 Promise 레이스, `mouseleave` 숨김 취소, `defaultPadding` sync) |

*(※ 상태 범례: `📐 Planning` | `🛠️ Implementing` | `🧐 Auditing` | `🧪 QA Testing` | `🩹 Debugging` | `🟢 Sign-Off`)*
*(※ 미해결 티켓: `🚨D` = Open `DEFECT-xx` 개수, `🧐R` = Open `REFACTOR-xx` 개수)*

---

## 🕒 3. 최근 세션 타임라인 (Recent Session Changelog)

- **`[2026-11-22]` `[atomic-commit-crafter]` [`post-recommend`]**: `9acefcd` (`fix(post-recommend)` `DEFECT-03`), `dc974f8` (`test(post-recommend)` Test 8 회귀 테스트) 및 `🟢 Sign-Off` 위키/관제탑 동기화 커밋 완료.
- **`[2026-11-22]` `[systematic-debugger]` [`post-recommend`]**: `DEFECT-03` 해결 및 `🟢 Sign-Off` 전환 — `RECOMMEND_BUTTON_PRIORITY_SELECTORS` 순회·`#disagall-*` 배제·`button[data-no]`/`[onclick*="recom"]` 등 오탐 셀렉터 제거·`dispatchRecommendClick()` 실패 시 토스트/타이머 차단·`state.recommendTimers` 수명주기 정리 및 `tests/recommend.test.js`(8/8)·`npm test`·`immersion_e2e.test.js`(15/15)·`npm run build` PASS.
- **`[2026-11-22]` `[atomic-commit-crafter]` [`post-navigation`]**: `0db8e14` (`fix(post-navigation)` `DEFECT-02`), `f97ae7a` (`test(post-navigation)` Test 8 회귀 테스트) 및 위키/관제탑 동기화 커밋 완료.
- **`[2026-11-21]` `[systematic-debugger]` [`post-navigation`]**: `DEFECT-02` 해결 — `state.noPhotoNoticeTimer` 등록·`dismissNoPhotoNotice()`/`dismissNotice()` 멱등 정리·`isEditableTarget`/`isExternalModalOpen`/수정자 키/한글 IME(`KeyW`/`KeyS`) 가드·`openViewer()`/`closeViewer()` 연동 및 `tests/post_navigation.test.js`(8/8)·`npm test`·`immersion_e2e.test.js`(15/15)·`npm run build` PASS.
- **`[2026-11-21]` `[atomic-commit-crafter]` [`core-viewer`]**: `ca063d3` (`fix(core-viewer)` `DEFECT-01`), `eff67f6` (`test(core-viewer)` 회귀 테스트 3건) 및 위키/관제탑 동기화 커밋 완료.
- **`[2026-11-21]` `[systematic-debugger]` [`core-viewer`]**: `DEFECT-01` 해결 — `#disagall-viewer-overlay` 파서 제외·`userscript.js` 캡처 `click` 3중 가드·`openViewer()` `!wasActive` 스크롤 백업 가드 적용 및 `tests/core_viewer.test.js`(3/3)·`npm test`·`immersion_e2e.test.js`(15/15)·`npm run build` PASS.
- **`[2026-11-19]` `[atomic-commit-crafter]` [전 도메인]**: `36851e1` (`feat(immersion)` ADR-05/06), `a7bc857` (`test(immersion)` 26개 단위/14개 E2E), 위키·결함 티켓 문서 원자적 커밋 및 핸드오프 동기화 완료.
- **`[2026-11-19]` `[deep-bug-hunter]` [전 도메인]**: 3-Lens 병렬 적대적 결함 헌팅 및 실증 프로빙 완료 — 5개 도메인(`core-viewer`, `post-navigation`, `post-recommend`, `viewer-immersion`, `modular-bundler-migration`)에 총 12건의 실증 `DEFECT` 티켓 등록 및 관제판 `🩹 Debugging` 전환.
- **`[2026-11-19]` [`viewer-immersion`]**: `ADR-06` 전체화면 모드 UX(`#disagall-btn-fullscreen` 헤더 버튼, `fullscreenchange` 동기화, 임시 여백 `0px`+즉시 UI 숨김, 팝업 `#auto-fullscreen-toggle` 및 User Gesture 차단 폴백) 구현, 문서 `[As-Is]` 승격 및 `npm run build`·`npm test`(25/25)·`immersion_e2e.test.js`(14/14) PASS.

- **`[2026-11-19]` [`viewer-immersion`]**: `ADR-05` UI 숨김 시 사진 영역 확장(`content.css` 헤더/푸터 절대 배치 및 스테이지 패딩 트랜지션, `overlay.js` 동적 피팅, `immersion_controller.js`/`zoom_pan.js` 줌 보호·동기화) 구현, 문서 `[As-Is]` 승격 및 `npm run build`·`npm test`(22/22)·`immersion_e2e.test.js`(11/11) PASS.

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
