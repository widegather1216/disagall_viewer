# 📜 [viewer-immersion] Full-Stack Specification

## 1. 데이터 모델 및 스키마 (Data Models & Schema)

### 🟢 [As-Is 기구현]
- `CONFIG.DEFAULT_PADDING`: `24`
- `CONFIG.STORAGE_KEY_PADDING`: `'defaultPadding'`
- `CONFIG.STORAGE_KEY_AUTO_OPEN`: `'disagall_auto_open'`

### 🟡 [To-Be 신규/마이그레이션 대상]
- `CONFIG.UI_IDLE_TIMEOUT`: `2500` (ms, 마우스 유휴 판단 대기 시간)
- `CONFIG.STORAGE_KEY_AUTO_HIDE_UI`: `'autoHideUi'` (boolean, 기본값 `true`)
- `state.idleTimer`: `NodeJS.Timeout | null` (마우스 유휴 타이머 ID)
- `state.autoHideUi`: `boolean` (설정 저장소에서 로드된 자동 숨김 활성화 여부, 기본 `true`)
- `state.isUiHidden`: `boolean` (현재 UI 숨김 상태 여부 플래그, 기본 `false`)

## 2. 저장소 및 통신 계약 (Storage & Communication Contracts)
- **Chrome Extension Storage**:
  - 키: `autoHideUi`
  - 읽기: `chrome.storage.sync.get({ autoHideUi: true }, callback)`
  - 쓰기: `chrome.storage.sync.set({ autoHideUi: value })`
- **Tampermonkey / Userscript Storage**:
  - 읽기: `GM_getValue('autoHideUi', true)`
  - 쓰기: `GM_setValue('autoHideUi', value)`
- **동기화 시점**: 뷰어 초기화 시 스토리지 값을 읽어 `state.autoHideUi`에 저장. 팝업에서 변경 시 즉시 스토리지 반영.

## 3. 클라이언트 상태 계약 (Client State & Lifecycle)
- **`resetIdleTimer()`**:
  1. `state.idleTimer` 존재 시 `clearTimeout` 호출
  2. UI가 숨겨져 있던 상태(`.disagall-idle` 또는 `state.isUiHidden === true`)라면 즉시 UI 복원 및 커서 복원
  3. `state.autoHideUi`가 `true`이고 오버레이가 `active` 상태인 경우, `CONFIG.UI_IDLE_TIMEOUT` 후 `hideUi(false)`를 실행하는 신규 타이머 등록
- **`hideUi(isManual = false)`**:
  - 상단 헤더(`.disagall-header`), 하단 푸터(`.disagall-footer`), 좌우 내비게이션 버튼(`.disagall-nav-btn`)에 페이드아웃 적용
  - 마우스 커서 숨김 (`cursor: none`)
  - `isManual === true`인 경우 `state.isUiHidden = true`, 자동 숨김인 경우 최상위 엘리먼트에 `.disagall-idle` 토글
- **`toggleUiManual()`**:
  - 단축키 `H` 또는 `h` 입력 시 호출
  - 현재 숨김 상태(`state.isUiHidden` 또는 `.disagall-idle`)이면 `showUi()`, 보이는 상태이면 `hideUi(true)`
- **`toggleFullscreen()`**:
  - 단축키 `F` 또는 `f` 입력 시 호출
  - `document.fullscreenElement` 검사: 활성화 시 `document.exitFullscreen()`, 비활성화 시 `state.elements.overlayEl.requestFullscreen()` 안전 호출

## 4. UI/UX 상태 전이 및 디자인 규칙 (UI States & Design Rules)
- **Idle 자동 숨김 및 수동 숨김 상태 (`.disagall-idle`, `.disagall-ui-hidden`)**:
  - `#disagall-viewer-overlay.disagall-idle, #disagall-viewer-overlay.disagall-ui-hidden`: `cursor: none;`
  - `#disagall-viewer-overlay.disagall-idle .disagall-header, #disagall-viewer-overlay.disagall-ui-hidden .disagall-header, #disagall-viewer-overlay.disagall-idle .disagall-footer, #disagall-viewer-overlay.disagall-ui-hidden .disagall-footer, #disagall-viewer-overlay.disagall-idle .disagall-nav-btn, #disagall-viewer-overlay.disagall-ui-hidden .disagall-nav-btn`:
    `opacity: 0; pointer-events: none; transition: opacity 0.3s ease;`
- **조작 복귀 상태**:
  - `mousemove`, `keydown`, `click` 발생 시 0.15s 내로 `opacity: 1; pointer-events: auto;` 복귀
- **팝업 설정 (`popup.html`) 디자인**:
  - 카드 UI 내 스위치 토글 행 추가: `몰입 모드 (UI 자동 숨김)` + 체크박스 토글 스위치 (Accent Color `#3b82f6`)

## 5. 예외 처리 및 엣지 케이스 정책 (Edge Cases & Fallbacks)
- **슬라이더 조작 및 헤더 호버**: 슬라이더를 마우스로 드래그 중이거나 헤더 버튼 위에 마우스가 위치한 경우 타이머 숨김 유예
- **이미지 드래그 팬(Pan)**: 1.0배율 초과 확대 시 드래그 중(`isDragging === true`)에는 마우스 커서(`grabbing`) 유지 및 자동 숨김 방지
- **전체화면(`F`) 상태에서 ESC 키 입력**: 브라우저 기본 동작으로 Fullscreen이 먼저 해제되며, 뷰어 자체는 열려 있는 상태를 유지
- **토글 비활성화(`autoHideUi === false`)**: 유휴 자동 숨김은 작동하지 않으나, 단축키 `H`를 통한 수동 숨김은 언제든 사용 가능
