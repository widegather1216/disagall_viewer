# 📦 [post-recommend] 뷰어 내 개념글 추천 연동 (Post Recommend)

- **현재 상태 (Lifecycle)**: `🟢 Sign-Off`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시 사진 뷰어로 사진을 감상하는 도중, 뷰어를 닫고 본문 하단으로 스크롤할 필요 없이 상단 헤더의 버튼이나 단축키(`r` / `c`)를 통해 현재 게시글에 개념글 추천(개추)을 누를 수 있는 편의 기능입니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `RECOMMEND_THROTTLE_MS`(1500ms), 2단계 갱신 지연(`[500, 1200]`) 상수 및 추천 정보 구조체 정의
  - 📂 구현: [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Recommend Parser]**: 본문 추천 버튼 탐색(`findNativeRecommendButton`), 추천 수 파싱(`getPostRecommendCount`), 투표 가능 여부 검증
  - 📂 구현: [`src/parser/recommend_parser.js`](../../../src/parser/recommend_parser.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Recommend Controller]**: `triggerPostRecommend()`, 단일 클릭 디스패치(DEFECT-01), `on` 클래스 사전 가드 제거(DEFECT-02), 2단계 카운트 업 동기화
  - 📂 구현: [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: 헤더 개추 버튼 마크업(`#disagall-btn-recommend`), `r`/`c` 단축키 바인딩, 하단 키힌트 추가, `content.css` 모던 블루 포인트 스타일 적용
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-22 / `systematic-debugger` / `DEFECT-03` 해결 (`RECOMMEND_BUTTON_PRIORITY_SELECTORS` 우선순위 순회·`#disagall-*` 배제·오탐 셀렉터 제거·`dispatchRecommendClick()` 반환값 검증·`state.recommendTimers` 수명주기 정리)
- **생성/수정된 핵심 파일**:
  - `src/parser/recommend_parser.js`: 우선순위 배열 순회(`findFirstValidMatch`), 오버레이/뷰어 내부 배제(`isExcludedRecommendElement`), 비활성/분리 가드(`isRecommendButtonDisabled`, `dispatchRecommendClick`)
  - `src/controller/recommend_controller.js`: `dispatchRecommendClick` 실패 처리, `clearRecommendTimers()` 및 활성 오버레이 가드
  - `src/state.js` / `src/controller/viewer_controller.js`: `recommendTimers`/`recommendUnlockTimer` 등록 및 `closeViewer()` 정리 연동
  - `tests/recommend.test.js`: Test 8 (`DEFECT-03` 실모듈 회귀 테스트 추가, 8/8 PASS)
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/recommend.test.js` (`8/8 PASS`), `npm test` (전 스위트 `PASS`), `node tests/immersion_e2e.test.js` (`15/15 PASS`), `npm run build` (`PASS`), `node --check` (`PASS`)
- **Recent Commits**:
  - `9acefcd` - `fix(post-recommend): prevent selector self-matching, misclicks, and silent failure`
  - `dc974f8` - `test(post-recommend): add regression tests for DEFECT-03 selector isolation and failure handling`
- **Working Tree State**: 🟢 Clean (No uncommitted changes)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `post-recommend` 도메인 미해결 티켓 `0건` (`🟢 Sign-Off`). 잔여 타 도메인 P0/P1 티켓(`viewer-immersion/DEFECT-01` 등) 진행.
