# 📦 [post-recommend] 뷰어 내 개념글 추천 연동 (Post Recommend)

- **현재 상태 (Lifecycle)**: `🩹 Debugging`
- **구현 진척도**: `[■■■■] 4/4 Steps`
- **미해결 티켓 현황**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 0건` ([`verification.md`](./verification.md) 참조)
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

- **직전 완료 작업**: 2026-11-19 / `deep-bug-hunter` / 3-Lens 병렬 헌팅으로 `DEFECT-03`(P0: 셀렉터 자가 매칭·비추천 버튼 오클릭·실패 은폐) 등록
- **생성/수정된 핵심 파일**:
  - `src/parser/recommend_parser.js`: 데스크톱/모바일 추천 버튼 및 추천수 크롤러
  - `src/controller/recommend_controller.js`: 단일 디스패치 및 2단계 비동기 갱신 컨트롤러
  - `tests/recommend.test.js`: 통합 단위 테스트 7종
- **검증 완료된 테스트 실행 명령어**:
  - `node tests/recommend.test.js`: 기존 단위 PASS (`dc_sample.html`에서 `button[data-no]`/`onclick*="recom"` 오매칭 실증)
- **다음 세션 포커스 및 주의사항 (Caveats)**:
  - `DEFECT-03` 해결 시 `#disagall-viewer-overlay` 배제, 우선순위 셀렉터 순회, `dispatchRecommendClick()` 반환값 검증 및 실제 `recommend_parser.js` 기반 테스트 보강 필요.
