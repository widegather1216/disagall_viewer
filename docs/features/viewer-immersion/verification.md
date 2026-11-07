# 🧪 [viewer-immersion] Verification & Ticket Logs

- **검증 상태**: `⏳ Pending`
- **인수 조건 통과율**: `0 / 4 (0%)`
- **미해결 티켓**: `🚨 DEFECT: 0건` | `🧐 REFACTOR: 0건`

---

## ✅ 1. 인수 조건 (Acceptance Criteria - Given/When/Then)

- **AC-01 (유휴 자동 숨김 및 복원)**:
  - **Given** 뷰어가 활성화되어 있고 `state.autoHideUi`가 `true`일 때,
  - **When** 2.5초(`CONFIG.UI_IDLE_TIMEOUT`) 동안 마우스 이동 및 키 입력이 없으면,
  - **Then** 오버레이에 `.disagall-idle`이 적용되어 헤더, 푸터, 내비게이션 버튼이 숨겨지고 커서가 감춰지며, 마우스 이동 시 즉시 복귀한다.
- **AC-02 (수동 UI 토글 단축키 `H`)**:
  - **Given** 뷰어가 활성화되어 있을 때,
  - **When** 사용자가 키보드 `H` 또는 `h`를 누르면,
  - **Then** 타이머 대기 시간과 무관하게 즉시 UI 표시 여부가 토글(`showUi` / `hideUi`)된다.
- **AC-03 (브라우저 전체화면 단축키 `F`)**:
  - **Given** 뷰어가 활성화되어 있을 때,
  - **When** 사용자가 키보드 `F` 또는 `f`를 누르면,
  - **Then** 브라우저 전체화면 API(`requestFullscreen` / `exitFullscreen`)가 호출되어 화면이 전체화면으로 전환/해제된다.
- **AC-04 (설정창 토글 및 스토리지 연동)**:
  - **Given** 사용자가 확장 프로그램 팝업(`popup.html`)을 열었을 때,
  - **When** `몰입 모드 (UI 자동 숨김)` 토글 스위치를 변경하면,
  - **Then** `chrome.storage.sync`에 `autoHideUi` 값이 즉시 저장되고 뷰어 동작에 반영된다.

---

## 📋 2. 테스트 시나리오 매트릭스 (Test Scenario Matrix)

| ID | 구분 | 시나리오 요약 | 관련 AC | 검증 결과 (`⏳` / `PASS` / `FAIL`) | 비고 (티켓 링크) |
| :--- | :---: | :--- | :--- :---: | :---: | :--- |
| `TC-HP-01` | Happy | 마우스 2.5초 미조작 시 UI 및 커서 자동 페이드아웃 후 마우스 이동 시 즉시 복원 | `AC-01` | `⏳ Pending` | - |
| `TC-HP-02` | Happy | 단축키 `H`를 누를 때마다 UI 즉시 숨김/표시 토글 | `AC-02` | `⏳ Pending` | - |
| `TC-HP-03` | Happy | 단축키 `F`를 눌러 브라우저 전체화면 전환 및 해제 | `AC-03` | `⏳ Pending` | - |
| `TC-HP-04` | Happy | 팝업 토글 변경 시 스토리지 저장 및 `autoHideUi === false` 시 자동 숨김 방지 | `AC-04` | `⏳ Pending` | - |
| `TC-BD-01` | Boundary | 패딩 슬라이더 드래그 중이거나 헤더 호버 중 2.5초 경과 시 숨김 유예 | `AC-01` | `⏳ Pending` | - |
| `TC-BD-02` | Boundary | 사진 확대(Zoom > 1.0) 후 드래그 팬(Pan) 조작 중 마우스 커서 정상 유지 | `AC-01` | `⏳ Pending` | - |
| `TC-NG-01` | Negative | 뷰어 비활성(`!active`) 상태에서 마우스 이동 또는 H/F 키 입력 시 오동작 방지 | `AC-02` | `⏳ Pending` | - |
| `TC-NG-02` | Negative | 뷰어 닫기(`closeViewer`) 시 타이머 미해제로 인한 백그라운드 콜백 발생 방지 | `AC-01` | `⏳ Pending` | - |

---

## 🚨 3. 결함 리포트 (Defect Logs - by `user-journey-tester`)

*(현재 등록된 결함 없음)*

---

## 🧐 4. 코드 품질 감사 리포트 (Audit & Refactoring Logs - by `clean-code-auditor`)

*(현재 등록된 리팩토링 티켓 없음)*
