# 📦 [post-recommend] 뷰어 내 개념글 추천 연동 (Post Recommend)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 2건` ([`verification.md`](./verification.md) 참조)
- **관련 문서**: [`architecture.md`](./architecture.md) | [`spec.md`](./spec.md) | [`verification.md`](./verification.md) | [`decisions.md`](./decisions.md)

---

## 🎯 1. 도메인 개요 (Overview)
디시 사진 뷰어로 사진을 감상하는 도중, 뷰어를 닫고 본문 하단으로 스크롤할 필요 없이 상단 헤더의 버튼이나 단축키(`r` / `c`)를 통해 현재 게시글에 개념글 추천(개추)을 누를 수 있는 편의 기능입니다.

---

## 🗺️ 2. 계층별 구현 로드맵 (Layer-Chunked Roadmap)

### ✅ Baseline (As-Is 기구현 완료)

- [x] **Step 1 [Schema & Types / Config & Constants]**: `RECOMMEND_THROTTLE_MS`(1200ms), 2단계 갱신 지연(`RECOMMEND_SYNC_DELAYS: [500, 1200]`) 상수 정의
  - 📂 구현: [`src/config.js`](../../../src/config.js), [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 2 [Data Access & API / Recommend Parser]**: 본문 추천 버튼 탐색(`getNativeRecommendButton`), 추천 수 파싱(`getPostRecommendCount`, 실패 시 `null`), 활성/로그인/캡차 판별 및 클릭 디스패치
  - 📂 구현: [`src/parser/recommend_parser.js`](../../../src/parser/recommend_parser.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 3 [Domain Service & State / Recommend Controller]**: `triggerPostRecommend()`, 단일 클릭 디스패치(DEFECT-01), `on` 클래스 사전 가드 제거(DEFECT-02), 2단계 카운트 업 동기화
  - 📂 구현: [`src/controller/recommend_controller.js`](../../../src/controller/recommend_controller.js) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)
- [x] **Step 4 [UI & Integration / Overlay & Styling]**: 헤더 개추 버튼 마크업(`#disagall-btn-recommend`), `r`/`c` 단축키 바인딩, 하단 키힌트 추가, `content.css` 모던 블루 포인트 스타일 적용
  - 📂 구현: [`src/ui/overlay.js`](../../../src/ui/overlay.js), [`content.css`](../../../content.css) | 🧪 테스트: [`tests/recommend.test.js`](../../../tests/recommend.test.js) (`PASS`)

---

## 🔄 3. Latest Session Handoff (최근 세션 인계 노트)

- **직전 완료 작업**: 2026-11-25 / `clean-code-auditor` / 전 도메인 클린코드 전수 감사 완료 — `post-recommend` `REFACTOR-01`(🔴 Must Fix)·`REFACTOR-02`(🟡 Should Fix) 발행 및 `spec.md`/`architecture.md`/`README.md` 역동기화 (`🩹 Debugging` 전환)
- **생성/수정된 핵심 파일**:
  - `docs/features/post-recommend/verification.md`: `REFACTOR-01` (`triggerPostRecommend()` `!active` 진입 가드 누락 및 `tests/recommend.test.js` Tests 1~7 실모듈 전환), `REFACTOR-02` (`triggerPostRecommend()` 105줄·7-depth 분할 및 `recommend_parser.js` 중첩/빈 `catch` 개선) 등록
  - `docs/features/post-recommend/spec.md`, `architecture.md`, `README.md`: `1200ms`, `null` 반환, `DEFECT-03` 우선순위 셀렉터·실제 함수명 역동기화
- **검증 완료된 테스트 실행 명령어**:
  - `npm test` (`5개 스위트 PASS`), `node tests/immersion_e2e.test.js` (`16/16 PASS`), `node tests/post_navigation_e2e.test.js` (`11/11 PASS`), `node --check` (`PASS`)
- **Working Tree State**: 🟡 Docs Modified (위키 감사 리포트/스펙 역동기화 반영 중)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - 최우선 해결 대상: `post-recommend` 도메인 `REFACTOR-01` (`triggerPostRecommend()` `!active` 가드 및 `recommend.test.js` 실모듈 검증 전환, `systematic-debugger` 연결).
