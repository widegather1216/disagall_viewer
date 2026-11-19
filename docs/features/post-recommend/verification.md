# 🧪 [post-recommend] Verification & Ticket Logs

- **검증 상태**: `🩹 Debugging` (`1건 OPEN DEFECT` — `deep-bug-hunter` 실증 등록)
- **인수 조건 통과율**: `4 / 4 (실런타임 오매칭/은폐 결함 1건 발견)`
- **미해결 티켓**: `🚨 DEFECT: 1건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (헤더 추천 버튼 클릭 및 단축키 R/C)**:
  - **Given** 사진 뷰어가 활성화되어 있을 때,
  - **When** 헤더의 [개추] 버튼을 누르거나 키보드 `R`/`C`를 누르면,
  - **Then** 본문 추천 버튼이 단 1회 클릭 디스패치되고 즉시 확인 토스트가 출력된다.
- **AC-02 (실시간 카운트 업 동기화)**:
  - **Given** 추천 디스패치가 성공적으로 완료되었을 때,
  - **When** 500ms 및 1200ms 후 DOM에서 최신 추천 수를 조회하여 카운트가 증가하면,
  - **Then** 버튼 라벨이 증가된 수치로 갱신되고 `.voted` 클래스가 부여된다.
- **AC-03 (중복 추천 및 광클릭 쓰로틀링 방어)**:
  - **Given** 사용자가 1.5초 이내에 연속으로 개추 버튼을 누르거나 이미 투표한 글인 경우,
  - **When** 추가 입력을 시도하면,
  - **Then** 디스패치를 차단하고 안내 토스트를 띄워 디시 서버 차단을 방지한다.
- **AC-04 (미추천 글 `on` 클래스 오탐 방어)**:
  - **Given** 디시 데스크톱 본문 버튼에 기본 클래스로 `on`이 포함되어 있을 때,
  - **When** 사용자가 첫 추천을 시도하면,
  - **Then** 미추천 글로 정상 인식되어 추천이 정상 디스패치된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 추천 수 파싱 및 헤더 버튼 라벨 정상 동기화 | `AC-01` | `FAIL` | [`DEFECT-03`](#defect-03-recommend_button_selectors-%EC%9E%90%EA%B0%80-%EB%A7%A4%EC%B9%AD-%EB%B9%84%EC%B6%94%EC%B2%9C-%EB%B2%84%ED%8A%BC-%EC%98%A4%ED%81%B4%EB%A6%AD-%EB%B0%8F-%EC%B6%94%EC%B2%9C-%EC%8B%A4%ED%8C%A8-%EC%9D%80%ED%8F%90) |
| `TC-HP-02` | Happy | `r`/`c` 단축키 및 클릭 시 1회성 단일 디스패치 | `AC-01` | `FAIL` | [`DEFECT-03`](#defect-03-recommend_button_selectors-%EC%9E%90%EA%B0%80-%EB%A7%A4%EC%B9%AD-%EB%B9%84%EC%B6%94%EC%B2%9C-%EB%B2%84%ED%8A%BC-%EC%98%A4%ED%81%B4%EB%A6%AD-%EB%B0%8F-%EC%B6%94%EC%B2%9C-%EC%8B%A4%ED%8C%A8-%EC%9D%80%ED%8F%90) |
| `TC-HP-03` | Happy | 투표 후 500ms/1200ms 비동기 카운트 업 반영 | `AC-02` | `PASS` | - |
| `TC-BD-01` | Boundary | 기본 `on` 클래스가 존재하는 데스크톱 추천 버튼 정상 투표 | `AC-04` | `PASS` | [DEFECT-02] |
| `TC-NG-01` | Negative | 1.5초 이내 광클릭 시 쓰로틀링 차단 | `AC-03` | `PASS` | - |
| `TC-NG-02` | Negative | 뷰어 비활성(`!active`) 상태 시 R/C 단축키 인터셉트 차단 | `AC-01` | `PASS` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs)

### [DEFECT-01] 추천 1회 실행 시 디시인사이드 "추천은 1일 1회만 가능합니다" 알림 발생
- **현재 상태**: 🟢 RESOLVED — 수정: `btn.click()` 단일 디스패치 분기 처리 | 회귀 테스트: `PASS`

### [DEFECT-02] 미추천 게시글인데도 "이미 추천을 했다"고 뜨며 추천 실행이 차단되는 현상
- **현재 상태**: 🟢 RESOLVED — 수정: `on` 클래스 사전 가드 제거 및 세션 카운트 증분 판별 | 회귀 테스트: `PASS`

### [DEFECT-03] `RECOMMEND_BUTTON_SELECTORS` 자가 매칭, 비추천 버튼 오클릭 및 추천 실패 은폐
- **현재 상태**: 🟡 OPEN
- **심각도 & 위치**: 🔴 P0 Critical | [`src/parser/recommend_parser.js#L3-L35`](../../../src/parser/recommend_parser.js#L3-L35), [`src/controller/recommend_controller.js#L72-L120`](../../../src/controller/recommend_controller.js#L72-L120), [`src/ui/overlay.js#L36`](../../../src/ui/overlay.js#L36)
- **원인 및 실증**: `button[id*="recommend"]`가 뷰어 자체 버튼 `#disagall-btn-recommend`와 일치하고, `querySelector` 문서 순서 특성상 `button[data-no]`·`button[onclick*="recom"]`이 실베추(`btn_silbechu`), 신고(`btn_report`), 스크랩 닫기(`#scrapdone_non_recom`), 개념글 목록 이동(`goList`) 등을 오클릭함(`dc_sample.html` 내 `button[data-no]` 11개 확인). 또한 `dispatchRecommendClick()`이 `false`를 반환해도 무조건 `"개념글 추천을 눌렀습니다! 👍"` 토스트를 출력함(`Empirical Probe Reproduced`).
- **최소 수정 설계**: `#disagall-viewer-overlay` 내부 배제, 셀렉터 우선순위 배열 순회 매칭 및 `button[data-no]`/광범위 `[onclick*="recom"]` 제거, `dispatchRecommendClick(btn)` 반환값 검증.

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs)

*(현재 등록된 미해결 리팩토링 티켓 없음)*
